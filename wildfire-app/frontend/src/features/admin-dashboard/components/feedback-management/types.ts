import type { FormDataConvertible } from "@/hooks/useForm";

export type FeedbackStatus = "pending" | "in_progress" | "resolved" | "closed";
export type FeedbackPriority = "low" | "medium" | "high" | "critical";

export interface FeedbackImage {
  path: string;
  mime_type: string;
  size: number;
}

export interface FeedbackItem {
  id: number;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  rating: number;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  image_path?: string | null;
  image_mime_type?: string | null;
  image_size?: number | null;
  images?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  user_name?: string;
  user_email?: string;
  responded_by_user?: {
    id: string;
    name: string;
  };
}

export interface FeedbackStatusCounts {
  pending: number;
  inProgress: number;
  resolved: number;
}

export type FeedbackEditForm = Record<string, FormDataConvertible> & {
  status: FeedbackStatus;
  priority: FeedbackPriority;
  admin_response: string;
};
