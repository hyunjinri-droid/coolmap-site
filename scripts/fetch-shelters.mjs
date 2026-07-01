#!/usr/bin/env node
// 서울시 열린데이터광장 무더위쉼터 API를 받아
// src/data/shelters.json (Place[] 스키마)으로 빌드한다.
//
// 필요 환경변수: SHELTERS_API_KEY (서울시 오픈API 인증키)
//   발급: https://data.seoul.go.kr → 회원가입 → 인증키 신청
//
// API: 서울시 무더위 쉼터 위치정보 (열린데이터광장)
//   https://data.seoul.go.kr/dataList/OA-2221/S/1/datasetView.do
//   엔드포인트: http://openapi.seoul.go.kr:8088/{KEY}/json/CoolShelter/1/1000/

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.SHELTERS_API_KEY;
const DEBUG = process.env.DEBUG === "1";

const PAGE_SIZE = 1000;

const SEOUL_GU = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
  "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
  "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
  "서초구", "강남구", "송파구", "강동구",
];

const SENIOR_ONLY_KEYWORDS = ["경로당", "노인정", "노인복지", "노인회관"];

function extractGu(address) {
  if (!address) return null;
  const match = SEOUL_GU.find((gu) => address.includes(gu));
  return match ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 5, baseDelayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch (err) {
      if (attempt === retries) throw err;
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.error(`요청 실패(시도 ${attempt}/${retries}), ${delayMs}ms 후 재시도:`, err.message);
      await sleep(delayMs);
    }
  }
}

async function fetchPage(start, end) {
  // 서울시 오픈API 형식: /KEY/json/CoolShelter/시작/끝/
  const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/CoolShelter/${start}/${end}/`;
  if (DEBUG) console.log("요청 URL:", url.replace(API_KEY, "***"));

  const res = await fetchWithRetry(url);
  const text = await res.text();

  if (!res.ok) {
    console.error(`서울시 API HTTP ${res.status}, 응답:\n`, text.slice(0, 1000));
    throw new Error(`서울시 API HTTP ${res.status}`);
  }

  if (DEBUG && start === 1) console.log("원본 응답 (앞 2000자):\n", text.slice(0, 2000));

  const json = JSON.parse(text);
  // 서울시 오픈API 응답 구조: { CoolShelter: { list_total_count, RESULT, row: [...] } }
  const data = json?.CoolShelter ?? json?.RESULT ?? json;
  const totalCount = Number(data?.list_total_count ?? 0);
  const rows = Array.isArray(data?.row) ? data.row : [];

  if (DEBUG && start === 1 && rows.length > 0) {
    console.log("샘플 row:", JSON.stringify(rows[0], null, 2));
  }

  return { rows, totalCount };
}

function toPlace(raw, index) {
  // 서울시 CoolShelter 필드명 (DEBUG로 확인 후 조정)
  const name = raw.FACLT_NM ?? raw.FCLTY_NM ?? raw.SHELTER_NM ?? raw.NAME;
  const address = raw.RDNMADR ?? raw.ROAD_NM_ADRES ?? raw.ADRES ?? raw.ADDRESS;
  const lat = Number(raw.LAT ?? raw.LATITUDE ?? raw.Y_COORD ?? raw.WGS84_LAT);
  const lng = Number(raw.LOT ?? raw.LNG ?? raw.LONGITUDE ?? raw.X_COORD ?? raw.WGS84_LOT);
  const fcltyTy = raw.FCLTY_TY ?? raw.TYPE_NM ?? raw.SHELTER_TY ?? "";
  const hours = raw.OPER_TM ?? raw.OPER_TIME ?? raw.OPEN_TIME;

  if (!name || !address || Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) {
    if (DEBUG) console.log("변환 실패 row:", JSON.stringify(raw));
    return null;
  }

  const gu = extractGu(address);
  if (!gu) return null;

  const familyFriendly = !SENIOR_ONLY_KEYWORDS.some((kw) => fcltyTy.includes(kw));

  return {
    id: `shelter-seoul-${index}`,
    name,
    category: "shelter",
    gu,
    address,
    lat,
    lng,
    hours: hours || undefined,
    familyFriendly,
    note: fcltyTy ? `시설유형: ${fcltyTy}` : undefined,
  };
}

async function main() {
  if (!API_KEY) {
    console.error("SHELTERS_API_KEY 환경변수가 없어 shelters.json 빌드를 건너뜁니다.");
    process.exit(0);
  }

  const places = [];
  let start = 1;
  let totalCount = Infinity;

  while (start <= totalCount && start < 100 * PAGE_SIZE) {
    const end = start + PAGE_SIZE - 1;
    const { rows, totalCount: tc } = await fetchPage(start, end);
    if (tc > 0) totalCount = tc;
    if (rows.length === 0) break;

    rows.forEach((raw, i) => {
      const place = toPlace(raw, `${start}-${i}`);
      if (place) places.push(place);
    });

    console.log(`${start}~${end}: ${rows.length}건 수신, 서울 누적 ${places.length}곳`);

    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  await writeFile(
    path.join(__dirname, "../src/data/shelters.json"),
    JSON.stringify(places, null, 2)
  );
  console.log(`shelters.json 작성 완료: 서울 ${places.length}곳`);
}

main().catch((err) => {
  console.error("무더위쉼터 데이터 빌드 실패:", err);
  process.exit(1);
});
