import { describe, it, expect } from "vitest";
import { computeAlerts } from "@/lib/alerts";
import type { Entity } from "@/lib/entities";

const quake = (mag: number, tsunami = false): Entity => ({
  id: `q${mag}${tsunami}`,
  type: "earthquake",
  lat: 35,
  lon: 139,
  label: "Test quake",
  ts: Date.now(),
  props: { mag, depth: 10, tsunami },
});

const cyber = (country: string, i: number): Entity => ({
  id: `c${country}${i}`,
  type: "cyber",
  lat: 0,
  lon: 0,
  label: "1.2.3.4",
  ts: Date.now(),
  props: { country, confidence: 80 },
});

describe("computeAlerts", () => {
  it("flags a major quake as critical", () => {
    const a = computeAlerts({ earthquakes: [quake(6.2)], cyber: [], events: [], disasters: [] });
    expect(a.some((x) => x.severity === "critical" && x.title.includes("Major"))).toBe(true);
  });

  it("flags tsunami as critical regardless of magnitude", () => {
    const a = computeAlerts({ earthquakes: [quake(5.1, true)], cyber: [], events: [], disasters: [] });
    expect(a.some((x) => x.title.includes("Tsunami"))).toBe(true);
  });

  it("ignores minor quakes", () => {
    const a = computeAlerts({ earthquakes: [quake(3.0)], cyber: [], events: [], disasters: [] });
    expect(a.length).toBe(0);
  });

  it("raises a cyber-concentration alert past threshold", () => {
    const many = Array.from({ length: 10 }, (_, i) => cyber("RU", i));
    const a = computeAlerts({ earthquakes: [], cyber: many, events: [], disasters: [] });
    expect(a.some((x) => x.title.includes("cyber"))).toBe(true);
  });

  it("sorts critical before info", () => {
    const many = Array.from({ length: 10 }, (_, i) => cyber("RU", i));
    const a = computeAlerts({ earthquakes: [quake(6.5)], cyber: many, events: [], disasters: [] });
    expect(a[0].severity).toBe("critical");
  });
});
