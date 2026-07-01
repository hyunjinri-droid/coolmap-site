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
      <div className="app-logo">
        <span className="app-logo-icon">🌡️</span>
        <span className="app-logo-name">쿨맵</span>
      </div>
      <div className="search-input-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="동네 또는 장소 검색"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button className="search-clear" onClick={() => onQueryChange("")} aria-label="검색 지우기">
            ×
          </button>
        )}
      </div>
      <button className="locate-btn" onClick={onLocate} disabled={locating} title="현재 위치">
        {locating ? (
          <span className="locate-spinner">⟳</span>
        ) : (
          "📍"
        )}
      </button>
    </div>
  );
}
