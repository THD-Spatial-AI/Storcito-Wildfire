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

// getResultFromRequest fetches the result for the :id param with access validation for current user
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

// fetchResultWithAccess fetches a result by ID and validates user access
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
