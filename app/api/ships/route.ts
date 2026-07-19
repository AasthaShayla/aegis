import { disabledResponse } from "@/lib/entities";
import { features } from "@/lib/env";
import { serveLayer } from "@/lib/serve";
import { roundCoord } from "@/lib/geo";
import { fetchShips, SHIPS_ATTRIBUTION, SHIPS_SOURCE, SHIPS_TTL_MS } from "@/lib/sources/ships";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!features.ships) {
    return disabledResponse("ship", SHIPS_SOURCE, "Set AISSTREAM_API_KEY in .env.local to enable AIS ships.");
  }
  const { searchParams } = new URL(req.url);
  const s = roundCoord(Number(searchParams.get("s") ?? "-90"), 1);
  const w = roundCoord(Number(searchParams.get("w") ?? "-180"), 1);
  const n = roundCoord(Number(searchParams.get("n") ?? "90"), 1);
  const e = roundCoord(Number(searchParams.get("e") ?? "180"), 1);
  return serveLayer({
    layer: "ship",
    cacheKey: `ships:${s}:${w}:${n}:${e}`,
    ttlMs: SHIPS_TTL_MS,
    source: SHIPS_SOURCE,
    attribution: SHIPS_ATTRIBUTION,
    fetcher: () => fetchShips({ s, w, n, e }),
  });
}
