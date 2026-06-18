import axios from '@/lib/axios';
import type { RiskLevel } from '@/features/model-results/hooks/useRiskMetrics';

export interface BackendDistribution {
    very_low: number;
    low: number;
    moderate: number;
    high: number;
    very_high: number;
}

export interface BackendRiskMetrics {
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

export interface RiskMetricsResponse {
    data: BackendRiskMetrics | null;
    ready: boolean;
}

class RiskMetricsService {
    async getForModel(modelId: number, signal?: AbortSignal): Promise<RiskMetricsResponse> {
        const { data } = await axios.get<RiskMetricsResponse>(`/models/${modelId}/risk-metrics`, { signal });
        return data;
    }
}

export const riskMetricsService = new RiskMetricsService();
