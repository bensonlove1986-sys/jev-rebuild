#!/usr/bin/env pwsh

# Deployment script using curl for Cloudflare Workers

# Check if account ID and API token are provided
if ($args.Length -ne 2) {
    Write-Error "❌ Missing required arguments"
    Write-Output "Usage: ./deploy-curl.ps1 <account-id> <api-token>"
    exit 1
}

$ACCOUNT_ID = $args[0]
$API_TOKEN = $args[1]
$WORKER_NAME = "jev-rebuild-worker"

# Create a temporary directory for deployment files
$temp_dir = New-TemporaryFile | ForEach-Object { $_.Delete(); New-Item -ItemType Directory -Path $_.FullName }
Write-Output "📁 Created temporary directory: $temp_dir"

# Copy the simple worker script to the temporary directory
Copy-Item -Path "simple-worker.js" -Destination "$temp_dir/"

# Create metadata file
$metadata = @{
    main_module = "simple-worker.js"
} | ConvertTo-Json

Set-Content -Path "$temp_dir/metadata.json" -Value $metadata

Write-Output "🚀 Deploying simple worker: $WORKER_NAME"
Write-Output "📦 Account ID: $ACCOUNT_ID"
Write-Output "🔐 API Token: $($API_TOKEN.Substring(0, 8))..."

# Use curl to deploy the worker using multipart/form-data
try {
    curl.exe -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" `
      -H "Authorization: Bearer $API_TOKEN" `
      -F "metadata=@$temp_dir/metadata.json;type=application/json" `
      -F "script=@$temp_dir/simple-worker.js;type=application/javascript" `
      -v
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
    exit 1
}

# Clean up temporary directory
Remove-Item -Path $temp_dir -Recurse -Force
Write-Output "🧹 Cleaned up temporary directory"
