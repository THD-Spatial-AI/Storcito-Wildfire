package feedback

import (
	"strconv"
	"time"

	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"
	"spatialhub_backend/internal/api/contracts"

	"github.com/gin-gonic/gin"
)

var validFeedbackUpdateValues = map[string]map[string]bool{
	"status": {
		"pending":     true,
		"in_progress": true,
		"resolved":    true,
		"closed":      true,
	},
	"priority": {
		"low":      true,
		"medium":   true,
		"high":     true,
		"critical": true,
	},
}

func validFeedbackUpdateValue(field string, value *string) bool {
	if value == nil || *value == "" {
		return true
	}
	return validFeedbackUpdateValues[field][*value]
}

func validFeedbackCategory(category string) bool {
	validCategories := []string{"bug", "feature", "improvement", "general"}
	for _, v := range validCategories {
		if category == v {
			return true
		}
	}
	return false
}

// CreatePublicFeedback creates a new feedback entry without requiring authentication.
// Used by the landing page contact form.
func (h *FeedbackHandler) CreatePublicFeedback(c *gin.Context) {
	name := c.PostForm("name")
	email := c.PostForm("email")
	category := c.PostForm("category")
	subject := c.PostForm("subject")
	message := c.PostForm("message")

	if name == "" {
		httputil.BadRequest(c, "Name is required")
		return
	}
	if email == "" {
		httputil.BadRequest(c, "Email is required")
		return
	}
	if subject == "" {
		httputil.BadRequest(c, "Subject is required")
		return
	}
	if message == "" {
		httputil.BadRequest(c, "Message is required")
		return
	}

	if category == "" {
		category = "general"
	}
	if !validFeedbackCategory(category) {
		httputil.BadRequest(c, "Invalid category. Must be one of: bug, feature, improvement, general")
		return
	}

	feedback := &models.Feedback{
		UserID:    "guest",
		UserEmail: email,
		UserName:  name,
		Category:  category,
		Subject:   subject,
		Message:   message,
		Rating:    0,
	}

	if err := h.feedbackStore.CreateFeedback(feedback); err != nil {
		httputil.InternalError(c, "Failed to submit feedback")
		return
	}

	httputil.Created(c, gin.H{
		"message":  "Feedback submitted successfully",
		"feedback": feedback,
	})
}

// CreateFeedback creates a new feedback entry with optional image attachments
func (h *FeedbackHandler) CreateFeedback(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	category := c.PostForm("category")
	subject := c.PostForm("subject")
	message := c.PostForm("message")
	ratingStr := c.PostForm("rating")

	if category == "" {
		httputil.BadRequest(c, "Category is required")
		return
	}
	if !validFeedbackCategory(category) {
		httputil.BadRequest(c, "Invalid category. Must be one of: bug, feature, improvement, general")
		return
	}

	if subject == "" {
		httputil.BadRequest(c, "Subject is required")
		return
	}
	if message == "" {
		httputil.BadRequest(c, "Message is required")
		return
	}

	rating := 0
	if ratingStr != "" {
		var err error
		rating, err = strconv.Atoi(ratingStr)
		if err != nil || rating < 0 || rating > 5 {
			httputil.BadRequest(c, "Rating must be a number between 0 and 5")
			return
		}
	}

	feedback := &models.Feedback{
		UserID:    userCtx.UserID,
		UserEmail: userCtx.Email,
		UserName:  userCtx.Name,
		Category:  category,
		Subject:   subject,
		Message:   message,
		Rating:    rating,
	}

	fileHeaders := collectImageFileHeaders(c)
	if len(fileHeaders) > 0 {
		if !validateImageUploads(c, fileHeaders) {
			return
		}

		if err := h.feedbackStore.CreateFeedback(feedback); err != nil {
			httputil.InternalError(c, "Failed to create feedback")
			return
		}

		imageUpdate := h.buildImageUpdate(c, fileHeaders, feedback.ID)
		updates := imageUpdate.ToMap()
		if len(updates) > 0 {
			_ = h.feedbackStore.UpdateFeedback(feedback.ID, updates)
		}

		httputil.Created(c, gin.H{
			"message":  "Feedback submitted successfully",
			"feedback": feedback,
		})
		return
	}

	if err := h.feedbackStore.CreateFeedback(feedback); err != nil {
		httputil.InternalError(c, "Failed to create feedback")
		return
	}

	httputil.Created(c, gin.H{
		"message":  "Feedback submitted successfully",
		"feedback": feedback,
	})
}

// GetFeedbackList returns a paginated list of feedback
func (h *FeedbackHandler) GetFeedbackList(c *gin.Context) {
	result, err := h.feedbackStore.GetFeedbackList(parseFilters(c), parsePagination(c))
	if err != nil {
		httputil.InternalError(c, "Failed to retrieve feedback list")
		return
	}
	httputil.SuccessResponse(c, result)
}

// GetFeedbackByID returns a single feedback by ID
func (h *FeedbackHandler) GetFeedbackByID(c *gin.Context) {
	id, ok := httputil.ParseUintParam(c, "id", errInvalidFeedbackID)
	if !ok {
		return
	}

	feedback, err := h.feedbackStore.GetFeedbackByID(id)
	if err != nil {
		httputil.HandleError(c, err)
		return
	}
	httputil.SuccessResponse(c, feedback)
}

// UpdateFeedback updates feedback status and admin response
func (h *FeedbackHandler) UpdateFeedback(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if !httputil.RequireExpertAccessFromContext(userCtx, c) {
		return
	}

	id, ok := httputil.ParseUintParam(c, "id", errInvalidFeedbackID)
	if !ok {
		return
	}

	var req contracts.FeedbackUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequestWithDetails(c, "Invalid request", err.Error())
		return
	}
	if !validFeedbackUpdateValue("status", req.Status) {
		httputil.BadRequest(c, "Invalid status. Must be one of: pending, in_progress, resolved, closed")
		return
	}
	if !validFeedbackUpdateValue("priority", req.Priority) {
		httputil.BadRequest(c, "Invalid priority. Must be one of: low, medium, high, critical")
		return
	}

	adminUserID := userCtx.UserID
	if req.AdminResponse != nil {
		respondedAt := time.Now().UTC()
		req.RespondedAt = &respondedAt
		req.RespondedBy = &adminUserID
	}

	updates := req.ToMap()

	if len(updates) == 0 {
		httputil.BadRequest(c, "No valid fields to update")
		return
	}

	if err := h.feedbackStore.UpdateFeedback(id, updates); err != nil {
		httputil.HandleError(c, err)
		return
	}
	httputil.SuccessMessage(c, "Feedback updated successfully")
}

// DeleteFeedback removes a feedback entry
func (h *FeedbackHandler) DeleteFeedback(c *gin.Context) {
	id, ok := httputil.ParseUintParam(c, "id", errInvalidFeedbackID)
	if !ok {
		return
	}

	if err := h.feedbackStore.DeleteFeedback(id); err != nil {
		httputil.HandleError(c, err)
		return
	}
	httputil.SuccessMessage(c, "Feedback deleted successfully")
}
