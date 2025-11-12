// JEV 系统多区域负载均衡压力测试脚本
// 模拟来自不同地区的并发请求，测试系统在多区域部署下的性能表现

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class MultiRegionLoadTester {
  constructor() {
    this.config = {
      // 测试目标 URL
      targetUrl: 'https://jevshop.bensonlove1986.workers.dev',
      
      // 测试持续时间（秒）
      duration: 60,
      
      // 并发用户数
      concurrency: 100,
      
      // 每秒请求数
      requestsPerSecond: 50,
      
      // 模拟区域配置
      regions: [
        { name: 'APAC', weight: 0.35, latency: 180, headers: { 'X-Test-Region': 'APAC' } },
        { name: 'EU', weight: 0.3, latency: 120, headers: { 'X-Test-Region': 'EU' } },
        { name: 'NAM', weight: 0.25, latency: 80, headers: { 'X-Test-Region': 'NAM' } },
        { name: 'SAM', weight: 0.1, latency: 220, headers: { 'X-Test-Region': 'SAM' } }
      ],
      
      // 测试端点
      endpoints: [
        { path: '/get', method: 'GET', weight: 0.6, body: null },
        { path: '/set', method: 'POST', weight: 0.3, body: JSON.stringify({ key: 'test', value: 'value', ttl: 300 }) },
        { path: '/status', method: 'GET', weight: 0.1, body: null }
      ],
      
      // 连接设置
      connection: {
        timeout: 5000,
        keepAlive: true,
        maxSockets: 1000
      },
      
      // 报告设置
      report: {
        outputDir: './test_reports',
        generateHtml: true,
        generateJson: true,
        logLevel: 'info' // info, debug, error
      }
    };
    
    // 测试状态
    this.state = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestTimes: [],
      regionStats: {},
      endpointStats: {},
      statusCodeStats: {},
      errors: [],
      activeRequests: 0,
      completed: false
    };
    
    // 初始化区域统计
    this.config.regions.forEach(region => {
      this.state.regionStats[region.name] = {
        requests: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        responseTimes: []
      };
    });
    
    // 初始化端点统计
    this.config.endpoints.forEach(endpoint => {
      this.state.endpointStats[endpoint.path] = {
        requests: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        responseTimes: []
      };
    });
  }
  
  // 配置测试参数
  configure(options) {
    this.config = { ...this.config, ...options };
    return this;
  }
  
  // 随机选择区域（基于权重）
  selectRegion() {
    const random = Math.random();
    let weightSum = 0;
    
    for (const region of this.config.regions) {
      weightSum += region.weight;
      if (random <= weightSum) {
        return region;
      }
    }
    
    return this.config.regions[0];
  }
  
  // 随机选择端点（基于权重）
  selectEndpoint() {
    const random = Math.random();
    let weightSum = 0;
    
    for (const endpoint of this.config.endpoints) {
      weightSum += endpoint.weight;
      if (random <= weightSum) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0];
  }
  
  // 发送单个请求
  async sendRequest(region, endpoint) {
    const isHttps = this.config.targetUrl.startsWith('https://');
    const client = isHttps ? https : http;
    const url = new URL(this.config.targetUrl + endpoint.path);
    
    // 基础请求选项
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JEV-Load-Tester/1.0',
        ...region.headers,
        'X-Test-Request-ID': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      timeout: this.config.connection.timeout,
      keepAlive: this.config.connection.keepAlive
    };
    
    const startTime = Date.now();
    this.state.activeRequests++;
    this.state.totalRequests++;
    
    // 更新区域和端点统计
    this.state.regionStats[region.name].requests++;
    this.state.endpointStats[endpoint.path].requests++;
    
    return new Promise((resolve, reject) => {
      try {
        const req = client.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // 更新状态
            this.state.activeRequests--;
            this.state.requestTimes.push(responseTime);
            
            // 统计状态码
            if (!this.state.statusCodeStats[res.statusCode]) {
              this.state.statusCodeStats[res.statusCode] = 0;
            }
            this.state.statusCodeStats[res.statusCode]++;
            
            // 判断请求是否成功（2xx 状态码）
            const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
            
            if (isSuccess) {
              this.state.successfulRequests++;
              this.state.regionStats[region.name].successful++;
              this.state.endpointStats[endpoint.path].successful++;
            } else {
              this.state.failedRequests++;
              this.state.regionStats[region.name].failed++;
              this.state.endpointStats[endpoint.path].failed++;
              
              // 记录错误
              this.state.errors.push({
                region: region.name,
                endpoint: endpoint.path,
                statusCode: res.statusCode,
                responseTime,
                error: `HTTP ${res.statusCode}`,
                timestamp: new Date().toISOString()
              });
            }
            
            // 更新响应时间统计
            this.state.regionStats[region.name].responseTimes.push(responseTime);
            this.state.endpointStats[endpoint.path].responseTimes.push(responseTime);
            
            resolve({
              success: isSuccess,
              statusCode: res.statusCode,
              responseTime,
              region: region.name,
              endpoint: endpoint.path
            });
          });
        });
        
        req.on('error', (error) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          // 更新状态
          this.state.activeRequests--;
          this.state.failedRequests++;
          this.state.regionStats[region.name].failed++;
          this.state.endpointStats[endpoint.path].failed++;
          
          // 记录错误
          this.state.errors.push({
            region: region.name,
            endpoint: endpoint.path,
            responseTime,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          resolve({
            success: false,
            statusCode: 0,
            responseTime,
            region: region.name,
            endpoint: endpoint.path,
            error: error.message
          });
        });
        
        req.on('timeout', () => {
          req.destroy();
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          // 更新状态
          this.state.activeRequests--;
          this.state.failedRequests++;
          this.state.regionStats[region.name].failed++;
          this.state.endpointStats[endpoint.path].failed++;
          
          // 记录错误
          this.state.errors.push({
            region: region.name,
            endpoint: endpoint.path,
            responseTime,
            error: 'Request timeout',
            timestamp: new Date().toISOString()
          });
          
          resolve({
            success: false,
            statusCode: 0,
            responseTime,
            region: region.name,
            endpoint: endpoint.path,
            error: 'Request timeout'
          });
        });
        
        // 写入请求体
        if (endpoint.body) {
          req.write(endpoint.body);
        }
        
        req.end();
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 更新状态
        this.state.activeRequests--;
        this.state.failedRequests++;
        this.state.regionStats[region.name].failed++;
        this.state.endpointStats[endpoint.path].failed++;
        
        resolve({
          success: false,
          statusCode: 0,
          responseTime,
          region: region.name,
          endpoint: endpoint.path,
          error: error.message
        });
      }
    });
  }
  
  // 运行测试
  async run() {
    console.log('==========================================');
    console.log('JEV 系统多区域负载均衡压力测试');
    console.log('==========================================');
    console.log(`目标: ${this.config.targetUrl}`);
    console.log(`持续时间: ${this.config.duration}秒`);
    console.log(`并发用户: ${this.config.concurrency}`);
    console.log(`每秒请求: ${this.config.requestsPerSecond}`);
    console.log(`模拟区域: ${this.config.regions.map(r => r.name).join(', ')}`);
    console.log('==========================================');
    
    // 确保报告目录存在
    if (!fs.existsSync(this.config.report.outputDir)) {
      fs.mkdirSync(this.config.report.outputDir, { recursive: true });
    }
    
    // 初始化测试状态
    this.state.startTime = new Date();
    
    // 创建请求调度器
    const requestInterval = 1000 / this.config.requestsPerSecond;
    const endTime = Date.now() + (this.config.duration * 1000);
    let requestCount = 0;
    
    // 运行指标输出
    const statsInterval = setInterval(() => {
      const elapsed = (Date.now() - this.state.startTime.getTime()) / 1000;
      const progress = Math.min(Math.round((elapsed / this.config.duration) * 100), 100);
      
      console.log(`[${progress}%] 已运行: ${elapsed.toFixed(1)}s, 请求: ${this.state.totalRequests}, 成功: ${this.state.successfulRequests}, 失败: ${this.state.failedRequests}, 活跃请求: ${this.state.activeRequests}`);
    }, 5000);
    
    // 请求生成器
    const requestGenerator = async () => {
      while (Date.now() < endTime && this.state.activeRequests < this.config.concurrency) {
        const region = this.selectRegion();
        const endpoint = this.selectEndpoint();
        
        this.sendRequest(region, endpoint).then(result => {
          if (this.config.report.logLevel === 'debug') {
            console.log(`${result.region} -> ${result.endpoint} (${result.statusCode}) - ${result.responseTime}ms`);
          }
        });
        
        requestCount++;
        
        // 控制请求速率
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
    };
    
    // 启动多个请求生成器实例
    const generators = [];
    const generatorCount = Math.min(10, this.config.concurrency / 10);
    
    for (let i = 0; i < generatorCount; i++) {
      generators.push(requestGenerator());
    }
    
    // 等待所有生成器完成
    await Promise.all(generators);
    
    // 等待所有请求完成
    console.log('等待所有请求完成...');
    
    while (this.state.activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 完成测试
    clearInterval(statsInterval);
    this.state.endTime = new Date();
    this.state.completed = true;
    
    // 生成报告
    await this.generateReport();
    
    return this.state;
  }
  
  // 计算平均响应时间
  calculateAverageResponseTimes() {
    // 计算每个区域的平均响应时间
    for (const regionName in this.state.regionStats) {
      const stats = this.state.regionStats[regionName];
      if (stats.responseTimes.length > 0) {
        const sum = stats.responseTimes.reduce((acc, time) => acc + time, 0);
        stats.avgResponseTime = Math.round(sum / stats.responseTimes.length);
      }
    }
    
    // 计算每个端点的平均响应时间
    for (const endpointPath in this.state.endpointStats) {
      const stats = this.state.endpointStats[endpointPath];
      if (stats.responseTimes.length > 0) {
        const sum = stats.responseTimes.reduce((acc, time) => acc + time, 0);
        stats.avgResponseTime = Math.round(sum / stats.responseTimes.length);
      }
    }
  }
  
  // 生成测试报告
  async generateReport() {
    // 计算平均响应时间
    this.calculateAverageResponseTimes();
    
    // 计算总体指标
    const totalTime = (this.state.endTime - this.state.startTime) / 1000;
    const requestsPerSecond = this.state.totalRequests / totalTime;
    const avgResponseTime = this.state.requestTimes.length > 0 
      ? Math.round(this.state.requestTimes.reduce((acc, time) => acc + time, 0) / this.state.requestTimes.length)
      : 0;
    
    const successRate = (this.state.successfulRequests / this.state.totalRequests) * 100;
    
    // 创建报告对象
    const report = {
      testInfo: {
        target: this.config.targetUrl,
        duration: this.config.duration,
        concurrency: this.config.concurrency,
        requestedRps: this.config.requestsPerSecond,
        actualRps: requestsPerSecond.toFixed(2),
        startTime: this.state.startTime.toISOString(),
        endTime: this.state.endTime.toISOString(),
        totalTime: totalTime.toFixed(2) + 's'
      },
      summary: {
        totalRequests: this.state.totalRequests,
        successfulRequests: this.state.successfulRequests,
        failedRequests: this.state.failedRequests,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: avgResponseTime + 'ms',
        minResponseTime: this.state.requestTimes.length > 0 ? Math.min(...this.state.requestTimes) + 'ms' : 'N/A',
        maxResponseTime: this.state.requestTimes.length > 0 ? Math.max(...this.state.requestTimes) + 'ms' : 'N/A'
      },
      regionStats: this.state.regionStats,
      endpointStats: this.state.endpointStats,
      statusCodeStats: this.state.statusCodeStats,
      errors: this.state.errors
    };
    
    // 生成报告文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `load_test_${timestamp}`;
    
    // 输出控制台报告
    console.log('\n==========================================');
    console.log('多区域负载测试报告');
    console.log('==========================================');
    console.log('测试信息:');
    console.log(`  目标: ${report.testInfo.target}`);
    console.log(`  持续时间: ${report.testInfo.duration}秒`);
    console.log(`  并发: ${report.testInfo.concurrency}`);
    console.log(`  目标 RPS: ${report.testInfo.requestedRps}`);
    console.log(`  实际 RPS: ${report.testInfo.actualRps}`);
    console.log('\n测试结果:');
    console.log(`  总请求数: ${report.summary.totalRequests}`);
    console.log(`  成功请求: ${report.summary.successfulRequests}`);
    console.log(`  失败请求: ${report.summary.failedRequests}`);
    console.log(`  成功率: ${report.summary.successRate}`);
    console.log(`  平均响应时间: ${report.summary.avgResponseTime}`);
    console.log(`  最小响应时间: ${report.summary.minResponseTime}`);
    console.log(`  最大响应时间: ${report.summary.maxResponseTime}`);
    
    console.log('\n区域统计:');
    for (const regionName in report.regionStats) {
      const stats = report.regionStats[regionName];
      const regionSuccessRate = stats.requests > 0 ? (stats.successful / stats.requests * 100).toFixed(2) : '0.00';
      console.log(`  ${regionName}: ${stats.requests} 请求, ${regionSuccessRate}% 成功, 平均 ${stats.avgResponseTime}ms`);
    }
    
    console.log('\n端点统计:');
    for (const endpointPath in report.endpointStats) {
      const stats = report.endpointStats[endpointPath];
      const endpointSuccessRate = stats.requests > 0 ? (stats.successful / stats.requests * 100).toFixed(2) : '0.00';
      console.log(`  ${endpointPath}: ${stats.requests} 请求, ${endpointSuccessRate}% 成功, 平均 ${stats.avgResponseTime}ms`);
    }
    
    console.log('\n状态码分布:');
    for (const code in report.statusCodeStats) {
      console.log(`  ${code}: ${report.statusCodeStats[code]}`);
    }
    
    // 保存 JSON 报告
    if (this.config.report.generateJson) {
      const jsonPath = path.join(this.config.report.outputDir, `${baseFilename}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      console.log(`\nJSON 报告已保存到: ${jsonPath}`);
    }
    
    // 生成 HTML 报告
    if (this.config.report.generateHtml) {
      const htmlPath = path.join(this.config.report.outputDir, `${baseFilename}.html`);
      const htmlContent = this.generateHtmlReport(report);
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`HTML 报告已保存到: ${htmlPath}`);
    }
    
    // 检查测试是否通过
    const passed = successRate >= 99 && avgResponseTime < 500;
    console.log('\n==========================================');
    console.log(`测试结果: ${passed ? '通过 ✓' : '未通过 ✗'}`);
    console.log('==========================================');
    
    return report;
  }
  
  // 生成 HTML 报告
  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV 系统多区域负载测试报告</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 15px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        .summary-box {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            flex: 1;
            min-width: 150px;
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        .stat-label {
            color: #6c757d;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .success {
            color: #27ae60;
        }
        .error {
            color: #e74c3c;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        .chart-container {
            height: 400px;
            margin: 30px 0;
        }
        @media (max-width: 768px) {
            .stat-card {
                min-width: 100%;
            }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <h1>JEV 系统多区域负载测试报告</h1>
        
        <h2>测试信息</h2>
        <div class="summary-box">
            <div class="stat-card">
                <div class="stat-label">目标 URL</div>
                <div class="stat-value">${report.testInfo.target}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">持续时间</div>
                <div class="stat-value">${report.testInfo.duration}s</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">并发用户</div>
                <div class="stat-value">${report.testInfo.concurrency}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">每秒请求</div>
                <div class="stat-value">${report.testInfo.actualRps}</div>
            </div>
        </div>
        
        <h2>测试结果</h2>
        <div class="summary-box">
            <div class="stat-card">
                <div class="stat-label">总请求数</div>
                <div class="stat-value">${report.summary.totalRequests}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">成功率</div>
                <div class="stat-value ${parseFloat(report.summary.successRate) >= 99 ? 'success' : 'error'}">
                    ${report.summary.successRate}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">平均响应时间</div>
                <div class="stat-value ${parseInt(report.summary.avgResponseTime) < 500 ? 'success' : 'error'}">
                    ${report.summary.avgResponseTime}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">失败请求</div>
                <div class="stat-value ${report.summary.failedRequests === 0 ? 'success' : 'error'}">
                    ${report.summary.failedRequests}
                </div>
            </div>
        </div>
        
        <h2>区域性能统计</h2>
        <canvas id="regionChart"></canvas>
        <table>
            <thead>
                <tr>
                    <th>区域</th>
                    <th>请求数</th>
                    <th>成功数</th>
                    <th>失败数</th>
                    <th>成功率</th>
                    <th>平均响应时间</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.regionStats).map(([region, stats]) => {
                    const successRate = stats.requests > 0 ? (stats.successful / stats.requests * 100).toFixed(2) : '0.00';
                    return `
                    <tr>
                        <td>${region}</td>
                        <td>${stats.requests}</td>
                        <td class="success">${stats.successful}</td>
                        <td class="error">${stats.failed}</td>
                        <td class="${parseFloat(successRate) >= 99 ? 'success' : 'error'}">${successRate}%</td>
                        <td>${stats.avgResponseTime}ms</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        <h2>端点性能统计</h2>
        <canvas id="endpointChart"></canvas>
        <table>
            <thead>
                <tr>
                    <th>端点</th>
                    <th>请求数</th>
                    <th>成功数</th>
                    <th>失败数</th>
                    <th>成功率</th>
                    <th>平均响应时间</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.endpointStats).map(([endpoint, stats]) => {
                    const successRate = stats.requests > 0 ? (stats.successful / stats.requests * 100).toFixed(2) : '0.00';
                    return `
                    <tr>
                        <td>${endpoint}</td>
                        <td>${stats.requests}</td>
                        <td class="success">${stats.successful}</td>
                        <td class="error">${stats.failed}</td>
                        <td class="${parseFloat(successRate) >= 99 ? 'success' : 'error'}">${successRate}%</td>
                        <td>${stats.avgResponseTime}ms</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        <h2>状态码分布</h2>
        <canvas id="statusCodeChart"></canvas>
        
        ${report.errors.length > 0 ? `
        <h2>错误详情 (${report.errors.length})</h2>
        <table>
            <thead>
                <tr>
                    <th>时间戳</th>
                    <th>区域</th>
                    <th>端点</th>
                    <th>状态码</th>
                    <th>响应时间</th>
                    <th>错误信息</th>
                </tr>
            </thead>
            <tbody>
                ${report.errors.slice(0, 50).map(error => `
                <tr>
                    <td>${new Date(error.timestamp).toLocaleString()}</td>
                    <td>${error.region}</td>
                    <td>${error.endpoint}</td>
                    <td class="error">${error.statusCode || 'N/A'}</td>
                    <td>${error.responseTime}ms</td>
                    <td>${error.error}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ${report.errors.length > 50 ? `<p class="error">仅显示前 50 个错误...</p>` : ''}
        ` : '<p class="success">测试过程中未发生错误！</p>'}
        
        <div class="footer">
            <p>生成时间: ${new Date().toLocaleString()}</p>
            <p>JEV 系统多区域负载均衡压力测试报告</p>
        </div>
    </div>
    
    <script>
        // 区域性能图表
        const regionCtx = document.getElementById('regionChart').getContext('2d');
        const regionChart = new Chart(regionCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(report.regionStats))},
                datasets: [{
                    label: '请求数',
                    data: ${JSON.stringify(Object.values(report.regionStats).map(stats => stats.requests))},
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }, {
                    label: '平均响应时间 (ms)',
                    data: ${JSON.stringify(Object.values(report.regionStats).map(stats => stats.avgResponseTime))},
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '请求数'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '响应时间 (ms)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
        
        // 端点性能图表
        const endpointCtx = document.getElementById('endpointChart').getContext('2d');
        const endpointChart = new Chart(endpointCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(report.endpointStats))},
                datasets: [{
                    label: '请求数',
                    data: ${JSON.stringify(Object.values(report.endpointStats).map(stats => stats.requests))},
                    backgroundColor: 'rgba(155, 89, 182, 0.6)',
                    borderColor: 'rgba(155, 89, 182, 1)',
                    borderWidth: 1
                }, {
                    label: '平均响应时间 (ms)',
                    data: ${JSON.stringify(Object.values(report.endpointStats).map(stats => stats.avgResponseTime))},
                    backgroundColor: 'rgba(230, 126, 34, 0.6)',
                    borderColor: 'rgba(230, 126, 34, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '请求数'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '响应时间 (ms)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
        
        // 状态码分布图表
        const statusCodeCtx = document.getElementById('statusCodeChart').getContext('2d');
        const statusCodeChart = new Chart(statusCodeCtx, {
            type: 'pie',
            data: {
                labels: ${JSON.stringify(Object.keys(report.statusCodeStats))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(report.statusCodeStats))},
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.6)',
                        'rgba(46, 204, 113, 0.6)',
                        'rgba(241, 196, 15, 0.6)',
                        'rgba(231, 76, 60, 0.6)',
                        'rgba(155, 89, 182, 0.6)'
                    ],
                    borderColor: [
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(231, 76, 60, 1)',
                        'rgba(155, 89, 182, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'HTTP 状态码分布'
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }
}

// 运行测试
async function runLoadTest() {
  try {
    const tester = new MultiRegionLoadTester();
    await tester.run();
    console.log('\n测试完成！请查看报告获取详细结果。');
  } catch (error) {
    console.error('测试运行出错:', error);
    process.exit(1);
  }
}

// 如果直接运行脚本
if (require.main === module) {
  runLoadTest();
}

module.exports = MultiRegionLoadTester;