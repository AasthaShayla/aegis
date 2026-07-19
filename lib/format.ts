/** Display formatters. All timestamps are epoch ms. */

export function fmtNum(n: number | null | undefined, opts: Intl.NumberFormatOptions = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("en-US", opts).format(n);
}

export function fmtCoord(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "-";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lon).toFixed(3)}°${ew}`;
}

export function fmtRelTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return "now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtUtc(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
}

export function fmtAltitude(ft: number | null): string {
  if (ft === null || ft === undefined) return "-";
  return `${fmtNum(ft)} ft`;
}

export function fmtPrice(n: number): string {
  const digits = n >= 1000 ? 0 : n >= 1 ? 2 : 6;
  return `$${fmtNum(n, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** WMO weather interpretation codes (Open-Meteo `weather_code`). */
export function weatherCodeText(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Violent showers",
    95: "Thunderstorm",
    96: "Thunderstorm + hail",
    99: "Severe thunderstorm",
  };
  return map[code] ?? `Code ${code}`;
}
