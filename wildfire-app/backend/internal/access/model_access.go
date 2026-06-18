// Package access provides shared authorization helpers used across
// domain handlers (result, risk_metrics, ...) so access logic is not
// duplicated.
package access

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	commonModels "platform.local/common/pkg/models"
)

// ErrModelNotFound is returned when the requested model does not exist.
var ErrModelNotFound = errors.New("access: model not found")

// ErrForbidden is returned when the current user lacks access.
var ErrForbidden = errors.New("access: forbidden")

// ModelAccessStore is the minimum database surface required to enforce
// model-level access.
type ModelAccessStore interface {
	GetModelByIDWithWorkspace(id uint) (*commonModels.Model, error)
	GetUserGroupIDs(userID string) ([]string, error)
}

// EnsureModelAccess loads the model and validates that the user
// identified by userCtx has access. Expert users and owners always
// pass; otherwise workspace membership or group membership is
// consulted.
func EnsureModelAccess(store ModelAccessStore, userCtx *httputil.UserContext, modelID uint) (*commonModels.Model, error) {
	if userCtx == nil {
		return nil, ErrForbidden
	}
	model, err := store.GetModelByIDWithWorkspace(modelID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrModelNotFound
		}
		return nil, err
	}

	if userCtx.AccessLevel == constants.AccessLevelExpert || model.UserID == userCtx.UserID {
		return model, nil
	}

	if isWorkspaceMember(model, userCtx.UserID, userCtx.Email) || isInWorkspaceGroup(store, model, userCtx.UserID) {
		return model, nil
	}
	return nil, ErrForbidden
}

func isWorkspaceMember(model *commonModels.Model, userID, email string) bool {
	if model == nil || model.Workspace == nil {
		return false
	}
	for _, m := range model.Workspace.Members {
		if m.UserID == userID {
			return true
		}
		if email != "" && m.Email != "" && strings.EqualFold(m.Email, email) {
			return true
		}
	}
	return false
}

func isInWorkspaceGroup(store ModelAccessStore, model *commonModels.Model, userID string) bool {
	if model == nil || model.Workspace == nil {
		return false
	}
	groupIDs, err := store.GetUserGroupIDs(userID)
	if err != nil || len(groupIDs) == 0 {
		return false
	}
	wanted := make(map[string]struct{}, len(groupIDs))
	for _, g := range groupIDs {
		wanted[g] = struct{}{}
	}
	for _, wg := range model.Workspace.Groups {
		if _, ok := wanted[wg.GroupID]; ok {
			return true
		}
	}
	return false
}
