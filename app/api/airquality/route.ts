import { disabledResponse } from "@/lib/entities";
import { features } from "@/lib/env";
import { serveLayer } from "@/lib/serve";
import { AQ_ATTRIBUTION, AQ_SOURCE, AQ_TTL_MS, fetchAirQuality } from "@/lib/sources/airquality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!features.airquality) {
    return disabledResponse("airquality", AQ_SOURCE, "Set OPENAQ_API_KEY to enable air quality.");
  }
  return serveLayer({
    layer: "airquality",
    cacheKey: "airquality",
    ttlMs: AQ_TTL_MS,
    source: AQ_SOURCE,
    attribution: AQ_ATTRIBUTION,
    fetcher: fetchAirQuality,
  });
}
