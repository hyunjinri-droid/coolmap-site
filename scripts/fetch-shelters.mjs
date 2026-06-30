#!/usr/bin/env node
// 행정안전부 생활안전지도(safemap.go.kr) 무더위쉼터 오픈API를 받아
// src/data/shelters.json (Place[] 스키마)으로 빌드한다.
//
// 필요 환경변수: SAFEMAP_API_KEY (생활안전지도 오픈API 인증키)
//
// 주의: safemap 응답 필드명은 시설유형에 따라 약간씩 다를 수 있어
// 여러 후보 키를 시도한다. 처음 실행 시 DEBUG=1 로 실행해서
// 콘솔에 찍히는 원본 item 구조를 한 번 확인하고, 실제 필드명과
// 다르면 FIELD_CANDIDATES를 조정할 것.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.SAFEMAP_API_KEY;
const DEBUG = process.env.DEBUG === "1";
// GitHub Actions(Azure 데이터센터 IP)에서 safemap.go.kr로의 직접 연결이 구조적으로
// 막혀 있어, workers/safemap-proxy에 배포한 Cloudflare Worker를 경유한다.
// SAFEMAP_PROXY_URL이 없으면 직접 연결을 시도한다(로컬 실행 등).
const PROXY_URL = process.env.SAFEMAP_PROXY_URL;

const BASE_URLS = PROXY_URL
  ? [`${PROXY_URL.replace(/\/$/, "")}/openApiService/data/getCoolingCenterData.do`]
  : [
      "https://www.safemap.go.kr/openApiService/data/getCoolingCenterData.do",
      "http://www.safemap.go.kr/openApiService/data/getCoolingCenterData.do",
    ];
const PAGE_SIZE = 1000;

const SEOUL_GU = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
  "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
  "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
  "서초구", "강남구", "송파구", "강동구",
];

// 유아 동반에 부적합할 가능성이 높은 시설유형 키워드 (경로당/노인 전용 등)
const SENIOR_ONLY_KEYWORDS = ["경로당", "노인정", "노인복지", "노인회관"];

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

function extractGu(address) {
  if (!address) return null;
  const match = SEOUL_GU.find((gu) => address.includes(gu));
  return match ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// safemap.go.kr가 간헐적으로 연결 타임아웃을 일으키는 경우가 있어 재시도를 둔다.
// (단순 3회/2초 고정 지연으로는 부족함이 확인되어 시도 횟수와 타임아웃을 늘리고
// 지수 백오프를 적용한다.)
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

async function fetchPage(pageIndex) {
  let res;
  let lastErr;
  for (const baseUrl of BASE_URLS) {
    const url = new URL(baseUrl);
    url.searchParams.set("serviceKey", API_KEY);
    url.searchParams.set("type", "json");
    url.searchParams.set("pageIndex", String(pageIndex));
    url.searchParams.set("numOfRows", String(PAGE_SIZE));
    try {
      res = await fetchWithRetry(url, 3);
      break;
    } catch (err) {
      lastErr = err;
      console.error(`${baseUrl} 연결 실패, 다음 URL 시도:`, err.message);
    }
  }
  if (!res) throw lastErr;
  if (!res.ok) throw new Error(`safemap API HTTP ${res.status}`);
  const json = await res.json();
  if (DEBUG) console.log("원본 JSON 최상위 키:", JSON.stringify(Object.keys(json ?? {})));
  if (DEBUG) console.log("원본 JSON (앞 500자):", JSON.stringify(json).slice(0, 500));
  // safemap 응답 포맷: { result: { totalCount, item: [...] } } 형태가 일반적이나
  // 변형 가능성이 있어 여러 경로를 시도한다.
  const items =
    json?.result?.item ?? json?.response?.body?.items?.item ?? json?.items ?? [];
  const totalCount = Number(json?.result?.totalCount ?? items.length);
  return { items: Array.isArray(items) ? items : [items].filter(Boolean), totalCount };
}

function toPlace(raw, index) {
  const name = pick(raw, ["FCLTY_NM", "fcltyNm", "name"]);
  const roadAddr = pick(raw, ["RN_ADRES", "ROAD_NM_ADRES", "rnAdres"]);
  const lotAddr = pick(raw, ["LOTNO_ADRES", "lotnoAdres"]);
  const address = roadAddr || lotAddr;
  const lat = Number(pick(raw, ["LA", "la", "lat"]));
  const lng = Number(pick(raw, ["LO", "lo", "lng"]));
  const fcltyTy = pick(raw, ["FCLTY_TY", "HOT_PLACE_TY_NM", "fcltyTy"]) ?? "";
  const hours = pick(raw, ["USE_AT", "OPER_TIME", "useAt"]);

  if (!name || !address || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const gu = extractGu(address);
  if (!gu) return null; // MVP 범위: 서울 25개구만

  const familyFriendly = !SENIOR_ONLY_KEYWORDS.some((kw) => fcltyTy.includes(kw));

  return {
    id: `shelter-safemap-${index}`,
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
    console.error("SAFEMAP_API_KEY 환경변수가 없어 shelters.json 빌드를 건너뜁니다.");
    process.exit(0);
  }

  const places = [];
  let pageIndex = 1;
  let totalCount = Infinity;

  while (places.length < totalCount && pageIndex < 50) {
    const { items, totalCount: tc } = await fetchPage(pageIndex);
    totalCount = tc || items.length;
    if (DEBUG && pageIndex === 1) {
      console.log("샘플 원본 item:", JSON.stringify(items[0], null, 2));
    }
    if (items.length === 0) break;

    items.forEach((raw, i) => {
      const place = toPlace(raw, `${pageIndex}-${i}`);
      if (place) places.push(place);
    });

    pageIndex += 1;
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
