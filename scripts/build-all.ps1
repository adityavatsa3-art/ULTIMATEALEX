#Requires -Version 5.1
param([switch]$SkipRust, [switch]$SkipDotnet)

$ErrorActionPreference = "Stop"
$root = (Get-Item "$PSScriptRoot\..").FullName

Write-Host "`n🔨 Building Omni-LLM-Suite (all packages)...`n" -ForegroundColor Magenta

# 1. Node/TS packages via Turborepo
Write-Host "▶  Building TypeScript packages..." -ForegroundColor Cyan
Push-Location $root
pnpm run build
Pop-Location
Write-Host "   ✅ TypeScript build complete" -ForegroundColor Green

# 2. .NET Gateway
if (!$SkipDotnet -and (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "▶  Building .NET Gateway..." -ForegroundColor Cyan
    Push-Location "$root\apps\gateway"
    dotnet build -c Release --nologo 2>&1 | Select-Object -Last 5
    Pop-Location
    Write-Host "   ✅ .NET Gateway built" -ForegroundColor Green
}

# 3. Rust RTK
if (!$SkipRust -and (Get-Command cargo -ErrorAction SilentlyContinue) -and (Test-Path "$root\packages\rtk\Cargo.toml")) {
    Write-Host "▶  Building RTK (Rust)..." -ForegroundColor Cyan
    Push-Location "$root\packages\rtk"
    cargo build --release 2>&1 | Select-Object -Last 5
    if (Test-Path "target\release\rtk.exe") {
        Copy-Item "target\release\rtk.exe" "$root\bin\rtk.exe" -Force
        Write-Host "   ✅ rtk.exe → bin/rtk.exe" -ForegroundColor Green
    }
    Pop-Location
}

Write-Host "`n✅ All builds complete!`n" -ForegroundColor Green
