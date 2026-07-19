/**
 * Global news/events. Primary: GDELT 2.0 DOC API (geolocated by source country).
 * Fallback: a set of world-news RSS feeds, geolocated best-effort by matching a
 * country name in the headline. The circuit breaker (breakerKey "gdelt") means
 * when GDELT rate-limits, we stop hammering it and use RSS until it recovers.
 */

import { CircuitOpenError, fetchJson, fetchText, HttpError } from "@/lib/http";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import type { Entity } from "@/lib/entities";

export const EVENTS_TTL_MS = 15 * 60 * 1000; // 15m
export const EVENTS_SOURCE = "GDELT + news RSS";
export const EVENTS_ATTRIBUTION = "Global events: The GDELT Project & public news RSS";

export const DEFAULT_QUERY = "conflict OR protest OR attack OR sanctions OR election OR ceasefire OR strike";

interface CountryBucket {
  lon: number;
  lat: number;
  count: number;
  articles: Array<{ title: string; url: string }>;
}

// Country names longest-first so "united states" matches before "united".
const COUNTRY_NAMES = Object.keys(COUNTRY_CENTROIDS).sort((a, b) => b.length - a.length);

export async function fetchEvents(query: string): Promise<Entity[]> {
  try {
    const gdelt = await fetchGdelt(query);
    if (gdelt.length > 0) return gdelt;
    // GDELT returned empty (rare) - supplement with RSS.
    return await fetchRss();
  } catch (err) {
    if (err instanceof HttpError || err instanceof CircuitOpenError) {
      return await fetchRss();
    }
    throw err;
  }
}

// ---- Primary: GDELT --------------------------------------------------------

interface DocArticle {
  url?: string;
  title?: string;
  sourcecountry?: string;
}
interface DocResponse {
  articles?: DocArticle[];
}

async function fetchGdelt(query: string): Promise<Entity[]> {
  const params = new URLSearchParams({
    query: query || DEFAULT_QUERY,
    mode: "artlist",
    format: "json",
    maxrecords: "100",
    timespan: "1d",
    sort: "datedesc",
  });
  const data = await fetchJson<DocResponse>(
    `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`,
    { timeoutMs: 20_000, breakerKey: "gdelt" },
  );
  const byCountry = new Map<string, CountryBucket>();
  for (const art of data.articles ?? []) {
    const country = art.sourcecountry?.trim();
    if (!country) continue;
    addArticle(byCountry, country, art.title, art.url);
  }
  return bucketsToEntities(byCountry);
}

// ---- Fallback: news RSS ----------------------------------------------------

const RSS_FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://feeds.npr.org/1004/rss.xml",
];

async function fetchRss(): Promise<Entity[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((url) => fetchText(url, { timeoutMs: 10_000, breakerKey: `rss:${url}` })),
  );
  const byCountry = new Map<string, CountryBucket>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of parseRssItems(r.value)) {
      const country = matchCountry(item.title);
      if (country) addArticle(byCountry, country, item.title, item.link);
    }
  }
  return bucketsToEntities(byCountry);
}

function parseRssItems(xml: string): Array<{ title: string; link: string }> {
  const items: Array<{ title: string; link: string }> = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  const blocks = xml.match(re) ?? [];
  for (const b of blocks.slice(0, 40)) {
    const title = unescapeXml(pick(b, "title"));
    const link = unescapeXml(pick(b, "link"));
    if (title) items.push({ title, link });
  }
  return items;
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function matchCountry(title: string): string | null {
  const t = title.toLowerCase();
  for (const name of COUNTRY_NAMES) {
    if (name.length < 4) continue; // skip short aliases like "uk"/"uae" to avoid false hits
    if (t.includes(name)) return name;
  }
  return null;
}

// ---- Shared ----------------------------------------------------------------

function addArticle(map: Map<string, CountryBucket>, country: string, title?: string, url?: string): void {
  const c = COUNTRY_CENTROIDS[country.toLowerCase()];
  if (!c) return;
  let bucket = map.get(country);
  if (!bucket) {
    bucket = { lon: c[0], lat: c[1], count: 0, articles: [] };
    map.set(country, bucket);
  }
  bucket.count += 1;
  if (bucket.articles.length < 6 && title && url) bucket.articles.push({ title, url });
}

function bucketsToEntities(map: Map<string, CountryBucket>): Entity[] {
  const out: Entity[] = [];
  const now = Date.now();
  for (const [country, b] of map) {
    out.push({
      id: country,
      type: "event",
      lat: b.lat,
      lon: b.lon,
      label: country.replace(/\b\w/g, (m) => m.toUpperCase()),
      ts: now,
      props: { count: b.count, articles: b.articles },
    });
  }
  out.sort((a, b) => (b.props.count as number) - (a.props.count as number));
  return out;
}
