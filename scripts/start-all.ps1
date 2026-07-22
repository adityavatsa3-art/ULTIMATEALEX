#Requires -Version 5.1
param([switch]$Verbose, [switch]$NoBuild)

$ErrorActionPreference = "SilentlyContinue"
$root = (Get-Item "$PSScriptRoot\..").FullName
Push-Location $root

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

$GATEWAY_PORT = Get-EnvOrDefault "GATEWAY_PORT" "8088"
$ROTATO_PORT  = Get-EnvOrDefault "ROTATO_PORT" "8990"
$CRUISE_PORT  = Get-EnvOrDefault "CRUISE_PORT" "4141"
$MOA_PORT     = Get-EnvOrDefault "MOA_AGGREGATOR_PORT" "8007"

Write-Host "Starting Omni-LLM-Suite..." -ForegroundColor Magenta

if ($NoBuild -eq $false) {
    Write-Host "Building packages..." -ForegroundColor Cyan
    pnpm run build
}

Write-Host "Starting Rotato (port $ROTATO_PORT)..." -ForegroundColor Cyan
if (Test-Path "packages/rotato/index.js") {
    Start-Process -FilePath "node" -ArgumentList "packages/rotato/index.js" -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   [OK] Rotato started" -ForegroundColor Green
}

Write-Host "Starting Claude Cruise (port $CRUISE_PORT)..." -ForegroundColor Cyan
if (Test-Path "packages/claude-cruise/dist/cli/index.js") {
    Start-Process -FilePath "node" -ArgumentList "packages/claude-cruise/dist/cli/index.js" -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   [OK] Claude Cruise started" -ForegroundColor Green
}

Write-Host "Starting Gateway (.NET 8, port $GATEWAY_PORT)..." -ForegroundColor Cyan
$dotnetExe = "C:\Program Files\dotnet\dotnet.exe"
$gatewayDll = "apps/gateway/bin/Release/net8.0/OmniGateway.dll"
if (Test-Path $gatewayDll) {
    Start-Process -FilePath $dotnetExe -ArgumentList $gatewayDll -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   [OK] Gateway started (compiled DLL)" -ForegroundColor Green
} else {
    Start-Process -FilePath $dotnetExe -ArgumentList "run", "--project", "apps/gateway/Gateway.csproj", "-c", "Release" -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    Write-Host "   [OK] Gateway started (dotnet run)" -ForegroundColor Green
}

Write-Host "Starting Dashboard (port 3000)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter dashboard dev --port 3000" -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
Write-Host "   [OK] Dashboard started" -ForegroundColor Green

Start-Sleep -Seconds 3

Write-Host "ALL SERVICES STARTING" -ForegroundColor Green
Write-Host "Gateway:   http://127.0.0.1:$GATEWAY_PORT" -ForegroundColor Green
Write-Host "Dashboard: http://127.0.0.1:3000" -ForegroundColor Green
Write-Host "Rotato:    http://127.0.0.1:$ROTATO_PORT" -ForegroundColor Green
Write-Host "Cruise:    http://127.0.0.1:$CRUISE_PORT" -ForegroundColor Green

Pop-Location
