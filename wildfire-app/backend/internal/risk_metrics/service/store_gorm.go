package riskmetricsservice

import (
	"context"
	"errors"

	"gorm.io/gorm"

	commonModels "platform.local/common/pkg/models"
)

// production resultstore backed
type GormResultStore struct {
	db *gorm.DB
}

// constructs resultstore
func NewGormResultStore(db *gorm.DB) *GormResultStore {
	return &GormResultStore{db: db}
}

// returns recent model
func (s *GormResultStore) LatestConfiguredResult(ctx context.Context, modelID uint) (*commonModels.ModelResult, error) {
	var r commonModels.ModelResult
	err := s.db.WithContext(ctx).
		Where("model_id = ? AND geoserver_status = ?", modelID, commonModels.ResultGeoserverConfigured).
		Order("created_at DESC").
		First(&r).Error
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// returns result immediately
func (s *GormResultStore) PreviousConfiguredResult(ctx context.Context, modelID, excludeResultID uint) (*commonModels.ModelResult, error) {
	var r commonModels.ModelResult
	err := s.db.WithContext(ctx).
		Where("model_id = ? AND geoserver_status = ? AND id <> ?", modelID, commonModels.ResultGeoserverConfigured, excludeResultID).
		Order("created_at DESC").
		First(&r).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &r, nil
}
