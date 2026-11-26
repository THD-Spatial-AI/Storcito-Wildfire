import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useHorizontalOverflow } from "@/hooks/useHorizontalOverflow";
import { useModelDashboardActions } from "./ModelDashboardActionsContext";
import { useExpandedFamiliesStore } from "@/features/model-dashboard/store/expanded-families";
import { useRiskScores } from "@/features/model-dashboard/hooks/useRiskScores";
import type { StatusTab } from "@/features/model-dashboard/utils/statusHelpers";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

interface ModelDashboardTableProps {
	isLoading: boolean;
	isLoadingWorkspace: boolean;
	families: ModelFamily[];
	totalItems: number;
	filterText: string;
	/** load failed */
	isError?: boolean;
	onRetry?: () => void;
}

// dashboard steps needing
const DEMO_ROW_STEPS = new Set([
	"tabsOverview", "tabAll", "tabPinned", "tabRunning", "tabCompleted", "tabDrafts", "tabFailed",
	"search", "refresh", "columns", "familyRow", "pin", "primaryAction", "moreMenu", "newBadge",
]);

// newest activity across
const familyLatestActivity = (family: ModelFamily): string | undefined =>
	[family.display, ...family.otherVersions]
		.map((m) => m.calculation_completed_at ?? m.updated_at)
		.filter((v): v is string => Boolean(v))
		.sort()
		.at(-1);

// fixed widths
const USER_COLUMNS = ["w-12", "w-[250px] xl:w-[320px]", "w-[170px] xl:w-[220px]", "w-[125px] xl:w-[140px]", "w-[150px] xl:w-[180px]", "w-[170px] xl:w-[180px]", "w-[160px]", "w-20"];
// admin column widths
const ADMIN_COLUMNS = ["w-12", "w-[220px] xl:w-[270px]", "w-[170px] xl:w-[200px]", "w-[125px] xl:w-[140px]", "w-[140px] xl:w-[150px]", "w-[165px] xl:w-[170px]", "w-[120px]", "w-[130px]", "w-20"];

// hidden below xl
const USER_WIDE_ONLY = new Set([6]);
const ADMIN_WIDE_ONLY = new Set([6, 7]);

const HEADER_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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
			type="button"
			data-compact
			onClick={() => onSort(field)}
			className={`group/sort inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 ${
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
				<ArrowUpDown className="h-3 w-3 opacity-40 transition-opacity duration-150 group-hover/sort:opacity-80" />
			)}
		</button>
	);
}

interface EmptyModelsStateProps {
	statusTab: StatusTab;
	filterText: string;
	isModelLimitReached: boolean;
	statsTotal: number;
	statsModelLimit?: number;
	onNewModel: () => void;
	/** hide create button */
	hideCreate?: boolean;
}

// message per tab
const EMPTY_TAB_TEXT: Record<Exclude<StatusTab, "all">, [string, string]> = {
	pinned: ["model.empty.pinned", "No pinned models. Pin a model to keep it at the top."],
	running: ["model.empty.running", "Nothing is running right now."],
	completed: ["model.empty.completed", "No finished models yet."],
	drafts: ["model.empty.drafts", "No drafts. Saved models that were not run appear here."],
	failed: ["model.empty.failed", "No failed runs."],
	queue: ["model.empty.queue", "Nothing is waiting in the queue."],
	in_progress: ["model.empty.running", "Nothing is running right now."],
	completed_only: ["model.empty.completed", "No finished models yet."],
	published: ["model.empty.published", "No published models."],
};

function EmptyModelsState({ statusTab, filterText, isModelLimitReached, statsTotal, statsModelLimit, onNewModel, hideCreate = false }: EmptyModelsStateProps) {
	const { t } = useTranslation();
	const tabText = statusTab === "all" ? null : EMPTY_TAB_TEXT[statusTab];
	return (
		<div data-tour="models-loaded" className="md-fade-in m-4 sm:m-5 flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/50">
				<BarChart3 className="h-7 w-7 text-muted-foreground" />
			</div>
			<h3 className="text-base font-semibold tracking-tight text-foreground">{t('model.noModelsFound')}</h3>
			<p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
				{filterText
					? t('model.noModelsMatch', { search: filterText })
					: tabText
						? t(tabText[0], tabText[1])
						: t('model.noModelsYet')}
			</p>
			{!hideCreate && (
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
							{tabText ? t('model.newModel') : t('model.createFirstModel')}
						</button>
					</span>
				</TooltipTrigger>
				{isModelLimitReached && (
					<TooltipContent>
						{t('model.limitReached', { current: statsTotal, limit: statsModelLimit })}
					</TooltipContent>
				)}
			</Tooltip>
			)}
		</div>
	);
}

// screen reader texts
function useTableAnnouncements(families: ModelFamily[], totalItems: number, isLoading: boolean, isAdmin: boolean) {
	const { t } = useTranslation();
	const [announcement, setAnnouncement] = useState("");
	const lastStatus = useRef(new Map<number, string>());
	useEffect(() => {
		const finished: string[] = [];
		for (const m of families.flatMap((f) => [f.root, ...f.otherVersions])) {
			const prev = lastStatus.current.get(m.id);
			if (prev && prev !== m.status && (m.status === "completed" || m.status === "failed")) {
				finished.push(
					m.status === "completed"
						? t("model.announce.finished", { name: m.title, defaultValue: "{{name}} finished" })
						: t("model.announce.failed", { name: m.title, defaultValue: "{{name}} failed" })
				);
			}
			lastStatus.current.set(m.id, m.status);
		}
		if (finished.length > 0) setAnnouncement(finished.join(". "));
	}, [families, t]);
	return {
		announcement,
		count: isLoading ? "" : t("model.resultCount", { count: totalItems, defaultValue: "{{count}} models" }),
		caption: isAdmin ? t("model.tableCaptionAdmin", "All models") : t("model.tableCaption", "Your models"),
	};
}

export function ModelDashboardTable({
	isLoading, isLoadingWorkspace, families, totalItems, filterText, isError = false, onRetry,
}: ModelDashboardTableProps) {
	const { t } = useTranslation();
	// edge line scrolling
	const { setScrollEl, overflowX } = useHorizontalOverflow();
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
		statusTab,
		variant,
	} = useModelDashboardActions();
	const isAdmin = variant === "admin";
	const stats = { total: statsTotal, model_limit: statsModelLimit };

	// copy opens family
	const expandedFamilies = useExpandedFamiliesStore((s) => s.expanded);
	const toggleVersions = useExpandedFamiliesStore((s) => s.toggle);

	const visibleModels = useMemo(
		() => families.flatMap((family) => [
			family.display,
			...(expandedFamilies.has(family.root.id) ? family.otherVersions : []),
		]),
		[families, expandedFamilies]
	);
	const tourStepId = useActiveTourStepId();
	const seenCompleted = useSeenCompletedModelsStore((s) => s.seen);
	// any shown row
	const hasRealNewBadge = visibleModels.some((model) => isRecentlyCompleted(model, seenCompleted));
	// example row during
	const showDemoRow =
		tourStepId !== null &&
		((families.length === 0 && DEMO_ROW_STEPS.has(tourStepId)) ||
			(tourStepId === "newBadge" && !hasRealNewBadge));

	// risk sort scores
	const [riskOrder, setRiskOrder] = useState<"asc" | "desc" | null>(null);
	const completedIds = useMemo(
		() => families.map((f) => f.display).filter((m) => m.status === "completed").map((m) => m.id),
		[families]
	);
	const riskScores = useRiskScores(completedIds, riskOrder !== null);
	const sortedFamilies = useMemo(() => {
		if (!riskOrder) return families;
		const score = (f: ModelFamily) => riskScores[f.display.id] ?? -1;
		return [...families].sort((a, b) => (riskOrder === "asc" ? score(a) - score(b) : score(b) - score(a)));
	}, [families, riskOrder, riskScores]);
	const sortBy = useCallback(
		(field: string) => {
			if (field === "risk") {
				setRiskOrder((o) => (o === "desc" ? "asc" : "desc"));
				return;
			}
			setRiskOrder(null);
			handleSort(field);
		},
		[handleSort]
	);
	const activeOrderBy = riskOrder ? "risk" : orderBy;
	const activeOrder = riskOrder ?? order;
	const spoken = useTableAnnouncements(families, totalItems, isLoading, isAdmin);

	// announced sort state
	const ariaSort = (field: string): "ascending" | "descending" | "none" =>
		activeOrderBy === field ? (activeOrder === "asc" ? "ascending" : "descending") : "none";

	const visibleIdSet = useMemo(() => new Set(visibleModels.map((m) => m.id)), [visibleModels]);
	const allVisibleSelected =
		visibleModels.length > 0 && selectedModels.filter((m) => visibleIdSet.has(m.id)).length === visibleModels.length;

	return (
		<>
			{/* screen reader updates */}
			<p role="status" className="sr-only">
				{spoken.count}
			</p>
			<p role="status" className="sr-only">{spoken.announcement}</p>
			{/* table section */}
			{isError && families.length === 0 ? (
				<div role="alert" className="md-fade-in m-4 flex flex-col items-center rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-14 text-center sm:m-5">
					<AlertCircle className="h-7 w-7 text-destructive" />
					<h3 className="mt-3 text-base font-semibold text-foreground">{t('model.loadFailed', 'Could not load models')}</h3>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">
						{t('model.loadFailedHint', 'The server did not respond. Check the connection and try again.')}
					</p>
					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<RefreshCw className="h-4 w-4" />
							{t('common.retry', 'Try again')}
						</button>
					)}
				</div>
			) : (isLoading || isLoadingWorkspace) ? (
				<div className="p-4 sm:px-5 sm:pb-5 space-y-3">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<RefreshCw className="h-4 w-4 animate-spin" />
						<span>
							{isLoadingWorkspace ? t('model.loadingWorkspace') : t('model.loadingModels')}
						</span>
					</div>
					<TableSkeleton rows={6} withCheckbox />
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
							{/* scrolls inside header */}
							<div ref={setScrollEl} data-overflow={overflowX} className="group/table max-h-[calc(100dvh-17rem)] w-full overflow-auto">
								<table className={`w-full table-fixed ${isAdmin ? "min-w-[938px] xl:min-w-[1308px]" : "min-w-[993px] xl:min-w-[1328px]"}`}>
									<caption className="sr-only">
										{spoken.caption}
									</caption>
									<colgroup>
										{(isAdmin ? ADMIN_COLUMNS : USER_COLUMNS).map((width, i) => (
											<col key={i} className={`${width} ${(isAdmin ? ADMIN_WIDE_ONLY : USER_WIDE_ONLY).has(i) ? "hidden xl:table-column" : ""}`} />
										))}
									</colgroup>
									<thead className="sticky top-0 z-10">
										<tr data-tour="model-columns" className="border-b border-border bg-muted/90 backdrop-blur-sm">
											<th className="py-3 pl-2 pr-0 text-left">
												<Tooltip>
													<TooltipTrigger asChild>
														<input
															type="checkbox"
															checked={allVisibleSelected}
															onChange={() => handleSelectAll(visibleModels)}
															aria-label={selectedModels.length > 0 ? t('model.deselectAll') : t('model.selectAll')}
															className="h-4 w-4 cursor-pointer rounded border-input accent-primary focus:ring-ring focus:ring-offset-0"
														/>
													</TooltipTrigger>
													<TooltipContent>
														{selectedModels.length > 0 ? t('model.deselectAll') : t('model.selectAll')}
													</TooltipContent>
												</Tooltip>
											</th>
											<th aria-sort={ariaSort("title")} className="py-3 pl-2 pr-4 text-left">
												<SortHeaderButton field="title" label={t('model.name')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
											</th>
											{isAdmin && (
												<th aria-sort={ariaSort("user_email")} className="px-4 py-3 text-left">
													<SortHeaderButton field="user_email" label={t('model.owner', 'Owner')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
												</th>
											)}
											<th aria-sort={ariaSort("region")} className="px-4 py-3 text-left">
												{isAdmin ? (
													<SortHeaderButton field="region" label={t('model.territory', 'Territory')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
												) : (
													<span className={HEADER_LABEL}>{t('model.territory', 'Territory')}</span>
												)}
											</th>
											{!isAdmin && (
												<th className="hidden px-4 py-3 text-left md:table-cell">
													<span className={HEADER_LABEL}>{t('model.period')}</span>
												</th>
											)}
											<th aria-sort={ariaSort("risk")} className="px-4 py-3 text-left">
												<SortHeaderButton field="risk" label={t('model.riskScale', 'Risk (0–5)')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
											</th>
											<th aria-sort={ariaSort("status")} className="px-4 py-3 text-left">
												<SortHeaderButton field="status" label={t('model.status')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
											</th>
											{isAdmin && (
												<th aria-sort={ariaSort("created_at")} className="hidden px-4 py-3 text-left xl:table-cell">
													<SortHeaderButton field="created_at" label={t('model.created', 'Created')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
												</th>
											)}
											<th aria-sort={ariaSort("last_activity")} className="hidden px-4 py-3 text-left xl:table-cell">
												<SortHeaderButton field="last_activity" label={t('model.lastActivity')} orderBy={activeOrderBy} order={activeOrder} onSort={sortBy} />
											</th>
											{/* actions stay visible */}
											<th className="sticky right-0 z-[2] bg-muted py-3 pl-2 pr-4 text-right group-data-[overflow=true]/table:shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.12)]">
												<span className={HEADER_LABEL}>{t('model.actions')}</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/60 bg-card">
										{showDemoRow && <TourDemoRow />}
										{sortedFamilies.map((family) => {
											const expanded = expandedFamilies.has(family.root.id);
											const rootTitle = family.root.title.trim();
											return (
												<Fragment key={family.root.id}>
													<ModelTableRow
														model={family.display}
														level={0}
														parentModelTitle={family.display.is_copy ? family.display.parent_model_title || rootTitle : undefined}
														versionCount={family.versionCount}
														lastActivityAt={familyLatestActivity(family)}
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
									pageSizeOptions={[20, 50, 100]}
									isLoading={isLoading}
								/>
							)}
						</div>
					) : (
						<EmptyModelsState
								statusTab={statusTab}
							filterText={filterText}
							isModelLimitReached={isModelLimitReached}
							statsTotal={stats.total ?? 0}
							statsModelLimit={stats.model_limit}
							onNewModel={handleNewModel}
							hideCreate={isAdmin}
						/>
					)}
				</>
			)}
		</>
	);
}
