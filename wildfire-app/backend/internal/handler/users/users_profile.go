package usershandler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"platform.local/common/pkg/httputil"
	applogger "platform.local/platform/logger"
	"spatialhub_backend/internal/services"
)

func (h *Handler) GetProfile(c *gin.Context) {
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return
	}
	userID, ok := httputil.MustGetUserID(c)
	if !ok {
		return
	}
	authToken := h.getAuthToken(sessionData)

	kcUser, err := h.userStore.GetUser(authToken, userID)
	if err != nil {
		applogger.ForComponent("users").Errorf("Failed to get current user %s: %v", userID, err)
		httputil.BadGateway(c, "fetch user failed")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id":           kcUser.ID,
		"name":         services.DeriveUserName(kcUser.Attributes, kcUser.Username, kcUser.Email),
		"email":        kcUser.Email,
		"access_level": h.userService.GetUserAccessLevel(authToken, userID, kcUser.Attributes),
	}})
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, ok := httputil.MustGetUserID(c)
	if !ok {
		return
	}

	var req struct {
		Name *string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request body")
		return
	}

	adminToken, err := h.adminAccessToken()
	if err != nil {
		applogger.ForComponent("users").Errorf("Error getting admin token: %v", err)
		httputil.InternalError(c, "Failed to authenticate with Keycloak")
		return
	}

	attributes := make(map[string][]string)
	if req.Name != nil {
		attributes["fullName"] = []string{*req.Name}
	}

	if len(attributes) > 0 {
		if err := h.userStore.UpdateUserAttributes(adminToken, userID, attributes); err != nil {
			applogger.ForComponent("users").Errorf("Error updating user profile: %v", err)
			httputil.InternalError(c, "Failed to update profile")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"data": gin.H{
			"name": req.Name,
		},
	})
}
