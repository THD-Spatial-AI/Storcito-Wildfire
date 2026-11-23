import { useAccessibilityStore } from "@/features/settings/store/accessibility";

/** reduced motion wanted */
export const prefersReducedMotion = (): boolean =>
	useAccessibilityStore.getState().motion === "reduce" ||
	(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** zero when reduced */
export const motionMs = (ms: number): number => (prefersReducedMotion() ? 0 : ms);
