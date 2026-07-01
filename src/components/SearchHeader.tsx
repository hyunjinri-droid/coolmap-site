"use client";

import { useRef, useState, useEffect } from "react";
import type { Place } from "@/lib/types";

const CATEGORY_LABEL: Record<Place["category"], string> = {
  shelter: "무더위쉼터",
  shade: "그늘막",
  water: "수변공간",
};

const CATEGORY_ICON: Record<Place["category"], string> = {
  shelter: "🏠",
  shade: "⛱️",
  water: "💧",
};

interface SearchHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onLocate: () => void;
  locating?: boolean;
  places: Place[];
  onSelectPlace: (place: Place) => void;
}

export default function SearchHeader({
  query,
  onQueryChange,
  onLocate,
  locating,
  places,
  onSelectPlace,
}: SearchHeaderProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = query.trim().length >= 1
    ? places
        .filter((p) =>
          p.name.includes(query) ||
          p.address.includes(query) ||
          p.gu.includes(query)
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    setOpen(suggestions.length > 0);
  }, [suggestions.length]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(place: Place) {
    onSelectPlace(place);
    onQueryChange("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="search-header">
      <div className="app-logo">
        <span className="app-logo-icon">🌡️</span>
        <span className="app-logo-name">쿨맵</span>
      </div>
      <div className="search-input-wrap" ref={wrapRef}>
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="동네 또는 장소 검색"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {query && (
          <button className="search-clear" onClick={() => { onQueryChange(""); setOpen(false); }} aria-label="검색 지우기">
            ×
          </button>
        )}
        {open && (
          <ul className="search-dropdown">
            {suggestions.map((place) => (
              <li
                key={place.id}
                className="search-dropdown-item"
                onMouseDown={() => handleSelect(place)}
              >
                <span className="search-dropdown-icon">{CATEGORY_ICON[place.category]}</span>
                <span className="search-dropdown-info">
                  <span className="search-dropdown-name">{highlightMatch(place.name, query)}</span>
                  <span className="search-dropdown-sub">
                    {CATEGORY_LABEL[place.category]} · {place.gu}
                  </span>
                </span>
              </li>
            ))}
          </ul>
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

function highlightMatch(text: string, query: string) {
  const idx = text.indexOf(query);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#fde68a", borderRadius: 2 }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
