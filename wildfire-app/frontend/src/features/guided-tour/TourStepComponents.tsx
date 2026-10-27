import React, { useEffect, useRef } from "react";
import type { TooltipRenderProps } from "react-joyride";
import { Info, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useTranslation } from "@/i18n";
import type { StatusTab } from "@/features/model-dashboard/utils/statusHelpers";
import { tourSectionChipKeys, type TourStepDef } from "./steps/tourStepTypes";

export interface TourSectionLink {
	id: string;
	label: string;
	firstIndex: number;
}

interface TourTooltipProps extends TooltipRenderProps {
	sections: TourSectionLink[];
	whatsNew?: boolean;
	onGoToStep: (index: number) => void;
}

const TAB_LABEL_KEYS: Record<StatusTab, string> = {
	all: "model.tabs.all",
	pinned: "model.tabs.pinned",
	running: "model.tabs.running",
	completed: "model.tabs.completed",
	drafts: "model.tabs.drafts",
	failed: "model.tabs.failed",
};

const TAB_DOT_CLASS: Record<StatusTab, string> = {
	all: "bg-slate-400",
	pinned: "bg-amber-500",
	running: "bg-blue-500",
	completed: "bg-emerald-500",
	drafts: "bg-gray-400",
	failed: "bg-red-500",
};

const TourPreviewChip: React.FC<{ def: TourStepDef }> = ({ def }) => {
	const { t } = useTranslation();
	const preview = def.preview;
	if (!preview) return null;

	if (preview.type === "tab") {
		return (
			<span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
				<span className={`h-1.5 w-1.5 rounded-full ${TAB_DOT_CLASS[preview.tab]}`} />
				{t(TAB_LABEL_KEYS[preview.tab])}
			</span>
		);
	}

	if (preview.type === "status") {
		return <StatusBadge status={preview.status} size="small" />;
	}

	return (
		<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
			<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
			{t("model.recentlyCompleted", "New")}
		</span>
	);
};

export const TourTooltip: React.FC<TourTooltipProps> = ({
	index,
	size,
	isLastStep,
	step,
	backProps,
	closeProps,
	primaryProps,
	skipProps,
	tooltipProps,
	sections,
	whatsNew = false,
	onGoToStep,
}) => {
	const { t } = useTranslation();
	const cardRef = useRef<HTMLDivElement>(null);
	const def = step.data?.def as TourStepDef | undefined;

	useEffect(() => {
		cardRef.current?.focus({ preventScroll: true });
	}, [index]);

	if (!def) return null;
	const Icon = def.icon;
	const chipText = tourSectionChipKeys(def.section)
		.map((key) => t(key))
		.concat(def.chipKey ? [t(def.chipKey)] : [])
		.join(" · ");

	return (
		<div
			{...tooltipProps}
			ref={(el) => {
				cardRef.current = el;
				tooltipProps.ref?.(el);
			}}
			tabIndex={-1}
			className="tour-tooltip-card relative w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl focus:outline-2 focus:outline-ring focus:outline-offset-2"
		>
			<div key={index} className="tour-step-body space-y-3 p-4 sm:p-5">
				<div className="flex items-start gap-3">
					<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${def.accent}`}>
						<Icon className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
								{chipText}
							</span>
							{whatsNew && (
								<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
									{t("tour.product.ui.whatsNew")}
								</span>
							)}
						</div>
						<h3 className="mt-1 text-base font-semibold text-foreground">{t(def.titleKey)}</h3>
					</div>
					<button
						{...closeProps}
						className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<p className="text-sm leading-relaxed text-muted-foreground">{t(def.descriptionKey)}</p>

				{def.preview && <TourPreviewChip def={def} />}

				{def.tipKey && (
					<div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-2.5 text-xs">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
						<span>
							{def.tipTitleKey && (
								<span className="block font-medium text-foreground">{t(def.tipTitleKey)}</span>
							)}
							<span className="text-muted-foreground">{t(def.tipKey)}</span>
						</span>
					</div>
				)}

				{def.shortcut && (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						{def.shortcut.split(" ").map((key) => (
							<kbd
								key={key}
								className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
							>
								{key}
							</kbd>
						))}
					</div>
				)}

				<div className="flex items-center justify-between pt-1">
					<span className="text-xs tabular-nums text-muted-foreground">
						{t("tour.product.ui.stepOf", { current: index + 1, total: size })}
					</span>
					<div className="flex items-center gap-1.5">
						{sections.map((section) => (
							<button
								key={section.id}
								type="button"
								aria-label={section.label}
								title={section.label}
								onClick={() => onGoToStep(section.firstIndex)}
								className={`h-2 w-2 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
									section.id === def.section
										? "bg-primary"
										: "bg-muted-foreground/30 hover:bg-muted-foreground/60"
								}`}
							/>
						))}
					</div>
				</div>

				<div className="flex items-center justify-between gap-2 border-t border-border pt-3">
					{!isLastStep ? (
						<button
							{...skipProps}
							className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
						>
							{t("tour.product.ui.skipTour")}
						</button>
					) : (
						<span />
					)}
					<div className="flex items-center gap-2">
						{index > 0 && (
							<button
								{...backProps}
								className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
							>
								{t("tour.buttons.back")}
							</button>
						)}
						<button
							{...primaryProps}
							className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring"
						>
							{isLastStep ? t("tour.product.ui.finish") : t("tour.buttons.next")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

interface TourTooltipExtras {
	sections: TourSectionLink[];
	whatsNew: boolean;
	onGoToStep: (index: number) => void;
}

export const TourTooltipExtrasContext = React.createContext<TourTooltipExtras>({
	sections: [],
	whatsNew: false,
	onGoToStep: () => {},
});

/** Stable tooltip component. */
export const TourTooltipWithExtras: React.FC<TooltipRenderProps> = (props) => {
	const extras = React.useContext(TourTooltipExtrasContext);
	return <TourTooltip {...props} {...extras} />;
};
