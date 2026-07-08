import { useEffect, useState } from "react";
import axios from "@/lib/axios";

export interface DayAreas {
  very_low: number;
  low: number;
  moderate: number;
  high: number;
  very_high: number;
}

export interface DayDistribution {
  date: string;
  distribution: DayAreas & Record<string, number>;
  area_km2: DayAreas;
  valid_samples: number;
  total_samples: number;
}

export interface DailyRiskSeries {
  model_id: number;
  result_id: number;
  days: DayDistribution[];
}

interface DailyRiskResponse {
  data: DailyRiskSeries | null;
  ready: boolean;
}

// Per-day class distributions; fetched lazily (first server computation is slow).
export const useDailyRiskDistribution = (modelId: number | undefined, enabled: boolean) => {
  const [data, setData] = useState<DailyRiskSeries | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelId || !enabled) return;
    if (data && data.model_id === modelId) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get<DailyRiskResponse>(
          `/models/${modelId}/risk-daily-distribution`,
          { signal: controller.signal, timeout: 120_000 },
        );
        if (cancelled) return;
        setData(response.data.ready ? response.data.data : null);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error("Failed to fetch daily risk distribution:", err);
        setError("Failed to load daily risk distribution");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [modelId, enabled, data]);

  useEffect(() => {
    setData(null);
    setError(null);
  }, [modelId]);

  return { data, isLoading, error };
};
