#Requires -Version 7.0
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

$services = @(
    @{ Name = "Gateway";       Url = "http://localhost:$($env:GATEWAY_PORT ?? '8080')/health" }
    @{ Name = "Dashboard";     Url = "http://localhost:5173" }
    @{ Name = "Rotato";        Url = "http://localhost:$($env:ROTATO_PORT ?? '8990')/health" }
    @{ Name = "Claude Cruise"; Url = "http://localhost:$($env:CRUISE_PORT ?? '4141')/health" }
    @{ Name = "MOA";           Url = "http://localhost:$($env:MOA_AGGREGATOR_PORT ?? '8007')/health" }
    @{ Name = "Token Savior";  Url = "http://localhost:$($env:TOKEN_SAVIOR_PORT ?? '3100')/health" }
    @{ Name = "Redis";         Url = $null; Port = 6379 }
)

Write-Host "`n🦌 Omni-LLM-Suite Health Check`n" -ForegroundColor Magenta
Write-Host ("{0,-18} {1,-10} {2}" -f "Service", "Status", "Details") -ForegroundColor Gray
Write-Host ("-" * 55) -ForegroundColor Gray

$allHealthy = $true

foreach ($svc in $services) {
    if ($null -ne $svc.Port) {
        # TCP port check for Redis
        $tcp = $null
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $connect = $tcp.BeginConnect("127.0.0.1", $svc.Port, $null, $null)
            $ok = $connect.AsyncWaitHandle.WaitOne([TimeSpan]::FromSeconds(2))
            if ($ok -and $tcp.Connected) {
                Write-Host ("{0,-18} {1,-10} {2}" -f $svc.Name, "✅ UP", "TCP :$($svc.Port)") -ForegroundColor Green
            } else {
                Write-Host ("{0,-18} {1,-10} {2}" -f $svc.Name, "❌ DOWN", "TCP :$($svc.Port) unreachable") -ForegroundColor Red
                $allHealthy = $false
            }
        } catch {
            Write-Host ("{0,-18} {1,-10} {2}" -f $svc.Name, "❌ DOWN", "Connection refused") -ForegroundColor Red
            $allHealthy = $false
        } finally {
            if ($tcp) { $tcp.Close() }
        }
    } else {
        try {
            $start = Get-Date
            $response = Invoke-WebRequest -Uri $svc.Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
            $latency = [int]((Get-Date) - $start).TotalMilliseconds
            $status = if ($response.StatusCode -eq 200) { "✅ UP" } else { "⚠️  $($response.StatusCode)" }
            $color = if ($response.StatusCode -eq 200) { "Green" } else { "Yellow" }
            Write-Host ("{0,-18} {1,-10} {2}" -f $svc.Name, $status, "${latency}ms") -ForegroundColor $color
        } catch {
            Write-Host ("{0,-18} {1,-10} {2}" -f $svc.Name, "❌ DOWN", $_.Exception.Message.Split("`n")[0]) -ForegroundColor Red
            $allHealthy = $false
        }
    }
}

Write-Host ("-" * 55) -ForegroundColor Gray

if ($allHealthy) {
    Write-Host "`n✅ All services healthy!`n" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some services are not running. Run .\scripts\start-all.ps1`n" -ForegroundColor Yellow
}
