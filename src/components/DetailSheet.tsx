"use client";

import type { Place } from "@/lib/types";
import { kakaoMapLink, naverMapLink } from "@/lib/deeplinks";

const CATEGORY_LABEL: Record<Place["category"], string> = {
  shelter: "무더위쉼터",
  shade: "그늘막",
  water: "수변공간",
};

interface DetailSheetProps {
  place: Place | null;
  onClose: () => void;
}

export default function DetailSheet({ place, onClose }: DetailSheetProps) {
  if (!place) return null;

  return (
    <div className="detail-sheet">
      <button className="detail-sheet-close" onClick={onClose} aria-label="닫기">
        ×
      </button>
      <div className="detail-sheet-category">{CATEGORY_LABEL[place.category]}</div>
      <h2 className="detail-sheet-name">{place.name}</h2>
      {place.familyFriendly && <span className="badge-family">유아 추천</span>}
      <p className="detail-sheet-address">{place.address}</p>
      {place.hours && <p className="detail-sheet-hours">운영시간 {place.hours}</p>}
      {place.note && <p className="detail-sheet-note">{place.note}</p>}
      <div className="detail-sheet-actions">
        <a
          href={kakaoMapLink(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-kakao"
        >
          카카오맵 길찾기
        </a>
        <a
          href={naverMapLink(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-naver"
        >
          네이버지도 길찾기
        </a>
      </div>
    </div>
  );
}
