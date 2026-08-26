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

	// Recover from panics so we get a proper error log instead of silent crash
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

	// Idempotency Check: Ensure we aren't already processing or finished
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

		// The completion path already released the webservice and cleared the
		// id on the model. Releasing the payload id again would decrement a
		// concurrency slot that another model has since taken.
		if model.WebserviceID != nil {
			releaseWebservice(ctx, wsClient, model.WebserviceID, payload.ModelID, log)
		}

		// Resume whatever the first pass left unfinished. An overview batch
		// that ran out of time still leaves the layer configured, so the
		// GeoServer status alone cannot tell us this result is done.
		prepareAndConfigureResult(ctx, resultSvc, geoClient, &existingResult, payload.ModelID, log)
		return nil
	}

	// 2. Mark as 'processing' to prevent concurrent worker interference
	if err := db.Model(&model).Update("status", commonModels.ModelStatusProcessing).Error; err != nil {
		log.Errorf("Failed to lock model %d for processing: %v", payload.ModelID, err)
		return fmt.Errorf("failed to lock model %d for processing: %w", payload.ModelID, err)
	}

	res, err := resultSvc.ProcessModelResult(ctx, payload.ModelID, payload.UserID, payload.ZipPath)

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

	if res == nil {
		return fmt.Errorf("process result returned nil for model_id=%d", payload.ModelID)
	}

	// 3. Final success update; the model.completed event commits in the same transaction.
	now := time.Now().UTC()
	completedEvent, _ := events.NewModelEvent(events.ModelCompleted, payload.ModelID, payload.UserID, nil)
	err = db.Transaction(func(tx *gorm.DB) error {
		if uerr := tx.Model(&commonModels.Model{}).Where("id = ?", payload.ModelID).Updates(map[string]interface{}{
			"status": commonModels.ModelStatusCompleted,
			"results": map[string]interface{}{
				"file_path":  res.ZipPath,
				"output_dir": res.ExtractedPath,
			},
			"webservice_id":            nil,
			"calculation_completed_at": now,
			"updated_at":               now,
		}).Error; uerr != nil {
			return uerr
		}
		return events.EnqueueTx(tx, completedEvent)
	})

	if err != nil {
		log.Errorf("Failed to commit final model status model_id=%d err=%v", payload.ModelID, err)
		return err
	}

	releaseWebservice(ctx, wsClient, payload.WebserviceID, payload.ModelID, log)

	prepareAndConfigureResult(ctx, resultSvc, geoClient, res, payload.ModelID, log)

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
