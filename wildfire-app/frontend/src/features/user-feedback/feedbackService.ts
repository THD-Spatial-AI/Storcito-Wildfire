import axios from "@/lib/axios";
import { config } from "@/configuration/app";
import { getCSRFToken } from "@/utils/csrf";
import type { FeedbackFormData, MyFeedbackItem } from "./types";

export interface PublicContactPayload {
	name: string;
	email: string;
	category: string;
	subject: string;
	message: string;
}

/** Guest contact form. */
export const submitPublicFeedback = async (payload: PublicContactPayload): Promise<void> => {
	const baseUrl = config.api.baseUrl || "/api";
	const fd = new FormData();
	fd.append("name", payload.name);
	fd.append("email", payload.email);
	fd.append("category", payload.category);
	fd.append("subject", payload.subject);
	fd.append("message", payload.message);
	const res = await fetch(`${baseUrl}/feedback/public`, {
		method: "POST",
		credentials: "include",
		headers: { "X-CSRF-Token": getCSRFToken() || "" },
		body: fd,
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data?.error || data?.message || "");
	}
};

interface FeedbackSubmitResponse {
  success: boolean;
  message?: string;
}

interface MyFeedbackResponse {
  data?: {
    data?: MyFeedbackItem[];
  };
}

const toMultipartPayload = (feedbackData: FeedbackFormData): FormData => {
  const formData = new FormData();
  formData.append("category", feedbackData.category);
  formData.append("subject", feedbackData.subject);
  formData.append("message", feedbackData.message);
  formData.append("rating", feedbackData.rating.toString());
  for (const image of feedbackData.images) {
    formData.append("images", image);
  }
  return formData;
};

class UserFeedbackService {
  async submit(feedbackData: FeedbackFormData): Promise<FeedbackSubmitResponse> {
    const { data } = await axios.post<FeedbackSubmitResponse>("/feedback", toMultipartPayload(feedbackData), {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  }

  async listMine(): Promise<MyFeedbackItem[]> {
    const { data } = await axios.get<MyFeedbackResponse>("/feedback/my?per_page=20");
    return data?.data?.data || [];
  }
}

export const userFeedbackService = new UserFeedbackService();
