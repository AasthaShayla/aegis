import { serveLayer } from "@/lib/serve";
import { roundCoord } from "@/lib/geo";
import {
  fetchWeather,
  WEATHER_ATTRIBUTION,
  WEATHER_SOURCE,
  WEATHER_TTL_MS,
} from "@/lib/sources/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return new Response(JSON.stringify({ error: "lat and lon query params are required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const rLat = roundCoord(lat, 2);
  const rLon = roundCoord(lon, 2);
  return serveLayer({
    layer: "weather",
    cacheKey: `weather:${rLat}:${rLon}`,
    ttlMs: WEATHER_TTL_MS,
    source: WEATHER_SOURCE,
    attribution: WEATHER_ATTRIBUTION,
    fetcher: () => fetchWeather(rLat, rLon),
  });
}
