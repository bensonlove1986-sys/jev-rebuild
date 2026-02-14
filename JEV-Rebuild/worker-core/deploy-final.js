#!/usr/bin/env node

/**
 * Final deployment script for Cloudflare Worker
 * Uses Node.js fetch API with proper error handling
 */

import { readFileSync } from 'fs';

// Configuration
const CONFIG = {
  accountId: '156ce03fffc59592e2b3b04dbc22aa6c',
  workerName: 'jev-rebuild-worker',
  apiToken: 'kCJ4yXElwA8x9aytKldiRGPZ1qJcEPzZ82qvEuFr',
  bundlePath: './bundle.js'
};

async function deployWorker() {
  console.log('🚀 Deploying Cloudflare Worker to production...');
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
        'Content-Type': 'application/javascript',
        'User-Agent': 'Node.js Deployment Script'
      },
      body: bundleContent,
      timeout: 60000 // 60 seconds timeout
    };
    
    console.log('📤 Sending deployment request...');
    console.log(`🌐 API URL: ${url}`);
    
    // Use native fetch
    const response = await fetch(url, options);
    
    console.log(`📡 Response status: ${response.status}`);
    
    const result = await response.json();
    console.log(`📦 Response: ${JSON.stringify(result, null, 2)}`);
    
    if (response.ok && result.success) {
      console.log('✅ Deployment successful!');
      console.log('📋 Worker URL:', result.result.url);
      console.log('🎉 Application is now live!');
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
