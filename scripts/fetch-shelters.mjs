#!/usr/bin/env node
// 공공데이터포털(data.go.kr) 지역별 무더위쉼터 API를 받아
// src/data/shelters.json (Place[] 스키마)으로 빌드한다.
//
// 필요 환경변수: SHELTERS_API_KEY (공공데이터포털 일반 인증키)
//
// 주의: XML 응답이므로 node:stream/web 기반 간이 파싱을 사용한다.
// 처음 실행 시 DEBUG=1 로 실행해서 원본 item 구조를 확인할 것.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.SHELTERS_API_KEY;
const DEBUG = process.env.DEBUG === "1";

// data.go.kr API 오퍼레이션명 — 실제 엔드포인트에 맞게 조정 필요
// 포털 상세 페이지의 "기본 정보 > 오퍼레이션 URL" 항목에서 확인
const BASE_URL = "https://apis.data.go.kr/1741000/HealthSheltersForEachRegion/getHealthSheltersForEachRegion1";
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

// XML 태그값 추출 (간이 파서, 중첩 없는 단순 태그에 사용)
function xmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : undefined;
}

// <item>...</item> 블록 배열 추출
function xmlItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

// <item> 블록에서 태그→값 맵 생성
function parseItem(block) {
  const obj = {};
  const re = /<([A-Za-z0-9_]+)[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    obj[m[1]] = m[2].trim();
  }
  return obj;
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
  const url = new URL(BASE_URL);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(PAGE_SIZE));

  const res = await fetchWithRetry(url);
  const xml = await res.text();
  if (!res.ok) {
    console.error(`data.go.kr API HTTP ${res.status}, 응답 본문:\n`, xml.slice(0, 1000));
    throw new Error(`data.go.kr API HTTP ${res.status}`);
  }

  if (DEBUG && pageNo === 1) {
    console.log("원본 XML (앞 2000자):\n", xml.slice(0, 2000));
  }

  const totalCountStr = xmlTag(xml, "totalCount");
  const totalCount = totalCountStr ? Number(totalCountStr) : undefined;
  const items = xmlItems(xml).map(parseItem);

  if (DEBUG && pageNo === 1 && items.length > 0) {
    console.log("샘플 원본 item:", JSON.stringify(items[0], null, 2));
  }

  return { items, totalCount };
}

function toPlace(raw, index) {
  if (DEBUG) console.log("raw item:", JSON.stringify(raw));

  const name =
    raw.shelterName ?? raw.fcltNm ?? raw.FCLTY_NM ?? raw.name;
  const address =
    raw.streetAddress ?? raw.roadNmAddr ?? raw.address ?? raw.addr ?? raw.ADDR;
  const lat = Number(raw.latitude ?? raw.lat ?? raw.LA);
  const lng = Number(raw.longitude ?? raw.lng ?? raw.LO ?? raw.LOT);
  const fcltyTy = raw.shelterType ?? raw.facilityType ?? raw.typeNm ?? "";
  const hours = raw.operationPeriod ?? raw.useAt ?? raw.operTime;

  if (!name || !address || Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const gu = extractGu(address);
  if (!gu) return null;

  const familyFriendly = !SENIOR_ONLY_KEYWORDS.some((kw) => fcltyTy.includes(kw));

  return {
    id: `shelter-datagokr-${index}`,
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
    if (tc !== undefined) totalCount = tc;
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
