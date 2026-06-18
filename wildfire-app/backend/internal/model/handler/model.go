package model

import (
	"spatialhub_backend/internal/cache"
	"spatialhub_backend/internal/services"
	modelstore "spatialhub_backend/internal/store/model"
	"spatialhub_backend/internal/webservice"

	pkgauth "platform.local/platform/auth"
	ikc "platform.local/platform/keycloak"

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
	sqlUserStatusNotDeleted  = "user_id = ? AND status = ? AND deleted_at IS NULL"
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
