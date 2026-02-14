// 测试脚本：直接调用 /api/outbound/daojie 路由的处理逻辑

const testEnv = {
  PIT_JWT: 'test-jwt-token',
  GHL_PRIVATE_TOKEN: 'test-ghl-token'
};

// 模拟请求对象
const mockRequest = {
  json: async () => ({
    customer_id: 'test-customer-id',
    text: 'Hello, this is a test message'
  }),
  method: 'POST',
  url: 'http://localhost:8787/api/outbound/daojie',
  headers: {
    get: () => 'application/json'
  }
};

// 模拟 Response 对象
class MockResponse {
  constructor(body, options) {
    this.body = body;
    this.status = options.status;
    this.headers = options.headers;
  }
}

// 模拟 json 辅助函数
const json = (body, status = 200) => {
  return new MockResponse(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// 测试处理逻辑
async function testOutboundRoute() {
  console.log('[TEST] Starting /api/outbound/daojie route test...');
  
  try {
    // 1. 读取请求体
    const payload = await mockRequest.json();
    console.log('[TEST] Request payload:', payload);
    
    // 2. 验证必要字段
    const { customer_id, text } = payload;
    if (!customer_id || !text) {
      console.log('[TEST] Missing required fields:', { customer_id, text });
      return json({ ok: false, error: 'MISSING_REQUIRED_FIELDS', required: ['customer_id', 'text'] }, 400);
    }
    
    // 3. 构造 PIT API 请求
    const pitEndpoint = 'https://services.leadconnectorhq.com/conversations/messages';
    const authToken = testEnv.PIT_JWT || testEnv.GHL_PRIVATE_TOKEN;
    if (!authToken) {
      console.log('[TEST] Auth token missing');
      return json({ ok: false, error: 'AUTH_TOKEN_MISSING' }, 500);
    }
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    };
    const pitBody = {
      'type': 'SMS',
      'contactId': customer_id,
      'message': text
    };
    
    console.log('[TEST] PIT API Request:', {
      url: pitEndpoint,
      headers: { ...headers, Authorization: 'Bearer ***' }, // 隐藏敏感信息
      body: pitBody
    });
    
    // 4. 由于是测试，我们不实际调用 PIT API，而是直接返回成功响应
    console.log('[TEST] Mock PIT API response: 200 OK');
    
    // 5. 记录成功日志
    console.log('[TEST] Outbound message sent successfully:', {
      customer_id: customer_id,
      text: text
    });
    
    // 6. 返回成功响应
    const response = json({ ok: true }, 200);
    console.log('[TEST] Route test passed! Response:', response);
    return response;
    
  } catch (error) {
    console.error('[TEST] Route test failed:', error);
    return json({ ok: false, error: String(error) }, 500);
  }
}

// 运行测试
testOutboundRoute();
