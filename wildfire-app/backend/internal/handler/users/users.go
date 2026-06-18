package usershandler

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"platform.local/common/pkg/authclient"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	authplatform "platform.local/platform/auth"
	platformkeycloak "platform.local/platform/keycloak"
	platformsession "platform.local/platform/session"
	"spatialhub_backend/internal/config"
	"spatialhub_backend/internal/services"
	apitokenstore "spatialhub_backend/internal/store/apitoken"
	usersstore "spatialhub_backend/internal/store/users"
)

const (
	errKeycloakRequestFailed = "keycloak request failed"
	errIDRequired            = "id required"
)

type Handler struct {
	cfg                *config.Config
	userStore          *usersstore.Store
	adminTokenProvider *authplatform.AdminTokenProvider
	authClient         *authclient.Client
	kc                 *platformkeycloak.Client
	sessionStore       platformsession.SessionStore
	authz              services.AuthorizationService
	userService        services.UserService
	apiTokens          *apitokenstore.Store
}

func New(cfg *config.Config, db *gorm.DB, sessionStore platformsession.SessionStore, adminTokenProvider *authplatform.AdminTokenProvider) *Handler {
	userStore := usersstore.New(cfg)
	kc := platformkeycloak.NewClient(cfg.Auth.BaseURL, cfg.Auth.Realm, adminTokenProvider)
	authz := services.NewAuthorizationService(db, kc)
	h := &Handler{
		cfg:                cfg,
		userStore:          userStore,
		adminTokenProvider: adminTokenProvider,
		authClient:         authclient.NewClient(),
		kc:                 kc,
		sessionStore:       sessionStore,
		authz:              authz,
		apiTokens:          apitokenstore.NewStore(db),
	}
	h.userService = services.NewUserService(db, userStore, kc, authz)
	return h
}

func (h *Handler) deleteUserSessions(ctx context.Context, userID string) error {
	return h.authClient.DeleteUserSessions(ctx, userID)
}

func (h *Handler) validateManagerUserAccess(c *gin.Context, userID string, actionDescription string) (string, bool) {
	sessionData, ok := httputil.GetSessionFromContext(c)
	if !ok {
		return "", false
	}
	if !httputil.RequireManagerOrExpertAccess(sessionData, c) {
		return "", false
	}
	authToken := h.getAuthToken(sessionData)
	if sessionData.AccessLevel == constants.AccessLevelManager && !h.userService.CanManagerAccessUser(c.Request.Context(), sessionData.UserID, userID) {
		httputil.ErrorResponse(c, http.StatusForbidden, fmt.Sprintf("You can only %s users in your groups", actionDescription))
		return "", false
	}
	return authToken, true
}

func (h *Handler) adminAccessToken() (string, error) {
	if h.adminTokenProvider == nil {
		return "", fmt.Errorf("admin token provider not initialized")
	}
	return h.adminTokenProvider.GetToken()
}

func (h *Handler) getAuthToken(sessionData *platformsession.SessionData) string {
	adminTok, errTok := h.adminAccessToken()
	if errTok == nil && adminTok != "" {
		return adminTok
	}
	return sessionData.AccessToken
}

func (h *Handler) getAuthTokenWithRetry(sessionData *platformsession.SessionData) string {
	adminTok, errTok := h.adminAccessToken()
	if errTok == nil && adminTok != "" {
		return adminTok
	}
	if h.adminTokenProvider != nil {
		h.adminTokenProvider.Invalidate()
		adminTok, errTok = h.adminAccessToken()
		if errTok == nil && adminTok != "" {
			return adminTok
		}
	}
	return sessionData.AccessToken
}
