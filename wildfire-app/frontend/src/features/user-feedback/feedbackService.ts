import axios from "@/lib/axios";
import type { FeedbackFormData, MyFeedbackItem } from "./types";

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
