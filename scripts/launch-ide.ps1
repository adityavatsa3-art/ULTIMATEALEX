#Requires -Version 5.1
$ErrorActionPreference = "Continue"

$root = (Get-Item "$PSScriptRoot\..").FullName
Push-Location $root

Write-Host "`n🚀 Launching OpenWork AI IDE Workspace & OpenCoder..." -ForegroundColor Cyan

# 1. Register Environment Variables
& powershell -ExecutionPolicy Bypass -File "$root\scripts\register-global-env.ps1"

# 2. Ensure Gateway is Running
$gatewayHealth = Try { (Invoke-RestMethod -Uri "http://localhost:8088/health" -TimeoutSec 2).status } Catch { $null }
if ($gatewayHealth -ne "healthy") {
    Write-Host "-> Starting Gateway background service..." -ForegroundColor Yellow
    $dotnetExe = "C:\Program Files\dotnet\dotnet.exe"
    if (Test-Path $dotnetExe) {
        Start-Process -FilePath $dotnetExe -ArgumentList "run", "--project", "apps/gateway/Gateway.csproj", "-c", "Release" `
            -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null
    }
}

# 3. Launch OpenCoder Console
Write-Host "-> Launching OpenCoder CLI in interactive window..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k node packages/opencoder/dist/cli.js" `
    -WorkingDirectory $root -PassThru | Out-Null

# 4. Launch OpenWork IDE Workspace (App / UI)
Write-Host "-> Launching OpenWork AI Desktop UI..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @different-ai/openwork-workspace dev" `
    -WorkingDirectory $root -WindowStyle Minimized -PassThru | Out-Null

Write-Host "`n[OK] OpenWork AI IDE Workspace & OpenCoder launched successfully!`n" -ForegroundColor Green
Pop-Location
