#!/bin/bash

# Cloudflare Worker Deployment Script using curl

# Configuration
ACCOUNT_ID="156ce03fffc59592e2b3b04dbc22aa6c"
WORKER_NAME="jev-rebuild-worker"
SCRIPT_PATH="./index.js"
API_TOKEN="YOUR_API_TOKEN" # Replace with your Cloudflare API token

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ curl is required but not installed."
    exit 1
fi

# Check if script file exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Script file not found: $SCRIPT_PATH"
    exit 1
fi

echo "🚀 Deploying Cloudflare Worker..."
echo "📦 Account ID: $ACCOUNT_ID"
echo "👷 Worker: $WORKER_NAME"

# Read script content
SCRIPT_CONTENT=$(cat "$SCRIPT_PATH")
SCRIPT_SIZE=${#SCRIPT_CONTENT}
echo "📄 Script size: $SCRIPT_SIZE bytes"

# Deploy using curl
RESPONSE=$(curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
  -H "Content-Type: application/javascript" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d "$SCRIPT_CONTENT" \
  -s)

# Check response
if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ Deployment successful!"
    echo "📋 Worker URL: $(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)"
else
    echo "❌ Deployment failed!"
    echo "📄 Response: $RESPONSE"
fi