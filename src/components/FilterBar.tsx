"use client";

import type { PlaceCategory } from "@/lib/types";

export type FilterValue = "all" | PlaceCategory;

interface FilterBarProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  familyOnly: boolean;
  onFamilyOnlyChange: (value: boolean) => void;
  counts?: Record<FilterValue, number>;
}

const FILTERS: { value: FilterValue; label: string; icon: string }[] = [
  { value: "all", label: "전체", icon: "🗺️" },
  { value: "shelter", label: "무더위쉼터", icon: "🏠" },
  { value: "shade", label: "그늘막", icon: "⛱️" },
  { value: "water", label: "수변공간", icon: "💧" },
];

export default function FilterBar({
  value,
  onChange,
  familyOnly,
  onFamilyOnlyChange,
  counts,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-chips">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`filter-chip${value === f.value ? " active" : ""}`}
            onClick={() => onChange(f.value)}
          >
            <span className="chip-icon">{f.icon}</span>
            {f.label}
            {counts && (
              <span className="chip-count">{counts[f.value].toLocaleString()}</span>
            )}
          </button>
        ))}
      </div>
      <label className="family-toggle">
        <span className={`toggle-track${familyOnly ? " on" : ""}`}>
          <span className="toggle-thumb" />
        </span>
        <span className="toggle-label">👶 유아 추천</span>
        <input
          type="checkbox"
          checked={familyOnly}
          onChange={(e) => onFamilyOnlyChange(e.target.checked)}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}
