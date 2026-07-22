#Requires -Version 5.1
param([switch]$Verbose, [switch]$NoBuild)

$ErrorActionPreference = "SilentlyContinue"
$root = (Get-Item "$PSScriptRoot\..").FullName
Push-Location $root

# ─── Load .env ────────────────────────────────────────────
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#\s][^=]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

function Get-EnvOrDefault($varName, $defaultVal) {
    $val = [Environment]::GetEnvironmentVariable($varName, "Process")
    if ($val) { return $val } else { return $defaultVal }
}

$GATEWAY_PORT = Get-EnvOrDefault "GATEWAY_PORT" "8080"
$ROTATO_PORT  = Get-EnvOrDefault "ROTATO_PORT" "8990"
$CRUISE_PORT  = Get-EnvOrDefault "CRUISE_PORT" "4141"
$MOA_PORT     = Get-EnvOrDefault "MOA_AGGREGATOR_PORT" "8007"
$TS_PORT      = Get-EnvOrDefault "TOKEN_SAVIOR_PORT" "3100"

Write-Host "`n🦌 Starting Omni-LLM-Suite..." -ForegroundColor Magenta
Write-Host "   Root: $root`n" -ForegroundColor Gray

# ─── Build packages first ─────────────────────────────────
if (!$NoBuild) {
    Write-Host "🔨 Building packages..." -ForegroundColor Cyan
    & pnpm run build 2>&1 | Select-Object -Last 5
}

# ─── Docker Services (Redis + MOA) ───────────────────────
Write-Host "🐳 Starting Docker services (Redis + MOA)..." -ForegroundColor Cyan
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    docker compose up -d --remove-orphans 2>&1 | Select-Object -Last 3
    Write-Host "   ✅ Docker services started" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Docker not available — skipping Redis/MOA" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# ─── Rotato ───────────────────────────────────────────────
Write-Host "🔄 Starting Rotato (port $ROTATO_PORT)..." -ForegroundColor Cyan
$rotatoEntry = @("packages/rotato/dist/index.js", "packages/rotato/src/index.js", "packages/rotato/index.js") | 
    Where-Object { Test-Path (Join-Path $root $_) } | Select-Object -First 1

if ($rotatoEntry) {
    Start-Process -FilePath "node" -ArgumentList $rotatoEntry `
        -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   ✅ Rotato started" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Rotato entry not found — run 'pnpm --filter rotato build' first" -ForegroundColor Yellow
}

# ─── Claude Cruise ────────────────────────────────────────
Write-Host "🚢 Starting Claude Cruise (port $CRUISE_PORT)..." -ForegroundColor Cyan
$cruiseEntry = @("packages/claude-cruise/dist/index.js", "packages/claude-cruise/src/index.js") |
    Where-Object { Test-Path (Join-Path $root $_) } | Select-Object -First 1

if ($cruiseEntry) {
    Start-Process -FilePath "node" -ArgumentList $cruiseEntry `
        -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   ✅ Claude Cruise started" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Claude Cruise entry not found" -ForegroundColor Yellow
}

# ─── Token Savior (MCP, Python) ──────────────────────────
Write-Host "🔐 Starting Token Savior MCP (port $TS_PORT)..." -ForegroundColor Cyan
if (Test-Path ".venv\Scripts\activate.ps1") {
    Start-Process -FilePath "powershell" `
        -ArgumentList "-NoProfile -Command `".\.venv\Scripts\activate.ps1; uv run token-savior`"" `
        -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   [OK] Token Savior started" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Python venv not found — run setup-windows.ps1 first" -ForegroundColor Yellow
}

# ─── Gateway (.NET 8) ─────────────────────────────────────
Write-Host "🌐 Starting Gateway (.NET 8, port $GATEWAY_PORT)..." -ForegroundColor Cyan
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    Start-Process -FilePath "dotnet" -ArgumentList "run", "--project", "apps/gateway", "--no-build" `
        -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   ✅ Gateway started" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  dotnet not found" -ForegroundColor Yellow
}

# ─── Dashboard (Vite React) ──────────────────────────────
Write-Host "📊 Starting Dashboard (port 5173)..." -ForegroundColor Cyan
Start-Process -FilePath "pnpm" -ArgumentList "--filter", "dashboard", "dev" `
    -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
Write-Host "   ✅ Dashboard started" -ForegroundColor Green

Start-Sleep -Seconds 3

Write-Host @"

╔══════════════════════════════════════════════╗
║          🦌 ALL SERVICES STARTING             ║
╠══════════════════════════════════════════════╣
║  Gateway:     http://localhost:$GATEWAY_PORT           ║
║  Dashboard:   http://localhost:5173           ║
║  Rotato:      http://localhost:$ROTATO_PORT           ║
║  Cruise:      http://localhost:$CRUISE_PORT           ║
║  MOA:         http://localhost:$MOA_PORT           ║
║  Token Savior: http://localhost:$TS_PORT          ║
║  Redis:       localhost:6379                  ║
╠══════════════════════════════════════════════╣
║  Health:  http://localhost:$GATEWAY_PORT/health     ║
╚══════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host "Run .\scripts\health-check.ps1 to verify all services`n" -ForegroundColor Gray

Pop-Location
