import { Pin } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { STATUS_TAB_ORDER, TAB_LABEL_FALLBACK, TAB_LABEL_KEYS, type StatusTab } from "@/features/model-dashboard/utils/statusHelpers";

interface ModelStatusTabsProps {
	stats: ModelStats;
	/** per-tab counts list */
	tabCounts?: Record<string, number>;
	statsLoaded: boolean;
	pinnedCount: number;
	activeTab: StatusTab;
	onTabChange: (tab: StatusTab) => void;
	/** tabs to show */
	tabs?: StatusTab[];
	/** model limit note */
	showLimit?: boolean;
}



export function ModelStatusTabs({
	stats, tabCounts, statsLoaded, pinnedCount, activeTab, onTabChange, tabs = STATUS_TAB_ORDER, showLimit = true,
}: ModelStatusTabsProps) {
	const { t } = useTranslation();

	// fallback tab counts
	const fallback: Record<StatusTab, number> = {
		all: stats.total,
		pinned: pinnedCount,
		running: (stats.queue || 0) + (stats.running || 0),
		completed: (stats.completed || 0) + (stats.published || 0),
		drafts: stats.draft || 0,
		failed: (stats.failed || 0) + (stats.cancelled || 0),
		queue: stats.queue || 0,
		in_progress: stats.running || 0,
		completed_only: stats.completed || 0,
		published: stats.published || 0,
	};
	const countOf = (tab: StatusTab) => tabCounts?.[tab] ?? fallback[tab];

	const isUnlimited = stats.is_unlimited ?? (stats.model_limit ?? 0) === 0;
	const isAtLimit = !isUnlimited && stats.total >= (stats.model_limit ?? 0);
	const limitText = `${stats.total}/${stats.model_limit}`;

	return (
		// labelled filter buttons
		<div
			data-tour="status-tabs"
			role="group"
			aria-label={t("model.statusFilter", "Filter by status")}
			className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border px-2 sm:px-3"
		>
			{tabs.map((tab) => {
				const isActive = activeTab === tab;
				const isEmpty = statsLoaded && countOf(tab) === 0;
				return (
					<button
						key={tab}
						type="button"
						data-tour={`tab-${tab}`}
						onClick={() => onTabChange(tab)}
						aria-pressed={isActive}
						className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
							isActive
								? "border-foreground font-semibold text-foreground"
								: "border-transparent text-foreground/60 hover:border-border hover:text-foreground"
						} rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${!isActive && isEmpty ? "opacity-50" : ""}`}
					>
						{tab === "pinned" && <Pin className="h-3.5 w-3.5" />}
						{t(TAB_LABEL_KEYS[tab], TAB_LABEL_FALLBACK[tab] ?? "")}
						{statsLoaded && (
							<span
								className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums leading-none ${
									isActive ? "bg-foreground text-background" : "bg-muted text-foreground/60"
								}`}
							>
								{countOf(tab)}
							</span>
						)}
					</button>
				);
			})}
			{/* limit exists */}
			{showLimit && statsLoaded && !isUnlimited && (
				<span
					className={`ml-auto px-3 py-2.5 text-xs tabular-nums ${
						isAtLimit ? "font-medium text-destructive" : "text-muted-foreground"
					}`}
				>
					{t("dashboard.stats.modelLimit")}: {limitText}
				</span>
			)}
		</div>
	);
}
