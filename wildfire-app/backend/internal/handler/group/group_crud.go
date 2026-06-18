package group

import (
	"context"
	"errors"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	applogger "platform.local/platform/logger"

	"spatialhub_backend/internal/services"

	"github.com/gin-gonic/gin"
)

func (h *GroupHandler) GetMyGroup(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	groups, err := h.groups.GetUserGroups(c.Request.Context(), userCtx.UserID)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch user groups")
		return
	}

	if len(groups) > 0 {
		httputil.SuccessResponse(c, groups[0])
	} else {
		httputil.SuccessResponse(c, gin.H{"name": "Default"})
	}
}

func (h *GroupHandler) GetGroups(c *gin.Context) {
	userCtx, ok := requireExpertOrManager(c)
	if !ok {
		return
	}

	groups, err := h.groups.FetchGroupsByAccessLevel(c.Request.Context(), userCtx)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch groups")
		return
	}

	httputil.SuccessResponse(c, groups)
}

func (h *GroupHandler) GetGroup(c *gin.Context) {
	userCtx, ok := requireExpertOrManager(c)
	if !ok {
		return
	}

	id := c.Param("id")
	if id == "" {
		httputil.BadRequest(c, "group id required")
		return
	}
	if userCtx.AccessLevel == constants.AccessLevelManager {
		mgrSet, err := h.groups.GetManagerGroupSet(c.Request.Context(), userCtx.UserID)
		if err != nil || !mgrSet[id] {
			httputil.Forbidden(c, "You can only view your own groups")
			return
		}
	}
	g, err := h.groups.GetGroup(c.Request.Context(), id)
	if err != nil {
		httputil.InternalError(c, "Failed to fetch group")
		return
	}
	disabled := false
	if vals, ok := g.Attributes["disabled"]; ok && len(vals) > 0 && (vals[0] == "true" || vals[0] == "1") {
		disabled = true
	}
	httputil.SuccessResponse(c, gin.H{
		"id":         g.ID,
		"name":       g.Name,
		"path":       g.Path,
		"attributes": g.Attributes,
		"disabled":   disabled,
	})
}

func (h *GroupHandler) CreateGroup(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if userCtx.AccessLevel != constants.AccessLevelExpert && userCtx.AccessLevel != constants.AccessLevelManager {
		httputil.Forbidden(c, "Only experts and managers can create groups")
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, errInvalidRequestData)
		return
	}

	groupID, err := h.groups.CreateGroup(c.Request.Context(), req.Name)
	if err != nil {
		httputil.InternalError(c, "Failed to create group")
		return
	}
	if userCtx.AccessLevel == constants.AccessLevelManager && groupID != "" {
		_ = h.groups.AddUserToGroup(c.Request.Context(), userCtx.UserID, groupID)
	}

	httputil.SuccessResponse(c, gin.H{"message": "Group created successfully"})
}

func (h *GroupHandler) UpdateGroup(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if !h.requireExpertOrManagerAccess(c, userCtx, "update groups") {
		return
	}

	id := c.Param("id")
	if userCtx.AccessLevel == constants.AccessLevelManager && !h.validateManagerGroupAccess(c, userCtx, id) {
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, errInvalidRequestData)
		return
	}

	if err := h.groups.UpdateGroupName(c.Request.Context(), id, req.Name); err != nil {
		httputil.InternalError(c, "Failed to update group")
		return
	}

	httputil.SuccessResponse(c, gin.H{"message": "Group updated successfully"})
}

func (h *GroupHandler) DeleteGroup(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if !h.requireExpertOrManagerAccess(c, userCtx, "delete groups") {
		return
	}

	id := c.Param("id")
	ctx := c.Request.Context()

	if !h.validateGroupDeletionAccess(c, ctx, userCtx, id) {
		return
	}

	stats, err := h.groups.DeleteGroupWithMembers(ctx, id, userCtx)
	if err != nil {
		h.handleDeleteGroupError(c, err)
		return
	}

	httputil.SuccessResponse(c, gin.H{
		"message":       "Group deleted successfully",
		"deleted_users": stats.Deleted,
		"removed_users": stats.Removed,
		"skipped_users": stats.Skipped,
		"failed_users":  stats.Failed,
	})
}

func (h *GroupHandler) handleDeleteGroupError(c *gin.Context, err error) {
	if errors.Is(err, services.ErrDefaultGroupProtected) {
		httputil.Forbidden(c, "Default group cannot be deleted")
		return
	}
	httputil.InternalError(c, "Failed to delete group")
}

// validateGroupDeletionAccess validates if a manager owns the group.
func (h *GroupHandler) validateGroupDeletionAccess(c *gin.Context, ctx context.Context, userCtx *httputil.UserContext, groupID string) bool {
	if userCtx.AccessLevel != constants.AccessLevelManager {
		return true
	}
	mgrSet, err := h.groups.GetManagerGroupSet(ctx, userCtx.UserID)
	if err != nil || !mgrSet[groupID] {
		httputil.Forbidden(c, "You can only delete your own groups")
		return false
	}
	return true
}

func (h *GroupHandler) DisableGroup(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	if !h.requireExpertOrManagerAccess(c, userCtx, "disable groups") {
		return
	}

	id := c.Param("id")
	if !h.validateManagerGroupAccess(c, userCtx, id) {
		return
	}

	ctx := c.Request.Context()
	result, err := h.groups.DisableGroupAndMembers(ctx, id, userCtx)
	if err != nil {
		h.handleDisableGroupError(c, err)
		return
	}
	h.logoutGroupMembers(ctx, result.MemberIDs)

	httputil.SuccessResponse(c, gin.H{
		"message":        "Group disabled",
		"users_disabled": result.Disabled,
		"users_skipped":  result.Skipped,
		"users_failed":   result.Failed,
	})
}

func (h *GroupHandler) handleDisableGroupError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrSharedDefaultGroupProtected):
		httputil.Forbidden(c, "The shared Default group cannot be disabled")
	case errors.Is(err, services.ErrManagerDefaultGroupProtected):
		httputil.Forbidden(c, "Managers cannot disable Default groups")
	default:
		httputil.InternalError(c, "Failed to disable group")
	}
}

// logoutGroupMembers logs out all members and invalidates their sessions
func (h *GroupHandler) logoutGroupMembers(ctx context.Context, memberIDs []string) {
	for _, uid := range memberIDs {
		if err := h.groups.LogoutUser(ctx, uid); err != nil {
			applogger.ForComponent("group").Warnf("Failed to logout user %s: %v", uid, err)
		}
		if err := h.deleteUserSessions(ctx, uid); err != nil {
			applogger.ForComponent("group").Warnf("Failed to delete sessions for user %s: %v", uid, err)
		}
	}
}

func (h *GroupHandler) EnableGroup(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	if !h.requireExpertOrManagerAccess(c, userCtx, "enable groups") {
		return
	}

	id := c.Param("id")
	if !h.validateManagerGroupAccess(c, userCtx, id) {
		return
	}

	result, err := h.groups.EnableGroupAndMembers(c.Request.Context(), id)
	if err != nil {
		httputil.InternalError(c, "Failed to enable group")
		return
	}
	httputil.SuccessResponse(c, gin.H{"message": "Group enabled and users enabled", "users_enabled": result.Enabled, "users_failed": result.Failed})
}
