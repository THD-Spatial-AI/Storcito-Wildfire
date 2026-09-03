import type { ReactNode } from "react";
import { DateRangePicker, Dialog, Group as FieldGroup, Popover, Button as Trigger } from "react-aria-components";
import { parseDate, type DateValue } from "@internationalized/date";
import { AlertCircle, BarChart3, CalendarRange, Copy, Edit, GitCompareArrows, Plus, RefreshCw, Search, Settings, Share2, Trash2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import Chip from "@/components/ui/Chip";
import { WorkspaceSelector } from "@/components/workspace";
import type { Workspace } from "@/components/workspace";
import { useTranslation } from "@/i18n";
import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { ModelStatsSummary } from "./ModelStatsSummary";
import type { Group } from "./types";

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
	statsLoaded?: boolean;
	handleNewModel: () => void;
	isModelLimitReached: boolean;
	table: ReactNode;
}

const TOOLBAR_BUTTON_CLASS =
	"inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50";
const TOOLBAR_ICON_BUTTON_CLASS =
	"inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

export function ModelDashboardFilters({
	groups, selectedGroup, setSelectedGroup, filterText, setFilterText, filterFromDate, filterToDate, onDateRangeChange, isLoadingWorkspace, handleWorkspaceChange, setIsCreateWsOpen, wsReloadKey, normalizedWorkspaceId, preferredWorkspaceId, currentWorkspace, handleRefresh, isRefreshing, isLoading, handleCompareSelected, canCompareSelected, canUseComparison, canManageWorkspace, setIsShareWsOpen, setIsCopyWsOpen, setIsRenameWsOpen, handleDeleteWorkspace, bulkActions, stats, statsLoaded = false, handleNewModel, isModelLimitReached, table,
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
			{/* Page header */}
			<div className="md-rise flex flex-wrap items-end justify-between gap-4">
				<div className="flex items-center gap-3.5">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/50">
						<BarChart3 className="h-4.5 w-4.5 text-foreground" />
					</div>
					<div>
						<h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
							{t('model.dashboard')}
						</h1>
						<p className="mt-0.5 text-sm text-muted-foreground">{t('model.manageConfigurations')}</p>
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

			{/* Groups Section */}
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

			{/* Main Content Card */}
			<div className="md-card md-rise" style={{ animationDelay: "60ms" }}>
				{/* Filter toolbar */}
				<div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
					{/* Search field */}
					<div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1 sm:max-w-sm">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							placeholder={t('model.searchModels')}
							value={filterText}
							onChange={(e) => setFilterText(e.target.value)}
							className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground transition-colors duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/40"
						/>
					</div>

					{/* Period filter. */}
					<DateRangePicker
						value={dateRangeValue}
						onChange={handleRangeChange}
						aria-label={t('model.filterPeriod', 'Filter by period')}
					>
						<FieldGroup className="flex items-center gap-1.5">
							<Trigger
								className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors duration-150 cursor-pointer ${
									hasDateFilter
										? "border-primary/40 bg-primary/5 text-foreground ring-1 ring-primary/20"
										: "border-input bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
								}`}
							>
								<CalendarRange className="h-4 w-4 shrink-0" />
								<span className="hidden sm:inline">
									{hasDateFilter
										? `${filterFromDate || "…"} – ${filterToDate || "…"}`
										: t('model.filterPeriod', 'Filter by period')}
								</span>
							</Trigger>
							{hasDateFilter && (
								<button
									type="button"
									onClick={() => onDateRangeChange("", "")}
									aria-label={t('model.clearDateFilter', 'Clear date filter')}
									title={t('model.clearDateFilter', 'Clear date filter')}
									className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
								>
									<X className="h-3.5 w-3.5" />
								</button>
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

					{/* Workspace Controls */}
					<div className="flex flex-wrap items-center gap-2">
						{isLoadingWorkspace ? (
							<div className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
								<RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
								<span className="font-medium text-muted-foreground">{t('model.loadingWorkspace')}</span>
							</div>
						) : (
							<>
								<Tooltip>
									<TooltipTrigger asChild>
										<div>
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

								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={handleRefresh}
											disabled={isRefreshing || isLoading}
											className={TOOLBAR_ICON_BUTTON_CLASS}
											aria-label={t('model.refreshModels')}
										>
											<RefreshCw className={`h-4 w-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
										</button>
									</TooltipTrigger>
									<TooltipContent>
										{t('model.refreshModels')}
									</TooltipContent>
								</Tooltip>
							</>
						)}

						{(canUseComparison || currentWorkspace) && (
							<span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
						)}

						{canUseComparison && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<button
											onClick={handleCompareSelected}
											disabled={!canCompareSelected}
											className={TOOLBAR_BUTTON_CLASS}
										>
											<GitCompareArrows className="h-4 w-4 text-muted-foreground" />
											<span className="hidden sm:inline">{t('model.compare')}</span>
										</button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>{canCompareSelected ? t('model.compare') : t('model.compareRequires2Completed')}</p>
								</TooltipContent>
							</Tooltip>
						)}

						{currentWorkspace && (
							<>
								{canManageWorkspace && (
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												onClick={() => setIsShareWsOpen(true)}
												className={TOOLBAR_BUTTON_CLASS}
											>
												<Share2 className="h-4 w-4 text-muted-foreground" />
												<span className="hidden sm:inline">{t('model.share')}</span>
											</button>
										</TooltipTrigger>
										<TooltipContent>
											{t('model.shareWorkspace')}
										</TooltipContent>
									</Tooltip>
								)}

								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={() => setIsCopyWsOpen(true)}
											className={TOOLBAR_BUTTON_CLASS}
										>
											<Copy className="h-4 w-4 text-muted-foreground" />
											<span className="hidden sm:inline">{t('model.copy')}</span>
										</button>
									</TooltipTrigger>
									<TooltipContent>
										{t('model.copyWorkspace')}
									</TooltipContent>
								</Tooltip>

								{!currentWorkspace.is_default && canManageWorkspace && (
									<>
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													onClick={() => setIsRenameWsOpen(true)}
													className={TOOLBAR_BUTTON_CLASS}
												>
													<Edit className="h-4 w-4 text-muted-foreground" />
													<span className="hidden sm:inline">{t('model.rename')}</span>
												</button>
											</TooltipTrigger>
											<TooltipContent>
												{t('model.renameWorkspace')}
											</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger asChild>
												<button
													onClick={handleDeleteWorkspace}
													className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 text-sm font-medium text-destructive transition-colors duration-150 hover:bg-destructive/10"
												>
													<Trash2 className="h-4 w-4" />
													<span className="hidden sm:inline">{t('model.delete')}</span>
												</button>
											</TooltipTrigger>
											<TooltipContent>
												{t('model.deleteWorkspace')}
											</TooltipContent>
										</Tooltip>
									</>
								)}
							</>
						)}

						{/* Bulk actions. */}
						{bulkActions}
					</div>

					{/* Stats summary. */}
					{statsLoaded && (
						<ModelStatsSummary stats={stats} className="max-sm:w-full sm:ml-auto" />
					)}
				</div>

				{/* Table */}
				<div className="border-t border-border">
					{table}
				</div>
			</div>
		</>
	);
}
