package result

import (
	"errors"
	"fmt"

	"platform.local/common/pkg/httputil"
	commonModels "platform.local/common/pkg/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"spatialhub_backend/internal/access"
)

// fetches result id
func (h *ResultHandler) getResultFromRequest(c *gin.Context) (*commonModels.ModelResult, bool) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return nil, false
	}
	resultID := c.Param("id")
	result, ok := h.fetchResultWithAccess(c, userCtx, parseUint(resultID))
	if !ok {
		return nil, false
	}
	return result, true
}

// fetches result id
func (h *ResultHandler) fetchResultWithAccess(c *gin.Context, userCtx *httputil.UserContext, resultID uint) (*commonModels.ModelResult, bool) {
	result, err := h.store.GetResultByID(resultID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httputil.NotFound(c, "Result not found")
		} else {
			httputil.InternalError(c, "Failed to fetch result")
		}
		return nil, false
	}

	if !h.ensureModelAccess(c, userCtx, result.ModelID) {
		return nil, false
	}

	return result, true
}

func (h *ResultHandler) ensureModelAccess(c *gin.Context, userCtx *httputil.UserContext, modelID uint) bool {
	_, err := access.EnsureModelAccess(h.store, userCtx, modelID)
	if err == nil {
		return true
	}

	switch {
	case errors.Is(err, access.ErrModelNotFound):
		httputil.NotFound(c, errModelNotFound)
	case errors.Is(err, access.ErrForbidden):
		httputil.Forbidden(c, errAccessDenied)
	default:
		httputil.InternalError(c, "Failed to verify model access")
	}
	return false
}

// user model access
func (h *ResultHandler) authorizedModel(c *gin.Context) (*commonModels.Model, string, bool) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return nil, "", false
	}
	modelID := c.Param("id")
	model, ok := h.fetchModelByID(c, modelID)
	if !ok || !h.userHasModelAccess(c, model, userCtx) {
		return nil, "", false
	}
	return model, modelID, true
}

func (h *ResultHandler) fetchModelByID(c *gin.Context, modelID string) (*commonModels.Model, bool) {
	model, err := h.store.GetModelByIDStr(modelID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			httputil.NotFound(c, errModelNotFound)
		} else {
			httputil.InternalError(c, errFailedToFetchModel)
		}
		return nil, false
	}
	return model, true
}

func (h *ResultHandler) userHasModelAccess(c *gin.Context, model *commonModels.Model, userCtx *httputil.UserContext) bool {
	return h.ensureModelAccess(c, userCtx, model.ID)
}

func (h *ResultHandler) fetchResults(c *gin.Context, modelID string) ([]commonModels.ModelResult, error) {
	results, err := h.store.GetModelResults(parseUint(modelID))
	if err != nil {
		httputil.InternalError(c, "Failed to fetch results")
		return nil, err
	}
	return results, nil
}
func parseUint(s string) uint {
	var val uint
	n := 0
	if _, err := fmt.Sscanf(s, "%d", &n); err == nil && n > 0 {
		val = uint(n)
	}
	return val
}
