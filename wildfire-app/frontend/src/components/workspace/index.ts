/**
 * Workspace module — public API.
 *
 * Import workspace functionality through this barrel. Deep imports
 * into `@/components/workspace/*` subpaths are considered LEGACY and
 * should be migrated to this entry point.
 *
 * See README.md for usage notes.
 */

// Services
export { workspaceService } from './services/workspaceService';
export type { Workspace } from './services/workspaceService';
export { groupService } from './services/groupService';
export type { Group } from './services/groupService';

// Store
export { useWorkspaceStore } from './store/workspace-store';

// Utils — group display
export {
    getGroupDisplayName,
    getGroupFullDisplayName,
    getGroupDisplayPath,
    formatGroupName,
} from './utils/groupUtils';

// Utils — workspace lifecycle
export { ensureDefaultWorkspace } from './utils/workspaceUtils';

// UI Components
export { WorkspaceSelector } from './WorkspaceSelector';
export { CreateWorkspaceModal } from './CreateWorkspaceModal';
export { MoveModelModal } from './MoveModelModal';
export { ShareWorkspaceModal } from './ShareWorkspaceModal';
export { RenameWorkspaceModal, CopyWorkspaceModal } from './WorkspaceModals';
