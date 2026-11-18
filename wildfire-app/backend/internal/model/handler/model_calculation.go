package model

import (
	"strings"

	"platform.local/common/pkg/httputil"

	"github.com/gin-gonic/gin"
)

func (h *ModelHandler) StartCalculation(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	modelSvc := h.newModelService()
	// Quiet day switch
	quiet := c.Query("notify") == "false"
	updated, err := modelSvc.StartCalculation(c.Request.Context(), userCtx.UserID, userCtx.AccessLevel, c.Param("id"), h.asynqClient, quiet)
	if err != nil {
		msg := err.Error()
		switch {
		case strings.Contains(msg, "not found"):
			httputil.NotFound(c, errModelNotFound)
		case strings.Contains(msg, "access denied"):
			httputil.Forbidden(c, "Access denied")
		case strings.Contains(msg, "already in progress"):
			httputil.Conflict(c, "Model calculation already in progress")
		case strings.Contains(msg, "webservice"):
			httputil.BadGateway(c, "Calculation webservice error")
		default:
			httputil.InternalError(c, "Failed to start calculation")
		}
		return
	}

	httputil.SuccessResponse(c, updated)
}
