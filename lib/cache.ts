/**
 * In-memory TTL cache with single-flight, stale-on-error, disk persistence,
 * and per-key status tracking.
 *
 *   1. TTL             - serve fresh within TTL (protects upstreams).
 *   2. Single-flight   - coalesce concurrent misses into one upstream call.
 *   3. Stale-on-error  - on failure, keep serving the last good value.
 *   4. Persistence     - snapshot to disk so a restart/cold-start has data.
 *   5. Status          - record last fetch/error per key for /api/health.
 *
 * Interface is Redis-swappable for multi-instance production.
 */

import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

interface Entry<T> {
  value: T;
  fetchedAt: number;
  ttlMs: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export interface KeyStatus {
  key: string;
  lastFetchedAt: number;
  lastError: string | null;
  stale: boolean;
  ageMs: number;
}
const status = new Map<string, { lastFetchedAt: number; lastError: string | null; stale: boolean }>();

export interface CacheResult<T> {
  value: T;
  fetchedAt: number;
  stale: boolean;
}

// ---- Disk persistence ------------------------------------------------------

const SNAPSHOT_PATH = join(tmpdir(), "aegis-cache.json");
let loaded = false;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, Entry<unknown>>;
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.fetchedAt === "number") store.set(k, v);
    }
  } catch {
    /* no snapshot yet - fine */
  }
}

function scheduleSnapshot(): void {
  if (writeTimer) return;
  writeTimer = setTimeout(async () => {
    writeTimer = null;
    try {
      const obj: Record<string, Entry<unknown>> = {};
      for (const [k, v] of store) obj[k] = v;
      await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(obj), "utf8");
    } catch {
      /* best-effort */
    }
  }, 2000);
}

// ---- Core ------------------------------------------------------------------

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<CacheResult<T>> {
  await ensureLoaded();
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();

  if (hit && now - hit.fetchedAt < ttlMs) {
    return { value: hit.value, fetchedAt: hit.fetchedAt, stale: false };
  }

  if (!inflight.has(key)) {
    const p = (async () => {
      try {
        const value = await fetcher();
        store.set(key, { value, fetchedAt: Date.now(), ttlMs });
        status.set(key, { lastFetchedAt: Date.now(), lastError: null, stale: false });
        scheduleSnapshot();
        return value;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
  }

  try {
    const value = (await inflight.get(key)) as T;
    const entry = store.get(key) as Entry<T>;
    return { value, fetchedAt: entry.fetchedAt, stale: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    if (hit) {
      status.set(key, { lastFetchedAt: hit.fetchedAt, lastError: msg, stale: true });
      return { value: hit.value, fetchedAt: hit.fetchedAt, stale: true };
    }
    status.set(key, { lastFetchedAt: 0, lastError: msg, stale: true });
    throw err;
  }
}

export function invalidate(key: string): void {
  store.delete(key);
}

/** Per-key status snapshot for observability. */
export function allStatus(): KeyStatus[] {
  const now = Date.now();
  return [...status.entries()].map(([key, s]) => ({
    key,
    lastFetchedAt: s.lastFetchedAt,
    lastError: s.lastError,
    stale: s.stale,
    ageMs: s.lastFetchedAt ? now - s.lastFetchedAt : -1,
  }));
}
