package services

import (
	"gorm.io/gorm"
	"platform.local/common/pkg/models"
	backendModels "spatialhub_backend/internal/models"
)

// SettingsStore captures the persistence operations the settings handler uses.
type SettingsStore interface {
	GetOrCreateUserSettings(userID, email string) (*models.UserSetting, error)
	SaveUserSettings(settings *models.UserSetting) error
	UpdateUserSettingsPartial(settings *models.UserSetting, updates map[string]interface{}) error
	DeleteUserSettings(userID string) error
	GetAllPolygonLimits() ([]backendModels.PolygonLimit, error)
	GetPolygonLimitByAccessLevel(level string) (*backendModels.PolygonLimit, error)
	UpsertPolygonLimit(tx *gorm.DB, accessLevel string, limit int) error
	BeginTx() *gorm.DB
	GetAllModelLimits() ([]backendModels.ModelLimit, error)
	GetModelLimitByAccessLevel(level string) (*backendModels.ModelLimit, error)
	UpsertModelLimit(tx *gorm.DB, accessLevel string, limit int) error
	CountUserModels(userID string) (int64, error)
}
