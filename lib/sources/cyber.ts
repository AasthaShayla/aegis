/**
 * Cyber threat indicators from abuse.ch ThreatFox (key-free CSV export).
 * IP-type IOCs are geolocated server-side via ip-api's free batch endpoint so
 * they can be plotted on the map; all IOCs also feed the side-panel list.
 */

import Papa from "papaparse";
import { fetchJson, fetchText } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const CYBER_TTL_MS = 5 * 60 * 1000; // 5m
export const CYBER_SOURCE = "ThreatFox / abuse.ch";
export const CYBER_ATTRIBUTION = "Threat data: ThreatFox (abuse.ch); geo by ip-api.com";

const COLS = [
  "first_seen_utc",
  "ioc_id",
  "ioc_value",
  "ioc_type",
  "threat_type",
  "fk_malware",
  "malware_printable",
  "last_seen_utc",
  "confidence_level",
  "reference",
  "tags",
  "anonymous",
  "reporter",
] as const;

interface IpApiResult {
  status: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
  query: string;
}

export async function fetchCyber(): Promise<Entity[]> {
  const csv = await fetchText("https://threatfox.abuse.ch/export/csv/recent/", {
    timeoutMs: 12_000,
    breakerKey: "threatfox",
  });
  const parsed = Papa.parse<string[]>(csv, { comments: "#", skipEmptyLines: true });
  const rows = parsed.data.filter((r) => Array.isArray(r) && r.length >= COLS.length);

  const entities: Entity[] = [];
  for (const row of rows) {
    const rec: Record<string, string> = {};
    COLS.forEach((c, i) => (rec[c] = (row[i] ?? "").trim()));
    if (!rec.ioc_id || !rec.ioc_value) continue;
    entities.push({
      id: rec.ioc_id,
      type: "cyber",
      lat: null,
      lon: null,
      label: rec.ioc_value,
      ts: Date.parse(rec.first_seen_utc.replace(" ", "T") + "Z") || Date.now(),
      props: {
        iocType: rec.ioc_type,
        threatType: rec.threat_type,
        malware: rec.malware_printable || rec.fk_malware,
        confidence: Number(rec.confidence_level) || 0,
        tags: rec.tags,
        reference: rec.reference,
        reporter: rec.reporter,
      },
    });
  }

  entities.sort((a, b) => (b.props.confidence as number) - (a.props.confidence as number));
  const top = entities.slice(0, 250);
  await geolocate(top);
  return top;
}

/** Attach lat/lon to IP-type IOCs via ip-api batch (best-effort, non-fatal). */
async function geolocate(entities: Entity[]): Promise<void> {
  const ipFor = (e: Entity): string | null => {
    const type = String(e.props.iocType);
    if (type !== "ip:port" && type !== "ip") return null;
    const ip = e.label.split(":")[0];
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : null;
  };

  const targets = entities.filter((e) => ipFor(e));
  if (targets.length === 0) return;

  const ips = [...new Set(targets.map((e) => ipFor(e)!))];
  const geo = new Map<string, { lat: number; lon: number; cc: string }>();

  try {
    for (let i = 0; i < ips.length; i += 100) {
      const chunk = ips.slice(i, i + 100);
      const res = await fetchJson<IpApiResult[]>(
        "http://ip-api.com/batch?fields=status,countryCode,lat,lon,query",
        {
          method: "POST",
          body: JSON.stringify(chunk),
          headers: { "content-type": "application/json" },
          timeoutMs: 12_000,
          breakerKey: "ip-api",
        },
      );
      for (const r of res) {
        if (r.status === "success" && typeof r.lat === "number" && typeof r.lon === "number") {
          geo.set(r.query, { lat: r.lat, lon: r.lon, cc: r.countryCode ?? "" });
        }
      }
    }
  } catch {
    return; // geo is best-effort; feed still works
  }

  for (const e of targets) {
    const ip = ipFor(e)!;
    const g = geo.get(ip);
    if (g) {
      e.lat = g.lat;
      e.lon = g.lon;
      (e.props as Record<string, unknown>).country = g.cc;
    }
  }
}
