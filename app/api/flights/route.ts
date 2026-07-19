import { serveLayer } from "@/lib/serve";
import { clampRadiusNm, roundCoord } from "@/lib/geo";
import {
  fetchFlightsBbox,
  fetchFlightsPoint,
  fetchMilitary,
  FLIGHTS_ATTRIBUTION,
  FLIGHTS_SOURCE,
  FLIGHTS_TTL_MS,
} from "@/lib/sources/flights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const base = {
    layer: "flight" as const,
    ttlMs: FLIGHTS_TTL_MS,
    source: FLIGHTS_SOURCE,
    attribution: FLIGHTS_ATTRIBUTION,
  };

  // Global military mode.
  if (searchParams.get("mil") === "1") {
    return serveLayer({ ...base, cacheKey: "flights:mil", fetcher: fetchMilitary });
  }

  // Viewport bbox mode (tiled).
  const bboxParam = searchParams.get("bbox");
  if (bboxParam) {
    const parts = bboxParam.split(",").map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      const [w, s, e, n] = parts.map((v) => roundCoord(v, 0));
      return serveLayer({
        ...base,
        cacheKey: `flights:bbox:${w}:${s}:${e}:${n}`,
        fetcher: () => fetchFlightsBbox({ w, s, e, n }),
      });
    }
  }

  // Legacy point mode.
  const lat = roundCoord(Number(searchParams.get("lat") ?? "0"), 1);
  const lon = roundCoord(Number(searchParams.get("lon") ?? "0"), 1);
  const radiusNm = clampRadiusNm(Number(searchParams.get("radius") ?? "150"));
  return serveLayer({
    ...base,
    cacheKey: `flights:${lat}:${lon}:${radiusNm}`,
    fetcher: () => fetchFlightsPoint(lat, lon, radiusNm),
  });
}
