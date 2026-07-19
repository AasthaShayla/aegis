/**
 * Markets: top crypto (CoinGecko keyless public API) + the Fear & Greed index
 * (alternative.me). Non-geographic - rendered as the bottom ticker + gauge, not
 * on the map. 60s TTL keeps us safely under CoinGecko's keyless rate limit.
 */

import { fetchJson } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const MARKETS_TTL_MS = 60_000;
export const MARKETS_SOURCE = "CoinGecko + alternative.me";
export const MARKETS_ATTRIBUTION = "Market data by CoinGecko; Fear & Greed by alternative.me";

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
}

interface FngResponse {
  data?: Array<{ value: string; value_classification: string; timestamp: string }>;
}

export async function fetchMarkets(): Promise<Entity[]> {
  const [coins, fng] = await Promise.allSettled([
    fetchJson<CoinGeckoCoin[]>(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h",
    ),
    fetchJson<FngResponse>("https://api.alternative.me/fng/?limit=1"),
  ]);

  const out: Entity[] = [];
  const now = Date.now();

  if (fng.status === "fulfilled" && fng.value.data?.[0]) {
    const d = fng.value.data[0];
    out.push({
      id: "fear-greed",
      type: "market",
      lat: null,
      lon: null,
      label: "Fear & Greed",
      ts: Number(d.timestamp) * 1000 || now,
      props: { kind: "fear_greed", value: Number(d.value), classification: d.value_classification },
    });
  }

  if (coins.status === "fulfilled") {
    for (const c of coins.value) {
      out.push({
        id: c.id,
        type: "market",
        lat: null,
        lon: null,
        label: c.symbol.toUpperCase(),
        ts: now,
        props: {
          kind: "crypto",
          name: c.name,
          price: c.current_price,
          change24h: c.price_change_percentage_24h ?? 0,
          marketCap: c.market_cap,
          image: c.image,
        },
      });
    }
  }

  // If both failed, surface an error so the cache can serve stale instead.
  if (out.length === 0) throw new Error("no market data from any source");
  return out;
}
