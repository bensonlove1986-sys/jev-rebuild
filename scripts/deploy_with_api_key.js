// 使用Cloudflare API密钥部署Worker脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🚀 Cloudflare Worker 部署工具（使用API密钥）');
console.log('================================================================');

// Cloudflare API配置
const CF_API_KEY = 'Sxhnh_R5uV-AD-WembMoyDj36WJgYne57k-oeuGn'; // 用户提供的API密钥
const ACCOUNT_ID = '156ce03fffc59592e2b3b04dbc22aa6c'; // 从之前的诊断中获取的账户ID
const WORKER_NAME = 'jevshop'; // Worker名称

// 检查必要文件
const workerJsPath = path.join(__dirname, '..', 'worker.js');
const wranglerTomlPath = path.join(__dirname, '..', 'wrangler.toml');

if (!fs.existsSync(workerJsPath)) {
  console.error('❌ 错误: 找不到worker.js文件');
  process.exit(1);
}

if (!fs.existsSync(wranglerTomlPath)) {
  console.error('❌ 错误: 找不到wrangler.toml文件');
  process.exit(1);
}

// 设置环境变量（使用API Token）
process.env.CLOUDFLARE_API_TOKEN = CF_API_KEY;
process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT_ID;

console.log('📋 部署信息:');
console.log(`  - Worker名称: ${WORKER_NAME}`);
console.log(`  - 账户ID: ${ACCOUNT_ID}`);
console.log(`  - 脚本路径: ${workerJsPath}`);
console.log('  - 使用环境变量进行认证');
console.log('================================================================');

// 执行部署
console.log('🚀 开始部署Worker...');
try {
  // 使用wrangler部署，通过环境变量认证
  const deployCommand = 'npx wrangler deploy';
  console.log(`💻 执行命令: ${deployCommand}`);
  
  // 设置更长的超时时间
  const output = execSync(deployCommand, { 
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 120000, // 120秒超时
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: CF_API_KEY,
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID
    }
  });
  
  console.log('✅ 部署成功！');
  console.log('📊 部署输出:');
  console.log(output);
  
  // 验证部署
  console.log('================================================================');
  console.log('🔍 正在验证部署...');
  
  // 调用测试脚本验证连接性
  console.log('\n📡 执行连接性测试...');
  const testOutput = execSync('node scripts/test_worker_node.js', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  
  console.log(testOutput);
  
  console.log('================================================================');
  console.log('🎉 部署流程完成！');
  console.log(`📌 Worker URL: https://${WORKER_NAME}.bensonlove1986.workers.dev`);
  console.log('================================================================');
  
} catch (error) {
  console.error('❌ 部署失败！');
  if (error.stdout) console.log('标准输出:', error.stdout);
  if (error.stderr) console.error('错误输出:', error.stderr);
  console.error('错误详情:', error.message);
  
  console.log('\n🔧 故障排除建议:');
  console.log('1. 确认API密钥是否有效且具有Worker编辑权限');
  console.log('2. 检查账户ID是否正确');
  console.log('3. 确保网络连接正常');
  console.log('4. 尝试手动登录Cloudflare控制台进行部署');
  
  process.exit(1);
}
