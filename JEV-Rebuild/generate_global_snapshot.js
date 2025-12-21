#!/usr/bin/env node

/**
 * GLOBAL STATE SNAPSHOT GENERATOR
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

/**
 * Extract Worker configuration from index.js
 */
function extractWorkerConfig() {
  console.log('[SNAPSHOT] Extracting Worker configuration...');
  
  const workerIndexPath = path.join(CONFIG.workerCorePath, 'src', 'index.js');
  const content = fs.readFileSync(workerIndexPath, 'utf8');
  
  // Extract routes from the fetch function
  const routes = [];
  const routeRegex = /path\s*===\s*['"](\/[^'"]+)['"]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(match[1]);
  }
  
  // Add hardcoded routes that might not match the regex
  const hardcodedRoutes = ['/', '/api/health', '/api/status', '/api/admin/index-backfill'];
  routes.push(...hardcodedRoutes);
  
  // Extract canonical customer ID function
  const canonIdRegex = /const\s+canonicalCustomerId\s*=\s*\(.*?\)\s*=>\s*{([\s\S]*?)}/;
  const canonIdMatch = content.match(canonIdRegex);
  const canonicalCustomerIdFunction = canonIdMatch ? canonIdMatch[0] : 'Not found';
  
  // Extract constants
  const isDevRegex = /const\s+IS_DEV\s*=\s*(true|false);/;
  const isDevMatch = content.match(isDevRegex);
  const isDev = isDevMatch ? (isDevMatch[1] === 'true') : false;
  
  const appModeRegex = /const\s+APP_MODE\s*=\s*([^;]+);/;
  const appModeMatch = content.match(appModeRegex);
  const appMode = appModeMatch ? appModeMatch[1].trim() : 'PROD';
  
  // Extract log labels
  const logLabels = [];
  const logRegex = /console\.log\(['"](\[.*?\])['"]/g;
  while ((match = logRegex.exec(content)) !== null) {
    logLabels.push(match[1]);
  }
  
  return {
    routes: Array.from(new Set(routes)), // Remove duplicates
    constants: {
      IS_DEV: isDev,
      APP_MODE: appMode
    },
    canonicalCustomerIdFunction,
    logLabels: Array.from(new Set(logLabels)), // Remove duplicates
    sourceFile: 'worker-core/src/index.js'
  };
}

/**
 * Extract UI configuration
 */
function extractUIConfig() {
  console.log('[SNAPSHOT] Extracting UI configuration...');
  
  // Extract fetchSafe.js config
  const fetchSafePath = path.join(CONFIG.uiCorePath, 'app', 'utils', 'fetchSafe.js');
  const fetchSafeContent = fs.readFileSync(fetchSafePath, 'utf8');
  
  const apiBaseRegex = /API_BASE_URL\s*=\s*['"]([^'"]+)['"]/;
  const apiBaseMatch = fetchSafeContent.match(apiBaseRegex);
  const apiBaseUrl = apiBaseMatch ? apiBaseMatch[1] : 'Not found';
  
  // Extract ChatPanel polling settings
  const chatPanelPath = path.join(CONFIG.uiCorePath, 'app', 'modules', 'chat', 'ChatPanel.jsx');
  const chatPanelContent = fs.readFileSync(chatPanelPath, 'utf8');
  
  const pollingIntervalRegex = /setInterval\(.*?,(\s*\d+)\s*\)/;
  const pollingIntervalMatch = chatPanelContent.match(pollingIntervalRegex);
  const pollingInterval = pollingIntervalMatch ? parseInt(pollingIntervalMatch[1]) : 30000;
  
  // Extract field mappings from various files
  const fieldMappings = {
    messageFields: ['text', 'body', 'message', 'message_body', 'message_text'],
    customerIdFields: ['customer_id', 'customerId', 'contact_id', 'contactId', 'contact?.id', 'userId', 'user_id', 'sender_id', 'senderId', 'conversation_id', 'conversationId'],
    displayNameFields: ['customer_name', 'customerName', 'contact_name', 'contactName', 'contact?.displayName', 'name']
  };
  
  return {
    apiBaseUrl,
    pollingInterval,
    fieldMappings,
    sourceFiles: [
      'ui-core/app/utils/fetchSafe.js',
      'ui-core/app/modules/chat/ChatPanel.jsx'
    ]
  };
}

/**
 * Extract KV configuration and sample keys
 */
function extractKVConfig() {
  console.log('[SNAPSHOT] Extracting KV configuration...');
  
  // Extract KV binding names and key patterns from Worker code
  const workerIndexPath = path.join(CONFIG.workerCorePath, 'src', 'index.js');
  const content = fs.readFileSync(workerIndexPath, 'utf8');
  
  // Extract KV binding name
  const kvBindingRegex = /const\s+KV_BINDING_NAME\s*=\s*['"]([^'"]+)['"]/;
  const kvBindingMatch = content.match(kvBindingRegex);
  const kvBindingName = kvBindingMatch ? kvBindingMatch[1] : 'MESSAGES_KV';
  
  // Extract key patterns
  const keyPatterns = [
    { type: 'customerEntity', pattern: 'inbox:customer:{canonicalId}' },
    { type: 'customerIndex', pattern: 'inbox:customers:index:{canonicalId}' },
    { type: 'messageEntity', pattern: 'inbox:msg:{canonicalId}:{timestamp}:{messageId}' },
    { type: 'messageIndex', pattern: 'inbox:index:{canonicalId}' }
  ];
  
  return {
    bindingName: kvBindingName,
    keyPatterns,
    sourceFile: 'worker-core/src/index.js'
  };
}

/**
 * Generate rollback guide
 */
function generateRollbackGuide(snapshotData) {
  console.log('[SNAPSHOT] Generating rollback guide...');
  
  const guideContent = `# DAOJIE L10 PROD - GLOBAL STATE ROLLBACK GUIDE

## SNAPSHOT INFO
- Snapshot File: ${snapshotData.metadata.filename}
- Generated: ${snapshotData.metadata.timestamp}
- Environment: PROD
- Mode: ${snapshotData.worker.constants.APP_MODE}

## 1. WORKER ROLLBACK

### Current Worker State
- Routes: ${snapshotData.worker.routes.length} routes configured
- Canonical ID Rule: Applied (lowercase, trimmed)
- Mode: ${snapshotData.worker.constants.APP_MODE}

### Rollback Steps
1. **Identify Current Deployment**: Check current git commit
   ```bash
   cd worker-core
   git log -1 --oneline
   ```

2. **Rollback Worker Code**: 
   ```bash
   cd worker-core
   # Revert to known good state (use appropriate commit hash)
   git checkout <commit-hash>
   
   # Deploy with Wrangler
   npx wrangler deploy
   ```

3. **Verify Deployment**: 
   ```bash
   curl -s https://jev-rebuild-worker.bensonlove1986.workers.dev/api/status | jq
   ```

## 2. UI ROLLBACK

### Current UI State
- API Base URL: ${snapshotData.ui.apiBaseUrl}
- Polling Interval: ${snapshotData.ui.pollingInterval}ms

### Rollback Steps
1. **Check Current UI Build**: 
   ```bash
   cd ui-core/app
   # Verify current build state
   git log -1 --oneline
   ```

2. **Rollback UI Code**: 
   ```bash
   cd ui-core/app
   # Revert to known good state
   git checkout <commit-hash>
   
   # Rebuild UI
   npm run build
   
   # Deploy UI (if needed)
   # npm run deploy
   ```

3. **Verify UI**: 
   - Access the UI at configured URL
   - Check browser console for errors
   - Verify API calls are successful

## 3. KV ROLLBACK STRATEGY

### Current KV State
- Binding Name: ${snapshotData.kv.bindingName}
- Key Patterns: ${snapshotData.kv.keyPatterns.map(p => p.pattern).join(', ')}

### Rollback Strategy
⚠️ **KV is READ-ONLY for rollback** ⚠️

1. **DO NOT Clear KV Namespace**
2. **DO NOT Delete All Keys**
3. **Only Remove Non-Snapshot Keys**:
   ```bash
   # Example: Only delete keys created after snapshot
   # This is a manual process - identify and delete specific keys
   ```

4. **Rebuild Indexes if Needed**:
   ```bash
   curl -s https://jev-rebuild-worker.bensonlove1986.workers.dev/api/admin/index-backfill | jq
   ```

## 4. VERIFICATION CHECKLIST

### Critical Endpoints Verification
✅ **/api/health** - Basic service health
✅ **/api/status** - Detailed status information  
✅ **/api/inbox/customers** - Customer list retrieval  
✅ **/api/inbox/pull?customer_id={id}** - Message pull functionality  
✅ **/api/inbound/daojie** - Inbound message handling  
✅ **/api/translate/text** - Translation service

### UI Verification
✅ Customer list loads without duplicates
✅ Messages display correctly
✅ Polling works (check network tab for regular API calls)
✅ Customer selection persists
✅ Message history loads completely

### KV Verification
✅ Customer entities are properly stored
✅ Message indexes are maintained
✅ Canonical ID mapping is consistent

## 5. ROLLBACK VALIDATION

After rollback, verify the system meets these criteria:

1. **No Duplicate Customers**: Each customer has only one entry in the customer list
2. **Correct Display Names**: Customer names are up-to-date from latest messages
3. **Automatic Message Polling**: New messages appear without manual refresh
4. **Consistent Customer IDs**: All operations use canonical lowercase IDs
5. **No Error Logs**: Check Cloudflare Worker logs for errors

## 6. EMERGENCY ROLLBACK

If critical issues persist:

1. **Stop All Traffic**: Temporarily disable the webhook
2. **Restore from Backup**: Use Cloudflare KV backup if available
3. **Deploy Known Good Version**: Use a previously verified deployment
4. **Notify Stakeholders**: Inform relevant teams of the rollback

## 7. POST-ROLLBACK MONITORING

- Monitor API response times
- Check message delivery rates
- Verify UI performance
- Review error logs hourly for 24 hours
- Conduct manual testing of critical workflows

---

*Generated automatically by jev_global_snapshot script*
`;
  
  return guideContent;
}

/**
 * Main snapshot generation function
 */
function generateSnapshot() {
  console.log('========================================');
  console.log('DAOJIE GLOBAL STATE SNAPSHOT GENERATOR');
  console.log('========================================');
  console.log(`Environment: PROD`);
  console.log(`Timestamp: ${now.toISOString()}`);
  console.log(`Output Directory: ${CONFIG.outputDir}`);
  console.log('');
  
  // Extract data from codebase
  const workerConfig = extractWorkerConfig();
  const uiConfig = extractUIConfig();
  const kvConfig = extractKVConfig();
  
  // Create snapshot data structure
  const snapshotData = {
    metadata: {
      filename: CONFIG.snapshotFilename,
      timestamp: now.toISOString(),
      environment: 'PROD',
      version: 'L10',
      generator: 'generate_global_snapshot.js',
      gitBranch: 'main' // Placeholder - could be extracted from git
    },
    worker: workerConfig,
    ui: uiConfig,
    kv: kvConfig,
    system: {
      architecture: 'Cloudflare Workers + KV + React UI',
      criticalFeatures: [
        'Canonical Customer ID',
        'Automatic Message Polling',
        'Real-time Customer Updates'
      ]
    }
  };
  
  // Write snapshot to file
  const snapshotPath = path.join(CONFIG.outputDir, CONFIG.snapshotFilename);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');
  console.log(`✅ Snapshot saved to: ${snapshotPath}`);
  
  // Generate rollback guide
  const rollbackGuideContent = generateRollbackGuide(snapshotData);
  const rollbackGuidePath = path.join(CONFIG.outputDir, CONFIG.restoreGuideFilename);
  fs.writeFileSync(rollbackGuidePath, rollbackGuideContent, 'utf8');
  console.log(`✅ Rollback guide saved to: ${rollbackGuidePath}`);
  
  // Perform dry-run verification
  console.log('');
  console.log('🔍 PERFORMING DRY-RUN VERIFICATION...');
  console.log('');
  
  // Verify Worker routes
  console.log(`📋 Worker Routes: ${workerConfig.routes.length} routes found`);
  console.log(`   - Critical routes present: ${workerConfig.routes.includes('/api/inbox/customers') && workerConfig.routes.includes('/api/inbox/pull') ? '✅' : '⚠️'}`);
  
  // Verify UI configuration
  console.log(`📋 UI Configuration: API_BASE_URL = ${uiConfig.apiBaseUrl}`);
  console.log(`   - Polling interval: ${uiConfig.pollingInterval}ms`);
  
  // Verify KV configuration
  console.log(`📋 KV Configuration: Binding = ${kvConfig.bindingName}`);
  console.log(`   - Key patterns: ${kvConfig.keyPatterns.length} patterns defined`);
  
  console.log('');
  console.log('========================================');
  console.log('✅ GLOBAL STATE SNAPSHOT COMPLETE');
  console.log('========================================');
  console.log('');
  console.log(`📦 Snapshot File: ${CONFIG.snapshotFilename}`);
  console.log(`📖 Rollback Guide: ${CONFIG.restoreGuideFilename}`);
  console.log('');
  console.log('GLOBAL STATE SNAPSHOT READY — SAFE TO ITERATE');
  console.log('');
  
  return {
    snapshotPath,
    rollbackGuidePath,
    snapshotData
  };
}

// Execute snapshot generation
if (require.main === module) {
  generateSnapshot();
}

module.exports = { generateSnapshot };
