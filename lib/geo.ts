/**
 * Geospatial helpers shared by the server (normalizers) and, where noted,
 * mirrored on the client.
 */

/** Clamp a flight query radius to the adsb.lol maximum (250 nautical miles). */
export function clampRadiusNm(radius: number, max = 250): number {
  if (!Number.isFinite(radius) || radius <= 0) return 100;
  return Math.min(Math.round(radius), max);
}

/** Round a coordinate to a grid so nearby pans reuse the same cache key. */
export function roundCoord(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Great-circle distance in kilometers between two [lat, lon] points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

type Position = [number, number] | [number, number, number];
type GeoJsonGeometry =
  | { type: "Point"; coordinates: Position }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] }
  | { type: "LineString"; coordinates: Position[] }
  | { type: string; coordinates: unknown };

/**
 * Best-effort [lon, lat] centroid for an arbitrary GeoJSON geometry.
 * Used to give polygon-shaped events (EONET storms, GDELT regions) a point to
 * render at, while the full geometry is preserved in `props.geometry`.
 */
export function centroid(geometry: GeoJsonGeometry | null | undefined): [number, number] | null {
  if (!geometry) return null;
  const coords = collectPositions(geometry);
  if (coords.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const [lon, lat] of coords) {
    sx += lon;
    sy += lat;
  }
  return [sx / coords.length, sy / coords.length];
}

function collectPositions(geometry: GeoJsonGeometry): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      out.push([node[0] as number, node[1] as number]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk((geometry as { coordinates?: unknown }).coordinates);
  return out;
}
