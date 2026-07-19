/**
 * Cross-stream correlation. Turns raw layer data into a ranked list of alerts
 * by applying simple, deterministic rules across streams. Pure function - runs
 * client-side over whatever layers are currently loaded.
 */

import type { Entity } from "@/lib/entities";

export type Severity = "info" | "warn" | "critical";

export interface AlertItem {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  lat: number | null;
  lon: number | null;
  ts: number;
}

export interface AlertInputs {
  earthquakes: Entity[];
  cyber: Entity[];
  events: Entity[];
  disasters: Entity[];
}

const SEV_RANK: Record<Severity, number> = { critical: 3, warn: 2, info: 1 };
const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);

export function computeAlerts(input: AlertInputs): AlertItem[] {
  const now = Date.now();
  const alerts: AlertItem[] = [];

  // 1. Significant earthquakes (and tsunami flags).
  for (const q of input.earthquakes) {
    const mag = num(q.props.mag);
    if (q.props.tsunami) {
      alerts.push({
        id: `tsunami-${q.id}`,
        severity: "critical",
        title: `Tsunami flag - M${mag.toFixed(1)}`,
        detail: q.label,
        lat: q.lat,
        lon: q.lon,
        ts: q.ts,
      });
    } else if (mag >= 6) {
      alerts.push({ id: `quake-${q.id}`, severity: "critical", title: `Major quake M${mag.toFixed(1)}`, detail: q.label, lat: q.lat, lon: q.lon, ts: q.ts });
    } else if (mag >= 5) {
      alerts.push({ id: `quake-${q.id}`, severity: "warn", title: `Strong quake M${mag.toFixed(1)}`, detail: q.label, lat: q.lat, lon: q.lon, ts: q.ts });
    }
  }

  // 2. Cyber concentration by country.
  const cyberByCountry = new Map<string, number>();
  for (const c of input.cyber) {
    const cc = String(c.props.country ?? "");
    if (cc) cyberByCountry.set(cc, (cyberByCountry.get(cc) ?? 0) + 1);
  }
  for (const [cc, count] of cyberByCountry) {
    if (count >= 8) {
      alerts.push({
        id: `cyber-${cc}`,
        severity: count >= 15 ? "warn" : "info",
        title: `Elevated cyber activity (${cc})`,
        detail: `${count} recent malicious indicators geolocated to ${cc}`,
        lat: null,
        lon: null,
        ts: now,
      });
    }
  }

  // 3. Disaster clusters by category.
  const disByCat = new Map<string, number>();
  for (const d of input.disasters) {
    const cat = String(d.props.category ?? "event");
    disByCat.set(cat, (disByCat.get(cat) ?? 0) + 1);
  }
  for (const [cat, count] of disByCat) {
    if (count >= 5) {
      alerts.push({ id: `disaster-${cat}`, severity: "info", title: `Multiple ${cat} active`, detail: `${count} concurrent ${cat} events tracked`, lat: null, lon: null, ts: now });
    }
  }

  // 4. Convergence: a top news country that also has a major quake nearby.
  const topEvent = [...input.events].sort((a, b) => num(b.props.count) - num(a.props.count))[0];
  if (topEvent && topEvent.lat !== null) {
    const nearBigQuake = input.earthquakes.find(
      (q) => num(q.props.mag) >= 5 && q.lat !== null && Math.abs(q.lat - topEvent.lat!) < 8 && Math.abs((q.lon ?? 0) - (topEvent.lon ?? 0)) < 8,
    );
    if (nearBigQuake) {
      alerts.push({
        id: `converge-${topEvent.id}`,
        severity: "warn",
        title: `Convergence near ${topEvent.label}`,
        detail: `High news volume and a strong earthquake in the same region`,
        lat: topEvent.lat,
        lon: topEvent.lon,
        ts: now,
      });
    }
  }

  return alerts
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.ts - a.ts)
    .slice(0, 40);
}
