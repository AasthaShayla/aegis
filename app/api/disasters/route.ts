import { serveLayer } from "@/lib/serve";
import {
  EONET_ATTRIBUTION,
  EONET_SOURCE,
  EONET_TTL_MS,
  fetchDisasters,
} from "@/lib/sources/disasters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return serveLayer({
    layer: "disaster",
    cacheKey: "disasters",
    ttlMs: EONET_TTL_MS,
    source: EONET_SOURCE,
    attribution: EONET_ATTRIBUTION,
    fetcher: fetchDisasters,
  });
}
