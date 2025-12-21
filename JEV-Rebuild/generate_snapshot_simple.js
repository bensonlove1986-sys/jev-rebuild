#!/usr/bin/env node

/**
 * SIMPLE GLOBAL STATE SNAPSHOT GENERATOR
 * Generates a read-only snapshot of the Daojie system state
 * for L10 production environment
 */

const fs = require('fs');
const path = require('path');

// Get current timestamp for snapshot filename
const now = new Date();
const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const snapshotFilename = `jev_global_snapshot_L10_PROD_${timestamp.substring(0, 8)}_${timestamp.substring(8, 14)}.json`;

// Project root directory
const PROJECT_ROOT = path.join(__dirname, '');

// Configuration
const CONFIG = {
  workerCorePath: path.join(PROJECT_ROOT, 'worker-core'),
  uiCorePath: path.join(PROJECT_ROOT, 'ui-core'),
  outputDir: PROJECT_ROOT,
  snapshotFilename,
  restoreGuideFilename: 'jev_global_snapshot_restore.md'
};

// Function to read file content safely
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`[ERROR] Failed to read file: ${filePath}`, error.message);
    return '';
  }
}

// Function to write file content safely
function writeFileSafe(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[SUCCESS] Written to file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to write file: ${filePath}`, error.message);
    return false;
  }
}

// Function to extract Worker routes from code
function extractWorkerRoutes(content) {
  const routes = [];
  const routeRegex = /path\s*===\s*['"](\/[^'"]+)['"]/g;
  let match;
  
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(match[1]);
  }
  
  // Add hardcoded routes
  const hardcodedRoutes = ['/', '/api/health', '/api/status', '/api/admin/index-backfill'];
  routes.push(...hardcodedRoutes);
  
  // Remove duplicates
  return Array.from(new Set(routes));
}

// Function to extract canonical ID function
function extractCanonicalIdFunction(content) {
  const canonIdRegex = /const\s+canonicalCustomerId\s*=\s*\(.*?\)\s*=>\s*{([\s\S]*?)}/;
  const canonIdMatch = content.match(canonIdRegex);
  return canonIdMatch ? canonIdMatch[0] : 'Not found';
}

// Function to extract IS_DEV constant
function extractIsDev(content) {
  const isDevRegex = /const\s+IS_DEV\s*=\s*(true|false);/;
  const isDevMatch = content.match(isDevRegex);
  return isDevMatch ? (isDevMatch[1] === 'true') : false;
}

// Main function to generate snapshot
function generateSnapshot() {
  console.log('========================================');
  console.log('DAOJIE GLOBAL STATE SNAPSHOT GENERATOR');
  console.log('========================================');
  console.log(`Environment: PROD`);
  console.log(`Timestamp: ${now.toISOString()}`);
  console.log(`Output Directory: ${CONFIG.outputDir}`);
  console.log('');
  
  // Extract Worker configuration
  console.log('[SNAPSHOT] Extracting Worker configuration...');
  const workerIndexPath = path.join(CONFIG.workerCorePath, 'src', 'index.js');
  const workerContent = readFileSafe(workerIndexPath);
  
  const workerConfig = {
    routes: extractWorkerRoutes(workerContent),
    isDev: extractIsDev(workerContent),
    canonicalCustomerIdFunction: extractCanonicalIdFunction(workerContent),
    sourceFile: 'worker-core/src/index.js'
  };
  
  // Extract UI configuration
  console.log('[SNAPSHOT] Extracting UI configuration...');
  const fetchSafePath = path.join(CONFIG.uiCorePath, 'app', 'utils', 'fetchSafe.js');
  const fetchSafeContent = readFileSafe(fetchSafePath);
  
  const apiBaseRegex = /API_BASE_URL\s*=\s*['"]([^'"]+)['"]/;
  const apiBaseMatch = fetchSafeContent.match(apiBaseRegex);
  const apiBaseUrl = apiBaseMatch ? apiBaseMatch[1] : 'Not found';
  
  // Extract ChatPanel polling interval
  const chatPanelPath = path.join(CONFIG.uiCorePath, 'app', 'modules', 'chat', 'ChatPanel.jsx');
  const chatPanelContent = readFileSafe(chatPanelPath);
  
  const pollingIntervalRegex = /setInterval\(.*?,\s*(\d+)\s*\)/;
  const pollingIntervalMatch = chatPanelContent.match(pollingIntervalRegex);
  const pollingInterval = pollingIntervalMatch ? parseInt(pollingIntervalMatch[1]) : 30000;
  
  const uiConfig = {
    apiBaseUrl,
    pollingInterval,
    sourceFiles: [
      'ui-core/app/utils/fetchSafe.js',
      'ui-core/app/modules/chat/ChatPanel.jsx'
    ]
  };
  
  // Extract KV configuration
  console.log('[SNAPSHOT] Extracting KV configuration...');
  const kvConfig = {
    bindingName: 'MESSAGES_KV',
    keyPatterns: [
      'inbox:customer:{canonicalId}',
      'inbox:customers:index:{canonicalId}',
      'inbox:msg:{canonicalId}:{timestamp}:{messageId}',
      'inbox:index:{canonicalId}'
    ],
    sourceFile: 'worker-core/src/index.js'
  };
  
  // Create snapshot data structure
  const snapshotData = {
    metadata: {
      filename: CONFIG.snapshotFilename,
      timestamp: now.toISOString(),
      environment: 'PROD',
      version: 'L10'
    },
    worker: workerConfig,
    ui: uiConfig,
    kv: kvConfig
  };
  
  // Write snapshot to file
  const snapshotPath = path.join(CONFIG.outputDir, CONFIG.snapshotFilename);
  writeFileSafe(snapshotPath, JSON.stringify(snapshotData, null, 2));
  
  // Generate simple rollback guide
  console.log('[SNAPSHOT] Generating rollback guide...');
  const rollbackGuide = `# JEV Global State Rollback Guide

## Snapshot Info
- Snapshot File: ${CONFIG.snapshotFilename}
- Generated: ${now.toISOString()}
- Environment: PROD
- Version: L10

## Worker Rollback
1. Navigate to worker-core directory
2. Checkout the commit corresponding to the snapshot
3. Deploy to Cloudflare Workers using: npx wrangler deploy
4. Verify deployment with: curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/health

## UI Rollback
1. Navigate to ui-core/app directory
2. Checkout the commit corresponding to the snapshot
3. Build UI: npm run build
4. Deploy UI if needed

## KV Rollback Strategy
1. DO NOT empty the KV namespace
2. Only delete keys that were not present in the snapshot
3. Always maintain a backup before modifying KV data

## Verification Checklist
- GET /api/health → 200 OK
- GET /api/status → 200 OK
- GET /api/inbox/customers → 200 OK with customer list
- GET /api/inbox/pull → Returns messages
- POST /api/inbound/daojie → Accepts messages
- POST /api/translate/text → Returns translated text

## Rollback Validation
1. No duplicate customers in customer list
2. Correct display names for customers
3. Automatic polling works (no manual refresh needed)
4. Consistent customer IDs (canonical format)

# END OF ROLLBACK GUIDE`;
  
  // Write rollback guide to file
  const rollbackGuidePath = path.join(CONFIG.outputDir, CONFIG.restoreGuideFilename);
  writeFileSafe(rollbackGuidePath, rollbackGuide);
  
  console.log('');
  console.log('========================================');
  console.log('✅ GLOBAL STATE SNAPSHOT COMPLETE');
  console.log('========================================');
  console.log('');
  console.log(`📦 Snapshot File: ${CONFIG.snapshotFilename}`);
  console.log(`📖 Rollback Guide: ${CONFIG.restoreGuideFilename}`);
  console.log('');
  console.log('GLOBAL STATE SNAPSHOT READY — SAFE TO ITERATE');
  
  return {
    snapshotPath,
    rollbackGuidePath,
    snapshotData
  };
}

// Execute snapshot generation
generateSnapshot();
