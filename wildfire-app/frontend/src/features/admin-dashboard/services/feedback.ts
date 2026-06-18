import axios from "@/lib/axios";
import type { FeedbackItem } from "@/features/admin-dashboard/components/feedback-management/types";

export interface FeedbackFilters {
  page?: number;
  per_page?: number;
  status?: string;
  category?: string;
  priority?: string;
}

export interface UpdateFeedbackData {
  status?: "pending" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "critical";
  admin_response?: string;
}

export interface FeedbackListPage {
  data: FeedbackItem[];
  total: number;
  page: number;
  per_page: number;
}

interface FeedbackListResponse {
  success: boolean;
  data: FeedbackListPage;
}

interface FeedbackResponse {
  success: boolean;
  data: FeedbackItem;
  message?: string;
}

class FeedbackService {
  async list(filters: FeedbackFilters = {}): Promise<FeedbackListPage> {
    const queryParams = new URLSearchParams();
    if (filters.page !== undefined) queryParams.append("page", String(filters.page + 1));
    if (filters.per_page) queryParams.append("per_page", String(filters.per_page));
    if (filters.status && filters.status !== "all") queryParams.append("status", filters.status);
    if (filters.category && filters.category !== "all")
      queryParams.append("category", filters.category);
    if (filters.priority && filters.priority !== "all")
      queryParams.append("priority", filters.priority);

    const { data } = await axios.get<FeedbackListResponse>(`/feedback?${queryParams.toString()}`);
    return data.data;
  }

  async update(id: number, updates: UpdateFeedbackData): Promise<FeedbackItem> {
    const { data } = await axios.put<FeedbackResponse>(`/feedback/${id}`, updates);
    return data.data;
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const { data } = await axios.delete<{ success: boolean; message: string }>(`/feedback/${id}`);
    return data;
  }
}

export const feedbackService = new FeedbackService();
