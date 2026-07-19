/**
 * OPTIONAL — high-resolution wildfire hotspots from NASA FIRMS (free MAP_KEY).
 * Off unless FIRMS_MAP_KEY is set (route guards on `features.fires`).
 */

import Papa from "papaparse";
import { env } from "@/lib/env";
import { fetchText } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const FIRES_TTL_MS = 10 * 60 * 1000; // 10m
export const FIRES_SOURCE = "NASA FIRMS";
export const FIRES_ATTRIBUTION = "Active fire data: NASA FIRMS (VIIRS)";

interface FirmsRow {
  latitude: string;
  longitude: string;
  bright_ti4: string;
  acq_date: string;
  acq_time: string;
  confidence: string;
  frp: string;
  daynight: string;
}

export async function fetchFires(area = "world", days = 1): Promise<Entity[]> {
  const key = env.firmsMapKey;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${area}/${days}`;
  const csv = await fetchText(url, { timeoutMs: 15_000 });
  const parsed = Papa.parse<FirmsRow>(csv, { header: true, skipEmptyLines: true });
  const out: Entity[] = [];
  let idx = 0;
  for (const r of parsed.data) {
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      id: `fire-${idx++}`,
      type: "fire",
      lat,
      lon,
      label: "Fire hotspot",
      ts: Date.parse(`${r.acq_date}T${(r.acq_time ?? "0000").padStart(4, "0").replace(/(\d{2})(\d{2})/, "$1:$2")}:00Z`) || Date.now(),
      props: {
        brightness: Number(r.bright_ti4) || null,
        frp: Number(r.frp) || null,
        confidence: r.confidence,
        daynight: r.daynight,
      },
    });
  }
  return out.slice(0, 5000);
}
