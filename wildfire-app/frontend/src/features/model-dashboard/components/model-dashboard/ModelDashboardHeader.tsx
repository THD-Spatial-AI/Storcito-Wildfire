import { BarChart3 } from "lucide-react";
import { useTranslation } from "@/i18n";

export function ModelDashboardHeader() {
	const { t } = useTranslation();

	return (
		<div className="relative bg-card py-4 border border-border rounded-lg px-5 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-muted rounded-lg">
					<BarChart3 className="w-5 h-5 text-muted-foreground" />
				</div>
				<div>
					<h1 className="text-xl font-semibold text-foreground">{t('model.dashboard')}</h1>
					<p className="text-xs text-muted-foreground">{t('model.manageConfigurations')}</p>
				</div>
			</div>
		</div>
	);
}
