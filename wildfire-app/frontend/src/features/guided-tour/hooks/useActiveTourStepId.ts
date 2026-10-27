import { useTourStore } from "@/features/guided-tour/store/tour-store";
import { stepsForMode } from "@/features/guided-tour/steps/productTourSteps";

/** Active tour step id. */
export const useActiveTourStepId = (): string | null =>
	useTourStore((s) => {
		if (!s.showTour) return null;
		return stepsForMode(s.tourMode)[s.tourStep]?.id ?? null;
	});
