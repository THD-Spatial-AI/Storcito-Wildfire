import type { FeedbackFormState, FeedbackPayload, Language, PersonaData, PreviewResult } from "./types";

function buildSubmitPayload(
  form: FeedbackFormState,
  workshopTag: string,
  workshopToken: string,
  persona: PersonaData | null,
  modelId?: string
): { payload: FeedbackPayload; headers: Record<string, string> } {
  return {
    payload: {
      explicit: {
        feedback_type: form.feedback_type,
        rating: form.rating,
        context_topic: form.context_topic,
        what_happened: form.what_happened,
        expected: form.expected,
        desired: form.desired,
        comment: form.comment,
      },
      implicit: {
        route: window.location.pathname,
        model_id: modelId ?? null,
        x: form.x,
        y: form.y,
        screenshot_b64: form.screenshot_b64,
      },
      workshop_tag: workshopTag,
      persona: persona ?? null,
    },
    headers: {
      "Content-Type": "application/json",
      "X-Workshop-Token": workshopToken,
    },
  };
}

export async function previewFeedback(
  implicit: { x: number; y: number; screenshot_b64: string | null },
  language: Language,
  apiUrl: string,
  workshopToken: string,
  workshopTag: string,
  modelId?: string
): Promise<PreviewResult> {
  const body = {
    implicit: {
      route: window.location.pathname,
      model_id: modelId ?? null,
      x: implicit.x,
      y: implicit.y,
      screenshot_b64: implicit.screenshot_b64,
    },
    workshop_tag: workshopTag,
    language,
  };

  const response = await fetch(`${apiUrl}/api/v1/feedback/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Workshop-Token": workshopToken,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Preview failed: ${response.status}`);
  return response.json();
}

export async function submitFeedback(
  form: FeedbackFormState,
  apiUrl: string,
  workshopToken: string,
  workshopTag: string,
  modelId?: string,
  persona: PersonaData | null = null
): Promise<void> {
  const { payload, headers } = buildSubmitPayload(form, workshopTag, workshopToken, persona, modelId);

  const response = await fetch(`${apiUrl}/api/v1/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Submission failed: ${response.status}`);
}
