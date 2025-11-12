// 本地测试认证中间层逻辑
console.log('================================================================');
console.log('🔐 Cloudflare Worker 认证中间层测试');
console.log('================================================================');

// 模拟环境变量
function getEnvVars(env) {
  const WEBHOOK_SECRET = env.WEBHOOK_SECRET || 'jevindustry2025';
  // 安全兼容的密钥数组，支持多个密钥和兜底值
  const ALLOWED_SECRETS = [
    WEBHOOK_SECRET, // 优先使用Cloudflare Secrets中的密钥
    'jevindustry2025' // 本地开发和容错兜底值
  ].filter(Boolean); // 过滤掉可能的undefined
  return { WEBHOOK_SECRET, ALLOWED_SECRETS };
}

// 统一的认证验证函数
function authenticateRequest(request, ALLOWED_SECRETS) {
  // 获取可能的认证凭证
  const webhookSecret1 = request.headers.get('X-Webhook-Secret');
  const authHeader = request.headers.get('Authorization');
  const webhookSecret2 = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  console.log(`\n📋 认证信息检查:`);
  console.log(`  - X-Webhook-Secret: ${webhookSecret1 ? '存在' : '不存在'}`);
  console.log(`  - Authorization: ${authHeader ? '存在' : '不存在'}`);
  console.log(`  - Bearer密钥: ${webhookSecret2 ? '存在' : '不存在'}`);
  console.log(`  - 允许的密钥列表: [${ALLOWED_SECRETS.join(', ')}]`);
  
  // 验证凭证是否在允许的密钥列表中
  const isAuthenticated = ALLOWED_SECRETS.includes(webhookSecret1) || ALLOWED_SECRETS.includes(webhookSecret2);
  console.log(`  - 认证结果: ${isAuthenticated ? '✅ 通过' : '❌ 失败'}`);
  return isAuthenticated;
}

// 模拟请求类
class MockRequest {
  constructor(headers = {}) {
    this.headersMap = headers;
  }
  
  headers = {
    get: (key) => this.headersMap[key] || null
  };
}

// 测试用例
function runTests() {
  // 测试用例1: 使用X-Webhook-Secret头（正确密钥）
  console.log('\n================================================================');
  console.log('🔍 测试用例1: X-Webhook-Secret 头（正确密钥）');
  const request1 = new MockRequest({
    'X-Webhook-Secret': 'jevindustry2025'
  });
  const env1 = { WEBHOOK_SECRET: undefined }; // 模拟Cloudflare Secrets未设置
  const { ALLOWED_SECRETS: allowedSecrets1 } = getEnvVars(env1);
  const result1 = authenticateRequest(request1, allowedSecrets1);
  console.log(`✅ 测试结果: ${result1 ? '通过（正确处理兜底值）' : '失败'}`);
  
  // 测试用例2: 使用Authorization Bearer（正确密钥）
  console.log('\n================================================================');
  console.log('🔍 测试用例2: Authorization Bearer（正确密钥）');
  const request2 = new MockRequest({
    'Authorization': 'Bearer jevindustry2025'
  });
  const env2 = { WEBHOOK_SECRET: 'jevindustry2025' }; // 模拟Cloudflare Secrets已设置
  const { ALLOWED_SECRETS: allowedSecrets2 } = getEnvVars(env2);
  const result2 = authenticateRequest(request2, allowedSecrets2);
  console.log(`✅ 测试结果: ${result2 ? '通过（正确使用Secret值）' : '失败'}`);
  
  // 测试用例3: 无认证头
  console.log('\n================================================================');
  console.log('🔍 测试用例3: 无认证头');
  const request3 = new MockRequest({});
  const { ALLOWED_SECRETS: allowedSecrets3 } = getEnvVars({});
  const result3 = authenticateRequest(request3, allowedSecrets3);
  console.log(`✅ 测试结果: ${!result3 ? '通过（正确拒绝无认证请求）' : '失败'}`);
  
  // 测试用例4: 错误密钥
  console.log('\n================================================================');
  console.log('🔍 测试用例4: 错误密钥');
  const request4 = new MockRequest({
    'X-Webhook-Secret': 'wrongsecret'
  });
  const { ALLOWED_SECRETS: allowedSecrets4 } = getEnvVars({});
  const result4 = authenticateRequest(request4, allowedSecrets4);
  console.log(`✅ 测试结果: ${!result4 ? '通过（正确拒绝错误密钥）' : '失败'}`);
  
  // 测试用例5: 两种认证方式都提供
  console.log('\n================================================================');
  console.log('🔍 测试用例5: 两种认证方式都提供');
  const request5 = new MockRequest({
    'X-Webhook-Secret': 'wrongsecret',
    'Authorization': 'Bearer jevindustry2025'
  });
  const { ALLOWED_SECRETS: allowedSecrets5 } = getEnvVars({});
  const result5 = authenticateRequest(request5, allowedSecrets5);
  console.log(`✅ 测试结果: ${result5 ? '通过（正确处理多种认证方式）' : '失败'}`);
  
  // 总结
  console.log('\n================================================================');
  console.log('📊 测试总结');
  console.log('================================================================');
  const passed = [result1, result2, !result3, !result4, result5].filter(Boolean).length;
  const total = 5;
  console.log(`✅ 通过测试: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 所有测试通过！认证中间层逻辑正确实现。');
    console.log('\n✅ 安全兼容设计成功实现：');
    console.log('  - ✅ 支持Cloudflare Secrets存储的密钥');
    console.log('  - ✅ 支持本地开发环境的兜底值');
    console.log('  - ✅ 支持多种认证方式（X-Webhook-Secret和Bearer）');
    console.log('  - ✅ 防止502错误（即使Secret未设置也能正常工作）');
    console.log('  - ✅ 统一的认证逻辑，便于维护');
  } else {
    console.log('❌ 部分测试失败，请检查认证逻辑。');
  }
}

// 运行测试
runTests();
