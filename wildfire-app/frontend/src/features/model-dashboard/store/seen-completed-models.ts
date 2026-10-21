import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Model } from "@/features/model-dashboard/services/modelService";

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

interface SeenCompletedModelsState {
  seen: Record<number, string>;
  markSeen: (model: Pick<Model, "id" | "calculation_completed_at">) => void;
}

export const useSeenCompletedModelsStore = create<SeenCompletedModelsState>()(
  persist(
    (set, get) => ({
      seen: {},
      markSeen: ({ id, calculation_completed_at }) => {
        if (!calculation_completed_at || get().seen[id] === calculation_completed_at) return;
        const cutoff = Date.now() - RECENT_WINDOW_MS;
        const kept = Object.fromEntries(
          Object.entries(get().seen).filter(([, at]) => new Date(at).getTime() >= cutoff)
        );
        set({ seen: { ...kept, [id]: calculation_completed_at } });
      },
    }),
    {
      name: "seen-completed-models-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const isRecentlyCompleted = (model: Model, seen: Record<number, string>): boolean => {
  const completedAt = model.calculation_completed_at;
  if (model.status !== "completed" || !completedAt) return false;
  const finished = new Date(completedAt).getTime();
  return (
    !Number.isNaN(finished) &&
    Date.now() - finished < RECENT_WINDOW_MS &&
    seen[model.id] !== completedAt
  );
};
