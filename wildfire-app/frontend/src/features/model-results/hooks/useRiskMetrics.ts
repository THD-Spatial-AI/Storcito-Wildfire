import { useEffect, useState } from 'react';
import { riskMetricsService } from '@/features/model-results/services/riskMetrics';

export type RiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
type RiskTrend = 'increasing' | 'decreasing' | 'stable';

export interface RiskDistribution {
  veryLow: number;
  low: number;
  moderate: number;
  high: number;
  veryHigh: number;
}

export interface RiskMetrics {
  overallRiskLevel: RiskLevel | null;
  /** 1..5 scale (mean) */
  overallRiskScore: number | null;
  affectedAreaKm2: number | null;
  affectedAreaHectares: number | null;
  totalAreaKm2: number | null;
  affectedFraction: number | null;
  highRiskZones: number | null;
  riskTrend: RiskTrend | null;
  previousScore: number | null;
  sampleCount: number | null;
  /** Percentages 0..100, summing to ~100 */
  riskDistribution: RiskDistribution | null;
}

interface BackendDistribution {
  very_low: number;
  low: number;
  moderate: number;
  high: number;
  very_high: number;
}

interface BackendMetrics {
  model_id: number;
  result_id: number;
  overall_score: number; // 0..1
  level: RiskLevel | 'unknown';
  affected_area_km2: number;
  total_area_km2: number;
  affected_fraction: number;
  distribution: BackendDistribution; // integer sample counts
  sample_count: number;
  trend: 'improving' | 'stable' | 'worsening' | 'unknown';
  previous_score?: number;
}

const mapTrend = (trend: BackendMetrics['trend']): RiskTrend | null => {
  switch (trend) {
    case 'worsening':
      return 'increasing';
    case 'improving':
      return 'decreasing';
    case 'stable':
      return 'stable';
    default:
      return null;
  }
};

const mapLevel = (level: BackendMetrics['level']): RiskLevel | null =>
  level === 'unknown' ? null : level;

const toPercentages = (
  dist: BackendDistribution,
  sampleCount: number,
): RiskDistribution => {
  const total =
    sampleCount > 0
      ? sampleCount
      : dist.very_low + dist.low + dist.moderate + dist.high + dist.very_high;

  if (total <= 0) {
    return { veryLow: 0, low: 0, moderate: 0, high: 0, veryHigh: 0 };
  }

  const pct = (n: number) => (n / total) * 100;
  return {
    veryLow: pct(dist.very_low),
    low: pct(dist.low),
    moderate: pct(dist.moderate),
    high: pct(dist.high),
    veryHigh: pct(dist.very_high),
  };
};

const EMPTY: RiskMetrics = {
  overallRiskLevel: null,
  overallRiskScore: null,
  affectedAreaKm2: null,
  affectedAreaHectares: null,
  totalAreaKm2: null,
  affectedFraction: null,
  highRiskZones: null,
  riskTrend: null,
  previousScore: null,
  sampleCount: null,
  riskDistribution: null,
};

export const useRiskMetrics = (modelId: number | undefined) => {
  const [metrics, setMetrics] = useState<RiskMetrics>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelId) {
      setMetrics(EMPTY);
      setReady(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const body = await riskMetricsService.getForModel(modelId, controller.signal);
        if (cancelled) return;
        if (!body.ready || !body.data) {
          setMetrics(EMPTY);
          setReady(false);
          return;
        }

        const d = body.data;
        const distribution = toPercentages(d.distribution, d.sample_count);
        const highRiskPixels = d.distribution.high + d.distribution.very_high;

        setMetrics({
          overallRiskLevel: mapLevel(d.level),
          overallRiskScore: d.overall_score * 5,
          affectedAreaKm2: d.affected_area_km2,
          affectedAreaHectares: d.affected_area_km2 * 100,
          totalAreaKm2: d.total_area_km2,
          affectedFraction: d.affected_fraction,
          highRiskZones: highRiskPixels,
          riskTrend: mapTrend(d.trend),
          previousScore:
            typeof d.previous_score === 'number' ? d.previous_score * 5 : null,
          sampleCount: d.sample_count,
          riskDistribution: distribution,
        });
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error('Failed to fetch risk metrics:', err);
        setError('Failed to load risk metrics');
        setMetrics(EMPTY);
        setReady(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMetrics();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [modelId]);

  return { metrics, isLoading, error, ready };
};
