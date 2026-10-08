# Installation & development

Everything needed to run the platform lives in this repository: the wildfire app, the platform services (`platform-core`), the shared Go libraries (`infrastructure`) and the shared React libraries (`libs`). Nothing is cloned from other repositories.

## Prerequisites

| Tool | Version | Used for |
|---|---|---|
| Docker + Docker Compose | recent | PostgreSQL, Redis, Keycloak, platform services, GeoServer |
| Go | 1.24+ | Backend, migrations and seed data |
| Node.js + npm | 20+ | Frontend and shared React libraries |
| `make` | any | Running the setup targets (Linux / macOS) |

On **Windows**, use `setup.ps1` instead of `make`. It has the same targets:

```powershell
.\setup.ps1 setup
```

If PowerShell blocks the script, run this once first: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Quick start

```bash
git clone https://github.com/THD-Spatial-AI/Storcito-Wildfire.git
cd Storcito-Wildfire
make setup
```

`make setup` runs these steps in order:

| Step | Target | What it does |
|---|---|---|
| 1 | `env-setup` | Copies every `.env.example` to `.env` (existing files are kept) |
| 2 | `install` | Installs and builds `libs/ui`, `libs/forms` and `libs/auth`, installs the frontend, and runs `go mod tidy` in all Go modules |
| 3 | `pull-images` | Pulls the PostgreSQL, Redis and Keycloak images |
| 4 | `up-db` | Creates the `spatialhub-net` Docker network and starts PostgreSQL and Redis |
| 5 | `db-create` | Creates the `spatialai` database if it doesn't exist |
| 6 | `up-keycloak` | Starts Keycloak |
| 7 | `init-keycloak` | Configures the realm and writes the client secrets into the `.env` files |
| 8 | `up-services` | Builds and starts auth-service, webservice and geoservice |
| 9 | `migrate` | Runs the backend database migrations |
| 10 | `seed` | Seeds the database and creates the admin user in Keycloak |

If a step fails, fix the cause and run that target, then continue with the next ones. For example `make init-keycloak`, then `make up-services migrate seed`.

## Start the app

After setup, run the backend and frontend in two terminals:

```bash
# Terminal 1: backend
cd wildfire-app/backend && go run cmd/main.go

# Terminal 2: frontend
cd wildfire-app/frontend && npm run dev
```

Open `http://localhost:3000` and sign in with the seeded account:

| Field | Value |
|---|---|
| Email | `admin@storcito.de` |
| Password | `12345678` |

Change this password before anyone else can reach the app.

**Result maps need GeoServer.** Models can be calculated without it, but their maps are only published and shown when GeoServer is running:

```bash
make up-geoserver
```

## Running the app in Docker

Instead of `go run` and `npm run dev`, you can run the frontend and backend as containers:

```bash
make up-wildfire-app     # build and start
make logs-wildfire-app   # follow logs
make down-wildfire-app   # stop
```

## Services and ports

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000` |
| Keycloak | `http://localhost:8080` |
| Auth service | `http://localhost:8001` |
| Webservice (dispatcher) | `http://localhost:8082` |
| Geoservice API | `http://localhost:8083` |
| GeoServer web UI | `http://localhost:8180/geoserver` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |

## Makefile targets

**Setup**

| Command | Description |
|---|---|
| `make setup` | Full first-time setup (all steps above) |
| `make env-setup` | Create missing `.env` files from the examples |
| `make install` | Install all npm and Go dependencies (`install-npm` + `install-go`) |
| `make pull-images` | Pull the Docker images |
| `make migrate` | Run database migrations |
| `make seed` | Seed the database |

**Platform core** (PostgreSQL, Redis, Keycloak, auth-service, webservice, geoservice)

| Command | Description |
|---|---|
| `make up` | Start all platform services |
| `make down` | Stop them |
| `make logs` | Follow their logs |
| `make up-services` | Rebuild and start auth-service, webservice and geoservice |
| `make up-keycloak` / `make init-keycloak` | Start / configure Keycloak |

**Wildfire app**

| Command | Description |
|---|---|
| `make up-wildfire-app` | Build and start frontend + backend containers |
| `make down-wildfire-app` | Stop them |
| `make logs-wildfire-app` | Follow their logs |

**GeoServer**

| Command | Description |
|---|---|
| `make up-geoserver` | Start GeoServer and the geoservice API |
| `make down-geoserver` | Stop them |
| `make restart-geoserver` | Restart both |
| `make logs-geoserver` | Follow GeoServer logs |

**Database**

| Command | Description |
|---|---|
| `make up-db` | Start PostgreSQL and Redis |
| `make db-create` | Create the `spatialai` database |
| `make start-postgres` / `make stop-postgres` | Start / stop PostgreSQL only |
| `make remove-postgres` | Remove the PostgreSQL container |

Run `make` or `make help` to list the main targets.

## Environment files

`make env-setup` creates these from their `.env.example`:

| File | For |
|---|---|
| `.env` | Docker Compose variables (for example the Redis password) |
| `platform-core/auth-service/.env` | Auth service |
| `platform-core/webservice/.env` | Simulation dispatcher |
| `platform-core/geoserver/.env` | GeoServer and geoservice |
| `wildfire-app/backend/.env` | Backend |
| `wildfire-app/frontend/.env` | Frontend |

**Backend** (`wildfire-app/backend/.env`)

| Variable | Description |
|---|---|
| `APP_URL` | Public URL of the backend |
| `AUTH_SERVICE_URL` | Auth service URL |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL connection (port `5433` locally) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection |
| `KEYCLOAK_URL` / `KEYCLOAK_REALM` / `KEYCLOAK_CLIENT_ID` | Keycloak OIDC settings |
| `SMTP_*` | Outgoing email (verification, notifications) |
| `WEBSERVICE_SERVICE_URL` | Simulation dispatcher URL |
| `GEOSERVER_SERVICE_URL` / `GEOSERVER_PUBLIC_URL` | Internal and public geoservice URLs |
| `CALLBACK_SECRET` | Shared secret for engine callbacks |

**Frontend** (`wildfire-app/frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL, e.g. `http://localhost:8000/api` |
| `VITE_CARTO_BASEMAP_API_KEY` | CARTO base map key |
| `VITE_CESIUM_TERRAIN_URL` / `VITE_CESIUM_SATELLITE_URL` | Terrain and satellite tiles for the 3D view |
| `VITE_FEEDBACK_API_URL` | Feedback service URL |
| `VITE_DOCUMENTATION_URL` | Optional external docs URL. Leave empty to use this built-in documentation |

Never commit `.env` files. They contain passwords and secrets.

## Project structure

```
wildfire-app/
  backend/        Go API (Gin, GORM, Asynq); cmd/ has main, migrate and seed
  frontend/       React app (Vite, TypeScript)
platform-core/
  auth-service/   Authentication
  webservice/     Simulation dispatcher and capacity manager
  geoserver/      GeoServer stack
infrastructure/
  common/         Shared domain models
  platform/       Server, database, worker, email, security
libs/             Shared React libraries (ui, auth, forms)
nginx/            Reverse proxy config
Makefile          Developer commands
Dockerfile.ci     Production image (frontend + backend)
```

## Troubleshooting setup

- **Port already in use:** another service is using one of the ports above. Stop it, or change the port in the matching `.env` file.
- **Login fails right after setup:** Keycloak may not have finished starting. Wait a moment, then run `make init-keycloak` and `make seed` again.
- **Results never show a map:** start GeoServer with `make up-geoserver`.
- **`docker compose` complains about a missing `.env` file:** run `make env-setup`.
