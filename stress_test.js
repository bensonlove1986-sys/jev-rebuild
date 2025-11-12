// JEV 系统状态层高并发压力测试脚本

const http = require('http');
const https = require('https');
const fs = require('fs');
const { performance } = require('perf_hooks');

// 配置参数
const config = {
  baseUrl: 'https://jevshop.bensonlove1986.workers.dev',
  apiKey: 'YOUR_API_KEY_HERE', // 请替换为实际的 API 密钥
  testDuration: 60, // 测试持续时间（秒）
  concurrentRequests: 100, // 并发请求数
  requestRate: 10, // 每秒请求数
  testEndpoints: ['/get', '/set', '/list', '/health']
};

// 测试结果
const testResults = {
  startTime: new Date().toISOString(),
  requests: [],
  endpointStats: {},
  summary: {}
};

// 发送单个请求
async function sendRequest(endpoint, method = 'GET', body = null) {
  const startTime = performance.now();
  const url = new URL(endpoint, config.baseUrl);
  
  // 为 get 请求添加测试参数
  if (method === 'GET' && endpoint === '/get') {
    url.searchParams.set('key', `test_key_${Math.random().toString(36).substr(2, 9)}`);
  }
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
  };
  
  // 为 set 请求添加测试数据
  let requestBody = null;
  if (method === 'POST' && endpoint === '/set') {
    requestBody = JSON.stringify({
      key: `test_key_${Math.random().toString(36).substr(2, 9)}`,
      value: {
        test: 'data',
        timestamp: Date.now(),
        random: Math.random()
      }
    });
  }
  
  return new Promise((resolve) => {
    const lib = url.protocol === 'https:' ? https : http;
    const request = lib.request(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        const endTime = performance.now();
        const result = {
          endpoint,
          method,
          statusCode: response.statusCode,
          latency: endTime - startTime,
          timestamp: new Date().toISOString()
        };
        
        try {
          result.responseData = JSON.parse(data);
        } catch (e) {
          result.responseData = data;
        }
        
        testResults.requests.push(result);
        updateEndpointStats(endpoint, result);
        resolve(result);
      });
    });
    
    request.on('error', (error) => {
      const endTime = performance.now();
      const result = {
        endpoint,
        method,
        statusCode: 0,
        error: error.message,
        latency: endTime - startTime,
        timestamp: new Date().toISOString()
      };
      
      testResults.requests.push(result);
      updateEndpointStats(endpoint, result);
      resolve(result);
    });
    
    if (requestBody) {
      request.write(requestBody);
    }
    
    request.end();
  });
}

// 更新端点统计信息
function updateEndpointStats(endpoint, result) {
  if (!testResults.endpointStats[endpoint]) {
    testResults.endpointStats[endpoint] = {
      total: 0,
      success: 0,
      failed: 0,
      latencies: [],
      statusCodes: {}
    };
  }
  
  const stats = testResults.endpointStats[endpoint];
  stats.total++;
  
  if (result.statusCode >= 200 && result.statusCode < 300) {
    stats.success++;
  } else {
    stats.failed++;
  }
  
  stats.latencies.push(result.latency);
  
  const statusCode = result.statusCode.toString();
  stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;
}

// 执行负载测试
async function runLoadTest() {
  console.log(`开始压力测试 - 持续时间: ${config.testDuration}秒, 并发: ${config.concurrentRequests}`);
  
  const endTime = Date.now() + (config.testDuration * 1000);
  let activeRequests = 0;
  let completedRequests = 0;
  
  // 持续发送请求直到达到测试持续时间
  while (Date.now() < endTime) {
    if (activeRequests < config.concurrentRequests) {
      // 随机选择一个端点进行测试
      const endpoint = config.testEndpoints[Math.floor(Math.random() * config.testEndpoints.length)];
      const method = endpoint === '/set' ? 'POST' : 'GET';
      
      activeRequests++;
      
      sendRequest(endpoint, method).then(() => {
        activeRequests--;
        completedRequests++;
        
        if (completedRequests % 100 === 0) {
          console.log(`已完成 ${completedRequests} 个请求`);
        }
      });
      
      // 控制请求速率
      await new Promise(resolve => setTimeout(resolve, 1000 / config.requestRate));
    } else {
      // 如果活跃请求数已达上限，短暂等待
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // 等待所有活跃请求完成
  while (activeRequests > 0) {
    console.log(`等待 ${activeRequests} 个活跃请求完成...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 计算总体统计信息
  calculateSummary();
  
  // 保存测试结果
  saveTestResults();
  
  console.log('压力测试完成！');
  console.log(`总请求数: ${testResults.requests.length}`);
  console.log(`成功请求: ${testResults.summary.successCount}`);
  console.log(`失败请求: ${testResults.summary.failedCount}`);
  console.log(`平均响应时间: ${testResults.summary.avgLatency.toFixed(2)}ms`);
  console.log(`95% 响应时间: ${testResults.summary.p95Latency.toFixed(2)}ms`);
}

// 计算总体统计信息
function calculateSummary() {
  const allLatencies = testResults.requests.map(r => r.latency);
  allLatencies.sort((a, b) => a - b);
  
  testResults.summary = {
    totalRequests: testResults.requests.length,
    successCount: testResults.requests.filter(r => r.statusCode >= 200 && r.statusCode < 300).length,
    failedCount: testResults.requests.filter(r => r.statusCode < 200 || r.statusCode >= 300).length,
    avgLatency: allLatencies.reduce((sum, val) => sum + val, 0) / allLatencies.length,
    minLatency: Math.min(...allLatencies),
    maxLatency: Math.max(...allLatencies),
    p95Latency: allLatencies[Math.floor(allLatencies.length * 0.95)],
    p99Latency: allLatencies[Math.floor(allLatencies.length * 0.99)],
    endTime: new Date().toISOString()
  };
  
  // 计算每个端点的详细统计
  Object.keys(testResults.endpointStats).forEach(endpoint => {
    const stats = testResults.endpointStats[endpoint];
    stats.latencies.sort((a, b) => a - b);
    
    stats.avgLatency = stats.latencies.reduce((sum, val) => sum + val, 0) / stats.latencies.length;
    stats.minLatency = Math.min(...stats.latencies);
    stats.maxLatency = Math.max(...stats.latencies);
    stats.p95Latency = stats.latencies[Math.floor(stats.latencies.length * 0.95)];
    stats.successRate = (stats.success / stats.total) * 100;
    
    delete stats.latencies; // 移除原始延迟数据以节省空间
  });
}

// 保存测试结果到文件
function saveTestResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `stress_test_results_${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(testResults, null, 2));
  console.log(`测试结果已保存到: ${filename}`);
  
  // 生成简化的报告文件
  const report = generateReport();
  fs.writeFileSync(`stress_test_report_${timestamp}.txt`, report);
  console.log(`测试报告已保存到: stress_test_report_${timestamp}.txt`);
}

// 生成测试报告
function generateReport() {
  let report = `JEV 系统状态层压力测试报告\n`;
  report += `==============================\n`;
  report += `测试时间: ${testResults.startTime} 至 ${testResults.summary.endTime}\n`;
  report += `测试持续时间: ${config.testDuration}秒\n`;
  report += `并发请求数: ${config.concurrentRequests}\n`;
  report += `请求速率: ${config.requestRate}/秒\n\n`;
  
  report += `总体结果:\n`;
  report += `- 总请求数: ${testResults.summary.totalRequests}\n`;
  report += `- 成功请求: ${testResults.summary.successCount} (${(testResults.summary.successCount / testResults.summary.totalRequests * 100).toFixed(2)}%)\n`;
  report += `- 失败请求: ${testResults.summary.failedCount} (${(testResults.summary.failedCount / testResults.summary.totalRequests * 100).toFixed(2)}%)\n`;
  report += `- 平均响应时间: ${testResults.summary.avgLatency.toFixed(2)}ms\n`;
  report += `- 最小响应时间: ${testResults.summary.minLatency.toFixed(2)}ms\n`;
  report += `- 最大响应时间: ${testResults.summary.maxLatency.toFixed(2)}ms\n`;
  report += `- 95% 响应时间: ${testResults.summary.p95Latency.toFixed(2)}ms\n`;
  report += `- 99% 响应时间: ${testResults.summary.p99Latency.toFixed(2)}ms\n\n`;
  
  report += `端点详细统计:\n`;
  Object.keys(testResults.endpointStats).forEach(endpoint => {
    const stats = testResults.endpointStats[endpoint];
    report += `\n${endpoint}:\n`;
    report += `- 请求数: ${stats.total}\n`;
    report += `- 成功率: ${stats.successRate.toFixed(2)}%\n`;
    report += `- 平均响应时间: ${stats.avgLatency.toFixed(2)}ms\n`;
    report += `- 95% 响应时间: ${stats.p95Latency.toFixed(2)}ms\n`;
    report += `- 状态码分布: ${JSON.stringify(stats.statusCodes)}\n`;
  });
  
  return report;
}

// 运行测试
runLoadTest().catch(err => {
  console.error('测试运行失败:', err);
});