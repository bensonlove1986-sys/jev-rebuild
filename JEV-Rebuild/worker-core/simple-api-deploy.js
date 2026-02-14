#!/usr/bin/env node

/**
 * Simple Cloudflare Worker API Deployment Script
 * Uses Cloudflare API directly to deploy worker script
 */

import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';

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
  console.error('Usage: node simple-api-deploy.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Deploying Cloudflare Worker via API...');
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

// Deploy the worker
console.log('📤 Deploying to Cloudflare API...');

try {
  fetch(apiUrl, {
    method: 'PUT',
    headers: headers,
    body: workerScript
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Deployment successful!');
      console.log(`🌐 Worker URL: https://${workerName}.workers.dev`);
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
