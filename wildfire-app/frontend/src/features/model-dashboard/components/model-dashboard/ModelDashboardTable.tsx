import { Fragment, useCallback, useMemo, useState } from "react";
import { AlertCircle, ArrowUpDown, BarChart3, ChevronDown, ChevronUp, Plus, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import Pagination from "@/components/ui/Pagination";
import { ModelTableRow } from "../ModelTableRow";
import { TourDemoRow } from "../TourDemoRow";
import { useActiveTourStepId } from "@/features/guided-tour/hooks/useActiveTourStepId";
import {
	isRecentlyCompleted,
	useSeenCompletedModelsStore,
} from "@/features/model-dashboard/store/seen-completed-models";
import type { ModelFamily } from "@/features/model-dashboard/utils/dashboardHelpers";
import { useTranslation } from "@/i18n";
import { useModelDashboardActions } from "./ModelDashboardActionsContext";

interface ModelDashboardTableProps {
	isLoading: boolean;
	isLoadingWorkspace: boolean;
	families: ModelFamily[];
	totalItems: number;
	filterText: string;
}

// Dashboard steps needing a row.
const DEMO_ROW_STEPS = new Set([
	"tabsOverview", "tabAll", "tabPinned", "tabRunning", "tabCompleted", "tabDrafts", "tabFailed",
	"search", "refresh", "columns", "familyRow", "pin", "primaryAction", "moreMenu", "newBadge",
]);

interface SortHeaderButtonProps {
	field: string;
	label: string;
	orderBy: string;
	order: "asc" | "desc";
	onSort: (field: string) => void;
}

function SortHeaderButton({ field, label, orderBy, order, onSort }: SortHeaderButtonProps) {
	const isActive = orderBy === field;

	return (
		<button
			onClick={() => onSort(field)}
			className={`group/sort inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 ${
				isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
			}`}
		>
			{label}
			{isActive ? (
				<span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-foreground">
					{order === "asc" ? (
						<ChevronUp className="h-3 w-3" />
					) : (
						<ChevronDown className="h-3 w-3" />
					)}
				</span>
			) : (
				<ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity duration-150 group-hover/sort:opacity-50" />
			)}
		</button>
	);
}

interface EmptyModelsStateProps {
	filterText: string;
	isModelLimitReached: boolean;
	statsTotal: number;
	statsModelLimit?: number;
	onNewModel: () => void;
}

function EmptyModelsState({ filterText, isModelLimitReached, statsTotal, statsModelLimit, onNewModel }: EmptyModelsStateProps) {
	const { t } = useTranslation();
	return (
		<div data-tour="models-loaded" className="md-fade-in m-4 sm:m-5 flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/50">
				<BarChart3 className="h-7 w-7 text-muted-foreground" />
			</div>
			<h3 className="text-base font-semibold tracking-tight text-foreground">{t('model.noModelsFound')}</h3>
			<p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
				{filterText
					? t('model.noModelsMatch', { search: filterText })
					: t('model.noModelsYet')}
			</p>
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<button
							onClick={onNewModel}
							disabled={isModelLimitReached}
							className={`mt-6 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-200 ${
								isModelLimitReached
									? 'cursor-not-allowed bg-muted text-muted-foreground'
									: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]'
							}`}
						>
							{isModelLimitReached ? (
								<AlertCircle className="h-4 w-4" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							{t('model.createFirstModel')}
						</button>
					</span>
				</TooltipTrigger>
				{isModelLimitReached && (
					<TooltipContent>
						{t('model.limitReached', { current: statsTotal, limit: statsModelLimit })}
					</TooltipContent>
				)}
			</Tooltip>
		</div>
	);
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<div className="overflow-hidden rounded-xl border border-border">
			<div className="border-b border-border bg-muted/30 px-4 py-3">
				<div className="md-skeleton h-3 w-36 rounded-md bg-muted" />
			</div>
			<div className="divide-y divide-border/60">
				{Array.from({ length: rows }, (_, i) => (
					<div key={i} className="flex items-center gap-4 px-4 py-3.5">
						<div className="md-skeleton h-4 w-4 shrink-0 rounded bg-muted" />
						<div
							className="md-skeleton h-3.5 w-full max-w-[220px] rounded-md bg-muted"
							style={{ animationDelay: `${i * 90}ms` }}
						/>
						<div className="md-skeleton hidden h-5 w-20 shrink-0 rounded-full bg-muted sm:block" />
						<div className="md-skeleton hidden h-3.5 w-24 shrink-0 rounded-md bg-muted md:block" />
						<div className="md-skeleton ml-auto h-6 w-24 shrink-0 rounded-md bg-muted" />
					</div>
				))}
			</div>
		</div>
	);
}

export function ModelDashboardTable({
	isLoading, isLoadingWorkspace, families, totalItems, filterText,
}: ModelDashboardTableProps) {
	const { t } = useTranslation();
	const {
		selectedModels,
		handleSelectAll,
		handleSort,
		orderBy,
		order,
		currentPage,
		itemsPerPage,
		handlePageChange,
		handleItemsPerPageChange,
		handleNewModel,
		isModelLimitReached,
		statsTotal,
		statsModelLimit,
	} = useModelDashboardActions();
	const stats = { total: statsTotal, model_limit: statsModelLimit };

	const [expandedFamilies, setExpandedFamilies] = useState<ReadonlySet<number>>(new Set());
	const toggleVersions = useCallback((rootId: number) => {
		setExpandedFamilies((prev) => {
			const next = new Set(prev);
			if (next.has(rootId)) {
				next.delete(rootId);
			} else {
				next.add(rootId);
			}
			return next;
		});
	}, []);

	const visibleModels = useMemo(
		() => families.flatMap((family) => [
			family.display,
			...(expandedFamilies.has(family.root.id) ? family.otherVersions : []),
		]),
		[families, expandedFamilies]
	);
	const tourStepId = useActiveTourStepId();
	const seenCompleted = useSeenCompletedModelsStore((s) => s.seen);
	const hasRealNewBadge = families.some((family) => isRecentlyCompleted(family.display, seenCompleted));
	// Example row during tour.
	const showDemoRow =
		tourStepId !== null &&
		((families.length === 0 && DEMO_ROW_STEPS.has(tourStepId)) ||
			(tourStepId === "newBadge" && !hasRealNewBadge));

	const visibleIdSet = useMemo(() => new Set(visibleModels.map((m) => m.id)), [visibleModels]);
	const allVisibleSelected =
		visibleModels.length > 0 && selectedModels.filter((m) => visibleIdSet.has(m.id)).length === visibleModels.length;

	return (
		<>
			{/* Table Section */}
			{(isLoading || isLoadingWorkspace) ? (
				<div className="p-4 sm:px-5 sm:pb-5 space-y-3">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<RefreshCw className="h-4 w-4 animate-spin" />
						<span>
							{isLoadingWorkspace ? t('model.loadingWorkspace') : t('model.loadingModels')}
						</span>
					</div>
					<TableSkeleton />
					<p className="sr-only">
						{isLoadingWorkspace
							? t('model.loadingWorkspaceDescription')
							: t('model.loadingModelsDescription')}
					</p>
				</div>
			) : (
				<>
					{!isLoading && (families.length > 0 || showDemoRow) ? (
						<div data-tour="models-loaded" className="md-fade-in overflow-hidden">
							<div className="w-full overflow-auto">
								<table className="w-full table-auto">
									<thead>
										<tr data-tour="model-columns" className="border-b border-border bg-muted/30">
											<th className="w-12 px-4 py-3 text-center">
												<Tooltip>
													<TooltipTrigger asChild>
														<input
															type="checkbox"
															checked={allVisibleSelected}
															onChange={() => handleSelectAll(visibleModels)}
															className="h-4 w-4 cursor-pointer rounded border-input accent-primary focus:ring-ring focus:ring-offset-0"
														/>
													</TooltipTrigger>
													<TooltipContent>
														{selectedModels.length > 0 ? t('model.deselectAll') : t('model.selectAll')}
													</TooltipContent>
												</Tooltip>
											</th>
											<th className="w-[40%] px-4 py-3 text-left">
												<SortHeaderButton
													field="title"
													label={t('model.name')}
													orderBy={orderBy}
													order={order}
													onSort={handleSort}
												/>
											</th>
											<th className="w-[12%] px-4 py-3 text-left">
												<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
													{t('model.area')}
												</span>
											</th>
											<th className="hidden w-[14%] whitespace-nowrap px-4 py-3 text-left md:table-cell">
												<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
													{t('model.period')}
												</span>
											</th>
											<th className="w-px whitespace-nowrap px-4 py-3 text-left">
												<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
													{t('model.risk')}
												</span>
											</th>
											<th className="whitespace-nowrap px-4 py-3 text-left">
												<SortHeaderButton
													field="status"
													label={t('model.status')}
													orderBy={orderBy}
													order={order}
													onSort={handleSort}
												/>
											</th>
											<th className="hidden w-px whitespace-nowrap px-4 py-3 text-left md:table-cell">
												<SortHeaderButton
													field="last_activity"
													label={t('model.lastActivity')}
													orderBy={orderBy}
													order={order}
													onSort={handleSort}
												/>
											</th>
											<th className="w-px whitespace-nowrap px-4 py-3 text-left">
												<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
													{t('model.actions')}
												</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60 bg-card">
										{showDemoRow && <TourDemoRow />}
										{families.map((family) => {
											const expanded = expandedFamilies.has(family.root.id);
											const rootTitle = family.root.title.trim();
											return (
												<Fragment key={family.root.id}>
													<ModelTableRow
														model={family.display}
														level={0}
														parentModelTitle={family.display.is_copy ? family.display.parent_model_title || rootTitle : undefined}
														versionCount={family.versionCount}
														versionsExpanded={expanded}
														familyRootId={family.root.id}
														familyMemberIds={family.memberIds}
														onToggleVersions={toggleVersions}
													/>
													{expanded &&
														family.otherVersions.map((version, index) => (
															<ModelTableRow
																key={version.id}
																model={version}
																level={1}
																parentModelTitle={version.is_copy ? rootTitle : undefined}
																isLastVersion={index === family.otherVersions.length - 1}
															/>
														))}
												</Fragment>
											);
										})}
									</tbody>
								</table>
							</div>
							{families.length > 0 && (
								<Pagination
									currentPage={currentPage}
									totalItems={totalItems}
									itemsPerPage={itemsPerPage}
									onPageChange={handlePageChange}
									onItemsPerPageChange={handleItemsPerPageChange}
									pageSizeOptions={[25, 50, 100]}
									isLoading={isLoading}
								/>
							)}
						</div>
					) : (
						<EmptyModelsState
							filterText={filterText}
							isModelLimitReached={isModelLimitReached}
							statsTotal={stats.total ?? 0}
							statsModelLimit={stats.model_limit}
							onNewModel={handleNewModel}
						/>
					)}
				</>
			)}
		</>
	);
}
