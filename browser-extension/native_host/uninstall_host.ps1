$regKeyChrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.kavin.focusdog"
$regKeyEdge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.kavin.focusdog"

if (Test-Path $regKeyChrome) {
    Remove-Item -Path $regKeyChrome -Recurse -Force
    Write-Host "Removed Chrome registration" -ForegroundColor Yellow
}
if (Test-Path $regKeyEdge) {
    Remove-Item -Path $regKeyEdge -Recurse -Force
    Write-Host "Removed Edge registration" -ForegroundColor Yellow
}
Write-Host "Uninstallation complete." -ForegroundColor Green
