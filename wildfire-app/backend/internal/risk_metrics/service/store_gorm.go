package riskmetricsservice

import (
	"context"
	"errors"

	"gorm.io/gorm"

	commonModels "platform.local/common/pkg/models"
)

// GormResultStore is the production ResultStore backed by GORM.
type GormResultStore struct {
	db *gorm.DB
}

// NewGormResultStore constructs a ResultStore.
func NewGormResultStore(db *gorm.DB) *GormResultStore {
	return &GormResultStore{db: db}
}

// LatestConfiguredResult returns the most recent model result whose
// GeoServer layer has been configured.
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

// PreviousConfiguredResult returns the result immediately preceding
// excludeResultID for the given model.
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
