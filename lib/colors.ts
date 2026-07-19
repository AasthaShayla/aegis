/**
 * RGB colors for deck.gl (which wants [r,g,b] / [r,g,b,a] arrays), mirroring
 * the CSS custom properties in styles/tokens.css, plus small scale helpers.
 */

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export const COLORS = {
  flights: [255, 176, 32] as RGB,
  satellites: [40, 224, 240] as RGB,
  earthquakes: [255, 107, 61] as RGB,
  disasters: [255, 143, 63] as RGB,
  events: [154, 140, 255] as RGB,
  cyber: [255, 59, 78] as RGB,
  weather: [74, 168, 255] as RGB,
  ships: [57, 255, 136] as RGB,
  fires: [255, 85, 34] as RGB,
  cameras: [120, 210, 255] as RGB,
  outages: [255, 90, 160] as RGB,
  airquality: [180, 220, 90] as RGB,
  alert: [255, 59, 78] as RGB,
  ok: [57, 255, 136] as RGB,
  amber: [255, 176, 32] as RGB,
  red: [255, 59, 78] as RGB,
  white: [232, 237, 242] as RGB,
};

/** Earthquake circle radius (pixels) - exponential so big quakes stand out. */
export function magToRadius(mag: number | null): number {
  const m = mag ?? 0;
  return Math.max(3, Math.pow(1.7, Math.max(0, m)));
}

/** Earthquake fill by depth (km): shallow = hot amber, deep = cool cyan. */
export function depthColor(depthKm: number): RGBA {
  const t = Math.min(1, Math.max(0, depthKm / 300));
  const r = Math.round(255 * (1 - t) + 40 * t);
  const g = Math.round(120 * (1 - t) + 200 * t);
  const b = Math.round(40 * (1 - t) + 235 * t);
  return [r, g, b, 200];
}

/** Cyber IOC color by confidence (0-100): low = dim, high = hot red. */
export function confidenceColor(conf: number): RGBA {
  const t = Math.min(1, Math.max(0, conf / 100));
  return [255, Math.round(120 * (1 - t)), Math.round(90 * (1 - t)), 180];
}

export function withAlpha(rgb: RGB, alpha: number): RGBA {
  return [rgb[0], rgb[1], rgb[2], alpha];
}
