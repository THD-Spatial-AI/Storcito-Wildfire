import { useEffect, useState } from 'react';
import axios from '@/lib/axios';

export interface RiskMapBounds {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

export interface RiskMapSample {
  x: number;
  y: number;
  value: number;
  level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | 'unknown';
  row: number;
  column: number;
}

export interface RiskMapSamples {
  model_id: number;
  result_id: number;
  bounds: RiskMapBounds;
  grid_size: number;
  samples: RiskMapSample[];
  valid_samples: number;
  total_samples: number;
}

interface RiskMapSamplesResponse {
  data: RiskMapSamples | null;
  ready: boolean;
}

export const useRiskMapSamples = (modelId: number | undefined, sampleCount = 625) => {
  const [data, setData] = useState<RiskMapSamples | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelId) {
      setData(null);
      setReady(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchSamples = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get<RiskMapSamplesResponse>(
          `/models/${modelId}/risk-map-samples`,
          {
            params: { sample_count: sampleCount },
            signal: controller.signal,
          },
        );
        if (cancelled) return;

        setData(response.data.data);
        setReady(response.data.ready && Boolean(response.data.data));
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error('Failed to fetch risk map samples:', err);
        setData(null);
        setReady(false);
        setError('Failed to load risk map samples');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSamples();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [modelId, sampleCount]);

  return { data, isLoading, ready, error };
};
