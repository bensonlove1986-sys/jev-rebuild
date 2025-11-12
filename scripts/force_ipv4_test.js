// 强制使用IPv4进行网络连接测试
const https = require('https');

console.log('\n🔍 强制IPv4连接测试');
console.log('='.repeat(40));
console.log(`Node.js版本: ${process.version}`);
console.log('强制使用IPv4进行所有连接');
console.log('='.repeat(40));

// 强制使用IPv4
const options = {
  family: 4, // 强制使用IPv4 (4代表IPv4, 6代表IPv6)
  timeout: 5000
};

// 测试Google IPv4连接
console.log('\n测试Google IPv4连接...');
testConnection('https://www.google.com/generate_204', options);

// 测试Worker IPv4连接
console.log('\n测试Worker IPv4连接...');
testWorkerConnection(options);

// 通用连接测试函数
function testConnection(url, baseOptions) {
  const startTime = Date.now();
  const req = https.get(url, baseOptions, (res) => {
    const duration = Date.now() - startTime;
    console.log(`✅ 连接成功！状态码: ${res.statusCode} (${duration}ms)`);
    res.resume(); // 释放响应流
  });
  
  req.on('error', (error) => {
    console.log(`❌ 连接失败: ${error.message}`);
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.log('❌ 连接超时');
  });
}

// Worker连接测试函数
function testWorkerConnection(baseOptions) {
  const workerOptions = {
    ...baseOptions,
    headers: {
      'Authorization': 'Bearer jevindustry2025'
    },
    timeout: 8000
  };
  
  const workerUrl = 'https://jevshop.bensonlove1986.workers.dev/ping';
  const startTime = Date.now();
  
  const req = https.get(workerUrl, workerOptions, (res) => {
    const duration = Date.now() - startTime;
    console.log(`✅ Worker连接成功！状态码: ${res.statusCode} (${duration}ms)`);
    
    // 读取响应内容
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`📊 Worker响应: ${JSON.stringify(json, null, 2)}`);
      } catch (e) {
        console.log(`📝 Worker响应(原始): ${data}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log(`❌ Worker连接失败: ${error.message}`);
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.log('❌ Worker连接超时');
  });
}

console.log('\n📝 提示：如果强制IPv4成功但之前失败，说明是IPv6网络问题');
console.log('📝 修复方法：在Node.js中添加family:4选项，或在系统中禁用IPv6');
