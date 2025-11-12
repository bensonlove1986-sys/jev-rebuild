// 测试JEV Worker路由功能
const http = require('http');

// 测试URL列表
const testUrls = [
  'http://localhost:8080/',
  'http://localhost:8080/index',
  'http://localhost:8080/login_portal.html',
  'http://localhost:8080/register'
];

// 测试结果
const results = [];

// 测试函数
function testUrl(url, index) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let status = res.statusCode;
      let contentType = res.headers['content-type'] || '未知';
      
      results.push({
        url: url,
        status: status,
        contentType: contentType,
        success: status === 200 && contentType.includes('text/html')
      });
      
      resolve();
    }).on('error', (e) => {
      results.push({
        url: url,
        status: 0,
        contentType: '错误',
        success: false,
        error: e.message
      });
      resolve();
    });
  });
}

// 执行所有测试
async function runAllTests() {
  console.log('开始测试JEV Worker路由...');
  
  for (let i = 0; i < testUrls.length; i++) {
    await testUrl(testUrls[i], i);
    console.log(`已测试: ${testUrls[i]}`);
  }
  
  // 输出测试结果
  console.log('\n测试结果汇总:');
  console.log('==============================');
  
  let allSuccess = true;
  results.forEach(result => {
    const statusText = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${statusText}: ${result.url}`);
    console.log(`  - 状态码: ${result.status}`);
    console.log(`  - 内容类型: ${result.contentType}`);
    if (result.error) {
      console.log(`  - 错误信息: ${result.error}`);
    }
    console.log('');
    
    if (!result.success) {
      allSuccess = false;
    }
  });
  
  console.log('==============================');
  console.log(`测试完成: ${allSuccess ? '全部通过' : '存在失败'}`);
  
  // 创建验证日志
  const fs = require('fs');
  const logDir = 'd:\\PDF转网页\\jev_logs\\deploy';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = `${logDir}\\route_verification_${timestamp}.json`;
  
  const logContent = {
    timestamp: new Date().toISOString(),
    environment: 'development',
    workerFile: 'worker_simple.js',
    serverPort: 8080,
    testResults: results,
    allPassed: allSuccess
  };
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.writeFileSync(logFile, JSON.stringify(logContent, null, 2));
  console.log(`\n验证日志已保存至: ${logFile}`);
}

// 运行测试
runAllTests().catch(err => {
  console.error('测试执行出错:', err);
});