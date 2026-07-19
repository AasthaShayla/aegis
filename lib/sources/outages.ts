/**
 * OPTIONAL — internet outages from Cloudflare Radar (free API token required).
 * Off unless CLOUDFLARE_API_TOKEN is set.
 */

import { env } from "@/lib/env";
import { fetchJson } from "@/lib/http";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import type { Entity } from "@/lib/entities";

export const OUTAGES_TTL_MS = 10 * 60 * 1000;
export const OUTAGES_SOURCE = "Cloudflare Radar";
export const OUTAGES_ATTRIBUTION = "Internet outages: Cloudflare Radar";

interface RadarOutage {
  asnName?: string;
  locationName?: string;
  locationCode?: string;
  outageCause?: string;
  startDate?: string;
  eventType?: string;
}
interface RadarResponse {
  result?: { annotations?: RadarOutage[] };
}

// Rough centroid by ISO-2 code via country name lookup fallback.
function locate(name?: string): [number, number] | null {
  if (!name) return null;
  return COUNTRY_CENTROIDS[name.toLowerCase()] ?? null;
}

export async function fetchOutages(): Promise<Entity[]> {
  const data = await fetchJson<RadarResponse>(
    "https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=50&dateRange=7d",
    {
      headers: { authorization: `Bearer ${env.cloudflareToken}` },
      timeoutMs: 12_000,
      breakerKey: "cloudflare-radar",
    },
  );
  const now = Date.now();
  const out: Entity[] = [];
  let i = 0;
  for (const a of data.result?.annotations ?? []) {
    const c = locate(a.locationName);
    if (!c) continue;
    out.push({
      id: `outage-${i++}`,
      type: "outage",
      lat: c[1],
      lon: c[0],
      label: a.locationName ?? "Outage",
      ts: a.startDate ? Date.parse(a.startDate) : now,
      props: { cause: a.outageCause ?? "unknown", asn: a.asnName ?? null, eventType: a.eventType ?? null },
    });
  }
  return out;
}
