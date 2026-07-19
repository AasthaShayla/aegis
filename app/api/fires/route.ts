import { disabledResponse } from "@/lib/entities";
import { features } from "@/lib/env";
import { serveLayer } from "@/lib/serve";
import { fetchFires, FIRES_ATTRIBUTION, FIRES_SOURCE, FIRES_TTL_MS } from "@/lib/sources/fires";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!features.fires) {
    return disabledResponse("fire", FIRES_SOURCE, "Set FIRMS_MAP_KEY in .env.local to enable hi-res fires.");
  }
  return serveLayer({
    layer: "fire",
    cacheKey: "fires:world",
    ttlMs: FIRES_TTL_MS,
    source: FIRES_SOURCE,
    attribution: FIRES_ATTRIBUTION,
    fetcher: () => fetchFires("world", 1),
  });
}
