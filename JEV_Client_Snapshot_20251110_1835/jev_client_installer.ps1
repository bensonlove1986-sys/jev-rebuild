# JEV Client Installer v1.0.0
# Automated Installation Script

Write-Host "Starting JEV Client installation process..." -ForegroundColor Cyan

# Step 1: Check Python Environment
Write-Host "Checking Python environment..."
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "Python not detected. Please install Python3 and try again." -ForegroundColor Yellow
    Start-Process "https://www.python.org/downloads/"
    exit
} else {
    $pyVersion = python --version 2>&1
    Write-Host "Detected: $pyVersion"
}

# Step 2: Check Browser
Write-Host "Checking browser..."
$browserPaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe"
)
$browser = $browserPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
    Write-Host "Browser not found. Please install Chrome or Edge." -ForegroundColor Yellow
    exit
} else {
    Write-Host "Browser detected: $browser"
}

# Step 3: Check Tampermonkey Installation
Write-Host "Checking Tampermonkey extension..."
Start-Process "https://www.tampermonkey.net/"
Write-Host "Please confirm Tampermonkey is installed. Press any key to continue after installation..." -ForegroundColor Yellow
[void][System.Console]::ReadKey($true)

# Step 4: Auto Import Script
$scriptUrl = "https://jevshop.pages.dev/jev_chat_capture.user.js"
Write-Host "Please click 'Install' on the opened page to import the client plugin script." -ForegroundColor Green
Start-Process $scriptUrl
Start-Sleep -Seconds 5

# Step 5: Start Local Server
Write-Host "Starting local development server (http://localhost:8888)..."
Start-Process powershell -ArgumentList "cd '$PSScriptRoot'; python -m http.server 8888"

Start-Sleep -Seconds 3
Write-Host "Local server started."

# Step 6: Open Client UI
$uiUrl = "http://localhost:8888/ui/jev_client_dock.html"
Write-Host "Opening client Dock UI..."
Start-Process $browser $uiUrl

# Step 7: Output Completion Info
Write-Host ""
Write-Host "==============================================="
Write-Host "JEV Client installation and initialization complete!" -ForegroundColor Green
Write-Host "Local access address: http://localhost:8888/"
Write-Host "Verify the following logs appear in browser console:"
Write-Host "   [ClientDock] Connected successfully"
Write-Host "   [Bridge] Worker connection normal"
Write-Host "   [Session] Ready for Operation"
Write-Host "==============================================="
Write-Host ""