import type React from "react";
import type { useTranslation } from "@/i18n";

export interface FeedbackFormData {
  category: string;
  subject: string;
  message: string;
  rating: number;
  images: File[];
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
}

export type CategoryKey = "bug" | "feature" | "improvement" | "general";

export interface MyFeedbackItem {
  id: number;
  category: string;
  subject: string;
  status: "pending" | "in_progress" | "resolved" | "closed";
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Translate = ReturnType<typeof useTranslation>["t"];

export type StatusConfig = Record<string, { color: string; bgColor: string; icon: React.ReactNode }>;
