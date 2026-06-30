#!/usr/bin/env node
// 기상청 단기예보(getVilageFcst)+기상특보(getWthrWrnList) 데이터를 받아
// 구별 체감온도/폭염 여부를 src/data/weather.json 정적 파일로 빌드한다.
// GitHub Actions에서 주기 실행.
//
// 필요 환경변수: KMA_API_KEY (공공데이터포털 단기예보/기상특보 공용 인증키, decoding 키 사용)
//
// 주의:
// - "체감온도"는 기상청 별도 모델이 필요하므로, 기온(TMP)+습도(REH) 기반
//   단순화된 Heat Index 근사치를 사용한다.
// - "폭염특보"는 기상특보 API가 정상 응답하면 실제 발표 여부를 쓰고,
//   특보 API 호출이 실패하면 체감온도 33도 임계값 추정으로 대체한다.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guCenters = JSON.parse(
  await readFile(path.join(__dirname, "../src/data/gu-centers.json"), "utf-8")
);

// src/lib/kmaGrid.ts 의 변환 공식과 동일 (Node 스크립트 단순 실행을 위해 복제)
function latLngToGrid(lat, lng) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

const API_KEY = process.env.KMA_API_KEY;
const BASE_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const WARN_URL = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList";
const DEBUG = process.env.DEBUG === "1";

function pad(n) {
  return String(n).padStart(2, "0");
}

// getVilageFcst 발표 시각(KST 기준) 중 가장 최근 값을 계산
function latestBaseDateTime(now) {
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let hour = kst.getUTCHours();
  let date = new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
  );

  // 발표 후 API 반영까지 약 10분 소요되므로 여유를 둔다
  let candidate = slots.filter((s) => s <= hour - (kst.getUTCMinutes() < 15 ? 1 : 0));
  if (candidate.length === 0) {
    date.setUTCDate(date.getUTCDate() - 1);
    candidate = [slots[slots.length - 1]];
  }
  const base_time = `${pad(candidate[candidate.length - 1])}00`;
  const base_date = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}`;
  return { base_date, base_time };
}

function heatIndexC(tempC, humidity) {
  if (tempC < 27) return tempC;
  const T = (tempC * 9) / 5 + 32; // to Fahrenheit
  const R = humidity;
  const hiF =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;
  return Math.round((((hiF - 32) * 5) / 9) * 10) / 10;
}

async function fetchGrid(nx, ny, base_date, base_time) {
  const url = new URL(BASE_URL);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", base_date);
  url.searchParams.set("base_time", base_time);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  const res = await fetch(url);
  if (res.status === 429) {
    await sleep(1500);
    const retryRes = await fetch(url);
    if (!retryRes.ok) throw new Error(`KMA API HTTP ${retryRes.status}`);
    const json = await retryRes.json();
    return json?.response?.body?.items?.item ?? [];
  }
  if (!res.ok) throw new Error(`KMA API HTTP ${res.status}`);
  const json = await res.json();
  const items = json?.response?.body?.items?.item ?? [];
  return items;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickNearestForecast(items, category) {
  const matches = items.filter((i) => i.category === category);
  if (matches.length === 0) return null;
  matches.sort((a, b) => `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`));
  return matches[0];
}

// 기상특보(WthrWrnInfoService) 응답 스키마가 서비스별로 들쭉날쭉할 수 있어,
// 정확한 필드를 파싱하기보다 item 전체를 문자열로 합쳐 "폭염"/"서울" 포함 여부로
// 판단하는 방어적 방식을 사용한다. (서울 전역 단위로 발표되는 특보 특성상 충분)
async function fetchSeoulHeatWaveWarning() {
  const url = new URL(WARN_URL);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("dataType", "JSON");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`기상특보 API HTTP ${res.status}`);
  const json = await res.json();
  const items = json?.response?.body?.items?.item ?? [];
  const list = Array.isArray(items) ? items : [items].filter(Boolean);

  if (DEBUG && list.length > 0) {
    console.log("기상특보 샘플 item:", JSON.stringify(list[0], null, 2));
  }

  let active = false;
  let level = null; // "주의보" | "경보"

  for (const item of list) {
    const blob = Object.values(item).join(" ");
    if (blob.includes("폭염") && blob.includes("서울")) {
      active = true;
      if (blob.includes("경보")) level = "경보";
      else if (blob.includes("주의보") && level !== "경보") level = "주의보";
    }
  }

  return { active, level, raw: list.length };
}

async function main() {
  if (!API_KEY) {
    console.error("KMA_API_KEY 환경변수가 없어 weather.json 빌드를 건너뜁니다.");
    process.exit(0);
  }

  const { base_date, base_time } = latestBaseDateTime(new Date());
  const results = [];

  let officialWarning = null;
  try {
    officialWarning = await fetchSeoulHeatWaveWarning();
  } catch (err) {
    console.error("기상특보 조회 실패, 체감온도 기반 추정으로 대체:", err.message);
  }

  for (const center of guCenters) {
    const { nx, ny } = latLngToGrid(center.lat, center.lng);
    try {
      const items = await fetchGrid(nx, ny, base_date, base_time);
      const tmp = Number(pickNearestForecast(items, "TMP")?.fcstValue ?? NaN);
      const reh = Number(pickNearestForecast(items, "REH")?.fcstValue ?? NaN);
      const pty = Number(pickNearestForecast(items, "PTY")?.fcstValue ?? 0);

      if (Number.isNaN(tmp) || Number.isNaN(reh)) {
        throw new Error("필수 항목(TMP/REH) 누락");
      }

      const feelsLikeC = heatIndexC(tmp, reh);
      // 공식 기상특보가 있으면 그 값을 우선하고, 없으면 체감온도 임계값으로 추정한다.
      const heatWaveAlert = officialWarning ? officialWarning.active : feelsLikeC >= 33;
      const recommendation = heatWaveAlert
        ? officialWarning?.level === "경보"
          ? "폭염경보! 가급적 실내에 머무르고 외출을 자제하세요"
          : "오전 9시 이전, 오후 6시 이후 외출을 추천해요"
        : pty > 0
        ? "비/눈 소식이 있어요. 우산을 챙기세요"
        : "외출하기 좋은 날씨예요";

      results.push({
        gu: center.gu,
        tmp,
        reh,
        feelsLikeC,
        heatWaveAlert,
        heatWaveSource: officialWarning ? "official" : "estimated",
        recommendation,
      });
    } catch (err) {
      console.error(`${center.gu} 날씨 조회 실패:`, err.message);
    }
    // KMA API 호출량 제한(초당 요청 수)에 걸리지 않도록 구별 호출 사이에 간격을 둔다.
    await sleep(300);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    baseDate: base_date,
    baseTime: base_time,
    items: results,
  };

  await writeFile(
    path.join(__dirname, "../src/data/weather.json"),
    JSON.stringify(output, null, 2)
  );
  console.log(`weather.json 작성 완료: ${results.length}/${guCenters.length}개 구`);
}

main();
