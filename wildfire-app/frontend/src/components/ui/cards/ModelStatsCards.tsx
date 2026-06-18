import React from 'react';
import { useTranslation } from '@/i18n';

interface ModelStats {
	total: number;
	draft: number;
	queue?: number;
	running?: number;
	completed: number;
	published?: number;
	model_limit?: number;
	remaining?: number;
	is_unlimited?: boolean;
}

interface ModelStatsCardsProps {
	stats: ModelStats;
	className?: string;
	variant?: "default" | "compact";
}

const ModelStatsCards: React.FC<ModelStatsCardsProps> = ({
	stats,
	className = "",
	variant = "default",
}) => {
	const { t } = useTranslation();
	const inProgress = (stats.queue || 0) + (stats.running || 0);
	const isCompact = variant === "compact";

	// Limit display
	const modelLimit = stats.model_limit ?? 0;
	const isUnlimited = stats.is_unlimited ?? modelLimit === 0;
	const usagePercent = isUnlimited ? 0 : Math.min((stats.total / modelLimit) * 100, 100);
	const isNearLimit = !isUnlimited && usagePercent >= 80;
	const isAtLimit = !isUnlimited && stats.total >= modelLimit;
	const limitColor = isAtLimit ? 'text-destructive' : isNearLimit ? 'text-warning' : 'text-foreground';

	return (
		<div className={`flex items-center gap-6 ${isCompact ? 'mb-2' : 'mb-3'} ${className}`}>
			<div className="flex items-baseline gap-1.5">
				<span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('dashboard.stats.totalModels')}</span>
				<span className="text-base font-bold text-slate-900 dark:text-white">{stats.total}</span>
			</div>
			<div className="flex items-baseline gap-1.5">
				<span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('dashboard.stats.inProgress')}</span>
				<span className="text-base font-bold text-slate-900 dark:text-white">{inProgress}</span>
			</div>
			<div className="flex items-baseline gap-1.5">
				<span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('dashboard.stats.completed')}</span>
				<span className="text-base font-bold text-slate-900 dark:text-white">{stats.completed}</span>
			</div>
			<div className="flex items-baseline gap-1.5">
				<span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('dashboard.stats.modelLimit')}</span>
				<span className={`text-base font-bold ${limitColor}`}>
					{isUnlimited ? t('dashboard.stats.unlimited') : `${stats.total}/${modelLimit}`}
				</span>
			</div>
		</div>
	);
};

export default ModelStatsCards;
