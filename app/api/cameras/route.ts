import { serveLayer } from "@/lib/serve";
import {
  CAMERAS_ATTRIBUTION,
  CAMERAS_SOURCE,
  CAMERAS_TTL_MS,
  fetchCameras,
} from "@/lib/sources/cameras";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return serveLayer({
    layer: "camera",
    cacheKey: "cameras",
    ttlMs: CAMERAS_TTL_MS,
    source: CAMERAS_SOURCE,
    attribution: CAMERAS_ATTRIBUTION,
    fetcher: () => fetchCameras(),
  });
}
