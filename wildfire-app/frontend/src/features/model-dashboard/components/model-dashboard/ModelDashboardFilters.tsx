import type { ReactNode } from "react";
import { AlertCircle, BarChart3, Copy, Edit, Filter, GitCompareArrows, Plus, RefreshCw, Settings, Share2, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import Chip from "@/components/ui/Chip";
import { WorkspaceSelector } from "@/components/workspace";
import type { Workspace } from "@/components/workspace";
import { useTranslation } from "@/i18n";
import type { ModelStats } from "@/features/model-dashboard/services/modelService";
import { ModelStatsSummary } from "./ModelStatsSummary";
import type { Group } from "./types";

interface ModelDashboardFiltersProps {
	groups: Group[];
	selectedGroup: Group | null;
	setSelectedGroup: (group: Group | null) => void;
	filterText: string;
	setFilterText: (value: string) => void;
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

export function ModelDashboardFilters({
	groups, selectedGroup, setSelectedGroup, filterText, setFilterText, isLoadingWorkspace, handleWorkspaceChange, setIsCreateWsOpen, wsReloadKey, normalizedWorkspaceId, preferredWorkspaceId, currentWorkspace, handleRefresh, isRefreshing, isLoading, handleCompareSelected, canCompareSelected, canManageWorkspace, setIsShareWsOpen, setIsCopyWsOpen, setIsRenameWsOpen, handleDeleteWorkspace, bulkActions, stats, statsLoaded = false, handleNewModel, isModelLimitReached, table,
}: ModelDashboardFiltersProps) {
	const { t } = useTranslation();

	return (
		<>
					{/* Groups Section */}
					{groups.length > 0 && (
						<div className="bg-card rounded-lg px-4 py-3 shadow-sm border border-border">
							<div className="flex items-center gap-2 mb-3">
								<Settings className="w-4 h-4 text-muted-foreground" />
								<h3 className="text-sm font-medium text-foreground">{t('model.modelGroups')}</h3>
							</div>
							<div className="flex gap-2 flex-wrap">
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
					<div className="bg-card rounded-lg shadow-sm border border-border">
						<div className="p-4">
							{/* Title + primary action, above the search */}
							<div className="flex items-center justify-between gap-3 mb-4">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-muted rounded-lg">
										<BarChart3 className="w-5 h-5 text-muted-foreground" />
									</div>
									<div>
										<h1 className="text-lg font-semibold text-foreground">{t('model.dashboard')}</h1>
										<p className="text-xs text-muted-foreground">{t('model.manageConfigurations')}</p>
									</div>
								</div>
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											<button
												onClick={handleNewModel}
												disabled={isModelLimitReached}
												data-tour="new-assessment"
												className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${
													isModelLimitReached
														? 'bg-muted text-muted-foreground cursor-not-allowed'
														: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
												}`}
											>
												{isModelLimitReached ? <AlertCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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

							{/* Toolbar */}
							<div className="flex flex-wrap items-center gap-2 mb-4">
								{/* Search */}
								<div className="flex-1 min-w-[200px] max-w-md">
									<div className="relative">
										<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
										<input
											type="text"
											placeholder={t('model.searchModels')}
											value={filterText}
											onChange={(e) => setFilterText(e.target.value)}
											className="w-full pl-9 pr-3 py-1.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background hover:bg-accent focus:bg-background transition-colors text-sm text-foreground placeholder-muted-foreground"
										/>
									</div>
								</div>

								{/* Workspace Controls */}
								<div className="flex items-center gap-2">
									{isLoadingWorkspace ? (
										<div className="flex items-center gap-2 px-4 py-1.5 border border-border rounded-xl bg-card text-sm">
											<RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
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
														className="p-2 border border-border rounded-xl hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-card"
														aria-label={t('model.refreshModels')}
													>
														<RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
													</button>
												</TooltipTrigger>
												<TooltipContent>
													{t('model.refreshModels')}
												</TooltipContent>
											</Tooltip>
										</>
									)}

									{/* Compare button - always visible */}
									<Tooltip>
										<TooltipTrigger asChild>
											<span>
												<button
													onClick={handleCompareSelected}
													disabled={!canCompareSelected}
													className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl hover:bg-accent text-sm transition-colors bg-card disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<GitCompareArrows className="w-4 h-4 text-muted-foreground" />
													<span className="text-foreground">{t('model.compare')}</span>
												</button>
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<p>{canCompareSelected ? t('model.compare') : t('model.compareRequires2Completed')}</p>
										</TooltipContent>
									</Tooltip>

									{currentWorkspace && (
										<>
											{canManageWorkspace && (
												<Tooltip>
													<TooltipTrigger asChild>
														<button
															onClick={() => setIsShareWsOpen(true)}
															className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl hover:bg-accent text-sm transition-colors bg-card"
														>
															<Share2 className="w-4 h-4 text-muted-foreground" />
															<span className="text-foreground">{t('model.share')}</span>
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
														className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl hover:bg-accent text-sm transition-colors bg-card"
													>
														<Copy className="w-4 h-4 text-muted-foreground" />
														<span className="text-foreground">{t('model.copy')}</span>
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
																className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl hover:bg-accent text-sm transition-colors bg-card"
															>
																<Edit className="w-4 h-4 text-muted-foreground" />
																<span className="text-foreground">{t('model.rename')}</span>
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
																className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive/50 rounded-xl hover:bg-destructive/10 text-sm transition-colors bg-card text-destructive"
															>
																<Trash2 className="w-4 h-4" />
																<span>{t('model.delete')}</span>
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

									{/* Bulk Actions - placed after workspace delete button */}
									{bulkActions}
								</div>

								{/* Compact stats summary, just above the table */}
								{statsLoaded && (
									<ModelStatsSummary stats={stats} className="ml-auto" />
								)}
							</div>
							{table}
						</div>
					</div>
		</>
	);
}
