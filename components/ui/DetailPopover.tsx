"use client";

import type { Entity } from "@/lib/entities";
import { fmtAltitude, fmtCoord, fmtNum, fmtRelTime, fmtUtc, weatherCodeText } from "@/lib/format";
import { useUiStore } from "@/store/useUiStore";

interface Row {
  k: string;
  v: string;
}

const FOLLOWABLE = new Set(["flight", "satellite", "ship"]);

function rowsFor(e: Entity): Row[] {
  const p = e.props;
  const rows: Row[] = [];
  const n = (v: unknown) => (typeof v === "number" ? v : null);

  switch (e.type) {
    case "flight":
      rows.push({ k: "Altitude", v: p.onGround ? "on ground" : fmtAltitude(n(p.altitude)) });
      rows.push({ k: "Speed", v: n(p.speed) !== null ? `${fmtNum(n(p.speed))} kt` : "—" });
      rows.push({ k: "Heading", v: `${Math.round(n(p.heading) ?? 0)}°` });
      if (p.aircraftType) rows.push({ k: "Type", v: String(p.aircraftType) });
      if (p.registration) rows.push({ k: "Registration", v: String(p.registration) });
      if (p.squawk) rows.push({ k: "Squawk", v: String(p.squawk) });
      if (p.military) rows.push({ k: "Class", v: "military" });
      break;
    case "satellite":
      rows.push({ k: "Altitude", v: n(p.altKm) !== null ? `${fmtNum(n(p.altKm))} km` : "—" });
      if (p.noradId) rows.push({ k: "NORAD", v: String(p.noradId) });
      if (p.group) rows.push({ k: "Group", v: String(p.group) });
      break;
    case "earthquake":
      rows.push({ k: "Magnitude", v: n(p.mag) !== null ? `M ${(n(p.mag) as number).toFixed(1)}` : "—" });
      rows.push({ k: "Depth", v: `${fmtNum(n(p.depth))} km` });
      if (p.tsunami) rows.push({ k: "Tsunami", v: "flagged" });
      break;
    case "disaster":
      rows.push({ k: "Category", v: String(p.category ?? "event") });
      break;
    case "event":
      rows.push({ k: "Mentions", v: fmtNum(n(p.count)) });
      break;
    case "weather": {
      const cur = (p.current as Record<string, number>) ?? {};
      const units = (p.units as Record<string, string>) ?? {};
      if (cur.temperature_2m !== undefined) rows.push({ k: "Temp", v: `${cur.temperature_2m}${units.temperature_2m ?? "°C"}` });
      if (cur.apparent_temperature !== undefined) rows.push({ k: "Feels like", v: `${cur.apparent_temperature}${units.apparent_temperature ?? "°C"}` });
      if (cur.weather_code !== undefined) rows.push({ k: "Conditions", v: weatherCodeText(cur.weather_code) });
      if (cur.wind_speed_10m !== undefined) rows.push({ k: "Wind", v: `${cur.wind_speed_10m}${units.wind_speed_10m ?? " km/h"}` });
      if (cur.relative_humidity_2m !== undefined) rows.push({ k: "Humidity", v: `${cur.relative_humidity_2m}%` });
      break;
    }
    case "cyber":
      rows.push({ k: "IOC type", v: String(p.iocType) });
      rows.push({ k: "Threat", v: String(p.threatType) });
      if (p.malware) rows.push({ k: "Malware", v: String(p.malware) });
      if (p.country) rows.push({ k: "Country", v: String(p.country) });
      rows.push({ k: "Confidence", v: `${p.confidence}%` });
      break;
    case "camera":
      rows.push({ k: "Provider", v: String(p.provider ?? "—") });
      if (p.view) rows.push({ k: "View", v: String(p.view) });
      break;
    case "outage":
      rows.push({ k: "Cause", v: String(p.cause ?? "unknown") });
      if (p.asn) rows.push({ k: "ASN", v: String(p.asn) });
      break;
    case "airquality":
      if (p.country) rows.push({ k: "Country", v: String(p.country) });
      break;
    case "ship":
      rows.push({ k: "Speed", v: n(p.speed) !== null ? `${p.speed} kt` : "—" });
      rows.push({ k: "Heading", v: `${Math.round(n(p.heading) ?? 0)}°` });
      break;
    case "fire":
      if (p.frp) rows.push({ k: "Radiative power", v: `${p.frp} MW` });
      if (p.confidence) rows.push({ k: "Confidence", v: String(p.confidence) });
      break;
    default:
      break;
  }

  if (e.lat !== null && e.lon !== null) rows.push({ k: "Position", v: fmtCoord(e.lat, e.lon) });
  rows.push({ k: "Observed", v: `${fmtRelTime(e.ts)} · ${fmtUtc(e.ts)}` });
  return rows;
}

export function DetailPopover({ entity }: { entity: Entity }) {
  const select = useUiStore((s) => s.select);
  const setFollow = useUiStore((s) => s.setFollow);
  const requestFlyTo = useUiStore((s) => s.requestFlyTo);
  const rows = rowsFor(entity);

  const articles = entity.type === "event" ? ((entity.props.articles as Array<{ title: string; url: string }>) ?? []) : [];
  const url = typeof entity.props.url === "string" ? entity.props.url : null;
  const reference = typeof entity.props.reference === "string" ? entity.props.reference : null;
  const image = entity.type === "camera" && typeof entity.props.image === "string" ? entity.props.image : null;

  return (
    <div className="popover panel">
      <div className="pop-head">
        <span className="ptype">{entity.type}</span>
        <span className="ptitle">{entity.label}</span>
        <button className="pop-close" onClick={() => select(null)} aria-label="close">
          ×
        </button>
      </div>
      <div className="pop-body">
        {image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="cam-thumb" src={image} alt={entity.label} />
        )}
        {rows.map((r, i) => (
          <div className="kv" key={i}>
            <span className="k">{r.k}</span>
            <span className="v">{r.v}</span>
          </div>
        ))}

        {articles.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {articles.slice(0, 4).map((a, i) => (
              <div className="fi-art" key={i} style={{ whiteSpace: "normal", marginTop: 4 }}>
                <a href={a.url} target="_blank" rel="noreferrer">
                  {a.title}
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="pop-actions">
          {entity.lat !== null && entity.lon !== null && (
            <button onClick={() => requestFlyTo(entity.lon as number, entity.lat as number, 6)}>Center</button>
          )}
          {FOLLOWABLE.has(entity.type) && <button onClick={() => setFollow(entity)}>Follow</button>}
          {url && (
            <a href={url} target="_blank" rel="noreferrer">
              Details ↗
            </a>
          )}
          {reference && (
            <a href={reference} target="_blank" rel="noreferrer">
              Reference ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
