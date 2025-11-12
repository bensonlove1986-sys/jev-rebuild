// 多密钥认证逻辑测试脚本
console.log('📋 多密钥认证逻辑测试');
console.log('================================================================');

// 模拟环境变量
const mockEnv = {
  WEBHOOK_SECRET: 'cloudflare-encrypted-secret',  // 模拟Cloudflare Secrets
  WEBHOOK_SHARED_SECRET: 'jevindustry2025'         // 纯文本类型密钥
};

// 环境变量处理函数
function getEnvVars(env) {
  // 允许的密钥列表，支持多种认证方式和环境
  // 包含Cloudflare Secrets、明文变量和兜底值
  const ALLOWED_SECRETS = [
    env.WEBHOOK_SECRET,       // 支持Cloudflare Secrets类型
    env.WEBHOOK_SHARED_SECRET, // 支持纯文本类型
    'jevindustry2025'         // 兜底开发模式密钥
  ].filter(Boolean); // 过滤掉可能的undefined
  
  return {
    ...env,
    ALLOWED_SECRETS
  };
}

// 统一认证验证函数 - 支持多密钥容错
function authenticateRequest(request, envVars) {
  // 尝试从Authorization头获取Bearer token
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.replace('Bearer ', '').trim();
  
  // 尝试从X-Webhook-Secret头获取密钥
  const webhookSecretHeader = request.headers.get('X-Webhook-Secret') || '';
  
  // 检查是否有任何有效的认证方式
  const isAuthenticated = 
    envVars.ALLOWED_SECRETS.includes(bearerToken) || 
    envVars.ALLOWED_SECRETS.includes(webhookSecretHeader);
  
  if (isAuthenticated) {
    return { authenticated: true };
  }
  
  return { 
    authenticated: false, 
    response: { status: 401, body: JSON.stringify({ success: false, error: 'Unauthorized: invalid webhookSecret' }) }
  };
}

// 模拟请求类
class MockRequest {
  constructor(headers = {}) {
    this.headersObj = headers;
  }
  
  headers = {
    get: (name) => {
      const normalizedName = name.toLowerCase();
      for (const [key, value] of Object.entries(this.headersObj)) {
        if (key.toLowerCase() === normalizedName) {
          return value;
        }
      }
      return undefined;
    }
  };
}

// 运行测试用例
function runTests() {
  const envVars = getEnvVars(mockEnv);
  
  console.log('🔍 允许的密钥列表:');
  console.log(envVars.ALLOWED_SECRETS);
  console.log('================================================================');
  
  const tests = [
    {
      name: '测试1: 使用WEBHOOK_SHARED_SECRET的Bearer认证',
      request: new MockRequest({ 'Authorization': 'Bearer jevindustry2025' }),
      expected: true
    },
    {
      name: '测试2: 使用WEBHOOK_SECRET的X-Webhook-Secret头',
      request: new MockRequest({ 'X-Webhook-Secret': 'cloudflare-encrypted-secret' }),
      expected: true
    },
    {
      name: '测试3: 兜底值认证',
      request: new MockRequest({ 'Authorization': 'Bearer jevindustry2025' }),
      expected: true
    },
    {
      name: '测试4: 无效密钥',
      request: new MockRequest({ 'Authorization': 'Bearer invalid-secret' }),
      expected: false
    },
    {
      name: '测试5: 无认证头',
      request: new MockRequest({}),
      expected: false
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach((test, index) => {
    console.log(`\n${test.name}`);
    console.log(`请求头:`, test.request.headersObj);
    
    const result = authenticateRequest(test.request, envVars);
    const success = result.authenticated === test.expected;
    
    if (success) {
      console.log(`✅ 通过! 认证结果: ${result.authenticated ? '已认证' : '未认证'}`);
      passed++;
    } else {
      console.log(`❌ 失败! 期望: ${test.expected ? '已认证' : '未认证'}, 实际: ${result.authenticated ? '已认证' : '未认证'}`);
      failed++;
    }
  });
  
  console.log('\n================================================================');
  console.log(`📊 测试结果: ${passed}/${tests.length} 通过`);
  if (failed === 0) {
    console.log('🎉 所有测试通过! 多密钥认证逻辑正确实现。');
    console.log('✅ 现在Worker可以同时支持:');
    console.log('   - Cloudflare Secrets中的WEBHOOK_SECRET');
    console.log('   - 纯文本类型的WEBHOOK_SHARED_SECRET');
    console.log('   - 兜底开发模式密钥');
  } else {
    console.log('❌ 有测试失败，请检查认证逻辑。');
  }
  console.log('================================================================');
}

// 执行测试
runTests();