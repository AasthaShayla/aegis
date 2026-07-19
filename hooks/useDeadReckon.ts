"use client";

import { useEffect, useRef, useState } from "react";
import type { Entity } from "@/lib/entities";

const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);

/**
 * Smoothly advance aircraft between ~10s fetches by dead-reckoning from their
 * heading and ground speed, updated a few times per second. Resets to the true
 * position whenever a fresh snapshot arrives.
 */
export function useDeadReckonedFlights(flights: Entity[], enabled: boolean): Entity[] {
  const rawRef = useRef<{ list: Entity[]; base: number }>({ list: flights, base: Date.now() });
  const [out, setOut] = useState<Entity[]>(flights);

  useEffect(() => {
    rawRef.current = { list: flights, base: Date.now() };
    setOut(flights);
  }, [flights]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const { list, base } = rawRef.current;
      const dtH = (Date.now() - base) / 3_600_000;
      if (dtH <= 0) return;
      setOut(
        list.map((f) => {
          const spd = num(f.props.speed);
          const hd = num(f.props.heading);
          if (f.props.onGround || spd <= 0 || f.lat === null || f.lon === null) return f;
          const nm = spd * dtH;
          const dLat = (nm / 60) * Math.cos((hd * Math.PI) / 180);
          const dLon = ((nm / 60) * Math.sin((hd * Math.PI) / 180)) / Math.cos((f.lat * Math.PI) / 180);
          return { ...f, lat: f.lat + dLat, lon: f.lon + dLon };
        }),
      );
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [enabled]);

  return enabled ? out : flights;
}
