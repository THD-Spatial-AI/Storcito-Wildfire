import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  feedbackService,
  type FeedbackFilters,
  type UpdateFeedbackData,
} from "@/features/admin-dashboard/services/feedback";
import type { FeedbackItem } from "@/features/admin-dashboard/components/feedback-management/types";

export type { FeedbackFilters, UpdateFeedbackData, FeedbackItem };

// Query Keys
const feedbackKeys = {
  all: ["feedback"] as const,
  lists: () => [...feedbackKeys.all, "list"] as const,
  list: (filters: FeedbackFilters) => [...feedbackKeys.lists(), filters] as const,
  details: () => [...feedbackKeys.all, "detail"] as const,
  detail: (id: number) => [...feedbackKeys.details(), id] as const,
  user: () => [...feedbackKeys.all, "user"] as const,
};

// Hooks

/**
 * Fetch all feedback with filters (Admin)
 */
export const useFeedbackList = (filters: FeedbackFilters = {}) => {
  return useQuery({
    queryKey: feedbackKeys.list(filters),
    queryFn: async () => {
      return feedbackService.list(filters);
    },
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Update feedback (Admin)
 */
export const useUpdateFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateFeedbackData }) => {
      return feedbackService.update(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
};

/**
 * Delete feedback (Admin)
 */
export const useDeleteFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return feedbackService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
};
