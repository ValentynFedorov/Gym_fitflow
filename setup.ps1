<#
.SYNOPSIS
    FitFlow OS — zero-to-running bootstrap & launcher for Windows.

.DESCRIPTION
    Designed to take a fresh Windows machine from "git clone" to a live app
    with a single command, recovering from the common problems automatically:

      * Docker Desktop installed but not running → starts it and waits.
      * Host ports 5432 / 6379 already taken by other projects → picks free
        high ports (55432+ / 56379+), writes a local docker-compose.override.yml
        with the `ports: !override` directive, and rewrites .env to match.
      * Stale fitflow-postgres / fitflow-redis containers from a failed previous
        run → removed before starting.
      * .gitignore extended so the auto-generated override and run logs don't
        get committed.

    After bootstrap the script seeds demo data and launches API (NestJS,
    http://localhost:3001) and Web (Next.js, http://localhost:3000) together
    via concurrently — Ctrl+C in the same window stops both.

.PARAMETER SkipInstall
    Skip "npm install" (useful for repeat runs).

.PARAMETER SkipSeed
    Skip database seed.

.PARAMETER SkipDocker
    Don't manage docker (use if you already have local Postgres + Redis running
    at the URLs in .env).

.PARAMETER Stop
    Stop docker containers and exit.

.PARAMETER Reset
    Tear down stack and remove the Postgres volume (wipes the database).
    Implies a fresh seed.

.PARAMETER NoLaunch
    Run the full bootstrap but do not start the dev servers. Handy for
    diagnostics or for kicking off the launch from another terminal.

.EXAMPLE
    .\setup.ps1
    # First run on a clean machine: full bootstrap and launch.

.EXAMPLE
    .\setup.ps1 -SkipInstall -SkipSeed
    # Day-to-day: bring services up and launch.

.EXAMPLE
    .\setup.ps1 -Reset
    # Wipe DB volume and start fresh (re-seeds demo data).

.EXAMPLE
    .\setup.ps1 -Stop
    # Tear down Postgres + Redis containers.

.EXAMPLE
    .\setup.ps1 -NoLaunch
    # Bootstrap only — start "npm run dev" yourself afterwards.
#>

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$SkipSeed,
    [switch]$SkipDocker,
    [switch]$Stop,
    [switch]$Reset,
    [switch]$NoLaunch
)

# PS 5.1 gotcha: with $ErrorActionPreference='Stop', any native command that
# writes to stderr (even a harmless warning like "version is obsolete") throws
# a terminating NativeCommandError. We stay on the default 'Continue' and rely
# on explicit $LASTEXITCODE checks inside Invoke-Native for native commands,
# plus -ErrorAction Stop on individual cmdlets where strict-failure matters.
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

# ============================================================================
# Helpers
# ============================================================================
function Write-Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    [OK]   $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Write-Err2($msg)  { Write-Host "    [ERR]  $msg" -ForegroundColor Red }

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Write-Utf8NoBom {
    param([string]$Path, [string[]]$Lines)
    $enc = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($Path, $Lines, $enc)
}

function Invoke-Native {
    param(
        [Parameter(Mandatory)] [string]   $Exe,
        [string[]] $ArgList = @(),
        [string]   $Label   = $null,
        [switch]   $AllowFailure
    )
    if (-not $Label) { $Label = $Exe }
    Write-Host "    > $Exe $($ArgList -join ' ')" -ForegroundColor DarkGray
    & $Exe @ArgList
    $code = $LASTEXITCODE
    if ($code -ne 0 -and -not $AllowFailure) {
        Write-Err2 "$Label failed (exit $code)."
        throw "$Label failed (exit $code)."
    }
    return $code
}

function Test-PortFree {
    param([int]$Port)
    return -not (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Find-FreePort {
    param([int]$Start, [int]$End = 65000)
    for ($p = $Start; $p -le $End; $p++) {
        if (Test-PortFree -Port $p) { return $p }
    }
    throw "No free TCP port found in range $Start..$End."
}

function Get-PortHolder {
    param([int]$Port)
    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) { return "PID $($conn.OwningProcess) ($($proc.ProcessName))" }
    return "PID $($conn.OwningProcess)"
}

# ============================================================================
# Docker helpers
# ============================================================================
function Test-DockerDaemon {
    & docker info *> $null
    return ($LASTEXITCODE -eq 0)
}

function Start-DockerDesktopIfNeeded {
    if (Test-DockerDaemon) { Write-Ok "Docker daemon reachable."; return }

    Write-Warn2 "Docker daemon not reachable — trying to start Docker Desktop."
    $pf   = [System.Environment]::GetEnvironmentVariable('ProgramFiles')
    $pfx  = [System.Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    $lapp = [System.Environment]::GetEnvironmentVariable('LOCALAPPDATA')
    $candidates = @(
        (Join-Path $pf   'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $lapp 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $pfx  'Docker\Docker\Docker Desktop.exe')
    )
    $exe = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if (-not $exe) {
        Write-Err2 "Docker Desktop executable not found. Install from https://www.docker.com/products/docker-desktop/ and re-run."
        throw "Docker Desktop not installed."
    }
    Start-Process $exe | Out-Null
    Write-Host "    Waiting up to 180s for Docker daemon..." -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        if (Test-DockerDaemon) { Write-Ok "Docker daemon is now reachable."; return }
        Start-Sleep -Seconds 3
    }
    throw "Docker Desktop did not become ready within 180s."
}

function Remove-StaleFitflowContainers {
    foreach ($n in @('fitflow-postgres','fitflow-redis')) {
        $matches = & docker ps -a --filter "name=$n" --format '{{.Names}}' 2>$null
        if ($matches -contains $n) {
            Write-Host "    Removing stale container '$n'..." -ForegroundColor DarkGray
            & docker rm -f $n *> $null
        }
    }
}

# ============================================================================
# Port-conflict resolution
# ============================================================================
function Resolve-PortMappings {
    $result = @{ Postgres = 5432; Redis = 6379 }

    if (Test-PortFree -Port 5432) {
        Write-Ok "Postgres host port 5432 is free."
    } else {
        $holder = Get-PortHolder -Port 5432
        Write-Warn2 "Port 5432 already in use ($holder). Picking a free port for Postgres..."
        $result.Postgres = Find-FreePort -Start 55432
        Write-Ok "Postgres will be published on host port $($result.Postgres)."
    }

    if (Test-PortFree -Port 6379) {
        Write-Ok "Redis host port 6379 is free."
    } else {
        $holder = Get-PortHolder -Port 6379
        Write-Warn2 "Port 6379 already in use ($holder). Picking a free port for Redis..."
        $result.Redis = Find-FreePort -Start 56379
        Write-Ok "Redis will be published on host port $($result.Redis)."
    }

    return $result
}

function Write-ComposeOverride {
    param([int]$PgPort, [int]$RedisPort)
    $overridePath = Join-Path $ProjectRoot 'docker-compose.override.yml'
    $needsOverride = ($PgPort -ne 5432) -or ($RedisPort -ne 6379)

    if (-not $needsOverride) {
        if (Test-Path $overridePath) {
            Write-Warn2 "Default ports are free but a stale docker-compose.override.yml exists. Leaving it untouched."
        }
        return
    }

    $lines = @(
        '# Auto-generated by setup.ps1 — do NOT commit (already in .gitignore).',
        '# Default ports 5432/6379 were taken on this machine, so FitFlow services',
        '# are remapped to free host ports. Container-internal ports stay 5432/6379.',
        'services:',
        '  db:',
        '    ports: !override',
        "      - `"$($PgPort):5432`"",
        '  redis:',
        '    ports: !override',
        "      - `"$($RedisPort):6379`""
    )
    Write-Utf8NoBom -Path $overridePath -Lines $lines
    Write-Ok "Wrote docker-compose.override.yml (Postgres=$PgPort, Redis=$RedisPort)."
}

function Sync-EnvFile {
    param([int]$PgPort, [int]$RedisPort)
    $envPath    = Join-Path $ProjectRoot '.env'
    $envExample = Join-Path $ProjectRoot '.env.example'

    if (-not (Test-Path $envPath)) {
        if (-not (Test-Path $envExample)) {
            throw ".env.example is missing — cannot bootstrap .env."
        }
        Copy-Item $envExample $envPath
        Write-Ok ".env created from .env.example."
    }

    $dbLine    = "DATABASE_URL=`"postgresql://fitflow:fitflow@localhost:$PgPort/fitflow?schema=public`""
    $redisLine = "REDIS_URL=`"redis://localhost:$RedisPort`""
    $existing  = Get-Content $envPath
    $hasDb = $false; $hasRedis = $false
    $patched = foreach ($l in $existing) {
        if     ($l -match '^\s*DATABASE_URL\s*=') { $hasDb    = $true; $dbLine }
        elseif ($l -match '^\s*REDIS_URL\s*=')    { $hasRedis = $true; $redisLine }
        else                                       { $l }
    }
    if (-not $hasDb)    { $patched = @($patched) + $dbLine }
    if (-not $hasRedis) { $patched = @($patched) + $redisLine }
    Write-Utf8NoBom -Path $envPath -Lines $patched
    Write-Ok ".env synced (DATABASE_URL -> :$PgPort, REDIS_URL -> :$RedisPort)."
}

function Add-GitignoreEntries {
    $gi = Join-Path $ProjectRoot '.gitignore'
    if (-not (Test-Path $gi)) { return }
    $content = Get-Content $gi -Raw
    $needed  = @('docker-compose.override.yml', 'setup-run*.log', 'setup-run*.err.log')
    $missing = @()
    foreach ($entry in $needed) {
        if ($content -notmatch [regex]::Escape($entry)) { $missing += $entry }
    }
    if ($missing.Count -gt 0) {
        Add-Content -Path $gi -Value ("`n# Added by setup.ps1`n" + ($missing -join "`n"))
        Write-Ok ".gitignore extended with: $($missing -join ', ')."
    }
}

# ============================================================================
# STOP mode
# ============================================================================
if ($Stop) {
    Write-Step "Stopping FitFlow docker services"
    & docker compose down
    Write-Ok "Services stopped."
    exit 0
}

# ============================================================================
# Prerequisites
# ============================================================================
Write-Step "Checking prerequisites"

if (-not (Test-Command node)) {
    Write-Err2 "Node.js is not installed. Get Node 18+ from https://nodejs.org/"
    exit 1
}
$nodeVer = (& node --version).TrimStart('v')
if ([int]($nodeVer.Split('.')[0]) -lt 18) {
    Write-Err2 "Node.js $nodeVer found — version 18+ required."
    exit 1
}
Write-Ok "Node.js $nodeVer"

if (-not (Test-Command npm)) { Write-Err2 "npm missing."; exit 1 }
Write-Ok "npm $(& npm --version)"

if (Test-Command git) {
    Write-Ok "git $((& git --version) -replace 'git version ','')"
} else {
    Write-Warn2 "git not found — only required if you'll push changes."
}

if (-not $SkipDocker) {
    if (-not (Test-Command docker)) {
        Write-Err2 "Docker is not installed. Get Docker Desktop: https://www.docker.com/products/docker-desktop/"
        exit 1
    }
    Write-Ok "docker CLI present"
    Start-DockerDesktopIfNeeded
}

# ============================================================================
# Reset (after docker is up)
# ============================================================================
if ($Reset -and -not $SkipDocker) {
    Write-Step "Reset requested — tearing down stack and removing volume"
    Invoke-Native -Exe 'docker' -ArgList @('compose','down','-v') -Label 'docker compose down -v' -AllowFailure | Out-Null
    Write-Ok "Stack & volume removed."
}

# ============================================================================
# Port resolution → override → .env sync
# ============================================================================
$ports = @{ Postgres = 5432; Redis = 6379 }

if (-not $SkipDocker) {
    Write-Step "Resolving host port conflicts"
    # Stop any existing FitFlow stack first so we don't mistake our own
    # published ports for someone else's. Volumes are preserved.
    & docker compose down *> $null
    Remove-StaleFitflowContainers
    $ports = Resolve-PortMappings
    Write-ComposeOverride -PgPort $ports.Postgres -RedisPort $ports.Redis
    Add-GitignoreEntries
}

Write-Step "Syncing .env"
Sync-EnvFile -PgPort $ports.Postgres -RedisPort $ports.Redis

# ============================================================================
# Docker up + readiness wait
# ============================================================================
if (-not $SkipDocker) {
    Write-Step "Starting Postgres + Redis (docker compose up -d)"
    Invoke-Native -Exe 'docker' -ArgList @('compose','up','-d') -Label 'docker compose up' | Out-Null

    Write-Step "Waiting for Postgres to accept connections"
    $deadline = (Get-Date).AddSeconds(90)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        & docker exec fitflow-postgres pg_isready -U fitflow -d fitflow *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Err2 "Postgres did not become ready within 90s. Inspect: docker logs fitflow-postgres"
        exit 1
    }
    Write-Ok "Postgres is ready."
}

# ============================================================================
# npm install
# ============================================================================
if (-not $SkipInstall) {
    Write-Step "Installing npm workspaces (root + apps/api + apps/web)"
    Invoke-Native -Exe 'npm' -ArgList @('install') -Label 'npm install' | Out-Null
    Write-Ok "Dependencies installed."
} else {
    Write-Warn2 "Skipping npm install (-SkipInstall)."
}

# ============================================================================
# Prisma
# ============================================================================
Write-Step "Generating Prisma client"
Invoke-Native -Exe 'npx' -ArgList @('prisma','generate') -Label 'prisma generate' | Out-Null
Write-Ok "Prisma client generated."

Write-Step "Pushing schema to database (prisma db push)"
# db push instead of migrate deploy because migration.sql files are .gitignored.
Invoke-Native -Exe 'npx' -ArgList @('prisma','db','push','--skip-generate','--accept-data-loss') -Label 'prisma db push' | Out-Null
Write-Ok "Schema in sync with prisma/schema.prisma."

# ============================================================================
# Seed
# ============================================================================
if (-not $SkipSeed -or $Reset) {
    Write-Step "Seeding demo data"
    Invoke-Native -Exe 'npm' -ArgList @('run','seed') -Label 'npm run seed' | Out-Null
    Write-Ok "Demo data ready. Logins:"
    Write-Host "      admin@fitflow.local / admin123"     -ForegroundColor Gray
    Write-Host "      trainer@fitflow.local / trainer123" -ForegroundColor Gray
    Write-Host "      client@fitflow.local / client123"   -ForegroundColor Gray
} else {
    Write-Warn2 "Skipping seed (-SkipSeed)."
}

# ============================================================================
# Launch
# ============================================================================
if ($NoLaunch) {
    Write-Step "Bootstrap finished — skipping launch (-NoLaunch)."
    Write-Host "    Start the dev servers later with:  npm run dev" -ForegroundColor DarkGray
    Write-Host "    Stop docker services with:         .\setup.ps1 -Stop" -ForegroundColor DarkGray
    exit 0
}

# Pre-flight: warn if app ports already in use (e.g. a previous npm run dev).
foreach ($appPort in @(3000, 3001)) {
    if (-not (Test-PortFree -Port $appPort)) {
        $holder = Get-PortHolder -Port $appPort
        Write-Warn2 "Port $appPort already in use ($holder). 'npm run dev' will fail with EADDRINUSE — stop the previous process first."
    }
}

Write-Step "Launching API (http://localhost:3001) and Web (http://localhost:3000)"
Write-Host "    Press Ctrl+C in this window to stop both processes." -ForegroundColor DarkGray
Write-Host "    Postgres + Redis keep running; use '.\setup.ps1 -Stop' to tear them down.`n" -ForegroundColor DarkGray
& npm run dev
