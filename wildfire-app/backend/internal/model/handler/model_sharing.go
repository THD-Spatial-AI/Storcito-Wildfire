package model

import (
	"time"

	"spatialhub_backend/internal/api/contracts"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"
	"platform.local/platform/logger"

	"github.com/gin-gonic/gin"
)

func (h *ModelHandler) MoveModel(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	model, id, ok := h.getOwnedModelFromParam(c, userCtx.UserID)
	if !ok {
		return
	}

	var req contracts.MoveModelRequest

	if !bindJSONOrBadRequest(c, &req) {
		return
	}

	if req.WorkspaceID != nil {
		if !h.ensureWorkspaceAccess(c, userCtx.UserID, *req.WorkspaceID, "Access denied to target workspace") {
			return
		}
	}

	if err := h.store.Update(model, map[string]interface{}{"workspace_id": req.WorkspaceID}); err != nil {
		httputil.InternalError(c, "Failed to move model")
		return
	}

	model.WorkspaceID = req.WorkspaceID

	h.respondWithPreloadedModel(c, id, model)
}

func (h *ModelHandler) BulkMoveModels(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	var req contracts.BulkMoveModelsRequest

	if !bindJSONOrBadRequest(c, &req) {
		return
	}

	if len(req.ModelIDs) == 0 {
		httputil.BadRequest(c, "No models specified")
		return
	}

	if req.WorkspaceID != nil {
		if !h.ensureWorkspaceAccess(c, userCtx.UserID, *req.WorkspaceID, "Access denied to target workspace") {
			return
		}
	}

	modelsList, err := h.store.FindByIDs(req.ModelIDs)
	if err != nil {
		httputil.InternalError(c, "Failed to load models")
		return
	}

	if len(modelsList) == 0 {
		httputil.NotFound(c, "No models found")
		return
	}

	successCount := 0
	failedCount := 0

	isExpert := userCtx.AccessLevel == constants.AccessLevelExpert

	for i := range modelsList {
		if !modelsList[i].IsOwner(userCtx.UserID) && !isExpert {
			failedCount++
			continue
		}

		if err := h.store.Update(&modelsList[i], map[string]interface{}{"workspace_id": req.WorkspaceID}); err != nil {
			failedCount++
			continue
		}

		successCount++
	}

	httputil.SuccessResponse(c, contracts.BulkMoveModelsResponse{
		SuccessCount: successCount,
		FailedCount:  failedCount,
		Total:        len(modelsList),
	})
}

func (h *ModelHandler) ShareModel(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	model, _, ok := h.getOwnedModelFromParam(c, userCtx.UserID)
	if !ok {
		return
	}

	var req contracts.ShareModelRequest
	if !bindJSONOrBadRequest(c, &req) {
		return
	}

	permission, ok := validateSharePermission(c, req.Permission)
	if !ok {
		return
	}

	if !h.validateModelNotAlreadyAccessible(c, model, req.Email) {
		return
	}

	share := models.ModelShare{
		ModelID:    model.ID,
		UserID:     h.newModelService().FindUserIDByEmail(req.Email),
		Email:      req.Email,
		Permission: permission,
		SharedBy:   userCtx.UserID,
		SharedAt:   time.Now().UTC(),
	}

	if err := h.store.CreateModelShare(&share); err != nil {
		logger.WithFields(map[string]interface{}{
			"component": "share_model",
			"model_id":  model.ID,
			"email":     req.Email,
			"error":     err.Error(),
		}).Error("Failed to create model share")
		httputil.InternalError(c, "Failed to share model")
		return
	}

	logger.WithFields(map[string]interface{}{
		"component":        "share_model",
		"model_id":         model.ID,
		"shared_with":      req.Email,
		"resolved_user_id": share.UserID,
		"permission":       permission,
	}).Info("Model shared successfully")

	// Notify the recipient (email + in-app notification bar). Best-effort: a
	// notification failure must not fail the share itself.
	if h.notificationService != nil {
		sharedByName := userCtx.Name
		if sharedByName == "" {
			sharedByName = userCtx.Email
		}
		if err := h.notificationService.SendModelSharedNotification(
			c.Request.Context(),
			share.UserID,
			req.Email,
			model.Title,
			sharedByName,
			permission,
		); err != nil {
			logger.WithFields(map[string]interface{}{
				"component": "share_model",
				"model_id":  model.ID,
				"email":     req.Email,
				"error":     err.Error(),
			}).Warn("Failed to send share notification")
		}
	}

	httputil.Created(c, share)
}
