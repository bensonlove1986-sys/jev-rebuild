import fetch from 'node-fetch';

// 测试常量
const DEFAULT_ANONYMOUS_NAME = '未命名客户';
const TEST_CUSTOMER_ID = 'test-customer-123';
const TEST_TEXT = 'Hello, this is a test message';

// 测试函数：模拟发送inbound消息
async function testInboundMessage(channelType) {
  console.log(`\n=== 测试 ${channelType} 渠道 ===`);
  
  // 构建测试请求体
  const requestBody = {
    sender_id: TEST_CUSTOMER_ID,
    message: TEST_TEXT,
    timestamp: Date.now(),
    // 根据channelType设置不同的平台信息
    ...(channelType === 'whatsapp' && {
      platform: 'whatsapp',
      channel_id: 19 // WhatsApp channel_id
    }),
    ...(channelType === 'instagram' && {
      platform: 'instagram',
      channel_id: 29 // Instagram channel_id
    }),
    ...(channelType === 'other' && {
      platform: 'webchat',
      channel_id: 39 // 其他渠道 channel_id
    }),
    // 模拟未命名客户
    display_name: DEFAULT_ANONYMOUS_NAME
  };
  
  try {
    // 发送POST请求到inbound接口
    const response = await fetch('http://localhost:8787/api/inbound/daojie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log(`请求状态: ${response.status}`);
    console.log(`响应结果:`, result);
    
    // 验证响应
    if (response.status === 200) {
      console.log(`✅ ${channelType} 渠道测试通过，请求成功`);
    } else {
      console.log(`❌ ${channelType} 渠道测试失败，请求状态码: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ ${channelType} 渠道测试失败，错误:`, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('开始测试：为"未命名客户"生成合法displayName');
  console.log('='.repeat(60));
  
  // 测试不同渠道
  await testInboundMessage('whatsapp');
  await testInboundMessage('instagram');
  await testInboundMessage('other');
  
  console.log('\n' + '='.repeat(60));
  console.log('所有测试完成！');
  
  // 提示：检查worker日志以确认displayName是否正确生成
  console.log('\n请检查worker日志，确认：');
  console.log('1. 客户displayName从"未命名客户"变为渠道名');
  console.log('2. displayNameNotCustomerId永远为true');
  console.log('3. 生成的displayName是否符合预期：');
  console.log('   - WhatsApp → WhatsApp 客户');
  console.log('   - Instagram → Instagram 客户');
  console.log('   - 其他 → 新客户');
}

// 运行测试
runTests();
