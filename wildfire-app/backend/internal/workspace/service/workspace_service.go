package workspaceservice

import (
	"gorm.io/gorm"
	authplatform "platform.local/platform/auth"
	platformkeycloak "platform.local/platform/keycloak"
	"spatialhub_backend/internal/cache"
	"spatialhub_backend/internal/services"
)

const (
	queryWorkspaceAndGroupIDs = "workspace_id = ? AND group_id = ?"
	queryIDEquals             = "id = ?"
)

// WorkspaceService holds business logic
type WorkspaceService struct {
	db    *gorm.DB
	kc    *platformkeycloak.Client
	cache *cache.KeycloakCacheService
	authz services.AuthorizationService
}

func NewWorkspaceService(db *gorm.DB, adminTokenProvider *authplatform.AdminTokenProvider, keycloakBaseURL, realm string, kcCache *cache.KeycloakCacheService) *WorkspaceService {
	kc := platformkeycloak.NewClient(keycloakBaseURL, realm, adminTokenProvider)
	return &WorkspaceService{
		db:    db,
		kc:    kc,
		cache: kcCache,
		authz: services.NewAuthorizationService(db, kc),
	}
}
