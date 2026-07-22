#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$root = (Get-Item "$PSScriptRoot\..").FullName
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "OmniLLMSuite.lnk"

Write-Host "`nConfiguring Permanent Windows Auto-Start for Omni-LLM-Suite..." -ForegroundColor Cyan

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\start-all.ps1`" -NoBuild"
$shortcut.WorkingDirectory = $root
$shortcut.Description = "Omni-LLM-Suite Auto-Start Service"
$shortcut.Save()

if (Test-Path $shortcutPath) {
    Write-Host "   [OK] Windows Startup Shortcut Created:" -ForegroundColor Green
    Write-Host "        $shortcutPath`n" -ForegroundColor Gray
    Write-Host "[OK] Omni-LLM-Suite will now automatically launch every time Windows starts!`n" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Could not create startup shortcut." -ForegroundColor Red
}
