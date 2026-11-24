import axios from '@/lib/axios';
import type { RiskLevel } from '@/features/model-results/hooks/useRiskMetrics';

interface BackendDistribution {
    very_low: number;
    low: number;
    moderate: number;
    high: number;
    very_high: number;
}

interface BackendRiskMetrics {
    model_id: number;
    result_id: number;
    overall_score: number;
    level: RiskLevel | 'unknown';
    affected_area_km2: number;
    total_area_km2: number;
    affected_fraction: number;
    distribution: BackendDistribution;
    sample_count: number;
    trend: 'improving' | 'stable' | 'worsening' | 'unknown';
    previous_score?: number;
}

interface RiskMetricsResponse {
    data: BackendRiskMetrics | null;
    ready: boolean;
}

const CACHE_TTL_MS = 60_000;

class RiskMetricsService {
    // shared short-lived dashboard
    private cache = new Map<string, { at: number; request: Promise<RiskMetricsResponse> }>();

    getForModel(modelId: number, version?: number): Promise<RiskMetricsResponse> {
        const key = `${modelId}:${version ?? ''}`;
        const hit = this.cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.request;

        const request = axios
            .get<RiskMetricsResponse>(`/models/${modelId}/risk-metrics`)
            .then(({ data }) => {
                // not ready yet
                if (!data?.ready) this.cache.delete(key);
                return data;
            })
            .catch((err: unknown) => {
                this.cache.delete(key);
                throw err;
            });
        this.cache.set(key, { at: Date.now(), request });
        return request;
    }
}

export const riskMetricsService = new RiskMetricsService();
