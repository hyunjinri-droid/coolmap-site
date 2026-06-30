"use client";

import { useMemo, useState } from "react";
import CoolMapClient from "./CoolMapClient";
import FilterBar, { FilterValue } from "./FilterBar";
import StatusBadge from "./StatusBadge";
import DetailSheet from "./DetailSheet";
import SearchHeader from "./SearchHeader";
import placesData from "@/data/places.json";
import type { Place } from "@/lib/types";
import { getDummyWeatherStatus } from "@/lib/weather";

const ALL_PLACES = placesData as Place[];
const SEOUL_CENTER: [number, number] = [37.5665, 126.978];

export default function CoolMapApp({ gu }: { gu?: string }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [familyOnly, setFamilyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const weather = useMemo(() => getDummyWeatherStatus(), []);

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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }

  return (
    <div className="coolmap-app">
      <SearchHeader query={query} onQueryChange={setQuery} onLocate={handleLocate} />
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
      </div>
      <DetailSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
