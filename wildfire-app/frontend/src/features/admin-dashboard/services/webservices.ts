import axios from '@/lib/axios';
import type {
    WebserviceCreateData,
    WebserviceFilters,
    WebserviceInstance,
} from '@/features/admin-dashboard/types';

interface ApiResponse<T> {
    success: boolean;
    data: T;
}


export interface StorcitoCoverageFeatureCollection {
    type: 'FeatureCollection';
    bbox?: number[];
    features: Array<{
        type: 'Feature';
        properties?: Record<string, unknown>;
        geometry: Record<string, unknown> | null;
    }>;
}

export interface WebserviceSummary {
    total: number;
    online: number;
    available: number;
    busy: number;
    offline: number;
}

class WebservicesService {
    async getAvailableStaticDates(): Promise<string[]> {
        const { data } = await axios.get<ApiResponse<{ dates: string[] }>>('/webservices/available-static-dates');
        return data?.data?.dates ?? [];
    }

    async getAvailableDynamicDates(): Promise<string[]> {
        const { data } = await axios.get<ApiResponse<{ dates: string[] }>>('/webservices/available-dynamic-dates');
        return data?.data?.dates ?? [];
    }


    async getAvailableDataCoverage(): Promise<StorcitoCoverageFeatureCollection | null> {
        const { data } = await axios.get<ApiResponse<StorcitoCoverageFeatureCollection>>(
            '/webservices/available-data-coverage',
        );
        return data?.data ?? null;
    }

    async getAll(filters?: WebserviceFilters): Promise<WebserviceInstance[]> {
        const { data } = await axios.get<
            ApiResponse<{ items: WebserviceInstance[]; total: number; page: number; per_page: number }>
        >('/webservices', { params: filters });
        if (data?.success && data.data?.items) return data.data.items;
        return [];
    }

    async create(payload: WebserviceCreateData): Promise<WebserviceInstance> {
        const { data } = await axios.post<ApiResponse<WebserviceInstance>>('/webservices', payload);
        return data.data;
    }

    async update(id: number, payload: Partial<WebserviceInstance>): Promise<WebserviceInstance> {
        const { data } = await axios.put<ApiResponse<WebserviceInstance>>(`/webservices/${id}`, payload);
        return data.data;
    }

    async remove(id: number): Promise<void> {
        await axios.delete(`/webservices/${id}`);
    }

    async markAvailable(id: number): Promise<WebserviceInstance> {
        const { data } = await axios.post<ApiResponse<WebserviceInstance>>(`/webservices/${id}/available`);
        return data.data;
    }

    async markUnavailable(id: number): Promise<WebserviceInstance> {
        const { data } = await axios.post<ApiResponse<WebserviceInstance>>(`/webservices/${id}/unavailable`);
        return data.data;
    }

    async markBusy(id: number): Promise<WebserviceInstance> {
        const { data } = await axios.post<ApiResponse<WebserviceInstance>>(`/webservices/${id}/busy`);
        return data.data;
    }

    async markIdle(id: number): Promise<WebserviceInstance> {
        const { data } = await axios.post<ApiResponse<WebserviceInstance>>(`/webservices/${id}/idle`);
        return data.data;
    }

    async checkHealth(id: number): Promise<{ healthy: boolean }> {
        const { data } = await axios.get<ApiResponse<{ healthy: boolean }>>(`/webservices/${id}/health`);
        return data.data;
    }

    async ping(id: number): Promise<{ available: boolean; details: Record<string, unknown> | null }> {
        const { data } = await axios.get<
            ApiResponse<{ available: boolean; details: Record<string, unknown> | null }>
        >(`/webservices/${id}/ping`);
        return data.data;
    }

    async getSummary(): Promise<WebserviceSummary> {
        const { data } = await axios.get<ApiResponse<{ total: number; active: number; available: number }>>(
            '/webservices/summary',
        );
        if (data?.success && data.data && typeof data.data === 'object' && 'total' in data.data) {
            const total = data.data.total || 0;
            const active = data.data.active || 0;
            const available = data.data.available || 0;
            const busy = 0;
            const offline = total - active;
            return { total, online: active, available, busy, offline };
        }
        return { total: 0, online: 0, available: 0, busy: 0, offline: 0 };
    }
}

export const webservicesService = new WebservicesService();
