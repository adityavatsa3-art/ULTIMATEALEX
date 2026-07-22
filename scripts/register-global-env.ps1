#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$root = (Get-Item "$PSScriptRoot\..").FullName
$envLocal = Join-Path $root ".env.local"

Write-Host "`nSetting Hardwired System & AI Agent Environment Variables..." -ForegroundColor Cyan

# Standard Default Endpoints
$defaultEnvs = @{
    "ANTHROPIC_BASE_URL" = "http://localhost:8088"
    "OPENAI_BASE_URL"    = "http://localhost:8088/v1"
    "OPENCODE_BASE_URL"  = "http://localhost:8088"
    "OMNI_GATEWAY_URL"   = "http://localhost:8088"
    "OMNI_MCP_CONFIG"    = "C:\adi\vectorfiscal\omni-llm-suite\config\mcp-servers.json"
}

foreach ($key in $defaultEnvs.Keys) {
    $val = $defaultEnvs[$key]
    [Environment]::SetEnvironmentVariable($key, $val, "User")
    [Environment]::SetEnvironmentVariable($key, $val, "Process")
    Write-Host "   [OK] User Env: $key = $val" -ForegroundColor Green
}

# Parse .env.local dynamically if present
if (Test-Path $envLocal) {
    Get-Content $envLocal | ForEach-Object {
        if ($_ -match '^\s*([^#\s][^=]*)=(.*)$') {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim().Trim('"').Trim("'")
            if ($k -and $v) {
                [Environment]::SetEnvironmentVariable($k, $v, "User")
                [Environment]::SetEnvironmentVariable($k, $v, "Process")
                Write-Host "   [OK] User Env Loaded: $k" -ForegroundColor Green
            }
        }
    }
}

# Also ensure Claude Code config directory exists with Gateway routing & MCP
$userDir = $env:USERPROFILE
$claudeConfigDir = Join-Path $userDir ".claude"
if (!(Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

$claudeSettingsFile = Join-Path $claudeConfigDir "settings.json"
$settingsJson = @'
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:8088"
  },
  "mcpServers": {
    "git-mcp": {
      "command": "node",
      "args": ["C:/adi/vectorfiscal/omni-llm-suite/packages/git-mcp/dist/index.js"]
    },
    "mcp-filesystem": {
      "command": "node",
      "args": ["C:/adi/vectorfiscal/omni-llm-suite/packages/mcp-servers/src/filesystem/dist/index.js", "C:/adi/vectorfiscal"]
    }
  }
}
'@

Set-Content -Path $claudeSettingsFile -Value $settingsJson -Encoding UTF8
Write-Host "   [OK] Configured .claude/settings.json -> http://localhost:8088" -ForegroundColor Green

Write-Host "`n[OK] Permanent environment & API keys registered on local PC!" -ForegroundColor Green
