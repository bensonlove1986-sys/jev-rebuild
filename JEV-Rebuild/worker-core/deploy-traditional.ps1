#!/usr/bin/env pwsh

# Deployment script for Traditional Cloudflare Worker (Service Worker format)

# Check if account ID and API token are provided
if ($args.Length -ne 2) {
    Write-Error "❌ Missing required arguments"
    Write-Output "Usage: ./deploy-traditional.ps1 <account-id> <api-token>"
    exit 1
}

$ACCOUNT_ID = $args[0]
$API_TOKEN = $args[1]
$WORKER_NAME = "jev-rebuild-worker"

Write-Output "🚀 Deploying traditional worker: $WORKER_NAME"
Write-Output "📦 Account ID: $ACCOUNT_ID"
Write-Output "🔐 API Token: $($API_TOKEN.Substring(0, 8))..."

# Read the traditional worker script
$workerScript = Get-Content -Path "traditional-worker.js" -Raw

# Use curl to deploy the worker using application/javascript Content-Type
try {
    curl.exe -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" `
      -H "Authorization: Bearer $API_TOKEN" `
      -H "Content-Type: application/javascript" `
      -d "$workerScript" `
      -v
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
    exit 1
}
