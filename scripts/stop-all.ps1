#Requires -Version 7.0
$ErrorActionPreference = "SilentlyContinue"

Write-Host "🛑 Stopping Omni-LLM-Suite..." -ForegroundColor Red

# Docker services
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Push-Location (Get-Item "$PSScriptRoot\..").FullName
    docker compose down 2>$null
    Pop-Location
    Write-Host "   ✅ Docker services stopped" -ForegroundColor Green
}

# Find and stop Node processes running our packages
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcs) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -match "(rotato|claude-cruise|opencoder|caveman|omni-llm)") {
            $proc | Stop-Process -Force
            Write-Host "   ✅ Stopped node process: $($proc.Id)" -ForegroundColor Green
        }
    } catch { }
}

# Find and stop dotnet gateway
$dotnetProcs = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
foreach ($proc in $dotnetProcs) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -match "(gateway|OmniGateway)") {
            $proc | Stop-Process -Force
            Write-Host "   ✅ Stopped gateway process: $($proc.Id)" -ForegroundColor Green
        }
    } catch { }
}

# Stop Python/uv (token-savior)
Get-Process -Name "python","uvicorn","uv" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Stopped Python processes" -ForegroundColor Green

Write-Host "`n✅ All Omni-LLM-Suite services stopped.`n" -ForegroundColor Green
