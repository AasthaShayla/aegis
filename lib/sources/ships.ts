/**
 * OPTIONAL — AIS vessel positions via aisstream.io (free key required).
 *
 * A single persistent server-side WebSocket subscribes to global positions and
 * buffers the latest report per MMSI in memory. The route reads a snapshot
 * (optionally filtered by bbox) — no reconnect per request. Off unless
 * AISSTREAM_API_KEY is set. Uses the global WebSocket (Node 22+).
 */

import { env } from "@/lib/env";
import type { Entity } from "@/lib/entities";
import type { Bbox } from "@/lib/sources/flights";

export const SHIPS_TTL_MS = 5_000;
export const SHIPS_SOURCE = "aisstream.io";
export const SHIPS_ATTRIBUTION = "Vessel data: aisstream.io (AIS)";

interface AisMessage {
  MessageType?: string;
  MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number; time_utc?: string };
  Message?: {
    PositionReport?: {
      Latitude?: number;
      Longitude?: number;
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
      NavigationalStatus?: number;
    };
  };
}

interface ShipRecord extends Entity {
  updated: number;
}

class ShipsManager {
  private ws: WebSocket | null = null;
  private ships = new Map<number, ShipRecord>();
  private connecting = false;
  private lastPrune = 0;

  private connect(): void {
    if (this.ws || this.connecting || !env.aisstreamKey) return;
    this.connecting = true;
    try {
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      this.ws = ws;
      ws.onopen = () => {
        this.connecting = false;
        ws.send(
          JSON.stringify({
            APIKey: env.aisstreamKey,
            BoundingBoxes: [
              [
                [-90, -180],
                [90, 180],
              ],
            ],
            FilterMessageTypes: ["PositionReport"],
          }),
        );
      };
      ws.onmessage = (evt: MessageEvent) => this.ingest(String(evt.data));
      ws.onerror = () => this.reset();
      ws.onclose = () => this.reset();
    } catch {
      this.reset();
    }
  }

  private reset(): void {
    this.connecting = false;
    this.ws = null;
  }

  private ingest(raw: string): void {
    try {
      const msg = JSON.parse(raw) as AisMessage;
      const pr = msg.Message?.PositionReport;
      const meta = msg.MetaData;
      if (!pr || !meta?.MMSI) return;
      const lat = pr.Latitude ?? meta.latitude;
      const lon = pr.Longitude ?? meta.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return;
      const now = Date.now();
      this.ships.set(meta.MMSI, {
        id: String(meta.MMSI),
        type: "ship",
        lat,
        lon,
        label: (meta.ShipName ?? "").trim() || String(meta.MMSI),
        ts: meta.time_utc ? Date.parse(meta.time_utc) : now,
        updated: now,
        props: { heading: pr.TrueHeading ?? pr.Cog ?? 0, speed: pr.Sog ?? null, navStatus: pr.NavigationalStatus ?? null },
      });
      if (now - this.lastPrune > 30_000) this.prune(now);
    } catch {
      /* skip malformed frame */
    }
  }

  private prune(now: number): void {
    this.lastPrune = now;
    for (const [mmsi, s] of this.ships) {
      if (now - s.updated > 5 * 60_000) this.ships.delete(mmsi);
    }
  }

  snapshot(bbox?: Bbox): Entity[] {
    this.connect(); // idempotent; ensures a live connection
    const all = [...this.ships.values()];
    const inBox = (e: Entity) =>
      !bbox ||
      (e.lat! >= bbox.s && e.lat! <= bbox.n && e.lon! >= bbox.w && e.lon! <= bbox.e);
    return all
      .filter(inBox)
      .slice(0, 4000)
      .map(({ updated: _u, ...e }) => e);
  }
}

const manager = new ShipsManager();

export function fetchShips(bbox?: Bbox): Promise<Entity[]> {
  return Promise.resolve(manager.snapshot(bbox));
}
