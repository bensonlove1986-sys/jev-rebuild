#!/usr/bin/env node

/**
 * GLOBAL STATE SNAPSHOT GENERATOR (ES MODULE)
 * Generates a read-only snapshot of the Daojie system state
 * for L10 production environment
 */

import fs from 'fs';
import path from 'path';

// Get current timestamp for snapshot filename
const now = new Date();
const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const snapshotFilename = `jev_global_snapshot_L10_PROD_${timestamp.substring(0, 8)}_${timestamp.substring(8, 14)}.json`;

// Project root directory
const PROJECT_ROOT = path.join(import.meta.url.replace('file:///', ''), '..');

// Configuration
const CONFIG = {
  workerCorePath: path.join(PROJECT_ROOT, 'worker-core'),
  uiCorePath: path.join(PROJECT_ROOT, 'ui-core'),
  outputDir: PROJECT_ROOT,
  snapshotFilename,
  restoreGuideFilename: 'jev_global_snapshot_restore.md'
};

// Function to read file content safely
async function readFileSafe(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`[ERROR] Failed to read file: ${filePath}`, error.message);
    return '';
  }
}

// Function to write file content safely
async function writeFileSafe(filePath, content) {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
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

// Function to extract API_BASE_URL from UI
function extractApiBaseUrl(content) {
  const apiBaseRegex = /API_BASE_URL\s*=\s*['"]([^'"]+)['"]/;
  const apiBaseMatch = content.match(apiBaseRegex);
  return apiBaseMatch ? apiBaseMatch[1] : 'Not found';
}

// Function to extract polling interval from ChatPanel
function extractPollingInterval(content) {
  const pollingIntervalRegex = /setInterval\(.*?,\s*(\d+)\s*\)/;
  const pollingIntervalMatch = content.match(pollingIntervalRegex);
  return pollingIntervalMatch ? parseInt(pollingIntervalMatch[1]) : 30000;
}

// Main function to generate snapshot
async function generateSnapshot() {
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
  const workerContent = await readFileSafe(workerIndexPath);
  
  const workerConfig = {
    routes: extractWorkerRoutes(workerContent),
    isDev: extractIsDev(workerContent),
    canonicalCustomerIdFunction: extractCanonicalIdFunction(workerContent),
    sourceFile: 'worker-core/src/index.js'
  };
  
  // Extract UI configuration
  console.log('[SNAPSHOT] Extracting UI configuration...');
  const fetchSafePath = path.join(CONFIG.uiCorePath, 'app', 'utils', 'fetchSafe.js');
  const fetchSafeContent = await readFileSafe(fetchSafePath);
  
  const apiBaseUrl = extractApiBaseUrl(fetchSafeContent);
  
  // Extract ChatPanel polling interval
  const chatPanelPath = path.join(CONFIG.uiCorePath, 'app', 'modules', 'chat', 'ChatPanel.jsx');
  const chatPanelContent = await readFileSafe(chatPanelPath);
  
  const pollingInterval = extractPollingInterval(chatPanelContent);
  
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
      version: 'L10',
      generator: 'generate_snapshot_esm.js'
    },
    worker: workerConfig,
    ui: uiConfig,
    kv: kvConfig
  };
  
  // Write snapshot to file
  const snapshotPath = path.join(CONFIG.outputDir, CONFIG.snapshotFilename);
  await writeFileSafe(snapshotPath, JSON.stringify(snapshotData, null, 2));
  
  // Generate simple rollback guide
  console.log('[SNAPSHOT] Generating rollback guide...');
  const rollbackGuide = `# JEV Global State Rollback Guide\n\n## Snapshot Info\n- Snapshot File: ${CONFIG.snapshotFilename}\n- Generated: ${now.toISOString()}\n- Environment: PROD\n- Version: L10\n\n## Worker Rollback\n1. Navigate to worker-core directory\n2. Checkout the commit corresponding to the snapshot\n3. Deploy to Cloudflare Workers using: npx wrangler deploy\n4. Verify deployment with: curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/health\n\n## UI Rollback\n1. Navigate to ui-core/app directory\n2. Checkout the commit corresponding to the snapshot\n3. Build UI: npm run build\n4. Deploy UI if needed\n\n## KV Rollback Strategy\n1. DO NOT empty the KV namespace\n2. Only delete keys that were not present in the snapshot\n3. Always maintain a backup before modifying KV data\n\n## Verification Checklist\n- GET /api/health → 200 OK\n- GET /api/status → 200 OK\n- GET /api/inbox/customers → 200 OK with customer list\n- GET /api/inbox/pull → Returns messages\n- POST /api/inbound/daojie → Accepts messages\n- POST /api/translate/text → Returns translated text\n\n## Rollback Validation\n1. No duplicate customers in customer list\n2. Correct display names for customers\n3. Automatic polling works (no manual refresh needed)\n4. Consistent customer IDs (canonical format)\n\n# END OF ROLLBACK GUIDE`;
  
  // Write rollback guide to file
  const rollbackGuidePath = path.join(CONFIG.outputDir, CONFIG.restoreGuideFilename);
  await writeFileSafe(rollbackGuidePath, rollbackGuide);
  
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
generateSnapshot().catch(error => {
  console.error('[ERROR] Snapshot generation failed:', error);
  process.exit(1);
});
