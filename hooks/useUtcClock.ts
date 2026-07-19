"use client";

import { useEffect, useState } from "react";

/** Returns epoch-ms, ticking once per second. Used by the status-bar clock. */
export function useUtcClock(): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
