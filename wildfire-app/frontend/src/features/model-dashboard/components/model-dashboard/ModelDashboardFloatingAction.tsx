import { AlertCircle, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";

interface ModelDashboardFloatingActionProps {
	isModelLimitReached: boolean;
	statsTotal: number | undefined;
	statsModelLimit: number | undefined;
	handleNewModel: () => void;
}

export function ModelDashboardFloatingAction({ isModelLimitReached, statsTotal, statsModelLimit, handleNewModel }: ModelDashboardFloatingActionProps) {
	const { t } = useTranslation();
	const stats = { total: statsTotal, model_limit: statsModelLimit };

	return (
		<>
				{/* Floating Action Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={handleNewModel}
							disabled={isModelLimitReached}
							className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-xl transition-all duration-200 flex items-center justify-center ${
								isModelLimitReached
									? 'bg-muted text-muted-foreground cursor-not-allowed'
									: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
							}`}
						>
							{isModelLimitReached ? (
								<AlertCircle className="w-6 h-6" />
							) : (
								<Plus className="w-6 h-6" />
							)}
						</button>
					</TooltipTrigger>
					<TooltipContent>
						{isModelLimitReached
							? t('model.limitReached', { current: stats.total, limit: stats.model_limit })
							: t('model.newModel')
						}
					</TooltipContent>
				</Tooltip>
		</>
	);
}
