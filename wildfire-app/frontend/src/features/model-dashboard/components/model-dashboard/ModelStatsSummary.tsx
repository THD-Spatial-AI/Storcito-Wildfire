import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { useTranslation } from "@/i18n";

interface ModelStatsSummaryProps {
	stats: ModelStats;
	className?: string;
}

// Compact inline stats strip (label + value pairs) shown in the table toolbar area.
export function ModelStatsSummary({ stats, className = "" }: ModelStatsSummaryProps) {
	const { t } = useTranslation();

	const inProgress = (stats.queue || 0) + (stats.running || 0);
	const isUnlimited = stats.is_unlimited ?? (stats.model_limit ?? 0) === 0;
	const isAtLimit = !isUnlimited && stats.total >= (stats.model_limit ?? 0);
	const limitText = isUnlimited ? t("dashboard.stats.unlimited") : `${stats.total}/${stats.model_limit}`;

	const items = [
		{ label: t("dashboard.stats.totalModels"), value: stats.total },
		{ label: t("dashboard.stats.inProgress"), value: inProgress },
		{ label: t("dashboard.stats.completed"), value: stats.completed },
	];

	return (
		<div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
			{items.map((s) => (
				<div key={s.label} className="flex flex-col items-center justify-center bg-card border border-border rounded px-2 py-1 shadow-sm">
					<span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
					<span className="text-sm font-bold tabular-nums text-foreground leading-none mt-0.5">{s.value}</span>
				</div>
			))}
			<div className="flex flex-col items-center justify-center bg-card border border-border rounded px-2 py-1 shadow-sm">
				<span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.stats.modelLimit")}</span>
				<span className={`text-sm font-bold tabular-nums leading-none mt-0.5 ${isAtLimit ? "text-destructive" : "text-foreground"}`}>{limitText}</span>
			</div>
		</div>
	);
}
