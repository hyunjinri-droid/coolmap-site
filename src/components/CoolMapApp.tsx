"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CoolMapClient from "./CoolMapClient";
import FilterBar, { FilterValue } from "./FilterBar";
import StatusBadge from "./StatusBadge";
import DetailSheet from "./DetailSheet";
import SearchHeader from "./SearchHeader";
import KakaoAdFit from "./KakaoAdFit";
import type { Place } from "@/lib/types";
import { getWeatherStatus } from "@/lib/weather";
import { getAllPlaces } from "@/lib/places";

const ALL_PLACES = getAllPlaces();
const ALL_CITIES = ["서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const KOREA_CENTER: [number, number] = [36.5, 127.5];
const SEOUL_CENTER: [number, number] = [37.5665, 126.978];

const CITY_CENTERS: Record<string, [number, number]> = {
  서울: [37.5665, 126.978], 경기: [37.4138, 127.5183], 인천: [37.4563, 126.7052],
  부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014], 대전: [36.3504, 127.3845],
  광주: [35.1595, 126.8526], 울산: [35.5384, 129.3114], 세종: [36.4801, 127.2890],
  강원: [37.8228, 128.1555], 충북: [36.6357, 127.4917], 충남: [36.5184, 126.8000],
  전북: [35.7175, 127.1530], 전남: [34.8161, 126.4629], 경북: [36.4919, 128.8889],
  경남: [35.4606, 128.2132], 제주: [33.4890, 126.4983],
};

type LocateState = "idle" | "loading" | "denied" | "unsupported";

export default function CoolMapApp({ gu }: { gu?: string }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [familyOnly, setFamilyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locateState, setLocateState] = useState<LocateState>("idle");
  const [selectedCity, setSelectedCity] = useState<string>("서울");
  const weather = useMemo(() => getWeatherStatus(gu), [gu]);

  const places = useMemo(() => {
    return ALL_PLACES.filter((p) => {
      if (gu && p.gu !== gu) return false;
      if (!gu && selectedCity && p.city !== selectedCity) return false;
      if (filter !== "all" && p.category !== filter) return false;
      if (familyOnly && !p.familyFriendly) return false;
      if (query && !p.name.includes(query) && !p.gu.includes(query) && !p.city.includes(query)) return false;
      return true;
    });
  }, [gu, filter, familyOnly, query, selectedCity]);

  const basePlaces = useMemo(() => ALL_PLACES.filter((p) => gu ? p.gu === gu : p.city === selectedCity), [gu, selectedCity]);
  const counts = useMemo(() => ({
    all:     basePlaces.length,
    shelter: basePlaces.filter((p) => p.category === "shelter").length,
    shade:   basePlaces.filter((p) => p.category === "shade").length,
    water:   basePlaces.filter((p) => p.category === "water").length,
  }), [basePlaces]);

  const center = userPosition ?? (selectedCity ? (CITY_CENTERS[selectedCity] ?? KOREA_CENTER) : SEOUL_CENTER);

  function handleLocate() {
    if (!navigator.geolocation) {
      setLocateState("unsupported");
      return;
    }
    setLocateState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocateState("idle");
      },
      () => {
        setLocateState("denied");
      }
    );
  }

  return (
    <div className="coolmap-app">
      <SearchHeader
        query={query}
        onQueryChange={setQuery}
        onLocate={handleLocate}
        locating={locateState === "loading"}
        places={ALL_PLACES}
        onSelectPlace={(place) => { setSelected(place); setQuery(""); }}
      />
      {locateState === "denied" && (
        <div className="locate-banner">
          위치 권한이 거부되어 현재 위치를 표시할 수 없어요. 브라우저 설정에서 위치
          권한을 허용해주세요.
        </div>
      )}
      {locateState === "unsupported" && (
        <div className="locate-banner">이 브라우저에서는 위치 확인을 지원하지 않아요.</div>
      )}
      <StatusBadge status={weather} />
      <KakaoAdFit />
      <div className="city-bar">
        {ALL_CITIES.map((city) => (
          <button
            key={city}
            className={`city-chip${selectedCity === city ? " active" : ""}`}
            onClick={() => setSelectedCity(city)}
          >
            {city}
          </button>
        ))}
      </div>
      <FilterBar
        value={filter}
        onChange={setFilter}
        familyOnly={familyOnly}
        onFamilyOnlyChange={setFamilyOnly}
        counts={counts}
      />
      <div className="map-wrap">
        <CoolMapClient
          places={places}
          center={center}
          userPosition={userPosition}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          selectedPlace={selected}
        />
        <Link href="/stats" className="map-count-badge">
          📌 {places.length.toLocaleString()}곳 · 지역통계 →
        </Link>
        {places.length === 0 && (
          <div className="empty-state">
            {gu ? `${gu}에는` : "선택한 조건에는"} 아직 등록된 장소가 없어요. 다른
            필터를 시도해보세요.
          </div>
        )}
      </div>
      <DetailSheet
        place={selected}
        onClose={() => setSelected(null)}
        userPosition={userPosition}
      />
    </div>
  );
}
