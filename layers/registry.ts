/**
 * Static layer metadata - single source of truth for the toggle panel, legend,
 * and counts. Adding a layer = one entry here + a source + a route + a builder.
 */

import type { LayerId } from "@/store/useUiStore";

export type LayerGroup = "air" | "space" | "earth" | "info" | "cyber";

export interface LayerMeta {
  id: LayerId;
  label: string;
  group: LayerGroup;
  cssVar: string;
  onMap: boolean;
  optional?: boolean;
  hint: string;
}

export const GROUP_LABELS: Record<LayerGroup, string> = {
  air: "Air & Sea",
  space: "Space",
  earth: "Earth",
  info: "Information",
  cyber: "Cyber",
};

export const LAYERS: LayerMeta[] = [
  { id: "flights", label: "Flights", group: "air", cssVar: "--c-flights", onMap: true, hint: "Live ADS-B aircraft in view" },
  { id: "ships", label: "Ships (AIS)", group: "air", cssVar: "--c-ships", onMap: true, optional: true, hint: "Vessels - needs aisstream key" },
  { id: "satellites", label: "Satellites", group: "space", cssVar: "--c-satellites", onMap: true, hint: "Orbits propagated live from TLE" },
  { id: "earthquakes", label: "Earthquakes", group: "earth", cssVar: "--c-earthquakes", onMap: true, hint: "USGS, sized by magnitude" },
  { id: "disasters", label: "Natural events", group: "earth", cssVar: "--c-disasters", onMap: true, hint: "NASA EONET open events" },
  { id: "fires", label: "Wildfires", group: "earth", cssVar: "--c-fires", onMap: true, optional: true, hint: "NASA FIRMS - needs map key" },
  { id: "weatherRadar", label: "Weather radar", group: "earth", cssVar: "--c-weatherRadar", onMap: true, hint: "RainViewer precipitation overlay" },
  { id: "weather", label: "Weather probe", group: "earth", cssVar: "--c-weather", onMap: false, hint: "Click the map for a point forecast" },
  { id: "airquality", label: "Air quality", group: "earth", cssVar: "--c-airquality", onMap: true, optional: true, hint: "OpenAQ - needs key" },
  { id: "events", label: "Global events", group: "info", cssVar: "--c-events", onMap: true, hint: "GDELT / news, geolocated" },
  { id: "cameras", label: "Public cameras", group: "info", cssVar: "--c-cameras", onMap: true, hint: "Public traffic/webcams (TfL; Windy w/ key)" },
  { id: "cyber", label: "Cyber threats", group: "cyber", cssVar: "--c-cyber", onMap: true, hint: "ThreatFox IOCs (IPs geolocated)" },
  { id: "outages", label: "Internet outages", group: "cyber", cssVar: "--c-outages", onMap: true, optional: true, hint: "Cloudflare Radar - needs token" },
];

export const LAYERS_BY_ID: Record<LayerId, LayerMeta> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l]),
) as Record<LayerId, LayerMeta>;
