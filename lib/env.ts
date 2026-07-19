/**
 * Typed environment access + feature gating.
 *
 * AEGIS runs fully key-free. Optional layers are gated on the presence of their
 * key so the frontend can hide them cleanly rather than render a broken toggle.
 */

export const env = {
  aisstreamKey: process.env.AISSTREAM_API_KEY?.trim() || "",
  firmsMapKey: process.env.FIRMS_MAP_KEY?.trim() || "",
  windyWebcamsKey: process.env.WINDY_WEBCAMS_KEY?.trim() || "",
  cloudflareToken: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
  openaqKey: process.env.OPENAQ_API_KEY?.trim() || "",
  ollamaHost: process.env.OLLAMA_HOST?.trim() || "http://localhost:11434",
  userAgent:
    process.env.AEGIS_USER_AGENT?.trim() ||
    "AEGIS/1.0 (+https://github.com/aegis-osint/aegis) open-source intelligence dashboard",
} as const;

/** Which optional layers are enabled, derived from present keys. */
export const features = {
  ships: env.aisstreamKey.length > 0,
  fires: env.firmsMapKey.length > 0,
  outages: env.cloudflareToken.length > 0,
  airquality: env.openaqKey.length > 0,
  // Cameras work key-free via TfL; Windy adds global coverage when keyed.
  cameras: true,
} as const;

export type FeatureName = keyof typeof features;
