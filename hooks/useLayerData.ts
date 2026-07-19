"use client";

import useSWR from "swr";
import type { AegisResponse, Entity } from "@/lib/entities";

// Stable reference so `entities` doesn't become a new array every render when
// there's no data yet - otherwise effects that depend on it loop forever.
const EMPTY: Entity[] = [];

const fetcher = async (url: string): Promise<AegisResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AegisResponse;
};

export interface LayerData {
  entities: Entity[];
  meta: AegisResponse["meta"] | undefined;
  isLoading: boolean;
  error: unknown;
  stale: boolean;
  /** True once at least one successful response has arrived. */
  ready: boolean;
}

/**
 * Generic per-layer fetch. Pass `null` as the key to skip fetching entirely
 * (SWR convention) - used when a layer is toggled off.
 */
export function useLayerData(key: string | null, refreshInterval: number): LayerData {
  const { data, error, isLoading } = useSWR<AegisResponse>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: Math.min(refreshInterval, 4000),
    errorRetryCount: 2,
  });

  return {
    entities: data?.entities ?? EMPTY,
    meta: data?.meta,
    isLoading,
    error,
    stale: data?.meta?.stale ?? false,
    ready: !!data,
  };
}
