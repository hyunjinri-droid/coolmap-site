"use client";

import type { Place } from "@/lib/types";
import { kakaoMapLink, naverMapLink } from "@/lib/deeplinks";
import AdSlot from "./AdSlot";

const CATEGORY_LABEL: Record<Place["category"], { label: string; icon: string; color: string }> = {
  shelter: { label: "무더위쉼터", icon: "🏠", color: "#ea580c" },
  shade:   { label: "그늘막",    icon: "⛱️", color: "#0284c7" },
  water:   { label: "수변공간",  icon: "💧", color: "#0891b2" },
};

interface DetailSheetProps {
  place: Place | null;
  onClose: () => void;
}

export default function DetailSheet({ place, onClose }: DetailSheetProps) {
  if (!place) return null;

  const cat = CATEGORY_LABEL[place.category];

  return (
    <>
      <div className="detail-sheet-backdrop" onClick={onClose} />
      <div className="detail-sheet">
        <div className="detail-sheet-handle" />
        <button className="detail-sheet-close" onClick={onClose} aria-label="닫기">×</button>

        <div className="detail-sheet-category" style={{ color: cat.color }}>
          {cat.icon} {cat.label}
        </div>
        <h2 className="detail-sheet-name">{place.name}</h2>

        <div className="detail-sheet-badges">
          {place.familyFriendly && <span className="badge badge-family">👶 유아 추천</span>}
        </div>

        <div className="detail-sheet-info">
          <div className="info-row">
            <span className="info-icon">📍</span>
            <span>{place.address}</span>
          </div>
          {place.hours && (
            <div className="info-row">
              <span className="info-icon">🕐</span>
              <span>{place.hours}</span>
            </div>
          )}
          {place.note && (
            <div className="info-row">
              <span className="info-icon">ℹ️</span>
              <span>{place.note}</span>
            </div>
          )}
        </div>

        <div className="detail-sheet-actions">
          <a
            href={kakaoMapLink(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-kakao"
          >
            🗺️ 카카오맵
          </a>
          <a
            href={naverMapLink(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-naver"
          >
            🗺️ 네이버지도
          </a>
        </div>
        <AdSlot className="detail-sheet-ad" />
      </div>
    </>
  );
}
