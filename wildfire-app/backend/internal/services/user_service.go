package services

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	usersstore "spatialhub_backend/internal/store/users"

	"gorm.io/gorm"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"
	platformkeycloak "platform.local/platform/keycloak"
	applogger "platform.local/platform/logger"
	platformsession "platform.local/platform/session"
)

const sqlUserIDOrEmail = "user_id = ? OR LOWER(email) = LOWER(?)"

// UserService contains user business logic shared by HTTP handlers.
type UserService interface {
	CanManagerAccessUser(ctx context.Context, managerUserID, targetUserID string) bool
	GetUserAccessLevel(authToken, userID string, attributes map[string][]string) string
	GetUserFirstGroup(ctx context.Context, userID string) string
	ListUsers(ctx context.Context, authToken string, sessionData *platformsession.SessionData, first, perPage int, search string) ([]UserDTO, int, error)
	GetDefaultGroupIDForCreation(ctx context.Context, sessionData *platformsession.SessionData) (string, error)
	AssignUserToGroup(ctx context.Context, userID, groupID string, sessionData *platformsession.SessionData)
	SetUserPasswordIfProvided(authToken, userID, email, password string)
	IsEmailDuplicate(authToken, currentUserID, email string) bool
	UpdatePasswordIfProvided(authToken, userID string, password *string)
	SyncUserGroupsForAccessLevel(ctx context.Context, authToken, userID, level string)
	CleanupUserGroups(ctx context.Context, userID string)
	CleanupUserDatabaseRecords(userID, userEmail string)
	CountManagerUsers(ctx context.Context, authToken, managerID string) (int, error)
}

type userService struct {
	db        *gorm.DB
	userStore *usersstore.Store
	kc        *platformkeycloak.Client
	authz     AuthorizationService
}

func NewUserService(db *gorm.DB, userStore *usersstore.Store, kc *platformkeycloak.Client, authz AuthorizationService) UserService {
	return &userService{db: db, userStore: userStore, kc: kc, authz: authz}
}

type UserDTO struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Enabled       bool   `json:"enabled"`
	Organization  string `json:"organization,omitempty"`
	Position      string `json:"position,omitempty"`
	Phone         string `json:"phone,omitempty"`
	AccessLevel   string `json:"access_level"`
	GroupID       string `json:"group_id,omitempty"`
	ModelLimit    *int   `json:"model_limit,omitempty"`
	CreatedAt     *int64 `json:"created_at,omitempty"`
	// HasAPIAccess is true when the user holds at least one active API token.
	HasAPIAccess bool `json:"has_api_access"`
}

func GetAttributeValue(attributes map[string][]string, key string) string {
	if vals, ok := attributes[key]; ok && len(vals) > 0 {
		return vals[0]
	}
	return ""
}

func DeriveUserName(attributes map[string][]string, username, email string) string {
	name := GetAttributeValue(attributes, "fullName")
	if name == "" {
		name = username
	}
	if name == "" {
		name = email
	}
	return name
}

func (s *userService) CanManagerAccessUser(ctx context.Context, managerUserID, targetUserID string) bool {
	if s.authz == nil {
		return false
	}
	return s.authz.CanManageUser(ctx, &httputil.UserContext{
		UserID:      managerUserID,
		AccessLevel: constants.AccessLevelManager,
	}, targetUserID) == nil
}

func (s *userService) deriveAccessLevel(accessAttr string, roles []string) string {
	if accessAttr != "" {
		return strings.ToLower(accessAttr)
	}
	for _, r := range roles {
		lr := strings.ToLower(r)
		switch lr {
		case "realm-admin", "admin", "expert", constants.AccessLevelManager:
			return "expert"
		}
	}
	return "very_low"
}

func (s *userService) fetchUserRoles(token, userID string) []string {
	roles, err := s.userStore.FetchUserRoles(token, userID)
	if err != nil {
		applogger.ForComponent("users").Warnf("Failed to fetch user roles for %s: %v", userID, err)
		return nil
	}
	return roles
}

func (s *userService) GetUserAccessLevel(authToken, userID string, attributes map[string][]string) string {
	accessAttr := strings.ToLower(GetAttributeValue(attributes, "access_level"))
	if accessAttr != "" {
		applogger.ForComponent("users").Debugf("User %s access level from attribute: %s", userID, accessAttr)
		return accessAttr
	}
	applogger.ForComponent("users").Warnf("User %s has no access_level attribute, deriving from roles", userID)
	roles := s.fetchUserRoles(authToken, userID)
	derivedLevel := s.deriveAccessLevel(accessAttr, roles)
	applogger.ForComponent("users").Debugf("User %s derived access level: %s (roles: %v)", userID, derivedLevel, roles)
	return derivedLevel
}

func (s *userService) GetUserFirstGroup(ctx context.Context, userID string) string {
	gid, _ := s.kc.GetUserPrimaryGroup(ctx, userID)
	return gid
}

func (s *userService) ListUsers(ctx context.Context, authToken string, sessionData *platformsession.SessionData, first, perPage int, search string) ([]UserDTO, int, error) {
	kcUsers, err := s.fetchUsersFromKeycloak(authToken, sessionData, first, perPage, search)
	if err != nil {
		return nil, 0, err
	}

	users := s.convertToUserDTOs(ctx, authToken, kcUsers)
	isManager := sessionData.AccessLevel == constants.AccessLevelManager
	if isManager {
		groupMap, err := s.buildManagerGroupMap(ctx, sessionData.UserID)
		if err == nil {
			users = filterUsersByManagerGroups(users, groupMap)
		}
	}

	totalBeforePagination := users
	if isManager {
		users = paginateUsers(users, first, perPage)
	}

	total := s.getTotalCount(authToken, search, totalBeforePagination, isManager)
	return users, total, nil
}

func (s *userService) fetchUsersFromKeycloak(authToken string, sessionData *platformsession.SessionData, first, perPage int, search string) ([]usersstore.User, error) {
	if sessionData.AccessLevel == constants.AccessLevelManager {
		return s.userStore.ListUsers(authToken, usersstore.ListUsersParams{First: 0, Max: 10000, Search: search})
	}
	return s.userStore.ListUsers(authToken, usersstore.ListUsersParams{First: first, Max: perPage, Search: search})
}

func (s *userService) convertToUserDTOs(ctx context.Context, authToken string, kcUsers []usersstore.User) []UserDTO {
	users := make([]UserDTO, 0, len(kcUsers))
	for _, u := range kcUsers {
		name := DeriveUserName(u.Attributes, u.Username, u.Email)
		accessLevel := s.GetUserAccessLevel(authToken, u.ID, u.Attributes)
		groupID := s.GetUserFirstGroup(ctx, u.ID)

		dto := UserDTO{
			ID:            u.ID,
			Name:          name,
			Email:         u.Email,
			EmailVerified: u.EmailVerified,
			Enabled:       u.Enabled,
			Organization:  GetAttributeValue(u.Attributes, "organization"),
			Position:      GetAttributeValue(u.Attributes, "position"),
			Phone:         GetAttributeValue(u.Attributes, "phone"),
			AccessLevel:   accessLevel,
			GroupID:       groupID,
			CreatedAt:     u.CreatedTimestamp,
		}
		if modelLimitStr := GetAttributeValue(u.Attributes, "model_limit"); modelLimitStr != "" {
			if modelLimit, err := strconv.Atoi(modelLimitStr); err == nil {
				dto.ModelLimit = &modelLimit
			}
		}
		users = append(users, dto)
	}
	return users
}

func (s *userService) buildManagerGroupMap(ctx context.Context, userID string) (map[string]bool, error) {
	mgrSet, err := s.kc.GetManagerGroupSet(ctx, userID)
	if err != nil {
		return nil, err
	}
	sharedDefaultID, _ := s.kc.EnsureGroupByName(ctx, "Default")
	managerGroupMap := make(map[string]bool)
	for gid := range mgrSet {
		if gid != sharedDefaultID {
			managerGroupMap[gid] = true
		}
	}
	return managerGroupMap, nil
}

func filterUsersByManagerGroups(users []UserDTO, groupMap map[string]bool) []UserDTO {
	filtered := make([]UserDTO, 0)
	for _, u := range users {
		if u.GroupID != "" && groupMap[u.GroupID] {
			filtered = append(filtered, u)
		}
	}
	return filtered
}

func paginateUsers(users []UserDTO, first, perPage int) []UserDTO {
	startIdx := first
	endIdx := first + perPage
	if startIdx > len(users) {
		startIdx = len(users)
	}
	if endIdx > len(users) {
		endIdx = len(users)
	}
	return users[startIdx:endIdx]
}

func (s *userService) getTotalCount(authToken string, rawSearch string, users []UserDTO, isManager bool) int {
	if isManager {
		return len(users)
	}
	total, err := s.userStore.CountUsers(authToken, rawSearch)
	if err != nil {
		if rawSearch != "" {
			return len(users)
		}
		return -1
	}
	return total
}

func GetManagerInfo(sessionData *platformsession.SessionData) (email, name string) {
	if sessionData.UserInfoData == nil {
		return "", ""
	}
	email = sessionData.UserInfoData.Email
	name = sessionData.UserInfoData.FullName
	if name == "" {
		name = email
	}
	return email, name
}

func (s *userService) GetDefaultGroupIDForCreation(ctx context.Context, sessionData *platformsession.SessionData) (string, error) {
	if sessionData.AccessLevel == constants.AccessLevelManager && sessionData.UserID != "" {
		email, name := GetManagerInfo(sessionData)
		return s.kc.EnsureManagerDefaultGroup(ctx, sessionData.UserID, email, name)
	}
	return s.kc.EnsureGroupByName(ctx, "Default")
}

func (s *userService) AssignUserToGroup(ctx context.Context, userID, groupID string, sessionData *platformsession.SessionData) {
	log := applogger.ForComponent("users")

	// Resolve the group the user should belong to
	targetGroupID := groupID
	if targetGroupID == "" {
		defID, defErr := s.GetDefaultGroupIDForCreation(ctx, sessionData)
		if defErr != nil {
			log.Warnf("Failed to ensure default group: %v", defErr)
			return
		}
		targetGroupID = defID
	}
	if targetGroupID == "" {
		return
	}

	if err := s.kc.AddUserToGroup(ctx, userID, targetGroupID); err != nil {
		log.Warnf("Failed to add user to group: userID=%s groupID=%s err=%v", userID, targetGroupID, err)
	}

	if sessionData.AccessLevel == constants.AccessLevelManager {
		s.removeFromSharedDefaultGroup(ctx, userID, targetGroupID)
	}
}

func (s *userService) removeFromSharedDefaultGroup(ctx context.Context, userID, keepGroupID string) {
	log := applogger.ForComponent("users")
	sharedDefaultID, err := s.kc.EnsureGroupByName(ctx, "Default")
	if err != nil || sharedDefaultID == "" || sharedDefaultID == keepGroupID {
		return
	}
	if err := s.kc.RemoveUserFromGroup(ctx, userID, sharedDefaultID); err != nil {
		log.Warnf("Failed to remove manager-created user from shared default group: userID=%s err=%v", userID, err)
	}
}

func (s *userService) SetUserPasswordIfProvided(authToken, userID, email, password string) {
	if password == "" {
		return
	}
	if err := s.userStore.SetUserPassword(authToken, userID, password, false); err != nil {
		applogger.ForComponent("users").Warnf("password set failed email=%s userID=%s err=%v", email, userID, err)
	}
}

func (s *userService) IsEmailDuplicate(authToken, currentUserID, email string) bool {
	if email == "" {
		return false
	}
	found, err := s.userStore.FindUserByEmail(authToken, email)
	if err != nil || len(found) == 0 {
		return false
	}
	for _, f := range found {
		if f.ID != currentUserID {
			return true
		}
	}
	return false
}

func (s *userService) UpdatePasswordIfProvided(authToken, userID string, password *string) {
	if password == nil || *password == "" {
		return
	}
	if err := s.userStore.SetUserPassword(authToken, userID, *password, false); err != nil {
		applogger.ForComponent("users").Warnf("password reset failed id=%s err=%v", userID, err)
	}
}

func (s *userService) SyncUserGroupsForAccessLevel(ctx context.Context, authToken, userID, level string) {
	switch level {
	case constants.AccessLevelExpert:
		s.assignExpertGroups(ctx, userID)
	case constants.AccessLevelManager:
		s.assignManagerGroups(ctx, authToken, userID)
	default:
		s.assignStandardGroups(ctx, userID)
	}
}

func (s *userService) assignExpertGroups(ctx context.Context, userID string) {
	log := applogger.ForComponent("users")
	defID, _ := s.kc.EnsureGroupByName(ctx, "Default")
	if defID == "" {
		return
	}
	if groups, err := s.kc.GetUserGroups(ctx, userID); err == nil {
		for _, g := range groups {
			if strings.HasPrefix(g.Name, "Default_") {
				if err := s.kc.RemoveUserFromGroup(ctx, userID, g.ID); err != nil {
					log.Warnf("Failed to remove user from manager group userID=%s groupID=%s err=%v", userID, g.ID, err)
				}
			}
		}
	} else {
		log.Warnf("Failed to fetch user groups for expert sync userID=%s err=%v", userID, err)
	}
	if err := s.kc.AddUserToGroup(ctx, userID, defID); err != nil {
		log.Warnf("Failed to add user to default group userID=%s groupID=%s err=%v", userID, defID, err)
	}
}

func (s *userService) assignManagerGroups(ctx context.Context, authToken, userID string) {
	log := applogger.ForComponent("users")
	kcUser, err := s.userStore.GetUser(authToken, userID)
	if err != nil {
		log.Warnf("Failed to fetch user for manager sync userID=%s err=%v", userID, err)
	}
	email := kcUser.Email
	if email == "" {
		email = kcUser.Username
	}
	name := DeriveUserName(kcUser.Attributes, kcUser.Username, kcUser.Email)
	if name == "" {
		name = email
	}
	if _, err := s.kc.EnsureManagerDefaultGroup(ctx, userID, email, name); err != nil {
		log.Warnf("Failed to ensure manager default group userID=%s err=%v", userID, err)
	}
	if defID, _ := s.kc.EnsureGroupByName(ctx, "Default"); defID != "" {
		if err := s.kc.RemoveUserFromGroup(ctx, userID, defID); err != nil {
			log.Warnf("Failed to remove user from shared default group userID=%s err=%v", userID, err)
		}
	}
}

func (s *userService) assignStandardGroups(ctx context.Context, userID string) {
	log := applogger.ForComponent("users")
	defID, _ := s.kc.EnsureGroupByName(ctx, "Default")

	groups, err := s.kc.GetUserGroups(ctx, userID)
	if err != nil {
		log.Warnf("Failed to fetch user groups before reset userID=%s err=%v", userID, err)
		s.addToGroupIfSet(ctx, userID, defID)
		return
	}

	ownManagerGroup := "Default_" + userID
	inManagerGroup := false
	for _, g := range groups {
		switch {
		case strings.EqualFold(g.Name, ownManagerGroup):
			if err := s.kc.RemoveUserFromGroup(ctx, userID, g.ID); err != nil {
				log.Warnf("Failed to remove own manager group userID=%s groupID=%s err=%v", userID, g.ID, err)
			}
		case strings.HasPrefix(g.Name, "Default_"):
			inManagerGroup = true
		}
	}

	if inManagerGroup {
		if defID != "" {
			if err := s.kc.RemoveUserFromGroup(ctx, userID, defID); err != nil {
				log.Warnf("Failed to remove user from shared default group userID=%s groupID=%s err=%v", userID, defID, err)
			}
		}
		return
	}
	s.addToGroupIfSet(ctx, userID, defID)
}

func (s *userService) addToGroupIfSet(ctx context.Context, userID, groupID string) {
	if groupID == "" {
		return
	}
	if err := s.kc.AddUserToGroup(ctx, userID, groupID); err != nil {
		applogger.ForComponent("users").Warnf("Failed to add user to shared default group userID=%s groupID=%s err=%v", userID, groupID, err)
	}
}

func (s *userService) CleanupUserGroups(ctx context.Context, userID string) {
	log := applogger.ForComponent("users")
	userGroups, err := s.kc.GetUserGroups(ctx, userID)
	if err != nil {
		log.Warnf("failed to fetch user groups before delete id=%s err=%v", userID, err)
		return
	}
	for _, group := range userGroups {
		s.processUserGroupForDeletion(ctx, userID, group.ID)
	}
}

func (s *userService) processUserGroupForDeletion(ctx context.Context, userID, groupID string) {
	log := applogger.ForComponent("users")
	groupDetail, err := s.kc.GetGroup(ctx, groupID)
	if err != nil {
		log.Warnf("failed to fetch group details group_id=%s err=%v", groupID, err)
		return
	}
	expectedGroupName := fmt.Sprintf("Default_%s", userID)
	if groupDetail.Name == expectedGroupName {
		s.cleanupManagerGroup(ctx, groupDetail.ID, groupDetail.Name, userID)
	}
}

func (s *userService) cleanupManagerGroup(ctx context.Context, groupID, groupName, userID string) {
	log := applogger.ForComponent("users")
	if err := s.db.Where("group_id = ?", groupID).Delete(&models.WorkspaceGroup{}).Error; err != nil {
		log.Warnf("failed to cleanup workspace groups for group_id=%s err=%v", groupID, err)
	}
	if err := s.kc.DeleteGroup(ctx, groupID); err != nil {
		log.Warnf("failed to delete manager group group_id=%s user_id=%s err=%v", groupID, userID, err)
	} else {
		log.Infof("successfully deleted manager group group_id=%s group_name=%s for user_id=%s", groupID, groupName, userID)
	}
}

func (s *userService) CleanupUserDatabaseRecords(userID, userEmail string) {
	log := applogger.ForComponent("users")
	if err := s.db.Where(sqlUserIDOrEmail, userID, userEmail).Delete(&models.WorkspaceMember{}).Error; err != nil {
		log.Warnf("failed to cleanup workspace members for user id=%s err=%v", userID, err)
	}
	if err := s.db.Where(sqlUserIDOrEmail, userID, userEmail).Delete(&models.ModelShare{}).Error; err != nil {
		log.Warnf("failed to cleanup model shares for user id=%s err=%v", userID, err)
	}
}

func shouldCountUserForManager(userID, managerID, groupID, defaultGroupID string, mgrSet map[string]bool) bool {
	if groupID == "" || !mgrSet[groupID] {
		return false
	}
	if defaultGroupID != "" && groupID == defaultGroupID {
		return userID == managerID
	}
	return true
}

func (s *userService) CountManagerUsers(ctx context.Context, authToken, managerID string) (int, error) {
	mgrSet, err := s.kc.GetManagerGroupSet(ctx, managerID)
	if err != nil {
		return 0, err
	}
	defaultID, _ := s.kc.EnsureGroupByName(ctx, "Default")
	kcUsers, err := s.userStore.ListUsers(authToken, usersstore.ListUsersParams{First: 0, Max: 10000})
	if err != nil {
		return 0, err
	}
	count := 0
	for _, u := range kcUsers {
		gid := s.GetUserFirstGroup(ctx, u.ID)
		if shouldCountUserForManager(u.ID, managerID, gid, defaultID, mgrSet) {
			count++
		}
	}
	return count, nil
}
