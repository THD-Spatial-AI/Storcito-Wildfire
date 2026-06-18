package usershandler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"spatialhub_backend/internal/services"
	usersstore "spatialhub_backend/internal/store/users"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	applogger "platform.local/platform/logger"
	platformsession "platform.local/platform/session"
)

func (h *Handler) validateUserWithAccess(c *gin.Context, require func(interface{}, *gin.Context) bool) (string, *platformsession.SessionData, string, bool) {
	id := c.Param("id")
	if id == "" {
		httputil.BadRequest(c, errIDRequired)
		return "", nil, "", false
	}
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return "", nil, "", false
	}
	if require != nil && !require(sessionData, c) {
		return "", nil, "", false
	}
	return id, sessionData, h.getAuthToken(sessionData), true
}

func (h *Handler) validateUserIDAndGetExpertSession(c *gin.Context) (string, *platformsession.SessionData, string, bool) {
	return h.validateUserWithAccess(c, httputil.RequireExpertAccess)
}

func (h *Handler) validateUserIDAndGetManagerSession(c *gin.Context) (string, *platformsession.SessionData, string, bool) {
	return h.validateUserWithAccess(c, httputil.RequireManagerOrExpertAccess)
}

func (h *Handler) ListUsers(c *gin.Context) {
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return
	}
	if !httputil.RequireManagerOrExpertAccess(sessionData, c) {
		return
	}

	pagination := httputil.ParsePagination(c, &httputil.PaginationOptions{DefaultPage: 1, DefaultPerPage: 10, MaxPerPage: 50})
	first := (pagination.Page - 1) * pagination.PerPage
	rawSearch := strings.TrimSpace(c.Query("search"))
	authToken := h.getAuthTokenWithRetry(sessionData)

	users, total, err := h.userService.ListUsers(c.Request.Context(), authToken, sessionData, first, pagination.PerPage, rawSearch)
	if err != nil {
		if strings.Contains(err.Error(), "401") && h.adminTokenProvider != nil {
			h.adminTokenProvider.Invalidate()
			authToken = h.getAuthTokenWithRetry(sessionData)
			users, total, err = h.userService.ListUsers(c.Request.Context(), authToken, sessionData, first, pagination.PerPage, rawSearch)
		}
		if err != nil {
			applogger.ForComponent("users").Errorf("Failed to list users: %v", err)
			httputil.BadGateway(c, errKeycloakRequestFailed)
			return
		}
	}

	h.markAPIAccess(users)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"data": users, "page": pagination.Page, "per_page": pagination.PerPage, "total": total}})
}

// markAPIAccess flags users that hold an active API token for the admin UI.
func (h *Handler) markAPIAccess(users []services.UserDTO) {
	ids := make([]string, 0, len(users))
	for i := range users {
		ids = append(ids, users[i].ID)
	}
	active, err := h.apiTokens.ActiveUserIDs(ids)
	if err != nil {
		applogger.ForComponent("api_token").Errorf("failed to check active tokens: %v", err)
		return
	}
	for i := range users {
		users[i].HasAPIAccess = active[users[i].ID]
	}
}

type createUserRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Name         string `json:"name" binding:"required"`
	Password     string `json:"password"`
	AccessLevel  string `json:"access_level"`
	Organization string `json:"organization"`
	Position     string `json:"position"`
	Phone        string `json:"phone"`
	GroupID      string `json:"group_id"`
}

func (h *Handler) CreateUser(c *gin.Context) {
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return
	}
	if !httputil.RequireManagerOrExpertAccess(sessionData, c) {
		return
	}

	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequestWithDetails(c, "invalid body", err.Error())
		return
	}
	if req.AccessLevel == "" {
		req.AccessLevel = "very_low"
	}

	authToken := h.getAuthToken(sessionData)
	if existing, err := h.userStore.FindUserByEmail(authToken, req.Email); err == nil && len(existing) > 0 {
		httputil.ErrorResponse(c, http.StatusConflict, "email already exists")
		return
	}

	createReq := usersstore.CreateUserRequest{Email: req.Email, Name: req.Name, Password: req.Password, AccessLevel: req.AccessLevel, Organization: req.Organization, Position: req.Position, Phone: req.Phone}
	userID, err := h.userStore.CreateUser(authToken, createReq)
	if err != nil {
		applogger.ForComponent("users").Errorf("create user failed email=%s err=%v", req.Email, err)
		httputil.BadGateway(c, "failed to create user")
		return
	}

	h.userService.SetUserPasswordIfProvided(authToken, userID, req.Email, req.Password)
	h.userService.AssignUserToGroup(c.Request.Context(), userID, req.GroupID, sessionData)
	httputil.Created(c, gin.H{"message": "user created"})
}

type updateUserRequest struct {
	Email         *string `json:"email"`
	Name          *string `json:"name"`
	AccessLevel   *string `json:"access_level"`
	Organization  *string `json:"organization"`
	Position      *string `json:"position"`
	Phone         *string `json:"phone"`
	EmailVerified *bool   `json:"email_verified"`
	Password      *string `json:"password"`
	ModelLimit    *int    `json:"model_limit"`
}

func handleUpdateUserError(c *gin.Context, id string, err error) {
	applogger.ForComponent("users").Errorf("update user id=%s err=%v", id, err)
	if strings.Contains(err.Error(), "conflict") || strings.Contains(err.Error(), "409") {
		httputil.ErrorResponse(c, http.StatusConflict, "conflict updating user")
	} else {
		httputil.BadGateway(c, "update failed")
	}
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.BadRequest(c, errIDRequired)
		return
	}

	authToken, ok := h.validateManagerUserAccess(c, id, "update")
	if !ok {
		return
	}

	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body", "details": err.Error()})
		return
	}

	if req.Email != nil && h.userService.IsEmailDuplicate(authToken, id, *req.Email) {
		httputil.ErrorResponse(c, http.StatusConflict, "email already exists")
		return
	}

	// Capture the access level before the update to determine if we need to sync groups after the update
	previousLevel := ""
	if req.AccessLevel != nil {
		if current, err := h.userStore.GetUser(authToken, id); err == nil {
			previousLevel = strings.ToLower(services.GetAttributeValue(current.Attributes, "access_level"))
		}
	}

	updateReq := usersstore.UpdateUserRequest{Email: req.Email, Name: req.Name, AccessLevel: req.AccessLevel, Organization: req.Organization, Position: req.Position, Phone: req.Phone, EmailVerified: req.EmailVerified, ModelLimit: req.ModelLimit}
	if err := h.userStore.UpdateUser(authToken, id, updateReq); err != nil {
		handleUpdateUserError(c, id, err)
		return
	}

	if req.AccessLevel != nil {
		newLevel := strings.ToLower(*req.AccessLevel)
		if newLevel != previousLevel {
			h.userService.SyncUserGroupsForAccessLevel(c.Request.Context(), authToken, id, newLevel)
		}
	}
	h.userService.UpdatePasswordIfProvided(authToken, id, req.Password)
	httputil.SuccessMessage(c, "user updated")
}

func (h *Handler) VerifyEmail(c *gin.Context) {
	id, _, authToken, ok := h.validateUserIDAndGetExpertSession(c)
	if !ok {
		return
	}
	verified := true
	updateReq := usersstore.UpdateUserRequest{EmailVerified: &verified}
	if err := h.userStore.UpdateUser(authToken, id, updateReq); err != nil {
		applogger.ForComponent("users").Errorf("verify email id=%s err=%v", id, err)
		httputil.BadGateway(c, "verify email failed")
		return
	}
	httputil.SuccessMessage(c, "email verified")
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.BadRequest(c, errIDRequired)
		return
	}
	authToken, ok := h.validateManagerUserAccess(c, id, "delete")
	if !ok {
		return
	}

	log := applogger.ForComponent("users")
	user, err := h.userStore.GetUser(authToken, id)
	if err != nil {
		log.Errorf("failed to fetch user before delete id=%s err=%v", id, err)
		httputil.BadGateway(c, "failed to fetch user")
		return
	}

	h.userService.CleanupUserGroups(c.Request.Context(), id)
	h.userService.CleanupUserDatabaseRecords(id, user.Email)
	if err := h.userStore.DeleteUser(authToken, id); err != nil {
		log.Errorf("delete user failed id=%s err=%v", id, err)
		httputil.BadGateway(c, "delete failed")
		return
	}
	if err := h.deleteUserSessions(c.Request.Context(), id); err != nil {
		log.Warnf("failed to delete sessions for user id=%s err=%v", id, err)
	}
	httputil.SuccessMessage(c, "user deleted")
}

func (h *Handler) setUserEnabledStatus(c *gin.Context, enabled bool) {
	action := "enable"
	if !enabled {
		action = "disable"
	}
	id := c.Param("id")
	if id == "" {
		httputil.BadRequest(c, errIDRequired)
		return
	}
	authToken, ok := h.validateManagerUserAccess(c, id, action)
	if !ok {
		return
	}
	if err := h.userStore.SetUserEnabled(authToken, id, enabled); err != nil {
		applogger.ForComponent("users").Errorf("%s user failed id=%s err=%v", action, id, err)
		httputil.BadGateway(c, fmt.Sprintf("%s failed", action))
		return
	}
	if !enabled {
		ctx := c.Request.Context()
		if err := h.kc.LogoutUser(ctx, id); err != nil {
			applogger.ForComponent("users").Warnf("Failed to logout user in Keycloak id=%s err=%v", id, err)
		}
		if err := h.deleteUserSessions(ctx, id); err != nil {
			applogger.ForComponent("users").Warnf("Failed to delete backend sessions id=%s err=%v", id, err)
		}
	}
	httputil.SuccessMessage(c, fmt.Sprintf("user %sd", action))
}

func (h *Handler) DisableUser(c *gin.Context) { h.setUserEnabledStatus(c, false) }
func (h *Handler) EnableUser(c *gin.Context)  { h.setUserEnabledStatus(c, true) }

func (h *Handler) GetUser(c *gin.Context) {
	id, sessionData, authToken, ok := h.validateUserIDAndGetManagerSession(c)
	if !ok {
		return
	}
	if sessionData.AccessLevel == constants.AccessLevelManager && !h.userService.CanManagerAccessUser(c.Request.Context(), sessionData.UserID, id) {
		httputil.ErrorResponse(c, http.StatusForbidden, "You can only view users in your groups")
		return
	}

	user, err := h.userStore.GetUser(authToken, id)
	if err != nil {
		applogger.ForComponent("users").Errorf("Failed to get user %s: %v", id, err)
		httputil.BadGateway(c, "fetch user failed")
		return
	}

	response := gin.H{
		"id":             user.ID,
		"name":           services.DeriveUserName(user.Attributes, user.Username, user.Email),
		"email":          user.Email,
		"email_verified": user.EmailVerified,
		"enabled":        user.Enabled,
		"organization":   services.GetAttributeValue(user.Attributes, "organization"),
		"position":       services.GetAttributeValue(user.Attributes, "position"),
		"phone":          services.GetAttributeValue(user.Attributes, "phone"),
		"access_level":   h.userService.GetUserAccessLevel(authToken, id, user.Attributes),
	}
	if modelLimitStr := services.GetAttributeValue(user.Attributes, "model_limit"); modelLimitStr != "" {
		if modelLimit, err := strconv.Atoi(modelLimitStr); err == nil {
			response["model_limit"] = modelLimit
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func (h *Handler) CountUsers(c *gin.Context) {
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return
	}
	if !httputil.RequireManagerOrExpertAccess(sessionData, c) {
		return
	}
	authToken := h.getAuthTokenWithRetry(sessionData)

	if sessionData.AccessLevel == constants.AccessLevelManager {
		count, err := h.userService.CountManagerUsers(c.Request.Context(), authToken, sessionData.UserID)
		if err != nil {
			if err.Error() == "failed to fetch manager groups" {
				httputil.InternalError(c, "failed to fetch manager groups")
			} else {
				applogger.ForComponent("users").Errorf("count users failed: %v", err)
				httputil.BadGateway(c, errKeycloakRequestFailed)
			}
			return
		}
		var online int64
		if h.sessionStore != nil {
			online, _ = h.sessionStore.CountActiveSessions(c.Request.Context())
		}
		httputil.SuccessResponse(c, gin.H{"total": count, "online": online})
		return
	}

	total, err := h.userStore.CountUsers(authToken, "")
	if err != nil {
		if strings.Contains(err.Error(), "401") && h.adminTokenProvider != nil {
			h.adminTokenProvider.Invalidate()
			authToken = h.getAuthTokenWithRetry(sessionData)
			total, err = h.userStore.CountUsers(authToken, "")
		}
		if err != nil {
			applogger.ForComponent("users").Errorf("count users failed: %v", err)
			httputil.BadGateway(c, errKeycloakRequestFailed)
			return
		}
	}
	var activeSessions int64
	if h.sessionStore != nil {
		activeSessions, _ = h.sessionStore.CountActiveSessions(c.Request.Context())
	}
	httputil.SuccessResponse(c, gin.H{"total": total, "online": activeSessions})
}

func (h *Handler) BulkDeleteUsers(c *gin.Context) {
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return
	}
	if !httputil.RequireExpertAccess(sessionData, c) {
		return
	}
	var req struct {
		IDs []string `json:"ids"`
	}
	if c.ShouldBindJSON(&req) != nil || len(req.IDs) == 0 {
		httputil.BadRequest(c, "ids required")
		return
	}
	deleted, failed := h.processBulkUserDeletions(c, req.IDs, h.getAuthToken(sessionData), applogger.ForComponent("users"))
	httputil.SuccessResponse(c, gin.H{"deleted": deleted, "failed": failed})
}

func (h *Handler) processBulkUserDeletions(c *gin.Context, userIDs []string, authToken string, log *logrus.Entry) (int, []string) {
	deleted := 0
	failed := make([]string, 0)
	for _, id := range userIDs {
		if err := h.deleteSingleUserInBulk(c, id, authToken, log); err != nil {
			log.Warnf("bulk delete failed for id=%s err=%v", id, err)
			failed = append(failed, id)
		} else {
			deleted++
		}
	}
	return deleted, failed
}

func (h *Handler) deleteSingleUserInBulk(c *gin.Context, userID string, authToken string, log *logrus.Entry) error {
	user, err := h.userStore.GetUser(authToken, userID)
	if err != nil {
		log.Warnf("bulk delete: failed to fetch user before delete id=%s err=%v", userID, err)
		return err
	}
	h.userService.CleanupUserGroups(c.Request.Context(), userID)
	h.userService.CleanupUserDatabaseRecords(userID, user.Email)
	if err := h.userStore.DeleteUser(authToken, userID); err != nil {
		return err
	}
	if err := h.deleteUserSessions(c.Request.Context(), userID); err != nil {
		log.Warnf("bulk delete: failed to delete sessions for user id=%s err=%v", userID, err)
	}
	return nil
}
