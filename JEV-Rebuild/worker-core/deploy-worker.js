#!/usr/bin/env node

/**
 * Simple Cloudflare Worker Deployment Script
 * Uses Cloudflare API directly to deploy the worker
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
  console.error('Usage: node deploy-worker.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Deploying Cloudflare Worker using API...');
console.log(`📦 Account ID: ${accountId}`);
console.log(`🔐 API Token: ${apiToken.substring(0, 8)}...`);

// Read worker code
const workerCode = readFileSync('index.js', 'utf8');
console.log('📄 Read worker code:', workerCode.length, 'characters');

// Deploy to Cloudflare API
async function deployWorker() {
  try {
    // First, get the worker details
    const workerName = 'jev-rebuild-worker';
    
    // Build the deployment request
    const deploymentData = {
      script: workerCode,
      bindings: [
        // Add your bindings here if needed
      ]
    };
    
    console.log('📤 Deploying worker...');
    
    // Deploy the worker
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentData)
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Deployment successful!');
      console.log('📡 Worker URL:', `https://${workerName}.${accountId}.workers.dev`);
    } else {
      console.error('❌ Deployment failed:', result.errors);
    }
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
  }
}

deployWorker();
