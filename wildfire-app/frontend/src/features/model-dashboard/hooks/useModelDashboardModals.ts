import { useCallback, useState } from "react";

import type { Model } from "@/features/model-dashboard/services/modelService";
import { type Workspace, workspaceService } from "@/components/workspace";

interface ShareModalState {
	isOpen: boolean;
	model: Model | null;
}

interface MoveModelModalState {
	isOpen: boolean;
	model: Model | null;
	models?: Model[];
}

interface BulkCopyModalState {
	isOpen: boolean;
	models: Model[];
}

interface UseModelDashboardModalsParams {
	currentWorkspace: Workspace | null;
	selectedModels: Model[];
	canUserDeleteModel: (model: Model) => boolean;
	setCurrentWorkspace: (workspace: Workspace | null) => void;
	onWorkspaceChange: (workspace: Workspace | null) => void;
	loadModels: () => Promise<void>;
	loadStats: () => Promise<void>;
	confirm: (options: {
		type: "delete";
		itemType: string;
		itemName: string;
		description: string;
		onConfirm: () => Promise<void>;
	}) => Promise<void>;
	showSuccess: (message: string) => void;
	showError: (message: string) => void;
}

/** Dashboard modal state. */
export function useModelDashboardModals({
	currentWorkspace,
	selectedModels,
	canUserDeleteModel,
	setCurrentWorkspace,
	onWorkspaceChange,
	loadModels,
	loadStats,
	confirm,
	showSuccess,
	showError,
}: UseModelDashboardModalsParams) {
	const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
	const [isShareWsOpen, setIsShareWsOpen] = useState(false);
	const [isRenameWsOpen, setIsRenameWsOpen] = useState(false);
	const [isCopyWsOpen, setIsCopyWsOpen] = useState(false);
	const [wsReloadKey, setWsReloadKey] = useState(0);

	const [shareModal, setShareModal] = useState<ShareModalState>({
		isOpen: false,
		model: null,
	});

	const [moveModelModal, setMoveModelModal] = useState<MoveModelModalState>({
		isOpen: false,
		model: null,
	});

	const [bulkCopyModal, setBulkCopyModal] = useState<BulkCopyModalState>({
		isOpen: false,
		models: [],
	});

	const handleCopyWorkspaceSuccess = useCallback(async (copiedWorkspace: Workspace, sourceWorkspace: Workspace) => {
		try {
			// Reload workspace list.
			setWsReloadKey((k) => k + 1);
			// Switch workspace.
			onWorkspaceChange(copiedWorkspace);
			await loadModels();
			await loadStats();

			showSuccess(`Workspace "${copiedWorkspace.name}" created successfully with all models copied from "${sourceWorkspace.name}".`);
		} catch (error) {
			if (import.meta.env.DEV) console.error("Failed to load copied workspace:", error);
			showError("Workspace copied but failed to load. Please refresh the page.");
		}
	}, [onWorkspaceChange, loadModels, loadStats, showSuccess, showError]);

	const handleRenameWorkspaceSuccess = useCallback(async (updatedWorkspace: Workspace) => {
		try {
			// Update the current workspace
			setCurrentWorkspace(updatedWorkspace);
			setWsReloadKey((k) => k + 1);

			showSuccess(`Workspace renamed to "${updatedWorkspace.name}" successfully.`);
		} catch (error) {
			if (import.meta.env.DEV) console.error("Failed to update workspace:", error);
			showError("Workspace renamed but failed to refresh. Please reload the page.");
		}
	}, [setCurrentWorkspace, showSuccess, showError]);

	const handleDeleteWorkspace = useCallback(async () => {
		if (!currentWorkspace) return;

		await confirm({
			type: "delete",
			itemType: "workspace",
			itemName: currentWorkspace.name,
			description: `This will permanently delete the workspace "${currentWorkspace.name}" and all models in it. This action cannot be undone.`,
			onConfirm: async () => {
				try {
					await workspaceService.deleteWorkspace(currentWorkspace.id);
					// Load default workspace.
					const defaultWorkspace = await workspaceService.getDefaultWorkspace();
					onWorkspaceChange(defaultWorkspace);
					setWsReloadKey((k) => k + 1);
					await loadStats();
				} catch (error) {
					if (import.meta.env.DEV) console.error("Failed to delete workspace:", error);
					alert("Failed to delete workspace. Please try again.");
				}
			}
		});
	}, [currentWorkspace, confirm, onWorkspaceChange, loadStats]);

	const handleShare = useCallback((model: Model) => {
		setShareModal({
			isOpen: true,
			model,
		});
	}, []);

	const handleMoveToWorkspace = useCallback((model: Model) => {
		// Blur before hiding.
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		setMoveModelModal({
			isOpen: true,
			model,
		});
	}, []);

	const handleBulkMoveToWorkspace = useCallback(() => {
		// Blur before hiding.
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		const ownedModels = selectedModels.filter((model) => canUserDeleteModel(model));

		// Exclude moved parents.
		const modelsToMove = ownedModels.filter(model => {
			// Has selected child?
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

	const handleBulkCopy = useCallback(() => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		setBulkCopyModal({
			isOpen: true,
			models: [...selectedModels],
		});
	}, [selectedModels]);

	return {
		isCreateWsOpen,
		setIsCreateWsOpen,
		isShareWsOpen,
		setIsShareWsOpen,
		isRenameWsOpen,
		setIsRenameWsOpen,
		isCopyWsOpen,
		setIsCopyWsOpen,
		wsReloadKey,
		setWsReloadKey,
		shareModal,
		setShareModal,
		moveModelModal,
		setMoveModelModal,
		bulkCopyModal,
		setBulkCopyModal,
		handleCopyWorkspaceSuccess,
		handleRenameWorkspaceSuccess,
		handleDeleteWorkspace,
		handleShare,
		handleMoveToWorkspace,
		handleBulkMoveToWorkspace,
		handleBulkCopy,
	};
}

export type ModelDashboardModalsApi = ReturnType<typeof useModelDashboardModals>;
