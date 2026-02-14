#!/usr/bin/env node

/**
 * Simple Cloudflare Worker Deployment Script
 * Uses Node.js built-in https module
 */

import https from 'https';
import fs from 'fs/promises';

// Configuration
const CONFIG = {
  accountId: '156ce03fffc59592e2b3b04dbc22aa6c', // From the log
  workerName: 'jev-rebuild-worker',
  scriptPath: './index.js',
  apiToken: 'YOUR_API_TOKEN' // Replace with your Cloudflare API token
};

async function deployWorker() {
  console.log('🚀 Deploying Cloudflare Worker...');
  console.log(`📦 Account ID: ${CONFIG.accountId}`);
  console.log(`👷 Worker: ${CONFIG.workerName}`);
  
  try {
    // Read the script content
    const scriptContent = await fs.readFile(CONFIG.scriptPath, 'utf8');
    console.log(`📄 Script size: ${scriptContent.length} bytes`);
    
    // Prepare API request
    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4/accounts/${CONFIG.accountId}/workers/scripts/${CONFIG.workerName}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/javascript',
        'Authorization': `Bearer ${CONFIG.apiToken}`,
        'Content-Length': Buffer.byteLength(scriptContent)
      }
    };
    
    // Send request
    const req = https.request(options, (res) => {
      console.log(`📡 Response status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            console.log('✅ Deployment successful!');
            console.log('📋 Worker URL:', result.result.url);
          } else {
            console.error('❌ Deployment failed:', result.errors);
          }
        } catch (e) {
          console.error('❌ Failed to parse response:', e.message);
          console.log('📄 Raw response:', data);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
    });
    
    // Write data to request body
    req.write(scriptContent);
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run deployment
(async () => {
  await deployWorker();
})();
