package users

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	urlpkg "net/url"
	"strconv"
	"strings"

	applogger "platform.local/platform/logger"
	"spatialhub_backend/internal/config"
)

const (
	errMarshalPayload   = "failed to marshal payload: %w"
	errFetchCurrentUser = "failed to fetch current user: %w"
	urlPatternAdminUser = "%s/admin/realms/%s/users/%s"
)

// default model limits
var defaultModelLimits = map[string]int{
	"very_low":     10,
	"intermediate": 25,
	"manager":      50,
	"expert":       0, // 0 unlimited
}

// returns default model
func getDefaultModelLimit(accessLevel string) int {
	if limit, ok := defaultModelLimits[accessLevel]; ok {
		return limit
	}
	return 10 // default basic user
}

// handles all keycloak
type Store struct {
	cfg *config.Config
}

// performs keycloak api
func (s *Store) keycloakRequest(method, url, authToken string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+authToken)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	return resp, nil
}

// creates standard user
func buildUserUpdatePayload(user *User) map[string]interface{} {
	return map[string]interface{}{
		"username":        user.Username,
		"email":           user.Email,
		"enabled":         user.Enabled,
		"emailVerified":   user.EmailVerified,
		"attributes":      user.Attributes,
		"requiredActions": user.RequiredActions,
	}
}

// validates http response
func checkKeycloakResponse(resp *http.Response, acceptedCodes ...int) error {
	for _, code := range acceptedCodes {
		if resp.StatusCode == code {
			return nil
		}
	}
	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("keycloak error (status %d): %s", resp.StatusCode, string(body))
}

// performs request checks
func (s *Store) doKeycloakRequest(method, url, authToken string, body io.Reader, acceptedCodes ...int) (*http.Response, error) {
	resp, err := s.keycloakRequest(method, url, authToken, body)
	if err != nil {
		return nil, err
	}

	if err := checkKeycloakResponse(resp, acceptedCodes...); err != nil {
		_ = resp.Body.Close()
		return nil, err
	}

	return resp, nil
}

// performs get request
func (s *Store) getKeycloakUsers(authToken, url string) ([]User, error) {
	resp, err := s.doKeycloakRequest("GET", url, authToken, nil, http.StatusOK)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var users []User
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, fmt.Errorf("failed to decode users: %w", err)
	}

	return users, nil
}

// sends user update
func (s *Store) updateUserPayload(authToken, userID string, user *User) error {
	updatePayload := buildUserUpdatePayload(user)

	body, err := json.Marshal(updatePayload)
	if err != nil {
		return fmt.Errorf(errMarshalPayload, err)
	}

	url := fmt.Sprintf(urlPatternAdminUser, s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, userID)
	return s.doKeycloakPUT(authToken, url, body, http.StatusNoContent, http.StatusOK)
}

// invite link valid
const setPasswordLinkSeconds = 72 * 60 * 60

// set password email
func (s *Store) SendSetPasswordEmail(authToken, userID string) error {
	withRedirect := s.cfg.Auth.ClientID != "" && s.cfg.AppURL != ""
	err := s.executeActionsEmail(authToken, userID, withRedirect)
	// redirect not allowed
	if err != nil && withRedirect && strings.Contains(err.Error(), "redirect") {
		applogger.ForComponent("users").Warnf("app url %s not an allowed keycloak redirect, sending without return link", s.cfg.AppURL)
		return s.executeActionsEmail(authToken, userID, false)
	}
	return err
}

func (s *Store) executeActionsEmail(authToken, userID string, withRedirect bool) error {
	params := urlpkg.Values{}
	params.Set("lifespan", strconv.Itoa(setPasswordLinkSeconds))
	if withRedirect {
		params.Set("client_id", s.cfg.Auth.ClientID)
		params.Set("redirect_uri", strings.TrimRight(s.cfg.AppURL, "/")+"/login")
	}
	endpoint := fmt.Sprintf(urlPatternAdminUser+"/execute-actions-email?%s", s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, urlpkg.PathEscape(userID), params.Encode())
	resp, err := s.keycloakRequest("PUT", endpoint, authToken, strings.NewReader(`["UPDATE_PASSWORD"]`))
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	return checkKeycloakResponse(resp, http.StatusOK, http.StatusNoContent)
}

func New(cfg *config.Config) *Store {
	return &Store{cfg: cfg}
}

// represents keycloak user
type User struct {
	ID               string              `json:"id"`
	Username         string              `json:"username"`
	Email            string              `json:"email"`
	EmailVerified    bool                `json:"emailVerified"`
	Enabled          bool                `json:"enabled"`
	Attributes       map[string][]string `json:"attributes"`
	RequiredActions  []string            `json:"requiredActions"`
	CreatedTimestamp *int64              `json:"createdTimestamp,omitempty"`
}

// represents data needed
type CreateUserRequest struct {
	Email       string
	Name        string
	Password    string
	AccessLevel string
}

// represents data needed
type UpdateUserRequest struct {
	Email         *string
	Name          *string
	AccessLevel   *string
	EmailVerified *bool
	Password      *string
	ModelLimit    *int
}

// represents parameters listing
type ListUsersParams struct {
	First  int
	Max    int
	Search string
}

func (s *Store) GetUser(authToken, userID string) (*User, error) {
	url := fmt.Sprintf(urlPatternAdminUser, s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, userID)

	resp, err := s.doKeycloakRequest("GET", url, authToken, nil, http.StatusOK)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user: %w", err)
	}

	if user.Attributes == nil {
		user.Attributes = make(map[string][]string)
	}

	return &user, nil
}

func (s *Store) ListUsers(authToken string, params ListUsersParams) ([]User, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users?first=%d&max=%d&briefRepresentation=false",
		s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, params.First, params.Max)

	if params.Search != "" {
		url += "&search=" + urlpkg.QueryEscape(params.Search)
	}

	return s.getKeycloakUsers(authToken, url)
}

func (s *Store) CreateUser(authToken string, req CreateUserRequest) (string, error) {
	// get default model
	modelLimit := getDefaultModelLimit(req.AccessLevel)

	payload := map[string]interface{}{
		"username":      req.Email,
		"email":         req.Email,
		"enabled":       true,
		"emailVerified": false,
		"attributes": map[string][]string{
			"access_level": {req.AccessLevel},
			"fullName":     {req.Name},
			"model_limit":  {fmt.Sprintf("%d", modelLimit)},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf(errMarshalPayload, err)
	}

	url := fmt.Sprintf("%s/admin/realms/%s/users", s.cfg.Auth.BaseURL, s.cfg.Auth.Realm)

	resp, err := s.keycloakRequest("POST", url, authToken, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if err := checkKeycloakResponse(resp, http.StatusCreated, http.StatusNoContent); err != nil {
		return "", err
	}

	// find created user
	users, err := s.FindUserByEmail(authToken, req.Email)
	if err != nil {
		return "", fmt.Errorf("failed to find created user: %w", err)
	}
	if len(users) == 0 {
		return "", fmt.Errorf("created user not found")
	}

	return users[0].ID, nil
}

func (s *Store) UpdateUser(authToken, userID string, req UpdateUserRequest) error {
	currentUser, err := s.GetUser(authToken, userID)
	if err != nil {
		return fmt.Errorf(errFetchCurrentUser, err)
	}

	applyUserUpdates(currentUser, req)
	return s.updateUserPayload(authToken, userID, currentUser)
}

func applyUserUpdates(user *User, req UpdateUserRequest) {
	if req.Email != nil && *req.Email != "" {
		user.Email = *req.Email
		user.EmailVerified = false
	}
	if req.Name != nil && *req.Name != "" {
		user.Attributes["fullName"] = []string{*req.Name}
	}
	if req.AccessLevel != nil && *req.AccessLevel != "" {
		newAccessLevel := strings.ToLower(*req.AccessLevel)
		user.Attributes["access_level"] = []string{newAccessLevel}
		// auto-update model_limit access_level
		if req.ModelLimit == nil {
			user.Attributes["model_limit"] = []string{fmt.Sprintf("%d", getDefaultModelLimit(newAccessLevel))}
		}
	}
	if req.EmailVerified != nil && *req.EmailVerified {
		user.EmailVerified = true
		removeVerifyEmailAction(user)
	}
	if req.ModelLimit != nil {
		user.Attributes["model_limit"] = []string{fmt.Sprintf("%d", *req.ModelLimit)}
	}
}

func removeVerifyEmailAction(user *User) {
	if len(user.RequiredActions) == 0 {
		return
	}
	filtered := make([]string, 0, len(user.RequiredActions))
	for _, ra := range user.RequiredActions {
		if !strings.EqualFold(ra, "VERIFY_EMAIL") {
			filtered = append(filtered, ra)
		}
	}
	user.RequiredActions = filtered
}

func (s *Store) UpdateUserAttributes(authToken, userID string, attributes map[string][]string) error {
	currentUser, err := s.GetUser(authToken, userID)
	if err != nil {
		return fmt.Errorf(errFetchCurrentUser, err)
	}

	for key, value := range attributes {
		currentUser.Attributes[key] = value
	}

	return s.updateUserPayload(authToken, userID, currentUser)
}

func (s *Store) DeleteUser(authToken, userID string) error {
	url := fmt.Sprintf(urlPatternAdminUser, s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, userID)

	resp, err := s.keycloakRequest("DELETE", url, authToken, nil)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	return checkKeycloakResponse(resp, http.StatusNoContent, http.StatusOK)
}

func (s *Store) SetUserEnabled(authToken, userID string, enabled bool) error {
	currentUser, err := s.GetUser(authToken, userID)
	if err != nil {
		return fmt.Errorf(errFetchCurrentUser, err)
	}
	currentUser.Enabled = enabled

	return s.updateUserPayload(authToken, userID, currentUser)
}

func (s *Store) SetUserPassword(authToken, userID, password string, temporary bool) error {
	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/reset-password", s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, userID)

	payload := map[string]interface{}{
		"type":      "password",
		"value":     password,
		"temporary": temporary,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf(errMarshalPayload, err)
	}

	return s.doKeycloakPUT(authToken, url, body, http.StatusNoContent, http.StatusOK)
}

// executes put request
func (s *Store) doKeycloakPUT(authToken, url string, body []byte, acceptedCodes ...int) error {
	resp, err := s.keycloakRequest("PUT", url, authToken, bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	return checkKeycloakResponse(resp, acceptedCodes...)
}

func (s *Store) FindUserByEmail(authToken, email string) ([]User, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users?email=%s&exact=true",
		s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, urlpkg.QueryEscape(email))

	return s.getKeycloakUsers(authToken, url)
}

func (s *Store) CountUsers(authToken, search string) (int, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users/count", s.cfg.Auth.BaseURL, s.cfg.Auth.Realm)
	if search != "" {
		url += "?search=" + urlpkg.QueryEscape(search)
	}

	resp, err := s.doKeycloakRequest("GET", url, authToken, nil, http.StatusOK)
	if err != nil {
		return 0, err
	}
	defer func() { _ = resp.Body.Close() }()

	var count int
	if err := json.NewDecoder(resp.Body).Decode(&count); err != nil {
		return 0, fmt.Errorf("failed to decode count: %w", err)
	}

	return count, nil
}

func (s *Store) FetchUserRoles(authToken, userID string) ([]string, error) {
	if userID == "" {
		return nil, nil
	}

	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm",
		s.cfg.Auth.BaseURL, s.cfg.Auth.Realm, userID)

	resp, err := s.keycloakRequest("GET", url, authToken, nil)
	if err != nil {
		applogger.ForComponent("users-store").Warnf("Failed to fetch roles for user %s: %v", userID, err)
		return nil, nil
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		applogger.ForComponent("users-store").Warnf("Non-200 status fetching roles for user %s: %d", userID, resp.StatusCode)
		return nil, nil
	}

	var roles []struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&roles); err != nil {
		return nil, nil
	}

	result := make([]string, 0, len(roles))
	for _, r := range roles {
		result = append(result, r.Name)
	}

	return result, nil
}
