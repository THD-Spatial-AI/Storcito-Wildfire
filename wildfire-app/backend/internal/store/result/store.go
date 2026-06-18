package result

import (
"gorm.io/gorm"

commonModels "platform.local/common/pkg/models"
)

// Store encapsulates the generic database operations used by the result handler.
type Store struct {
db *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
return &Store{db: db}
}

func (s *Store) DB() *gorm.DB {
return s.db
}

func (s *Store) GetModelByIDStr(id string) (*commonModels.Model, error) {
var model commonModels.Model
if err := s.db.Where("id = ?", id).First(&model).Error; err != nil {
return nil, err
}
return &model, nil
}

func (s *Store) GetModelByIDWithWorkspace(id uint) (*commonModels.Model, error) {
var model commonModels.Model
if err := s.db.Preload("Workspace.Members").Preload("Workspace.Groups").
Where("id = ?", id).First(&model).Error; err != nil {
return nil, err
}
return &model, nil
}

func (s *Store) GetModelBySessionID(sessionID string) (*commonModels.Model, error) {
var model commonModels.Model
if err := s.db.Where("session_id = ?", sessionID).First(&model).Error; err != nil {
return nil, err
}
return &model, nil
}

func (s *Store) UpdateModel(model *commonModels.Model, updates map[string]interface{}) error {
return s.db.Model(model).Updates(updates).Error
}

func (s *Store) GetModelResults(modelID uint) ([]commonModels.ModelResult, error) {
var results []commonModels.ModelResult
if err := s.db.Where("model_id = ?", modelID).Order("created_at DESC").Find(&results).Error; err != nil {
return nil, err
}
return results, nil
}

func (s *Store) GetResultByID(id uint) (*commonModels.ModelResult, error) {
var result commonModels.ModelResult
if err := s.db.Preload("Model").First(&result, id).Error; err != nil {
return nil, err
}
return &result, nil
}

func (s *Store) GetUserGroupIDs(userID string) ([]string, error) {
var ids []string
if err := s.db.Model(&commonModels.GroupMember{}).
Where("user_id = ?", userID).
Pluck("group_id", &ids).Error; err != nil {
return nil, err
}
return ids, nil
}
