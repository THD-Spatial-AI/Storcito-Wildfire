package resultservice

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"spatialhub_backend/internal/geoserver"

	commonModels "platform.local/common/pkg/models"
	"platform.local/platform/logger"
)

// ResultService encapsulates result-file handling (extraction, cleanup)
// and — when configured with a GeoServer client — orchestrates
// publication of the raster output as a WMS layer.
type ResultService struct {
	db  *gorm.DB
	geo geoserver.Client
}

// Option configures a ResultService.
type Option func(*ResultService)

// WithGeoServerClient injects a GeoServer client used by
// ConfigureGeoServer and result cleanup.
func WithGeoServerClient(c geoserver.Client) Option {
	return func(s *ResultService) { s.geo = c }
}

// NewResultService constructs a ResultService. The GeoServer client is
// optional; when absent ConfigureGeoServer is a no-op.
func NewResultService(db *gorm.DB, opts ...Option) *ResultService {
	s := &ResultService{db: db}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

func (s *ResultService) ProcessModelResult(_ context.Context, modelID uint, userID, zipPath string) (result *commonModels.ModelResult, retErr error) {
	log := logger.ForComponent("result")

	defer func() {
		if r := recover(); r != nil {
			log.Errorf("PANIC in ProcessModelResult model_id=%d: %v", modelID, r)
			retErr = fmt.Errorf("panic in ProcessModelResult: %v", r)
		}
	}()

	zipStat, err := os.Stat(zipPath)
	if err != nil {
		log.Errorf("Zip file not found model_id=%d zip_path=%s err=%v", modelID, zipPath, err)
		return nil, fmt.Errorf("zip file not found: %w", err)
	}

	extractDir := filepath.Dir(zipPath)

	if err := s.extractZip(zipPath, extractDir); err != nil {
		log.Errorf("Failed to extract zip model_id=%d err=%v", modelID, err)
		return nil, fmt.Errorf("failed to extract zip: %w", err)
	}

	// Remove older extracted directories for this model to avoid storage growth.
	var existing []commonModels.ModelResult
	if err := s.db.Where("model_id = ?", modelID).Find(&existing).Error; err == nil {
		for _, prev := range existing {
			if prev.ExtractedPath != "" && prev.ExtractedPath != extractDir {
				if rmErr := os.RemoveAll(prev.ExtractedPath); rmErr != nil {
					log.Warnf("failed to delete stale extracted directory model_id=%d path=%s err=%v", modelID, prev.ExtractedPath, rmErr)
				}
			}
		}
	}

	if err := s.db.Where("model_id = ?", modelID).Delete(&commonModels.ModelResult{}).Error; err != nil {
		log.Warnf("Failed to delete existing model result model_id=%d err=%v", modelID, err)
	}

	tifPath, tifName := findTifFile(extractDir)

	result = &commonModels.ModelResult{
		ModelID:          modelID,
		UserID:           userID,
		ZipPath:          zipPath,
		ExtractedPath:    extractDir,
		TifFilePath:      tifPath,
		TifFileName:      tifName,
		FileSizeBytes:    zipStat.Size(),
		ExtractionStatus: commonModels.ResultExtractionCompleted,
	}

	if layers := findResultLayers(extractDir); len(layers) > 0 {
		if encoded, err := json.Marshal(layers); err != nil {
			log.Warnf("failed to encode result layers model_id=%d err=%v", modelID, err)
		} else {
			result.Layers = datatypes.JSON(encoded)
		}
	}

	if metadata := findResultMetadata(extractDir); len(metadata) > 0 {
		if encoded, err := json.Marshal(metadata); err != nil {
			log.Warnf("failed to encode result metadata model_id=%d err=%v", modelID, err)
		} else {
			result.Metadata = datatypes.JSON(encoded)
		}
	}

	if err := s.db.Create(result).Error; err != nil {
		log.Errorf("Failed to save result to database model_id=%d err=%v", modelID, err)
		return nil, fmt.Errorf("failed to save result: %w", err)
	}

	return result, nil
}
