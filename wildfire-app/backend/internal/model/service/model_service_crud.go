package modelservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"spatialhub_backend/internal/api/contracts"
	resultservice "spatialhub_backend/internal/result/service"
	"spatialhub_backend/internal/services"

	"platform.local/common/pkg/models"
	"platform.local/platform/logger"

	"gorm.io/datatypes"
)

const dateFormat = "2006-01-02"

var (
	ErrInvalidFromDate = errors.New("invalid from_date format")
	ErrInvalidToDate   = errors.New("invalid to_date format")
)

func (s *ModelService) CreateModel(userID, email string, req contracts.CreateModelRequest) (*models.Model, error) {
	model, modelMap, err := buildCreateModelPayload(userID, email, req)
	if err != nil {
		return nil, err
	}

	if err := s.store.Create(modelMap); err != nil {
		return nil, err
	}

	if idVal, ok := modelMap["id"]; ok {
		model.ID = extractModelID(idVal)
	}
	model.CreatedAt = modelMap["created_at"].(time.Time)
	model.UpdatedAt = modelMap["updated_at"].(time.Time)

	return model, nil
}

func (s *ModelService) BuildUpdateModelUpdates(req contracts.UpdateModelRequest, workspaceID *uint) (map[string]interface{}, error) {
	updates := req.ToMap()
	if err := applyDateUpdate(updates, "from_date", req.FromDate, ErrInvalidFromDate); err != nil {
		return nil, err
	}
	if err := applyDateUpdate(updates, "to_date", req.ToDate, ErrInvalidToDate); err != nil {
		return nil, err
	}
	if workspaceID != nil {
		updates["workspace_id"] = *workspaceID
	}
	if len(updates) > 0 {
		updates["updated_at"] = time.Now().UTC()
	}
	return updates, nil
}

func (s *ModelService) BuildModelStats(userID string, effectiveLimit int) (contracts.ModelStatsResponse, error) {
	stats := contracts.ModelStatsResponse{}
	total, byStatus, err := s.store.CountByUserIDGrouped(userID)
	if err != nil {
		return stats, err
	}

	stats.Total = total
	stats.Draft = byStatus[models.ModelStatusDraft]
	stats.Queue = byStatus[models.ModelStatusQueue]
	stats.Running = byStatus[models.ModelStatusRunning]
	stats.Completed = byStatus[models.ModelStatusCompleted]
	stats.Published = byStatus[models.ModelStatusPublished]
	stats.Failed = byStatus[models.ModelStatusFailed]
	stats.Cancelled = byStatus[models.ModelStatusCancelled]
	stats.ModelLimit = effectiveLimit
	stats.IsUnlimited = effectiveLimit == 0
	stats.Remaining = remainingModels(effectiveLimit, total)

	return stats, nil
}

func (s *ModelService) DeleteModel(ctx context.Context, model *models.Model, wsClient services.WebserviceClient) error {
	log := logger.ForComponent("model")

	if model.WebserviceID != nil && wsClient != nil && (model.Status == models.ModelStatusRunning || model.Status == models.ModelStatusQueue) {
		if err := wsClient.ReleaseInstance(ctx, *model.WebserviceID); err != nil {
			log.Warnf("failed to release webservice model_id=%d webservice_id=%d err=%v", model.ID, *model.WebserviceID, err)
		} else {
			log.Infof("released webservice on model delete model_id=%d webservice_id=%d", model.ID, *model.WebserviceID)
		}
	}

	if err := s.store.UpdateParentModelID(model.ID); err != nil {
		log.Warnf("failed to update child models parent_model_id for model_id=%d err=%v", model.ID, err)
	}

	resultService := resultservice.NewResultService(s.store.DB())
	if results, err := resultService.GetModelResults(ctx, model.ID); err == nil {
		for _, result := range results {
			if err := resultService.DeleteResult(ctx, result.ID); err != nil {
				log.Warnf("failed to delete result model_id=%d result_id=%d err=%v", model.ID, result.ID, err)
			}
		}
	}

	if err := s.store.HardDelete(model); err != nil {
		return fmt.Errorf("delete model: %w", err)
	}
	return nil
}

func buildCreateModelPayload(userID, email string, req contracts.CreateModelRequest) (*models.Model, map[string]interface{}, error) {
	fromDate, err := time.Parse(dateFormat, req.FromDate)
	if err != nil {
		return nil, nil, ErrInvalidFromDate
	}
	toDate, err := time.Parse(dateFormat, req.ToDate)
	if err != nil {
		return nil, nil, ErrInvalidToDate
	}

	isActive := req.IsActive != nil && *req.IsActive
	model := &models.Model{
		UserID:        userID,
		UserEmail:     email,
		WorkspaceID:   req.WorkspaceID,
		Title:         req.Title,
		Description:   req.Description,
		Status:        models.ModelStatusDraft,
		Region:        req.Region,
		Country:       req.Country,
		FromDate:      fromDate,
		ToDate:        toDate,
		GroupID:       req.GroupID,
		ParentModelID: req.ParentModelID,
		IsCopy:        req.IsCopy != nil && *req.IsCopy,
		IsActive:      isActive,
		Coordinates:   toJSONOrNull(req.Coordinates),
		Config:        toJSONOrNull(req.Config),
		Results:       datatypes.JSON([]byte("null")),
	}

	now := time.Now().UTC()
	return model, map[string]interface{}{
		"user_id":         model.UserID,
		"user_email":      model.UserEmail,
		"workspace_id":    model.WorkspaceID,
		"title":           model.Title,
		"description":     model.Description,
		"status":          model.Status,
		"region":          model.Region,
		"country":         model.Country,
		"from_date":       model.FromDate,
		"to_date":         model.ToDate,
		"group_id":        model.GroupID,
		"parent_model_id": model.ParentModelID,
		"is_copy":         model.IsCopy,
		"is_active":       model.IsActive,
		"coordinates":     model.Coordinates,
		"config":          model.Config,
		"results":         model.Results,
		"created_at":      now,
		"updated_at":      now,
	}, nil
}

func applyDateUpdate(updates map[string]interface{}, field string, raw *string, invalidDateErr error) error {
	if raw == nil {
		return nil
	}
	date, err := time.Parse(dateFormat, *raw)
	if err != nil {
		return invalidDateErr
	}
	updates[field] = date
	return nil
}

func remainingModels(effectiveLimit int, total int64) int {
	if effectiveLimit == 0 {
		return -1
	}
	remaining := effectiveLimit - int(total)
	if remaining < 0 {
		return 0
	}
	return remaining
}

func extractModelID(idVal interface{}) uint {
	switch v := idVal.(type) {
	case uint:
		return v
	case int:
		return uint(v)
	case int64:
		return uint(v)
	case float64:
		return uint(v)
	default:
		return 0
	}
}

func toJSONOrNull(raw json.RawMessage) datatypes.JSON {
	if len(raw) > 0 {
		return datatypes.JSON(raw)
	}
	return datatypes.JSON([]byte("null"))
}
