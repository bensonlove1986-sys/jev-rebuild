#!/usr/bin/env node

/**
 * Deploy Cloudflare Worker using Node.js fetch API
 * This script reads bundle.js and deploys it to Cloudflare API
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';

const CONFIG = {
  accountId: '156ce03fffc59592e2b3b04dbc22aa6c',
  workerName: 'jev-rebuild-worker',
  apiToken: '3wRqWDpO-dHNBXnVTbM0TQAWwbbmM1bACDX-NC5K',
  bundlePath: './bundle.js'
};

async function deployWorker() {
  console.log('🚀 Deploying Cloudflare Worker...');
  console.log(`📦 Account ID: ${CONFIG.accountId}`);
  console.log(`👷 Worker: ${CONFIG.workerName}`);
  console.log(`🔐 API Token: ${CONFIG.apiToken.substring(0, 8)}...`);
  
  try {
    // Read bundle.js content
    const bundleContent = readFileSync(CONFIG.bundlePath, 'utf8');
    console.log(`📄 Bundle size: ${bundleContent.length} bytes`);
    
    // Prepare API request
    const url = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/workers/scripts/${CONFIG.workerName}`;
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CONFIG.apiToken}`,
        'Content-Type': 'application/javascript'
      },
      body: bundleContent
    };
    
    console.log('📤 Sending deployment request...');
    console.log(`🌐 API URL: ${url}`);
    
    // Send request
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📦 Response: ${JSON.stringify(result, null, 2)}`);
    
    if (response.ok && result.success) {
      console.log('✅ Deployment successful!');
      console.log('📋 Worker URL:', result.result.url);
    } else {
      console.error('❌ Deployment failed');
      console.error('Error details:', result.errors || result.error);
    }
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run deployment
deployWorker();
