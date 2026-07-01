#!/usr/bin/env node
// 생활안전지도(safemap.go.kr) openapi2 무더위쉼터 API를 받아
// src/data/shelters.json (Place[] 스키마)으로 빌드한다.
//
// 필요 환경변수: SHELTERS_API_KEY (safemap.go.kr openapi2 인증키)
// 선택 환경변수: SAFEMAP_PROXY_URL (GitHub Actions Azure IP 차단 우회용 CF Worker URL)

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.SHELTERS_API_KEY;
const DEBUG = process.env.DEBUG === "1";
const PROXY_URL = process.env.SAFEMAP_PROXY_URL;

// safemap.go.kr openapi2 엔드포인트
const API_PATH = "/openapi2/IF_0001";
const BASE_URLS = PROXY_URL
  ? [`${PROXY_URL.replace(/\/$/, "")}${API_PATH}`]
  : [
      `https://safemap.go.kr${API_PATH}`,
      `http://safemap.go.kr${API_PATH}`,
    ];

const PAGE_SIZE = 1000;

const SEOUL_GU = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
  "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
  "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
  "서초구", "강남구", "송파구", "강동구",
];

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

async function fetchPage(pageNo) {
  let res, text, lastErr;

  for (const baseUrl of BASE_URLS) {
    const url = new URL(baseUrl);
    url.searchParams.set("serviceKey", API_KEY);
    url.searchParams.set("numOfRows", String(PAGE_SIZE));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("returnType", "json");

    if (DEBUG) console.log("요청 URL:", url.toString().replace(API_KEY, "***"));

    try {
      res = await fetchWithRetry(url);
      text = await res.text();
      break;
    } catch (err) {
      lastErr = err;
      console.error(`${baseUrl} 연결 실패:`, err.message);
    }
  }

  if (!res) throw lastErr;

  if (!res.ok) {
    console.error(`safemap API HTTP ${res.status}, 응답:\n`, text?.slice(0, 2000));
    throw new Error(`safemap API HTTP ${res.status}`);
  }

  if (DEBUG && pageNo === 1) console.log("원본 응답 (앞 3000자):\n", text.slice(0, 3000));

  const json = JSON.parse(text);
  // 응답 구조 탐색 (DEBUG=1 로 확인 후 고정)
  const body = json?.body ?? json?.response?.body ?? json?.result ?? json;
  const totalCount = Number(body?.totalCount ?? json?.totalCount ?? 0);
  const items = body?.items?.item ?? body?.item ?? body?.items ?? body?.rows ?? [];

  if (DEBUG && pageNo === 1) {
    console.log("최상위 키:", Object.keys(json ?? {}));
    console.log("totalCount:", totalCount);
    console.log("샘플 item:", JSON.stringify(Array.isArray(items) ? items[0] : items, null, 2));
  }

  return {
    items: Array.isArray(items) ? items : items ? [items] : [],
    totalCount,
  };
}

// Web Mercator (EPSG:3857) → WGS84
function mercatorToLatLng(x, y) {
  const lng = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 2 - Math.PI / 2) * (180 / Math.PI);
  return { lat, lng };
}

function toPlace(raw, index) {
  const name = pick(raw, ["cc_nm", "FCLTY_NM", "fcltyNm", "shelterName", "name"]);
  const roadAddr = pick(raw, ["rn_adres", "RN_ADRES", "rnAdres", "roadAddr"]);
  const lotAddr = pick(raw, ["adres", "LOTNO_ADRES", "lotnoAdres", "jibunAddr"]);
  const address = (roadAddr !== "-" ? roadAddr : null) || (lotAddr !== "-" ? lotAddr : null);
  const fcltyTy = pick(raw, ["cc_type", "FCLTY_TY", "fcltyTy", "shelterType"]) ?? "";
  const hours = pick(raw, ["USE_AT", "OPER_TIME", "useAt", "operTime"]);

  // 좌표: Web Mercator(x,y) 또는 직접 위경도
  let lat, lng;
  const rawX = Number(pick(raw, ["x", "X"]));
  const rawY = Number(pick(raw, ["y", "Y"]));
  if (!Number.isNaN(rawX) && rawX > 1_000_000) {
    // Web Mercator → WGS84
    ({ lat, lng } = mercatorToLatLng(rawX, rawY));
  } else {
    lat = Number(pick(raw, ["LA", "la", "lat", "LAT", "latitude"]));
    lng = Number(pick(raw, ["LO", "lo", "lng", "LOT", "LON", "longitude"]));
  }

  if (!name || !address || Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) {
    if (DEBUG) console.log("변환 실패:", JSON.stringify(raw));
    return null;
  }

  const gu = extractGu(address);
  if (!gu) return null;

  const familyFriendly = !SENIOR_ONLY_KEYWORDS.some((kw) => fcltyTy.includes(kw));

  return {
    id: `shelter-safemap2-${index}`,
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
  let pageNo = 1;
  let totalCount = Infinity;

  while (places.length < totalCount && pageNo < 100) {
    const { items, totalCount: tc } = await fetchPage(pageNo);
    if (tc > 0) totalCount = tc;
    if (items.length === 0) break;

    items.forEach((raw, i) => {
      const place = toPlace(raw, `${pageNo}-${i}`);
      if (place) places.push(place);
    });

    console.log(`페이지 ${pageNo}: ${items.length}건 수신, 서울 누적 ${places.length}곳`);

    if (items.length < PAGE_SIZE) break;
    pageNo += 1;
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
