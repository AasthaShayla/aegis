"use client";

import { useUtcClock } from "@/hooks/useUtcClock";
import { fmtNum } from "@/lib/format";
import { useUiStore } from "@/store/useUiStore";
import { SearchBar } from "@/components/ui/SearchBar";
import type { Entity } from "@/lib/entities";

export type Connection = "ok" | "warn" | "down";

interface Props {
  totalTracked: number;
  flights: number;
  satellites: number;
  quakes: number;
  connection: Connection;
  alertCount: number;
  searchPool: Entity[];
}

export function TopStatusBar({ totalTracked, flights, satellites, quakes, connection, alertCount, searchPool }: Props) {
  const now = useUtcClock();
  const clock = new Date(now).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  const connLabel = connection === "ok" ? "ALL FEEDS LIVE" : connection === "warn" ? "DEGRADED" : "OFFLINE";
  const briefingOpen = useUiStore((s) => s.briefingOpen);
  const setBriefingOpen = useUiStore((s) => s.setBriefingOpen);

  return (
    <div className="statusbar">
      <div className="brand">
        <span className="dot" />
        AEGIS
      </div>
      <div className="clock mono">{clock}</div>
      <SearchBar pool={searchPool} />
      <div className="stats mono">
        <span className="stat">
          TRACKED <b>{fmtNum(totalTracked)}</b>
        </span>
        <span className="stat">✈ <b>{fmtNum(flights)}</b></span>
        <span className="stat">🛰 <b>{fmtNum(satellites)}</b></span>
        <span className="stat">⚡ <b>{fmtNum(quakes)}</b></span>
      </div>
      <button className={`brief-btn ${briefingOpen ? "active" : ""}`} onClick={() => setBriefingOpen(!briefingOpen)}>
        🧠 Briefing
      </button>
      {alertCount > 0 && <span className="alert-pill">▲ {alertCount}</span>}
      <div className="conn">
        <span className={`ind ${connection}`} />
        {connLabel}
      </div>
    </div>
  );
}
