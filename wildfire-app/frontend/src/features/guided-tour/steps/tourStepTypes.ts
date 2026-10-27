import type { LucideIcon } from "lucide-react";
import type { Step } from "react-joyride";
import type { ModelStatus } from "@/types/models";
import type { StatusTab } from "@/features/model-dashboard/utils/statusHelpers";

export type TourSectionId =
	| "welcome"
	| "navigation"
	| "dashboard"
	| "tabs"
	| "rows"
	| "tools"
	| "finish"
	| "intro"
	| "setup"
	| "map"
	| "layers"
	| "review";

export type TourPreview =
	| { type: "tab"; tab: StatusTab }
	| { type: "status"; status: ModelStatus }
	| { type: "newBadge" };

export interface TourStepDef {
	id: string;
	section: TourSectionId;
	/** Extra chip suffix key. */
	chipKey?: string;
	target: string;
	icon: LucideIcon;
	/** Icon tile classes. */
	accent: string;
	titleKey: string;
	descriptionKey: string;
	tipKey?: string;
	tipTitleKey?: string;
	/** kbd hint, space separated. */
	shortcut?: string;
	preview?: TourPreview;
	placement?: Step["placement"];
	/** Used when target is absent. */
	fallbackTarget?: string;
	/** Page the step lives on. */
	route?: string;
	/** Wait for target. */
	waitForTarget?: boolean;
	/** In what's-new tour. */
	whatsNew?: boolean;
	/** Area-select panel step. */
	configuratorStep?: number | null;
	spotlightClicks?: boolean;
	disableScrolling?: boolean;
}

export interface TourSectionInfo {
	id: TourSectionId;
	labelKey: string;
	firstIndex: number;
}

const SECTION_LABEL_KEYS: Record<TourSectionId, string> = {
	welcome: "tour.product.ui.sections.welcome",
	navigation: "tour.product.ui.sections.navigation",
	dashboard: "tour.product.ui.sections.dashboard",
	tabs: "tour.product.ui.sections.tabs",
	rows: "tour.product.ui.sections.rows",
	tools: "tour.product.ui.sections.tools",
	finish: "tour.product.ui.sections.finish",
	intro: "tour.areaSelect.ui.sections.intro",
	setup: "tour.areaSelect.ui.sections.setup",
	map: "tour.areaSelect.ui.sections.map",
	layers: "tour.areaSelect.ui.sections.layers",
	review: "tour.areaSelect.ui.sections.review",
};

/** Section chip text. */
export const tourSectionChipKeys = (section: TourSectionId): string[] => {
	if (section === "tabs" || section === "rows") {
		return [SECTION_LABEL_KEYS.dashboard, SECTION_LABEL_KEYS[section]];
	}
	return [SECTION_LABEL_KEYS[section]];
};

export const buildTourSections = (defs: TourStepDef[]): TourSectionInfo[] => {
	const sections: TourSectionInfo[] = [];
	defs.forEach((def, index) => {
		if (!sections.some((s) => s.id === def.section)) {
			sections.push({ id: def.section, labelKey: SECTION_LABEL_KEYS[def.section], firstIndex: index });
		}
	});
	return sections;
};

export const buildTourSteps = (defs: TourStepDef[]): Step[] =>
	defs.map((def) => ({
		target: def.target,
		content: null,
		placement: def.placement ?? "bottom",
		disableBeacon: true,
		spotlightClicks: def.spotlightClicks,
		disableScrolling: def.disableScrolling,
		data: { def },
	}));

export const ACCENTS = {
	primary: "bg-primary/10 text-primary",
	neutral: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
	pinned: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	running: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	drafts: "bg-gray-500/15 text-gray-600 dark:text-gray-300",
	failed: "bg-red-500/15 text-red-600 dark:text-red-400",
} as const;
