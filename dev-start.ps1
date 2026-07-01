# dev-start.ps1 — Launch Wildfire App (backend + frontend) cleanly
# Run from the project root: .\dev-start.ps1

$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root "wildfire-app\backend"
$FrontendDir = Join-Path $Root "wildfire-app\frontend"

$BACKEND_PORT  = 8000
$FRONTEND_PORT = 3000

# ─── Helpers ──────────────────────────────────────────────────────────────────

function Write-Step  { param($m) Write-Host "`n>> $m" -ForegroundColor Cyan }
function Write-OK    { param($m) Write-Host "   [OK] $m" -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host "   [WARN] $m" -ForegroundColor Yellow }
function Write-Fail  { param($m) Write-Host "   [FAIL] $m" -ForegroundColor Red }

# Kill a process and every descendant (breadth-first)
function Remove-ProcessTree {
    param([int]$RootPid)
    $visited = [System.Collections.Generic.HashSet[int]]::new()
    $queue   = [System.Collections.Generic.Queue[int]]::new()
    $queue.Enqueue($RootPid)
    while ($queue.Count -gt 0) {
        $cur = $queue.Dequeue()
        if (-not $visited.Add($cur)) { continue }
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$cur" |
            ForEach-Object { $queue.Enqueue([int]$_.ProcessId) }
    }
    foreach ($pid in $visited) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Free a TCP port: kill every process (+ descendants) listening on it
function Clear-Port {
    param([int]$Port)
    $pids = netstat -ano |
        Where-Object { $_ -match "TCP\s+\S+:$Port\s+\S+\s+LISTENING" } |
        ForEach-Object { ($_ -split '\s+')[-1] } |
        Where-Object   { $_ -match '^\d+$' } |
        ForEach-Object { [int]$_ } |
        Sort-Object -Unique

    if ($pids.Count -eq 0) { return }

    foreach ($p in $pids) { Remove-ProcessTree $p }

    # Wait up to 3 s for the port to release
    for ($i = 0; $i -lt 6; $i++) {
        Start-Sleep -Milliseconds 500
        $still = netstat -ano |
            Where-Object { $_ -match "TCP\s+\S+:$Port\s+\S+\s+LISTENING" }
        if (-not $still) { return }
    }
    Write-Warn "Port $Port may still be in use after cleanup"
}

# Poll an HTTP endpoint until 200 or timeout
function Wait-ForHTTP {
    param([string]$Url, [int]$TimeoutSec = 60)
    $deadline = [datetime]::UtcNow.AddSeconds($TimeoutSec)
    while ([datetime]::UtcNow -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { return $true }
        } catch {}
        Start-Sleep -Milliseconds 600
    }
    return $false
}

# Ensure a Docker container is running; try `docker start` if it isn't
function Assert-Container {
    param([string]$Name)
    $state = docker inspect --format "{{.State.Status}}" $Name 2>$null
    if ($state -eq "running") {
        Write-OK "$Name"
        return $true
    }
    Write-Warn "$Name is '$state' — attempting start"
    docker start $Name 2>$null | Out-Null
    Start-Sleep -Seconds 2
    $state = docker inspect --format "{{.State.Status}}" $Name 2>$null
    if ($state -eq "running") { Write-OK "$Name started"; return $true }
    Write-Fail "$Name could not be started"
    return $false
}

# ─── 1. Check Docker is reachable ─────────────────────────────────────────────

Write-Step "Checking Docker"
$dockerOk = $false
try {
    docker info 2>$null | Out-Null
    $dockerOk = ($LASTEXITCODE -eq 0)
} catch {}

if (-not $dockerOk) {
    Write-Fail "Docker is not running. Start Docker Desktop first."
    exit 1
}
Write-OK "Docker running"

# ─── 2. Ensure required containers are up ─────────────────────────────────────

Write-Step "Checking required containers"
$containers = @("postgres", "redis", "auth-service", "keycloak")
$allOk = $true
foreach ($c in $containers) {
    if (-not (Assert-Container $c)) { $allOk = $false }
}
if (-not $allOk) {
    Write-Warn "Some containers failed — the app may not work correctly."
    Write-Warn "Run 'make up' from the project root to start all platform services."
}

# ─── 3. Free required ports ───────────────────────────────────────────────────

Write-Step "Freeing port $BACKEND_PORT (backend)"
Clear-Port $BACKEND_PORT
Write-OK "Port $BACKEND_PORT clear"

Write-Step "Freeing port $FRONTEND_PORT (frontend)"
Clear-Port $FRONTEND_PORT
Write-OK "Port $FRONTEND_PORT clear"

# ─── 4. Start Go backend ──────────────────────────────────────────────────────

Write-Step "Starting Go backend"
$backendProc = Start-Process powershell `
    -ArgumentList "-NoExit", "-Command",
        "try { Set-Location '$BackendDir'; Write-Host '[backend] Starting...' -ForegroundColor Cyan; go run cmd/main.go } catch { Write-Host `"[backend] ERROR: `$_`" -ForegroundColor Red; Read-Host 'Press Enter to close' }" `
    -PassThru

Write-Host "   Waiting for backend health (up to 60 s)" -NoNewline -ForegroundColor Gray
if (Wait-ForHTTP "http://localhost:$BACKEND_PORT/api/health" 60) {
    Write-Host ""
    Write-OK "Backend healthy at http://localhost:$BACKEND_PORT"
} else {
    Write-Host ""
    Write-Fail "Backend did not become healthy in time. Check the backend window."
    exit 1
}

# ─── 5. Start Vite frontend ───────────────────────────────────────────────────

Write-Step "Starting Vite frontend"
$frontendProc = Start-Process powershell `
    -ArgumentList "-NoExit", "-Command",
        "try { Set-Location '$FrontendDir'; Write-Host '[frontend] Starting...' -ForegroundColor Cyan; npm run dev } catch { Write-Host `"[frontend] ERROR: `$_`" -ForegroundColor Red; Read-Host 'Press Enter to close' }" `
    -PassThru

Write-Host "   Waiting for frontend (up to 30 s)" -NoNewline -ForegroundColor Gray
if (Wait-ForHTTP "http://localhost:$FRONTEND_PORT" 30) {
    Write-Host ""
    Write-OK "Frontend ready at http://localhost:$FRONTEND_PORT"
} else {
    Write-Host ""
    Write-Warn "Frontend not detected on port $FRONTEND_PORT yet — it may still be starting."
}

# ─── 6. Summary ───────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Wildfire App running" -ForegroundColor Green
Write-Host "    Frontend  → http://localhost:$FRONTEND_PORT" -ForegroundColor Green
Write-Host "    Backend   → http://localhost:$BACKEND_PORT" -ForegroundColor Green
Write-Host ""
Write-Host "  Close the backend / frontend windows to stop." -ForegroundColor DarkGray
Write-Host "  Close THIS window to kill both automatically." -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# ─── 7. Keep alive — kill children on Ctrl+C / window close ──────────────────

try {
    while ($true) {
        Start-Sleep -Seconds 3

        # Restart backend if it died unexpectedly
        if ($backendProc.HasExited) {
            Write-Warn "Backend window closed. Re-run the script to restart."
            break
        }
    }
} finally {
    Write-Host "`n>> Shutting down..." -ForegroundColor Cyan
    if ($backendProc  -and -not $backendProc.HasExited)  { Remove-ProcessTree $backendProc.Id }
    if ($frontendProc -and -not $frontendProc.HasExited) { Remove-ProcessTree $frontendProc.Id }
    Write-OK "Done."
}
