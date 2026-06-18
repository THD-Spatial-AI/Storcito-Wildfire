package feedback

import (
	"platform.local/common/pkg/httputil"
	feedbackstore "spatialhub_backend/internal/store/feedback"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const errInvalidFeedbackID = "Invalid feedback ID"

type FeedbackHandler struct {
	feedbackStore *feedbackstore.Store
}

func NewFeedbackHandler(db *gorm.DB) *FeedbackHandler {
	return &FeedbackHandler{feedbackStore: feedbackstore.NewStore(db)}
}

func parsePagination(c *gin.Context) feedbackstore.PaginationParams {
	params := httputil.ParsePagination(c, nil)
	return feedbackstore.PaginationParams{Page: params.Page, PerPage: params.PerPage}
}

func parseFilters(c *gin.Context) feedbackstore.Filters {
	filters := feedbackstore.Filters{
		Status:   c.Query("status"),
		Category: c.Query("category"),
		Priority: c.Query("priority"),
	}
	if userID := c.Query("user_id"); userID != "" {
		filters.UserID = &userID
	}
	return filters
}
