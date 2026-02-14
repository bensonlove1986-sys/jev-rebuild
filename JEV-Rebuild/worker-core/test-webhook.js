// 测试脚本：模拟Daojie Webhook调用

const testCustomer = {
  customer_id: 'test-daojie-customer-123',
  customer_name: '张三',
  contact: {
    name: '张三',
    phone: '13800138001'
  },
  message: '这是一条测试消息',
  timestamp: Date.now()
};

async function testWebhook() {
  console.log('=== 测试Daojie Webhook开始 ===');
  console.log('发送测试数据:', testCustomer);
  
  try {
    const response = await fetch('http://localhost:8787/api/inbound/daojie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCustomer)
    });
    
    const result = await response.json();
    console.log('Webhook响应:', result);
    
    console.log('=== 测试Webhook结束 ===');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.log('=== 测试Webhook结束 ===');
  }
}

async function testCustomersAPI() {
  console.log('\n=== 测试Customers API开始 ===');
  
  try {
    const response = await fetch('http://localhost:8787/api/inbox/customers', {
      method: 'GET'
    });
    
    const result = await response.json();
    console.log('Customers API响应:', result);
    console.log('返回客户数量:', result.customers.length);
    
    if (result.customers.length > 0) {
      console.log('客户详情:', result.customers[0]);
    }
    
    console.log('=== 测试Customers API结束 ===');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.log('=== 测试Customers API结束 ===');
  }
}

async function testRebuildIndex() {
  console.log('\n=== 测试重建索引开始 ===');
  
  try {
    const response = await fetch('http://localhost:8787/api/internal/rebuild/customers/index', {
      method: 'POST'
    });
    
    const result = await response.json();
    console.log('重建索引响应:', result);
    
    console.log('=== 测试重建索引结束 ===');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.log('=== 测试重建索引结束 ===');
  }
}

// 按顺序执行测试
async function runTests() {
  await testRebuildIndex();
  await testWebhook();
  await testCustomersAPI();
}

runTests();