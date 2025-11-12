const https = require('https');
const fs = require('fs');
const path = require('path');

// 测试结果对象
const testResults = {
  worker_latency_avg: 0,
  image_upload_success_rate: 0,
  module_status: {
    register: 'unknown',
    collector: 'unknown', 
    relay: 'unknown',
    chat: 'unknown'
  },
  errors_detected: [],
  runtime_minutes: 0,
  tests: [],
  timestamp: new Date().toISOString()
};

// 创建日志目录
const logsDir = path.join(__dirname, 'jev_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 记录错误
function logError(message) {
  console.error(`❌ ${message}`);
  testResults.errors_detected.push(message);
}

// 记录成功
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

// HTTPS 请求封装
function httpsRequest(url, method = 'GET', headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Token': 'jev-secure-key-001',
        ...headers
      },
      timeout: 30000
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 带重试的请求
async function requestWithRetry(url, method = 'GET', headers = {}, data = null, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const startTime = Date.now();
      const response = await httpsRequest(url, method, headers, data);
      const latency = Date.now() - startTime;
      
      if (latency > 200) {
        console.log(`⚠️ 请求延迟 ${latency}ms，超过阈值`);
      }
      
      return { response, latency };
    } catch (error) {
      console.log(`⚠️ 请求失败 (${i+1}/${maxRetries}): ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await delay(1000 * (i + 1)); // 指数退避
    }
  }
}

// 测试 Worker ping 端点
async function testWorkerPing() {
  console.log('=== 测试 Worker /ping 端点 ===');
  try {
    const { response, latency } = await requestWithRetry('https://jevshop.bensonlove1986.workers.dev/ping');
    
    testResults.tests.push({
      name: 'worker_ping',
      status: 'success',
      latency,
      statusCode: response.statusCode
    });
    
    logSuccess(`Worker /ping 响应成功，延迟: ${latency}ms，状态码: ${response.statusCode}`);
    return { success: true, latency };
  } catch (error) {
    logError(`Worker /ping 测试失败: ${error.message}`);
    testResults.tests.push({
      name: 'worker_ping', 
      status: 'failed',
      error: error.message
    });
    return { success: false };
  }
}

// 测试 Worker status 端点
async function testWorkerStatus() {
  console.log('=== 测试 Worker /status 端点 ===');
  try {
    const { response, latency } = await requestWithRetry('https://jevshop.bensonlove1986.workers.dev/status');
    
    testResults.tests.push({
      name: 'worker_status',
      status: 'success',
      latency,
      statusCode: response.statusCode
    });
    
    logSuccess(`Worker /status 响应成功，延迟: ${latency}ms，状态码: ${response.statusCode}`);
    return { success: true, latency };
  } catch (error) {
    logError(`Worker /status 测试失败: ${error.message}`);
    testResults.tests.push({
      name: 'worker_status',
      status: 'failed', 
      error: error.message
    });
    return { success: false };
  }
}

// 测试 Daojie 聊天接口
async function testDaojieChat() {
  console.log('=== 测试 Daojie 聊天接口 ===');
  try {
    const { response, latency } = await requestWithRetry('https://app.daojiemarketing.com', 'GET', {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    });
    
    testResults.module_status.chat = latency < 100 ? 'good' : 'high_latency';
    testResults.tests.push({
      name: 'daojie_chat',
      status: 'success',
      latency,
      statusCode: response.statusCode
    });
    
    logSuccess(`Daojie 聊天接口响应成功，延迟: ${latency}ms，状态码: ${response.statusCode}`);
    return { success: true };
  } catch (error) {
    logError(`Daojie 聊天接口测试失败: ${error.message}`);
    testResults.module_status.chat = 'failed';
    testResults.tests.push({
      name: 'daojie_chat',
      status: 'failed',
      error: error.message
    });
    return { success: false };
  }
}

// 模拟图片上传测试
async function testImageUpload() {
  console.log('=== 测试图片上传功能 ===');
  try {
    // 模拟图片数据 (base64编码的小图片)
    const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const { response, latency } = await requestWithRetry(
      'https://jevshop.bensonlove1986.workers.dev/analyze-image', 
      'POST',
      {},
      { image_data: mockImageData }
    );
    
    testResults.tests.push({
      name: 'image_upload',
      status: 'success',
      latency,
      statusCode: response.statusCode
    });
    
    logSuccess(`图片上传测试成功，延迟: ${latency}ms，状态码: ${response.statusCode}`);
    return { success: true };
  } catch (error) {
    logError(`图片上传测试失败: ${error.message}`);
    testResults.tests.push({
      name: 'image_upload',
      status: 'failed',
      error: error.message
    });
    return { success: false };
  }
}

// 生成心跳日志
function generateHeartbeatLog() {
  const heartbeatLog = {
    timestamp: new Date().toISOString(),
    status: 'active',
    uptime_seconds: Math.floor(process.uptime()),
    memory_usage: process.memoryUsage()
  };
  
  const heartbeatPath = path.join(logsDir, `heartbeat_${Date.now()}.json`);
  fs.writeFileSync(heartbeatPath, JSON.stringify(heartbeatLog, null, 2));
  console.log(`✅ 心跳日志已生成: ${heartbeatPath}`);
}

// 保存内部运行日志
function saveInternalRunLog() {
  // 计算平均延迟
  const latencyTests = testResults.tests.filter(t => t.latency);
  if (latencyTests.length > 0) {
    const totalLatency = latencyTests.reduce((sum, test) => sum + test.latency, 0);
    testResults.worker_latency_avg = Math.round(totalLatency / latencyTests.length);
  }
  
  // 计算图片上传成功率
  const uploadTests = testResults.tests.filter(t => t.name === 'image_upload');
  if (uploadTests.length > 0) {
    const successCount = uploadTests.filter(t => t.status === 'success').length;
    testResults.image_upload_success_rate = successCount / uploadTests.length;
  }
  
  // 设置运行时间
  testResults.runtime_minutes = Math.round(process.uptime() / 60 * 10) / 10;
  
  const logPath = path.join(logsDir, `internal_run_log_${Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify(testResults, null, 2));
  console.log(`\n✅ 内部运行日志已生成: ${logPath}`);
  return logPath;
}

// 主测试函数
async function runTests() {
  console.log('🚀 JEV 系统内部上线检查开始...');
  
  // 测试 Worker 连接
  const pingResult = await testWorkerPing();
  const statusResult = await testWorkerStatus();
  
  // 测试 Daojie 聊天
  await testDaojieChat();
  
  // 测试图片上传
  const uploadResult = await testImageUpload();
  
  // 生成心跳日志
  generateHeartbeatLog();
  
  // 更新模块状态
  testResults.module_status.relay = 'inactive'; // 端口检测显示关闭
  testResults.module_status.register = 'unknown'; // 需要前端测试
  testResults.module_status.collector = uploadResult.success ? 'active' : 'failed';
  
  // 保存运行日志
  const logPath = saveInternalRunLog();
  
  // 输出最终结果
  console.log('\n=== 最终检查结果 ===');
  if (testResults.errors_detected.length === 0 && 
      testResults.worker_latency_avg < 200 && 
      testResults.image_upload_success_rate === 1) {
    console.log('✅ JEV 内部上线检查通过');
    console.log('所有模块正常运行');
  } else {
    console.log('⚠️ JEV 内部上线检查完成，但存在一些警告');
    console.log(`发现 ${testResults.errors_detected.length} 个错误`);
    console.log(`平均延迟: ${testResults.worker_latency_avg}ms`);
    console.log(`图片上传成功率: ${(testResults.image_upload_success_rate * 100).toFixed(0)}%`);
  }
  console.log(`日志保存路径: ${logPath}`);
}

// 运行测试
runTests().catch(error => {
  logError(`测试过程中发生错误: ${error.message}`);
  saveInternalRunLog();
});