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
	// view icon run
	const primaryAction = completed
		? { label: t("model.view"), icon: Eye, onClick: () => onView?.(model), disabled: false, tooltip: t("model.view") as string | undefined, iconOnly: true }
		: canRun
			? {
				label: t("model.run"),
				icon: Play,
				onClick: () => onCalculate?.(model),
				disabled: runDisabled,
				tooltip: runDisabled ? t("common.modelActions.engineNotAvailable") : undefined,
				iconOnly: false,
			}
			: null;

	return (
		<div className="flex items-center gap-1">
			{primaryAction && (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex" data-tour="model-primary-action">
							<button
								type="button"
								disabled={primaryAction.disabled}
								onClick={(e) => {
									e.stopPropagation();
									primaryAction.onClick();
								}}
								aria-label={primaryAction.label}
								className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
									primaryAction.iconOnly
										? "w-8 text-foreground/80 hover:bg-muted hover:text-foreground"
										: "border border-border bg-card px-2.5 hover:bg-muted"
								}`}
							>
								<primaryAction.icon className={primaryAction.iconOnly ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
								{!primaryAction.iconOnly && primaryAction.label}
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
								data-tour="model-row-menu"
								aria-label={t("model.actions")}
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<MoreHorizontal className="h-4 w-4" />
							</button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent>{t("model.actions")}</TooltipContent>
				</Tooltip>
				{/* look items unchanged */}
				<DropdownMenuContent align="end" className="min-w-[13rem] rounded-lg border-border/80 p-1 shadow-lg">
					{menuActions.filter((action) => action.show).map((action) => {
						const item = (
							<DropdownMenuItem
								disabled={action.disabled}
								variant={action.destructive ? "destructive" : "default"}
								onSelect={action.onSelect}
								className={`cursor-pointer gap-2.5 rounded-md px-2.5 py-2 transition-colors duration-150 motion-reduce:transition-none ${
									action.disabled ? "data-[disabled]:pointer-events-auto data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45" : ""
								}`}
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
