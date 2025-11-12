// 🎯 Cloudflare Worker连接问题 - 最终解决方案
// 这个脚本使用curl命令行工具来连接Cloudflare Worker，绕过Node.js的网络问题

const { exec } = require('child_process');

console.log('\n🚀 Cloudflare Worker连接 - 工作解决方案');
console.log('='.repeat(60));
console.log('使用curl命令行工具连接Worker (已在本环境验证可行)');
console.log('='.repeat(60));

// 配置
const CONFIG = {
  workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
  webhookSecret: 'jevindustry2025'
};

/**
 * 使用curl命令调用Cloudflare Worker
 * @param {string} endpoint - API端点路径，例如 '/ping'
 * @param {object|null} data - 请求体数据（如果是POST请求）
 * @returns {Promise<any>} - 返回响应数据
 */
function callWorker(endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.workerUrl}${endpoint}`;
    const auth = CONFIG.webhookSecret;
    
    // 构建curl命令
    let curlCmd = `curl -s -H "Authorization: Bearer ${auth}"`;
    
    // 如果有数据，添加Content-Type和数据
    if (data && typeof data === 'object') {
      curlCmd += ` -H "Content-Type: application/json" -d "${JSON.stringify(data)}"`;
    }
    
    // 添加URL
    curlCmd += ` "${url}"`;
    
    console.log(`\n🔄 执行请求: ${endpoint}`);
    console.log(`   curl命令: ${curlCmd}`);
    
    // 执行curl命令
    exec(curlCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 请求失败: ${error.message}`);
        return reject(new Error(`curl执行失败: ${error.message}`));
      }
      
      if (stderr && stderr.trim()) {
        console.warn(`⚠️ curl警告: ${stderr}`);
      }
      
      console.log(`✅ 请求成功，响应长度: ${stdout.length} 字符`);
      
      // 尝试解析JSON
      try {
        const result = JSON.parse(stdout);
        console.log('📊 响应类型: JSON对象');
        resolve(result);
      } catch (e) {
        console.log('📝 响应类型: 文本');
        resolve(stdout); // 返回原始文本
      }
    });
  });
}

/**
 * 测试所有Worker端点
 */
async function testAllEndpoints() {
  console.log('\n🔍 开始测试Worker端点...');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Ping端点', endpoint: '/ping' },
    { name: 'Test Vision端点', endpoint: '/test-vision?mode=ping' },
    { name: 'Analyze Image端点', endpoint: '/analyze-image', data: { test: true } }
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n📡 测试 ${test.name} (${test.endpoint})`);
      const result = await callWorker(test.endpoint, test.data || null);
      successCount++;
      
      // 显示结果摘要
      if (typeof result === 'object') {
        console.log('✅ 成功响应:', JSON.stringify(result, null, 2));
      } else {
        console.log('✅ 成功响应:', result.substring(0, 100) + (result.length > 100 ? '...' : ''));
      }
    } catch (error) {
      console.error(`❌ ${test.name} 测试失败:`, error.message);
    }
  }
  
  console.log('\n='.repeat(60));
  console.log(`📊 测试结果: ${successCount}/${tests.length} 端点连接成功`);
  console.log('='.repeat(60));
  
  return successCount;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 运行所有测试
    await testAllEndpoints();
    
    console.log('\n💡 使用方法:');
    console.log('1. 将此脚本中的CONFIG对象修改为你的Worker配置');
    console.log('2. 在你的代码中导入并使用callWorker函数:');
    console.log('   const { callWorker } = require(\'./scripts/working_solution.js\');');
    console.log('3. 然后像使用fetch一样使用它:');
    console.log('   const result = await callWorker(\'/your-endpoint\', { data: \'value\' });');
    
  } catch (error) {
    console.error('\n❌ 主程序发生错误:', error);
  }
}

// 运行主程序
main();
