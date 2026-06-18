# Workspace Module

Shared library that owns everything related to **workspaces** and **groups**:
HTTP services, Zustand store, display utilities, and UI (selector + modals).

## Public API

All public exports live in `index.ts`. Import via the barrel:

```ts
import {
    workspaceService,
    groupService,
    useWorkspaceStore,
    WorkspaceSelector,
    CreateWorkspaceModal,
    MoveModelModal,
    ShareWorkspaceModal,
    RenameWorkspaceModal,
    CopyWorkspaceModal,
    getGroupDisplayName,
    getGroupFullDisplayName,
    getGroupDisplayPath,
    formatGroupName,
    ensureDefaultWorkspace,
    type Workspace,
    type Group,
} from '@/components/workspace';
```

### Services

- `workspaceService` — CRUD + member/group management for workspaces.
- `groupService` — CRUD + member queries against Keycloak-backed groups.

Both extend `BaseApiService` and route requests through the central axios client.

### Store

- `useWorkspaceStore` — Zustand store holding the currently selected workspace
  and the user's workspace list. Use this to read/select active workspace.

### Components

- `WorkspaceSelector` — dropdown switcher placed in the app header.
- `CreateWorkspaceModal`, `RenameWorkspaceModal`, `CopyWorkspaceModal` —
  lifecycle modals.
- `ShareWorkspaceModal` — invite users / groups.
- `MoveModelModal` — move a model between workspaces.

### Utilities

- `getGroupDisplayName(group)` — short human name.
- `getGroupFullDisplayName(group)` — full path-qualified name.
- `getGroupDisplayPath(group)` — slash-delimited group hierarchy.
- `formatGroupName(name)` — sanitize a raw group name.
- `ensureDefaultWorkspace()` — bootstrap the user's default workspace if missing.

### Types

- `Workspace` — server-side workspace shape (id, name, members, groups, ...).
- `Group` — Keycloak group shape (id, name, path, attributes).

## Rules

- **Do not** import from `@/components/workspace/services/*`,
  `@/components/workspace/utils/*`, `@/components/workspace/store/*`, or any
  deep path directly. Those are internal; the barrel is the contract.
- Deep imports that still exist in the codebase are legacy and should be
  migrated opportunistically.
- New features needing a workspace-aware behavior should either:
  1. Read the active workspace from `useWorkspaceStore`, or
  2. Accept a `workspaceId` prop / context value from their caller.

## Adding new public exports

Any new symbol intended for cross-feature use must be re-exported from
`index.ts` with a one-line explanation in this README. Symbols not exported
from the barrel are considered private to this module.
