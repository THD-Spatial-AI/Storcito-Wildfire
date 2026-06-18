import axios from '@/lib/axios';
import type { Notification } from '@/features/notifications/hooks/useNotificationsQuery';

export interface NotificationsResponse {
    success: boolean;
    notifications: Notification[];
}

export interface NotificationActionResponse {
    success: boolean;
    message?: string;
}

class NotificationsService {
    async list(params?: { last30Days?: boolean }): Promise<NotificationsResponse> {
        const queryParams = params?.last30Days ? '?last30Days=true' : '';
        const { data } = await axios.get<NotificationsResponse>(`/notifications${queryParams}`);
        return data;
    }

    async markRead(id: number | string): Promise<NotificationActionResponse> {
        const { data } = await axios.patch<NotificationActionResponse>(`/notifications/${id}/read`);
        return data;
    }

    async markAllRead(): Promise<NotificationActionResponse> {
        const { data } = await axios.post<NotificationActionResponse>('/notifications/read-all');
        return data;
    }

    async clearAll(): Promise<NotificationActionResponse> {
        const { data } = await axios.delete<NotificationActionResponse>('/notifications/clear-all');
        return data;
    }
}

export const notificationsService = new NotificationsService();
