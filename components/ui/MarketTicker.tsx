"use client";

import { useMemo } from "react";
import type { Entity } from "@/lib/entities";
import { fmtPct, fmtPrice } from "@/lib/format";

function fngColor(v: number): string {
  if (v < 25) return "var(--red)";
  if (v < 45) return "var(--amber)";
  if (v < 55) return "var(--text)";
  if (v < 75) return "#8fe9a0";
  return "var(--ok)";
}

export function MarketTicker({ markets }: { markets: Entity[] }) {
  const { fng, cryptos } = useMemo(() => {
    const fngEntity = markets.find((m) => m.props.kind === "fear_greed");
    const cryptoList = markets.filter((m) => m.props.kind === "crypto");
    return {
      fng: fngEntity
        ? { value: fngEntity.props.value as number, cls: fngEntity.props.classification as string }
        : null,
      cryptos: cryptoList,
    };
  }, [markets]);

  const items = cryptos.map((c) => {
    const change = (c.props.change24h as number) ?? 0;
    return (
      <span className="tk" key={c.id}>
        <span className="sym">{c.label}</span>
        <span className="price">{fmtPrice(c.props.price as number)}</span>
        <span className={change >= 0 ? "up" : "down"}>{fmtPct(change)}</span>
      </span>
    );
  });

  return (
    <div className="ticker">
      {fng && (
        <div className="fng">
          <span className="label">Fear&nbsp;/&nbsp;Greed</span>
          <span className="val" style={{ color: fngColor(fng.value) }}>
            {fng.value}
          </span>
          <span className="cls">{fng.cls}</span>
        </div>
      )}
      {items.length > 0 ? (
        <div className="ticker-track">
          {items}
          {items}
        </div>
      ) : (
        <div className="ticker-track" style={{ color: "var(--text-faint)", fontSize: 12 }}>
          <span>Loading markets…</span>
        </div>
      )}
    </div>
  );
}
