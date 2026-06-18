import React, { Fragment, useState, useCallback, useEffect, useMemo } from "react";
import { FolderInput, Copy, Play, Trash2 } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useNavigate, useLocation } from "react-router-dom";

import { Model, ModelStats } from "@/features/model-dashboard/services/modelService";
import { useConfirm } from "@/hooks/useConfirmDialog";
import { useModelsQuery, useModelStatsQuery } from "@/features/model-dashboard/hooks/useModelsQuery";
import { type Workspace, workspaceService } from "@/components/workspace";
import { useWorkspaceStore } from "@/components/workspace";
import { useAuthStore } from "@/store/auth-store";
import { useModelDashboardHandlers } from '@/features/model-dashboard/hooks/useModelDashboardHandlers';
import { useModelSelection } from '@/features/model-dashboard/hooks/useModelSelection';
import { useBulkOperations } from '@/features/model-dashboard/hooks/useBulkOperations';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type ActionConfig } from "@/components/shared/ModelActionGroup";
import { useFavoriteModelsStore } from "@/features/model-dashboard/store/favorite-models";
import { isModelDisabled as checkModelDisabled, isModelCompleted } from "@/features/model-dashboard/utils/statusHelpers";
import { useWebservices } from "@/features/admin-dashboard/hooks/useWebservices";
import { processModelTimingUpdates, type TimingUpdate } from "@/features/model-dashboard/utils/modelTimingUtils";
import { organizeModelsHierarchically } from "@/features/model-dashboard/utils/dashboardHelpers";
import { useTranslation } from "@/i18n";
import { useNotification } from "@/features/notifications/hooks/useNotification";
import { ModelDashboardFilters } from "./model-dashboard/ModelDashboardFilters";
import { ModelDashboardBulkActions } from "./model-dashboard/ModelDashboardBulkActions";
import { ModelDashboardTable } from "./model-dashboard/ModelDashboardTable";
import { ModelDashboardActionsProvider, type ModelDashboardActionsContextValue } from "./model-dashboard/ModelDashboardActionsContext";
import { ModelDashboardModals } from "./model-dashboard/ModelDashboardModals";
import type { Group, ModelDashboardProps, WorkspaceMember } from "./model-dashboard/types";

const DEFAULT_STATS: ModelStats = {
	total: 0,
	draft: 0,
	queue: 0,
	running: 0,
	completed: 0,
	published: 0,
	failed: 0,
	cancelled: 0,
	model_limit: 0,
	remaining: -1,
	is_unlimited: false,
};

function checkOwnership(
	ownerId: number | string | null | undefined,
	ownerEmail: string | null | undefined,
	user: { id?: number | string | null; email?: string | null }
): boolean {
	const userIdStr = user.id !== undefined && user.id !== null ? String(user.id) : "";
	const ownerIdStr = ownerId ? String(ownerId) : "";
	const idMatches = userIdStr && ownerIdStr && userIdStr === ownerIdStr;
	
	const emailMatches = ownerEmail && user.email
		? ownerEmail.toLowerCase() === user.email.toLowerCase()
		: false;
	
	return Boolean(idMatches || emailMatches);
}

export const ModelDashboard: React.FC<ModelDashboardProps> = () => {
	const { t } = useTranslation();
	useDocumentTitle(t('model.dashboard'));

	const navigate = useNavigate();
	const location = useLocation();
	const confirm = useConfirm();
	const passedWorkspaceId = location.state?.workspaceId;
	const normalizedWorkspaceId = typeof passedWorkspaceId === "number" ? passedWorkspaceId : undefined;

	const currentWorkspace = useWorkspaceStore(state => state.currentWorkspace);
	const preferredWorkspaceId = useWorkspaceStore(state => state.preferredWorkspaceId);
	const isLoadingWorkspace = useWorkspaceStore(state => state.isLoading);
	const setCurrentWorkspace = useWorkspaceStore(state => state.setCurrentWorkspace);
	const initializeWorkspace = useWorkspaceStore(state => state.initializeWorkspace);
    const user = useAuthStore(state => state.user);

	const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
	const [isShareWsOpen, setIsShareWsOpen] = useState(false);
	const [isRenameWsOpen, setIsRenameWsOpen] = useState(false);
	const [isCopyWsOpen, setIsCopyWsOpen] = useState(false);
	const [wsReloadKey, setWsReloadKey] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const { notification, showSuccess, showError, hide: hideNotification } = useNotification();

	useEffect(() => {
		initializeWorkspace();
	}, [initializeWorkspace]);
	const isWorkspaceOwner = React.useMemo(() => {
		if (!currentWorkspace || !user) return false;
		return checkOwnership(currentWorkspace.user_id, currentWorkspace.user_email, user);
	}, [currentWorkspace, user]);

	const canManageWorkspace = React.useMemo(() => {
		if (!currentWorkspace || !user) return false;
		if (isWorkspaceOwner) return true;
		if (user.access_level === 'expert') {
			const members = currentWorkspace.members || [];
			const groups = currentWorkspace.groups || [];
			const userIdStr = String(user.id ?? '');
			const isMember = members.some((m: WorkspaceMember) => String(m.user_id) === userIdStr || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()));
			const hasGroup = Array.isArray(groups) && groups.length > 0;
			return isMember || hasGroup;
		}
		return false;
	}, [currentWorkspace, user, isWorkspaceOwner]);

	const canUserDeleteModel = React.useCallback((model: Model): boolean => {
		if (!user) return false;

		const isModelOwner = checkOwnership(model.user_id, model.user_email, user);
		if (isModelOwner) return true;

		return user.access_level === 'expert';
	}, [user]);

	useEffect(() => {
		if (normalizedWorkspaceId && preferredWorkspaceId !== normalizedWorkspaceId) {
			/* handled upstream */
		}
	}, [normalizedWorkspaceId, preferredWorkspaceId]);

	const [groups] = useState<Group[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
	
	const [calculationStartTimes, setCalculationStartTimes] = useState<Record<number, string>>(() => {
		try {
			const saved = localStorage.getItem('modelCalculationStartTimes');
			return saved ? JSON.parse(saved) : {};
		} catch {
			return {};
		}
	});
	const [calculationCompletionInfo, setCalculationCompletionInfo] = useState<Record<number, { startTime: string, endTime: string, totalSeconds: number }>>(() => {
		try {
			const saved = localStorage.getItem('modelCalculationCompletionInfo');
			return saved ? JSON.parse(saved) : {};
		} catch {
			return {};
		}
	});

	const [orderBy, setOrderBy] = useState<string>("created_at");
	const [order, setOrder] = useState<"asc" | "desc">("desc");
	const [filterText, setFilterText] = useState<string>("");
	const [currentPage, setCurrentPage] = useState<number>(0);
	const [itemsPerPage, setItemsPerPage] = useState<number>(12);
	const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | undefined>(undefined);

	const { data: modelsResponse, isLoading: isLoadingModels, refetch: refetchModels } = useModelsQuery({
		limit: itemsPerPage,
		offset: currentPage * itemsPerPage,
		search: filterText.trim() || undefined,
		workspace_id: currentWorkspaceId,
		sort_by: orderBy,
		sort_order: order,
	});

	const { data: statsResponse, isSuccess: statsLoaded } = useModelStatsQuery();

	const { summary: webserviceSummary } = useWebservices({}, { autoRefresh: true, refreshInterval: 10000 });
	const hasAvailableWebservice = (webserviceSummary?.available ?? 0) > 0;

	// Exactly the page slice from the API; child rows show their parent via
	// the parent_model_title field, so off-page parents are not merged in.
	const models = useMemo(() => modelsResponse?.data || [], [modelsResponse?.data]);
	const totalItems = modelsResponse?.total || 0;
	const isLoading = isLoadingModels;

	// Use stats directly from React Query, fallback to defaults
	const stats = useMemo(() => {
		if (statsResponse?.success && statsResponse.data) {
			return statsResponse.data;
		}
		return DEFAULT_STATS;
	}, [statsResponse]);

	// Check if model limit is reached
	const isModelLimitReached = useMemo(() => {
		if (stats.is_unlimited) return false;
		if (!stats.model_limit) return false;
		return stats.total >= stats.model_limit;
	}, [stats.total, stats.model_limit, stats.is_unlimited]);

	// No-op function for compatibility - mutations handle cache invalidation automatically
	const loadStats = useCallback(async () => {
		// Stats are handled by React Query - mutations invalidate the cache
	}, []);

	const {
		selectedModels,
		editingModel,
		editTitle,
		isSelected,
		handleSelectModel,
		handleSelectAll,
		startTitleEdit,
		cancelTitleEdit,
		setEditTitle,
		clearSelection,
	} = useModelSelection();

	const {
		handleEdit,
		handleView,
		handleCopy,
		handleDelete,
		handleCalculate,
		handleDownload,
		updateTitle: updateTitleHandler,
		handleBulkDelete: bulkDeleteHandler,
	} = useModelDashboardHandlers({
		onRefresh: async () => { await refetchModels(); },
		onStatsRefresh: loadStats,
	});

	const setWorkspaceFilter = useCallback((workspaceId: number | undefined) => {
		setCurrentWorkspaceId(workspaceId);
		setCurrentPage(0);
	}, []);

	const handleWorkspaceChange = useCallback((workspace: Workspace | null) => {
		setCurrentWorkspace(workspace);
		setWorkspaceFilter(workspace?.id);
	}, [setCurrentWorkspace, setWorkspaceFilter]);

	const loadModels = useCallback(async () => {
		try {
			await refetchModels();
		} catch (error) {
			if (import.meta.env.DEV) console.error("Failed to refetch models:", error);
		}
	}, [refetchModels]);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			// Reload both workspaces and models
			setWsReloadKey((k) => k + 1);
			await loadModels();
		} finally {
			setTimeout(() => setIsRefreshing(false), 500);
		}
	}, [loadModels]);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
	}, []);

	const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(0);
	}, []);

	const handleSort = useCallback((field: string) => {
		const newOrder = orderBy === field && order === "asc" ? "desc" : "asc";
		setOrderBy(field);
		setOrder(newOrder);
		setCurrentPage(0);
	}, [orderBy, order]);

	const updateTitle = useCallback(async (): Promise<void> => {
		await updateTitleHandler(editingModel, editTitle);
		cancelTitleEdit();
	}, [editingModel, editTitle, updateTitleHandler, cancelTitleEdit]);

	const isModelDisabled = useCallback((model: Model): boolean => {
		return checkModelDisabled(model.status);
	}, []);

	const performBulkDelete = useCallback(async (): Promise<void> => {
		const deletableModels = selectedModels.filter((model: Model) => 
			!isModelDisabled(model) && canUserDeleteModel(model)
		);
		const deletableIds = deletableModels.map((m) => m.id);
		await bulkDeleteHandler(deletableIds);
		clearSelection();
	}, [selectedModels, isModelDisabled, canUserDeleteModel, bulkDeleteHandler, clearSelection]);

	const filteredModels = models;

	const favoriteIds = useFavoriteModelsStore(s => s.favoriteIds);
	const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

	const sortedModels = useMemo(() => {
		// Server already sorts by orderBy/order — only reorder favorites to top
		return [...filteredModels].sort((a, b) => {
			const aFav = favoriteIdSet.has(a.id) ? 0 : 1;
			const bFav = favoriteIdSet.has(b.id) ? 0 : 1;
			return aFav - bFav;
		});
	}, [filteredModels, favoriteIdSet]);

	const orderedModels = useMemo(() => organizeModelsHierarchically(sortedModels), [sortedModels]);

	const paginatedModels = orderedModels;
	const modelTitlesByID = useMemo(() => {
		const titles = new Map<number, string>();
		for (const model of paginatedModels) {
			titles.set(model.id, model.title.trim());
		}
		return titles;
	}, [paginatedModels]);
	const childCountByParentID = useMemo(() => {
		const children = new Map<number, number>();
		for (const model of paginatedModels) {
			if (!model.parent_model_id) continue;
			children.set(model.parent_model_id, (children.get(model.parent_model_id) ?? 0) + 1);
		}
		return children;
	}, [paginatedModels]);

	const { showBulkDeleteConfirm } = useBulkOperations({
		selectedModels,
		sortedModels: orderedModels,
		isModelDisabled,
		onBulkDelete: performBulkDelete,
		onClearSelection: clearSelection,
		onLoadStats: loadStats,
	});

	const { handleSingleDelete } = useDeleteConfirm({
		sortedModels: orderedModels,
		onDelete: handleDelete,
		onLoadStats: loadStats,
	});

	useEffect(() => {
		if (isLoadingWorkspace) return;

		if (currentWorkspace) {
			setWorkspaceFilter(currentWorkspace.id);
		} else {
			setWorkspaceFilter(undefined);
		}
		loadStats();
	}, [isLoadingWorkspace, currentWorkspace, loadStats, setWorkspaceFilter]);

	useEffect(() => {
		if (!models.length) return;

		const timingUpdate = processModelTimingUpdates(models, calculationStartTimes, calculationCompletionInfo);
		
		updateCalculationStartTimes(timingUpdate);
		updateCalculationCompletionInfo(timingUpdate);
	}, [models, calculationStartTimes, calculationCompletionInfo]);

	const updateCalculationStartTimes = (timingUpdate: TimingUpdate) => {
		if (timingUpdate.hasStartChanges) {
			setCalculationStartTimes(timingUpdate.updatedStartTimes);
			localStorage.setItem('modelCalculationStartTimes', JSON.stringify(timingUpdate.updatedStartTimes));
		}
	};

	const updateCalculationCompletionInfo = (timingUpdate: TimingUpdate) => {
		if (timingUpdate.hasCompletionChanges) {
			setCalculationCompletionInfo(timingUpdate.updatedCompletionInfo);
			localStorage.setItem('modelCalculationCompletionInfo', JSON.stringify(timingUpdate.updatedCompletionInfo));
		}
	};



	const [shareModal, setShareModal] = useState<{
		isOpen: boolean;
		model: Model | null;
	}>({
		isOpen: false,
		model: null,
	});


	const [moveModelModal, setMoveModelModal] = useState<{
		isOpen: boolean;
		model: Model | null;
		models?: Model[];
	}>({
		isOpen: false,
		model: null,
	});

	const [bulkCopyModal, setBulkCopyModal] = useState<{
		isOpen: boolean;
		models: Model[];
	}>({
		isOpen: false,
		models: [],
	});

	const handleCopyWorkspaceSuccess = async (copiedWorkspace: Workspace, sourceWorkspace: Workspace) => {
		try {
			// Reload workspace list to include the new workspace
			setWsReloadKey((k) => k + 1);
			// Switch to the new workspace
			handleWorkspaceChange(copiedWorkspace);
			await loadModels();
			await loadStats();

			showSuccess(`Workspace "${copiedWorkspace.name}" created successfully with all models copied from "${sourceWorkspace.name}".`);
		} catch (error) {
			if (import.meta.env.DEV) console.error("Failed to load copied workspace:", error);
			showError("Workspace copied but failed to load. Please refresh the page.");
		}
	};

	const handleRenameWorkspaceSuccess = async (updatedWorkspace: Workspace) => {
		try {
			// Update the current workspace
			setCurrentWorkspace(updatedWorkspace);
			setWsReloadKey((k) => k + 1);

			showSuccess(`Workspace renamed to "${updatedWorkspace.name}" successfully.`);
		} catch (error) {
			if (import.meta.env.DEV) console.error("Failed to update workspace:", error);
			showError("Workspace renamed but failed to refresh. Please reload the page.");
		}
	};

	const handleDeleteWorkspace = async () => {
		if (!currentWorkspace) return;

		await confirm({
			type: "delete",
			itemType: "workspace",
			itemName: currentWorkspace.name,
			description: `This will permanently delete the workspace "${currentWorkspace.name}" and all models in it. This action cannot be undone.`,
			onConfirm: async () => {
				try {
					await workspaceService.deleteWorkspace(currentWorkspace.id);
					// Load default workspace after deletion
					const defaultWorkspace = await workspaceService.getDefaultWorkspace();
					handleWorkspaceChange(defaultWorkspace);
					setWsReloadKey((k) => k + 1);
					await loadStats();
				} catch (error) {
					if (import.meta.env.DEV) console.error("Failed to delete workspace:", error);
					alert("Failed to delete workspace. Please try again.");
				}
			}
		});
	};

	const handleNewModel = useCallback((): void => {
		if (currentWorkspace) {
			navigate("/app/model-dashboard/new-model", {
				state: { workspaceId: currentWorkspace.id }
			});
		} else {
			navigate("/app/model-dashboard/new-model");
		}
	}, [currentWorkspace, navigate]);

	const handleShare = useCallback((model: Model) => {
		setShareModal({
			isOpen: true,
			model,
		});
	}, []);

	const handleMoveToWorkspace = useCallback((model: Model) => {
		// Blur active element to prevent aria-hidden focus warning
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		setMoveModelModal({
			isOpen: true,
			model,
		});
	}, []);

	const handleBulkMoveToWorkspace = useCallback(() => {
		// Blur active element to prevent aria-hidden focus warning
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		const ownedModels = selectedModels.filter((model: Model) => canUserDeleteModel(model));
		
		// Exclude parent models if their children are also being moved
		const modelsToMove = ownedModels.filter(model => {
			// Check if any selected model has this model as parent
			const hasChildInSelection = ownedModels.some(
				m => m.parent_model_id === model.id
			);
			return !hasChildInSelection;
		});
		
		setMoveModelModal({
			isOpen: true,
			model: null,
			models: modelsToMove,
		});
	}, [canUserDeleteModel, selectedModels]);

	const canDeleteAnySelected = useMemo(() => {
		return selectedModels.some((model: Model) =>
			!isModelDisabled(model) && canUserDeleteModel(model)
		);
	}, [selectedModels, canUserDeleteModel, isModelDisabled]);

	const canMoveAnySelected = useMemo(() => {
		return selectedModels.some((model: Model) => canUserDeleteModel(model));
	}, [selectedModels, canUserDeleteModel]);

	const canCalculateAnySelected = useMemo(() => {
		return hasAvailableWebservice && selectedModels.some((model: Model) => !isModelDisabled(model));
	}, [selectedModels, isModelDisabled, hasAvailableWebservice]);

	const calculatableCount = useMemo(() => {
		return selectedModels.filter((model: Model) => !isModelDisabled(model)).length;
	}, [selectedModels, isModelDisabled]);

	const handleBulkCalculate = useCallback(async () => {
		const calculatableModels = selectedModels.filter((model: Model) => !isModelDisabled(model));
		const modelIds = calculatableModels.map((m) => m.id);
		await handleCalculate(modelIds);
		clearSelection();
	}, [selectedModels, isModelDisabled, handleCalculate, clearSelection]);
	const handleCalculateSingle = useCallback((model: Model) => {
		handleCalculate([model.id]);
	}, [handleCalculate]);

	const handleBulkCopy = useCallback(() => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		setBulkCopyModal({
			isOpen: true,
			models: [...selectedModels],
		});
	}, [selectedModels]);

	const deletableCount = useMemo(() => {
		return selectedModels.filter((model: Model) =>
			!isModelDisabled(model) && canUserDeleteModel(model)
		).length;
	}, [selectedModels, canUserDeleteModel, isModelDisabled]);

	const getMoveTooltip = useCallback(() => {
		const modelWord = selectedModels.length > 1 ? t('model.models').toLowerCase() : t('model.title').toLowerCase();
		if (canMoveAnySelected) {
			return `${t('model.move')} ${selectedModels.length} ${t('model.selected')} ${modelWord}`;
		}
		return t('model.cannotMove');
	}, [selectedModels.length, canMoveAnySelected, t]);

	const getCalculateTooltip = useCallback(() => {
		if (!hasAvailableWebservice) {
			return t('model.noWebserviceAvailable');
		}
		if (canCalculateAnySelected) {
			return `${t('model.calculate')} ${calculatableCount} ${t('model.selected')}`;
		}
		return t('model.cannotCalculate');
	}, [hasAvailableWebservice, canCalculateAnySelected, calculatableCount, t]);

	const getCopyTooltip = useCallback(() => {
		return `${t('model.copy')} ${selectedModels.length} ${t('model.selected')}`;
	}, [selectedModels.length, t]);

	const getDeleteTooltip = useCallback(() => {
		if (canDeleteAnySelected) {
			return `${t('model.delete')} ${deletableCount} ${t('model.selected')}`;
		}
		return t('model.cannotDelete');
	}, [canDeleteAnySelected, deletableCount, t]);

	const canCompareSelected = useMemo(() => {
		if (selectedModels.length !== 2) return false;
		const freshModels = modelsResponse?.data ?? [];
		return selectedModels.every((sel: Model) => {
			const fresh = freshModels.find((m: Model) => m.id === sel.id);
			return isModelCompleted(fresh ? fresh.status : sel.status);
		});
	}, [selectedModels, modelsResponse]);

	const handleCompareSelected = useCallback(() => {
		if (selectedModels.length !== 2) return;
		const [m1, m2] = selectedModels;
		navigate(`/app/comparison?model1=${m1.id}&model2=${m2.id}`);
	}, [selectedModels, navigate]);



	const bulkActions: ActionConfig[] = useMemo(() => [
		{
			key: "bulk-move",
			icon: FolderInput,
			tooltip: getMoveTooltip(),
			variant: "secondary" as const,
			onClick: handleBulkMoveToWorkspace,
			disabled: !canMoveAnySelected,
		},
		{
			key: "bulk-copy",
			icon: Copy,
			tooltip: getCopyTooltip(),
			variant: "purple" as const,
			onClick: handleBulkCopy,
		},
		{
			key: "bulk-calculate",
			icon: Play,
			tooltip: getCalculateTooltip(),
			variant: "success" as const,
			onClick: handleBulkCalculate,
			disabled: !canCalculateAnySelected,
		},
		{
			key: "bulk-delete",
			icon: Trash2,
			tooltip: getDeleteTooltip(),
			variant: "danger" as const,
			onClick: showBulkDeleteConfirm,
			disabled: !canDeleteAnySelected,
		},
	], [getMoveTooltip, getCopyTooltip, getCalculateTooltip, getDeleteTooltip, handleBulkMoveToWorkspace, handleBulkCopy, handleBulkCalculate, showBulkDeleteConfirm, canMoveAnySelected, canCalculateAnySelected, canDeleteAnySelected]);

	const modelDashboardActions = useMemo<ModelDashboardActionsContextValue>(() => ({
		selectedModels,
		handleSelectAll,
		handleSort,
		orderBy,
		order,
		user,
		isSelected,
		editingModel,
		editTitle,
		calculationStartTimes,
		calculationCompletionInfo,
		canUserDeleteModel,
		hasAvailableWebservice,
		handleSelectModel,
		startTitleEdit,
		setEditTitle,
		updateTitle,
		cancelTitleEdit,
		handleView,
		handleEdit,
		handleDownload,
		handleCopy,
		handleCalculateSingle,
		handleSingleDelete,
		handleShare,
		handleMoveToWorkspace,
		currentPage,
		itemsPerPage,
		handlePageChange,
		handleItemsPerPageChange,
		handleNewModel,
		isModelLimitReached,
		statsTotal: stats.total,
		statsModelLimit: stats.model_limit,
	}), [
		selectedModels, handleSelectAll, handleSort, orderBy, order, user, isSelected, editingModel, editTitle,
		calculationStartTimes, calculationCompletionInfo, canUserDeleteModel, hasAvailableWebservice, handleSelectModel,
		startTitleEdit, setEditTitle, updateTitle, cancelTitleEdit, handleView, handleEdit, handleDownload, handleCopy,
		handleCalculateSingle, handleSingleDelete, handleShare, handleMoveToWorkspace, currentPage, itemsPerPage,
		handlePageChange, handleItemsPerPageChange, handleNewModel, isModelLimitReached, stats.total, stats.model_limit,
	]);

return (
		<Fragment>
			<div className="relative p-4 w-full space-y-4 bg-background overflow-x-hidden overflow-y-scroll">
				<div className="w-full space-y-4">
					<ModelDashboardFilters
						groups={groups}
						selectedGroup={selectedGroup}
						setSelectedGroup={setSelectedGroup}
						filterText={filterText}
						setFilterText={setFilterText}
						isLoadingWorkspace={isLoadingWorkspace}
						handleWorkspaceChange={handleWorkspaceChange}
						setIsCreateWsOpen={setIsCreateWsOpen}
						wsReloadKey={wsReloadKey}
						normalizedWorkspaceId={normalizedWorkspaceId}
						preferredWorkspaceId={preferredWorkspaceId}
						currentWorkspace={currentWorkspace}
						handleRefresh={handleRefresh}
						isRefreshing={isRefreshing}
						isLoading={isLoading}
						handleCompareSelected={handleCompareSelected}
						canCompareSelected={canCompareSelected}
						canManageWorkspace={canManageWorkspace}
						setIsShareWsOpen={setIsShareWsOpen}
						setIsCopyWsOpen={setIsCopyWsOpen}
						setIsRenameWsOpen={setIsRenameWsOpen}
						handleDeleteWorkspace={handleDeleteWorkspace}
						stats={stats}
						statsLoaded={statsLoaded}
						handleNewModel={handleNewModel}
						isModelLimitReached={isModelLimitReached}
						bulkActions={<ModelDashboardBulkActions selectedCount={selectedModels.length} actions={bulkActions} />}
						table={(
							<ModelDashboardActionsProvider value={modelDashboardActions}>
								<ModelDashboardTable
									isLoading={isLoading}
									isLoadingWorkspace={isLoadingWorkspace}
									filteredModels={filteredModels}
									paginatedModels={paginatedModels}
									modelTitlesByID={modelTitlesByID}
									childCountByParentID={childCountByParentID}
									sortedModels={sortedModels}
									totalItems={totalItems}
									filterText={filterText}
								/>
							</ModelDashboardActionsProvider>
						)}
					/>

					<ModelDashboardModals
						isCreateWsOpen={isCreateWsOpen}
						setIsCreateWsOpen={setIsCreateWsOpen}
						handleWorkspaceChange={handleWorkspaceChange}
						setWsReloadKey={setWsReloadKey}
						isShareWsOpen={isShareWsOpen}
						currentWorkspace={currentWorkspace}
						setIsShareWsOpen={setIsShareWsOpen}
						isRenameWsOpen={isRenameWsOpen}
						setIsRenameWsOpen={setIsRenameWsOpen}
						handleRenameWorkspaceSuccess={handleRenameWorkspaceSuccess}
						isCopyWsOpen={isCopyWsOpen}
						setIsCopyWsOpen={setIsCopyWsOpen}
						handleCopyWorkspaceSuccess={handleCopyWorkspaceSuccess}
						moveModelModal={moveModelModal}
						currentWorkspaceId={currentWorkspace?.id ?? null}
						setMoveModelModal={setMoveModelModal}
						clearSelection={clearSelection}
						loadModels={loadModels}
						loadStats={loadStats}
						shareModal={shareModal}
						setShareModal={setShareModal}
						refetchModels={refetchModels}
						bulkCopyModal={bulkCopyModal}
						setBulkCopyModal={setBulkCopyModal}
						handleCopy={handleCopy}
						notification={notification}
						hideNotification={hideNotification}
					/>
				</div>
			</div>
		</Fragment>
	);
};
