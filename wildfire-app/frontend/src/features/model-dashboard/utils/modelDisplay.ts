import type { Model } from "@/features/model-dashboard/services/modelService";

// old auto-names end
const DATE_SUFFIX = /\s*[·–-]\s*\d{4}-\d{2}-\d{2}(?:\s*[–-]\s*\d{4}-\d{2}-\d{2})?\s*$/;

/** name shown table */
export const displayTitle = (model: Pick<Model, "title">): string => {
  const title = model.title.trim();
  return title.replace(DATE_SUFFIX, "").trim() || title;
};
