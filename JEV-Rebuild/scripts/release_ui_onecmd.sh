#!/bin/bash

# JEV UI Release Pipeline - One Command Build+Deploy
# Usage: ./scripts/release_ui_onecmd.sh

set -euo pipefail

# Project root directory
PROJECT_ROOT="$(dirname "$(dirname "$0")")"
UI_CORE="$PROJECT_ROOT/ui-core/app"
WEB_RUNTIME="$PROJECT_ROOT/web-runtime"
WORKER_CORE="$PROJECT_ROOT/worker-core"

# Log function
log() {
    echo "[$(date +'%H:%M:%S')] $1"
}

# Error function
error_log() {
    echo "[$(date +'%H:%M:%S')] ERROR: $1" >&2
}

log "Starting JEV UI Release Pipeline..."

# Step 1: Install dependencies in ui-core
log "Step 1: Installing UI dependencies..."
pushd "$UI_CORE" > /dev/null
npm install
popd > /dev/null

# Step 2: Build UI
log "Step 2: Building UI..."
pushd "$UI_CORE" > /dev/null
npm run build
popd > /dev/null

# Step 3: Clear and copy to web-runtime
log "Step 3: Deploying to web-runtime..."

# Create web-runtime if it doesn't exist
mkdir -p "$WEB_RUNTIME"

# Clear web-runtime (keep only .gitkeep if exists)
find "$WEB_RUNTIME" -mindepth 1 -not -name ".gitkeep" -delete

# Copy build output to web-runtime
BUILD_OUTPUT="$UI_CORE/dist"
if [ ! -d "$BUILD_OUTPUT" ]; then
    error_log "Build output not found at $BUILD_OUTPUT"
    exit 1
fi

cp -r "$BUILD_OUTPUT"/* "$WEB_RUNTIME/"
log "Copied build output to web-runtime"

# Step 4: Deploy Worker
log "Step 4: Deploying Cloudflare Worker..."
pushd "$WORKER_CORE" > /dev/null
npm run deploy
popd > /dev/null

# Step 5: Verify deployment
log "Step 5: Verifying deployment..."
pushd "$PROJECT_ROOT" > /dev/null
node scripts/verify_ui_release.js
VERIFY_EXIT_CODE=$?
popd > /dev/null

if [ $VERIFY_EXIT_CODE -eq 0 ]; then
    log "🎉 Release pipeline completed successfully!"
    exit 0
else
    error_log "❌ Release pipeline failed during verification"
    exit 1
fi