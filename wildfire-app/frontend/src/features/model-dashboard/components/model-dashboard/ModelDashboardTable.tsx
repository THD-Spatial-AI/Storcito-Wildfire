import { AlertCircle, BarChart3, ChevronDown, ChevronUp, Plus, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import Pagination from "@/components/ui/Pagination";
import type { Model } from "@/features/model-dashboard/services/modelService";
import { ModelTableRow } from "../ModelTableRow";
import { useTranslation } from "@/i18n";
import { useModelDashboardActions } from "./ModelDashboardActionsContext";

type DashboardModel = Model & { level: number };

interface ModelDashboardTableProps {
	isLoading: boolean;
	isLoadingWorkspace: boolean;
	filteredModels: Model[];
	paginatedModels: DashboardModel[];
	modelTitlesByID: Map<number, string>;
	childCountByParentID: Map<number, number>;
	sortedModels: Model[];
	totalItems: number;
	filterText: string;
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Extracted table preserves existing conditional rendering verbatim.
export function ModelDashboardTable({
	isLoading, isLoadingWorkspace, filteredModels, paginatedModels, modelTitlesByID, childCountByParentID, sortedModels, totalItems, filterText,
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

	return (
		<>
							{/* Table Section */}
							{(isLoading || isLoadingWorkspace) ? (
								<div className="p-12 text-center bg-muted/50 rounded-xl">
									<div className="flex items-center justify-center gap-3 mb-3">
										<RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
										<span className="text-lg font-medium text-foreground">
											{isLoadingWorkspace ? t('model.loadingWorkspace') : t('model.loadingModels')}
										</span>
									</div>
									<p className="text-sm text-muted-foreground">
										{isLoadingWorkspace
											? t('model.loadingWorkspaceDescription')
											: t('model.loadingModelsDescription')}
									</p>
								</div>
							) : (
								<>
									{!isLoading && filteredModels.length > 0 ? (
										<div className="border border-border rounded-xl overflow-hidden">
									<div className="w-full overflow-auto">
										<table className="w-full table-auto">
											<thead>
												<tr className="bg-muted/50">
													<th className="w-12 px-4 py-2 text-center">
														<Tooltip>
															<TooltipTrigger asChild>
																<input
																	type="checkbox"
																	checked={
																		selectedModels.length === filteredModels.length && filteredModels.length > 0
																	}
																	onChange={() => handleSelectAll(filteredModels)}
																	className="w-4 h-4 text-foreground rounded border-input focus:ring-ring focus:ring-offset-0 cursor-pointer"
																/>
															</TooltipTrigger>
															<TooltipContent>
																{selectedModels.length > 0 ? t('model.deselectAll') : t('model.selectAll')}
															</TooltipContent>
														</Tooltip>
													</th>
													<th className="px-4 py-2 text-left">
														<button
															onClick={() => handleSort("title")}
															className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
														>
															{t('model.name')}
															{orderBy === "title" && (
																<span className="flex items-center justify-center w-4 h-4 bg-muted rounded">
																	{order === "asc" ? (
																		<ChevronUp className="w-3 h-3" />
																	) : (
																		<ChevronDown className="w-3 h-3" />
																	)}
																</span>
															)}
														</button>
													</th>
													<th className="px-4 py-2 text-left">
														<button
															onClick={() => handleSort("status")}
															className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
														>
															{t('model.status')}
															{orderBy === "status" && (
																<span className="flex items-center justify-center w-4 h-4 bg-muted rounded">
																	{order === "asc" ? (
																		<ChevronUp className="w-3 h-3" />
																	) : (
																		<ChevronDown className="w-3 h-3" />
																	)}
																</span>
															)}
														</button>
													</th>
													<th className="px-4 py-2 text-left">
														<button
															onClick={() => handleSort("created_at")}
															className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
														>
															{t('model.created')}
															{orderBy === "created_at" && (
																<span className="flex items-center justify-center w-4 h-4 bg-muted rounded">
																	{order === "asc" ? (
																		<ChevronUp className="w-3 h-3" />
																	) : (
																		<ChevronDown className="w-3 h-3" />
																	)}
																</span>
															)}
														</button>
													</th>
													<th className="px-4 py-2 text-left">
														<span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t('model.actions')}</span>
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border bg-card">
												{paginatedModels.map((model) => (
													<ModelTableRow
														key={model.id}
														model={model}
														modelTitle={modelTitlesByID.get(model.id) ?? model.title.trim()}
														parentModelTitle={model.parent_model_id ? (modelTitlesByID.get(model.parent_model_id) ?? model.parent_model_title) : undefined}
														hasChildren={(childCountByParentID.get(model.id) ?? 0) > 0}
													/>
												))}
											</tbody>
										</table>
									</div>
									{sortedModels.length > 0 && (
										<Pagination
											currentPage={currentPage}
											totalItems={totalItems}
											itemsPerPage={itemsPerPage}
											onPageChange={handlePageChange}
											onItemsPerPageChange={handleItemsPerPageChange}
											pageSizeOptions={[12, 24, 36, 48]}
											isLoading={isLoading}
										/>
									)}
								</div>
							) : (
								<div className="p-12 text-center bg-muted/50 rounded-xl">
									<div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-2xl flex items-center justify-center">
										<BarChart3 className="w-8 h-8 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-semibold text-foreground mb-2">{t('model.noModelsFound')}</h3>
									<p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
										{filterText
											? t('model.noModelsMatch', { search: filterText })
											: t('model.noModelsYet')}
									</p>
									<Tooltip>
										<TooltipTrigger asChild>
											<span>
												<button
													onClick={handleNewModel}
													disabled={isModelLimitReached}
													className={`inline-flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all shadow-md ${
														isModelLimitReached
															? 'bg-muted text-muted-foreground cursor-not-allowed'
															: 'bg-primary text-primary-foreground hover:bg-primary/90'
													}`}
												>
													{isModelLimitReached ? (
														<AlertCircle className="w-4 h-4" />
													) : (
														<Plus className="w-4 h-4" />
													)}
													{t('model.createFirstModel')}
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
							)}
							</>
							)}
		</>
	);
}
