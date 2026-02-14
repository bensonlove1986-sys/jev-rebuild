const https = require('https');

// 测试数据
const testData = {
  contactId: 'GakCvF3msAuChq2DtER9',
  locationId: '3SsfTbU1lmAPpkG9iB6C',
  message: 'Test from UI - /api/daojie/pit/reply'
};

// 测试配置
const testConfigs = [
  {
    name: 'Production Worker',
    hostname: 'jev-rebuild-worker.bensonlove1986.workers.dev',
    protocol: https,
    port: 443
  },
  {
    name: 'Local Worker',
    hostname: 'localhost',
    protocol: require('http'),
    port: 8787
  }
];

// 测试端点列表
const testEndpoints = [
  '/api/daojie/pit/reply',
  '/api/daojie/conversations/messages',
  '/api/daojie/conversation/messages',
  '/api/reply/daojie'
];

// 发送请求的函数
function sendRequest(config, endpoint, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(body))
      }
    };

    const req = config.protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          endpoint: endpoint,
          config: config
        });
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code,
        endpoint: endpoint,
        config: config
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 测试流程
async function runTests() {
  console.log('=== Testing ChatPanel 404 Fix ===\n');
  
  console.log('Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');
  
  // 测试每个配置下的所有端点
  for (const config of testConfigs) {
    console.log(`=== ${config.name} ===\n`);
    
    for (const endpoint of testEndpoints) {
      console.log(`Testing endpoint: ${endpoint}`);
      console.log('-' . repeat(60));
      
      try {
        const result = await sendRequest(config, endpoint, testData);
        console.log(`Status Code: ${result.statusCode}`);
        console.log(`Response Body: ${result.body}`);
        console.log(`Success: ${result.statusCode < 300}`);
      } catch (error) {
        console.log(`Error Code: ${error.code || 'UNKNOWN'}`);
        console.log(`Error Message: ${error.error || 'No error message'}`);
        console.log(`Success: false`);
      }
      
      console.log('\n');
    }
    
    console.log('\n');
  }
  
  console.log('=== Test Complete ===');
}

runTests();