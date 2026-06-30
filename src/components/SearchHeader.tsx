"use client";

interface SearchHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onLocate: () => void;
  locating?: boolean;
}

export default function SearchHeader({
  query,
  onQueryChange,
  onLocate,
  locating,
}: SearchHeaderProps) {
  return (
    <div className="search-header">
      <input
        className="search-input"
        type="text"
        placeholder="동네 또는 장소 검색"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <button className="locate-btn" onClick={onLocate} disabled={locating}>
        {locating ? "위치 확인 중…" : "현재 위치"}
      </button>
    </div>
  );
}
