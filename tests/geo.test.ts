import { describe, it, expect } from "vitest";
import { clampRadiusNm, roundCoord, haversineKm, centroid } from "@/lib/geo";

describe("geo", () => {
  it("clamps flight radius to 250 NM", () => {
    expect(clampRadiusNm(1000)).toBe(250);
    expect(clampRadiusNm(50)).toBe(50);
    expect(clampRadiusNm(-5)).toBe(100); // invalid -> default
  });

  it("rounds coordinates to a grid", () => {
    expect(roundCoord(51.5074, 1)).toBe(51.5);
    expect(roundCoord(-0.1278, 2)).toBe(-0.13);
  });

  it("computes great-circle distance (NYC -> London ~5570 km)", () => {
    const d = haversineKm(40.71, -74.01, 51.5, -0.13);
    expect(d).toBeGreaterThan(5400);
    expect(d).toBeLessThan(5700);
  });

  it("finds a polygon centroid", () => {
    const c = centroid({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    });
    expect(c).not.toBeNull();
    expect(c![0]).toBeCloseTo(4, 0);
    expect(c![1]).toBeCloseTo(4, 0);
  });
});
