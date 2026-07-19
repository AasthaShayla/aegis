"use client";

import { useEffect, useState } from "react";

/** Latest RainViewer precipitation-radar raster tile template, refreshed every
 *  5 min. Returns null until loaded or when disabled. */
export function useRainviewerTiles(enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const j = (await res.json()) as { host: string; radar?: { past?: Array<{ path: string }> } };
        const past = j.radar?.past ?? [];
        const frame = past[past.length - 1];
        if (frame && !cancelled) setUrl(`${j.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`);
      } catch {
        /* ignore — overlay simply won't show */
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  return url;
}
