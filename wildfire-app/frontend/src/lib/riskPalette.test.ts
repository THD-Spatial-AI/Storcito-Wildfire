import { afterEach, describe, expect, it } from "vitest";
import { useAccessibilityStore } from "@/features/settings/store/accessibility";
import { RISK_PALETTES, riskColor, riskColorOr, riskStyle } from "./riskPalette";

afterEach(() => useAccessibilityStore.getState().setPreference("palette", "default"));

describe("risk palette", () => {
	it("uses the standard colours by default", () => {
		expect(riskColor(5)).toBe(RISK_PALETTES.default[4]);
		expect(riskStyle("fire_risk_classified")).toBe("fire_risk_classified");
		expect(riskColorOr(1, "#2563eb")).toBe("#2563eb");
	});

	it("switches colours and map styles when colour-blind friendly", () => {
		useAccessibilityStore.getState().setPreference("palette", "colorblind");
		expect(riskColor(5)).toBe(RISK_PALETTES.colorblind[4]);
		expect(riskStyle("fire_risk_level_3")).toBe("fire_risk_level_3_cb");
		expect(riskColorOr(1, "#2563eb")).toBe(RISK_PALETTES.colorblind[0]);
	});
});
