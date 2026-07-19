/**
 * OPTIONAL — air quality from OpenAQ v3 (free API key required).
 * Off unless OPENAQ_API_KEY is set.
 */

import { env } from "@/lib/env";
import { fetchJson } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const AQ_TTL_MS = 15 * 60 * 1000;
export const AQ_SOURCE = "OpenAQ";
export const AQ_ATTRIBUTION = "Air quality: OpenAQ";

interface OpenAqLocation {
  id: number;
  name: string;
  coordinates?: { latitude: number; longitude: number };
  country?: { code: string };
}
interface OpenAqResponse {
  results?: OpenAqLocation[];
}

export async function fetchAirQuality(): Promise<Entity[]> {
  const data = await fetchJson<OpenAqResponse>("https://api.openaq.org/v3/locations?limit=200", {
    headers: { "x-api-key": env.openaqKey },
    timeoutMs: 12_000,
    breakerKey: "openaq",
  });
  const now = Date.now();
  const out: Entity[] = [];
  for (const loc of data.results ?? []) {
    if (!loc.coordinates) continue;
    out.push({
      id: `aq-${loc.id}`,
      type: "airquality",
      lat: loc.coordinates.latitude,
      lon: loc.coordinates.longitude,
      label: loc.name || "Air sensor",
      ts: now,
      props: { country: loc.country?.code ?? null },
    });
  }
  return out;
}
