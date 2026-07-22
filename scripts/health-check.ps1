#Requires -Version 5.1
param([int]$TimeoutSec = 3)

$ErrorActionPreference = "SilentlyContinue"

# Load .env
$root = (Get-Item "$PSScriptRoot\..").FullName
if (Test-Path "$root\.env") {
    Get-Content "$root\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#\s][^=]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

function Get-EnvOrDefault($varName, $defaultVal) {
    $val = [Environment]::GetEnvironmentVariable($varName, "Process")
    if ($val) { return $val } else { return $defaultVal }
}

$gatewayPort = Get-EnvOrDefault "GATEWAY_PORT" "8088"
$rotatoPort  = Get-EnvOrDefault "ROTATO_PORT" "8990"
$cruisePort  = Get-EnvOrDefault "CRUISE_PORT" "4141"
$moaPort     = Get-EnvOrDefault "MOA_AGGREGATOR_PORT" "8007"
$tsPort      = Get-EnvOrDefault "TOKEN_SAVIOR_PORT" "3100"

$services = @(
    @{ Name = "Gateway";       Url = "http://localhost:$gatewayPort/health" },
    @{ Name = "Dashboard";     Url = "http://localhost:3000" },
    @{ Name = "Rotato";        Url = "http://localhost:$rotatoPort/health" },
    @{ Name = "Claude Cruise"; Url = "http://localhost:$cruisePort/health" },
    @{ Name = "MOA";           Url = "http://localhost:$moaPort/health" },
    @{ Name = "Token Savior";  Url = "http://localhost:$tsPort/health" }
)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   Omni-LLM-Suite Health Probe" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$allHealthy = $true

foreach ($svc in $services) {
    try {
        $req = [System.Net.WebRequest]::Create($svc.Url)
        $req.Timeout = $TimeoutSec * 1000
        $resp = $req.GetResponse()
        $statusCode = [int]$resp.StatusCode
        $resp.Close()
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
            Write-Host " [ONLINE]  $($svc.Name.PadRight(15)) ($($svc.Url))" -ForegroundColor Green
        } else {
            Write-Host " [HTTP $statusCode] $($svc.Name.PadRight(15)) ($($svc.Url))" -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host " [OFFLINE] $($svc.Name.PadRight(15)) ($($svc.Url))" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""
if ($allHealthy) {
    Write-Host "All core services are HEALTHY!`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some services are offline. Run .\scripts\start-all.ps1 to launch.`n" -ForegroundColor Yellow
    exit 1
}
