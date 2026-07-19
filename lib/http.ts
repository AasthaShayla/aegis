/**
 * HTTP helpers shared by every upstream fetcher.
 *
 *  - `fetchJson` / `fetchText`: timeout + descriptive User-Agent, with an
 *    optional per-source circuit breaker that respects Retry-After. When an
 *    upstream is failing (e.g. GDELT 429s), the breaker opens and we fail fast
 *    so the cache serves stale data instead of hammering a hostile upstream.
 *  - `TokenBucket`: outbound rate limiter (flights cap at ~1 req/s).
 */

import { env } from "@/lib/env";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class CircuitOpenError extends Error {
  constructor(readonly key: string) {
    super(`circuit open for ${key}`);
    this.name = "CircuitOpenError";
  }
}

interface FetchOpts {
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** If set, failures/successes feed a per-source circuit breaker. */
  breakerKey?: string;
  method?: string;
  body?: string;
}

// ---- Circuit breaker -------------------------------------------------------

interface Breaker {
  failures: number;
  openUntil: number;
}
const breakers = new Map<string, Breaker>();
const FAILURE_THRESHOLD = 3;
const OPEN_MS = 60_000; // stay open at least a minute after tripping

function breakerFor(key: string): Breaker {
  let b = breakers.get(key);
  if (!b) {
    b = { failures: 0, openUntil: 0 };
    breakers.set(key, b);
  }
  return b;
}

function canRequest(key: string): boolean {
  return breakerFor(key).openUntil <= Date.now();
}

function recordSuccess(key: string): void {
  const b = breakerFor(key);
  b.failures = 0;
  b.openUntil = 0;
}

function recordFailure(key: string, retryAfterMs?: number): void {
  const b = breakerFor(key);
  b.failures += 1;
  if (retryAfterMs && retryAfterMs > 0) {
    b.openUntil = Date.now() + Math.min(retryAfterMs, 10 * 60_000);
  } else if (b.failures >= FAILURE_THRESHOLD) {
    b.openUntil = Date.now() + OPEN_MS;
  }
}

/** Introspection for /api/health. */
export function breakerStatus(key: string): { open: boolean; failures: number; openForMs: number } {
  const b = breakers.get(key);
  if (!b) return { open: false, failures: 0, openForMs: 0 };
  return { open: b.openUntil > Date.now(), failures: b.failures, openForMs: Math.max(0, b.openUntil - Date.now()) };
}

function parseRetryAfter(res: Response): number | undefined {
  const h = res.headers.get("retry-after");
  if (!h) return undefined;
  const secs = Number(h);
  if (Number.isFinite(secs)) return secs * 1000;
  const date = Date.parse(h);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

// ---- Fetch -----------------------------------------------------------------

async function rawFetch(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { timeoutMs = 8000, headers = {}, breakerKey, method = "GET", body } = opts;

  if (breakerKey && !canRequest(breakerKey)) {
    throw new CircuitOpenError(breakerKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      body,
      signal: controller.signal,
      headers: { "user-agent": env.userAgent, accept: "*/*", ...headers },
      cache: "no-store",
    });
    if (!res.ok) {
      const retryAfterMs = parseRetryAfter(res);
      if (breakerKey) recordFailure(breakerKey, retryAfterMs);
      throw new HttpError(`Upstream ${res.status} for ${url}`, res.status, url, retryAfterMs);
    }
    if (breakerKey) recordSuccess(breakerKey);
    return res;
  } catch (err) {
    if (breakerKey && !(err instanceof HttpError) && !(err instanceof CircuitOpenError)) {
      recordFailure(breakerKey);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T = unknown>(url: string, opts?: FetchOpts): Promise<T> {
  const res = await rawFetch(url, opts);
  return (await res.json()) as T;
}

export async function fetchText(url: string, opts?: FetchOpts): Promise<string> {
  const res = await rawFetch(url, opts);
  return await res.text();
}

// ---- Token bucket ----------------------------------------------------------

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
      this.lastRefill = now;
    }
  }

  async take(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = ((1 - this.tokens) / this.refillPerSec) * 1000;
    await new Promise((r) => setTimeout(r, Math.ceil(waitMs)));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }
}

/** Global limiter for community ADS-B feeds. adsb.lol (primary) tolerates a few
 *  req/s; we keep a modest ceiling and rely on caching to stay friendly. */
export const flightsBucket = new TokenBucket(6, 3);
