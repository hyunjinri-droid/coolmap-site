import type { Metadata } from "next";
import Link from "next/link";
import { getAllPlaces } from "@/lib/places";
import guCenters from "@/data/gu-centers.json";

export const metadata: Metadata = {
  title: "서울 구별 통계 | 쿨맵",
  description: "서울 25개 자치구별 무더위쉼터, 그늘막, 수변공간 수를 한눈에 확인하세요.",
};

const GU_ORDER = [
  "종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구",
  "강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구",
  "구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구",
];

export default function StatsPage() {
  const places = getAllPlaces();

  const stats = GU_ORDER.map((gu) => {
    const guPlaces = places.filter((p) => p.gu === gu);
    return {
      gu,
      shelter: guPlaces.filter((p) => p.category === "shelter").length,
      shade:   guPlaces.filter((p) => p.category === "shade").length,
      water:   guPlaces.filter((p) => p.category === "water").length,
      total:   guPlaces.length,
    };
  });

  const maxTotal = Math.max(...stats.map((s) => s.total), 1);

  return (
    <div className="stats-page">
      <div className="stats-header">
        <Link href="/" className="stats-back">← 지도로</Link>
        <h1 className="stats-title">🗺️ 서울 구별 통계</h1>
        <p className="stats-subtitle">무더위쉼터·그늘막·수변공간 현황</p>
      </div>

      <div className="stats-summary">
        <div className="stats-summary-item">
          <span className="stats-summary-icon">🏠</span>
          <span className="stats-summary-count">{places.filter(p=>p.category==="shelter").length.toLocaleString()}</span>
          <span className="stats-summary-label">무더위쉼터</span>
        </div>
        <div className="stats-summary-item">
          <span className="stats-summary-icon">⛱️</span>
          <span className="stats-summary-count">{places.filter(p=>p.category==="shade").length.toLocaleString()}</span>
          <span className="stats-summary-label">그늘막</span>
        </div>
        <div className="stats-summary-item">
          <span className="stats-summary-icon">💧</span>
          <span className="stats-summary-count">{places.filter(p=>p.category==="water").length.toLocaleString()}</span>
          <span className="stats-summary-label">수변공간</span>
        </div>
        <div className="stats-summary-item stats-summary-total">
          <span className="stats-summary-icon">📌</span>
          <span className="stats-summary-count">{places.length.toLocaleString()}</span>
          <span className="stats-summary-label">전체</span>
        </div>
      </div>

      <div className="stats-list">
        {stats
          .sort((a, b) => b.total - a.total)
          .map((s, rank) => (
          <Link
            key={s.gu}
            href={`/gu/${encodeURIComponent(s.gu)}`}
            className="stats-card"
          >
            <div className="stats-card-rank">#{rank + 1}</div>
            <div className="stats-card-body">
              <div className="stats-card-name">{s.gu}</div>
              <div className="stats-card-bar-wrap">
                <div
                  className="stats-card-bar"
                  style={{ width: `${(s.total / maxTotal) * 100}%` }}
                />
              </div>
              <div className="stats-card-chips">
                <span className="stats-chip stats-chip-shelter">🏠 {s.shelter}</span>
                <span className="stats-chip stats-chip-shade">⛱️ {s.shade}</span>
                <span className="stats-chip stats-chip-water">💧 {s.water}</span>
              </div>
            </div>
            <div className="stats-card-total">{s.total}<span>곳</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
