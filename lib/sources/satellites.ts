/**
 * Satellite TLEs from CelesTrak. We return the raw two-line elements; the
 * browser propagates positions with satellite.js (thousands of moving objects
 * can't be recomputed server-side per tick).
 *
 * CelesTrak is aggressively throttled (1 download / group / 2h / IP; 50 errors
 * in 2h => firewall ban). So: long TTL, NO retry loop (the cache serves stale
 * TLE on error — orbital elements stay usable for hours), descriptive UA.
 */

import { fetchText } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const SAT_TTL_MS = 2 * 60 * 60 * 1000; // 2h — do not lower.
export const SAT_SOURCE = "CelesTrak";
export const SAT_ATTRIBUTION = "Orbital data: CelesTrak / 18th Space Defense Squadron";

/** Groups we allow (kept small to stay well under bandwidth/throttle limits). */
export const SAT_GROUPS = [
  "visual",
  "stations",
  "starlink",
  "gps-ops",
  "galileo",
  "geo",
  "science",
  "weather",
] as const;
export type SatGroup = (typeof SAT_GROUPS)[number];

export function normalizeGroup(group: string | null): SatGroup {
  return (SAT_GROUPS as readonly string[]).includes(group ?? "") ? (group as SatGroup) : "visual";
}

export async function fetchSatellites(group: SatGroup): Promise<Entity[]> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
  const text = await fetchText(url, { timeoutMs: 12_000 });
  return parseTle(text, group);
}

/** Parse a CelesTrak 3-line TLE listing into satellite entities. */
function parseTle(text: string, group: string): Entity[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.length > 0);

  const out: Entity[] = [];
  const now = Date.now();
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1 || !l2 || !l1.startsWith("1 ") || !l2.startsWith("2 ")) continue;
    const noradId = l1.slice(2, 7).trim();
    out.push({
      id: noradId || name,
      type: "satellite",
      lat: null, // propagated client-side
      lon: null,
      label: name.trim(),
      ts: now,
      props: {
        name: name.trim(),
        noradId,
        group,
        tle: [l1, l2],
      },
    });
  }
  return out;
}
