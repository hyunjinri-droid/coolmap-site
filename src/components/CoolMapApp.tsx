"use client";

import { useMemo, useState } from "react";
import CoolMapClient from "./CoolMapClient";
import FilterBar, { FilterValue } from "./FilterBar";
import StatusBadge from "./StatusBadge";
import DetailSheet from "./DetailSheet";
import SearchHeader from "./SearchHeader";
import type { Place } from "@/lib/types";
import { getWeatherStatus } from "@/lib/weather";
import { getAllPlaces } from "@/lib/places";

const ALL_PLACES = getAllPlaces();
const SEOUL_CENTER: [number, number] = [37.5665, 126.978];

type LocateState = "idle" | "loading" | "denied" | "unsupported";

export default function CoolMapApp({ gu }: { gu?: string }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [familyOnly, setFamilyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locateState, setLocateState] = useState<LocateState>("idle");
  const weather = useMemo(() => getWeatherStatus(gu), [gu]);

  const places = useMemo(() => {
    return ALL_PLACES.filter((p) => {
      if (gu && p.gu !== gu) return false;
      if (filter !== "all" && p.category !== filter) return false;
      if (familyOnly && !p.familyFriendly) return false;
      if (query && !p.name.includes(query) && !p.gu.includes(query)) return false;
      return true;
    });
  }, [gu, filter, familyOnly, query]);

  const center = userPosition ?? SEOUL_CENTER;

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
      <FilterBar
        value={filter}
        onChange={setFilter}
        familyOnly={familyOnly}
        onFamilyOnlyChange={setFamilyOnly}
      />
      <div className="map-wrap">
        <CoolMapClient
          places={places}
          center={center}
          userPosition={userPosition}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
        {places.length === 0 && (
          <div className="empty-state">
            {gu ? `${gu}에는` : "선택한 조건에는"} 아직 등록된 장소가 없어요. 다른
            필터를 시도해보세요.
          </div>
        )}
      </div>
      <DetailSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
