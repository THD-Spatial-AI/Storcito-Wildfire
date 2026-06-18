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
		<div className="flex items-center gap-2 ml-2 pl-2 border-l-2 border-foreground/30">
			<span className="text-xs font-medium text-muted-foreground">{t('model.actions')}:</span>
			
			<div className="px-2 py-1 border border-border rounded-md bg-muted/50">
				<ModelActionGroup
					actions={actions}
					layout="horizontal"
					size="small"
				/>
			</div>
		</div>
	);
}
