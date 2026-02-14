#!/usr/bin/env powershell

# Cloudflare Worker Deployment Script using PowerShell

# Configuration
$ACCOUNT_ID = "156ce03fffc59592e2b3b04dbc22aa6c"
$WORKER_NAME = "jev-rebuild-worker"
$SCRIPT_PATH = "./index.js"
$API_TOKEN = "YOUR_API_TOKEN" # Replace with your Cloudflare API token

Write-Host "🚀 Deploying Cloudflare Worker..."
Write-Host "📦 Account ID: $ACCOUNT_ID"
Write-Host "👷 Worker: $WORKER_NAME"

# Check if script file exists
if (-not (Test-Path "$SCRIPT_PATH")) {
    Write-Host "❌ Script file not found: $SCRIPT_PATH" -ForegroundColor Red
    exit 1
}

# Read script content
$SCRIPT_CONTENT = Get-Content -Path "$SCRIPT_PATH" -Raw
$SCRIPT_SIZE = $SCRIPT_CONTENT.Length
Write-Host "📄 Script size: $SCRIPT_SIZE bytes"

# Deploy using Invoke-RestMethod
try {
    $Headers = @{
        "Content-Type" = "application/javascript"
        "Authorization" = "Bearer $API_TOKEN"
    }
    
    $Uri = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME"
    
    Write-Host "📡 Sending deployment request..."
    $Response = Invoke-RestMethod -Uri $Uri -Method PUT -Headers $Headers -Body $SCRIPT_CONTENT
    
    if ($Response.success) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host "📋 Worker URL: $($Response.result.url)" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Write-Host "📄 Response: $($Response | ConvertTo-Json -Depth 3)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error during deployment: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📄 Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
