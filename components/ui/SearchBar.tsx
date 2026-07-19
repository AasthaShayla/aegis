"use client";

import { useMemo, useState } from "react";
import type { Entity } from "@/lib/entities";
import { useUiStore } from "@/store/useUiStore";

/** Client-side search across currently-loaded entities. */
export function SearchBar({ pool }: { pool: Entity[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const select = useUiStore((s) => s.select);
  const requestFlyTo = useUiStore((s) => s.requestFlyTo);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return pool.filter((e) => e.label.toLowerCase().includes(term)).slice(0, 8);
  }, [q, pool]);

  const pick = (e: Entity) => {
    select(e);
    if (e.lon !== null && e.lat !== null) requestFlyTo(e.lon, e.lat, 6);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="search">
      <input
        className="search-input mono"
        placeholder="Search flights, satellites, places…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="search-results panel">
          {results.map((e) => (
            <div key={`${e.type}-${e.id}`} className="search-item" onMouseDown={() => pick(e)}>
              <span className="si-type">{e.type}</span>
              <span className="si-label">{e.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
