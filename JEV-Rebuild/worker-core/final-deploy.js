#!/usr/bin/env node

/**
 * Final Cloudflare Worker Deployment Script
 * Uses multipart/form-data for Modules format deployment
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Get command line arguments
const args = process.argv.slice(2);

// Parse arguments
let accountId = '';
let apiToken = '';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--account-id' || args[i] === '-a') && args[i + 1]) {
    accountId = args[i + 1];
  }
  if ((args[i] === '--api-token' || args[i] === '-t') && args[i + 1]) {
    apiToken = args[i + 1];
  }
}

if (!accountId || !apiToken) {
  console.error('❌ Missing required arguments');
  console.error('Usage: node final-deploy.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Final Cloudflare Worker Deployment...');
console.log(`📦 Account ID: ${accountId}`);
console.log(`🔐 API Token: ${apiToken.substring(0, 8)}...`);

// Read worker name from wrangler.toml
const wranglerToml = readFileSync('./wrangler.toml', 'utf8');
const nameMatch = wranglerToml.match(/name\s*=\s*"([^"]+)"/);
if (!nameMatch) {
  console.error('❌ Could not find worker name in wrangler.toml');
  process.exit(1);
}
const workerName = nameMatch[1];
console.log(`👷 Worker Name: ${workerName}`);

// Bundle the worker code
console.log('📦 Bundling worker code...');
try {
  // Use esbuild to bundle the worker into a single file
  execSync('npx esbuild index.js --bundle --format=esm --outfile=bundle.mjs', {
    stdio: 'inherit'
  });
  console.log('✅ Bundling successful!');
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Read the bundled code
const bundledCode = readFileSync('./bundle.mjs', 'utf8');
console.log(`📄 Bundled script size: ${bundledCode.length} bytes`);

// Prepare the API request
const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;

// Create multipart/form-data
const form = new FormData();

// Add metadata
const metadata = JSON.stringify({
  main_module: 'bundle.mjs'
});
form.append('metadata', metadata, { contentType: 'application/json' });

// Add the bundled script
form.append('script', bundledCode, { filename: 'bundle.mjs', contentType: 'application/javascript' });

// Deploy the worker
console.log('📤 Deploying to Cloudflare API...');

try {
  fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      ...form.getHeaders()
    },
    body: form
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Deployment successful!');
      console.log(`🌐 Worker URL: https://${workerName}.workers.dev`);
      // Clean up the bundled file
      execSync('rm bundle.mjs');
      console.log('🧹 Cleaned up bundled file');
    } else {
      console.error('❌ Deployment failed:', data.errors);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ API request failed:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}
