import { serveLayer } from "@/lib/serve";
import {
  DEFAULT_QUERY,
  EVENTS_ATTRIBUTION,
  EVENTS_SOURCE,
  EVENTS_TTL_MS,
  fetchEvents,
} from "@/lib/sources/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || DEFAULT_QUERY).slice(0, 300);
  return serveLayer({
    layer: "event",
    cacheKey: `events:${q}`,
    ttlMs: EVENTS_TTL_MS,
    source: EVENTS_SOURCE,
    attribution: EVENTS_ATTRIBUTION,
    fetcher: () => fetchEvents(q),
  });
}
