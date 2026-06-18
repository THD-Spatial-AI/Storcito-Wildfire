package services

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	authplatform "platform.local/platform/auth"
	platformkeycloak "platform.local/platform/keycloak"
)

type Group = platformkeycloak.Group
type GroupDetail = platformkeycloak.GroupDetail

var (
	ErrDefaultGroupProtected        = errors.New("default group cannot be deleted")
	ErrSharedDefaultGroupProtected  = errors.New("shared default group cannot be disabled")
	ErrManagerDefaultGroupProtected = errors.New("manager default group cannot be disabled")
)

type GroupMember struct {
	ID            string              `json:"id"`
	Username      string              `json:"username"`
	Email         string              `json:"email"`
	FirstName     string              `json:"firstName,omitempty"`
	LastName      string              `json:"lastName,omitempty"`
	Enabled       bool                `json:"enabled"`
	EmailVerified bool                `json:"emailVerified,omitempty"`
	Attributes    map[string][]string `json:"attributes,omitempty"`
}

type GroupDeletionStats struct {
	Deleted int `json:"deleted_users"`
	Removed int `json:"removed_users"`
	Skipped int `json:"skipped_users"`
	Failed  int `json:"failed_users"`
}

type DisableGroupResult struct {
	Disabled  int      `json:"users_disabled"`
	Skipped   int      `json:"users_skipped"`
	Failed    int      `json:"users_failed"`
	MemberIDs []string `json:"-"`
}

type EnableGroupResult struct {
	Enabled int `json:"users_enabled"`
	Failed  int `json:"users_failed"`
}

type GroupService interface {
	GetGroup(ctx context.Context, groupID string) (*GroupDetail, error)
	GetUserGroups(ctx context.Context, userID string) ([]Group, error)
	GetAllGroups(ctx context.Context) ([]Group, error)
	GetManagerGroupSet(ctx context.Context, managerUserID string) (map[string]bool, error)
	CreateGroup(ctx context.Context, name string) (string, error)
	UpdateGroupName(ctx context.Context, groupID, name string) error
	UpdateGroupAttributes(ctx context.Context, groupID string, attrs map[string][]string) error
	DeleteGroup(ctx context.Context, groupID string) error
	AddUserToGroup(ctx context.Context, userID, groupID string) error
	RemoveUserFromGroup(ctx context.Context, userID, groupID string) error
	EnsureGroupByName(ctx context.Context, name string) (string, error)
	GetGroupMembers(ctx context.Context, groupID string) ([]GroupMember, error)
	SetGroupDisabled(ctx context.Context, groupID string, disabled bool) error
	SetUserEnabled(ctx context.Context, userID string, enabled bool) error
	LogoutUser(ctx context.Context, userID string) error
	DeleteUser(ctx context.Context, userID string) error
	IsDefaultGroup(groupName string) bool
	IsUserManager(ctx context.Context, userID string) bool
	CanManageGroup(ctx context.Context, actor *httputil.UserContext, groupID string) error
	CanAssignUserToGroup(ctx context.Context, actor *httputil.UserContext, targetGroupID string, targetUserGroups []Group) error
	CanRemoveUserFromGroup(ctx context.Context, actor *httputil.UserContext, groupID, targetUserID string) error
	FetchGroupsByAccessLevel(ctx context.Context, actor *httputil.UserContext) ([]Group, error)
	EnrichGroupsWithAttributes(ctx context.Context, groups []Group) []Group
	DeleteGroupWithMembers(ctx context.Context, groupID string, actor *httputil.UserContext) (GroupDeletionStats, error)
	DisableGroupAndMembers(ctx context.Context, groupID string, actor *httputil.UserContext) (DisableGroupResult, error)
	EnableGroupAndMembers(ctx context.Context, groupID string) (EnableGroupResult, error)
}

type groupService struct {
	kc    *platformkeycloak.Client
	authz AuthorizationService
}

func NewGroupService(kc *platformkeycloak.Client, authz AuthorizationService) GroupService {
	return &groupService{kc: kc, authz: authz}
}

func NewGroupServiceFromConfig(db *gorm.DB, adminTokenProvider *authplatform.AdminTokenProvider, keycloakBaseURL, realm string) GroupService {
	kc := platformkeycloak.NewClient(keycloakBaseURL, realm, adminTokenProvider)
	return NewGroupService(kc, NewAuthorizationService(db, kc))
}

func (s *groupService) GetGroup(ctx context.Context, groupID string) (*GroupDetail, error) {
	return s.kc.GetGroup(ctx, groupID)
}

func (s *groupService) GetUserGroups(ctx context.Context, userID string) ([]Group, error) {
	return s.kc.GetUserGroups(ctx, userID)
}

func (s *groupService) GetAllGroups(ctx context.Context) ([]Group, error) {
	return s.kc.GetAllGroups(ctx)
}

func (s *groupService) GetManagerGroupSet(ctx context.Context, managerUserID string) (map[string]bool, error) {
	return s.kc.GetManagerGroupSet(ctx, managerUserID)
}

func (s *groupService) CreateGroup(ctx context.Context, name string) (string, error) {
	return s.kc.CreateGroup(ctx, name)
}

func (s *groupService) UpdateGroupName(ctx context.Context, groupID, name string) error {
	group, err := s.GetGroup(ctx, groupID)
	if err != nil {
		return err
	}
	if s.isManagerDefaultGroup(group) {
		attrs := group.Attributes
		if attrs == nil {
			attrs = make(map[string][]string)
		}
		attrs["display_name"] = []string{name}
		return s.UpdateGroupAttributes(ctx, groupID, attrs)
	}
	return s.kc.UpdateGroupName(ctx, groupID, name)
}

func (s *groupService) isManagerDefaultGroup(group *GroupDetail) bool {
	if s.IsDefaultGroup(group.Name) {
		return true
	}
	if group.Attributes == nil {
		return false
	}
	return group.Attributes["owner_email"] != nil || group.Attributes["owner_name"] != nil
}

func (s *groupService) UpdateGroupAttributes(ctx context.Context, groupID string, attrs map[string][]string) error {
	return s.kc.UpdateGroupAttributes(ctx, groupID, attrs)
}

func (s *groupService) DeleteGroup(ctx context.Context, groupID string) error {
	return s.kc.DeleteGroup(ctx, groupID)
}

func (s *groupService) AddUserToGroup(ctx context.Context, userID, groupID string) error {
	return s.kc.AddUserToGroup(ctx, userID, groupID)
}

func (s *groupService) RemoveUserFromGroup(ctx context.Context, userID, groupID string) error {
	return s.kc.RemoveUserFromGroup(ctx, userID, groupID)
}

func (s *groupService) EnsureGroupByName(ctx context.Context, name string) (string, error) {
	return s.kc.EnsureGroupByName(ctx, name)
}

func (s *groupService) GetGroupMembers(ctx context.Context, groupID string) ([]GroupMember, error) {
	members, err := s.kc.GetGroupMembers(ctx, groupID)
	if err != nil {
		return nil, err
	}

	typed := make([]GroupMember, 0, len(members))
	for _, member := range members {
		typed = append(typed, groupMemberFromMap(member))
	}
	return typed, nil
}

func (s *groupService) SetGroupDisabled(ctx context.Context, groupID string, disabled bool) error {
	return s.kc.SetGroupDisabled(ctx, groupID, disabled)
}

func (s *groupService) SetUserEnabled(ctx context.Context, userID string, enabled bool) error {
	return s.kc.SetUserEnabled(ctx, userID, enabled)
}

func (s *groupService) LogoutUser(ctx context.Context, userID string) error {
	return s.kc.LogoutUser(ctx, userID)
}

func (s *groupService) DeleteUser(ctx context.Context, userID string) error {
	return s.kc.DeleteUser(ctx, userID)
}

func (s *groupService) IsDefaultGroup(groupName string) bool {
	return s.kc.IsDefaultGroup(groupName)
}

func (s *groupService) IsUserManager(ctx context.Context, userID string) bool {
	attrs, err := s.kc.GetUserAttributes(ctx, userID)
	if err != nil {
		return false
	}
	accessLevel, ok := attrs["access_level"]
	return ok && len(accessLevel) > 0 && strings.EqualFold(accessLevel[0], constants.AccessLevelManager)
}

func (s *groupService) CanManageGroup(ctx context.Context, actor *httputil.UserContext, groupID string) error {
	return s.authz.CanManageGroup(ctx, actor, groupID)
}

func (s *groupService) CanAssignUserToGroup(ctx context.Context, actor *httputil.UserContext, targetGroupID string, targetUserGroups []Group) error {
	return s.authz.CanAssignUserToGroup(ctx, actor, targetGroupID, targetUserGroups)
}

func (s *groupService) CanRemoveUserFromGroup(ctx context.Context, actor *httputil.UserContext, groupID, targetUserID string) error {
	return s.authz.CanRemoveUserFromGroup(ctx, actor, groupID, targetUserID)
}

func (s *groupService) FetchGroupsByAccessLevel(ctx context.Context, actor *httputil.UserContext) ([]Group, error) {
	if actor.AccessLevel == constants.AccessLevelManager {
		groups, err := s.GetUserGroups(ctx, actor.UserID)
		if err != nil {
			return nil, err
		}
		return s.EnrichGroupsWithAttributes(ctx, s.filterOutSharedDefault(ctx, groups)), nil
	}

	groups, err := s.GetAllGroups(ctx)
	if err != nil {
		return nil, err
	}
	return s.EnrichGroupsWithAttributes(ctx, groups), nil
}

func (s *groupService) EnrichGroupsWithAttributes(ctx context.Context, groups []Group) []Group {
	enrichedGroups := make([]Group, 0, len(groups))
	for _, g := range groups {
		if detail, err := s.GetGroup(ctx, g.ID); err == nil {
			enrichedGroups = append(enrichedGroups, Group{
				ID:         detail.ID,
				Name:       detail.Name,
				Path:       detail.Path,
				Attributes: detail.Attributes,
			})
		} else {
			enrichedGroups = append(enrichedGroups, g)
		}
	}
	return enrichedGroups
}

func (s *groupService) filterOutSharedDefault(ctx context.Context, groups []Group) []Group {
	sharedDefaultID, err := s.EnsureGroupByName(ctx, "Default")
	if err != nil || sharedDefaultID == "" {
		return groups
	}

	filtered := make([]Group, 0, len(groups))
	for _, g := range groups {
		if g.ID != sharedDefaultID {
			filtered = append(filtered, g)
		}
	}
	return filtered
}

func groupMemberFromMap(member map[string]any) GroupMember {
	return GroupMember{
		ID:            stringValue(member["id"]),
		Username:      stringValue(member["username"]),
		Email:         stringValue(member["email"]),
		FirstName:     stringValue(member["firstName"]),
		LastName:      stringValue(member["lastName"]),
		Enabled:       boolValue(member["enabled"]),
		EmailVerified: boolValue(member["emailVerified"]),
		Attributes:    attributesValue(member["attributes"]),
	}
}

func stringValue(value any) string {
	if s, ok := value.(string); ok {
		return s
	}
	return ""
}

func boolValue(value any) bool {
	if b, ok := value.(bool); ok {
		return b
	}
	return false
}

func attributesValue(value any) map[string][]string {
	switch attrs := value.(type) {
	case map[string][]string:
		return attrs
	case map[string]any:
		converted := make(map[string][]string, len(attrs))
		for key, raw := range attrs {
			switch vals := raw.(type) {
			case []string:
				converted[key] = vals
			case []any:
				strings := make([]string, 0, len(vals))
				for _, v := range vals {
					if s, ok := v.(string); ok {
						strings = append(strings, s)
					}
				}
				if len(strings) > 0 {
					converted[key] = strings
				}
			}
		}
		return converted
	default:
		return nil
	}
}

func (s *groupService) DeleteGroupWithMembers(ctx context.Context, groupID string, actor *httputil.UserContext) (GroupDeletionStats, error) {
	group, err := s.GetGroup(ctx, groupID)
	if err != nil {
		return GroupDeletionStats{}, err
	}
	if s.IsDefaultGroup(group.Name) {
		return GroupDeletionStats{}, ErrDefaultGroupProtected
	}

	members, err := s.GetGroupMembers(ctx, groupID)
	if err != nil {
		return GroupDeletionStats{}, err
	}

	stats := s.processMembersBeforeDelete(ctx, members, groupID, actor)
	if err := s.DeleteGroup(ctx, groupID); err != nil {
		return stats, err
	}
	return stats, nil
}

func (s *groupService) processMembersBeforeDelete(ctx context.Context, members []GroupMember, groupID string, actor *httputil.UserContext) GroupDeletionStats {
	defaultGroupID, _ := s.EnsureGroupByName(ctx, "Default")
	stats := GroupDeletionStats{}
	for _, member := range members {
		if member.ID == "" {
			continue
		}
		s.handleMemberDuringGroupDelete(ctx, member.ID, groupID, actor, defaultGroupID, &stats)
	}
	return stats
}

func (s *groupService) handleMemberDuringGroupDelete(ctx context.Context, userID, groupID string, actor *httputil.UserContext, defaultGroupID string, stats *GroupDeletionStats) {
	if userID == actor.UserID {
		stats.Skipped++
		_ = s.RemoveUserFromGroup(ctx, userID, groupID)
		if actor.AccessLevel == constants.AccessLevelManager && defaultGroupID != "" {
			_ = s.AddUserToGroup(ctx, userID, defaultGroupID)
		}
		return
	}

	userGroups, err := s.GetUserGroups(ctx, userID)
	if err != nil {
		stats.Failed++
		return
	}
	if len(userGroups) <= 1 {
		if err := s.DeleteUser(ctx, userID); err != nil {
			stats.Failed++
		} else {
			stats.Deleted++
		}
		return
	}
	if err := s.RemoveUserFromGroup(ctx, userID, groupID); err != nil {
		stats.Failed++
	} else {
		stats.Removed++
	}
}

func (s *groupService) DisableGroupAndMembers(ctx context.Context, groupID string, actor *httputil.UserContext) (DisableGroupResult, error) {
	if err := s.validateDefaultGroupProtection(ctx, groupID, actor); err != nil {
		return DisableGroupResult{}, err
	}
	if err := s.SetGroupDisabled(ctx, groupID, true); err != nil {
		return DisableGroupResult{}, err
	}
	members, err := s.GetGroupMembers(ctx, groupID)
	if err != nil {
		return DisableGroupResult{}, err
	}
	return s.disableGroupMembers(ctx, members, actor), nil
}

func (s *groupService) validateDefaultGroupProtection(ctx context.Context, groupID string, actor *httputil.UserContext) error {
	group, err := s.GetGroup(ctx, groupID)
	if err != nil {
		return nil
	}
	if strings.EqualFold(group.Name, "Default") {
		return ErrSharedDefaultGroupProtected
	}
	if actor.AccessLevel == constants.AccessLevelManager && s.IsDefaultGroup(group.Name) {
		return ErrManagerDefaultGroupProtected
	}
	return nil
}

func (s *groupService) disableGroupMembers(ctx context.Context, members []GroupMember, actor *httputil.UserContext) DisableGroupResult {
	result := DisableGroupResult{MemberIDs: make([]string, 0, len(members))}
	for _, member := range members {
		if member.ID == "" {
			continue
		}
		result.MemberIDs = append(result.MemberIDs, member.ID)
		if !s.shouldDisableMember(ctx, member.ID, actor, &result) {
			result.Skipped++
			continue
		}
		if err := s.SetUserEnabled(ctx, member.ID, false); err != nil {
			result.Failed++
		} else {
			result.Disabled++
		}
	}
	return result
}

func (s *groupService) shouldDisableMember(ctx context.Context, userID string, actor *httputil.UserContext, result *DisableGroupResult) bool {
	if actor.AccessLevel == constants.AccessLevelExpert {
		return true
	}
	userGroups, err := s.GetUserGroups(ctx, userID)
	if err != nil {
		result.Failed++
		return false
	}
	return len(userGroups) <= 1
}

func (s *groupService) EnableGroupAndMembers(ctx context.Context, groupID string) (EnableGroupResult, error) {
	if err := s.SetGroupDisabled(ctx, groupID, false); err != nil {
		return EnableGroupResult{}, err
	}
	members, err := s.GetGroupMembers(ctx, groupID)
	if err != nil {
		return EnableGroupResult{}, nil
	}
	result := EnableGroupResult{}
	for _, member := range members {
		if member.ID == "" {
			continue
		}
		if err := s.SetUserEnabled(ctx, member.ID, true); err != nil {
			result.Failed++
		} else {
			result.Enabled++
		}
	}
	return result, nil
}
