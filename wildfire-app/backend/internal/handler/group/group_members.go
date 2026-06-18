package group

import (
	"context"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	applogger "platform.local/platform/logger"

	"github.com/gin-gonic/gin"
)

func (h *GroupHandler) GetGroupMembers(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if userCtx.AccessLevel != constants.AccessLevelExpert {
		httputil.Forbidden(c, "Only experts can view group members")
		return
	}

	id := c.Param("id")

	members, err := h.groups.GetGroupMembers(c.Request.Context(), id)
	if err != nil {
		httputil.InternalError(c, errFailedFetchGroupMembers)
		return
	}

	httputil.SuccessResponse(c, members)
}

func (h *GroupHandler) AddMember(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if !h.requireExpertOrManagerAccess(c, userCtx, "add group members") {
		return
	}

	groupID, req, ok := h.parseAddMemberRequest(c)
	if !ok {
		return
	}

	ctx := c.Request.Context()
	userGroups, err := h.groups.GetUserGroups(ctx, req.UserID)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch user's groups")
		return
	}

	targetUserIsManager := h.checkTargetUserIsManager(ctx, req.UserID)

	if userCtx.AccessLevel == constants.AccessLevelManager {
		if !h.validateManagerCanAddMember(c, ctx, userCtx, groupID, userGroups) {
			return
		}
	}

	removed, _ := h.removeUserFromOtherGroups(ctx, req.UserID, groupID, userGroups, targetUserIsManager)

	if err := h.groups.AddUserToGroup(ctx, req.UserID, groupID); err != nil {
		applogger.ForComponent("group").Errorf("Failed to add user %s to group %s: %v", req.UserID, groupID, err)
		httputil.InternalError(c, "Failed to add member")
		return
	}

	h.handleUserSessionAfterGroupChange(c, ctx, userCtx.UserID, req.UserID, groupID)

	httputil.SuccessResponse(c, gin.H{
		"message":         "User moved successfully.",
		"removed_from":    removed,
		"logged_out":      req.UserID != userCtx.UserID,
		"user_id":         req.UserID,
		"requires_reload": req.UserID != userCtx.UserID,
	})
}

func (h *GroupHandler) parseAddMemberRequest(c *gin.Context) (string, struct {
	UserID string `json:"user_id" binding:"required"`
}, bool) {
	groupID := c.Param("id")
	var req struct {
		UserID string `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, errInvalidRequestData)
		return "", req, false
	}
	return groupID, req, true
}

func (h *GroupHandler) handleUserSessionAfterGroupChange(c *gin.Context, ctx context.Context, currentUserID, targetUserID, groupID string) {
	shouldLogout := targetUserID != currentUserID
	if shouldLogout {
		h.logoutUserAfterGroupChange(ctx, targetUserID)
	} else {
		sessionID := httputil.GetSessionCookieOrEmpty(c)
		if sessionID != "" {
			if err := h.authClient.UpdateSessionGroup(ctx, sessionID, groupID); err != nil {
				applogger.ForComponent("group").Warnf("Failed to update session group: %v", err)
			}
		}
	}
}

// checkTargetUserIsManager checks if the target user has manager access level
func (h *GroupHandler) checkTargetUserIsManager(ctx context.Context, userID string) bool {
	return h.groups.IsUserManager(ctx, userID)
}

// validateManagerCanAddMember validates if a manager can add a member to a group
func (h *GroupHandler) validateManagerCanAddMember(c *gin.Context, ctx context.Context, userCtx *httputil.UserContext, groupID string, userGroups []KeycloakGroup) bool {
	mgrGroupSet, err := h.groups.GetManagerGroupSet(ctx, userCtx.UserID)
	if err != nil {
		httputil.Forbidden(c, "Failed to validate manager groups")
		return false
	}

	if !mgrGroupSet[groupID] {
		httputil.Forbidden(c, "You can only assign users to your own groups")
		return false
	}

	manageable := false
	for _, ug := range userGroups {
		if mgrGroupSet[ug.ID] {
			manageable = true
			break
		}
	}

	if !manageable {
		httputil.Forbidden(c, "You can only manage users in your groups")
		return false
	}

	return true
}

// removeUserFromOtherGroups removes user from all groups except the target group
func (h *GroupHandler) removeUserFromOtherGroups(ctx context.Context, userID, targetGroupID string, userGroups []KeycloakGroup, targetUserIsManager bool) (removed, failed int) {
	for _, ug := range userGroups {
		if ug.ID == targetGroupID {
			continue
		}

		// Preserve manager's default groups
		if targetUserIsManager && h.groups.IsDefaultGroup(ug.Name) {
			continue
		}

		if err := h.groups.RemoveUserFromGroup(ctx, userID, ug.ID); err != nil {
			applogger.ForComponent("group").Warnf("Failed to remove user %s from group %s (%s): %v", userID, ug.ID, ug.Name, err)
			failed++
		} else {
			removed++
		}
	}

	return removed, failed
}

// logoutUserAfterGroupChange logs out user from Keycloak and backend sessions
func (h *GroupHandler) logoutUserAfterGroupChange(ctx context.Context, userID string) {
	if err := h.groups.LogoutUser(ctx, userID); err != nil {
		applogger.ForComponent("group").Errorf("Failed to logout user from Keycloak %s: %v", userID, err)
	}

	if err := h.deleteUserSessions(ctx, userID); err != nil {
		applogger.ForComponent("group").Warnf("Failed to delete backend sessions for user %s: %v", userID, err)
	}
}

func (h *GroupHandler) RemoveMember(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if !h.requireExpertOrManagerAccess(c, userCtx, "remove group members") {
		return
	}

	groupID := c.Param("id")
	userID := c.Param("memberID")
	ctx := c.Request.Context()

	if userCtx.AccessLevel == constants.AccessLevelManager {
		if !h.validateManagerCanRemoveMember(c, ctx, userCtx, groupID, userID) {
			return
		}
	}

	if !h.validateCanRemoveFromGroup(c, ctx, groupID) {
		return
	}

	if err := h.groups.RemoveUserFromGroup(ctx, userID, groupID); err != nil {
		httputil.InternalError(c, "Failed to remove member")
		return
	}

	httputil.SuccessResponse(c, gin.H{"message": "Member removed successfully"})
}

// validateManagerCanRemoveMember validates if manager can remove a member
func (h *GroupHandler) validateManagerCanRemoveMember(c *gin.Context, ctx context.Context, userCtx *httputil.UserContext, groupID, userID string) bool {
	mgrGroupSet, err := h.groups.GetManagerGroupSet(ctx, userCtx.UserID)
	if err != nil {
		httputil.Forbidden(c, "Failed to validate manager groups")
		return false
	}

	if !mgrGroupSet[groupID] {
		httputil.Forbidden(c, "You can only remove members from your own groups")
		return false
	}

	userGroups, err := h.groups.GetUserGroups(ctx, userID)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch user's groups")
		return false
	}

	for _, ug := range userGroups {
		if mgrGroupSet[ug.ID] {
			return true
		}
	}

	httputil.Forbidden(c, "You can only manage users in your groups")
	return false
}

// validateCanRemoveFromGroup checks if user can be removed from this group
func (h *GroupHandler) validateCanRemoveFromGroup(c *gin.Context, ctx context.Context, groupID string) bool {
	g, err := h.groups.GetGroup(ctx, groupID)
	if err != nil {
		return true // Allow if can't fetch group
	}

	if h.groups.IsDefaultGroup(g.Name) {
		httputil.Forbidden(c, "Cannot remove users from Default group")
		return false
	}

	return true
}

// Helper methods for reducing cognitive complexity
