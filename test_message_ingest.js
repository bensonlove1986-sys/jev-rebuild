// 测试消息接收端点 - 使用Node.js原生模块
const https = require('https');

// 测试消息接收端点
function testMessageIngest() {
  return new Promise((resolve, reject) => {
    const endpoint = 'jevshop.bensonlove1986.workers.dev';
    const path = '/messages/ingest';
    
    // 测试数据
    const testMessage = {
      sender: 'test_user',
      body: '这是一条测试消息',
      timestamp: new Date().toISOString(),
      elementClass: 'chat-message',
      elementId: 'msg-test-001'
    };
    
    const messageData = JSON.stringify(testMessage);
    
    console.log('开始测试消息接收端点...');
    console.log('测试数据:', JSON.stringify(testMessage, null, 2));
    
    const options = {
      hostname: endpoint,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token_123',
        'Content-Length': messageData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('\n响应状态:', res.statusCode);
          console.log('响应内容:', JSON.stringify(parsedData, null, 2));
          resolve(parsedData);
        } catch (e) {
          console.error('解析响应失败:', e);
          reject(new Error('解析响应失败'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('\n❌ 测试过程中出错:', error);
      reject(error);
    });
    
    req.write(messageData);
    req.end();
  });
}

// 测试消息统计端点
function testMessageStats() {
  return new Promise((resolve, reject) => {
    const endpoint = 'jevshop.bensonlove1986.workers.dev';
    const path = '/messages/stats';
    
    console.log('\n开始测试消息统计端点...');
    
    const options = {
      hostname: endpoint,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token_123'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('响应状态:', res.statusCode);
          console.log('响应内容:', JSON.stringify(parsedData, null, 2));
          resolve(parsedData);
        } catch (e) {
          console.error('解析响应失败:', e);
          reject(new Error('解析响应失败'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('\n❌ 统计测试出错:', error);
      reject(error);
    });
    
    req.end();
  });
}

// 运行测试流程
async function runTests() {
  try {
    // 先测试消息接收
    const ingestResult = await testMessageIngest();
    
    if (ingestResult.success) {
      console.log('\n✅ 测试成功! 消息接收端点正常工作。');
      console.log('消息ID:', ingestResult.data.messageId);
      
      // 再测试统计功能
      await testMessageStats();
    } else {
      console.log('\n❌ 测试失败:', ingestResult.error);
    }
  } catch (error) {
    console.error('测试流程执行失败:', error);
  }
}

// 启动测试
runTests();