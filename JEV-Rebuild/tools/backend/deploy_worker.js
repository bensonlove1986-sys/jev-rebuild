#!/usr/bin/env node
// Worker 部署脚本（不自动执行）

console.log('=== Worker Deployment Script ===');
console.log('This script provides commands and instructions for deploying the Cloudflare Worker.');
console.log('It will not execute automatically. Please run the commands manually.');

// 部署配置
const DEPLOY_CONFIG = {
  WORKER_NAME: 'jev-worker-core',
  ACCOUNT_ID: 'YOUR_CLOUDFLARE_ACCOUNT_ID',
  ZONE_ID: 'YOUR_CLOUDFLARE_ZONE_ID',
  KV_CONNECTIONS_NAMESPACE: 'YOUR_CONNECTIONS_KV_NAMESPACE_ID',
  KV_MESSAGES_NAMESPACE: 'YOUR_MESSAGES_KV_NAMESPACE_ID',
};

// 显示部署说明
function showDeploymentInstructions() {
  console.log('\n1. Prerequisites:');
  console.log('   - Cloudflare Wrangler CLI installed: npm install -g wrangler');
  console.log('   - Cloudflare account with Workers enabled');
  console.log('   - KV namespaces created for connections and messages');
  
  console.log('\n2. Configuration Steps:');
  console.log('   - Update wrangler.toml with your Cloudflare account details');
  console.log('   - Set KV namespace IDs in wrangler.toml');
  console.log('   - Configure routes and zones in wrangler.toml');
  
  console.log('\n3. Deployment Commands:');
  console.log('   - Development mode: wrangler dev');
  console.log('   - Deploy to production: wrangler deploy');
  console.log('   - Preview deployment: wrangler preview');
  
  console.log('\n4. Environment Variables:');
  console.log('   - ACCOUNT_ID: Your Cloudflare account ID');
  console.log('   - ZONE_ID: Your Cloudflare zone ID');
  console.log('   - CONNECTIONS_KV_NAMESPACE: KV namespace ID for connections');
  console.log('   - MESSAGES_KV_NAMESPACE: KV namespace ID for messages');
}

// 显示配置示例
function showConfigExamples() {
  console.log('\n5. Configuration Examples:');
  
  console.log('\nwrangler.toml example:');
  console.log(`name = "${DEPLOY_CONFIG.WORKER_NAME}"`);
  console.log('type = "module"');
  console.log('');
  console.log('[[kv_namespaces]]');
  console.log(`binding = "CONNECTIONS"`);
  console.log(`id = "${DEPLOY_CONFIG.KV_CONNECTIONS_NAMESPACE}"`);
  console.log(`preview_id = "${DEPLOY_CONFIG.KV_CONNECTIONS_NAMESPACE}"`);
  console.log('');
  console.log('[[kv_namespaces]]');
  console.log(`binding = "MESSAGES"`);
  console.log(`id = "${DEPLOY_CONFIG.KV_MESSAGES_NAMESPACE}"`);
  console.log(`preview_id = "${DEPLOY_CONFIG.KV_MESSAGES_NAMESPACE}"`);
  console.log('');
  console.log(`account_id = "${DEPLOY_CONFIG.ACCOUNT_ID}"`);
  console.log(`zone_id = "${DEPLOY_CONFIG.ZONE_ID}"`);
  console.log('route = "example.com/api/*"');
  console.log('compatibility_date = "2025-12-14"');
  console.log('compatibility_flags = ["nodejs_compat"]');
}

// 显示部署命令
function showDeploymentCommands() {
  console.log('\n6. Deployment Commands:');
  console.log('');
  console.log('   # Login to Cloudflare');
  console.log('   wrangler login');
  console.log('');
  console.log('   # Development mode (local testing)');
  console.log('   wrangler dev');
  console.log('');
  console.log('   # Deploy to production');
  console.log('   wrangler deploy');
  console.log('');
  console.log('   # Preview deployment');
  console.log('   wrangler preview');
  console.log('');
  console.log('   # Deploy with custom environment variables');
  console.log('   wrangler deploy --env production');
}

// 显示健康检查命令
function showHealthCheckCommands() {
  console.log('\n7. Health Check Commands:');
  console.log('');
  console.log('   # Check worker status');
  console.log('   curl -X GET https://your-domain.com/api/ping');
  console.log('');
  console.log('   # Check WebSocket connection');
  console.log('   wscat -c wss://your-domain.com/api/ws');
  console.log('');
  console.log('   # Get worker status');
  console.log('   curl -X GET https://your-domain.com/api/status');
}

// 主函数
function main() {
  showDeploymentInstructions();
  showConfigExamples();
  showDeploymentCommands();
  showHealthCheckCommands();
  
  console.log('\n=== Deployment Notes ===');
  console.log('- Always test in development mode before deploying to production');
  console.log('- Monitor Worker logs in Cloudflare Dashboard for errors');
  console.log('- Set up alerts for Worker failures');
  console.log('- Regularly update the compatibility_date in wrangler.toml');
  console.log('\nDeployment script completed. No actions were executed.');
}

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { showDeploymentInstructions, showConfigExamples, showDeploymentCommands, showHealthCheckCommands };