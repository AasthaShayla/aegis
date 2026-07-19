"use client";

import { useControl } from "react-map-gl/maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";

/**
 * Bridges deck.gl into the MapLibre map as an interleaved overlay, so basemap
 * labels can draw above dense data. Rendered as a child of <Map>.
 */
export function DeckOverlay(props: MapboxOverlayProps): null {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
