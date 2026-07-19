import { serveLayer } from "@/lib/serve";
import {
  fetchMarkets,
  MARKETS_ATTRIBUTION,
  MARKETS_SOURCE,
  MARKETS_TTL_MS,
} from "@/lib/sources/markets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return serveLayer({
    layer: "market",
    cacheKey: "markets",
    ttlMs: MARKETS_TTL_MS,
    source: MARKETS_SOURCE,
    attribution: MARKETS_ATTRIBUTION,
    fetcher: fetchMarkets,
  });
}
