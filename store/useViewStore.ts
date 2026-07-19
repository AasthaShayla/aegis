"use client";

import { create } from "zustand";

export interface ViewBbox {
  w: number;
  s: number;
  e: number;
  n: number;
}

/** Current map camera + bounds, updated (debounced) on move so viewport-driven
 *  layers (flights, ships) can refetch around the visible area. */
interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bbox: ViewBbox;
  setView: (v: { longitude: number; latitude: number; zoom: number; bbox: ViewBbox }) => void;
}

export const useViewStore = create<ViewState>()((set) => ({
  longitude: 8,
  latitude: 48,
  zoom: 5,
  bbox: { w: 0, s: 43, e: 16, n: 53 },
  setView: (v) => set(v),
}));
