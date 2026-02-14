#!/usr/bin/env node

/**
 * Direct Cloudflare Worker Deployment Script
 * Uses Cloudflare API directly to deploy the worker
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';

// Set fetch as global for compatibility
global.fetch = fetch;

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
  console.error('Usage: node direct-deploy.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Deploying Cloudflare Worker directly via API...');
console.log(`📦 Account ID: ${accountId}`);
console.log(`🔐 API Token: ${apiToken.substring(0, 8)}...`);

// Read wrangler.toml to get worker name
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
  // Use esbuild to bundle the worker
  execSync('npx esbuild index.js --bundle --format=esm --outfile=bundle.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Read the bundled code
const bundledCode = readFileSync('./bundle.js', 'utf8');

// Deploy to Cloudflare API
console.log('📤 Deploying to Cloudflare API...');

const deployWorker = async () => {
  try {
    // Use Cloudflare Module Worker format (new format)
    const workerPayload = {
      name: workerName,
      compatibility_date: "2025-01-01",
      modules: [
        {
          name: "index.js",
          type: "ESModule",
          script: bundledCode
        }
      ],
      bindings: []
    };
    
    // Always use PUT to update the worker
    // For Cloudflare Workers, use application/javascript Content-Type for single script deployment
    const deployResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/javascript'
      },
      // For single script deployment, just send the script content directly
      body: bundledCode
    });
    
    console.log(`📡 API Response Status: ${deployResponse.status} ${deployResponse.statusText}`);
    const responseText = await deployResponse.text();
    console.log(`📋 API Response Body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    
    const deployData = JSON.parse(responseText);
    if (deployData.success) {
      console.log('✅ Deployment successful!');
      console.log(`🌐 Worker URL: ${workerName}.workers.dev`);
    } else {
      console.error('❌ Deployment failed:', deployData.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ API Deployment failed:', error.message);
    console.error('🔍 Error details:', error.stack);
    process.exit(1);
  }
};

deployWorker();
