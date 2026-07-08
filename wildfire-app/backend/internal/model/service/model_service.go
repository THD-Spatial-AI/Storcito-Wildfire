package modelservice

import (
	platformkeycloak "platform.local/platform/keycloak"
	"spatialhub_backend/internal/cache"
	"spatialhub_backend/internal/services"
)

type ModelService struct {
	store         services.ModelStore
	kc            *platformkeycloak.Client
	keycloakCache *cache.KeycloakCacheService
}

func NewModelServiceWithStore(store services.ModelStore, kc *platformkeycloak.Client) *ModelService {
	return &ModelService{store: store, kc: kc}
}

func NewModelServiceWithStoreAndCache(store services.ModelStore, kc *platformkeycloak.Client, keycloakCache *cache.KeycloakCacheService) *ModelService {
	return &ModelService{store: store, kc: kc, keycloakCache: keycloakCache}
}
