"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { Place, PlaceCategory } from "@/lib/types";

const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  shelter: "#f97316",
  shade: "#f97316",
  water: "#22c55e",
};

function makeIcon(color: string) {
  return L.divIcon({
    className: "coolmap-marker",
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.5);"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const MY_LOCATION_ICON = makeIcon("#3b82f6");

function RecenterOnUser({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

interface CoolMapProps {
  places: Place[];
  center: [number, number];
  userPosition: [number, number] | null;
  selectedId: string | null;
  onSelect: (place: Place) => void;
}

export default function CoolMap({
  places,
  center,
  userPosition,
  selectedId,
  onSelect,
}: CoolMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPosition && <RecenterOnUser position={userPosition} />}
      {userPosition && (
        <Marker position={userPosition} icon={MY_LOCATION_ICON}>
          <Popup>현재 위치</Popup>
        </Marker>
      )}
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={makeIcon(CATEGORY_COLOR[place.category])}
          eventHandlers={{ click: () => onSelect(place) }}
          opacity={selectedId === place.id ? 1 : 0.9}
        >
          <Popup>{place.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
