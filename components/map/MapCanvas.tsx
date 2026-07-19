"use client";

import { useCallback, useEffect, useRef } from "react";
import Map, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Layer as DeckLayer, PickingInfo } from "@deck.gl/core";
import { DeckOverlay } from "./DeckOverlay";
import { useRainviewerTiles } from "@/hooks/useRainviewer";
import { useViewStore } from "@/store/useViewStore";
import { useUiStore, type BasemapMode } from "@/store/useUiStore";

const STYLES: Record<BasemapMode, string> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  darkNoLabels: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};
const OVERRIDE = process.env.NEXT_PUBLIC_BASEMAP_STYLE;

interface Props {
  layers: DeckLayer[];
  onDeckClick: (info: PickingInfo) => void;
  radarOn: boolean;
  followTarget: [number, number] | null;
}

export default function MapCanvas({ layers, onDeckClick, radarOn, followTarget }: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const setView = useViewStore((s) => s.setView);
  const flyTo = useUiStore((s) => s.flyTo);
  const basemap = useUiStore((s) => s.basemap);
  const radarTiles = useRainviewerTiles(radarOn);

  const publishView = useCallback(
    (e: { target: { getBounds: () => { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number }; getCenter: () => { lng: number; lat: number }; getZoom: () => number } }) => {
      const b = e.target.getBounds();
      const c = e.target.getCenter();
      setView({
        longitude: c.lng,
        latitude: c.lat,
        zoom: e.target.getZoom(),
        bbox: { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() },
      });
    },
    [setView],
  );

  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo({ center: [flyTo.lon, flyTo.lat], zoom: flyTo.zoom ?? 5, duration: 1400 });
    }
  }, [flyTo]);

  // Follow a moving entity: recenter smoothly as its position updates.
  useEffect(() => {
    if (followTarget && mapRef.current) {
      mapRef.current.easeTo({ center: followTarget, duration: 900 });
    }
  }, [followTarget]);

  const handleLoad = useCallback((e: { target: { resize: () => void } }) => e.target.resize(), []);

  // Interleaved by default (labels draw over data). `?overlay=1` uses an
  // overlaid deck canvas instead — more portable across GL backends (e.g. some
  // headless/screenshot renderers), at the cost of labels sitting under data.
  const interleaved =
    typeof window === "undefined" || new URLSearchParams(window.location.search).get("overlay") !== "1";

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 8, latitude: 48, zoom: 5 }}
      mapStyle={OVERRIDE || STYLES[basemap]}
      onMoveEnd={publishView}
      onLoad={handleLoad}
      maxPitch={0}
      dragRotate={false}
      style={{ width: "100%", height: "100%" }}
      attributionControl={{ compact: true }}
    >
      {radarOn && radarTiles && (
        <Source id="rainviewer" type="raster" tiles={[radarTiles]} tileSize={256}>
          <Layer id="rainviewer-layer" type="raster" paint={{ "raster-opacity": 0.55 }} />
        </Source>
      )}
      <DeckOverlay
        interleaved={interleaved}
        layers={layers}
        onClick={onDeckClick}
        getCursor={({ isHovering, isDragging }) =>
          isDragging ? "grabbing" : isHovering ? "pointer" : "grab"
        }
      />
      <NavigationControl position="bottom-right" showCompass={false} />
    </Map>
  );
}
