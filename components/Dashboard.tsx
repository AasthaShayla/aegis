"use client";

import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import type { PickingInfo } from "@deck.gl/core";
import MapCanvas from "@/components/map/MapCanvas";
import { buildLayers } from "@/components/map/buildLayers";
import { TopStatusBar, type Connection } from "@/components/ui/TopStatusBar";
import { LayerPanel } from "@/components/ui/LayerPanel";
import { FeedColumn } from "@/components/ui/FeedColumn";
import { MarketTicker } from "@/components/ui/MarketTicker";
import { DetailPopover } from "@/components/ui/DetailPopover";
import { BriefingPanel } from "@/components/ui/BriefingPanel";
import { Legend } from "@/components/ui/Legend";
import { useLayerData } from "@/hooks/useLayerData";
import { useSatellitePositions, type SatPosition } from "@/hooks/useSatellites";
import { useDeadReckonedFlights } from "@/hooks/useDeadReckon";
import { computeAlerts } from "@/lib/alerts";
import { useUiStore, DEFAULT_LAYERS, type BasemapMode, type LayerId } from "@/store/useUiStore";
import { useViewStore } from "@/store/useViewStore";
import { LAYERS } from "@/layers/registry";
import type { Entity } from "@/lib/entities";

const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
const HEALTH_IDS = LAYERS.map((l) => l.id);

export default function Dashboard() {
  const s = useUiStore();
  const { layers, filters, timeWindowHours, satGroup, quakeFeed, selected, follow, select } = s;
  const bbox = useViewStore((v) => v.bbox);
  const lon = useViewStore((v) => v.longitude);
  const lat = useViewStore((v) => v.latitude);
  const zoom = useViewStore((v) => v.zoom);

  const { data: health } = useSWR<{ layers: Record<string, boolean> }>("/api/health", (u: string) =>
    fetch(u).then((r) => r.json()),
  );
  const available = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const id of HEALTH_IDS) {
      const optional = LAYERS.find((l) => l.id === id)?.optional;
      out[id] = health ? !!health.layers[id] : !optional;
    }
    return out;
  }, [health]);

  // --- Fetch every layer (null key = skip when off) ---
  const bboxStr = `${Math.round(bbox.w)},${Math.round(bbox.s)},${Math.round(bbox.e)},${Math.round(bbox.n)}`;
  const flightsKey = layers.flights
    ? filters.militaryOnly
      ? "/api/flights?mil=1"
      : `/api/flights?bbox=${bboxStr}`
    : null;

  const flights = useLayerData(flightsKey, 10_000);
  const satTle = useLayerData(layers.satellites ? `/api/satellites?group=${satGroup}` : null, 2 * 60 * 60 * 1000);
  const quakes = useLayerData(layers.earthquakes ? `/api/earthquakes?feed=${quakeFeed}` : null, 60_000);
  const disasters = useLayerData(layers.disasters ? "/api/disasters" : null, 60 * 60 * 1000);
  const events = useLayerData(layers.events ? "/api/events" : null, 15 * 60 * 1000);
  const cyber = useLayerData(layers.cyber ? "/api/cyber" : null, 5 * 60 * 1000);
  const cameras = useLayerData(layers.cameras && available.cameras ? "/api/cameras" : null, 5 * 60 * 1000);
  const markets = useLayerData("/api/markets", 60_000);
  const ships = useLayerData(layers.ships && available.ships ? "/api/ships" : null, 8_000);
  const fires = useLayerData(layers.fires && available.fires ? "/api/fires" : null, 10 * 60 * 1000);
  const outages = useLayerData(layers.outages && available.outages ? "/api/outages" : null, 10 * 60 * 1000);
  const airquality = useLayerData(layers.airquality && available.airquality ? "/api/airquality" : null, 15 * 60 * 1000);

  const satPositions: SatPosition[] = useSatellitePositions(satTle.entities, layers.satellites);
  const drFlights = useDeadReckonedFlights(flights.entities, layers.flights && !filters.militaryOnly);

  // --- Filters + time window ---
  const cutoff = timeWindowHours ? Date.now() - timeWindowHours * 3_600_000 : 0;
  const withinWindow = useCallback((e: Entity) => !cutoff || e.ts >= cutoff, [cutoff]);

  const fQuakes = useMemo(
    () => quakes.entities.filter((q) => num(q.props.mag) >= filters.quakeMinMag && withinWindow(q)),
    [quakes.entities, filters.quakeMinMag, withinWindow],
  );
  const fDisasters = useMemo(() => disasters.entities.filter(withinWindow), [disasters.entities, withinWindow]);
  const fEvents = useMemo(() => events.entities.filter(withinWindow), [events.entities, withinWindow]);

  const deckLayers = useMemo(
    () =>
      buildLayers({
        layers,
        available,
        flights: drFlights,
        satellites: satPositions,
        earthquakes: fQuakes,
        disasters: fDisasters,
        events: fEvents,
        cyber: cyber.entities,
        cameras: cameras.entities,
        ships: ships.entities,
        fires: fires.entities,
        outages: outages.entities,
        airquality: airquality.entities,
        selected,
      }),
    [layers, available, drFlights, satPositions, fQuakes, fDisasters, fEvents, cyber.entities, cameras.entities, ships.entities, fires.entities, outages.entities, airquality.entities, selected],
  );

  const alerts = useMemo(
    () => computeAlerts({ earthquakes: fQuakes, cyber: cyber.entities, events: fEvents, disasters: fDisasters }),
    [fQuakes, cyber.entities, fEvents, fDisasters],
  );

  // --- Follow a moving entity ---
  const followTarget: [number, number] | null = useMemo(() => {
    if (!follow) return null;
    const pool: Array<{ id: string; lon: number | null; lat: number | null }> =
      follow.type === "flight"
        ? drFlights
        : follow.type === "ship"
          ? ships.entities
          : follow.type === "satellite"
            ? satPositions.map((p) => ({ id: p.id, lon: p.lon, lat: p.lat }))
            : [];
    const live = pool.find((p) => p.id === follow.id);
    if (live && live.lon !== null && live.lat !== null) return [live.lon, live.lat];
    return follow.lon !== null && follow.lat !== null ? [follow.lon, follow.lat] : null;
  }, [follow, drFlights, ships.entities, satPositions]);

  // --- Click handling ---
  const onDeckClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        const id = info.layer?.id;
        if (id === "satellites") {
          const sat = info.object as SatPosition;
          const tle = satTle.entities.find((e) => e.id === sat.id);
          select({
            id: sat.id,
            type: "satellite",
            lat: sat.lat,
            lon: sat.lon,
            label: sat.name,
            ts: Date.now(),
            props: { name: sat.name, altKm: Math.round(sat.altKm), noradId: tle?.props.noradId, group: tle?.props.group, tle: tle?.props.tle },
          });
        } else if (id === "selection" || id === "sat-orbit") {
          /* decorations */
        } else {
          select(info.object as Entity);
        }
      } else if (layers.weather && info.coordinate) {
        const [clon, clat] = info.coordinate;
        fetch(`/api/weather?lat=${clat.toFixed(3)}&lon=${clon.toFixed(3)}`)
          .then((r) => r.json())
          .then((j) => j.entities?.[0] && select(j.entities[0] as Entity))
          .catch(() => {});
      } else {
        select(null);
      }
    },
    [layers.weather, satTle.entities, select],
  );

  // --- Search pool (memoized on raw data, not the 2Hz dead-reckon tick) ---
  const searchPool = useMemo(
    () => [...flights.entities, ...cameras.entities, ...events.entities, ...ships.entities],
    [flights.entities, cameras.entities, events.entities, ships.entities],
  );

  // --- URL state sync ---
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const on = h.get("layers");
    if (on) {
      const ids = new Set(on.split(","));
      const map: Partial<Record<LayerId, boolean>> = {};
      (Object.keys(DEFAULT_LAYERS) as LayerId[]).forEach((k) => (map[k] = ids.has(k)));
      s.setLayers(map);
    }
    const bm = h.get("map");
    if (bm === "dark" || bm === "darkNoLabels" || bm === "light") s.setBasemap(bm as BasemapMode);
    const at = h.get("at");
    if (at) {
      const [la, lo, z] = at.split(",").map(Number);
      if (Number.isFinite(la) && Number.isFinite(lo)) s.requestFlyTo(lo, la, z || 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const enabled = (Object.entries(layers) as Array<[LayerId, boolean]>).filter(([, v]) => v).map(([k]) => k).join(",");
    const h = new URLSearchParams();
    h.set("layers", enabled);
    h.set("map", s.basemap);
    h.set("at", `${lat.toFixed(2)},${lon.toFixed(2)},${Math.round(zoom)}`);
    window.history.replaceState(null, "", `#${h.toString()}`);
  }, [layers, s.basemap, lat, lon, zoom]);

  // --- Derived summary ---
  const counts: Partial<Record<LayerId, number>> = {
    flights: drFlights.length,
    satellites: satPositions.length,
    earthquakes: fQuakes.length,
    disasters: fDisasters.length,
    events: fEvents.length,
    cyber: cyber.entities.length,
    cameras: cameras.entities.length,
    ships: ships.entities.length,
    fires: fires.entities.length,
    outages: outages.entities.length,
    airquality: airquality.entities.length,
  };
  const staleMap: Partial<Record<LayerId, boolean>> = {
    flights: flights.stale,
    satellites: satTle.stale,
    earthquakes: quakes.stale,
    disasters: disasters.stale,
    events: events.stale,
    cyber: cyber.stale,
    cameras: cameras.stale,
  };

  const core = [flights, quakes, disasters, events, markets, cyber];
  const anyBad = core.some((d) => d.stale || (d.error && !d.ready));
  const allBad = core.every((d) => d.error && !d.ready);
  const connection: Connection = allBad ? "down" : anyBad ? "warn" : "ok";

  const totalTracked =
    (counts.flights ?? 0) + (counts.satellites ?? 0) + (counts.earthquakes ?? 0) + (counts.disasters ?? 0) + (counts.events ?? 0) + (counts.ships ?? 0) + (counts.cameras ?? 0);

  const attribution = useMemo(() => {
    const set = new Set<string>();
    for (const d of [flights, satTle, quakes, disasters, events, markets, cyber, cameras]) if (d.meta?.attribution) set.add(d.meta.attribution);
    return [...set].join("  ·  ");
  }, [flights.meta, satTle.meta, quakes.meta, disasters.meta, events.meta, markets.meta, cyber.meta, cameras.meta]);

  const briefingContext = useMemo(() => {
    const topEvents = fEvents.slice(0, 6).map((e) => `${e.label} (${num(e.props.count)} mentions)`).join("; ");
    const bigQuakes = fQuakes.filter((q) => num(q.props.mag) >= 4).slice(0, 5).map((q) => `M${num(q.props.mag).toFixed(1)} ${q.label}`).join("; ");
    const disasterCats = [...new Set(fDisasters.map((d) => String(d.props.category)))].join(", ");
    const alertLines = alerts.slice(0, 6).map((a) => `${a.severity.toUpperCase()}: ${a.title} — ${a.detail}`).join("\n");
    return [
      `Aircraft tracked: ${counts.flights}. Satellites: ${counts.satellites}.`,
      `Notable earthquakes: ${bigQuakes || "none"}.`,
      `Active natural-event categories: ${disasterCats || "none"}.`,
      `Top news locations: ${topEvents || "sparse"}.`,
      `Cyber indicators: ${counts.cyber}.`,
      `Correlated alerts:\n${alertLines || "none"}`,
    ].join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fEvents, fQuakes, fDisasters, alerts, counts.flights, counts.satellites, counts.cyber]);

  return (
    <main>
      <div className="map-root">
        <MapCanvas layers={deckLayers} onDeckClick={onDeckClick} radarOn={layers.weatherRadar} followTarget={followTarget} />
      </div>

      <div className="hud">
        <TopStatusBar
          totalTracked={totalTracked}
          flights={counts.flights ?? 0}
          satellites={counts.satellites ?? 0}
          quakes={counts.earthquakes ?? 0}
          connection={connection}
          alertCount={alerts.filter((a) => a.severity !== "info").length}
          searchPool={searchPool}
        />
        <LayerPanel counts={counts} available={available} stale={staleMap} />
        <FeedColumn
          events={fEvents}
          eventsLoading={events.isLoading && !events.ready}
          eventsStale={events.stale}
          threats={cyber.entities}
          threatsLoading={cyber.isLoading && !cyber.ready}
          cyberAvailable={layers.cyber}
          alerts={alerts}
        />
        <MarketTicker markets={markets.entities} />
        <Legend available={available} />
        <BriefingPanel context={briefingContext} />
        {attribution && <div className="attrib">{attribution}</div>}
        {selected && <DetailPopover entity={selected} />}
      </div>
    </main>
  );
}
