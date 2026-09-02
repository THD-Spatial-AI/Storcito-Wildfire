import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { useTranslation } from "@/i18n";

interface ModelStatsSummaryProps {
	stats: ModelStats;
	className?: string;
}

// Inline stats strip.
export function ModelStatsSummary({ stats, className = "" }: ModelStatsSummaryProps) {
	const { t } = useTranslation();

	const inProgress = (stats.queue || 0) + (stats.running || 0);
	const isUnlimited = stats.is_unlimited ?? (stats.model_limit ?? 0) === 0;
	const isAtLimit = !isUnlimited && stats.total >= (stats.model_limit ?? 0);
	const limitText = isUnlimited ? t("dashboard.stats.unlimited") : `${stats.total}/${stats.model_limit}`;

	const items = [
		{ label: t("dashboard.stats.totalModels"), value: stats.total, highlight: false },
		{ label: t("dashboard.stats.inProgress"), value: inProgress, highlight: false },
		{ label: t("dashboard.stats.completed"), value: stats.completed, highlight: false },
		{ label: t("dashboard.stats.modelLimit"), value: limitText, highlight: isAtLimit },
	];

	return (
		<div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
			{items.map((s) => (
				<div
					key={s.label}
					className={`flex h-9 items-center gap-2 rounded-lg border px-3 transition-colors duration-150 ${
						s.highlight
							? "border-destructive/40 bg-destructive/5"
							: "border-border/60 bg-muted/40"
					}`}
				>
					<span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
						{s.label}
					</span>
					<span
						className={`text-sm font-semibold tabular-nums leading-none ${
							s.highlight ? "text-destructive" : "text-foreground"
						}`}
					>
						{s.value}
					</span>
				</div>
			))}
		</div>
	);
}
