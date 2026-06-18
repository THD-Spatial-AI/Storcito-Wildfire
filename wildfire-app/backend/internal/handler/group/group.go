package group

import (
	"context"
	"fmt"

	"platform.local/common/pkg/authclient"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	authplatform "platform.local/platform/auth"
	applogger "platform.local/platform/logger"
	platformsession "platform.local/platform/session"

	"spatialhub_backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	errInvalidRequestData      = "Invalid request data"
	errFailedFetchGroupMembers = "Failed to fetch group members"
)

type GroupHandler struct {
	authClient *authclient.Client
	groups     services.GroupService
}

func NewGroupHandler(db *gorm.DB, adminTokenProvider *authplatform.AdminTokenProvider, keycloakBaseURL, realm string, sessionStore platformsession.SessionStore) *GroupHandler {
	return &GroupHandler{
		authClient: authclient.NewClient(),
		groups:     services.NewGroupServiceFromConfig(db, adminTokenProvider, keycloakBaseURL, realm),
	}
}

// deleteUserSessions calls auth-service to delete all sessions for a user
func (h *GroupHandler) deleteUserSessions(ctx context.Context, userID string) error {
	return h.authClient.DeleteUserSessions(ctx, userID)
}

func (h *GroupHandler) validateManagerGroupAccess(c *gin.Context, userCtx *httputil.UserContext, groupID string) bool {
	if err := h.groups.CanManageGroup(c.Request.Context(), userCtx, groupID); err != nil {
		applogger.ForComponent("group").Warnf("Manager access denied: user_id=%s group_id=%s err=%v", userCtx.UserID, groupID, err)
		httputil.Forbidden(c, "You can only manage your own groups")
		return false
	}
	return true
}

func (h *GroupHandler) EnsureDefaultGroup(ctx context.Context) error {
	_, err := h.groups.EnsureGroupByName(ctx, "Default")
	return err
}

type KeycloakGroup = services.Group

func requireExpertOrManager(c *gin.Context) (*httputil.UserContext, bool) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return nil, false
	}

	if userCtx.AccessLevel != constants.AccessLevelExpert && userCtx.AccessLevel != constants.AccessLevelManager {
		httputil.Forbidden(c, "Only experts and managers can view groups")
		return nil, false
	}

	return userCtx, true
}

func (h *GroupHandler) requireExpertOrManagerAccess(c *gin.Context, userCtx *httputil.UserContext, action string) bool {
	if userCtx.AccessLevel != constants.AccessLevelExpert && userCtx.AccessLevel != constants.AccessLevelManager {
		httputil.Forbidden(c, fmt.Sprintf("Only experts and managers can %s", action))
		return false
	}
	return true
}
