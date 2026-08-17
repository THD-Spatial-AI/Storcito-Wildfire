import { FolderInput, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";

interface UserManagementBulkActionsProps {
	selectedCount: number;
	handleBulkMoveToGroup: () => void;
	handleBulkDelete: () => void | Promise<void>;
}

export function UserManagementBulkActions({ selectedCount, handleBulkMoveToGroup, handleBulkDelete }: UserManagementBulkActionsProps) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-2 ml-2 pl-2 border-l-2 border-foreground/30">
			<span className="text-xs font-medium text-muted-foreground">
				{t("userManagement.actions.selected", { count: selectedCount })}
			</span>
			<div className="flex items-center gap-1.5">
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={handleBulkMoveToGroup}
							className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer"
						>
							<FolderInput className="w-4 h-4" />
						</button>
					</TooltipTrigger>
					<TooltipContent>{t("userManagement.actions.bulkMoveToGroup")}</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={() => { void handleBulkDelete(); }}
							className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-destructive shadow-sm transition-colors duration-150 hover:bg-destructive/10 cursor-pointer"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					</TooltipTrigger>
					<TooltipContent>{t("userManagement.actions.bulkDelete")}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
