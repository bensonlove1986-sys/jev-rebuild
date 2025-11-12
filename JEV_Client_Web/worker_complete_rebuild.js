/**
 * JEV Client Web Worker with Message Collection Support
 * 增强版：添加KV绑定支持、完整CORS配置和标准API端点
 */

// 添加临时的Durable Object类以满足依赖
export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ error: "This Durable Object is being deprecated" }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export class SessionStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ error: "This Durable Object is being deprecated" }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 全局配置
const CONFIG = {
  maxMessagesInMemory: 1000,
  defaultCacheTTL: 86400, // 24小时
  apiVersion: "v1.0.0",
  serviceName: "JEV Web Worker"
};

// 内存消息缓存 - 作为KV的补充
const MESSAGE_CACHE = new Map();

// KV存储操作助手
async function kvOperation(kvNamespace, key, operation, value = null, options = {}) {
  try {
    if (!kvNamespace) {
      console.warn(`KV命名空间未绑定: ${kvNamespace}`);
      return { success: false, error: 'KV namespace not available' };
    }
    
    switch (operation) {
      case 'get':
        const data = await kvNamespace.get(key, { type: 'json' });
        return { success: true, data };
      case 'put':
        await kvNamespace.put(key, JSON.stringify(value), options);
        return { success: true };
      case 'delete':
        await kvNamespace.delete(key);
        return { success: true };
      default: 
        return { success: false, error: 'Invalid operation' };
    }
  } catch (error) {
    console.error(`KV操作失败 ${operation} ${key}:`, error);
    return { success: false, error: error.message };
  }
}

// 处理消息接收端点 - 增强版支持KV存储
async function handleMessageIngest(request, env) {
  try {
    // 解析请求体
    const messageData = await request.json();
    
    // 验证消息数据
    if (!messageData || !messageData.content && !messageData.has_media) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Invalid message data' 
      }), {
        status: 400,
        headers: getResponseHeaders()
      });
    }
    
    // 生成消息ID（如果没有）
    const messageId = messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storedId = crypto.randomUUID();
    
    // 准备消息数据
    const finalMessage = {
      ...messageData,
      id: messageId,
      storedId: storedId,
      receivedAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    };
    
    // 保存到内存缓存
    MESSAGE_CACHE.set(messageId, finalMessage);
    
    // 如果缓存过大，删除最旧的消息
    if (MESSAGE_CACHE.size > CONFIG.maxMessagesInMemory) {
      const oldestKey = MESSAGE_CACHE.keys().next().value;
      MESSAGE_CACHE.delete(oldestKey);
    }
    
    // 尝试保存到KV存储（如果可用）
    if (env.JEV_AI_CACHE) {
      const kvResult = await kvOperation(
        env.JEV_AI_CACHE,
        `messages: ${messageId}`,
        'put',
        finalMessage,
        { expirationTtl: CONFIG.defaultCacheTTL }
      );
      
      if (kvResult.success) {
        console.log(`消息已保存到KV: ${messageId}`);
      } else {
        console.warn(`KV保存失败: ${kvResult.error}`);
      }
    }
    
    // 记录日志到JEV_LOGS（如果可用）
    if (env.JEV_LOGS) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Message received and processed`,
        data: {
          messageId,
          platform: messageData.platform,
          sender: messageData.sender,
          hasMedia: messageData.has_media
        }
      };
      
      await kvOperation(
        env.JEV_LOGS,
        `log: ${Date.now()}`,
        'put',
        logEntry,
        { expirationTtl: 30 * 86400 } // 30天
      );
    }
    
    // 构建成功响应
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Message received and stored',
      messageId: messageId,
      storedId: storedId,
      timestamp: finalMessage.receivedAt
    }), {
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    console.error('Error processing message: ', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: 'Failed to process message',
      error: error.message 
    }), {
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

// 获取响应头函数 - 统一管理所有HTTP头
function getResponseHeaders(additionalHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Daojie-Token, X-JEV-Session, Version, X-JEV-Auth-Signature',
    'Access-Control-Expose-Headers': 'Content-Type, X-Daojie-Token, X-JEV-Session, Version, X-JEV-Auth-Signature',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Version': CONFIG.apiVersion,
    'X-JEV-Service': CONFIG.serviceName,
    ...additionalHeaders
  };
}

// 生成安全签名
function generateAuthSignature() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const dataToSign = timestamp + ':' + nonce;
  
  // 在生产环境中，应该使用密钥进行HMAC签名
  // 这里使用简化实现
  const signature = Array.from(new TextEncoder().encode(dataToSign))
    .map(char => char.toString(16).padStart(2, '0'))
    .join('');
    
  return 'sig_' + timestamp + '_' + nonce + '_' + signature.substring(0, 16);
}

// 健康检查端点处理
async function handlePing() {
  return new Response(JSON.stringify({
    status: 'success',
    message: 'pong',
    timestamp: new Date().toISOString(),
    version: CONFIG.apiVersion
  }), {
    status: 200,
    headers: getResponseHeaders({
      'X-JEV-Auth-Signature': generateAuthSignature()
    })
  });
}

// 状态检查端点处理
async function handleStatus(env) {
  const kvStatus = {};
  const requiredBindings = ['JEV_AI_CACHE', 'JEV_LOGS', 'JEV_PLUGIN_STATE', 'Bensonai_memory'];
  
  // 检查所有KV绑定
  for (const binding of requiredBindings) {
    if (env[binding]) {
      kvStatus[binding] = 'bound';
    } else {
      kvStatus[binding] = 'missing';
    }
  }
  
  return new Response(JSON.stringify({
    status: 'success',
    service: CONFIG.serviceName,
    version: CONFIG.apiVersion,
    timestamp: new Date().toISOString(),
    uptime: Date.now() || 'unknown',
    memoryCacheSize: MESSAGE_CACHE.size,
    kvBindings: kvStatus,
    features: ['Message Collection', 'KV Storage', 'API Gateway']
  }), {
    status: 200,
    headers: getResponseHeaders({
      'X-JEV-Auth-Signature': generateAuthSignature(),
      'X-JEV-Session': crypto.randomUUID()
    })
  });
}

// KV测试端点
async function handleKvTest(request, env) {
  try {
    const testKey = 'test_key_' + Date.now();
    const testValue = { message: 'KV test successful', timestamp: new Date().toISOString() };
    
    // 尝试使用第一个可用的KV命名空间
    const kvNamespaces = Object.values(env).filter(value => 
      value && typeof value.get === 'function' && typeof value.put === 'function'
    );
    
    if (kvNamespaces.length === 0) {
      return new Response(JSON.stringify({
        status: 'warning',
        message: 'No KV namespaces available for testing',
        bindingsChecked: ['JEV_AI_CACHE', 'JEV_LOGS', 'JEV_PLUGIN_STATE', 'Bensonai_memory']
      }), {
        status: 200,
        headers: getResponseHeaders()
      });
    }
    
    const testNamespace = kvNamespaces[0];
    
    // 写入测试
    await testNamespace.put(testKey, JSON.stringify(testValue));
    
    // 读取测试
    const retrieved = await testNamespace.get(testKey, { type: 'json' });
    
    // 清理
    await testNamespace.delete(testKey);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'KV storage test passed',
      testDetails: {
        key: testKey,
        writeSuccessful: true,
        readSuccessful: retrieved !== null,
        dataMatched: JSON.stringify(retrieved) === JSON.stringify(testValue)
      }
    }), {
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'KV storage test failed',
      error: error.message
    }), {
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

// 模块清单端点
async function handleModulesManifest(env) {
  try {
    let manifest = {
      version: '1.0.0',
      modules: [
        {
          id: 'message-collector',
          name: 'Message Collector',
          version: '1.0.0',
          status: 'active'
        },
        {
          id: 'kv-storage',
          name: 'KV Storage Manager',
          version: '1.0.0',
          status: env.JEV_AI_CACHE ? 'active' : 'disabled'
        },
        {
          id: 'ai-bridge',
          name: 'AI Service Bridge',
          version: '1.0.0',
          status: 'active'
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // 如果有插件状态KV，尝试从中获取更多模块信息
    if (env.JEV_PLUGIN_STATE) {
      const pluginManifestResult = await kvOperation(env.JEV_PLUGIN_STATE, 'manifest', 'get');
      if (pluginManifestResult.success && pluginManifestResult.data) {
        manifest = {
          ...manifest,
          modules: [...manifest.modules, ...(pluginManifestResult.data.modules || [])]
        };
      }
    }
    
    return new Response(JSON.stringify({
      status: 'success',
      manifest
    }), {
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Failed to retrieve modules manifest',
      error: error.message
    }), {
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

// AI桥接端点
async function handleAIBridge(request, env) {
  try {
    const requestData = await request.json();
    
    // 简单的AI桥接逻辑
    const response = {
      status: 'success',
      message: 'AI bridge endpoint is working',
      requestReceived: requestData,
      availableServices: {
        google: env.GOOGLE_API_KEY ? true : false,
        deepseek: env.DEEPSEEK_API_KEY ? true : false
      },
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'AI bridge request failed',
      error: error.message
    }), {
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

// 获取消息统计信息
async function getMessageStats() {
  return new Response(JSON.stringify({
    status: 'success',
    stats: {
      totalMessages: MESSAGE_CACHE.size,
      platforms: Array.from(new Set([...MESSAGE_CACHE.values()].map(m => m.platform).filter(Boolean))),
      lastUpdated: new Date().toISOString(),
      version: CONFIG.apiVersion
    }
  }), {
    status: 200,
    headers: getResponseHeaders()
  });
}

// 创建简单的HTML模板内容
function getClientPortalHtml() {
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>JEV 客服控制台 v6.0.0</title>\n' +
    '<style>\n' +
    ':root {\n' +
    '  --primary-color: #4CAF50;\n' +
    '  --primary-light: #81C784;\n' +
    '  --primary-dark: #388E3C;\n' +
    '  --bg-color: #f5f7fa;\n' +
    '  --card-bg: rgba(255, 255, 255, 0.95);\n' +
    '  --text-primary: #333;\n' +
    '  --text-secondary: #666;\n' +
    '  --border-radius: 12px;\n' +
    '  --shadow: 0 8px 32px rgba(0, 0, 0, 0.1);\n' +
    '  --transition: all 0.3s ease;\n' +
    '  --border: 1px solid #e0e0e0;\n' +
    '}\n\n' +
    '* {\n' +
    '  margin: 0;\n' +
    '  padding: 0;\n' +
    '  box-sizing: border-box;\n' +
    '  font-family: \'Segoe UI\', \'PingFang SC\', \'Microsoft YaHei\', sans-serif;\n' +
    '}\n\n' +
    'body {\n' +
    '  background: linear-gradient(135deg, var(--bg-color) 0%, #e8f5e9 100%);\n' +
    '  min-height: 100vh;\n' +
    '  padding: 20px;\n' +
    '  position: relative;\n' +
    '  overflow-x: hidden;\n' +
    '}\n\n' +
    '.container {\n' +
    '  width: 100%;\n' +
    '  max-width: 1200px;\n' +
    '  margin: 0 auto;\n' +
    '}\n\n' +
    '.dashboard-header {\n' +
    '  background: var(--card-bg);\n' +
    '  backdrop-filter: blur(10px);\n' +
    '  border-radius: var(--border-radius);\n' +
    '  padding: 20px;\n' +
    '  margin-bottom: 20px;\n' +
    '  box-shadow: var(--shadow);\n' +
    '  border: var(--border);\n' +
    '}\n\n' +
    '.dashboard-title {\n' +
    '  font-size: 24px;\n' +
    '  font-weight: 600;\n' +
    '  color: var(--text-primary);\n' +
    '  margin-bottom: 16px;\n' +
    '  text-align: center;\n' +
    '}\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div class="container">\n' +
    '  <header class="dashboard-header">\n' +
    '    <h1 class="dashboard-title">JEV 客服控制台 v6.0.0</h1>\n' +
    '  </header>\n' +
    '</div>\n' +
    '</body>\n' +
    '</html>';
}

// 创建登录门户HTML内容
function getLoginPortalHtml() {
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>JEV 登录门户</title>\n' +
    '<style>\n' +
    'body {\n' +
    '  font-family: \'Segoe UI\', \'PingFang SC\', \'Microsoft YaHei\', sans-serif;\n' +
    '  background: #f5f7fa;\n' +
    '  display: flex;\n' +
    '  justify-content: center;\n' +
    '  align-items: center;\n' +
    '  height: 100vh;\n' +
    '  margin: 0;\n' +
    '}\n' +
    '.login-container {\n' +
    '  background: white;\n' +
    '  padding: 40px;\n' +
    '  border-radius: 8px;\n' +
    '  box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n' +
    '  width: 350px;\n' +
    '}\n' +
    '.login-title {\n' +
    '  text-align: center;\n' +
    '  margin-bottom: 30px;\n' +
    '  color: #333;\n' +
    '}\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div class="login-container">\n' +
    '  <h2 class="login-title">JEV 登录门户</h2>\n' +
    '</div>\n' +
    '</body>\n' +
    '</html>';
}

// 主请求处理函数
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: getResponseHeaders()
    });
  }
  
  // API端点路由
  if (path === '/api/message/ingest' && request.method === 'POST') {
    return handleMessageIngest(request, env);
  } else if (path === '/api/ping' && request.method === 'GET') {
    return handlePing();
  } else if (path === '/api/status' && request.method === 'GET') {
    return handleStatus(env);
  } else if (path === '/api/kv/test' && request.method === 'GET') {
    return handleKvTest(request, env);
  } else if (path === '/api/modules/manifest' && request.method === 'GET') {
    return handleModulesManifest(env);
  } else if (path === '/api/ai/bridge' && request.method === 'POST') {
    return handleAIBridge(request, env);
  } else if (path === '/api/stats/messages' && request.method === 'GET') {
    return getMessageStats();
  }
  
  // HTML页面路由
  else if (path === '/ui/client_portal.html' && request.method === 'GET') {
    return new Response(getClientPortalHtml(), {
      headers: {
        'Content-Type': 'text/html',
        ...getResponseHeaders()
      }
    });
  } else if (path === '/ui/login_portal.html' && request.method === 'GET') {
    return new Response(getLoginPortalHtml(), {
      headers: {
        'Content-Type': 'text/html',
        ...getResponseHeaders()
      }
    });
  }
  
  // 404处理
  return new Response(JSON.stringify({
    status: 'error',
    message: 'Endpoint not found'
  }), {
    status: 404,
    headers: getResponseHeaders()
  });
}

// 导出主处理函数
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
