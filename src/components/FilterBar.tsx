"use client";

import type { PlaceCategory } from "@/lib/types";

export type FilterValue = "all" | PlaceCategory;

interface FilterBarProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  familyOnly: boolean;
  onFamilyOnlyChange: (value: boolean) => void;
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "shelter", label: "무더위쉼터" },
  { value: "shade", label: "그늘막" },
  { value: "water", label: "수변공간" },
];

export default function FilterBar({
  value,
  onChange,
  familyOnly,
  onFamilyOnlyChange,
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
            {f.label}
          </button>
        ))}
      </div>
      <label className="family-toggle">
        <input
          type="checkbox"
          checked={familyOnly}
          onChange={(e) => onFamilyOnlyChange(e.target.checked)}
        />
        유아 추천만
      </label>
    </div>
  );
}
