/**
 * Public cameras - only cameras that operators publish for public viewing.
 *   - Key-free: Transport for London JamCams (London traffic cameras).
 *   - Optional (WINDY_WEBCAMS_KEY): Windy Webcams, a global database of public
 *     webcams, queried by viewport bbox.
 *
 * This deliberately does NOT touch private/unsecured cameras - only feeds that
 * are intentionally public.
 */

import { env } from "@/lib/env";
import { fetchJson } from "@/lib/http";
import type { Entity } from "@/lib/entities";
import type { Bbox } from "@/lib/sources/flights";

export const CAMERAS_TTL_MS = 5 * 60 * 1000;
export const CAMERAS_SOURCE = "TfL JamCams / Windy Webcams";
export const CAMERAS_ATTRIBUTION = "Public cameras: Transport for London; Windy.com Webcams";

// ---- TfL JamCams (key-free) ------------------------------------------------

interface TflProp {
  key: string;
  value: string;
}
interface TflPlace {
  id: string;
  commonName: string;
  lat: number;
  lon: number;
  additionalProperties?: TflProp[];
}

async function fetchTfl(): Promise<Entity[]> {
  const places = await fetchJson<TflPlace[]>("https://api.tfl.gov.uk/Place/Type/JamCam", {
    timeoutMs: 12_000,
    breakerKey: "tfl-cams",
  });
  const now = Date.now();
  return places
    .filter((p) => typeof p.lat === "number" && typeof p.lon === "number")
    .map((p) => {
      const prop = (k: string) => p.additionalProperties?.find((a) => a.key === k)?.value;
      return {
        id: `tfl-${p.id}`,
        type: "camera" as const,
        lat: p.lat,
        lon: p.lon,
        label: p.commonName,
        ts: now,
        props: {
          provider: "TfL",
          image: prop("imageUrl") ?? null,
          video: prop("videoUrl") ?? null,
          view: prop("view") ?? null,
        },
      };
    });
}

// ---- Windy Webcams (optional key) ------------------------------------------

interface WindyWebcam {
  webcamId: number;
  title: string;
  location?: { latitude: number; longitude: number; city?: string };
  images?: { current?: { preview?: string } };
  urls?: { detail?: string };
}
interface WindyResponse {
  webcams?: WindyWebcam[];
}

async function fetchWindy(bbox?: Bbox): Promise<Entity[]> {
  if (!env.windyWebcamsKey) return [];
  const params = new URLSearchParams({ limit: "50", include: "images,location,urls", lang: "en" });
  if (bbox) params.set("bbox", `${bbox.n},${bbox.e},${bbox.s},${bbox.w}`);
  const data = await fetchJson<WindyResponse>(
    `https://api.windy.com/webcams/api/v3/webcams?${params.toString()}`,
    { headers: { "x-windy-api-key": env.windyWebcamsKey }, timeoutMs: 12_000, breakerKey: "windy" },
  );
  const now = Date.now();
  return (data.webcams ?? [])
    .filter((w) => w.location)
    .map((w) => ({
      id: `windy-${w.webcamId}`,
      type: "camera" as const,
      lat: w.location!.latitude,
      lon: w.location!.longitude,
      label: w.title || w.location!.city || "Webcam",
      ts: now,
      props: {
        provider: "Windy",
        image: w.images?.current?.preview ?? null,
        video: null,
        detail: w.urls?.detail ?? null,
      },
    }));
}

export async function fetchCameras(bbox?: Bbox): Promise<Entity[]> {
  const [tfl, windy] = await Promise.allSettled([fetchTfl(), fetchWindy(bbox)]);
  const out: Entity[] = [];
  if (tfl.status === "fulfilled") out.push(...tfl.value);
  if (windy.status === "fulfilled") out.push(...windy.value);
  if (out.length === 0 && tfl.status === "rejected") throw tfl.reason;
  return out;
}
