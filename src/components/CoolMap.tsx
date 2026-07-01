"use client";

import { MapContainer, TileLayer, Marker, useMap, CircleMarker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import type { Place, PlaceCategory } from "@/lib/types";

// 카테고리별 색상
const CATEGORY_STYLE: Record<PlaceCategory, { color: string; emoji: string }> = {
  shelter: { color: "#f97316", emoji: "🏠" },
  shade:   { color: "#0284c7", emoji: "⛱️" },
  water:   { color: "#06b6d4", emoji: "💧" },
};

function makeIcon(color: string, selected = false) {
  const size = selected ? 22 : 16;
  const border = selected ? 3 : 2;
  const shadow = selected ? "0 0 0 4px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.4)";
  return L.divIcon({
    className: "coolmap-marker",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border}px solid #fff;box-shadow:${shadow};transition:all 0.15s;"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const MY_ICON = L.divIcon({
  className: "coolmap-marker",
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,0.35),0 2px 6px rgba(0,0,0,0.3);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function RecenterOnUser({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

function FlyToSelected({ place }: { place: Place | null }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.panTo([place.lat, place.lng], { animate: true, duration: 0.4 });
  }, [place, map]);
  return null;
}

interface CoolMapProps {
  places: Place[];
  center: [number, number];
  userPosition: [number, number] | null;
  selectedId: string | null;
  onSelect: (place: Place) => void;
  selectedPlace?: Place | null;
}

export default function CoolMap({
  places,
  center,
  userPosition,
  selectedId,
  onSelect,
  selectedPlace,
}: CoolMapProps) {
  // 카테고리별로 나눠서 각 그룹에 다른 클러스터 색 적용
  const grouped = useMemo(() => {
    const g: Record<PlaceCategory, Place[]> = { shelter: [], shade: [], water: [] };
    for (const p of places) g[p.category].push(p);
    return g;
  }, [places]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPosition && <RecenterOnUser position={userPosition} />}
      {selectedPlace && <FlyToSelected place={selectedPlace} />}

      {/* 내 위치 */}
      {userPosition && (
        <Marker position={userPosition} icon={MY_ICON} />
      )}

      {/* 카테고리별 클러스터 그룹 */}
      {(["shelter", "shade", "water"] as PlaceCategory[]).map((cat) => {
        const style = CATEGORY_STYLE[cat];
        return (
          <MarkerClusterGroup
            key={cat}
            chunkedLoading
            maxClusterRadius={50}
            iconCreateFunction={(cluster: { getChildCount: () => number }) => {
              const count = cluster.getChildCount();
              const size = count > 100 ? 44 : count > 20 ? 36 : 30;
              return L.divIcon({
                html: `<div style="background:${style.color};color:#fff;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${count > 99 ? 11 : 13}px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${count > 999 ? "999+" : count}</div>`,
                className: "coolmap-cluster",
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              });
            }}
          >
            {grouped[cat].map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={makeIcon(style.color, selectedId === place.id)}
                eventHandlers={{ click: () => onSelect(place) }}
              />
            ))}
          </MarkerClusterGroup>
        );
      })}
    </MapContainer>
  );
}
