import { disabledResponse } from "@/lib/entities";
import { features } from "@/lib/env";
import { serveLayer } from "@/lib/serve";
import { fetchOutages, OUTAGES_ATTRIBUTION, OUTAGES_SOURCE, OUTAGES_TTL_MS } from "@/lib/sources/outages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!features.outages) {
    return disabledResponse("outage", OUTAGES_SOURCE, "Set CLOUDFLARE_API_TOKEN to enable internet outages.");
  }
  return serveLayer({
    layer: "outage",
    cacheKey: "outages",
    ttlMs: OUTAGES_TTL_MS,
    source: OUTAGES_SOURCE,
    attribution: OUTAGES_ATTRIBUTION,
    fetcher: fetchOutages,
  });
}
