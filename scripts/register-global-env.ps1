#Requires -Version 5.1
$ErrorActionPreference = "Stop"

Write-Host "`nSetting Permanent Environment Variables for AI Tools (Claude Code, OpenAI, OpenCode)..." -ForegroundColor Cyan

$envVars = @{
    "ANTHROPIC_BASE_URL" = "http://localhost:8080"
    "OPENAI_BASE_URL"    = "http://localhost:8080/v1"
    "OPENCODE_BASE_URL"  = "http://localhost:8080"
    "OMNI_GATEWAY_URL"   = "http://localhost:8080"
    "OMNI_MCP_CONFIG"    = "C:\adi\vectorfiscal\omni-llm-suite\config\mcp-servers.json"
}

foreach ($key in $envVars.Keys) {
    $val = $envVars[$key]
    [Environment]::SetEnvironmentVariable($key, $val, "User")
    [Environment]::SetEnvironmentVariable($key, $val, "Process")
    Write-Host "   [OK] User Env: $key = $val" -ForegroundColor Green
}

# Also ensure Claude Code config directory exists with MCP & Gateway routing
$userDir = $env:USERPROFILE
$claudeConfigDir = Join-Path $userDir ".claude"
if (!(Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

$claudeSettingsFile = Join-Path $claudeConfigDir "settings.json"
$settingsJson = @'
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:8080"
  },
  "mcpServers": {
    "omni-token-savior": {
      "command": "uv",
      "args": ["run", "token-savior"],
      "cwd": "C:/adi/vectorfiscal/omni-llm-suite/packages/token-savior"
    },
    "omni-caveman": {
      "command": "node",
      "args": ["C:/adi/vectorfiscal/omni-llm-suite/packages/caveman/dist/index.js"]
    }
  }
}
'@

Set-Content -Path $claudeSettingsFile -Value $settingsJson -Encoding UTF8
Write-Host "   [OK] Configured .claude/settings.json -> http://localhost:8080" -ForegroundColor Green

Write-Host "`n[OK] Permanent environment configuration complete!" -ForegroundColor Green
