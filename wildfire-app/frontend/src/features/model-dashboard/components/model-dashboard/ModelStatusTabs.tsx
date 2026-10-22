import { Pin } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { STATUS_TAB_ORDER, type StatusTab } from "@/features/model-dashboard/utils/statusHelpers";

interface ModelStatusTabsProps {
	stats: ModelStats;
	statsLoaded: boolean;
	pinnedCount: number;
	activeTab: StatusTab;
	onTabChange: (tab: StatusTab) => void;
}

const TAB_LABEL_KEYS: Record<StatusTab, string> = {
	all: "model.tabs.all",
	pinned: "model.tabs.pinned",
	running: "model.tabs.running",
	completed: "model.tabs.completed",
	drafts: "model.tabs.drafts",
	failed: "model.tabs.failed",
};

export function ModelStatusTabs({ stats, statsLoaded, pinnedCount, activeTab, onTabChange }: ModelStatusTabsProps) {
	const { t } = useTranslation();

	const counts: Record<StatusTab, number> = {
		all: stats.total,
		pinned: pinnedCount,
		running: (stats.queue || 0) + (stats.running || 0),
		completed: (stats.completed || 0) + (stats.published || 0),
		drafts: stats.draft || 0,
		failed: (stats.failed || 0) + (stats.cancelled || 0),
	};

	const isUnlimited = stats.is_unlimited ?? (stats.model_limit ?? 0) === 0;
	const isAtLimit = !isUnlimited && stats.total >= (stats.model_limit ?? 0);
	const limitText = isUnlimited ? t("dashboard.stats.unlimited") : `${stats.total}/${stats.model_limit}`;

	return (
		<div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border px-2 sm:px-3">
			{STATUS_TAB_ORDER.map((tab) => {
				const isActive = activeTab === tab;
				const isEmpty = statsLoaded && counts[tab] === 0;
				return (
					<button
						key={tab}
						type="button"
						onClick={() => onTabChange(tab)}
						aria-pressed={isActive}
						className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
							isActive
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
						} ${!isActive && isEmpty ? "opacity-50" : ""}`}
					>
						{tab === "pinned" && <Pin className="h-3.5 w-3.5" />}
						{t(TAB_LABEL_KEYS[tab])}
						{statsLoaded && (
							<span
								className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums leading-none ${
									isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
								}`}
							>
								{counts[tab]}
							</span>
						)}
					</button>
				);
			})}
			{statsLoaded && (
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
