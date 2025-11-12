// 部署准备检查脚本
console.log('=== JEV State Layer 部署准备检查 ===');

// 检查导出配置
const fs = require('fs');
const path = require('path');

try {
  // 检查worker_final.js文件存在
  const workerPath = path.join(__dirname, 'worker_final.js');
  if (!fs.existsSync(workerPath)) {
    console.error('❌ worker_final.js 文件不存在');
    process.exit(1);
  }
  console.log('✅ worker_final.js 文件存在');

  // 读取文件内容
  const content = fs.readFileSync(workerPath, 'utf8');
  
  // 检查StateManager类定义
  if (content.includes('class StateManager {')) {
    console.log('✅ StateManager类已定义');
  } else {
    console.error('❌ StateManager类未定义');
    process.exit(1);
  }

  // 检查StateManager导出
  if (content.includes('export { Counter, SessionStore, StateManager };')) {
    console.log('✅ StateManager已正确导出');
  } else {
    console.error('❌ StateManager导出配置错误');
    process.exit(1);
  }

  // 检查wrangler.toml配置
  const wranglerPath = path.join(__dirname, 'wrangler.toml');
  if (!fs.existsSync(wranglerPath)) {
    console.error('❌ wrangler.toml 文件不存在');
    process.exit(1);
  }
  console.log('✅ wrangler.toml 文件存在');

  const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
  
  // 检查Durable Object绑定
  if (wranglerContent.includes('name = "JEV_STATE"') && 
      wranglerContent.includes('class_name = "StateManager"')) {
    console.log('✅ Durable Object绑定配置正确');
  } else {
    console.error('❌ Durable Object绑定配置错误');
    process.exit(1);
  }

  // 检查migrations配置
  if (wranglerContent.includes('[[migrations]]') && 
      wranglerContent.includes('tag = "v1"') && 
      wranglerContent.includes('new_classes = [ "StateManager" ]')) {
    console.log('✅ Migrations配置正确');
  } else {
    console.error('❌ Migrations配置错误');
    process.exit(1);
  }

  console.log('\n=== 部署准备检查通过！所有配置看起来正确 ===');
  console.log('\n接下来的部署步骤：');
  console.log('1. 确保Cloudflare账户已登录 (wrangler login)');
  console.log('2. 执行部署命令: wrangler deploy');
  console.log('3. 部署成功后使用curl测试:');
  console.log('   - curl -X POST "https://jevshop.bensonlove1986.workers.dev/set" -d "{\"key\":\"test\",\"value\":\"ok\"}"');
  console.log('   - curl "https://jevshop.bensonlove1986.workers.dev/get?key=test"');
  console.log('   - curl "https://jevshop.bensonlove1986.workers.dev/list"');
  
} catch (error) {
  console.error('❌ 检查过程中发生错误:', error.message);
  process.exit(1);
}