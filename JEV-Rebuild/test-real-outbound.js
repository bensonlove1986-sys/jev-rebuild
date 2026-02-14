const http = require('http');
const https = require('https');

// 测试数据 - 注意：这里使用的是测试contactId，实际应使用PIT/Daojie inbound回调中返回的真实ID
const realTestData = {
  contactId: '3SsfTbU1lmAPpkG9iB6C', // 示例真实contactId
  locationId: '3SsfTbU1lmAPpkG9iB6C', // 示例真实locationId
  message: 'Test from production worker - Real outbound verification'
};

// 生产Worker地址
const API_BASE = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';

// 发送请求的函数
function sendRequest(options, body) {
  return new Promise((resolve, reject) => {
    // 根据端口和hostname选择http或https模块
    const protocolModule = options.port === 8787 || options.hostname === 'localhost' ? http : https;
    
    const req = protocolModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 测试流程
async function runTest() {
  console.log('=== Real Outbound Existence Verification ===\n');
  
  // 1. 输出完整outbound payload
  console.log('1. Outbound Payload:');
  console.log(JSON.stringify(realTestData, null, 2));
  
  // 2. 先测试本地Worker
  console.log('\n=== Testing Local Worker ===');
  const localOptions = {
    hostname: 'localhost',
    port: 8787,
    path: '/api/daojie/pit/reply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(realTestData))
    }
  };
  
  // 3. 发送本地请求
  console.log('2. Sending request to: http://localhost:8787' + localOptions.path);
  try {
    const localResult = await sendRequest(localOptions, realTestData);
    console.log('   Local Response Status:', localResult.statusCode);
    console.log('   Local Response Body:', localResult.body);
    
    // 4. 分析本地结果
    console.log('\n3. Local Verification Analysis:');
    console.log('   - HTTP Status:', localResult.statusCode);
    console.log('   - Worker URL:', 'http://localhost:8787');
    console.log('   - Contact ID:', realTestData.contactId);
    console.log('   - Location ID:', realTestData.locationId);
    
  } catch (error) {
    console.error('   Local request failed:', error.message);
  }
  
  // 5. 再测试生产Worker
  console.log('\n=== Testing Production Worker ===');
  const prodOptions = {
    hostname: 'jev-rebuild-worker.bensonlove1986.workers.dev',
    path: '/api/daojie/pit/reply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(realTestData))
    }
  };
  
  // 6. 发送生产请求
  console.log('6. Sending request to:', API_BASE + prodOptions.path);
  try {
    const prodResult = await sendRequest(prodOptions, realTestData);
    console.log('   Production Response Status:', prodResult.statusCode);
    console.log('   Production Response Body:', prodResult.body);
    
    // 7. 分析生产结果
    console.log('\n7. Production Verification Analysis:');
    console.log('   - HTTP Status:', prodResult.statusCode);
    console.log('   - Worker URL:', API_BASE);
    console.log('   - Contact ID:', realTestData.contactId);
    console.log('   - Location ID:', realTestData.locationId);
    
    // 8. 最终结论
    console.log('\n8. Final Conclusion:');
    
    // 注意：这里的判定逻辑是基于要求，但实际需要查看第三方系统是否真实收到消息
    // 由于我们无法直接访问第三方系统，这里基于Worker日志和HTTP响应做出合理推断
    
    if (prodResult.statusCode >= 200 && prodResult.statusCode < 300) {
      console.log('   【消息在现实世界中：需要查看第三方系统确认】');
      console.log('   【可能缺失的底层元素：无法确定，需检查PIT/Daojie系统】');
      console.log('   【建议：登录Daojie/GHL平台，检查contactId对应的WhatsApp会话】');
    } else {
      console.log('   【消息在现实世界中：不存在】');
      console.log('   【可能缺失的底层元素：接收者/会话/通道/绑定】');
      console.log('   【Worker返回状态：', prodResult.statusCode, '】');
    }
    
  } catch (error) {
    console.error('   Production request failed:', error.message);
    console.log('\n8. Final Conclusion:');
    console.log('   【消息在现实世界中：不存在】');
    console.log('   【可能缺失的底层元素：Worker连接失败】');
  }
  
  console.log('\n=== Verification Complete ===');
  console.log('\n【执行边界说明】');
  console.log(' - 未修改任何已有路径、配置、命名或部署目标');
  console.log(' - 未新增mock/fallback/simulate行为');
  console.log(' - 未假设接收者存在，仅基于测试结果推断');
  console.log(' - 仅用于存在性验证，未做功能扩展');
}

runTest();
