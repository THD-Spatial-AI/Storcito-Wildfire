package resultservice

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	commonModels "platform.local/common/pkg/models"
	"platform.local/platform/logger"
)

func (s *ResultService) ConfigureGeoServer(ctx context.Context, resultID uint) (err error) {
	log := logger.ForComponent("result.geoserver")

	defer func() {
		if r := recover(); r != nil {
			log.Errorf("PANIC in ConfigureGeoServer result_id=%d: %v", resultID, r)
			err = fmt.Errorf("panic configuring geoserver: %v", r)
			s.markGeoserverFailed(resultID, fmt.Sprintf("panic: %v", r))
		}
	}()

	if s.geo == nil {
		log.Debugf("geoserver client not configured; skipping configuration result_id=%d", resultID)
		return nil
	}

	if err := s.markGeoserverProcessing(resultID); err != nil {
		log.Warnf("failed to set geoserver_status=processing result_id=%d err=%v", resultID, err)
	}

	if err := s.geo.ConfigureLayer(ctx, resultID); err != nil {
		msg := truncateError(err.Error(), 500)
		log.Errorf("geoserver configure failed result_id=%d err=%v", resultID, err)
		s.markGeoserverFailed(resultID, msg)
		err = fmt.Errorf("configure layer: %w", err)
		return err
	}

	log.Debugf("geoserver layer configured result_id=%d", resultID)
	return nil
}

// DeleteGeoServerLayer is a best-effort helper invoked during result
// cleanup. It never returns an error — layer cleanup must never block
// database cleanup — but it does log.
func (s *ResultService) DeleteGeoServerLayer(ctx context.Context, resultID uint) {
	if s.geo == nil {
		return
	}
	log := logger.ForComponent("result.geoserver")
	if err := s.geo.DeleteLayer(ctx, resultID); err != nil {
		log.Warnf("failed to delete geoserver layer result_id=%d err=%v", resultID, err)
	}
}

func (s *ResultService) markGeoserverProcessing(resultID uint) error {
	return s.db.Model(&commonModels.ModelResult{}).
		Where("id = ?", resultID).
		Updates(map[string]interface{}{
			"geoserver_status": commonModels.ResultGeoserverProcessing,
			"error_message":    "",
		}).Error
}

func (s *ResultService) markGeoserverFailed(resultID uint, message string) {
	err := s.db.Model(&commonModels.ModelResult{}).
		Where("id = ?", resultID).
		Updates(map[string]interface{}{
			"geoserver_status": commonModels.ResultGeoserverFailed,
			"error_message":    message,
		}).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		logger.ForComponent("result.geoserver").
			Warnf("failed to mark geoserver_status=failed result_id=%d err=%v", resultID, err)
	}
}

func truncateError(msg string, max int) string {
	if len(msg) <= max {
		return msg
	}
	return msg[:max] + "…"
}
