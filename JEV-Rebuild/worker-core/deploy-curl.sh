#!/bin/bash

# Deployment script using curl for Cloudflare Workers

# Check if account ID and API token are provided
if [ $# -ne 2 ]; then
    echo "❌ Missing required arguments"
    echo "Usage: ./deploy-curl.sh <account-id> <api-token>"
    exit 1
fi

ACCOUNT_ID=$1
API_TOKEN=$2
WORKER_NAME="jev-rebuild-worker"

# Create a temporary directory for deployment files
temp_dir=$(mktemp -d)
echo "📁 Created temporary directory: $temp_dir"

# Copy the simple worker script to the temporary directory
cp simple-worker.js "$temp_dir/"

# Create metadata file
cat > "$temp_dir/metadata.json" << EOL
{
  "main_module": "simple-worker.js"
}
EOL

echo "🚀 Deploying simple worker: $WORKER_NAME"
echo "📦 Account ID: $ACCOUNT_ID"
echo "🔐 API Token: ${API_TOKEN:0:8}..."

# Use curl to deploy the worker using multipart/form-data
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "metadata=@$temp_dir/metadata.json;type=application/json" \
  -F "script=@$temp_dir/simple-worker.js;type=application/javascript" \
  -v

# Clean up temporary directory
rm -rf "$temp_dir"
echo "🧹 Cleaned up temporary directory"
