// 高并发测试脚本 - 用于测试状态层API性能
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置参数
const config = {
  baseUrl: 'https://jevshop.bensonlove1986.workers.dev',
  concurrency: 100, // 并发请求数
  totalRequests: 1000, // 总请求数
  timeout: 5000, // 请求超时时间（毫秒）
  apiKey: 'jev-api-key-123',
  outputDir: path.join(__dirname, 'performance_results')
};

// 测试结果
const results = {
  startTime: Date.now(),
  endTime: null,
  totalRequests: config.totalRequests,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: []
};

// 创建输出目录
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 生成随机测试数据
function generateTestData(index) {
  return {
    key: `test_key_${index}_${Date.now()}`,
    value: {
      timestamp: Date.now(),
      data: `Test data for request ${index}`,
      random: Math.random()
    }
  };
}

// 发送请求的函数
function sendRequest(index, testData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(config.baseUrl).hostname,
      path: index % 2 === 0 ? '/set' : `/get?key=test_key_${index-1}_${Date.now() - 1000}`,
      method: index % 2 === 0 ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: config.timeout
    };

    const startTime = Date.now();
    const protocol = options.hostname.includes('https') ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.responseTimes.push(responseTime);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successfulRequests++;
          console.log(`请求 ${index} 成功 - ${responseTime}ms - 状态码: ${res.statusCode}`);
          resolve({ index, status: 'success', responseTime, statusCode: res.statusCode });
        } else {
          results.failedRequests++;
          const error = { index, statusCode: res.statusCode, response: data };
          results.errors.push(error);
          console.error(`请求 ${index} 失败 - ${res.statusCode}`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      results.failedRequests++;
      const errorObj = { index, error: error.message };
      results.errors.push(errorObj);
      console.error(`请求 ${index} 错误: ${error.message}`);
      reject(errorObj);
    });

    req.on('timeout', () => {
      req.destroy();
      results.failedRequests++;
      const errorObj = { index, error: '请求超时' };
      results.errors.push(errorObj);
      console.error(`请求 ${index} 超时`);
      reject(errorObj);
    });

    if (options.method === 'POST') {
      req.write(JSON.stringify(testData));
    }
    
    req.end();
  });
}

// 批量发送并发请求
async function runConcurrencyTest() {
  console.log(`开始高并发测试 - 总请求数: ${config.totalRequests}, 并发数: ${config.concurrency}`);
  console.log(`目标URL: ${config.baseUrl}`);
  
  let completedRequests = 0;
  const activeRequests = new Set();
  
  for (let i = 0; i < config.totalRequests; i++) {
    // 控制并发数
    while (activeRequests.size >= config.concurrency) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const testData = generateTestData(i);
    const requestPromise = sendRequest(i, testData);
    activeRequests.add(requestPromise);
    
    requestPromise.finally(() => {
      activeRequests.delete(requestPromise);
      completedRequests++;
      
      if (completedRequests % 100 === 0) {
        console.log(`进度: ${completedRequests}/${config.totalRequests} 请求已完成`);
      }
      
      if (completedRequests === config.totalRequests) {
        finishTest();
      }
    });
    
    // 小延迟避免同时创建所有请求
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

// 完成测试并生成报告
function finishTest() {
  results.endTime = Date.now();
  results.totalTime = results.endTime - results.startTime;
  
  // 计算性能指标
  const { responseTimes } = results;
  const sortedTimes = responseTimes.sort((a, b) => a - b);
  
  const metrics = {
    totalTime: results.totalTime,
    rps: (results.totalRequests / (results.totalTime / 1000)).toFixed(2),
    successRate: ((results.successfulRequests / results.totalRequests) * 100).toFixed(2),
    avgResponseTime: responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : 0,
    minResponseTime: sortedTimes.length > 0 ? sortedTimes[0] : 0,
    maxResponseTime: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
    p50: sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.5)] : 0,
    p90: sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.9)] : 0,
    p99: sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.99)] : 0
  };
  
  // 生成报告
  const report = {
    testConfig: config,
    results,
    metrics,
    timestamp: new Date().toISOString()
  };
  
  // 保存JSON报告
  const reportPath = path.join(config.outputDir, `performance_report_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 生成人类可读的摘要
  const summary = `
状态层API高并发测试报告
====================
测试时间: ${new Date(results.startTime).toLocaleString()}
完成时间: ${new Date(results.endTime).toLocaleString()}
总耗时: ${results.totalTime}ms

测试配置:
- 目标URL: ${config.baseUrl}
- 总请求数: ${config.totalRequests}
- 并发数: ${config.concurrency}
- 请求超时: ${config.timeout}ms

性能指标:
- 吞吐量: ${metrics.rps} 请求/秒
- 成功率: ${metrics.successRate}%
- 平均响应时间: ${metrics.avgResponseTime}ms
- 最小响应时间: ${metrics.minResponseTime}ms
- 最大响应时间: ${metrics.maxResponseTime}ms
- P50响应时间: ${metrics.p50}ms
- P90响应时间: ${metrics.p90}ms
- P99响应时间: ${metrics.p99}ms

详细结果已保存到: ${reportPath}
  `;
  
  console.log(summary);
  
  // 保存文本摘要
  const summaryPath = path.join(config.outputDir, `performance_summary_${Date.now()}.txt`);
  fs.writeFileSync(summaryPath, summary);
  
  console.log(`\n测试完成! 详细报告已保存到 ${config.outputDir}`);
}

// 执行测试
runConcurrencyTest().catch(error => {
  console.error('测试执行失败:', error);
});