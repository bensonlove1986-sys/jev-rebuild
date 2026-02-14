#!/usr/bin/env node

/**
 * Deploy script with retry mechanism and increased timeout
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';

// Command line arguments
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
  console.error('Usage: node deploy-with-retry.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Deploying Cloudflare Worker with retry mechanism...');
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

// Read the main worker script
const workerScript = readFileSync('./index.js', 'utf8');
console.log(`📄 Worker script size: ${workerScript.length} bytes`);

// Prepare the API request
const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
const headers = {
  'Authorization': `Bearer ${apiToken}`,
  'Content-Type': 'application/javascript',
  'User-Agent': 'JEV-Rebuild-Deployer/1.0'
};

// Retry configuration
const maxRetries = 5;
const retryDelay = 3000; // 3 seconds
const timeout = 60000; // 60 seconds

// Deploy function with retry
async function deployWithRetry(attempt) {
  console.log(`\n📤 Attempt ${attempt}/${maxRetries} - Deploying to Cloudflare API...`);
  console.log(`🔗 API URL: ${apiUrl}`);
  console.log(`⏱️  Timeout: ${timeout}ms`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: headers,
      body: workerScript,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Deployment successful!');
      console.log(`🌐 Worker URL: https://${workerName}.workers.dev`);
      return true;
    } else {
      console.error('❌ Deployment failed:', data.errors);
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return deployWithRetry(attempt + 1);
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Attempt ${attempt} failed:`, error.message);
    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return deployWithRetry(attempt + 1);
    }
    return false;
  }
}

// Run deployment
deployWithRetry(1).then(success => {
  if (success) {
    console.log('\n🎉 Deployment completed successfully!');
    process.exit(0);
  } else {
    console.error('\n❌ Deployment failed after all retries');
    process.exit(1);
  }
});
