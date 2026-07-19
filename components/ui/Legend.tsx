"use client";

import { LAYERS } from "@/layers/registry";
import { useUiStore } from "@/store/useUiStore";

export function Legend({ available }: { available: Record<string, boolean> }) {
  const layers = useUiStore((s) => s.layers);
  const active = LAYERS.filter((l) => l.onMap && layers[l.id] && (!l.optional || available[l.id]));
  if (active.length === 0) return null;

  return (
    <div className="legend panel">
      {active.map((l) => (
        <div className="lg-row" key={l.id}>
          <span className="sw" style={{ background: `var(${l.cssVar})` }} />
          {l.label}
        </div>
      ))}
    </div>
  );
}
