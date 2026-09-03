package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"spatialhub_backend/internal/events"
	"spatialhub_backend/internal/geoserver"
	resultservice "spatialhub_backend/internal/result/service"
	"spatialhub_backend/internal/services"
	"spatialhub_backend/internal/webservice"

	commonModels "platform.local/common/pkg/models"
	"platform.local/platform/logger"
)

const (
	TypeProcessResult          = "process_result"
	rasterOverviewBatchTimeout = 10 * time.Minute
)

type ProcessResultPayload struct {
	ModelID      uint   `json:"model_id"`
	UserID       string `json:"user_id"`
	UserEmail    string `json:"user_email"`
	Title        string `json:"title"`
	ZipPath      string `json:"zip_path"`
	WebserviceID *uint  `json:"webservice_id,omitempty"`
}

func HandleProcessResult(
	ctx context.Context,
	t *asynq.Task,
	db *gorm.DB,
	notificationService *services.NotificationService,
	wsClient *webservice.Client,
	geoClient geoserver.Client,
) (retErr error) {
	log := logger.ForComponent("job:process_result")

	// Log panics.
	defer func() {
		if r := recover(); r != nil {
			log.Errorf("PANIC in HandleProcessResult: %v", r)
			retErr = fmt.Errorf("panic in result processing: %v", r)
		}
	}()

	var payload ProcessResultPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	log.Debugf("Starting background processing for model_id=%d", payload.ModelID)

	// Idempotency check.
	var model commonModels.Model
	if err := db.First(&model, payload.ModelID).Error; err != nil {
		log.Errorf("Failed to fetch model %d: %v", payload.ModelID, err)
		return fmt.Errorf("failed to fetch model %d: %w", payload.ModelID, err)
	}

	var svcOpts []resultservice.Option
	if geoClient != nil {
		svcOpts = append(svcOpts, resultservice.WithGeoServerClient(geoClient))
	}
	resultSvc := resultservice.NewResultService(db, svcOpts...)

	if model.Status == commonModels.ModelStatusCompleted {
		log.Debugf("Model %d already completed", payload.ModelID)

		var existingResult commonModels.ModelResult
		if resultErr := db.Where("model_id = ?", payload.ModelID).
			Order("created_at DESC").First(&existingResult).Error; resultErr != nil {
			if !errors.Is(resultErr, gorm.ErrRecordNotFound) {
				log.Warnf("failed to load result for completed model model_id=%d err=%v", payload.ModelID, resultErr)
			}
			return nil
		}

		// Already released; skip.
		if model.WebserviceID != nil {
			releaseWebservice(ctx, wsClient, model.WebserviceID, payload.ModelID, log)
		}

		// Resume unfinished work.
		prepareAndConfigureResult(ctx, resultSvc, geoClient, &existingResult, payload.ModelID, log)
		return nil
	}

	// Resume same upload.
	var res *commonModels.ModelResult
	if model.Status == commonModels.ModelStatusProcessing {
		var existingResult commonModels.ModelResult
		resultErr := db.Where("model_id = ? AND zip_path = ?", payload.ModelID, payload.ZipPath).
			Order("created_at DESC").First(&existingResult).Error
		if resultErr == nil {
			res = &existingResult
			log.Debugf("Resuming result preparation for model_id=%d result_id=%d", payload.ModelID, res.ID)
		} else if !errors.Is(resultErr, gorm.ErrRecordNotFound) {
			return fmt.Errorf("failed to resume result for model_id=%d: %w", payload.ModelID, resultErr)
		}
	}

	if res == nil {
		// Claim the job.
		if err := db.Model(&model).Update("status", commonModels.ModelStatusProcessing).Error; err != nil {
			log.Errorf("Failed to lock model %d for processing: %v", payload.ModelID, err)
			return fmt.Errorf("failed to lock model %d for processing: %w", payload.ModelID, err)
		}

		var err error
		res, err = resultSvc.ProcessModelResult(ctx, payload.ModelID, payload.UserID, payload.ZipPath)
		if err != nil {
			log.Errorf("Failed to process result model_id=%d err=%v", payload.ModelID, err)

			now := time.Now().UTC()
			_ = db.Model(&commonModels.Model{}).Where("id = ?", payload.ModelID).Updates(map[string]interface{}{
				"status":                   commonModels.ModelStatusFailed,
				"calculation_completed_at": now,
				"updated_at":               now,
				"results": map[string]interface{}{
					"error": fmt.Sprintf("Failed to process result: %v", err),
				},
			}).Error

			releaseWebservice(ctx, wsClient, payload.WebserviceID, payload.ModelID, log)
			return fmt.Errorf("process result failed for model_id=%d: %w", payload.ModelID, err)
		}
	}

	if res == nil {
		return fmt.Errorf("process result returned nil for model_id=%d", payload.ModelID)
	}

	// Ready means fully prepared.
	releasedBeforePreparation := detachAndReleaseWebservice(
		ctx, db, wsClient, payload.WebserviceID, payload.ModelID, log,
	)
	prepareAndConfigureResult(ctx, resultSvc, geoClient, res, payload.ModelID, log)

	// Final success update.
	now := time.Now().UTC()
	completedEvent, _ := events.NewModelEvent(events.ModelCompleted, payload.ModelID, payload.UserID, nil)
	err := db.Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{
			"status": commonModels.ModelStatusCompleted,
			"results": map[string]interface{}{
				"file_path":  res.ZipPath,
				"output_dir": res.ExtractedPath,
			},
			"webservice_id":            nil,
			"calculation_completed_at": now,
			"updated_at":               now,
		}
		// Fallback for pre-migration runs.
		if model.CalculationQueuedAt == nil && model.CalculationStartedAt != nil {
			updates["calculation_queued_at"] = model.CalculationStartedAt
		}
		if uerr := tx.Model(&commonModels.Model{}).Where("id = ?", payload.ModelID).Updates(updates).Error; uerr != nil {
			return uerr
		}
		return events.EnqueueTx(tx, completedEvent)
	})

	if err != nil {
		log.Errorf("Failed to commit final model status model_id=%d err=%v", payload.ModelID, err)
		return err
	}

	if !releasedBeforePreparation {
		releaseWebservice(ctx, wsClient, payload.WebserviceID, payload.ModelID, log)
	}

	// Send completion notification
	if notificationService != nil {
		if err := notificationService.SendModelCompletionNotification(
			ctx,
			payload.UserID,
			payload.UserEmail,
			payload.Title,
			payload.ModelID,
			"completed",
		); err != nil {
			log.Errorf("failed to send completion notification model_id=%d err=%v", payload.ModelID, err)
		}
	}

	log.Debugf("Successfully processed result for model_id=%d result_id=%d", payload.ModelID, res.ID)
	return nil
}

func prepareAndConfigureResult(
	ctx context.Context,
	resultSvc *resultservice.ResultService,
	geoClient geoserver.Client,
	result *commonModels.ModelResult,
	modelID uint,
	log *logrus.Entry,
) {
	if resultSvc.NeedsRasterOverviews(result) {
		overviewCtx, cancelOverviews := context.WithTimeout(ctx, rasterOverviewBatchTimeout)
		err := resultSvc.PrepareRasterOverviews(overviewCtx, result)
		cancelOverviews()
		if err != nil {
			log.Warnf("failed to prepare one or more raster overviews model_id=%d result_id=%d err=%v", modelID, result.ID, err)
		}
	}

	if geoClient == nil || result.GeoserverStatus == commonModels.ResultGeoserverConfigured {
		return
	}
	if geoErr := resultSvc.ConfigureGeoServer(ctx, result.ID); geoErr != nil {
		log.Warnf("geoserver configuration failed model_id=%d result_id=%d err=%v", modelID, result.ID, geoErr)
	}
}

// detachAndReleaseWebservice: retry-safe release.
func detachAndReleaseWebservice(
	ctx context.Context,
	db *gorm.DB,
	wsClient *webservice.Client,
	webserviceID *uint,
	modelID uint,
	log *logrus.Entry,
) bool {
	if wsClient == nil || webserviceID == nil {
		return true
	}
	res := db.Model(&commonModels.Model{}).
		Where("id = ? AND webservice_id = ?", modelID, *webserviceID).
		Update("webservice_id", nil)
	if res.Error != nil {
		log.Warnf("failed to detach webservice before result preparation model_id=%d webservice_id=%d err=%v",
			modelID, *webserviceID, res.Error)
		return false
	}
	if res.RowsAffected == 0 {
		return true
	}
	releaseWebservice(ctx, wsClient, webserviceID, modelID, log)
	return true
}

func releaseWebservice(ctx context.Context, wsClient *webservice.Client, webserviceID *uint, modelID uint, log *logrus.Entry) {
	if wsClient == nil || webserviceID == nil {
		return
	}
	if err := wsClient.ReleaseInstance(ctx, *webserviceID); err != nil {
		log.Warnf("failed to release webservice model_id=%d webservice_id=%d err=%v", modelID, *webserviceID, err)
	} else {
		log.Debugf("released webservice model_id=%d webservice_id=%d", modelID, *webserviceID)
	}
}
