package services

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"
	platformkeycloak "platform.local/platform/keycloak"
)

var (
	ErrAccessDenied = errors.New("access denied")
	ErrAuthzFailed  = errors.New("authorization check failed")
)

type AuthorizationService interface {
	CanManageUser(ctx context.Context, actor *httputil.UserContext, targetUserID string) error
	CanAccessWorkspace(ctx context.Context, actor *httputil.UserContext, workspaceID uint) error
	CanManageWorkspace(ctx context.Context, actor *httputil.UserContext, workspaceID uint) error
	CanManageGroup(ctx context.Context, actor *httputil.UserContext, groupID string) error
	CanAssignUserToGroup(ctx context.Context, actor *httputil.UserContext, targetGroupID string, targetUserGroups []platformkeycloak.Group) error
	CanRemoveUserFromGroup(ctx context.Context, actor *httputil.UserContext, groupID, targetUserID string) error
}

type authorizationService struct {
	db *gorm.DB
	kc *platformkeycloak.Client
}

func NewAuthorizationService(db *gorm.DB, kc *platformkeycloak.Client) AuthorizationService {
	return &authorizationService{db: db, kc: kc}
}

func (s *authorizationService) CanManageUser(ctx context.Context, actor *httputil.UserContext, targetUserID string) error {
	if actor == nil {
		return ErrAccessDenied
	}
	if actor.AccessLevel == constants.AccessLevelExpert {
		return nil
	}
	if actor.AccessLevel != constants.AccessLevelManager || s.kc == nil {
		return ErrAccessDenied
	}

	mgrSet, err := s.kc.GetManagerGroupSet(ctx, actor.UserID)
	if err != nil {
		return ErrAuthzFailed
	}

	sharedDefaultID := ""
	if gid, derr := s.kc.EnsureGroupByName(ctx, "Default"); derr == nil {
		sharedDefaultID = gid
	}

	targetGroups, err := s.kc.GetUserGroups(ctx, targetUserID)
	if err != nil {
		return ErrAuthzFailed
	}

	for _, tg := range targetGroups {
		if mgrSet[tg.ID] {
			if sharedDefaultID != "" && tg.ID == sharedDefaultID {
				if targetUserID == actor.UserID {
					return nil
				}
				continue
			}
			return nil
		}
	}

	return ErrAccessDenied
}

func (s *authorizationService) CanAccessWorkspace(ctx context.Context, actor *httputil.UserContext, workspaceID uint) error {
	if actor == nil || s.db == nil {
		return ErrAccessDenied
	}

	if s.countWorkspaceOwner(workspaceID, actor.UserID) > 0 || s.countWorkspaceMember(workspaceID, actor.UserID) > 0 {
		return nil
	}

	for _, groupID := range s.userGroupIDs(ctx, actor.UserID) {
		if s.countWorkspaceGroup(workspaceID, groupID) > 0 {
			return nil
		}
	}

	var workspace models.Workspace
	if err := s.db.Select("id", "user_id", "user_email").Where("id = ?", workspaceID).First(&workspace).Error; err == nil && workspace.UserEmail == actor.Email {
		if workspace.UserID != actor.UserID {
			_ = s.db.Model(&workspace).Update("user_id", actor.UserID).Error
		}
		return nil
	}

	return ErrAccessDenied
}

func (s *authorizationService) CanManageWorkspace(ctx context.Context, actor *httputil.UserContext, workspaceID uint) error {
	if actor == nil || s.db == nil {
		return ErrAccessDenied
	}
	if s.countWorkspaceOwner(workspaceID, actor.UserID) > 0 {
		return nil
	}
	if actor.AccessLevel == constants.AccessLevelExpert {
		return s.CanAccessWorkspace(ctx, actor, workspaceID)
	}
	return ErrAccessDenied
}

func (s *authorizationService) CanManageGroup(ctx context.Context, actor *httputil.UserContext, groupID string) error {
	if actor == nil {
		return ErrAccessDenied
	}
	if actor.AccessLevel == constants.AccessLevelExpert {
		return nil
	}
	if actor.AccessLevel != constants.AccessLevelManager || s.kc == nil {
		return ErrAccessDenied
	}
	mgrSet, err := s.kc.GetManagerGroupSet(ctx, actor.UserID)
	if err != nil {
		return ErrAuthzFailed
	}
	if !mgrSet[groupID] {
		return ErrAccessDenied
	}
	return nil
}

func (s *authorizationService) CanAssignUserToGroup(ctx context.Context, actor *httputil.UserContext, targetGroupID string, targetUserGroups []platformkeycloak.Group) error {
	if err := s.CanManageGroup(ctx, actor, targetGroupID); err != nil {
		return err
	}
	if actor.AccessLevel == constants.AccessLevelExpert {
		return nil
	}
	return s.hasManagedGroup(ctx, actor.UserID, targetUserGroups)
}

func (s *authorizationService) CanRemoveUserFromGroup(ctx context.Context, actor *httputil.UserContext, groupID, targetUserID string) error {
	if err := s.CanManageGroup(ctx, actor, groupID); err != nil {
		return err
	}
	if actor.AccessLevel == constants.AccessLevelExpert {
		return nil
	}
	if s.kc == nil {
		return ErrAccessDenied
	}
	targetGroups, err := s.kc.GetUserGroups(ctx, targetUserID)
	if err != nil {
		return ErrAuthzFailed
	}
	return s.hasManagedGroup(ctx, actor.UserID, targetGroups)
}

func (s *authorizationService) hasManagedGroup(ctx context.Context, managerUserID string, targetUserGroups []platformkeycloak.Group) error {
	mgrSet, err := s.kc.GetManagerGroupSet(ctx, managerUserID)
	if err != nil {
		return ErrAuthzFailed
	}
	for _, ug := range targetUserGroups {
		if mgrSet[ug.ID] {
			return nil
		}
	}
	return ErrAccessDenied
}

func (s *authorizationService) userGroupIDs(ctx context.Context, userID string) []string {
	if s.kc == nil || userID == "" {
		return nil
	}
	groups, err := s.kc.GetUserGroups(ctx, userID)
	if err != nil {
		return nil
	}
	ids := make([]string, 0, len(groups))
	for _, group := range groups {
		ids = append(ids, group.ID)
	}
	return ids
}

func (s *authorizationService) countWorkspaceOwner(workspaceID uint, userID string) int64 {
	var count int64
	s.db.Model(&models.Workspace{}).Where("id = ? AND user_id = ?", workspaceID, userID).Count(&count)
	return count
}

func (s *authorizationService) countWorkspaceMember(workspaceID uint, userID string) int64 {
	var count int64
	s.db.Model(&models.WorkspaceMember{}).Where("workspace_id = ? AND user_id = ?", workspaceID, userID).Count(&count)
	return count
}

func (s *authorizationService) countWorkspaceGroup(workspaceID uint, groupID string) int64 {
	var count int64
	s.db.Model(&models.WorkspaceGroup{}).Where("workspace_id = ? AND group_id = ?", workspaceID, groupID).Count(&count)
	return count
}
