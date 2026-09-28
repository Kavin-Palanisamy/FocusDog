$manifestPath = (Resolve-Path (Join-Path $PSScriptRoot "com.kavin.focusdog.json")).Path
$regKeyChrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.kavin.focusdog"
$regKeyEdge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.kavin.focusdog"

Write-Host "Registering FocusDog Native Messaging Host..." -ForegroundColor Cyan

# Chrome registration
if (-not (Test-Path $regKeyChrome)) {
    New-Item -Path $regKeyChrome -Force | Out-Null
}
$keyChrome = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Google\Chrome\NativeMessagingHosts\com.kavin.focusdog")
$keyChrome.SetValue("", $manifestPath)
$keyChrome.Close()
Write-Host "[OK] Registered for Google Chrome: $regKeyChrome" -ForegroundColor Green

# Edge registration
if (-not (Test-Path $regKeyEdge)) {
    New-Item -Path $regKeyEdge -Force | Out-Null
}
$keyEdge = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Microsoft\Edge\NativeMessagingHosts\com.kavin.focusdog")
$keyEdge.SetValue("", $manifestPath)
$keyEdge.Close()
Write-Host "[OK] Registered for Microsoft Edge: $regKeyEdge" -ForegroundColor Green

Write-Host ""
Write-Host "Setup complete! You can now load the extension in Chrome or Edge." -ForegroundColor Cyan
