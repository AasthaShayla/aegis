"use client";

import { useEffect, useRef, useState } from "react";
import * as satellite from "satellite.js";
import type { Entity } from "@/lib/entities";

export interface SatPosition {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altKm: number;
}

interface Satrec {
  id: string;
  name: string;
  rec: satellite.SatRec;
}

// Propagating tens of thousands of objects at 1 Hz would jank the main thread.
// Cap the working set (a Web Worker is the documented path for full catalogs).
const MAX_SATS = 3000;

/**
 * Build SGP4 records from TLE entities, then recompute geodetic positions once
 * per second while enabled. Positions are held in state and consumed by the
 * satellites deck layer.
 */
export function useSatellitePositions(tle: Entity[] | undefined, enabled: boolean): SatPosition[] {
  const satrecsRef = useRef<Satrec[]>([]);
  const [positions, setPositions] = useState<SatPosition[]>([]);

  // Rebuild records whenever the TLE set changes.
  useEffect(() => {
    if (!tle || tle.length === 0) {
      satrecsRef.current = [];
      return;
    }
    const recs: Satrec[] = [];
    for (const e of tle.slice(0, MAX_SATS)) {
      const lines = e.props.tle as [string, string] | undefined;
      if (!lines) continue;
      try {
        recs.push({ id: e.id, name: String(e.props.name ?? e.label), rec: satellite.twoline2satrec(lines[0], lines[1]) });
      } catch {
        /* skip malformed TLE */
      }
    }
    satrecsRef.current = recs;
  }, [tle]);

  // The interval depends ONLY on `enabled` and reads satrecs live from the ref,
  // so a new TLE array reference can never restart it or cause a render loop.
  useEffect(() => {
    if (!enabled) {
      setPositions([]);
      return;
    }
    let cancelled = false;

    const tick = () => {
      const now = new Date();
      const gmst = satellite.gstime(now);
      const out: SatPosition[] = [];
      for (const s of satrecsRef.current) {
        let pv: satellite.PositionAndVelocity;
        try {
          pv = satellite.propagate(s.rec, now);
        } catch {
          continue;
        }
        const pos = pv.position;
        if (typeof pos === "boolean") continue;
        const gd = satellite.eciToGeodetic(pos, gmst);
        const lon = satellite.degreesLong(gd.longitude);
        const lat = satellite.degreesLat(gd.latitude);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        out.push({ id: s.id, name: s.name, lon, lat, altKm: gd.height });
      }
      if (!cancelled) setPositions(out);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  return positions;
}

/**
 * Ground track for one satellite over a single orbital period, split into
 * segments at the antimeridian so paths don't smear across the map.
 */
export function computeGroundTrack(line1: string, line2: string): number[][][] {
  try {
    const rec = satellite.twoline2satrec(line1, line2);
    const meanMotion = (rec as unknown as { no: number }).no; // rad/min
    if (!meanMotion || meanMotion <= 0) return [];
    const periodMin = (2 * Math.PI) / meanMotion;
    const steps = 120;
    const now = Date.now();
    const raw: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
      const t = new Date(now + (i / steps) * periodMin * 60 * 1000);
      const pv = satellite.propagate(rec, t);
      const pos = pv.position;
      if (typeof pos === "boolean") continue;
      const gd = satellite.eciToGeodetic(pos, satellite.gstime(t));
      raw.push([satellite.degreesLong(gd.longitude), satellite.degreesLat(gd.latitude)]);
    }
    return splitAntimeridian(raw);
  } catch {
    return [];
  }
}

function splitAntimeridian(points: Array<[number, number]>): number[][][] {
  const segments: number[][][] = [];
  let current: number[][] = [];
  for (let i = 0; i < points.length; i++) {
    if (i > 0 && Math.abs(points[i][0] - points[i - 1][0]) > 180) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(points[i]);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
