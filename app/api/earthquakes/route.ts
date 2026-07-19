import { serveLayer } from "@/lib/serve";
import {
  fetchEarthquakes,
  normalizeFeed,
  QUAKE_ATTRIBUTION,
  QUAKE_SOURCE,
  QUAKE_TTL_MS,
} from "@/lib/sources/earthquakes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const feed = normalizeFeed(searchParams.get("feed"));
  return serveLayer({
    layer: "earthquake",
    cacheKey: `quake:${feed}`,
    ttlMs: QUAKE_TTL_MS,
    source: QUAKE_SOURCE,
    attribution: QUAKE_ATTRIBUTION,
    fetcher: () => fetchEarthquakes(feed),
  });
}
