import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DisplayPreferences {
  textSize: "small" | "normal" | "large";
}

interface DataDisplayStore extends DisplayPreferences {
  setPreference: <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => void;
}

export const TEXT_SIZE_PX: Record<DisplayPreferences["textSize"], string> = {
  small: "14px",
  normal: "16px",
  large: "18px",
};

export const useDataDisplayStore = create<DataDisplayStore>()(
  persist(
    (set) => ({
      textSize: "normal",
      setPreference: (key, value) => set((state) => ({ ...state, [key]: value })),
    }),
    {
      name: "data-display-preferences",
      // drop old units
      version: 1,
      migrate: (stored) => {
        const size = (stored as Partial<DisplayPreferences> | undefined)?.textSize;
        return { textSize: size ?? "normal" } as DataDisplayStore;
      },
    }
  )
);
