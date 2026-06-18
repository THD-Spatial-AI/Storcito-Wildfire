package model

import (
	"context"
	"errors"
	"fmt"
	"time"

	"spatialhub_backend/internal/api/contracts"
	modelservice "spatialhub_backend/internal/model/service"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"
	"platform.local/platform/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (h *ModelHandler) CreateModel(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	if !h.ensureModelLimit(c, userCtx.UserID, userCtx.AccessLevel) {
		return
	}

	var req contracts.CreateModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}
	if req.WorkspaceID != nil && !h.ensureWorkspaceAccess(c, userCtx.UserID, *req.WorkspaceID, errAccessDeniedWorkspace) {
		return
	}

	model, err := h.newModelService().CreateModel(userCtx.UserID, userCtx.Email, req)
	if err != nil {
		h.handleModelServiceError(c, err, "Failed to create model")
		return
	}

	httputil.Created(c, model)
}

func (h *ModelHandler) GetModels(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	ctx := c.Request.Context()
	h.syncWorkspaceMembership(ctx, userCtx.UserID, userCtx.Email)
	limit, offset, search, workspaceIDStr, sortBy, sortOrder := parseGetModelsParams(c)

	query, ok := h.buildQueryWithWorkspaceFilter(c, userCtx, workspaceIDStr, limit, offset)
	if !ok {
		return
	}
	query = h.applySearchFilter(query, search)

	modelsList, total, err := h.fetchModelsWithQuery(query, limit, offset, sortBy, sortOrder)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch models")
		return
	}

	modelsList = h.includeParentModels(modelsList)
	modelsList = h.postProcessModelWorkspacesBatch(ctx, userCtx, modelsList)
	modelsList = h.applyPrivacyFilters(*userCtx, modelsList)
	h.populateChildModelIDs(modelsList)
	h.populateParentModelTitles(modelsList)

	c.JSON(200, gin.H{"success": true, "data": modelsList, "total": total, "limit": limit, "offset": offset, "server_time": time.Now().UTC().Format(time.RFC3339)})
}

func (h *ModelHandler) GetModel(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var model models.Model
	err := h.store.DB().Preload(preloadWorkspaceMembers).Preload(preloadWorkspaceGroups).Preload("ParentModel").Preload("Shares").Where(sqlWhereID, id).First(&model).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			httputil.NotFound(c, errModelNotFound)
		} else {
			httputil.InternalError(c, errFailedToFetchModel)
		}
		return
	}

	if userCtx.AccessLevel != constants.AccessLevelExpert && !h.newModelService().UserHasModelAccessByEmail(userCtx.UserID, userCtx.Email, &model) {
		httputil.Forbidden(c, errAccessDenied)
		return
	}

	h.handleSharedModelWorkspace(userCtx.UserID, &model)
	h.filterModelShares(&model, userCtx.UserID, userCtx.Email)
	h.filterWorkspaceData(&model, userCtx.UserID, userCtx.Email)
	h.populateChildModelIDsForModel(&model)
	h.populateParentModelTitleForModel(&model)
	httputil.SuccessResponse(c, model)
}

func (h *ModelHandler) UpdateModel(c *gin.Context) {
	userCtx, model, id, ok := h.getEditableModelWithContext(c)
	if !ok {
		return
	}

	var req contracts.UpdateModelRequest
	if !bindJSONOrBadRequest(c, &req) {
		return
	}
	if req.WorkspaceID != nil && !h.ensureWorkspaceAccess(c, userCtx.UserID, *req.WorkspaceID, errAccessDeniedWorkspace) {
		return
	}

	updates, err := h.newModelService().BuildUpdateModelUpdates(req, req.WorkspaceID)
	if err != nil {
		h.handleModelServiceError(c, err, "Failed to update model")
		return
	}
	if len(updates) > 0 {
		if err := h.store.Update(model, updates); err != nil {
			logger.ForComponent("model").Errorf("failed to update model id=%s err=%v", id, err)
			httputil.InternalError(c, "Failed to update model")
			return
		}
	}

	h.respondWithPreloadedModel(c, id, model)
}

func (h *ModelHandler) DeleteModel(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	model, ok := h.fetchModelWithDeletePermission(c, userCtx, c.Param("id"))
	if !ok {
		return
	}
	if err := h.newModelService().DeleteModel(c.Request.Context(), model, h.wsClient); err != nil {
		httputil.InternalError(c, "Failed to delete model")
		return
	}

	httputil.SuccessMessage(c, "Model deleted")
}

func (h *ModelHandler) GetModelStats(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	effectiveLimit := h.getEffectiveModelLimitForUser(c.Request.Context(), userCtx.UserID, userCtx.AccessLevel)
	stats, err := h.newModelService().BuildModelStats(userCtx.UserID, effectiveLimit)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch model stats")
		return
	}
	httputil.SuccessResponse(c, stats)
}

func (h *ModelHandler) UpdateModelActivation(c *gin.Context) {
	_, model, id, ok := h.getEditableModelWithContext(c)
	if !ok {
		return
	}

	var req contracts.UpdateModelActivationRequest
	if !bindJSONOrBadRequest(c, &req) {
		return
	}
	if err := h.store.Update(model, req.ToMap()); err != nil {
		httputil.InternalError(c, "Failed to update activation status")
		return
	}

	h.respondWithPreloadedModel(c, id, model)
}

func (h *ModelHandler) ensureModelLimit(c *gin.Context, userID, accessLevel string) bool {
	effectiveLimit, currentUsage, limitReached := h.checkModelLimit(c.Request.Context(), userID, accessLevel)
	if limitReached {
		httputil.Forbidden(c, fmt.Sprintf("%s. You have %d/%d models.", errModelLimitReached, currentUsage, effectiveLimit))
		return false
	}
	return true
}

func (h *ModelHandler) syncWorkspaceMembership(ctx context.Context, userID, email string) {
	if h.syncCache != nil && h.syncCache.HasSynced(ctx, userID) {
		return
	}
	h.newModelService().SyncWorkspaceMemberUserID(userID, email)
	if h.syncCache != nil {
		_ = h.syncCache.MarkSynced(ctx, userID)
	}
}

func (h *ModelHandler) handleModelServiceError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, modelservice.ErrInvalidFromDate):
		httputil.BadRequest(c, "Invalid from_date format. Use YYYY-MM-DD")
	case errors.Is(err, modelservice.ErrInvalidToDate):
		httputil.BadRequest(c, "Invalid to_date format. Use YYYY-MM-DD")
	default:
		logger.ForComponent("model").Errorf("%s: %v", fallback, err)
		httputil.InternalError(c, fallback)
	}
}
