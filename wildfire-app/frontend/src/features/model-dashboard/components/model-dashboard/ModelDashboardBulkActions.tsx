import { X } from "lucide-react";
import ModelActionGroup, { type ActionConfig } from "@/components/shared/ModelActionGroup";
import { useTranslation } from "@/i18n";

interface ModelDashboardBulkActionsProps {
	selectedCount: number;
	actions: ActionConfig[];
	onClear: () => void;
}

/** bar above table */
export function ModelDashboardBulkActions({ selectedCount, actions, onClear }: ModelDashboardBulkActionsProps) {
	const { t } = useTranslation();

	if (selectedCount === 0) return null;

	return (
		<div
			role="region"
			aria-label={t("model.selectionActions", "Selection actions")}
			className="md-rise flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 sm:px-5"
		>
			<span className="text-sm font-medium tabular-nums text-foreground">
				{t("model.selectedCount", { count: selectedCount, defaultValue: "{{count}} selected" })}
			</span>
			<span className="h-4 w-px bg-border" aria-hidden="true" />
			<ModelActionGroup actions={actions} layout="horizontal" size="small" />
			<button
				type="button"
				onClick={onClear}
				className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<X className="h-3.5 w-3.5" />
				{t("model.clearSelection", "Clear")}
			</button>
		</div>
	);
}
