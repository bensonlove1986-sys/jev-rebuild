#!/usr/bin/env node

/**
 * Simple Deployment Script for Minimal Worker
 */

import { readFileSync } from 'fs';
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
  console.error('Usage: node deploy-simple.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

const workerName = 'jev-rebuild-worker';
console.log(`🚀 Deploying simple worker: ${workerName}`);

// Read the simple worker script
const workerScript = readFileSync('./simple-worker.js', 'utf8');

// Prepare the API request
const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;

// Cloudflare Workers Modules format requires metadata and script
const workerData = {
  metadata: {
    main_module: 'simple-worker.js'
  },
  script: workerScript
};

// Send the request
console.log('📤 Sending deployment request...');

fetch(apiUrl, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(workerData)
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
