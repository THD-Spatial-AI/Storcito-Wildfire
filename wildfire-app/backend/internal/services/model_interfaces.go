package services

import (
	"context"

	"spatialhub_backend/internal/events"
	backendModels "spatialhub_backend/internal/models"

	"gorm.io/gorm"
	commonModels "platform.local/common/pkg/models"
)

// ModelStore captures the persistence operations the model handler uses.
type ModelStore interface {
	DB() *gorm.DB

	// Basic CRUD
	FindByID(id string) (*commonModels.Model, error)
	FindByIDPreloaded(id string) (*commonModels.Model, error)
	Create(modelMap map[string]interface{}) error
	Update(model *commonModels.Model, updates map[string]interface{}) error
	PatchByID(modelID uint, updates map[string]interface{}) error
	TransitionStatus(modelID uint, from []string, to string, extra map[string]interface{}) (bool, error)
	TransitionStatusTx(modelID uint, from []string, to string, extra map[string]interface{}, ev *events.OutboxEvent) (bool, error)
	FindActiveModels() ([]commonModels.Model, error)
	HardDelete(model *commonModels.Model) error
	UpdateParentModelID(modelID uint) error

	// Queries / counts
	CountByUserID(userID string) (int64, error)
	CountByUserIDGrouped(userID string) (int64, map[string]int64, error)
	FindByIDs(ids []uint) ([]commonModels.Model, error)
	FindModelWithWorkspace(modelIDParam string) (*commonModels.Model, error)
	GetModelLimit(accessLevel string) (*backendModels.ModelLimit, error)

	// Sharing
	CreateModelShare(share *commonModels.ModelShare) error
	FindModelShareByModelAndEmail(modelID uint, email string) (*commonModels.ModelShare, error)
	CountModelSharesByModelAndUser(modelID uint, userID string) int64
	CountModelSharesByModelAndUserOrEmail(modelID uint, userID, email string) int64
	PluckSharedModelIDsByUser(userID string) []uint
	IsWorkspaceSharedWithUser(workspaceID uint, email string) bool
	IsWorkspaceSharedWithUserGroups(workspaceID uint, groupIDs []string) bool

	// Workspace access
	CountWorkspaceOwner(workspaceID uint, userID string) int64
	CountWorkspaceMember(workspaceID uint, userID string) int64
	CountWorkspaceGroupAccess(workspaceID uint, groupIDs []string) int64
	FindWorkspaceByIDSelect(workspaceID uint) (*commonModels.Workspace, error)
	UpdateWorkspaceUserID(ws *commonModels.Workspace, userID string) error
	PluckOwnedWorkspaceIDs(workspaceIDs []uint, userID string) []uint
	PluckMemberWorkspaceIDs(workspaceIDs []uint, userID string) []uint
	PluckGroupWorkspaceIDs(workspaceIDs []uint, groupIDs []string) []uint
	GetDefaultWorkspace(userID string) (*commonModels.Workspace, error)
	SyncWorkspaceMemberUserID(userID, email string)
	FindUserIDByEmail(email string) string
}

type WebserviceClient interface {
	ReleaseInstance(ctx context.Context, webserviceID uint) error
}
