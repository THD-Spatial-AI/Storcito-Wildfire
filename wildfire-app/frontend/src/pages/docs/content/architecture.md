# Architecture

STORCITO Wildfire is a React single-page app backed by a set of Go services. The numerical wildfire engine is a separate project, the [STORCITO wildfire risk engine](https://github.com/THD-Spatial-AI/storcito-wildfire-risk-engine). This repository dispatches work to it and processes its results.

## Components

| Component | Role |
|---|---|
| **Frontend** (`wildfire-app/frontend`) | React 19 + TypeScript SPA built with Vite |
| **Backend** (`wildfire-app/backend`) | Go + Gin API: models, workspaces, results, notifications, users |
| **Auth service** (`platform-core/auth-service`) | Login, sessions and Keycloak integration |
| **Webservice** (`platform-core/webservice`) | Dispatches calculations to engine instances and manages their capacity |
| **Geoservice** | Publishes result rasters to GeoServer |
| **PostgreSQL** | Application data |
| **Redis** | Sessions, caches, the Asynq task queue and notification Pub/Sub |
| **Keycloak** | Identity provider (OAuth2 / OIDC) |
| **GeoServer** | Serves result rasters through WMS |
| **Nginx** | Reverse proxy with TLS termination |

The Go code is one Go workspace (`go.work`) with shared modules in `infrastructure/` (`common` for domain models, `platform` for server, database, worker, email and security). Shared React libraries live in `libs/` (`@spatialhub/ui`, auth, forms).

## Request flow

1. **Authentication.** The login form sends credentials to the auth service, which authenticates against Keycloak, creates a Redis session and sets an HttpOnly session cookie. The backend validates each request against the auth service. Access level comes from the Keycloak user attribute `access_level`.
2. **Model creation.** The user's polygon, dates and options are saved as a model. Coordinates are stored as GeoJSON.
3. **Dispatch.** Starting a calculation marks the model `queue` and enqueues an Asynq task. The webservice reserves a capacity slot, marks the model `running` and submits it to an engine instance over HTTP.
4. **Results.** The engine posts a ZIP back to a secret-protected callback. A worker extracts the rasters, stores result metadata, builds overviews, asks GeoServer to publish the layer and notifies the user.
5. **Metrics.** The backend samples the published raster through WMS and computes the risk distribution, mean score and trend.
6. **Display.** The frontend renders the WMS layer with OpenLayers / MapLibre (2D) or Cesium (3D) and charts with ECharts.

Model completion and GeoServer publication have separate status fields, so a model can be complete while its layer is still being published.

## Frontend

- **Routing:** React Router with lazy-loaded pages (`src/App.tsx`).
- **Server state:** TanStack Query. **Client state:** Zustand.
- **HTTP:** an Axios client with credentials (`src/lib/axios.ts`).
- **Features:** each area lives in `src/features/<name>` (interactive-map, configurator, model-dashboard, model-results, comparison, settings, notifications, admin-dashboard…).
- **Translations:** `src/i18n/locales/<lang>.json`.
- **This documentation:** Markdown files in `src/pages/docs/content`, listed in `src/pages/docs/sections.ts`.

## Access control

Access to a model is decided by ownership, workspace membership, Keycloak groups, direct shares and access level. Personal API tokens are a separate mechanism: hashed tokens with a `read` or `full` scope that always act as their user.

## Real-time updates

The backend pushes notifications over Server-Sent Events (`/api/notifications/stream`). Background jobs run on Asynq queues (`notifications` and `results`).
