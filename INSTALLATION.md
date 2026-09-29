# Installation & Development

Setup guide for the STORCITO Wildfire platform. For an overview of the project, see the [README](README.md).

## Installation & Setup

### Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+

### Quick Start

```bash
make setup
```

`make setup` runs the full sequence: copies `.env.example` files, installs npm + Go dependencies, pulls Docker images, starts PostgreSQL + Redis, initialises Keycloak, starts platform services, and runs migrations + seed. All components (platform-core, infrastructure, libs) live inside this repository — nothing is cloned from external repos.

### Step-by-step

```bash
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
| Email    | `admin@storcito.de` |
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
