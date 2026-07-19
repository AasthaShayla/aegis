import { features } from "@/lib/env";
import { allStatus } from "@/lib/cache";
import { breakerStatus } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports which layers are available + per-source health for observability. */
export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    layers: {
      flights: true,
      satellites: true,
      earthquakes: true,
      disasters: true,
      weather: true,
      events: true,
      markets: true,
      cyber: true,
      cameras: features.cameras,
      ships: features.ships,
      fires: features.fires,
      outages: features.outages,
      airquality: features.airquality,
    },
    sources: allStatus(),
    breakers: {
      gdelt: breakerStatus("gdelt"),
      threatfox: breakerStatus("threatfox"),
      "ip-api": breakerStatus("ip-api"),
      "tfl-cams": breakerStatus("tfl-cams"),
    },
  });
}
