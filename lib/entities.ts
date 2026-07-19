/**
 * The shared contract between every API route and the frontend.
 *
 * Every `/api/<layer>` route returns an `AegisResponse`, a thin envelope around
 * a flat list of `Entity` objects. Keeping one normalized shape means the
 * frontend renders every layer through the same code paths, and a change to an
 * upstream source only touches that source's normalizer in `lib/sources/`.
 */

export type EntityType =
  | "flight"
  | "satellite"
  | "earthquake"
  | "disaster"
  | "weather"
  | "event"
  | "market"
  | "cyber"
  | "ship"
  | "fire"
  | "camera"
  | "outage"
  | "airquality"
  | "alert";

export interface Entity {
  /** Stable id from the upstream source (hex, catalog number, USGS id, ioc id…). */
  id: string;
  type: EntityType;
  /** WGS84. `null` for non-geographic entities (markets, un-geolocated cyber IOCs). */
  lat: number | null;
  lon: number | null;
  /** Short human label for popups / feeds. */
  label: string;
  /** Epoch ms of the observation (best available). */
  ts: number;
  /** Layer-specific extras (altitude, magnitude, TLE lines, price, …). */
  props: Record<string, unknown>;
}

export interface AegisMeta {
  /** Human name of the upstream, e.g. "adsb.lol", "USGS", "GDELT". */
  source: string;
  /** When the upstream was last successfully fetched (epoch ms). */
  fetchedAt: number;
  /** Cache TTL for this layer (ms). */
  ttlMs: number;
  /** True when served from stale cache after an upstream error. */
  stale: boolean;
  /** License / attribution string surfaced in the UI footer. */
  attribution: string;
  count: number;
  /** Optional free-form note (e.g. "layer disabled — set FIRMS_MAP_KEY"). */
  note?: string;
}

export interface AegisResponse<T = Entity> {
  layer: EntityType;
  entities: T[];
  meta: AegisMeta;
}

/** Build a normalized response object. */
export function buildResponse<T = Entity>(
  layer: EntityType,
  entities: T[],
  meta: Omit<AegisMeta, "count">,
): AegisResponse<T> {
  return { layer, entities, meta: { ...meta, count: entities.length } };
}

/** Serialize an AegisResponse to a JSON Response with sensible cache headers. */
export function jsonResponse<T>(body: AegisResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The server owns caching (lib/cache.ts); tell the browser not to.
      "cache-control": "no-store",
    },
  });
}

/** A 200 response for an optional layer that is switched off (no key present). */
export function disabledResponse(layer: EntityType, source: string, note: string): Response {
  const body: AegisResponse = {
    layer,
    entities: [],
    meta: { source, fetchedAt: 0, ttlMs: 0, stale: false, attribution: "", count: 0, note },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** A uniform error body when a layer has no data at all (not even stale). */
export function errorResponse(layer: EntityType, source: string, message: string): Response {
  const body: AegisResponse = {
    layer,
    entities: [],
    meta: {
      source,
      fetchedAt: 0,
      ttlMs: 0,
      stale: true,
      attribution: "",
      count: 0,
      note: message,
    },
  };
  return new Response(JSON.stringify(body), {
    status: 503,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
