#!/usr/bin/env pwsh

# JEV UI Release Pipeline - One Command Build+Deploy
# Usage: .\scripts\release_ui_onecmd.ps1

# Set strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Project root directory
$PROJECT_ROOT = "$PSScriptRoot\.."
$UI_CORE = "$PROJECT_ROOT\ui-core\app"
$WEB_RUNTIME = "$PROJECT_ROOT\web-runtime"
$WORKER_CORE = "$PROJECT_ROOT\worker-core"

# Log function
function Log($message) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $message" -ForegroundColor Cyan
}

# Error function
function ErrorLog($message) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERROR: $message" -ForegroundColor Red
}

Log "Starting JEV UI Release Pipeline..."

# Step 1: Install dependencies in ui-core
Log "Step 1: Installing UI dependencies..."
Push-Location $UI_CORE
npm install
if ($LASTEXITCODE -ne 0) {
    ErrorLog "npm install failed"
    Exit 1
}
Pop-Location

# Step 2: Build UI
Log "Step 2: Building UI..."
Push-Location $UI_CORE
npm run build
if ($LASTEXITCODE -ne 0) {
    ErrorLog "npm run build failed"
    Exit 1
}
Pop-Location

# Step 3: Clear and copy to web-runtime
Log "Step 3: Deploying to web-runtime..."

# Create web-runtime if it doesn't exist
if (-not (Test-Path $WEB_RUNTIME)) {
    New-Item -ItemType Directory -Path $WEB_RUNTIME | Out-Null
}

# Clear web-runtime (keep only .gitkeep if exists)
Get-ChildItem -Path $WEB_RUNTIME -Exclude ".gitkeep" | Remove-Item -Recurse -Force

# Copy build output to web-runtime
$BUILD_OUTPUT = "$UI_CORE\dist"
if (-not (Test-Path $BUILD_OUTPUT)) {
    ErrorLog "Build output not found at $BUILD_OUTPUT"
    Exit 1
}

Copy-Item -Path "$BUILD_OUTPUT\*" -Destination $WEB_RUNTIME -Recurse -Force
Log "Copied build output to web-runtime"

# Step 4: Deploy Worker
Log "Step 4: Deploying Cloudflare Worker..."
Push-Location $WORKER_CORE
npm run deploy
if ($LASTEXITCODE -ne 0) {
    ErrorLog "npm run deploy failed"
    Exit 1
}
Pop-Location

# Step 5: Verify deployment
Log "Step 5: Verifying deployment..."
Push-Location $PROJECT_ROOT
node scripts\verify_ui_release.js
$VERIFY_EXIT_CODE = $LASTEXITCODE
Pop-Location

if ($VERIFY_EXIT_CODE -eq 0) {
    Log "🎉 Release pipeline completed successfully!"
    Exit 0
} else {
    ErrorLog "❌ Release pipeline failed during verification"
    Exit 1
}