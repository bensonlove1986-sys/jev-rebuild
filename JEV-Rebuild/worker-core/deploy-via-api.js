#!/usr/bin/env node

/**
 * Deploy Cloudflare Worker via API
 * This script bypasses wrangler and uses the Cloudflare API directly
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';

// Configuration
const ACCOUNT_ID = 'YOUR_ACCOUNT_ID'; // Replace with your Cloudflare account ID
const API_TOKEN = 'YOUR_API_TOKEN'; // Replace with your Cloudflare API token
const WORKER_NAME = 'jev-rebuild-worker';
const SCRIPT_PATH = './index.js';

async function deployWorker() {
  console.log('🚀 Deploying Cloudflare Worker via API...');
  
  try {
    // Read the worker script
    const scriptContent = readFileSync(SCRIPT_PATH, 'utf8');
    console.log(`📦 Read ${scriptContent.length} bytes from ${SCRIPT_PATH}`);
    
    // Create the deployment request
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/javascript',
          'Authorization': `Bearer ${API_TOKEN}`,
          'User-Agent': 'Cloudflare-Worker-Deploy'
        },
        body: scriptContent
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Deployment successful!');
      console.log('📋 Deployment details:', result.result);
    } else {
      console.error('❌ Deployment failed:', result.errors);
    }
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
  }
}

deployWorker();
