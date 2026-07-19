import { serveLayer } from "@/lib/serve";
import { CYBER_ATTRIBUTION, CYBER_SOURCE, CYBER_TTL_MS, fetchCyber } from "@/lib/sources/cyber";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return serveLayer({
    layer: "cyber",
    cacheKey: "cyber",
    ttlMs: CYBER_TTL_MS,
    source: CYBER_SOURCE,
    attribution: CYBER_ATTRIBUTION,
    fetcher: fetchCyber,
  });
}
