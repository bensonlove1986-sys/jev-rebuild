#!/usr/bin/env node

/**
 * Simple Wrangler Deployment Script
 * Uses wrangler CLI with no proxy
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

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
  console.error('Usage: node deploy-simple-wrangler.js --account-id <account-id> --api-token <api-token>');
  process.exit(1);
}

console.log('🚀 Deploying Cloudflare Worker with wrangler...');
console.log(`📦 Account ID: ${accountId}`);
console.log(`🔐 API Token: ${apiToken.substring(0, 8)}...`);

// Set environment variables with no proxy
process.env.CLOUDFLARE_API_TOKEN = apiToken;
process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
process.env.HTTP_PROXY = '';
process.env.HTTPS_PROXY = '';
process.env.http_proxy = '';
process.env.https_proxy = '';

// Run wrangler deploy with no proxy environment variables
console.log('📤 Running wrangler deploy...');
try {
  const output = execSync('npx wrangler deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      http_proxy: '',
      https_proxy: '',
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId
    }
  });
  console.log('✅ Deployment successful!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
