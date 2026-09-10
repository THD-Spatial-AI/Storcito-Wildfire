import ModelActionGroup, { type ActionConfig } from "@/components/shared/ModelActionGroup";
import { useTranslation } from "@/i18n";

interface ModelDashboardBulkActionsProps {
	selectedCount: number;
	actions: ActionConfig[];
}

export function ModelDashboardBulkActions({ selectedCount, actions }: ModelDashboardBulkActionsProps) {
	const { t } = useTranslation();

	if (selectedCount === 0) return null;

	return (
		<>
			<span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
			<div className="md-rise flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1.5 pr-1.5 shadow-sm">
			<span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-primary-foreground">
				{selectedCount}
			</span>
			<span className="hidden text-xs font-medium text-muted-foreground lg:inline">
				{t('model.selected')}
			</span>
			<span className="h-4 w-px bg-border" aria-hidden="true" />
			<ModelActionGroup
				actions={actions}
				layout="horizontal"
				size="small"
			/>
		</div>
		</>
	);
}
