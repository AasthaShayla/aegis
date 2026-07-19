/**
 * Route helper: wrap a normalizer in the cache and emit an AegisResponse.
 * Keeps every `app/api/<layer>/route.ts` down to a few lines and guarantees
 * consistent caching, stale handling, and error shape across layers.
 */

import { cached } from "@/lib/cache";
import { buildResponse, errorResponse, jsonResponse, type Entity, type EntityType } from "@/lib/entities";

export interface ServeOpts {
  layer: EntityType;
  cacheKey: string;
  ttlMs: number;
  source: string;
  attribution: string;
  fetcher: () => Promise<Entity[]>;
  note?: string;
}

export async function serveLayer(opts: ServeOpts): Promise<Response> {
  const { layer, cacheKey, ttlMs, source, attribution, fetcher, note } = opts;
  try {
    const { value, fetchedAt, stale } = await cached(cacheKey, ttlMs, fetcher);
    return jsonResponse(
      buildResponse(layer, value, { source, fetchedAt, ttlMs, stale, attribution, note }),
    );
  } catch (err) {
    return errorResponse(layer, source, err instanceof Error ? err.message : "upstream fetch failed");
  }
}
