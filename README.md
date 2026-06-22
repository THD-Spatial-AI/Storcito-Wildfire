# Wildfire App
### Wildfire Risk Assessment & Simulation Platform

**Wildfire App** is a geospatial platform for assessing and simulating wildfire risk over user-defined regions. Users draw a polygon on an interactive map, configure a date range and resolution, and dispatch a simulation run. Results are published as GeoServer raster layers and surfaced as risk metrics, choropleth maps, and model comparisons in the browser.

The application is part of the **SpatialHub** ecosystem at TH Deggendorf, running at `wildfire-app.th-deg.de`.

---

## Overview

### Core Capabilities

- **Interactive Map** — Draw and edit region polygons (OpenLayers + MapLibre GL, 2D) with geocoding search and bookmarks
- **Model Configurator** — Step-by-step wizard to set region, date range, resolution, and optional layers before dispatching a simulation
- **Risk Metrics** — Weighted risk scoring (Very Low → Very High), affected area (km²), distribution histogram, and trend vs. prior run
- **Results Viewer** — Per-model results with GeoServer-backed choropleth map and ECharts visualisations
- **Model Comparison** — Side-by-side risk metrics and distribution charts across any two models
- **Workspaces & Groups** — Organise models into workspaces; share with Keycloak-managed groups
- **Real-time Notifications** — SSE push + Asynq background jobs for simulation status and system events
- **Admin Dashboard** — User, model, feedback, and webservice management with role-based access
- **Weather Settings** — Configure meteorological inputs for simulation runs
- **Feedback System** — In-app feedback with image attachments; auto-cleanup of closed items after 7 days

---

## Architecture

The full system architecture is documented on the project's MkDocs documentation site (see `docs/`). Run `mkdocs serve` to browse it locally.

### Data Flow

1. **Authentication**: Frontend → Nginx → Keycloak (OAuth2/OIDC) → Backend validates token → Redis session
2. **Model Creation**: User draws polygon + sets date range → Backend stores model draft
3. **Simulation Dispatch**: Backend → Platform Webservice queues model → Simulation engine runs → results ZIP POSTed back via callback
4. **Result Processing**: Asynq worker unpacks ZIP → publishes GeoServer layer → stores result in PostgreSQL
5. **Risk Metrics**: Backend samples GeoServer raster distribution (up to 2 000 pixels) → computes weighted score + trend vs. prior run
6. **Visualisation**: Frontend renders choropleth map (MapLibre), metric cards, and ECharts distribution chart

### Technology Stack

**Frontend**
- React 19 + TypeScript 5.8
- Vite 7 for build tooling
- TailwindCSS 4 + Radix UI components (`@spatialhub/ui`)
- TanStack Query 5 for server state
- Zustand 5 for client state
- OpenLayers 10 + MapLibre GL JS (2D mapping)
- ECharts 6 for risk distribution charts
- React Router 7 with lazy-loaded routes

**Backend**
- Go 1.24 + Gin web framework
- GORM with PostgreSQL driver
- Asynq (Redis-backed) for background jobs (`notifications` and `results` queues)
- Server-Sent Events (SSE) for real-time push
- Logrus structured logging
- Keycloak OIDC token validation + admin token provider

**Platform Core** (separate repositories pulled at build/deploy time)
- `platform-core/auth-service` — authentication microservice
- `platform-core/webservice` — simulation dispatcher and capacity manager
- `infrastructure/platform` — shared Go libraries (server, database, worker, email, security)
- `infrastructure/common` — shared domain models
- `libs/` — shared React component libraries (`@spatialhub/ui`, `auth`, `forms`, `i18n`)

**Infrastructure**
- PostgreSQL 15 + PostGIS for spatial and application data
- Keycloak 26 for OAuth2/OIDC identity management
- Redis 7 for sessions, caching, pub/sub, and task queue
- Nginx reverse proxy with SSL termination
- GeoServer for raster layer serving (WMS)
- Docker Compose orchestration

---

## Installation & Setup

### Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+
- Access to the TH-DEG GitLab (`mygit.th-deg.de`) for platform-core, libs, and infrastructure repos

### Quick Start

```bash
# 1. Clone all required repositories and copy .env files

```

`make setup` runs the full sequence: clones external repos, copies `.env.example` files, installs npm + Go dependencies, pulls Docker images, starts PostgreSQL + Redis, initialises Keycloak, starts platform services, and runs migrations + seed.

### Step-by-step

```bash
# Clone / update external repos
make setup-repos

# Copy .env files (edit them before proceeding)
make env-setup

# Install dependencies
make install

# Start infrastructure (Postgres, Redis)
make up-db

# Start Keycloak and configure realm + client secrets
make up-keycloak
make init-keycloak

# Start platform services (auth-service, webservice, geoservice)
make up

# Run DB migrations
make migrate

# Seed initial data
make seed
```

### Running the application locally

```bash
# Backend
cd wildfire-app/backend && go run cmd/main.go

# Frontend (new terminal)
cd wildfire-app/frontend && npm run dev
```

Open `http://localhost:3000`. Default credentials after seeding:

| Field    | Value               |
|----------|---------------------|
| Email    | `admin@spatialai.de`|
| Password | `12345678`          |

### Docker Compose

```bash
# Start all wildfire-app services (frontend + backend)
make up-wildfire-app

# Stop
make down-wildfire-app

# Logs
make logs-wildfire-app
```

Services exposed:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Keycloak: `http://localhost:8080`

---

## Development

### Makefile targets

| Command | Description |
|---|---|
| `make up` | Start Platform Core (Postgres, Redis, Keycloak, auth-service, webservice, geoservice) |
| `make down` | Stop Platform Core |
| `make up-wildfire-app` | Start Wildfire App (frontend + backend) |
| `make up-geoserver` | Start GeoServer stack |
| `make migrate` | Run backend DB migrations |
| `make seed` | Seed the database |
| `make install` | Install all npm + Go dependencies |

### Environment variables

Copy `wildfire-app/backend/.env.example` to `wildfire-app/backend/.env` and adjust:

| Variable | Description |
|---|---|
| `APP_URL` | Public URL of the backend |
| `DB_HOST/PORT/DATABASE` | PostgreSQL connection |
| `REDIS_HOST/PORT` | Redis connection |
| `KEYCLOAK_URL` / `KEYCLOAK_REALM` | Keycloak OIDC endpoint |
| `WEBSERVICE_SERVICE_URL` | Simulation dispatcher URL |
| `GEOSERVER_SERVICE_URL` | Internal geoservice URL |
| `CALLBACK_SECRET` | Shared secret for simulation engine callbacks |

---

## Project Structure

```
.
├── wildfire-app/
│   ├── backend/          # Go API server (Gin, GORM, Asynq)
│   │   ├── cmd/          # Entrypoints: main, migrate, seed
│   │   └── internal/     # Handlers, services, stores, middleware
│   └── frontend/         # React SPA (Vite, TypeScript)
│       └── src/
│           ├── features/ # Feature modules (map, model-dashboard, comparison, …)
│           ├── components/
│           └── configuration/
├── platform-core/        # Platform services (auth-service, webservice, geoserver)
│   ├── auth-service/     # Authentication microservice
│   ├── webservice/       # Simulation dispatcher & capacity manager
│   └── geoserver/        # GeoServer stack
├── infrastructure/       # Shared Go libraries
│   ├── common/           # Shared domain models & contracts
│   └── platform/         # Server, database, worker, email, security
├── libs/                 # Shared React component libraries
│   ├── ui/               # @spatialhub/ui components
│   ├── auth/             # Auth library
│   ├── forms/            # Forms library
│   └── i18n/             # Internationalisation
├── nginx/                # Reverse proxy config (dev + prod)
├── Makefile              # Developer workflow commands
└── Dockerfile.ci         # Multi-stage build (frontend + backend)
```
