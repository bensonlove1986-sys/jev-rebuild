#!/usr/bin/env node

/**
 * Direct deployment script using Cloudflare API
 * Bypasses wrangler and uses Node.js built-in modules
 * Uses ES module syntax
 */

import https from 'https';
import fs from 'fs';

// Configuration
const CONFIG = {
  accountId: '156ce03fffc59592e2b3b04dbc22aa6c',
  workerName: 'jev-rebuild-worker',
  scriptPath: './index.js',
  // API token from environment variable
  apiToken: '3wRqWDpO-dHNBXnVTbM0TQAWwbbmM1bACDX-NC5K'
};

function deploy() {
  console.log('🚀 Deploying worker directly via Cloudflare API...');
  
  try {
    // Read script content
    const script = fs.readFileSync(CONFIG.scriptPath, 'utf8');
    console.log(`📄 Script size: ${script.length} bytes`);
    
    // API request options
    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4/accounts/${CONFIG.accountId}/workers/scripts/${CONFIG.workerName}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/javascript',
        'Authorization': `Bearer ${CONFIG.apiToken}`,
        'Content-Length': Buffer.byteLength(script)
      }
    };
    
    // Send request
    const req = https.request(options, (res) => {
      console.log(`📡 Status code: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            console.log('✅ Deployment successful!');
            console.log('🌐 Worker URL:', result.result.url);
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
      console.error('❌ Network error:', e.message);
      console.log('🔍 Check your network connection or API token');
    });
    
    // Send script
    req.write(script);
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deploy();
