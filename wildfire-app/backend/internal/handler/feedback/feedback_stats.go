package feedback

import (
	"platform.local/common/pkg/httputil"

	"github.com/gin-gonic/gin"
)

// GetFeedbackStats returns feedback statistics
func (h *FeedbackHandler) GetFeedbackStats(c *gin.Context) {
	stats, err := h.feedbackStore.GetFeedbackStats()
	if err != nil {
		httputil.InternalError(c, "Failed to retrieve feedback statistics")
		return
	}
	httputil.SuccessResponse(c, stats)
}

// GetUserFeedback returns feedback for a specific user
func (h *FeedbackHandler) GetUserFeedback(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		httputil.BadRequest(c, "User ID is required")
		return
	}

	result, err := h.feedbackStore.GetUserFeedback(userID, parseFilters(c), parsePagination(c))
	if err != nil {
		httputil.InternalError(c, "Failed to retrieve user feedback")
		return
	}
	httputil.SuccessResponse(c, result)
}

// GetMyFeedback returns feedback for the currently authenticated user
func (h *FeedbackHandler) GetMyFeedback(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	result, err := h.feedbackStore.GetUserFeedback(userCtx.UserID, parseFilters(c), parsePagination(c))
	if err != nil {
		httputil.InternalError(c, "Failed to retrieve your feedback")
		return
	}
	httputil.SuccessResponse(c, result)
}
