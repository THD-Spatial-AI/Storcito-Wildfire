package main

import (
	"context"
	"log"

	pkgauth "platform.local/platform/auth"
	"platform.local/platform/database"
	"platform.local/platform/keycloak"
	"spatialhub_backend/internal/config"
)

func main() {
	// Load config
	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to DB
	db, sqlDB, err := database.ConnectWithPing(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer sqlDB.Close()

	// Seed database-backed records
	seedWebservice(db)

	if !seedBool("SEED_KEYCLOAK_USER") {
		log.Println("Skipping Keycloak user seed; set SEED_KEYCLOAK_USER=true to enable it")
		return
	}

	adminTokenProvider := pkgauth.NewAdminTokenProvider(
		cfg.Auth.BaseURL,
		cfg.Auth.Realm,
		cfg.Auth.ClientID,
		cfg.Auth.ClientSecret,
	)

	kcClient := keycloak.NewClient(
		cfg.Auth.BaseURL,
		cfg.Auth.Realm,
		adminTokenProvider,
	)

	seedUser(context.Background(), kcClient)
}
