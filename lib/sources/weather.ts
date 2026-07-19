/**
 * Point weather forecast from Open-Meteo (no key, CC-BY 4.0). Used for
 * click-to-inspect on the map — one request per interaction, cached per
 * rounded coordinate, so we stay far under the 600/min budget.
 */

import { fetchJson } from "@/lib/http";
import type { Entity } from "@/lib/entities";

export const WEATHER_TTL_MS = 15 * 60 * 1000; // 15m
export const WEATHER_SOURCE = "Open-Meteo";
export const WEATHER_ATTRIBUTION = "Weather data by Open-Meteo.com (CC-BY 4.0)";

interface OpenMeteoResponse {
  current?: Record<string, number | string>;
  current_units?: Record<string, string>;
  hourly?: { time: string[]; temperature_2m: number[] };
  elevation?: number;
  timezone?: string;
}

export async function fetchWeather(lat: number, lon: number): Promise<Entity[]> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    hourly: "temperature_2m",
    forecast_days: "2",
    timezone: "auto",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const data = await fetchJson<OpenMeteoResponse>(url);
  return [
    {
      id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
      type: "weather",
      lat,
      lon,
      label: "Forecast",
      ts: Date.now(),
      props: {
        current: data.current ?? {},
        units: data.current_units ?? {},
        hourly: data.hourly ?? null,
        elevation: data.elevation ?? null,
        timezone: data.timezone ?? "UTC",
      },
    },
  ];
}
