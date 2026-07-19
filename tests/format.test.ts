import { describe, it, expect } from "vitest";
import { fmtPct, fmtPrice, fmtCoord, weatherCodeText } from "@/lib/format";

describe("format", () => {
  it("formats percentages with sign", () => {
    expect(fmtPct(1.94)).toBe("+1.94%");
    expect(fmtPct(-2.07)).toBe("-2.07%");
  });

  it("formats prices by magnitude", () => {
    expect(fmtPrice(63808)).toBe("$63,808"); // >= 1000 -> whole dollars
    expect(fmtPrice(1798.5)).toBe("$1,799");
    expect(fmtPrice(12.34)).toBe("$12.34"); // < 1000 -> 2 decimals
  });

  it("formats coordinates with hemispheres", () => {
    expect(fmtCoord(51.5, -0.13)).toContain("N");
    expect(fmtCoord(51.5, -0.13)).toContain("W");
  });

  it("maps WMO weather codes", () => {
    expect(weatherCodeText(0)).toBe("Clear sky");
    expect(weatherCodeText(95)).toBe("Thunderstorm");
    expect(weatherCodeText(999)).toContain("Code");
  });
});
