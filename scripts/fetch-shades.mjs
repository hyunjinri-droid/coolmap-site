#!/usr/bin/env node
// 재난안전데이터공유플랫폼(safetydata.go.kr) 폭염저감시설(그늘막 등) API를 받아
// src/data/shades.json (Place[] 스키마)으로 빌드한다.
//
// 필요 환경변수: SAFETYDATA_API_KEY (재난안전데이터공유플랫폼 서비스키)
//
// 주의: safetydata.go.kr V2 API는 데이터셋마다 응답 필드명이 다를 수 있어
// 여러 후보 키를 시도한다. 처음 실행 시 DEBUG=1 로 실행해서 콘솔에 찍히는
// 원본 item 구조를 한 번 확인하고, 실제 필드명과 다르면 FIELD 후보를 조정할 것.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.SAFETYDATA_API_KEY;
const DEBUG = process.env.DEBUG === "1";

// 폭염저감시설 데이터셋 (DSSP-IF-10926)
const BASE_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-10926";
const PAGE_SIZE = 1000;

const SEOUL_GU = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
  "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
  "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
  "서초구", "강남구", "송파구", "강동구",
];

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

// safetydata.go.kr가 간헐적으로 연결 타임아웃/일시 오류를 일으키는 경우가 있어
// 재시도를 둔다.
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
  const url = new URL(BASE_URL);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(PAGE_SIZE));

  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`safetydata API HTTP ${res.status}`);
  const json = await res.json();
  // safetydata.go.kr V2 응답 포맷: { header: {...}, body: [...] } 형태가 일반적이나
  // 변형 가능성이 있어 여러 경로를 시도한다.
  const items = json?.body ?? json?.response?.body?.items?.item ?? json?.items ?? [];
  return Array.isArray(items) ? items : [items].filter(Boolean);
}

function toPlace(raw, index) {
  const roadAddr = pick(raw, ["RDNMADR", "RD_NM_ADDR", "ROAD_NM_ADRES", "ADDR"]);
  const lotAddr = pick(raw, ["LOTNO_ADDR", "LOTNO_ADRES"]);
  const address = roadAddr || lotAddr;
  const lat = Number(pick(raw, ["LAT", "LA", "lat"]));
  const lng = Number(pick(raw, ["LOT", "LO", "LON", "lng"]));
  // safetydata 그늘막 데이터셋에는 별도 시설명 필드가 없어 주소 기반으로 생성한다.
  const name = pick(raw, ["FCLT_NM", "FCLTY_NM", "INSTL_PLC_NM", "fcltNm"]) ||
    (address ? `그늘막 (${address})` : undefined);

  if (!name || !address || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const gu = extractGu(address);
  if (!gu) return null; // MVP 범위: 서울 25개구만

  return {
    id: `shade-safetydata-${index}`,
    name,
    category: "shade",
    gu,
    address,
    lat,
    lng,
    familyFriendly: true,
  };
}

async function main() {
  if (!API_KEY) {
    console.error("SAFETYDATA_API_KEY 환경변수가 없어 shades.json 빌드를 건너뜁니다.");
    process.exit(0);
  }

  const places = [];
  let pageNo = 1;

  while (pageNo < 50) {
    const items = await fetchPage(pageNo);
    if (DEBUG && pageNo === 1) {
      console.log("샘플 원본 item:", JSON.stringify(items[0], null, 2));
    }
    if (items.length === 0) break;

    items.forEach((raw, i) => {
      const place = toPlace(raw, `${pageNo}-${i}`);
      if (place) places.push(place);
    });

    if (items.length < PAGE_SIZE) break;
    pageNo += 1;
  }

  await writeFile(
    path.join(__dirname, "../src/data/shades.json"),
    JSON.stringify(places, null, 2)
  );
  console.log(`shades.json 작성 완료: 서울 ${places.length}곳`);
}

main().catch((err) => {
  console.error("폭염저감시설 데이터 빌드 실패:", err);
  process.exit(1);
});
