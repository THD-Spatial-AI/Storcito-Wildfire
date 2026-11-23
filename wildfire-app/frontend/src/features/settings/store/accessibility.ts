import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RiskPalette = "default" | "colorblind";
export type MotionPreference = "system" | "reduce";

interface AccessibilityPreferences {
	highContrast: boolean;
	palette: RiskPalette;
	motion: MotionPreference;
	largeTargets: boolean;
}

interface AccessibilityStore extends AccessibilityPreferences {
	setPreference: <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => void;
}

/** accessibility options */
export const useAccessibilityStore = create<AccessibilityStore>()(
	persist(
		(set) => ({
			highContrast: false,
			palette: "default",
			motion: "system",
			largeTargets: false,
			setPreference: (key, value) => set((state) => ({ ...state, [key]: value })),
		}),
		{ name: "accessibility-preferences", version: 1 }
	)
);
