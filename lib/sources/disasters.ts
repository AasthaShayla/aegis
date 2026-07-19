/**
 * Natural events from NASA EONET v3 (wildfires, storms, volcanoes, floods,
 * icebergs…). Each event carries a time-ordered geometry list; we render the
 * latest position and keep the full geometry in props for optional drawing.
 */

import { centroid } from "@/lib/geo";
import { fetchJson } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const EONET_TTL_MS = 60 * 60 * 1000; // 1h
export const EONET_SOURCE = "NASA EONET";
export const EONET_ATTRIBUTION = "Natural events: NASA EONET";

interface EonetGeometry {
  date: string;
  type: string;
  coordinates: unknown;
}
interface EonetEvent {
  id: string;
  title: string;
  link?: string;
  categories?: Array<{ id: string; title: string }>;
  geometry?: EonetGeometry[];
}
interface EonetResponse {
  events?: EonetEvent[];
}

export async function fetchDisasters(): Promise<Entity[]> {
  const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=250";
  const data = await fetchJson<EonetResponse>(url);
  const out: Entity[] = [];
  for (const ev of data.events ?? []) {
    const geoms = ev.geometry ?? [];
    if (geoms.length === 0) continue;
    const latest = geoms[geoms.length - 1];
    const point = centroid({ type: latest.type, coordinates: latest.coordinates });
    if (!point) continue;
    const category = ev.categories?.[0];
    out.push({
      id: ev.id,
      type: "disaster",
      lat: point[1],
      lon: point[0],
      label: ev.title,
      ts: Date.parse(latest.date) || Date.now(),
      props: {
        category: category?.title ?? "Event",
        categoryId: category?.id ?? "unknown",
        link: ev.link ?? null,
        geometryType: latest.type,
      },
    });
  }
  return out;
}
