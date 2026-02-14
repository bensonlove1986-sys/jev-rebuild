#!/usr/bin/env node

/**
 * Bundle and Deploy Cloudflare Worker Script
 * Uses esbuild to bundle the worker and then deploys via API
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';

// Force IPv4 connection to avoid IPv6 issues
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

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
  console.error('Usage: node bundle-and-deploy.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Bundle and Deploy Cloudflare Worker...');
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
  execSync('npx esbuild index.js --bundle --format=cjs --outfile=bundle.js', {
    stdio: 'inherit'
  });
  console.log('✅ Bundling successful!');
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Read the bundled code
const bundledCode = readFileSync('./bundle.js', 'utf8');
console.log(`📄 Bundled script size: ${bundledCode.length} bytes`);

// Prepare the API request for Cloudflare Workers
const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
const headers = {
  'Authorization': `Bearer ${apiToken}`,
  'Content-Type': 'application/javascript',
  'User-Agent': 'JEV-Rebuild-Deployer/1.0'
};

// Deploy the worker with retry mechanism
console.log('📤 Deploying to Cloudflare API...');

// Function to deploy with retries
async function deployWithRetry(attempt = 1, maxAttempts = 8, delay = 3000) {
  try {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts}...`);
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Connection': 'close' // Force HTTP/1.1 to avoid HTTP/2 connection issues
      },
      body: bundledCode,
      timeout: 60000 // 60 second timeout
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Deployment successful!');
      console.log(`🌐 Worker URL: https://${workerName}.workers.dev`);
      // Clean up the bundled file
      execSync('rm bundle.js');
      console.log('🧹 Cleaned up bundled file');
      return true;
    } else {
      console.error('❌ Deployment failed:', data.errors);
      return false;
    }
  } catch (error) {
    console.error(`❌ Attempt ${attempt} failed:`, error.message);
    
    if (attempt < maxAttempts) {
      const nextDelay = delay * 1.5; // Exponential backoff
      console.log(`⏳ Retrying in ${Math.round(nextDelay / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      return deployWithRetry(attempt + 1, maxAttempts, nextDelay);
    } else {
      console.error('❌ All deployment attempts failed');
      return false;
    }
  }
}

// Run the deployment with retries
try {
  deployWithRetry().then(success => {
    if (!success) {
      process.exit(1);
    }
  });
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}
