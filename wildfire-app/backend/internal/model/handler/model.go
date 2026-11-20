package model

import (
	"encoding/json"
	"time"

	"spatialhub_backend/internal/areas"
	"spatialhub_backend/internal/cache"
	areashandler "spatialhub_backend/internal/handler/areas"
	"spatialhub_backend/internal/services"
	modelstore "spatialhub_backend/internal/store/model"
	"spatialhub_backend/internal/webservice"

	"platform.local/common/pkg/httputil"
	pkgauth "platform.local/platform/auth"
	ikc "platform.local/platform/keycloak"

	"github.com/gin-gonic/gin"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"
)

const (
	errAccessDenied          = "Access denied"
	errAccessDeniedWorkspace = "Access denied to workspace"
	errModelNotFound         = "Model not found"
	errFailedToFetchModel    = "Failed to fetch model"
	errModelLimitReached     = "Model creation limit reached"
	dateFormat               = "2006-01-02"
	sqlWhereID               = "id = ?"
	sqlWhereAccessLevel      = "access_level = ?"
	preloadWorkspaceMembers  = "Workspace.Members"
	preloadWorkspaceGroups   = "Workspace.Groups"
)

type ModelHandler struct {
	store               services.ModelStore
	asynqClient         *asynq.Client
	kc                  *ikc.Client
	wsClient            *webservice.Client
	keycloakCache       *cache.KeycloakCacheService
	syncCache           *cache.SyncCacheService
	authz               services.AuthorizationService
	notificationService *services.NotificationService
	areas               *areas.Service
}

// date range guard
func (h *ModelHandler) ensurePeriod(c *gin.Context, userCtx *httputil.UserContext, from, to time.Time) bool {
	if h.areas == nil || from.IsZero() || to.IsZero() {
		return true
	}
	if err := h.areas.CheckModelPeriod(c.Request.Context(), userCtx.UserID, userCtx.AccessLevel, from, to); err != nil {
		areashandler.RespondPeriodError(c, err)
		return false
	}
	return true
}

// parsed or zero
func parseDay(value string) time.Time {
	t, _ := time.Parse(dateFormat, value)
	return t
}

// enables area checks
func (h *ModelHandler) WithAreas(svc *areas.Service) *ModelHandler {
	h.areas = svc
	return h
}

// area guard ok
func (h *ModelHandler) ensureArea(c *gin.Context, userCtx *httputil.UserContext, coordinates json.RawMessage) bool {
	if h.areas == nil {
		return true
	}
	if err := h.areas.CheckModelArea(c.Request.Context(), userCtx.UserID, userCtx.AccessLevel, coordinates); err != nil {
		areashandler.RespondCheckError(c, err)
		return false
	}
	return true
}

func NewModelHandlerWithCache(db *gorm.DB, asynqClient *asynq.Client, adminTokenProvider *pkgauth.AdminTokenProvider, keycloakBaseURL, realm string, wsClient *webservice.Client, keycloakCache *cache.KeycloakCacheService, syncCache *cache.SyncCacheService, notificationService *services.NotificationService) *ModelHandler {
	kc := ikc.NewClient(keycloakBaseURL, realm, adminTokenProvider)
	return &ModelHandler{
		store:               modelstore.NewStore(db),
		asynqClient:         asynqClient,
		kc:                  kc,
		wsClient:            wsClient,
		keycloakCache:       keycloakCache,
		syncCache:           syncCache,
		authz:               services.NewAuthorizationService(db, kc),
		notificationService: notificationService,
	}
}
