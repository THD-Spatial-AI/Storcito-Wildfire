import type { ReactNode } from "react";
import { DateRangePicker, Dialog, Group as FieldGroup, Popover, Button as Trigger } from "react-aria-components";
import { parseDate, type DateValue } from "@internationalized/date";
import { AlertCircle, Copy, Edit, Filter, FolderCog, GitCompareArrows, Plus, RefreshCw, Settings, Share2, Trash2, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@spatialhub/ui";
import Chip from "@/components/ui/Chip";
import { WorkspaceSelector } from "@/components/workspace";
import type { Workspace } from "@/components/workspace";
import { useTranslation } from "@/i18n";
import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import type { Group } from "./types";
import { RefreshButton, SearchInput, TOOLBAR_BUTTON_CLASS, TOOLBAR_ICON_BUTTON_CLASS } from "./ToolbarControls";

interface ModelDashboardFiltersProps {
	groups: Group[];
	selectedGroup: Group | null;
	setSelectedGroup: (group: Group | null) => void;
	filterText: string;
	setFilterText: (value: string) => void;
	filterFromDate: string;
	filterToDate: string;
	onDateRangeChange: (from: string, to: string) => void;
	isLoadingWorkspace: boolean;
	handleWorkspaceChange: (workspace: Workspace | null) => void;
	setIsCreateWsOpen: (open: boolean) => void;
	wsReloadKey: number;
	normalizedWorkspaceId?: number;
	preferredWorkspaceId?: number | null;
	currentWorkspace: Workspace | null;
	handleRefresh: () => void | Promise<void>;
	isRefreshing: boolean;
	isLoading: boolean;
	handleCompareSelected: () => void;
	canCompareSelected: boolean;
	canUseComparison: boolean;
	canManageWorkspace: boolean;
	setIsShareWsOpen: (open: boolean) => void;
	setIsCopyWsOpen: (open: boolean) => void;
	setIsRenameWsOpen: (open: boolean) => void;
	handleDeleteWorkspace: () => void | Promise<void>;
	bulkActions?: ReactNode;
	stats: ModelStats;
	handleNewModel: () => void;
	isModelLimitReached: boolean;
	tabs?: ReactNode;
	table: ReactNode;
}

export function ModelDashboardFilters({
	groups, selectedGroup, setSelectedGroup, filterText, setFilterText, filterFromDate, filterToDate, onDateRangeChange, isLoadingWorkspace, handleWorkspaceChange, setIsCreateWsOpen, wsReloadKey, normalizedWorkspaceId, preferredWorkspaceId, currentWorkspace, handleRefresh, isRefreshing, isLoading, handleCompareSelected, canCompareSelected, canUseComparison, canManageWorkspace, setIsShareWsOpen, setIsCopyWsOpen, setIsRenameWsOpen, handleDeleteWorkspace, bulkActions, stats, handleNewModel, isModelLimitReached, tabs, table,
}: ModelDashboardFiltersProps) {
	const { t } = useTranslation();

	const hasDateFilter = Boolean(filterFromDate || filterToDate);
	const dateRangeValue =
		filterFromDate && filterToDate
			? { start: parseDate(filterFromDate), end: parseDate(filterToDate) }
			: null;
	const handleRangeChange = (
		range: { start: DateValue; end: DateValue } | null,
	) => {
		if (!range) return;
		onDateRangeChange(range.start.toString(), range.end.toString());
	};

	return (
		<>
			{/* page header */}
			<div className="md-rise flex flex-wrap items-end justify-between gap-4">
				<div className="flex items-center gap-4">
					{/* brand top bar */}
					<img
						src="/images/logo/Logo_Storcito_Web_Imagotipo_Oscuro-1024x230.png"
						alt="Storcito"
						// expanded nav shows
						className="h-8 w-auto object-contain dark:invert group-data-[nav=expanded]/app:hidden [@media(pointer:coarse)]:h-5"
					/>
					<span aria-hidden className="hidden h-9 w-px bg-border sm:block group-data-[nav=expanded]/app:!hidden" />
					<div>
						<h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl [@media(pointer:coarse)]:!text-base">
							{t('model.dashboard')}
						</h1>
						<p className="mt-0.5 text-sm text-muted-foreground [@media(pointer:coarse)]:!text-xs">{t('model.manageConfigurations')}</p>
					</div>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<button
								onClick={handleNewModel}
								disabled={isModelLimitReached}
								data-tour="new-assessment"
								className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-200 ${
									isModelLimitReached
										? 'cursor-not-allowed bg-muted text-muted-foreground'
										: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]'
								}`}
							>
								{isModelLimitReached ? <AlertCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
								{t('model.newModel')}
							</button>
						</span>
					</TooltipTrigger>
					{isModelLimitReached && (
						<TooltipContent>
							{t('model.limitReached', { current: stats.total, limit: stats.model_limit })}
						</TooltipContent>
					)}
				</Tooltip>
			</div>

			{/* groups section */}
			{groups.length > 0 && (
				<div className="md-card md-rise px-4 py-3.5">
					<div className="mb-2.5 flex items-center gap-2">
						<Settings className="h-3.5 w-3.5 text-muted-foreground" />
						<h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('model.modelGroups')}</h3>
					</div>
					<div className="flex flex-wrap gap-1.5">
						<Chip
							label={t('model.allModels')}
							color={selectedGroup ? "default" : "primary"}
							variant={selectedGroup ? "outlined" : "filled"}
							onClick={() => setSelectedGroup(null)}
							size="small"
						/>
						{groups.map((group) => (
							<Chip
								key={group.id}
								label={`${group.name} (${group.ids.length})`}
								color={selectedGroup?.id === group.id ? "primary" : "default"}
								variant={selectedGroup?.id === group.id ? "filled" : "outlined"}
								onClick={() => setSelectedGroup(group)}
								size="small"
							/>
						))}
					</div>
				</div>
			)}

			{/* main content card */}
			<div className="md-card md-rise" style={{ animationDelay: "60ms" }}>
				{/* filter toolbar */}
				<div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
					{/* search and period */}
					<div data-tour="model-search" className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[264px] sm:flex-1 sm:max-w-[26.75rem]">
						<SearchInput value={filterText} onChange={setFilterText} placeholder={t('model.searchModels')} />

						{/* period filter */}
						<DateRangePicker
							value={dateRangeValue}
							onChange={handleRangeChange}
							aria-label={t('model.filterPeriod', 'Filter by period')}
						>
							<FieldGroup className="flex items-center gap-1.5">
								<Tooltip>
									<TooltipTrigger asChild>
										<Trigger
											aria-label={t('model.filterPeriod', 'Filter by period')}
											className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-150 cursor-pointer ${
												hasDateFilter
													? "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20"
													: "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
											}`}
										>
											<Filter className="h-4 w-4" />
										</Trigger>
									</TooltipTrigger>
									<TooltipContent>
										{hasDateFilter
											? `${filterFromDate || "…"} – ${filterToDate || "…"}`
											: t('model.filterPeriod', 'Filter by period')}
									</TooltipContent>
								</Tooltip>
								{hasDateFilter && (
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												onClick={() => onDateRangeChange("", "")}
												aria-label={t('model.clearDateFilter', 'Clear date filter')}
												className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
											>
												<X className="h-3.5 w-3.5" />
											</button>
										</TooltipTrigger>
										<TooltipContent>{t('model.clearDateFilter', 'Clear date filter')}</TooltipContent>
									</Tooltip>
								)}
							</FieldGroup>
							<Popover
								className="bg-popover z-50 rounded-md border border-border shadow-lg outline-hidden"
								offset={4}
							>
								<Dialog className="max-h-[inherit] overflow-auto p-2">
									<RangeCalendar onChange={handleRangeChange} />
								</Dialog>
							</Popover>
						</DateRangePicker>
					</div>

					{/* workspace controls */}
					<div className="flex flex-wrap items-center gap-2">
						{isLoadingWorkspace ? (
							<div className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
								<RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
								<span className="font-medium text-muted-foreground">{t('model.loadingWorkspace')}</span>
							</div>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<div data-tour="workspace">
										<WorkspaceSelector
											onWorkspaceChange={handleWorkspaceChange}
											onCreateWorkspace={() => setIsCreateWsOpen(true)}
											reloadKey={wsReloadKey}
											initialWorkspaceId={normalizedWorkspaceId ?? preferredWorkspaceId ?? undefined}
											activeWorkspace={currentWorkspace}
										/>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									{t('model.selectWorkspace')}
								</TooltipContent>
							</Tooltip>
						)}

						<span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

						{/* model workspace actions */}
						<div data-tour="model-actions" className="flex flex-wrap items-center gap-2">
							{/* model refresh */}
							<RefreshButton
								dataTour="model-refresh"
								onClick={() => void handleRefresh()}
								spinning={isRefreshing || isLoading}
								label={t('model.refreshModels')}
							/>

							{canUseComparison && canCompareSelected && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											<button
												onClick={handleCompareSelected}
												className={TOOLBAR_BUTTON_CLASS}
											>
												<GitCompareArrows className="h-4 w-4 text-muted-foreground" />
												<span className="hidden sm:inline">{t('model.compare')}</span>
											</button>
										</span>
									</TooltipTrigger>
									<TooltipContent>
										<p>{t('model.compare')}</p>
									</TooltipContent>
								</Tooltip>
							)}

							{/* workspace actions out */}
							{currentWorkspace && (
								<DropdownMenu>
									<Tooltip>
										<TooltipTrigger asChild>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													data-tour="workspace-actions"
													aria-label={t('model.workspaceActions', 'Workspace actions')}
													className={TOOLBAR_ICON_BUTTON_CLASS}
												>
													<FolderCog className="h-4 w-4" />
												</button>
											</DropdownMenuTrigger>
										</TooltipTrigger>
										<TooltipContent>{t('model.workspaceActions', 'Workspace actions')}</TooltipContent>
									</Tooltip>
									<DropdownMenuContent align="start" className="w-52">
										{canManageWorkspace && (
											<DropdownMenuItem onSelect={() => setIsShareWsOpen(true)}>
												<Share2 />
												{t('model.workspaceMenu.share', 'Share workspace')}
											</DropdownMenuItem>
										)}
										<DropdownMenuItem onSelect={() => setIsCopyWsOpen(true)}>
											<Copy />
											{t('model.workspaceMenu.copy', 'Copy workspace')}
										</DropdownMenuItem>
										{!currentWorkspace.is_default && canManageWorkspace && (
											<>
												<DropdownMenuItem onSelect={() => setIsRenameWsOpen(true)}>
													<Edit />
													{t('model.workspaceMenu.rename', 'Rename workspace')}
												</DropdownMenuItem>
												<div role="separator" className="my-1 h-px bg-border" />
												<DropdownMenuItem variant="destructive" onSelect={() => void handleDeleteWorkspace()}>
													<Trash2 />
													{t('model.workspaceMenu.delete', 'Delete workspace')}
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					</div>
				</div>

				{/* status tabs */}
				{tabs}

				{/* selection bar rows */}
				{bulkActions}

				{/* table */}
				<div>
					{table}
				</div>
			</div>
		</>
	);
}
