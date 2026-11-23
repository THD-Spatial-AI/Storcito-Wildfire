import { useAccessibilityStore, type RiskPalette } from "@/features/settings/store/accessibility";

// low to high
export const RISK_PALETTES: Record<RiskPalette, readonly [string, string, string, string, string]> = {
	default: ["#9ca3af", "#16a34a", "#eab308", "#f97316", "#dc2626"],
	// colour-blind safe hue
	colorblind: ["#bdbdbd", "#fed98e", "#fe9929", "#d95f0e", "#7f2704"],
};

/** level colour */
export const riskColor = (level: 1 | 2 | 3 | 4 | 5): string =>
	RISK_PALETTES[useAccessibilityStore.getState().palette][level - 1];

/** fallback unless colour-blind */
export const riskColorOr = (level: 1 | 2 | 3 | 4 | 5, fallback: string): string =>
	useAccessibilityStore.getState().palette === "colorblind" ? riskColor(level) : fallback;

/** geoserver style name */
export const riskStyle = (name: string): string =>
	useAccessibilityStore.getState().palette === "colorblind" ? `${name}_cb` : name;

/** css risk gradient */
export const riskGradient = (): string =>
	`linear-gradient(to right,${RISK_PALETTES[useAccessibilityStore.getState().palette].join(",")})`;
