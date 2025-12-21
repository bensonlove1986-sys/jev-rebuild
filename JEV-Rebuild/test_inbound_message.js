// 测试脚本：验证 Daojie 入站消息写入功能
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:8787';

// 测试数据
const testData = {
  "customer_id": "test_customer_123",
  "customer_name": "张三",
  "company": "测试公司",
  "text": "这是一条测试消息，用于验证入站消息写入功能",
  "type": "inbound-message"
};

async function testInboundMessage() {
  console.log('=== 测试 Daojie 入站消息写入功能 ===\n');
  
  try {
    // 1. 发送入站消息
    console.log('1. 发送入站消息...');
    const inboundResponse = await fetch(`${API_BASE_URL}/api/inbound/daojie`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const inboundResult = await inboundResponse.json();
    console.log('   入站响应:', inboundResult);
    if (inboundResult.success) {
      console.log('   ✅ 入站消息发送成功');
    } else {
      console.log('   ❌ 入站消息发送失败');
      return;
    }
    
    // 2. 等待片刻，确保消息写入完成
    console.log('\n2. 等待消息写入...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 测试 /api/inbox/customers 端点
    console.log('\n3. 测试 /api/inbox/customers 端点...');
    const customersResponse = await fetch(`${API_BASE_URL}/api/inbox/customers`);
    const customersResult = await customersResponse.json();
    console.log('   客户列表:', customersResult);
    if (customersResult.ok && customersResult.customers.length > 0) {
      console.log('   ✅ 客户列表返回成功');
    } else {
      console.log('   ❌ 客户列表返回失败');
    }
    
    // 4. 测试 /api/inbox/pull 端点
    console.log('\n4. 测试 /api/inbox/pull 端点...');
    const pullResponse = await fetch(`${API_BASE_URL}/api/inbox/pull?customer_id=${testData.customer_id}`);
    const pullResult = await pullResponse.json();
    console.log('   拉取消息:', pullResult);
    if (pullResult.messages && pullResult.messages.length > 0) {
      console.log('   ✅ 消息拉取成功，共返回', pullResult.messages.length, '条消息');
      console.log('   消息内容:', pullResult.messages[0].text);
    } else {
      console.log('   ❌ 消息拉取失败，返回 0 条消息');
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testInboundMessage();