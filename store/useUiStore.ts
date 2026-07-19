"use client";

import { create } from "zustand";
import type { Entity } from "@/lib/entities";

export type LayerId =
  | "flights"
  | "satellites"
  | "earthquakes"
  | "disasters"
  | "events"
  | "cyber"
  | "weather"
  | "weatherRadar"
  | "cameras"
  | "ships"
  | "fires"
  | "outages"
  | "airquality";

export type BasemapMode = "dark" | "darkNoLabels" | "light";

export interface Filters {
  militaryOnly: boolean;
  quakeMinMag: number;
}

interface UiState {
  layers: Record<LayerId, boolean>;
  satGroup: string;
  quakeFeed: string;
  filters: Filters;
  /** Time window in hours for timestamped layers; null = all. */
  timeWindowHours: number | null;
  basemap: BasemapMode;
  selected: Entity | null;
  follow: Entity | null;
  briefingOpen: boolean;
  flyTo: { lon: number; lat: number; zoom?: number; nonce: number } | null;

  toggleLayer: (id: LayerId) => void;
  setLayer: (id: LayerId, on: boolean) => void;
  setLayers: (l: Partial<Record<LayerId, boolean>>) => void;
  setSatGroup: (g: string) => void;
  setQuakeFeed: (f: string) => void;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  setTimeWindow: (h: number | null) => void;
  setBasemap: (b: BasemapMode) => void;
  select: (e: Entity | null) => void;
  setFollow: (e: Entity | null) => void;
  setBriefingOpen: (v: boolean) => void;
  requestFlyTo: (lon: number, lat: number, zoom?: number) => void;
}

export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  flights: true,
  satellites: true,
  earthquakes: true,
  disasters: true,
  events: true,
  cyber: true,
  weather: false,
  weatherRadar: false,
  cameras: false,
  ships: false,
  fires: false,
  outages: false,
  airquality: false,
};

export const useUiStore = create<UiState>()((set) => ({
  layers: { ...DEFAULT_LAYERS },
  satGroup: "visual",
  quakeFeed: "all_day",
  filters: { militaryOnly: false, quakeMinMag: 0 },
  timeWindowHours: null,
  basemap: "dark",
  selected: null,
  follow: null,
  briefingOpen: false,
  flyTo: null,

  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  setLayer: (id, on) => set((s) => ({ layers: { ...s.layers, [id]: on } })),
  setLayers: (l) => set((s) => ({ layers: { ...s.layers, ...l } })),
  setSatGroup: (g) => set({ satGroup: g }),
  setQuakeFeed: (f) => set({ quakeFeed: f }),
  setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v } })),
  setTimeWindow: (h) => set({ timeWindowHours: h }),
  setBasemap: (b) => set({ basemap: b }),
  select: (e) => set({ selected: e }),
  setFollow: (e) => set({ follow: e }),
  setBriefingOpen: (v) => set({ briefingOpen: v }),
  requestFlyTo: (lon, lat, zoom) => set({ flyTo: { lon, lat, zoom, nonce: Date.now() } }),
}));
