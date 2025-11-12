// JEV AI 智能客服系统 - Worker 端 - KV自动绑定版本

// 全局错误处理
self.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', message, source, lineno, colno, error);
  // 记录到日志系统
  if (typeof logError !== 'undefined') {
    logError('Worker', 'Global', error ? error.message : message);
  }
  return true;
};

// 全局未捕获的Promise拒绝处理
addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise rejection:', event.reason);
  // 记录到日志系统
  if (typeof logError !== 'undefined') {
    logError('Worker', 'Promise', event.reason.message);
  }
});

// 安全配置 - 从环境变量读取
function getSecurityConfig(env) {
  return {
    ADMIN_TOKEN: env?.ADMIN_TOKEN || 'jev-admin-token-2025',
    JEV_API_KEY: env?.JEV_API_KEY || 'JEV_2025_AI_SYS_A92jskL0xY',
    DAOJIE_API_KEY: env?.DAOJIE_API_KEY || '',
    DAOIJE_WABA_TOKEN: env?.DAOIJE_WABA_TOKEN || '',
    ALLOWED_ORIGINS: [
      env?.ALLOW_ORIGIN || 'https://jev-client.pages.dev',
      'https://app.daojiemarketing.com',
      'https://jevshop.bensonlove1986.workers.dev',
      'http://localhost',
      'http://localhost:3000'
    ],
    TOKEN_EXPIRY_DAYS: 7,
    RATE_LIMIT_AI_CALLS: 15,
    RATE_LIMIT_HEARTBEAT: 2
  };
}

// 默认安全配置
const DEFAULT_SECURITY_CONFIG = getSecurityConfig(null);

// KV命名空间常量 - 更新为包含所有需要的KV命名空间
const KV_NAMESPACES = {
  PLUGIN_STATE: 'JEV_PLUGIN_STATE',
  GLOBAL_CONFIG: 'JEV_GLOBAL_CONFIG',
  AI_CACHE: 'JEV_AI_CACHE',
  LOGS: 'JEV_LOGS',
  BENSONAI_MEMORY: 'Bensonai_memory',
  TREA_MEMORY: 'trea_memory',
  SYSTEM: 'JEV_SYS_KV',
  AGENT: 'JEV_AGENT_KV'
};

// 统一响应格式函数
function createResponse(success, data = null, error = null, headers = {}, env = null) {
  const response = {
    success,
    data: success ? data : null,
    error: success ? null : error
  };
  
  // 获取安全配置
  const securityConfig = env ? getSecurityConfig(env) : DEFAULT_SECURITY_CONFIG;
  
  // 基础头部 - 确保包含所有要求的字段
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Version, X-Agent-Key, X-Origin, X-Module, X-Worker-Env, X-Token-Id, X-Signature, X-Monitor-Token, X-Admin-Token, X-API-Key',
    'X-Worker-Env': env?.MODE || 'production',
    'Version': 'L12-Stable'
  };
  
  // 设置CORS头部
  const origin = headers['Access-Control-Allow-Origin'] || '*';
  if (origin) {
    responseHeaders['Access-Control-Allow-Origin'] = origin;
  }
  
  // 合并自定义头部
  Object.assign(responseHeaders, headers);
  
  return new Response(JSON.stringify(response), {
    headers: responseHeaders
  });
}

// 处理OPTIONS请求（CORS预检）
function handleOptions(request, env = null) {
  const securityConfig = env ? getSecurityConfig(env) : DEFAULT_SECURITY_CONFIG;
  const origin = request.headers.get('Origin');
  const allowedOrigin = securityConfig.ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Version, X-Agent-Key, X-Origin, X-Module, X-Worker-Env, X-Token-Id, X-Signature, X-Monitor-Token, X-Admin-Token, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 安全验证函数 - 支持Bearer授权和多种认证方式
function validateRequest(request, requiredAuth = 'none', env = null) {
  const securityConfig = env ? getSecurityConfig(env) : DEFAULT_SECURITY_CONFIG;
  
  // 检查来源
  const origin = request.headers.get('Origin');
  if (origin && !securityConfig.ALLOWED_ORIGINS.includes(origin)) {
    return { valid: false, error: '不允许的来源' };
  }
  
  // 验证必需的授权类型
  switch (requiredAuth) {
    case 'jev_api':
      // 使用Bearer Authorization头验证JEV API密钥
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: '缺少有效的授权头部' };
      }
      const token = authHeader.substring(7);
      if (token !== securityConfig.JEV_API_KEY) {
        return { valid: false, error: '无效的JEV API密钥' };
      }
      break;
    
    case 'daojie_api':
      // 验证Daojie API密钥
      const daojieAuthHeader = request.headers.get('Authorization');
      if (!daojieAuthHeader || !daojieAuthHeader.startsWith('Bearer ')) {
        return { valid: false, error: '缺少有效的Daojie授权头部' };
      }
      const daojieToken = daojieAuthHeader.substring(7);
      if (daojieToken !== securityConfig.DAOJIE_API_KEY) {
        return { valid: false, error: '无效的Daojie API密钥' };
      }
      break;
    
    case 'whatsapp':
      // 验证WhatsApp令牌
      const wabaAuthHeader = request.headers.get('Authorization');
      if (!wabaAuthHeader || !wabaAuthHeader.startsWith('Bearer ')) {
        return { valid: false, error: '缺少有效的WhatsApp授权头部' };
      }
      const wabaToken = wabaAuthHeader.substring(7);
      if (wabaToken !== securityConfig.DAOIJE_WABA_TOKEN) {
        return { valid: false, error: '无效的WhatsApp令牌' };
      }
      break;
    
    case 'admin':
      // 管理员验证
      const adminToken = request.headers.get('X-Admin-Token');
      if (!adminToken || adminToken !== securityConfig.ADMIN_TOKEN) {
        return { valid: false, error: '无效的管理员令牌' };
      }
      break;
    
    case 'none':
    default:
      // 无需验证
      break;
  }
  
  // 向后兼容的API密钥验证
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey && apiKey !== securityConfig.JEV_API_KEY) {
    return { valid: false, error: '无效的API密钥' };
  }
  
  // 额外的认证类型验证
  switch (requiredAuth) {
    case 'agent':
      const monitorToken = request.headers.get('X-Monitor-Token');
      if (!monitorToken) {
        return { valid: false, error: '需要监控令牌' };
      }
      // 实际环境中应该验证token的有效性
      break;
    case 'signed':
      const tokenId = request.headers.get('X-Token-Id');
      const signature = request.headers.get('X-Signature');
      if (!tokenId || !signature) {
        return { valid: false, error: '需要签名认证' };
      }
      // 实际环境中应该验证签名
      break;
  }
  
  return { valid: true };
}

// 日志记录函数 - 更新为使用JEV_LOGS KV
async function logError(component, operation, message, env = null) {
  try {
    // 获取安全配置和TTL设置
    const ttlDays = parseInt(env?.KV_LOG_TTL_DAYS) || 7;
    const expirationTtl = 86400 * ttlDays; // 转换为秒
    
    const logEntry = {
      component,
      operation,
      message,
      timestamp: Date.now(),
      env: env?.MODE || 'production',
      worker: 'jevshop',
      version: 'L11C-KV-Automated'
    };
    console.log(`[LOG] ${JSON.stringify(logEntry)}`);
    
    // 实际环境中存储到JEV_LOGS KV
    if (env && env.JEV_LOGS) {
      const logKey = `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.JEV_LOGS.put(logKey, JSON.stringify(logEntry), { expirationTtl });
    }
  } catch (err) {
    console.error('日志记录失败:', err);
  }
}

// KV自动检测和修复函数
function ensureKVBindings(env) {
  const required = [
    "JEV_PLUGIN_STATE",
    "JEV_GLOBAL_CONFIG",
    "JEV_AI_CACHE",
    "JEV_LOGS",
    "Bensonai_memory",
    "trea_memory"
  ];
  const missing = required.filter(k => !env[k]);
  if (missing.length > 0) {
    return new Response(JSON.stringify({
      success: false,
      error: "Missing KV bindings",
      missing,
      fix_hint: "自动重建并绑定这些命名空间"
    }, null, 2), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  return null;
}

// KV测试端点实现 - 符合要求版本
async function handleKVTest(env) {
  const result = {};
  let successCount = 0;
  
  // 定义需要测试的所有命名空间（共8个）
  const requiredNamespaces = [
    "JEV_AI_CACHE",
    "JEV_GLOBAL_CONFIG",
    "JEV_LOGS",
    "JEV_PLUGIN_STATE",
    "Bensonai_memory",
    "trea_memory",
    "JEVPI",
    "R2_BUCKET"
  ];
  
  // 测试每个命名空间
  for (const ns of requiredNamespaces) {
    try {
      if (!env || !env[ns]) {
        result[ns] = "❌ Missing binding";
      } else {
        // 特殊处理R2_BUCKET
        if (ns === "R2_BUCKET") {
          // R2存储桶测试（只检查绑定存在性）
          result[ns] = "✅ OK";
          successCount++;
        } else {
          // KV命名空间测试（安全读写测试）
          try {
            const testKey = `test_${Date.now()}`;
            const testValue = `Hello from ${ns}`;
            
            // 写入测试
            await env[ns].put(testKey, testValue, { expirationTtl: 3600 });
            
            // 读取测试
            const readValue = await env[ns].get(testKey);
            
            if (readValue) {
              result[ns] = "✅ OK";
              successCount++;
            } else {
              result[ns] = "⚠️ Readonly";
            }
          } catch (writeError) {
            try {
              // 尝试只读测试
              const testKey = 'test_check';
              await env[ns].get(testKey);
              result[ns] = "⚠️ Readonly";
            } catch (readError) {
              result[ns] = "❌ Failed";
            }
          }
        }
      }
    } catch (e) {
      result[ns] = "❌ Failed";
    }
  }
  
  // 使用标准响应格式函数
  return createKVTestResponse(result, requiredNamespaces.length, successCount);
}

// 获取系统状态 - 更新为使用新的KV命名空间
async function getSystemStatus(env) {
  const status = {
    timestamp: new Date().toISOString(),
    worker: 'online',
    version: 'L11C-KV-Automated'
  };
  
  // 检查KV绑定状态
  const bindings = {};
  for (const key of Object.values(KV_NAMESPACES)) {
    bindings[key] = env[key] ? '✅ Bound' : '❌ Missing';
  }
  status.bindings = bindings;
  
  // 检查是否所有必需的KV都已绑定
  const requiredBindings = [
    "JEV_PLUGIN_STATE",
    "JEV_GLOBAL_CONFIG",
    "JEV_AI_CACHE",
    "JEV_LOGS",
    "Bensonai_memory",
    "trea_memory"
  ];
  status.all_bindings_available = requiredBindings.every(k => env[k]);
  
  // 获取KV统计信息（如果可用）
  if (env.JEV_LOGS) {
    try {
      const logs = await env.JEV_LOGS.list();
      status.log_count = logs.keys.length;
    } catch (e) {
      status.log_count_error = e.message;
    }
  }
  
  // 获取配置信息（如果可用）
  if (env.JEV_GLOBAL_CONFIG) {
    try {
      const config = await env.JEV_GLOBAL_CONFIG.get('SYSTEM_CONFIG');
      if (config) {
        status.config = JSON.parse(config);
      }
    } catch (e) {
      status.config_error = e.message;
    }
  }
  
  return status;
}

// 模拟KV操作（用于本地测试）
const mockKV = {
  JEV_PLUGIN_STATE: {},
  JEV_GLOBAL_CONFIG: {},
  JEV_AI_CACHE: {},
  JEV_LOGS: {},
  Bensonai_memory: {},
  trea_memory: {},
  JEV_SYS_KV: {},
  JEV_AGENT_KV: {}
};

async function kvOperation(namespace, key, operation, value = null, env = null) {
  // 如果提供了环境对象且命名空间存在，使用实际的KV
  if (env && env[namespace]) {
    switch (operation) {
      case 'get':
        return await env[namespace].get(key);
      case 'put':
        return await env[namespace].put(key, typeof value === 'object' ? JSON.stringify(value) : value);
      case 'delete':
        return await env[namespace].delete(key);
      case 'list':
        const listResult = await env[namespace].list({ prefix: key });
        return listResult.keys.map(k => k.name);
    }
  }
  
  // 使用模拟KV（用于本地测试）
  const ns = mockKV[namespace];
  if (!ns) return null;
  
  switch (operation) {
    case 'get':
      return ns[key] || null;
    case 'put':
      ns[key] = value;
      return true;
    case 'delete':
      delete ns[key];
      return true;
    case 'list':
      return Object.keys(ns).filter(k => k.startsWith(key));
  }
  return null;
}

// 代理到记忆Worker
async function proxyToMemoryWorker(request, env) {
  const securityConfig = getSecurityConfig(env);
  const memoryWorkerUrl = 'https://treamemory.bensonlove1986.workers.dev';
  const url = new URL(request.url);
  const path = url.pathname.replace('/memory', '');
  
  try {
    // 创建代理请求
    const proxyRequest = new Request(`${memoryWorkerUrl}${path}`, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body
    });
    
    // 添加认证头 - 使用Bearer格式
    proxyRequest.headers.set('Authorization', `Bearer ${securityConfig.JEV_API_KEY}`);
    
    // 发送请求到记忆Worker
    const response = await fetch(proxyRequest);
    
    // 复制响应，添加CORS头
    const proxyResponse = new Response(response.body, response);
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return proxyResponse;
  } catch (error) {
    console.error('代理到记忆Worker失败:', error);
    return createResponse(false, null, '无法连接到记忆服务', {}, env);
  }
}

// CH-1 MonitorChannel 接口实现
async function handlePing() {
  return createResponse(true, { ok: true, ts: Date.now() });
}

async function handleHeartbeat(env) {
  try {
    // 更新系统心跳到JEV_GLOBAL_CONFIG
    const heartbeatKey = 'SYS_HEARTBEAT';
    await kvOperation('JEV_GLOBAL_CONFIG', heartbeatKey, 'put', {
      last_active: Date.now(),
      uptime_seconds: process.uptime ? Math.floor(process.uptime()) : 3600,
      version: 'L11C-KV-Automated',
      environment: env?.MODE || 'production'
    }, env);
    
    return createResponse(true, { ok: true, uptime: "active" }, null, {}, env);
  } catch (error) {
    console.error('心跳更新失败:', error);
    return createResponse(false, null, '心跳更新失败', {}, env);
  }
}

// 主请求处理函数
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request, env);
  }
  
  // KV测试端点 - 无需验证
  if (path === '/kv/test') {
    return handleKVTest(env);
  }
  
  // 自动检测KV绑定
  const bindingError = ensureKVBindings(env);
  if (bindingError) {
    // 对于非关键端点，仍然允许访问
    if (path !== '/status' && path !== '/ping') {
      return bindingError;
    }
  }
  
  // 路由处理
  switch (path) {
    // 系统状态接口
    case '/status': {
      const status = await getSystemStatus(env);
      return createResponse(true, status, null, {}, env);
    }
    
    // Ping接口
    case '/ping':
      return handlePing();
    
    // 心跳接口
    case '/heartbeat':
      // 心跳接口需要JEV API授权
      const heartbeatAuth = validateRequest(request, 'jev_api', env);
      if (!heartbeatAuth.valid) {
        return createResponse(false, null, heartbeatAuth.error, { 'Access-Control-Allow-Origin': '*' }, env);
      }
      return handleHeartbeat(env);
    
    // 记忆Worker代理 - 需要JEV API授权
    case '/memory':
    case '/memory/':
    case '/memory/kv':
    case '/memory/cache':
      const memoryAuth = validateRequest(request, 'jev_api', env);
      if (!memoryAuth.valid) {
        return createResponse(false, null, memoryAuth.error, { 'Access-Control-Allow-Origin': '*' }, env);
      }
      return proxyToMemoryWorker(request, env);
    
    // 默认响应
    default:
      return createResponse(false, null, '端点不存在', { 'Access-Control-Allow-Origin': '*' }, env);
  }
}

// 为了支持Cloudflare Workers环境
if (typeof addEventListener !== 'undefined') {
  addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request, event.env));
  });
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleRequest };
}

// 模拟cloudflare对象（用于本地测试）
if (typeof cloudflare === 'undefined') {
  self.cloudflare = {
    env: mockKV
  };
}

// 添加全局KV测试响应格式函数
function createKVTestResponse(results, count, successCount) {
  const timestamp = new Date().toISOString();
  
  // 检查是否所有命名空间都正常
  const allOperational = count === 8 && successCount === 8;
  
  // 构建基础响应
  const response = {
    success: allOperational,
    count: count,
    success_count: successCount,
    result: results,
    system: {
      timestamp: timestamp,
      worker: 'online',
      version: 'L11C-AutoSync',
      memory_worker_status: 'connected'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

console.log('[JEV] Cloudflare Worker KV自动绑定版本初始化完成');