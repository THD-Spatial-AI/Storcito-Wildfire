package main

import (
	"context"
	"log"
	"os"
	"strings"

	"platform.local/platform/keycloak"
)

func seedUser(ctx context.Context, kc *keycloak.Client) {
	username := seedEnv("SEED_ADMIN_USERNAME", "admin")
	email := seedEnv("SEED_ADMIN_EMAIL", "admin@storcito.de")
	password := seedEnv("SEED_ADMIN_PASSWORD", "12345678")
	fullName := seedEnv("SEED_ADMIN_FULL_NAME", "Admin")
	organization := seedEnv("SEED_ADMIN_ORGANIZATION", "THD")
	position := seedEnv("SEED_ADMIN_POSITION", "Dev")
	phone := seedEnv("SEED_ADMIN_PHONE", "0176111111111")

	if password == "12345678" {
		log.Println("WARNING: using default seed admin password; change it immediately after first login")
	}

	// Check if user exists
	users, err := kc.FindUsers(ctx, username)
	if err != nil {
		log.Printf("Failed to find users: %v", err)
		return
	}

	for _, u := range users {
		if u.Username == username {
			log.Printf("User %s already exists", username)
			return
		}
	}

	// Create user
	user := map[string]any{
		"username":      username,
		"email":         email,
		"enabled":       true,
		"emailVerified": true,
		"credentials": []map[string]any{
			{
				"type":      "password",
				"value":     password,
				"temporary": false,
			},
		},
		"attributes": map[string]any{
			"access_level": []string{"expert"},
			"fullName":     []string{fullName},
			"organization": []string{organization},
			"position":     []string{position},
			"phone":        []string{phone},
		},
	}

	id, err := kc.CreateUser(ctx, user)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "already exists") {
			log.Printf("User %s already exists, skipping", username)
			return
		}
		log.Printf("Failed to create user: %v", err)
		return
	}
	log.Printf("Seeded user: %s (%s)", username, id)
}

func seedEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func seedBool(key string) bool {
	switch strings.ToLower(seedEnv(key, "false")) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}
