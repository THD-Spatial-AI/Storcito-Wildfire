<#
.SYNOPSIS
    Windows PowerShell equivalent of the project Makefile.

.DESCRIPTION
    Drop-in replacement for `make <target>` on Windows.
    Usage: .\setup.ps1 [target]
    Default target: help

    FIRST-TIME ONLY — if PowerShell blocks local scripts, run once:
        Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

.EXAMPLE
    .\setup.ps1 help
    .\setup.ps1 setup
    .\setup.ps1 up
    .\setup.ps1 up-wildfire-app
    .\setup.ps1 migrate
#>

param(
    [Parameter(Position = 0)]
    [string]$Target = 'help'
)

# ---------------------------------------------------------------------------
# Compose file argument arrays (mirrors Makefile variables)
# ---------------------------------------------------------------------------
$PLATFORM_COMPOSE     = @('-f', 'platform-core/docker-compose.yml', '-f', 'platform-core/docker-compose.dev.yml')
$WILDFIRE_APP_COMPOSE = @('-f', 'wildfire-app/docker-compose.yml',  '-f', 'wildfire-app/docker-compose.dev.yml')
$GEOSERVER_COMPOSE    = @('-f', 'platform-core/geoserver/docker-compose.yml')

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
function Write-Cyan   ([string]$msg) { Write-Host $msg -ForegroundColor Cyan   }
function Write-Green  ([string]$msg) { Write-Host $msg -ForegroundColor Green  }
function Write-Yellow ([string]$msg) { Write-Host $msg -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# Ensure the working directory is always the repo root for the duration of
# the script so all relative paths (platform-core/…, wildfire-app/…) resolve.
# ---------------------------------------------------------------------------
Push-Location $PSScriptRoot

# ---------------------------------------------------------------------------
# Helper: create spatialhub-net only when it does not already exist.
# docker network create exits non-zero when the network already exists —
# that is not an error, so we swallow it explicitly.
# ---------------------------------------------------------------------------
function New-SpatialhubNet {
    $existing = docker network ls --format '{{.Name}}' 2>$null | Where-Object { $_ -eq 'spatialhub-net' }
    if (-not $existing) {
        Write-Host 'Creating Docker network spatialhub-net...'
        docker network create spatialhub-net
    }
}

# ===========================================================================
# Target functions
# ===========================================================================

function Invoke-Help {
    Write-Host ''
    Write-Host 'SpatialHub Architecture'
    Write-Host 'Usage:  .\setup.ps1 <target>'
    Write-Host ''
    Write-Host '  setup                Full setup (recommended for first time)'
    Write-Host '  up                   Start Platform Core'
    Write-Host '  down                 Stop Platform Core'
    Write-Host '  logs                 Follow Platform logs'
    Write-Host '  up-wildfire-app      Start Wildfire App'
    Write-Host '  down-wildfire-app    Stop Wildfire App'
    Write-Host '  logs-wildfire-app    Follow Wildfire App logs'
    Write-Host '  up-geoserver         Start GeoServer stack'
    Write-Host '  down-geoserver       Stop GeoServer stack'
    Write-Host '  logs-geoserver       Follow GeoServer logs'
    Write-Host '  restart-geoserver    Restart GeoServer stack'
    Write-Host '  init-keycloak        Initialize Keycloak'
    Write-Host '  migrate              Run Energy App DB migrations'
    Write-Host '  seed                 Seed the database'
    Write-Host '  install              Install dependencies (npm + go)'
    Write-Host ''
    Write-Host 'Database:'
    Write-Host '  start-postgres       Start PostgreSQL with pgRouting'
    Write-Host '  stop-postgres        Stop PostgreSQL'
    Write-Host '  remove-postgres      Remove PostgreSQL container'
    Write-Host ''
    Write-Host 'Individual Repository Pull:'
    Write-Host '  pull-platform-core   Pull platform-core repository'
    Write-Host '  pull-infrastructure  Pull infrastructure repository'
    Write-Host '  pull-libs            Pull libs repository'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-GitCredentialCache {
    Write-Cyan 'Configuring git credential manager for Windows...'
    # The Unix `cache` helper is not available on Windows.
    # Windows Credential Manager (manager-core) stores credentials
    # persistently in the system keychain — no manual timeout needed.
    git config --global credential.helper 'manager-core'
    Write-Host 'Git credentials will be stored in Windows Credential Manager.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-SetupRepos {
    Write-Cyan 'Cloning/Updating repositories...'
    Write-Host 'You will be prompted for credentials on first clone (stored in Windows Credential Manager).'
    Write-Host ''

    if (Test-Path 'platform-core') {
        Write-Host 'Pulling platform-core...'
        Push-Location 'platform-core'; git pull; Pop-Location
    } else {
        git clone 'https://mygit.th-deg.de/thd-spatial-ai/microservices/platform-core.git' 'platform-core'
    }

    if (Test-Path 'libs') {
        Write-Host 'Pulling libs...'
        Push-Location 'libs'; git pull; Pop-Location
    } else {
        git clone 'https://mygit.th-deg.de/thd-spatial-ai/microservices/react-shared-components.git' 'libs'
    }

    if (Test-Path 'infrastructure') {
        Write-Host 'Pulling infrastructure...'
        Push-Location 'infrastructure'; git pull; Pop-Location
    } else {
        git clone 'https://mygit.th-deg.de/thd-spatial-ai/microservices/backend-infrastructure.git' 'infrastructure'
    }

    Write-Green 'Repositories updated.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-EnvSetup {
    Write-Cyan 'Creating .env files from .env.example...'

    $pairs = @(
        @{ Src = 'platform-core/auth-service/.env.example'; Dst = 'platform-core/auth-service/.env' },
        @{ Src = 'platform-core/webservice/.env.example';   Dst = 'platform-core/webservice/.env'   },
        @{ Src = 'wildfire-app/backend/.env.example';        Dst = 'wildfire-app/backend/.env'        },
        @{ Src = 'wildfire-app/frontend/.env.example';       Dst = 'wildfire-app/frontend/.env'       }
    )

    foreach ($pair in $pairs) {
        if (-not (Test-Path $pair.Dst)) {
            if (Test-Path $pair.Src) {
                Copy-Item $pair.Src $pair.Dst
                Write-Host "  Created: $($pair.Dst)"
            } else {
                Write-Yellow "  WARNING: Source not found, skipping: $($pair.Src)"
            }
        } else {
            Write-Host "  Already exists (skipped): $($pair.Dst)"
        }
    }

    Write-Green '.env files ready.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-InstallNpm {
    Write-Cyan 'Installing NPM dependencies...'

    $targets = @(
        @{ Dir = 'libs/i18n';             Build = $true  },
        @{ Dir = 'libs/ui';               Build = $true  },
        @{ Dir = 'libs/forms';            Build = $true  },
        @{ Dir = 'libs/auth';             Build = $true  },
        @{ Dir = 'wildfire-app/frontend'; Build = $false }
    )

    foreach ($t in $targets) {
        if (-not (Test-Path $t.Dir)) {
            Write-Yellow "  Skipping $($t.Dir) (not found — run setup-repos first)"
            continue
        }
        Write-Host "  Installing $($t.Dir)..."
        Push-Location $t.Dir
        npm install --force
        if ($t.Build) {
            Write-Host "  Building $($t.Dir)..."
            npm run build
        }
        Pop-Location
    }

    Write-Green 'NPM dependencies installed.'
}

# ---------------------------------------------------------------------------
function Invoke-InstallGo {
    Write-Cyan 'Running go mod tidy in all Go modules...'

    $dirs = @(
        'wildfire-app/backend',
        'infrastructure/platform',
        'infrastructure/common',
        'platform-core/auth-service',
        'platform-core/webservice'
    )

    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            Write-Yellow "  Skipping $dir (not found — run setup-repos first)"
            continue
        }
        Write-Host "  $dir..."
        Push-Location $dir; go mod tidy; Pop-Location
    }

    Write-Green 'Go modules tidied.'
}

# ---------------------------------------------------------------------------
function Invoke-Install {
    Invoke-InstallNpm
    Invoke-InstallGo
    Write-Green 'All dependencies installed.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-PullImages {
    Write-Cyan 'Pulling Docker images...'
    Write-Host 'Pulling PostgreSQL...'
    docker pull postgres:15-alpine
    Write-Host 'Pulling Redis...'
    docker pull redis:7-alpine
    Write-Host 'Pulling all Platform Core images...'
    docker compose @PLATFORM_COMPOSE pull --ignore-buildable postgres redis keycloak
    Write-Green 'Docker images pulled.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-UpDb {
    Write-Cyan 'Starting database services...'
    New-SpatialhubNet
    docker compose @PLATFORM_COMPOSE up -d postgres redis
    Write-Host 'Waiting for Postgres to be ready...'
    Start-Sleep -Seconds 5
    Write-Green 'Database services started.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-DbCreate {
    Write-Cyan 'Creating database if not exists...'
    $result = docker exec postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'spatialai'" 2>$null
    if ($result -match '1') {
        Write-Host '  Database spatialai already exists.'
    } else {
        Write-Host '  Creating database spatialai...'
        docker exec postgres psql -U postgres -c 'CREATE DATABASE spatialai'
    }
    Write-Green 'Database ready.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-UpKeycloak {
    Write-Cyan 'Starting Keycloak...'
    docker compose @PLATFORM_COMPOSE up -d keycloak
    Write-Host 'Waiting for Keycloak to be healthy...'
    Start-Sleep -Seconds 15
    Write-Green 'Keycloak started.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-InitKeycloak {
    Write-Cyan 'Running Keycloak init (configuring realm and updating .env files)...'
    docker compose @PLATFORM_COMPOSE up keycloak-init
    Write-Green 'Keycloak configured and client secrets updated in .env files.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-UpServices {
    Write-Cyan 'Building and starting platform services...'
    docker compose @PLATFORM_COMPOSE up -d --build auth-service webservice geoservice
    Write-Green 'Platform services started.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-Up {
    Write-Cyan 'Starting Platform Core...'
    New-SpatialhubNet
    docker compose @PLATFORM_COMPOSE up -d postgres redis keycloak auth-service webservice geoservice
    Write-Host 'Services running:'
    Write-Host '  Keycloak:     http://localhost:8080'
    Write-Host '  Auth Service: http://localhost:8001'
    Write-Host '  Webservice:   http://localhost:8082'
    Write-Host '  GeoService:   http://localhost:8083'
    Write-Host '  Postgres:     localhost:5433'
    Write-Host '  Redis:        localhost:6379'
}

# ---------------------------------------------------------------------------
function Invoke-Down {
    Write-Host 'Stopping Platform Core...'
    docker compose @PLATFORM_COMPOSE down
}

# ---------------------------------------------------------------------------
function Invoke-Logs {
    docker compose @PLATFORM_COMPOSE logs -f
}

# ---------------------------------------------------------------------------
function Invoke-UpWildfireApp {
    Write-Cyan 'Starting Wildfire App...'
    New-SpatialhubNet
    docker compose @WILDFIRE_APP_COMPOSE up -d --build
    Write-Green 'Wildfire App services started.'
    Write-Host 'Services running:'
    Write-Host '  Backend:  http://localhost:8000'
    Write-Host '  Frontend: http://localhost:3000'
}

# ---------------------------------------------------------------------------
function Invoke-DownWildfireApp {
    Write-Host 'Stopping Wildfire App...'
    docker compose @WILDFIRE_APP_COMPOSE down
}

# ---------------------------------------------------------------------------
function Invoke-LogsWildfireApp {
    docker compose @WILDFIRE_APP_COMPOSE logs -f
}

# ---------------------------------------------------------------------------
function Invoke-UpGeoserver {
    Write-Cyan 'Starting GeoServer stack...'
    New-SpatialhubNet
    docker compose @GEOSERVER_COMPOSE up -d
    docker compose @PLATFORM_COMPOSE up -d --build geoservice
    Write-Green 'GeoServer stack started.'
    Write-Host '  GeoServer Web:  http://localhost:8180/geoserver'
    Write-Host '  GeoService API: http://localhost:8083'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-DownGeoserver {
    Write-Cyan 'Stopping GeoServer stack...'
    docker compose @PLATFORM_COMPOSE stop geoservice
    docker compose @GEOSERVER_COMPOSE down
    Write-Green 'GeoServer stack stopped.'
}

# ---------------------------------------------------------------------------
function Invoke-LogsGeoserver {
    docker compose @GEOSERVER_COMPOSE logs -f
}

# ---------------------------------------------------------------------------
function Invoke-RestartGeoserver {
    Invoke-DownGeoserver
    Invoke-UpGeoserver
    Write-Green 'GeoServer stack restarted.'
}

# ---------------------------------------------------------------------------
function Invoke-StartPostgres {
    Write-Cyan 'Starting PostgreSQL with pgRouting...'
    New-SpatialhubNet
    docker compose @PLATFORM_COMPOSE up -d postgres
    Write-Host 'Waiting for PostgreSQL to be ready...'
    Start-Sleep -Seconds 5
    Write-Green 'PostgreSQL started on port 5433'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-StopPostgres {
    Write-Cyan 'Stopping PostgreSQL...'
    docker compose @PLATFORM_COMPOSE stop postgres
    Write-Green 'PostgreSQL stopped.'
}

# ---------------------------------------------------------------------------
function Invoke-RemovePostgres {
    Write-Cyan 'Removing PostgreSQL container...'
    docker compose @PLATFORM_COMPOSE rm -f postgres
    Write-Green 'PostgreSQL container removed.'
}

# ---------------------------------------------------------------------------
function Invoke-Migrate {
    Write-Cyan 'Running Energy App Migrations...'
    Push-Location 'wildfire-app/backend'
    go run cmd/migrate/migration.go
    Pop-Location
    Write-Green 'Migrations complete.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-Seed {
    Write-Cyan 'Seeding Database...'

    $seedDir = 'wildfire-app/backend/cmd/seed'
    if (-not (Test-Path $seedDir)) {
        Write-Yellow "  Seed directory not found ($seedDir) — skipping."
        return
    }

    # PowerShell does not glob-expand arguments to external programs, so
    # enumerate the .go files explicitly and pass them as a list to go run.
    $seedFiles = Get-ChildItem -Path $seedDir -Filter '*.go' -File
    if ($seedFiles.Count -eq 0) {
        Write-Yellow '  No seed files found — skipping.'
        return
    }

    Push-Location 'wildfire-app/backend'
    $relPaths = $seedFiles | ForEach-Object { "cmd/seed/$($_.Name)" }
    go run @relPaths
    Pop-Location

    Write-Green 'Database seeded.'
    Write-Host ''
}

# ---------------------------------------------------------------------------
function Invoke-PullPlatformCore {
    Write-Cyan 'Pulling platform-core...'
    if (Test-Path 'platform-core') {
        Push-Location 'platform-core'; git pull; Pop-Location
    } else {
        git clone 'https://mygit.th-deg.de/thd-spatial-ai/microservices/platform-core.git' 'platform-core'
    }
    Write-Green 'platform-core updated.'
}

# ---------------------------------------------------------------------------
function Invoke-PullInfrastructure {
    Write-Cyan 'Pulling infrastructure...'
    if (Test-Path 'infrastructure') {
        Push-Location 'infrastructure'; git pull; Pop-Location
    } else {
        git clone 'https://mygit.th-deg.de/thd-spatial-ai/microservices/backend-infrastructure.git' 'infrastructure'
    }
    Write-Green 'infrastructure updated.'
}

# ---------------------------------------------------------------------------
function Invoke-PullLibs {
    Write-Cyan 'Pulling libs...'
    if (Test-Path 'libs') {
        Push-Location 'libs'; git pull; Pop-Location
    } else {
        git clone 'https://mygit.th-deg.de/thd-spatial-ai/microservices/react-shared-components.git' 'libs'
    }
    Write-Green 'libs updated.'
}

# ---------------------------------------------------------------------------
function Invoke-SetupComplete {
    Write-Host ''
    Write-Green '============================================'
    Write-Green '        Setup Complete!'
    Write-Green '============================================'
    Write-Host ''
    Write-Yellow 'To start the application:'
    Write-Host ''
    Write-Host '  1. Start the backend:'
    Write-Cyan  '     cd wildfire-app\backend ; go run cmd\main.go'
    Write-Host ''
    Write-Host '  2. Start the frontend (in a new terminal):'
    Write-Cyan  '     cd wildfire-app\frontend ; npm run dev'
    Write-Host ''
    Write-Host '  3. Access your application:'
    Write-Cyan  '     http://localhost:3000'
    Write-Host ''
    Write-Yellow 'Optional: Start GeoServer for map visualization:'
    Write-Cyan   '     .\setup.ps1 up-geoserver'
    Write-Host ''
    Write-Yellow 'Initial Login Credentials:'
    Write-Host   '  Email:    ' -NoNewline; Write-Cyan 'admin@spatialai.de'
    Write-Host   '  Password: ' -NoNewline; Write-Cyan '12345678'
    Write-Host ''
    Write-Green '============================================'
}

# ---------------------------------------------------------------------------
function Invoke-Setup {
    Invoke-GitCredentialCache
    Invoke-SetupRepos
    Invoke-EnvSetup
    Invoke-Install
    Invoke-PullImages
    Invoke-UpDb
    Invoke-DbCreate
    Invoke-UpKeycloak
    Invoke-InitKeycloak
    Invoke-UpServices
    Invoke-Migrate
    Invoke-Seed
    Invoke-SetupComplete
    Write-Host ''
}

# ===========================================================================
# Dispatch table
# ===========================================================================
$Dispatch = @{
    'help'                 = 'Invoke-Help'
    'setup'                = 'Invoke-Setup'
    'git-credential-cache' = 'Invoke-GitCredentialCache'
    'setup-repos'          = 'Invoke-SetupRepos'
    'env-setup'            = 'Invoke-EnvSetup'
    'install'              = 'Invoke-Install'
    'install-npm'          = 'Invoke-InstallNpm'
    'install-go'           = 'Invoke-InstallGo'
    'pull-images'          = 'Invoke-PullImages'
    'up-db'                = 'Invoke-UpDb'
    'db-create'            = 'Invoke-DbCreate'
    'up-keycloak'          = 'Invoke-UpKeycloak'
    'init-keycloak'        = 'Invoke-InitKeycloak'
    'up-services'          = 'Invoke-UpServices'
    'up'                   = 'Invoke-Up'
    'down'                 = 'Invoke-Down'
    'logs'                 = 'Invoke-Logs'
    'up-wildfire-app'      = 'Invoke-UpWildfireApp'
    'down-wildfire-app'    = 'Invoke-DownWildfireApp'
    'logs-wildfire-app'    = 'Invoke-LogsWildfireApp'
    'up-geoserver'         = 'Invoke-UpGeoserver'
    'down-geoserver'       = 'Invoke-DownGeoserver'
    'logs-geoserver'       = 'Invoke-LogsGeoserver'
    'restart-geoserver'    = 'Invoke-RestartGeoserver'
    'start-postgres'       = 'Invoke-StartPostgres'
    'stop-postgres'        = 'Invoke-StopPostgres'
    'remove-postgres'      = 'Invoke-RemovePostgres'
    'migrate'              = 'Invoke-Migrate'
    'seed'                 = 'Invoke-Seed'
    'pull-platform-core'   = 'Invoke-PullPlatformCore'
    'pull-infrastructure'  = 'Invoke-PullInfrastructure'
    'pull-libs'            = 'Invoke-PullLibs'
    'setup-complete'       = 'Invoke-SetupComplete'
}

# ===========================================================================
# Entry point
# ===========================================================================
try {
    if ($Dispatch.ContainsKey($Target)) {
        & $Dispatch[$Target]
    } else {
        Write-Host "Unknown target: '$Target'" -ForegroundColor Red
        Write-Host "Run '.\setup.ps1 help' to see available targets."
        exit 1
    }
} finally {
    Pop-Location
}
