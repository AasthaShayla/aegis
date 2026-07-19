/**
 * Earthquakes from the USGS real-time GeoJSON feeds. Public domain, CORS-safe,
 * updated roughly every minute. We proxy it anyway for a uniform schema + cache.
 */

import { fetchJson } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const QUAKE_TTL_MS = 60_000;
export const QUAKE_SOURCE = "USGS";
export const QUAKE_ATTRIBUTION = "Earthquake data: U.S. Geological Survey (public domain)";

export const QUAKE_FEEDS = [
  "all_hour",
  "all_day",
  "2.5_day",
  "4.5_day",
  "significant_week",
  "all_week",
] as const;
export type QuakeFeed = (typeof QUAKE_FEEDS)[number];

export function normalizeFeed(feed: string | null): QuakeFeed {
  return (QUAKE_FEEDS as readonly string[]).includes(feed ?? "") ? (feed as QuakeFeed) : "all_day";
}

interface UsgsFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    url: string;
    tsunami: number;
    type: string;
  };
  geometry: { type: "Point"; coordinates: [number, number, number] };
}

interface UsgsResponse {
  features: UsgsFeature[];
}

export async function fetchEarthquakes(feed: QuakeFeed): Promise<Entity[]> {
  const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;
  const data = await fetchJson<UsgsResponse>(url);
  const out: Entity[] = [];
  for (const f of data.features ?? []) {
    const [lon, lat, depth] = f.geometry.coordinates;
    out.push({
      id: f.id,
      type: "earthquake",
      lat,
      lon,
      label: f.properties.place ?? "Earthquake",
      ts: f.properties.time,
      props: {
        mag: f.properties.mag,
        depth,
        tsunami: f.properties.tsunami === 1,
        url: f.properties.url,
        eventType: f.properties.type,
      },
    });
  }
  return out;
}
