<#
.SYNOPSIS
    FitFlow OS — one-click setup & launcher for Windows.

.DESCRIPTION
    Bootstraps everything required to run FitFlow OS on a fresh Windows machine:
      1. Verifies prerequisites (Node.js >= 18, npm, Docker Desktop, Git).
      2. Creates .env from .env.example on first run.
      3. Starts Postgres + Redis via docker compose.
      4. Waits for Postgres to be ready.
      5. Installs npm workspaces.
      6. Generates the Prisma client and pushes the schema to the DB.
      7. Seeds demo data (admin / trainer / client accounts).
      8. Launches the API (NestJS, port 3001) and Web (Next.js, port 3000) in parallel.

.PARAMETER SkipInstall
    Skip "npm install" (useful for repeat runs).

.PARAMETER SkipSeed
    Skip database seed (useful if data already loaded).

.PARAMETER SkipDocker
    Don't start docker compose (use if Postgres/Redis already running locally).

.PARAMETER Stop
    Stop and remove docker containers, then exit.

.PARAMETER Reset
    Drop the docker volume (wipes the database) and start clean. Implies seed.

.EXAMPLE
    .\setup.ps1
    # First run: full bootstrap and launch.

.EXAMPLE
    .\setup.ps1 -SkipInstall -SkipSeed
    # Day-to-day: just bring services up and launch.

.EXAMPLE
    .\setup.ps1 -Stop
    # Tear down docker services.

.EXAMPLE
    .\setup.ps1 -Reset
    # Wipe DB and start fresh (re-seeds demo data).
#>

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$SkipSeed,
    [switch]$SkipDocker,
    [switch]$Stop,
    [switch]$Reset
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

# ---------- helpers ----------
function Write-Step($msg)    { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg)   { Write-Host "    !   $msg" -ForegroundColor Yellow }
function Write-Err2($msg)    { Write-Host "    X   $msg" -ForegroundColor Red }

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Invoke-Required {
    param([string]$Exe, [string[]]$ArgList, [string]$Label)
    Write-Host "    > $Exe $($ArgList -join ' ')" -ForegroundColor DarkGray
    & $Exe @ArgList
    if ($LASTEXITCODE -ne 0) {
        Write-Err2 "$Label failed (exit $LASTEXITCODE)."
        throw "$Label failed."
    }
}

# ---------- stop mode ----------
if ($Stop) {
    Write-Step "Stopping docker services..."
    docker compose down
    Write-Ok "FitFlow services stopped."
    exit 0
}

# ---------- prerequisites ----------
Write-Step "Checking prerequisites"

if (-not (Test-Command node)) {
    Write-Err2 "Node.js is not installed. Install Node 18+ from https://nodejs.org/"
    exit 1
}
$nodeVer = (& node --version).TrimStart('v')
$nodeMajor = [int]($nodeVer.Split('.')[0])
if ($nodeMajor -lt 18) {
    Write-Err2 "Node.js $nodeVer detected — version 18+ required."
    exit 1
}
Write-Ok "Node.js $nodeVer"

if (-not (Test-Command npm)) {
    Write-Err2 "npm is missing (should ship with Node.js)."
    exit 1
}
Write-Ok "npm $(& npm --version)"

if (-not (Test-Command git)) {
    Write-Warn2 "git not found — fine for running, required only if you'll push changes."
} else {
    Write-Ok "git $((& git --version) -replace 'git version ','')"
}

if (-not $SkipDocker) {
    if (-not (Test-Command docker)) {
        Write-Err2 "Docker is not installed. Get Docker Desktop: https://www.docker.com/products/docker-desktop/"
        exit 1
    }
    try {
        & docker info *> $null
        if ($LASTEXITCODE -ne 0) { throw "docker info failed" }
        Write-Ok "Docker daemon reachable"
    } catch {
        Write-Err2 "Docker is installed but the daemon isn't running. Start Docker Desktop and re-run."
        exit 1
    }
}

# ---------- .env ----------
Write-Step "Preparing .env"
$envPath = Join-Path $ProjectRoot '.env'
$envExample = Join-Path $ProjectRoot '.env.example'
if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExample)) {
        Write-Err2 ".env.example is missing — cannot bootstrap .env."
        exit 1
    }
    Copy-Item $envExample $envPath
    Write-Ok ".env created from .env.example"
} else {
    Write-Ok ".env already exists (left unchanged)"
}

# ---------- docker compose ----------
if (-not $SkipDocker) {
    if ($Reset) {
        Write-Step "Reset requested — tearing down and removing volumes"
        docker compose down -v
        Write-Ok "Volumes removed."
    }

    Write-Step "Starting Postgres + Redis (docker compose up -d)"
    Invoke-Required -Exe 'docker' -ArgList @('compose','up','-d') -Label 'docker compose up'

    Write-Step "Waiting for Postgres to accept connections"
    $deadline = (Get-Date).AddSeconds(60)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        & docker exec fitflow-postgres pg_isready -U fitflow -d fitflow *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Err2 "Postgres did not become ready within 60s. Check 'docker logs fitflow-postgres'."
        exit 1
    }
    Write-Ok "Postgres is ready."
}

# ---------- npm install ----------
if (-not $SkipInstall) {
    Write-Step "Installing npm workspaces (root + apps/api + apps/web)"
    Invoke-Required -Exe 'npm' -ArgList @('install') -Label 'npm install'
    Write-Ok "Dependencies installed."
} else {
    Write-Warn2 "Skipping npm install (-SkipInstall)."
}

# ---------- prisma ----------
Write-Step "Generating Prisma client"
Invoke-Required -Exe 'npx' -ArgList @('prisma','generate') -Label 'prisma generate'
Write-Ok "Prisma client generated."

Write-Step "Pushing schema to database (prisma db push)"
# db push is used instead of migrate deploy because migration.sql files are
# git-ignored in this repo. db push reconciles the schema directly from
# prisma/schema.prisma, which is exactly what we want for a dev bootstrap.
Invoke-Required -Exe 'npx' -ArgList @('prisma','db','push','--skip-generate','--accept-data-loss') -Label 'prisma db push'
Write-Ok "Database schema is in sync with schema.prisma."

# ---------- seed ----------
if (-not $SkipSeed -or $Reset) {
    Write-Step "Seeding demo data"
    Invoke-Required -Exe 'npm' -ArgList @('run','seed') -Label 'npm run seed'
    Write-Ok "Demo data ready. Logins:"
    Write-Host "      admin@fitflow.local / admin123"   -ForegroundColor Gray
    Write-Host "      trainer@fitflow.local / trainer123" -ForegroundColor Gray
    Write-Host "      client@fitflow.local / client123"   -ForegroundColor Gray
} else {
    Write-Warn2 "Skipping seed (-SkipSeed)."
}

# ---------- launch ----------
Write-Step "Launching API (http://localhost:3001) and Web (http://localhost:3000)"
Write-Host "    Press Ctrl+C in this window to stop both processes." -ForegroundColor DarkGray
Write-Host "    Postgres + Redis keep running; use '.\setup.ps1 -Stop' to tear them down.`n" -ForegroundColor DarkGray

# 'npm run dev' uses concurrently to spawn both apps; Ctrl+C terminates both.
& npm run dev
