#Requires -Version 5.1
param(
    [switch]$SkipDocker,
    [switch]$SkipRust,
    [switch]$SkipDotnet,
    [string]$InstallDir = "$PSScriptRoot\.."
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$InstallDir = Resolve-Path $InstallDir -ErrorAction SilentlyContinue
if (!$InstallDir) { $InstallDir = (Get-Item "$PSScriptRoot\..").FullName }

function Write-Step($msg)  { Write-Host "`n▶  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "   ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "   ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail($msg)  { Write-Host "   ❌ $msg" -ForegroundColor Red; exit 1 }

Write-Host @"
╔══════════════════════════════════════════════╗
║     🦌 Omni-LLM-Suite — Windows Bootstrap    ║
╚══════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

# ─── 1. PREREQUISITES ──────────────────────────────────────
Write-Step "Checking prerequisites..."

$required = @{
    "git"    = "Git.Git"
    "node"   = "OpenJS.NodeJS.LTS"
    "python" = "Python.Python.3.12"
}

foreach ($cmd in $required.Keys) {
    if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Warn "$cmd not found — installing $($required[$cmd]) via winget..."
        winget install --id $required[$cmd] --silent --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Ok "$cmd $(& $cmd --version 2>&1 | Select-Object -First 1)"
    }
}

# ─── 2. PNPM + TURBOREPO ──────────────────────────────────
Write-Step "Installing pnpm and Turborepo..."
npm install -g pnpm@9 turbo --silent
Write-Ok "pnpm $(pnpm --version) | turbo installed"

# ─── 3. RUST TOOLCHAIN ────────────────────────────────────
if (!$SkipRust) {
    Write-Step "Installing Rust (MSVC target)..."
    if (!(Get-Command rustup -ErrorAction SilentlyContinue)) {
        Write-Warn "rustup not found — installing via winget..."
        winget install --id Rustlang.Rustup --silent --accept-package-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    rustup target add x86_64-pc-windows-msvc 2>$null
    Write-Ok "rustc $(rustc --version)"
}

# ─── 4. UV (Python Package Manager) ───────────────────────
Write-Step "Installing uv..."
if (!(Get-Command uv -ErrorAction SilentlyContinue)) {
    pip install uv --quiet
}
Write-Ok "uv $(uv --version)"

# ─── 5. DOCKER DESKTOP ────────────────────────────────────
if (!$SkipDocker) {
    Write-Step "Checking Docker Desktop..."
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warn "Docker not found — installing Docker Desktop..."
        winget install --id Docker.DockerDesktop --silent --accept-package-agreements
        Write-Warn "Docker Desktop installed. Start it manually before running start-all.ps1"
    } else {
        Write-Ok "docker $(docker --version)"
    }
}

# ─── 6. .NET 8 SDK ───────────────────────────────────────
if (!$SkipDotnet) {
    Write-Step "Checking .NET 8 SDK..."
    if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) {
        winget install --id Microsoft.DotNet.SDK.8 --silent --accept-package-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    Write-Ok "dotnet $(dotnet --version)"
}

# ─── 7. CLONE / UPDATE SUBPACKAGES ────────────────────────
Write-Step "Cloning source repositories into packages/..."

$repos = @(
    @{ Url = "https://github.com/rtk-ai/rtk.git";                             Dir = "packages/rtk" }
    @{ Url = "https://github.com/JuliusBrussee/caveman.git";                   Dir = "packages/caveman" }
    @{ Url = "https://github.com/Mibayy/token-savior.git";                     Dir = "packages/token-savior" }
    @{ Url = "https://github.com/amitlals/claude-cruise.git";                  Dir = "packages/claude-cruise" }
    @{ Url = "https://github.com/ducan-ne/opencoder.git";                      Dir = "packages/opencoder" }
    @{ Url = "https://github.com/xor0110xor-prog/free-llm-proxy-mixture.git"; Dir = "packages/free-llm-proxy" }
    @{ Url = "https://github.com/p32929/rotato.git";                           Dir = "packages/rotato" }
    @{ Url = "https://github.com/different-ai/openwork.git";                   Dir = "packages/openwork" }
)

foreach ($repo in $repos) {
    $target = Join-Path $InstallDir $repo.Dir
    if (Test-Path $target) {
        Write-Ok "$($repo.Dir) exists — pulling latest..."
        Push-Location $target
        git pull --ff-only 2>$null
        Pop-Location
    } else {
        Write-Ok "Cloning $($repo.Url) → $($repo.Dir)"
        $parent = Split-Path $target -Parent
        if (!(Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        git clone --depth 1 $repo.Url $target
    }
}

# ─── 8. INSTALL NODE DEPENDENCIES ────────────────────────
Write-Step "Installing workspace Node.js dependencies..."
Push-Location $InstallDir
pnpm install 2>&1 | Select-Object -Last 5
Pop-Location
Write-Ok "Node.js dependencies installed"

# ─── 9. PYTHON VIRTUAL ENVIRONMENT ───────────────────────
Write-Step "Creating Python virtual environment..."
Push-Location $InstallDir
uv venv .venv --python 3.12 2>$null
& .\.venv\Scripts\activate.ps1 2>$null
uv pip install -e packages/token-savior 2>$null
uv pip install -e packages/free-llm-proxy 2>$null
Pop-Location
Write-Ok "Python venv ready at .venv/"

# ─── 10. BUILD RUST BINARY ───────────────────────────────
if (!$SkipRust -and (Test-Path "$InstallDir\packages\rtk\Cargo.toml")) {
    Write-Step "Building RTK (Rust release binary)..."
    Push-Location "$InstallDir\packages\rtk"
    cargo build --release 2>&1 | Select-Object -Last 3
    $binDir = "$InstallDir\bin"
    if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }
    if (Test-Path "target\release\rtk.exe") {
        Copy-Item "target\release\rtk.exe" "$binDir\rtk.exe" -Force
        Write-Ok "rtk.exe → bin/rtk.exe"
    }
    Pop-Location
}

# ─── 11. BUILD .NET GATEWAY ──────────────────────────────
if (!$SkipDotnet) {
    Write-Step "Restoring .NET Gateway dependencies..."
    Push-Location "$InstallDir\apps\gateway"
    dotnet restore 2>&1 | Select-Object -Last 3
    Pop-Location
    Write-Ok ".NET Gateway ready"
}

# ─── 12. ENVIRONMENT FILE ────────────────────────────────
Write-Step "Generating .env from template..."
$envFile = Join-Path $InstallDir ".env"
$envExample = Join-Path $InstallDir ".env.example"
if (!(Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Ok ".env created from .env.example"
    } else {
        Write-Warn ".env.example not found"
    }
} else {
    Write-Warn ".env already exists — skipping (edit it manually)"
}

# ─── DONE ─────────────────────────────────────────────────
Write-Host @"

╔══════════════════════════════════════════════╗
║           ✅ BOOTSTRAP COMPLETE               ║
╠══════════════════════════════════════════════╣
║  Next steps:                                  ║
║  1. Edit .env with your API keys              ║
║  2. Run:  .\scripts\start-all.ps1             ║
║  3. Open: http://localhost:5173 (Dashboard)   ║
║  4. Proxy: http://localhost:8080              ║
╚══════════════════════════════════════════════╝
"@ -ForegroundColor Green
