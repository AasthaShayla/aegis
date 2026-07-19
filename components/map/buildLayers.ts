"use client";

import { IconLayer, ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { Entity } from "@/lib/entities";
import type { LayerId } from "@/store/useUiStore";
import type { SatPosition } from "@/hooks/useSatellites";
import { computeGroundTrack } from "@/hooks/useSatellites";
import { COLORS, confidenceColor, depthColor, magToRadius, type RGBA } from "@/lib/colors";

const svgIcon = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

const PLANE_ICON = {
  url: svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#fff" d="M32 3 L37 28 L60 41 L60 47 L37 39 L35 55 L43 60 L43 62 L32 58 L21 62 L21 60 L29 55 L27 39 L4 47 L4 41 L27 28 Z"/></svg>`,
  ),
  width: 64,
  height: 64,
  anchorX: 32,
  anchorY: 32,
  mask: true,
};

const CAMERA_ICON = {
  url: svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="#fff"><rect x="10" y="20" width="44" height="28" rx="4"/><rect x="22" y="12" width="16" height="10" rx="2"/><circle cx="32" cy="34" r="9" fill="#000"/><circle cx="32" cy="34" r="5" fill="#fff"/></g></svg>`,
  ),
  width: 64,
  height: 64,
  anchorX: 32,
  anchorY: 40,
  mask: true,
};

const SHIP_ICON = {
  url: svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#fff" d="M32 4 L40 34 L32 30 L24 34 Z M14 38 L50 38 L44 56 L20 56 Z"/></svg>`,
  ),
  width: 64,
  height: 64,
  anchorX: 32,
  anchorY: 32,
  mask: true,
};

export interface BuildInput {
  layers: Record<LayerId, boolean>;
  available: Record<string, boolean>;
  flights: Entity[];
  satellites: SatPosition[];
  earthquakes: Entity[];
  disasters: Entity[];
  events: Entity[];
  cyber: Entity[];
  cameras: Entity[];
  ships: Entity[];
  fires: Entity[];
  outages: Entity[];
  airquality: Entity[];
  selected: Entity | null;
}

const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
const geo = (e: Entity): boolean => e.lat !== null && e.lon !== null;

export function buildLayers(input: BuildInput): Layer[] {
  const { layers, available, selected } = input;
  const on = (id: LayerId) => layers[id] && (available[id] ?? true);
  const out: Layer[] = [];

  if (on("satellites") && input.satellites.length > 0) {
    out.push(
      new ScatterplotLayer<SatPosition>({
        id: "satellites",
        data: input.satellites,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 2,
        radiusUnits: "pixels",
        radiusMinPixels: 1.5,
        radiusMaxPixels: 4,
        getFillColor: [...COLORS.satellites, 220] as RGBA,
        pickable: true,
        updateTriggers: { getPosition: input.satellites },
      }),
    );
  }

  if (on("airquality")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "airquality",
        data: input.airquality.filter(geo),
        getPosition: (d) => [d.lon!, d.lat!],
        getRadius: 3,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        getFillColor: [...COLORS.airquality, 150] as RGBA,
        pickable: true,
      }),
    );
  }

  if (on("earthquakes")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "earthquakes",
        data: input.earthquakes,
        getPosition: (d) => [d.lon ?? 0, d.lat ?? 0],
        getRadius: (d) => magToRadius(num(d.props.mag)),
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        stroked: true,
        lineWidthMinPixels: 1,
        getLineColor: [255, 255, 255, 120],
        getFillColor: (d) => depthColor(num(d.props.depth)),
        pickable: true,
      }),
    );
  }

  if (on("disasters")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "disasters",
        data: input.disasters,
        getPosition: (d) => [d.lon ?? 0, d.lat ?? 0],
        getRadius: 7,
        radiusUnits: "pixels",
        radiusMinPixels: 5,
        stroked: true,
        filled: true,
        lineWidthMinPixels: 2,
        getLineColor: [...COLORS.disasters, 255] as RGBA,
        getFillColor: [...COLORS.disasters, 40] as RGBA,
        pickable: true,
      }),
    );
  }

  if (on("fires")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "fires",
        data: input.fires.filter(geo),
        getPosition: (d) => [d.lon!, d.lat!],
        getRadius: 3,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        getFillColor: [...COLORS.fires, 200] as RGBA,
        pickable: true,
      }),
    );
  }

  if (on("outages")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "outages",
        data: input.outages.filter(geo),
        getPosition: (d) => [d.lon!, d.lat!],
        getRadius: 8,
        radiusUnits: "pixels",
        radiusMinPixels: 6,
        stroked: true,
        filled: true,
        lineWidthMinPixels: 2,
        getLineColor: [...COLORS.outages, 255] as RGBA,
        getFillColor: [...COLORS.outages, 60] as RGBA,
        pickable: true,
      }),
    );
  }

  if (on("events")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "events",
        data: input.events,
        getPosition: (d) => [d.lon ?? 0, d.lat ?? 0],
        getRadius: (d) => 3 + Math.log10(num(d.props.count, 1) + 1) * 3,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        getFillColor: [...COLORS.events, 150] as RGBA,
        pickable: true,
      }),
    );
  }

  if (on("cyber")) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "cyber",
        data: input.cyber.filter(geo),
        getPosition: (d) => [d.lon!, d.lat!],
        getRadius: (d) => 3 + (num(d.props.confidence) / 100) * 5,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        getFillColor: (d) => confidenceColor(num(d.props.confidence)),
        pickable: true,
      }),
    );
  }

  if (on("cameras")) {
    out.push(
      new IconLayer<Entity>({
        id: "cameras",
        data: input.cameras.filter(geo),
        getPosition: (d) => [d.lon!, d.lat!],
        getIcon: () => CAMERA_ICON,
        getSize: 15,
        sizeUnits: "pixels",
        sizeMinPixels: 10,
        sizeMaxPixels: 22,
        getColor: [...COLORS.cameras, 235] as RGBA,
        pickable: true,
      }),
    );
  }

  if (on("ships")) {
    out.push(
      new IconLayer<Entity>({
        id: "ships",
        data: input.ships.filter(geo),
        getPosition: (d) => [d.lon!, d.lat!],
        getIcon: () => SHIP_ICON,
        getSize: 14,
        sizeUnits: "pixels",
        sizeMinPixels: 9,
        sizeMaxPixels: 20,
        getAngle: (d) => 360 - num(d.props.heading),
        getColor: [...COLORS.ships, 235] as RGBA,
        pickable: true,
        updateTriggers: { getPosition: input.ships, getAngle: input.ships },
      }),
    );
  }

  if (on("flights")) {
    out.push(
      new IconLayer<Entity>({
        id: "flights",
        data: input.flights,
        getPosition: (d) => [d.lon ?? 0, d.lat ?? 0],
        getIcon: () => PLANE_ICON,
        getSize: 20,
        sizeUnits: "pixels",
        sizeMinPixels: 11,
        sizeMaxPixels: 26,
        getAngle: (d) => 360 - num(d.props.heading),
        getColor: (d) =>
          d.props.military ? ([...COLORS.red, 255] as RGBA) : ([...COLORS.flights, 255] as RGBA),
        pickable: true,
        updateTriggers: { getPosition: input.flights, getAngle: input.flights },
      }),
    );
  }

  if (selected?.type === "satellite" && Array.isArray(selected.props.tle)) {
    const [l1, l2] = selected.props.tle as [string, string];
    const segments = computeGroundTrack(l1, l2);
    if (segments.length > 0) {
      out.push(
        new PathLayer<number[][]>({
          id: "sat-orbit",
          data: segments,
          getPath: (d) => d as unknown as [number, number][],
          getColor: [...COLORS.satellites, 180] as RGBA,
          getWidth: 1.5,
          widthUnits: "pixels",
          widthMinPixels: 1,
        }),
      );
    }
  }

  if (selected && selected.lat !== null && selected.lon !== null) {
    out.push(
      new ScatterplotLayer<Entity>({
        id: "selection",
        data: [selected],
        getPosition: (d) => [d.lon ?? 0, d.lat ?? 0],
        getRadius: 14,
        radiusUnits: "pixels",
        radiusMinPixels: 14,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 2,
        getLineColor: [...COLORS.ok, 255] as RGBA,
        pickable: false,
        updateTriggers: { getPosition: [selected.lon, selected.lat] },
      }),
    );
  }

  return out;
}
