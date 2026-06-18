package services

import "platform.local/common/pkg/models"

// WorkspaceService captures the workspace operations the workspace handler uses.
type WorkspaceService interface {
	SyncMemberUserID(userID, email string)
	FetchUserGroupIDs(userID string) []string
	LoadAccessibleWorkspaces(userCtxUserID, userCtxEmail, userCtxGroupID string, accessLevel string, groupIDs []string) ([]models.Workspace, error)
	FilterWorkspacesForPrivacy(workspaces []models.Workspace, userID, email string)
	GetWorkspace(id string) (*models.Workspace, error)
	UserHasAccessWithGroup(userID, groupID string, workspaceID uint) bool
	FilterMembersForUser(members []models.WorkspaceMember, userID, email string) []models.WorkspaceMember
	CreateWorkspace(name, description, ownerID, ownerEmail string) (*models.Workspace, error)
	UpdateWorkspace(workspace *models.Workspace, name *string, description *string) error
	CopyWorkspace(sourceWorkspace *models.Workspace, userID, userEmail, name, description string) (*models.Workspace, error)
	DeleteWorkspace(workspace *models.Workspace) error
	AddMember(workspaceID uint, email, userID string) (*models.WorkspaceMember, error)
	FindMember(workspaceID uint, email string) (*models.WorkspaceMember, error)
	FetchMemberByID(workspaceID uint, memberID string) (*models.WorkspaceMember, error)
	RemoveMember(member *models.WorkspaceMember) error
	CreateOrGetDefault(userID, email string) (*models.Workspace, error)
	FindUserIDByEmail(email string) string
	UserCanManageWorkspace(userID string, accessLevel string, groupID string, workspaceID uint) bool
	GetPreferredWorkspace(userID string) (*models.UserSetting, error)
	SetPreferredWorkspace(userID, email string, workspaceID *uint) (*models.UserSetting, error)
	AddGroup(workspaceID uint, groupID, groupName string) (*models.WorkspaceGroup, error)
	FindGroup(workspaceID uint, groupID string) (*models.WorkspaceGroup, error)
	RemoveGroup(workspaceGroup *models.WorkspaceGroup) error
}
