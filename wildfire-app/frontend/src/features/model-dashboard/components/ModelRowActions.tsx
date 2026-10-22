import { Copy, Download, Edit, Eye, FolderInput, MoreHorizontal, Play, Share2, Trash2, type LucideIcon } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@spatialhub/ui";
import type { ModelStatus } from "@/types/models";
import { isModelDisabled, isModelCompleted } from "@/features/model-dashboard/utils/statusHelpers";
import { useTranslation } from "@/i18n";

interface ModelRowActionsProps<T extends { id: number; status: ModelStatus; user_id?: string }> {
	readonly model: T;
	readonly currentUserId?: string;
	readonly userAccessLevel?: string;
	readonly onView?: (model: T) => void;
	readonly onEdit?: (model: T) => void;
	readonly onDownload?: (model: T) => void;
	readonly onCopy?: (model: T) => void;
	readonly onCalculate?: (model: T) => void;
	readonly onDelete?: (model: T) => void;
	readonly onShare?: (model: T) => void;
	readonly onMoveToWorkspace?: (model: T) => void;
	readonly disableDelete?: boolean;
	readonly deleteTooltip?: string;
	readonly disableMoveToWorkspace?: boolean;
	readonly moveToWorkspaceTooltip?: string;
	readonly disableShare?: boolean;
	readonly shareTooltip?: string;
	readonly hasAvailableWebservice?: boolean;
}

interface MenuAction {
	key: string;
	icon: LucideIcon;
	label: string;
	onSelect: () => void;
	show: boolean;
	disabled?: boolean;
	disabledTooltip?: string;
	destructive?: boolean;
}

function ModelRowActions<T extends { id: number; status: ModelStatus; user_id?: string }>({
	model,
	currentUserId,
	userAccessLevel,
	onView,
	onEdit,
	onDownload,
	onCopy,
	onCalculate,
	onDelete,
	onShare,
	onMoveToWorkspace,
	disableDelete = false,
	deleteTooltip,
	disableMoveToWorkspace = false,
	moveToWorkspaceTooltip,
	disableShare = false,
	shareTooltip,
	hasAvailableWebservice = true,
}: ModelRowActionsProps<T>) {
	const { t } = useTranslation();
	const disabled = isModelDisabled(model.status);
	const completed = isModelCompleted(model.status);
	const canRun = model.status === "draft" || model.status === "modified" || model.status === "failed";

	const isOwner = currentUserId && String(model.user_id) === String(currentUserId);
	const canDelete = isOwner || userAccessLevel === "expert";
	const shouldDisableDelete = disableDelete || !canDelete;
	const deleteTooltipText = !canDelete
		? t("common.modelActions.cannotDelete")
		: deleteTooltip || t("common.modelActions.delete");

	const menuActions: MenuAction[] = [
		{
			key: "download",
			icon: Download,
			label: t("common.modelActions.downloadResults"),
			onSelect: () => onDownload?.(model),
			show: !!onDownload && completed,
		},
		{
			key: "copy",
			icon: Copy,
			label: t("common.modelActions.copyConfiguration"),
			onSelect: () => onCopy?.(model),
			show: !!onCopy,
		},
		{
			key: "edit",
			icon: Edit,
			label: t("common.modelActions.editConfiguration"),
			onSelect: () => onEdit?.(model),
			show: !!onEdit,
			disabled: disabled || completed,
			disabledTooltip: completed ? t("common.modelActions.cannotEditCompleted") : undefined,
		},
		{
			key: "moveToWorkspace",
			icon: FolderInput,
			label: t("common.modelActions.moveToWorkspace"),
			onSelect: () => onMoveToWorkspace?.(model),
			show: !!onMoveToWorkspace,
			disabled: disabled || !!disableMoveToWorkspace,
			disabledTooltip: disableMoveToWorkspace ? moveToWorkspaceTooltip : undefined,
		},
		{
			key: "share",
			icon: Share2,
			label: t("common.modelActions.shareModel"),
			onSelect: () => onShare?.(model),
			show: !!onShare,
			disabled: disabled || !!disableShare,
			disabledTooltip: disableShare ? shareTooltip : undefined,
		},
		{
			key: "delete",
			icon: Trash2,
			label: t("common.modelActions.delete"),
			onSelect: () => onDelete?.(model),
			show: !!onDelete,
			disabled: shouldDisableDelete,
			disabledTooltip: deleteTooltipText,
			destructive: true,
		},
	];

	const runDisabled = !hasAvailableWebservice;
	const primaryAction = completed
		? { label: t("model.view"), icon: Eye, onClick: () => onView?.(model), disabled: false, tooltip: undefined as string | undefined, primary: true }
		: canRun
			? {
				label: t("model.run"),
				icon: Play,
				onClick: () => onCalculate?.(model),
				disabled: runDisabled,
				tooltip: runDisabled ? t("common.modelActions.engineNotAvailable") : undefined,
				primary: false,
			}
			: null;

	return (
		<div className="flex items-center gap-1">
			{primaryAction && (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex">
							<button
								type="button"
								disabled={primaryAction.disabled}
								onClick={(e) => {
									e.stopPropagation();
									primaryAction.onClick();
								}}
								className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
									primaryAction.primary
										? "bg-primary text-primary-foreground hover:bg-primary/90"
										: "bg-emerald-600 text-white hover:bg-emerald-500"
								}`}
							>
								<primaryAction.icon className="h-3.5 w-3.5" />
								{primaryAction.label}
							</button>
						</span>
					</TooltipTrigger>
					{primaryAction.tooltip && <TooltipContent>{primaryAction.tooltip}</TooltipContent>}
				</Tooltip>
			)}

			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label={t("model.actions")}
								className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
							>
								<MoreHorizontal className="h-4 w-4" />
							</button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent>{t("model.actions")}</TooltipContent>
				</Tooltip>
				<DropdownMenuContent align="end">
					{menuActions.filter((action) => action.show).map((action) => {
						const item = (
							<DropdownMenuItem
								disabled={action.disabled}
								variant={action.destructive ? "destructive" : "default"}
								onSelect={action.onSelect}
								className={action.disabled ? "data-[disabled]:pointer-events-auto" : undefined}
							>
								<action.icon />
								{action.label}
							</DropdownMenuItem>
						);
						if (!action.disabled || !action.disabledTooltip) return <div key={action.key}>{item}</div>;
						return (
							<Tooltip key={action.key}>
								<TooltipTrigger asChild>{item}</TooltipTrigger>
								<TooltipContent side="left">{action.disabledTooltip}</TooltipContent>
							</Tooltip>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export default ModelRowActions;
