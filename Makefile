.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
CYAN := \033[0;36m
NC := \033[0m

# Compose files: dev overrides fix Keycloak issuer for localhost
PLATFORM_COMPOSE := -f platform-core/docker-compose.yml -f platform-core/docker-compose.dev.yml
WILDFIRE_APP_COMPOSE := -f wildfire-app/docker-compose.yml -f wildfire-app/docker-compose.dev.yml
GEOSERVER_COMPOSE := -f platform-core/geoserver/docker-compose.yml

.PHONY: help
help:
	@echo "SpatialHub Architecture"
	@echo "Usage:"
	@echo "  make setup              Full setup (recommended for first time)"
	@echo "  make up                 Start Platform Core"
	@echo "  make down               Stop Platform Core"
	@echo "  make logs               Follow Platform logs"
	@echo "  make up-wildfire-app      Start Wildfire App"
	@echo "  make down-wildfire-app    Stop Wildfire App"
	@echo "  make logs-wildfire-app    Follow Wildfire App logs"
	@echo "  make up-geoserver       Start GeoServer stack (Kartoza + geoservice)"
	@echo "  make down-geoserver     Stop GeoServer stack"
	@echo "  make logs-geoserver     Follow GeoServer logs"
	@echo "  make restart-geoserver  Restart GeoServer stack"
	@echo "  make init-keycloak      Initialize Keycloak"
	@echo "  make migrate            Run Energy App DB migrations"
	@echo "  make seed               Seed the database"
	@echo "  make install            Install dependencies"
	@echo ""
	@echo "Database:"
	@echo "  make start-postgres     Start PostgreSQL with pgRouting"
	@echo "  make stop-postgres      Stop PostgreSQL"
	@echo "  make remove-postgres    Remove PostgreSQL container"
	@echo ""
	@echo "Individual Repository Pull:"
	@echo "  make pull-platform-core Pull platform-core repository"
	@echo "  make pull-infrastructure Pull infrastructure repository"
	@echo "  make pull-libs          Pull libs repository"

.PHONY: up-db
up-db:
	@echo "$(CYAN)Starting database services...$(NC)"
	@docker network create spatialhub-net 2>/dev/null || true
	@docker compose $(PLATFORM_COMPOSE) up -d postgres redis
	@echo "Waiting for Postgres to be ready..."
	@sleep 5
	@echo "$(GREEN)Database services started.$(NC)"
	@echo ""

.PHONY: start-postgres
start-postgres:
	@echo "$(CYAN)Starting PostgreSQL with pgRouting...$(NC)"
	@docker network create spatialhub-net 2>/dev/null || true
	@docker compose $(PLATFORM_COMPOSE) up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "$(GREEN)PostgreSQL started on port 5433$(NC)"
	@echo ""

.PHONY: stop-postgres
stop-postgres:
	@echo "$(CYAN)Stopping PostgreSQL...$(NC)"
	@docker compose $(PLATFORM_COMPOSE) stop postgres
	@echo "$(GREEN)PostgreSQL stopped.$(NC)"

.PHONY: remove-postgres
remove-postgres:
	@echo "$(CYAN)Removing PostgreSQL container...$(NC)"
	@docker compose $(PLATFORM_COMPOSE) rm -f postgres
	@echo "$(GREEN)PostgreSQL container removed.$(NC)"

.PHONY: db-create
db-create:
	@echo "$(CYAN)Creating database if not exists...$(NC)"
	@docker exec postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'spatialai'" | grep -q 1 || \
		docker exec postgres psql -U postgres -c "CREATE DATABASE spatialai"
	@echo "$(GREEN)Database ready.$(NC)"
	@echo ""

.PHONY: up-keycloak
up-keycloak:
	@echo "$(CYAN)Starting Keycloak...$(NC)"
	@docker compose $(PLATFORM_COMPOSE) up -d keycloak
	@echo "Waiting for Keycloak to be healthy..."
	@sleep 15
	@echo "$(GREEN)Keycloak started.$(NC)"
	@echo ""

.PHONY: init-keycloak
init-keycloak:
	@echo "$(CYAN)Running Keycloak init (configuring realm and updating .env files)...$(NC)"
	@docker compose $(PLATFORM_COMPOSE) up keycloak-init
	@echo "$(GREEN)Keycloak configured and client secrets updated in .env files.$(NC)"
	@echo ""

.PHONY: up-services
up-services:
	@echo "$(CYAN)Building and starting platform services...$(NC)"
	@docker compose $(PLATFORM_COMPOSE) up -d --build auth-service webservice geoservice
	@echo "$(GREEN)Platform services started.$(NC)"
	@echo ""

.PHONY: up
up:
	@echo "$(CYAN)Starting Platform Core...$(NC)"
	@docker network create spatialhub-net 2>/dev/null || true
	@docker compose $(PLATFORM_COMPOSE) up -d postgres redis keycloak auth-service webservice geoservice
	@echo "Services running:"
	@echo "  Keycloak: http://localhost:8080"
	@echo "  Auth Service: http://localhost:8001"
	@echo "  Webservice: http://localhost:8082"
	@echo "  GeoService: http://localhost:8083"
	@echo "  Postgres: localhost:5433"
	@echo "  Redis: localhost:6379"

.PHONY: down
down:
	@echo "Stopping Platform Core..."
	@docker compose $(PLATFORM_COMPOSE) down

.PHONY: logs
logs:
	@docker compose $(PLATFORM_COMPOSE) logs -f

.PHONY: up-wildfire-app
up-wildfire-app:
	@echo "$(CYAN)Starting Wildfire App...$(NC)"
	@docker network create spatialhub-net 2>/dev/null || true
	@docker compose $(WILDFIRE_APP_COMPOSE) up -d --build
	@echo "$(GREEN)Wildfire App services started.$(NC)"
	@echo "Services running:"
	@echo "  Energy Backend: http://localhost:8000"
	@echo "  Energy Frontend: http://localhost:3000"
	@echo "  Pylovo: http://localhost:8086"

.PHONY: down-wildfire-app
down-wildfire-app:
	@echo "Stopping Wildfire App..."
	@docker compose $(WILDFIRE_APP_COMPOSE) down

.PHONY: logs-wildfire-app
logs-wildfire-app:
	@docker compose $(WILDFIRE_APP_COMPOSE) logs -f

# -----------------------------------------------------------------------------
# GeoServer stack (Kartoza GeoServer + Go geoservice REST API).
# The geoservice runs as part of platform-core compose; the Kartoza
# GeoServer container lives in platform-core/geoserver/docker-compose.yml.
# These targets operate on BOTH so the full publish-and-render path works.
# -----------------------------------------------------------------------------

.PHONY: up-geoserver
up-geoserver:
	@echo "$(CYAN)Starting GeoServer stack...$(NC)"
	@docker network create spatialhub-net 2>/dev/null || true
	@docker compose $(GEOSERVER_COMPOSE) up -d
	@docker compose $(PLATFORM_COMPOSE) up -d --build geoservice
	@echo "$(GREEN)GeoServer stack started.$(NC)"
	@echo "  GeoServer Web:  http://localhost:8180/geoserver"
	@echo "  GeoService API: http://localhost:8083"
	@echo ""

.PHONY: down-geoserver
down-geoserver:
	@echo "$(CYAN)Stopping GeoServer stack...$(NC)"
	@docker compose $(PLATFORM_COMPOSE) stop geoservice
	@docker compose $(GEOSERVER_COMPOSE) down
	@echo "$(GREEN)GeoServer stack stopped.$(NC)"

.PHONY: logs-geoserver
logs-geoserver:
	@docker compose $(GEOSERVER_COMPOSE) logs -f

.PHONY: restart-geoserver
restart-geoserver: down-geoserver up-geoserver
	@echo "$(GREEN)GeoServer stack restarted.$(NC)"

.PHONY: setup
setup: git-credential-cache setup-repos env-setup install pull-images up-db db-create up-keycloak init-keycloak up-services migrate seed setup-complete
	@echo ""

.PHONY: git-credential-cache
git-credential-cache:
	@echo "$(CYAN)Configuring git credential cache for 2 minutes...$(NC)"
	@git config --global credential.helper 'cache --timeout=120'
	@echo "Git credentials will be cached for 2 minutes after first entry."
	@echo ""

.PHONY: setup-repos
setup-repos:
	@echo "$(CYAN)Cloning/Updating repositories...$(NC)"
	@echo "You will be prompted for credentials once (cached for 2 minutes)."
	@echo ""
	@[ -d platform-core ] && (echo "Pulling platform-core..." && cd platform-core && git pull) || git clone https://mygit.th-deg.de/thd-spatial-ai/microservices/platform-core.git
	@[ -d libs ] && (echo "Pulling libs..." && cd libs && git pull) || git clone https://mygit.th-deg.de/thd-spatial-ai/microservices/react-shared-components.git libs
	@[ -d infrastructure ] && (echo "Pulling infrastructure..." && cd infrastructure && git pull) || git clone https://mygit.th-deg.de/thd-spatial-ai/microservices/backend-infrastructure.git infrastructure
	@echo "$(GREEN)Repositories updated.$(NC)"
	@echo ""

.PHONY: pull-platform-core
pull-platform-core:
	@echo "$(CYAN)Pulling platform-core...$(NC)"
	@[ -d platform-core ] && (cd platform-core && git pull) || git clone https://mygit.th-deg.de/thd-spatial-ai/microservices/platform-core.git
	@echo "$(GREEN)platform-core updated.$(NC)"

.PHONY: pull-infrastructure
pull-infrastructure:
	@echo "$(CYAN)Pulling infrastructure...$(NC)"
	@[ -d infrastructure ] && (cd infrastructure && git pull) || git clone https://mygit.th-deg.de/thd-spatial-ai/microservices/backend-infrastructure.git infrastructure
	@echo "$(GREEN)infrastructure updated.$(NC)"

.PHONY: pull-libs
pull-libs:
	@echo "$(CYAN)Pulling libs...$(NC)"
	@[ -d libs ] && (cd libs && git pull) || git clone https://mygit.th-deg.de/thd-spatial-ai/microservices/react-shared-components.git libs
	@echo "$(GREEN)libs updated.$(NC)"

.PHONY: env-setup
env-setup:
	@echo "$(CYAN)Creating .env files from .env.example...$(NC)"
	@# Platform Core services
	@[ -f platform-core/auth-service/.env ] || (cp platform-core/auth-service/.env.example platform-core/auth-service/.env && echo "  Created: platform-core/auth-service/.env")
	@[ -f platform-core/webservice/.env ] || (cp platform-core/webservice/.env.example platform-core/webservice/.env && echo "  Created: platform-core/webservice/.env")
	@# Energy App
	@[ -f wildfire-app/backend/.env ] || (cp wildfire-app/backend/.env.example wildfire-app/backend/.env && echo "  Created: wildfire-app/backend/.env")
	@[ -f wildfire-app/frontend/.env ] || (cp wildfire-app/frontend/.env.example wildfire-app/frontend/.env && echo "  Created: wildfire-app/frontend/.env")
	@echo "$(GREEN).env files created.$(NC)"
	@echo ""

.PHONY: install
install: install-npm install-go
	@echo "$(GREEN)All dependencies installed.$(NC)"
	@echo ""

.PHONY: install-npm
install-npm:
	@echo "$(CYAN)Installing NPM dependencies...$(NC)"
	@echo "Installing libs/i18n..."
	@cd libs/i18n && npm install --force
	@echo "Building libs/i18n..."
	@cd libs/i18n && npm run build
	@echo "Installing libs/ui..."
	@cd libs/ui && npm install --force
	@echo "Building libs/ui..."
	@cd libs/ui && npm run build
	@echo "Installing libs/forms..."
	@cd libs/forms && npm install --force
	@echo "Building libs/forms..."
	@cd libs/forms && npm run build
	@echo "Installing libs/auth..."
	@cd libs/auth && npm install --force
	@echo "Building libs/auth..."
	@cd libs/auth && npm run build
	@echo "Installing frontend..."
	@cd wildfire-app/frontend && npm install --force
	@echo "$(GREEN)NPM dependencies installed.$(NC)"

.PHONY: install-go
install-go:
	@echo "$(CYAN)Running go mod tidy in all Go modules...$(NC)"
	@echo "  wildfire-app/backend..."
	@cd wildfire-app/backend && go mod tidy
	@echo "  infrastructure/platform..."
	@cd infrastructure/platform && go mod tidy
	@echo "  infrastructure/common..."
	@cd infrastructure/common && go mod tidy
	@echo "  platform-core/auth-service..."
	@cd platform-core/auth-service && go mod tidy
	@echo "  platform-core/webservice..."
	@cd platform-core/webservice && go mod tidy
	@echo "$(GREEN)Go modules tidied.$(NC)"

.PHONY: pull-images
pull-images:
	@echo "$(CYAN)Pulling Docker images...$(NC)"
	@echo "Pulling PostgreSQL..."
	@docker pull postgres:15-alpine
	@echo "Pulling Redis..."
	@docker pull redis:7-alpine
	@echo "Pulling all Platform Core images..."
	@docker compose $(PLATFORM_COMPOSE) pull --ignore-buildable postgres redis keycloak
	@echo "$(GREEN)Docker images pulled.$(NC)"
	@echo ""

.PHONY: migrate
migrate:
	@echo "$(CYAN)Running Energy App Migrations...$(NC)"
	@cd wildfire-app/backend && go run cmd/migrate/migration.go
	@echo "$(GREEN)Migrations complete.$(NC)"
	@echo ""

.PHONY: seed
seed:
	@echo "$(CYAN)Seeding Database...$(NC)"
	@cd wildfire-app/backend && go run cmd/seed/*.go
	@echo "$(GREEN)Database seeded.$(NC)"
	@echo ""

.PHONY: setup-complete
setup-complete:
	@echo ""
	@echo "$(GREEN)============================================$(NC)"
	@echo "$(GREEN)        Setup Complete!$(NC)"
	@echo "$(GREEN)============================================$(NC)"
	@echo ""
	@echo "$(YELLOW)To start the application:$(NC)"
	@echo ""
	@echo "  1. Start the backend:"
	@echo "     $(CYAN)cd wildfire-app/backend && go run cmd/main.go$(NC)"
	@echo ""
	@echo "  2. Start the frontend (in a new terminal):"
	@echo "     $(CYAN)cd wildfire-app/frontend && npm run dev$(NC)"
	@echo ""
	@echo "  3. Access your application:"
	@echo "     $(CYAN)http://localhost:3000$(NC)"
	@echo ""
	@echo "$(YELLOW)Optional: Start GeoServer for map visualization:$(NC)"
	@echo "     $(CYAN)make up-geoserver$(NC)"
	@echo ""
	@echo "$(YELLOW)Initial Login Credentials:$(NC)"
	@echo "  Email:    $(CYAN)admin@spatialai.de$(NC)"
	@echo "  Password: $(CYAN)12345678$(NC)"
	@echo ""
	@echo "$(GREEN)============================================$(NC)"

.PHONY: sonar
sonar:
	@echo "Running SonarQube Analysis..."
	@./bin/sonar-scanner/bin/sonar-scanner

