"use client";

import { GROUP_LABELS, LAYERS, type LayerGroup } from "@/layers/registry";
import { SAT_GROUPS } from "@/lib/sources/satellites";
import { QUAKE_FEEDS } from "@/lib/sources/earthquakes";
import { useUiStore, type BasemapMode, type LayerId } from "@/store/useUiStore";
import { fmtNum } from "@/lib/format";

interface Props {
  counts: Partial<Record<LayerId, number>>;
  available: Record<string, boolean>;
  stale: Partial<Record<LayerId, boolean>>;
}

const GROUP_ORDER: LayerGroup[] = ["air", "space", "earth", "info", "cyber"];
const TIME_WINDOWS: Array<[string, number | null]> = [
  ["All", null],
  ["1h", 1],
  ["6h", 6],
  ["24h", 24],
];
const BASEMAPS: Array<[string, BasemapMode]> = [
  ["Dark", "dark"],
  ["Minimal", "darkNoLabels"],
  ["Light", "light"],
];

export function LayerPanel({ counts, available, stale }: Props) {
  const s = useUiStore();

  return (
    <div className="layer-panel panel">
      <div className="panel-title">Layers</div>

      {GROUP_ORDER.map((group) => {
        const rows = LAYERS.filter((l) => l.group === group).filter((l) => !l.optional || available[l.id]);
        if (rows.length === 0) return null;
        return (
          <div key={group}>
            <div className="layer-group">{GROUP_LABELS[group]}</div>
            {rows.map((l) => {
              const on = s.layers[l.id];
              return (
                <div key={l.id}>
                  <div className={`layer-row ${on ? "" : "off"}`} onClick={() => s.toggleLayer(l.id)} title={l.hint}>
                    <span className="sw" style={{ background: `var(${l.cssVar})` }} />
                    <span className="name">{l.label}</span>
                    {stale[l.id] && <span className="stale-dot" title="showing cached data">⟳</span>}
                    {on && counts[l.id] !== undefined && <span className="count mono">{fmtNum(counts[l.id] ?? 0)}</span>}
                    <span className={`toggle ${on ? "on" : ""}`}>
                      <span className="knob" />
                    </span>
                  </div>

                  {l.id === "flights" && on && (
                    <div className="sub-control" onClick={(e) => e.stopPropagation()}>
                      <label>
                        <input
                          type="checkbox"
                          checked={s.filters.militaryOnly}
                          onChange={(e) => s.setFilter("militaryOnly", e.target.checked)}
                        />{" "}
                        military only (global)
                      </label>
                    </div>
                  )}

                  {l.id === "satellites" && on && (
                    <div className="sub-control">
                      <label>group</label>
                      <select value={s.satGroup} onChange={(e) => s.setSatGroup(e.target.value)}>
                        {SAT_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {l.id === "earthquakes" && on && (
                    <>
                      <div className="sub-control">
                        <label>window</label>
                        <select value={s.quakeFeed} onChange={(e) => s.setQuakeFeed(e.target.value)}>
                          {QUAKE_FEEDS.map((f) => (
                            <option key={f} value={f}>
                              {f.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sub-control">
                        <label>min M {s.filters.quakeMinMag.toFixed(1)}</label>
                        <input
                          type="range"
                          min={0}
                          max={7}
                          step={0.5}
                          value={s.filters.quakeMinMag}
                          onChange={(e) => s.setFilter("quakeMinMag", Number(e.target.value))}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="layer-group">View</div>
      <div className="sub-control">
        <label>time</label>
        <select value={String(s.timeWindowHours ?? "")} onChange={(e) => s.setTimeWindow(e.target.value ? Number(e.target.value) : null)}>
          {TIME_WINDOWS.map(([label, val]) => (
            <option key={label} value={val ?? ""}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="sub-control">
        <label>map</label>
        <select value={s.basemap} onChange={(e) => s.setBasemap(e.target.value as BasemapMode)}>
          {BASEMAPS.map(([label, val]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
