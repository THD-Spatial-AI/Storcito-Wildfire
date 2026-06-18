package model

import (
	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"

	"github.com/gin-gonic/gin"
)

// validateSharePermission validates and normalizes the permission value
func validateSharePermission(c *gin.Context, permission string) (string, bool) {
	if permission == "" {
		return models.ModelSharePermissionView, true
	}

	if permission != models.ModelSharePermissionView && permission != models.ModelSharePermissionEdit {
		httputil.BadRequest(c, "Invalid permission. Use 'view' or 'edit'")
		return "", false
	}

	return permission, true
}

// isWorkspaceSharedWithUser checks if workspace is directly shared with the user
func (h *ModelHandler) isWorkspaceSharedWithUser(workspaceID uint, email string) bool {
	return h.store.IsWorkspaceSharedWithUser(workspaceID, email)
}

// isWorkspaceSharedWithUserGroups checks if workspace is shared with any of the user's groups
func (h *ModelHandler) isWorkspaceSharedWithUserGroups(c *gin.Context, workspaceID uint, email string) bool {
	modelSvc := h.newModelService()
	targetUserID := modelSvc.FindUserIDByEmail(email)
	if targetUserID == "" {
		return false
	}

	groupIDs := modelSvc.GetUserGroupIDs(c.Request.Context(), targetUserID)
	if len(groupIDs) == 0 {
		return false
	}

	return h.store.IsWorkspaceSharedWithUserGroups(workspaceID, groupIDs)
}

// validateModelNotAlreadyAccessible checks if user already has access to the model
func (h *ModelHandler) validateModelNotAlreadyAccessible(c *gin.Context, model *models.Model, email string) bool {
	if model.WorkspaceID != nil {
		if h.isWorkspaceSharedWithUser(*model.WorkspaceID, email) {
			httputil.BadRequest(c, "Workspace already shared with this user; they already have access to this model")
			return false
		}

		if h.isWorkspaceSharedWithUserGroups(c, *model.WorkspaceID, email) {
			httputil.BadRequest(c, "Workspace already shared with this user's group; they already have access to this model")
			return false
		}
	}

	_, err := h.store.FindModelShareByModelAndEmail(model.ID, email)
	if err == nil {
		httputil.BadRequest(c, "Model already shared with this user")
		return false
	}

	return true
}
