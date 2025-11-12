// PowerShell解决方案 - 绕过Node.js网络限制
const { exec } = require('child_process');

// 配置
const CONFIG = {
  webhookUrl: 'https://jevshop.bensonlove1986.workers.dev',
  webhookSecret: 'jevindustry2025'
};

/**
 * 使用PowerShell的Invoke-WebRequest调用Cloudflare Worker
 * @param {string} endpoint - API端点路径
 * @param {object|null} data - 请求数据（POST时）
 * @returns {Promise<object>} 响应结果
 */
function callWorker(endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.webhookUrl}${endpoint}`;
    const auth = CONFIG.webhookSecret;
    
    // 使用更简单的PowerShell命令构建方式，避免复杂的引号转义
    // 将完整命令写入临时文件，然后执行该文件
    const fs = require('fs');
    const path = require('path');
    
    // 创建临时脚本路径
    const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
    const tempScriptPath = path.join(tempDir, `worker_request_${Date.now()}.ps1`);
    
    // 构建PowerShell脚本内容
    let psScript = '';
    psScript += `$url = '${url}'\n`;
    psScript += `$headers = @{\n`;
    psScript += `  'Authorization' = 'Bearer ${auth}'\n`;
    psScript += `  'Content-Type' = 'application/json'\n`;
    psScript += `}\n`;
    
    if (data) {
      // POST请求
      const jsonData = JSON.stringify(data);
      psScript += `$body = @'\n`;
      psScript += jsonData + `\n`;
      psScript += `'@\n`;
      psScript += `$response = Invoke-WebRequest -Uri $url -Headers $headers -Method POST -Body $body -UseBasicParsing\n`;
    } else {
      // GET请求
      psScript += `$response = Invoke-WebRequest -Uri $url -Headers $headers -Method GET -UseBasicParsing\n`;
    }
    
    // 输出响应内容
    psScript += `$response.Content`;
    
    // 写入临时文件
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8');
      console.log(`📝 已写入临时PowerShell脚本: ${tempScriptPath}`);
    } catch (writeError) {
      console.error(`❌ 写入临时文件失败:`, writeError);
      reject(writeError);
      return;
    }
    
    // 构建执行命令
    const command = `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`;
    
    console.log(`\n🔄 执行请求: ${endpoint}`);
    console.log(`   PowerShell命令: ${command}`);
    
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 无论成功失败都尝试删除临时文件
        try {
          fs.unlinkSync(tempScriptPath);
          console.log(`🧹 已清理临时文件: ${tempScriptPath}`);
        } catch (cleanupError) {
          console.warn(`⚠️  清理临时文件失败:`, cleanupError.message);
        }
      if (error) {
        console.error(`❌ 错误: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`⚠️  警告: ${stderr}`);
      }
      
      try {
        // 尝试解析JSON响应
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseError) {
        // 如果不是JSON，直接返回原始内容
        resolve({ raw: stdout.trim() });
      }
    });
  });
}

/**
 * 测试所有端点
 */
async function testAllEndpoints() {
  console.log('============================================================');
  console.log('🌐 PowerShell解决方案 - 测试Cloudflare Worker连接');
  console.log('============================================================');
  
  const endpoints = [
    { path: '/ping', name: 'Ping端点', data: null },
    { path: '/test-vision', name: 'Test Vision端点', data: { test: true } },
    { path: '/analyze-image', name: 'Analyze Image端点', data: { test: true } }
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const result = await callWorker(endpoint.path, endpoint.data);
      console.log(`✅ ${endpoint.name} 测试成功!`);
      console.log(`   响应: ${JSON.stringify(result, null, 2)}`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${endpoint.name} 测试失败: ${error.message}`);
    }
  }
  
  console.log('\n============================================================');
  console.log(`📊 测试结果: ${successCount}/${endpoints.length} 端点连接成功`);
  console.log('============================================================');
  
  console.log('\n💡 使用方法:');
  console.log('1. 将此脚本中的CONFIG对象修改为你的Worker配置');
  console.log('2. 在你的代码中导入并使用callWorker函数:');
  console.log('   const { callWorker } = require(\'./scripts/powershell_solution.js\');');
  console.log('3. 然后像使用fetch一样使用它:');
  console.log('   const result = await callWorker(\'/your-endpoint\', { data: \'value\' });');
  console.log('\n✅ 此解决方案在Windows环境中使用PowerShell的Invoke-WebRequest');
  console.log('✅ 绕过Node.js的网络限制和代理问题');
}

// 运行测试
testAllEndpoints().catch(console.error);

// 导出函数供其他模块使用
module.exports = { callWorker, testAllEndpoints };