export type FeedbackType = "bug" | "feature" | "question" | "praise";

export interface PersonaData {
  name: string;
  role: string;
  organization: string;
  app_familiarity: "first_time" | "used_before" | "regular";
  years_experience: string;
  digital_comfort: "basic" | "comfortable" | "advanced" | "";
}

export type Language = "de" | "en" | "es" | "gl";

export interface FeedbackFormState {
  feedback_type: FeedbackType;
  rating: number;
  context_topic: string | null;
  what_happened: string | null;
  expected: string | null;
  desired: string | null;
  comment: string | null;
  x: number;
  y: number;
  screenshot_b64: string | null;
}

export interface FeedbackPayload {
  explicit: {
    feedback_type: FeedbackType;
    rating: number;
    context_topic: string | null;
    what_happened: string | null;
    expected: string | null;
    desired: string | null;
    comment: string | null;
  };
  implicit: {
    route: string;
    model_id: string | null;
    x: number;
    y: number;
    screenshot_b64: string | null;
  };
  workshop_tag: string;
  persona?: PersonaData | null;
}

export interface FeedbackOverlayProps {
  apiUrl: string;
  workshopToken: string;
  workshopTag: string;
  children: React.ReactNode;
  modelId?: string;
  defaultLang?: Language;
}

export interface PreviewResult {
  topic_options: string[];
}
