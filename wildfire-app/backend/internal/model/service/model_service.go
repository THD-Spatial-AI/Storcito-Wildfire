package modelservice

import (
	"gorm.io/gorm"

	platformkeycloak "platform.local/platform/keycloak"
	"spatialhub_backend/internal/cache"
	"spatialhub_backend/internal/services"
	modelstore "spatialhub_backend/internal/store/model"
)

type ModelService struct {
	store         services.ModelStore
	kc            *platformkeycloak.Client
	keycloakCache *cache.KeycloakCacheService
}

func NewModelService(db *gorm.DB, kc *platformkeycloak.Client) *ModelService {
	return NewModelServiceWithStore(modelstore.NewStore(db), kc)
}

// NewModelServiceWithCache creates a ModelService with caching support
func NewModelServiceWithCache(db *gorm.DB, kc *platformkeycloak.Client, keycloakCache *cache.KeycloakCacheService) *ModelService {
	return NewModelServiceWithStoreAndCache(modelstore.NewStore(db), kc, keycloakCache)
}

func NewModelServiceWithStore(store services.ModelStore, kc *platformkeycloak.Client) *ModelService {
	return &ModelService{store: store, kc: kc}
}

func NewModelServiceWithStoreAndCache(store services.ModelStore, kc *platformkeycloak.Client, keycloakCache *cache.KeycloakCacheService) *ModelService {
	return &ModelService{store: store, kc: kc, keycloakCache: keycloakCache}
}
