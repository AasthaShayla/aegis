import { serveLayer } from "@/lib/serve";
import {
  fetchSatellites,
  normalizeGroup,
  SAT_ATTRIBUTION,
  SAT_SOURCE,
  SAT_TTL_MS,
} from "@/lib/sources/satellites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const group = normalizeGroup(searchParams.get("group"));
  return serveLayer({
    layer: "satellite",
    cacheKey: `sat:${group}`,
    ttlMs: SAT_TTL_MS,
    source: SAT_SOURCE,
    attribution: SAT_ATTRIBUTION,
    fetcher: () => fetchSatellites(group),
  });
}
