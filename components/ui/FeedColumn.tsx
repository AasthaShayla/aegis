"use client";

import { useMemo, useState } from "react";
import type { Entity } from "@/lib/entities";
import type { AlertItem } from "@/lib/alerts";
import { fmtNum, fmtRelTime } from "@/lib/format";
import { useUiStore } from "@/store/useUiStore";

interface Props {
  events: Entity[];
  eventsLoading: boolean;
  eventsStale: boolean;
  threats: Entity[];
  threatsLoading: boolean;
  cyberAvailable: boolean;
  alerts: AlertItem[];
}

type Tab = "alerts" | "events" | "threats";

export function FeedColumn({ events, eventsLoading, eventsStale, threats, threatsLoading, cyberAvailable, alerts }: Props) {
  const [tab, setTab] = useState<Tab>("alerts");
  const select = useUiStore((s) => s.select);
  const requestFlyTo = useUiStore((s) => s.requestFlyTo);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.props.count as number) - (a.props.count as number)).slice(0, 60),
    [events],
  );

  return (
    <div className="feed panel">
      <div className="threat-toggle">
        <button className={tab === "alerts" ? "active" : ""} onClick={() => setTab("alerts")}>
          Alerts{alerts.length ? ` (${alerts.length})` : ""}
        </button>
        <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>
          Events
        </button>
        {cyberAvailable && (
          <button className={tab === "threats" ? "active" : ""} onClick={() => setTab("threats")}>
            Threats
          </button>
        )}
      </div>

      {tab === "alerts" && (
        <>
          <div className="feed-head">
            <span>Correlated alerts</span>
            <span className="mono" style={{ color: "var(--text-faint)" }}>
              cross-stream
            </span>
          </div>
          <div className="feed-list">
            {alerts.length === 0 && <div className="feed-empty">No active alerts. All quiet.</div>}
            {alerts.map((a) => (
              <div
                key={a.id}
                className="feed-item"
                onClick={() => a.lon !== null && a.lat !== null && requestFlyTo(a.lon, a.lat, 5)}
              >
                <div className="fi-loc">
                  <span className={`sev sev-${a.severity}`} /> {a.title}
                </div>
                <div className="fi-art" style={{ whiteSpace: "normal" }}>
                  {a.detail}
                </div>
                <div className="fi-meta mono">
                  <span>{fmtRelTime(a.ts)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "events" && (
        <>
          <div className="feed-head">
            <span>Global event feed</span>
            <span className="mono" style={{ color: eventsStale ? "var(--amber)" : "var(--text-faint)" }}>
              {eventsStale ? "cached" : "live"}
            </span>
          </div>
          <div className="feed-list">
            {eventsLoading && sortedEvents.length === 0 && <div className="feed-loading">Acquiring event feed…</div>}
            {!eventsLoading && sortedEvents.length === 0 && <div className="feed-empty">No geolocated events right now.</div>}
            {sortedEvents.map((e) => {
              const articles = (e.props.articles as Array<{ title: string; url: string }>) ?? [];
              return (
                <div
                  key={e.id}
                  className="feed-item"
                  onClick={() => {
                    select(e);
                    if (e.lon !== null && e.lat !== null) requestFlyTo(e.lon, e.lat, 5);
                  }}
                >
                  <div className="fi-loc">{e.label}</div>
                  <div className="fi-meta mono">
                    <span>{fmtNum(e.props.count as number)} mentions</span>
                  </div>
                  {articles[0] && <div className="fi-art">{articles[0].title}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "threats" && (
        <>
          <div className="feed-head">
            <span>Threat indicators</span>
            <span className="mono" style={{ color: "var(--text-faint)" }}>
              ThreatFox
            </span>
          </div>
          <div className="feed-list">
            {threatsLoading && threats.length === 0 && <div className="feed-loading">Loading IOC feed…</div>}
            {!threatsLoading && threats.length === 0 && <div className="feed-empty">No recent indicators.</div>}
            {threats.slice(0, 80).map((t) => (
              <div key={t.id} className="threat-item">
                <div className="ioc">{t.label}</div>
                <div className="tmeta">
                  <span className="badge">{String(t.props.malware || t.props.threatType || "ioc")}</span>
                  <span>{String(t.props.iocType)}</span>
                  <span>conf {String(t.props.confidence)}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
