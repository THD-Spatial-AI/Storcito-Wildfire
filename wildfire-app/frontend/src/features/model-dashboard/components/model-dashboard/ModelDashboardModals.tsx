import { CreateWorkspaceModal } from "@/components/workspace";
import { ShareWorkspaceModal } from "@/components/workspace";
import { RenameWorkspaceModal, CopyWorkspaceModal } from "@/components/workspace";
import { MoveModelModal } from "@/components/workspace";
import { ShareModelModal } from "@/features/model-dashboard/components/ShareModelModal";
import { BulkCopyModal } from "@/features/model-dashboard/components/BulkCopyModal";
import Notification from "@/components/ui/Notification";
import type { Model } from "@/features/model-dashboard/services/modelService";
import type { Workspace } from "@/components/workspace";

interface ModelDashboardModalsProps {
	isCreateWsOpen: boolean;
	setIsCreateWsOpen: (open: boolean) => void;
	handleWorkspaceChange: (workspace: Workspace | null) => void;
	setWsReloadKey: React.Dispatch<React.SetStateAction<number>>;
	isShareWsOpen: boolean;
	currentWorkspace: Workspace | null;
	setIsShareWsOpen: (open: boolean) => void;
	isRenameWsOpen: boolean;
	setIsRenameWsOpen: (open: boolean) => void;
	handleRenameWorkspaceSuccess: (workspace: Workspace) => void;
	isCopyWsOpen: boolean;
	setIsCopyWsOpen: (open: boolean) => void;
	handleCopyWorkspaceSuccess: (workspace: Workspace, source: Workspace) => void | Promise<void>;
	moveModelModal: { isOpen: boolean; model: Model | null; models?: Model[] };
	currentWorkspaceId: number | null;
	setMoveModelModal: (state: { isOpen: boolean; model: Model | null; models?: Model[] }) => void;
	clearSelection: () => void;
	loadModels: () => Promise<unknown>;
	loadStats: () => Promise<unknown>;
	shareModal: { isOpen: boolean; model: Model | null };
	setShareModal: (state: { isOpen: boolean; model: Model | null }) => void;
	refetchModels: () => unknown;
	bulkCopyModal: { isOpen: boolean; models: Model[] };
	setBulkCopyModal: (state: { isOpen: boolean; models: Model[] }) => void;
	handleCopy: (model: Model) => void | Promise<void>;
	notification: { open: boolean; message: string; severity: "success" | "error" | "warning" | "info" };
	hideNotification: () => void;
}

export function ModelDashboardModals({
	isCreateWsOpen, setIsCreateWsOpen, handleWorkspaceChange, setWsReloadKey, isShareWsOpen, currentWorkspace, setIsShareWsOpen, isRenameWsOpen, setIsRenameWsOpen, handleRenameWorkspaceSuccess, isCopyWsOpen, setIsCopyWsOpen, handleCopyWorkspaceSuccess, moveModelModal, currentWorkspaceId, setMoveModelModal, clearSelection, loadModels, loadStats, shareModal, setShareModal, refetchModels, bulkCopyModal, setBulkCopyModal, handleCopy, notification, hideNotification,
}: ModelDashboardModalsProps) {
	return (
		<>
					<CreateWorkspaceModal
						isOpen={isCreateWsOpen}
						onClose={() => setIsCreateWsOpen(false)}
						onSuccess={(newWorkspace) => {
							setIsCreateWsOpen(false);
							handleWorkspaceChange(newWorkspace);
							setWsReloadKey((k) => k + 1);
						}}
					/>
					<ShareWorkspaceModal
						isOpen={isShareWsOpen}
						workspace={currentWorkspace}
						onClose={() => setIsShareWsOpen(false)}
						onUpdated={() => setWsReloadKey((k) => k + 1)}
					/>
					<RenameWorkspaceModal
						isOpen={isRenameWsOpen}
						workspace={currentWorkspace}
						onClose={() => setIsRenameWsOpen(false)}
						onSuccess={handleRenameWorkspaceSuccess}
					/>
					<CopyWorkspaceModal
						isOpen={isCopyWsOpen}
						workspace={currentWorkspace}
						onClose={() => setIsCopyWsOpen(false)}
						onSuccess={handleCopyWorkspaceSuccess}
					/>


					<MoveModelModal
						isOpen={moveModelModal.isOpen}
						model={moveModelModal.model}
						models={moveModelModal.models}
						currentWorkspaceId={currentWorkspaceId}
						onClose={() => setMoveModelModal({ isOpen: false, model: null })}
						onSuccess={async () => {
							clearSelection();
							await loadModels();
							await loadStats();
							setMoveModelModal({ isOpen: false, model: null });
						}}
					/>

			<ShareModelModal
				isOpen={shareModal.isOpen}
				model={shareModal.model}
				onClose={() => setShareModal({ isOpen: false, model: null })}
				onSuccess={() => { refetchModels(); }}
			/>

			<BulkCopyModal
				isOpen={bulkCopyModal.isOpen}
				models={bulkCopyModal.models}
				onClose={() => setBulkCopyModal({ isOpen: false, models: [] })}
				onCopy={async (model) => { await handleCopy(model); }}
				onSuccess={() => {
					clearSelection();
				}}
			/>

			<Notification
				isOpen={notification.open}
				message={notification.message}
				severity={notification.severity}
				onClose={hideNotification}
			/>
		</>
	);
}
