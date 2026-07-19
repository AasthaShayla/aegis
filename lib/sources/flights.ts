/**
 * Live aircraft via community ADS-B feeds (adsb.lol primary, airplanes.live
 * fallback). No free "whole planet" endpoint exists, so:
 *   - viewport mode tiles the visible bbox into several point queries (each
 *     capped at 250 NM), merged and de-duped, throttled by a shared token bucket;
 *   - military mode uses the global /v2/mil endpoint (no viewport limit).
 */

import { clampRadiusNm } from "@/lib/geo";
import { fetchJson, flightsBucket, HttpError } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const FLIGHTS_TTL_MS = 8_000;
export const FLIGHTS_SOURCE = "adsb.lol";
export const FLIGHTS_ATTRIBUTION = "Flight data © adsb.lol contributors (ODbL) / airplanes.live";

const PRIMARY = "https://api.adsb.lol/v2";
const FALLBACK = "https://api.airplanes.live/v2";
const MAX_TILES = 4;

interface AdsbAircraft {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  squawk?: string;
  category?: string;
  seen?: number;
  seen_pos?: number;
}
interface AdsbResponse {
  ac?: AdsbAircraft[];
  aircraft?: AdsbAircraft[];
}

export interface Bbox {
  w: number;
  s: number;
  e: number;
  n: number;
}

async function fetchPath(path: string): Promise<AdsbAircraft[]> {
  await flightsBucket.take();
  // Race both community feeds; whichever responds first wins. This is robust to
  // either provider being slow/unreachable (common), keeping latency ~1 RTT.
  const attempt = (base: string) =>
    fetchJson<AdsbResponse>(`${base}${path}`, { timeoutMs: 6000 }).then((d) => d.ac ?? d.aircraft ?? []);
  try {
    return await Promise.any([attempt(PRIMARY), attempt(FALLBACK)]);
  } catch (err) {
    // Promise.any throws AggregateError only if BOTH failed.
    if (err instanceof AggregateError) throw err.errors[0] ?? new HttpError("all flight feeds failed", 502, path);
    throw err;
  }
}

/** Global military aircraft (broadcasting ADS-B with a military flag). */
export async function fetchMilitary(): Promise<Entity[]> {
  const list = await fetchPath("/mil");
  return normalize(list, true);
}

/** All aircraft within a point+radius. */
export async function fetchFlightsPoint(lat: number, lon: number, radiusNm: number): Promise<Entity[]> {
  const r = clampRadiusNm(radiusNm);
  const list = await fetchPath(`/point/${lat}/${lon}/${r}`);
  return normalize(list, false);
}

/** Cover a viewport bbox with a grid of point queries, merged + de-duped.
 *  Tiles run in parallel; the shared token bucket still paces outbound calls. */
export async function fetchFlightsBbox(bbox: Bbox): Promise<Entity[]> {
  const points = tilePoints(bbox);
  const results = await Promise.allSettled(points.map((p) => fetchFlightsPoint(p.lat, p.lon, 250)));
  const merged = new Map<string, Entity>();
  for (const r of results) {
    if (r.status === "fulfilled") for (const e of r.value) merged.set(e.id, e);
  }
  return [...merged.values()];
}

/** Up to 4 evenly-distributed query centers (quartile grid) covering the bbox.
 *  A small viewport collapses to a single center point. */
function tilePoints(bbox: Bbox): Array<{ lat: number; lon: number }> {
  const norm = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
  const s = Math.max(-85, Math.min(85, bbox.s));
  const n = Math.max(-85, Math.min(85, bbox.n));
  let w = bbox.w;
  let e = bbox.e < bbox.w ? bbox.e + 360 : bbox.e; // antimeridian
  const dLon = e - w;
  const dLat = n - s;

  if (dLon < 6 && dLat < 6) return [{ lat: (s + n) / 2, lon: norm((w + e) / 2) }];

  const fx = [0.28, 0.72];
  const fy = [0.28, 0.72];
  const pts: Array<{ lat: number; lon: number }> = [];
  for (const fyv of fy) for (const fxv of fx) pts.push({ lat: s + dLat * fyv, lon: norm(w + dLon * fxv) });
  return pts.slice(0, MAX_TILES);
}

function normalize(list: AdsbAircraft[], mil: boolean): Entity[] {
  const now = Date.now();
  const out: Entity[] = [];
  for (const ac of list) {
    if (typeof ac.lat !== "number" || typeof ac.lon !== "number") continue;
    const alt = ac.alt_baro === "ground" ? 0 : (ac.alt_baro ?? null);
    out.push({
      id: ac.hex ?? `${ac.lat},${ac.lon}`,
      type: "flight",
      lat: ac.lat,
      lon: ac.lon,
      label: (ac.flight ?? ac.r ?? ac.hex ?? "").trim() || "aircraft",
      ts: now - (ac.seen_pos ?? ac.seen ?? 0) * 1000,
      props: {
        heading: ac.track ?? 0,
        altitude: alt,
        onGround: ac.alt_baro === "ground",
        speed: ac.gs ?? null,
        squawk: ac.squawk ?? null,
        category: ac.category ?? null,
        aircraftType: ac.t ?? null,
        registration: ac.r ?? null,
        military: mil,
      },
    });
  }
  return out;
}
