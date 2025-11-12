// JEV AI 智能客服系统 - Durable Objects 主入口

// 导入Durable Objects类
import { SessionStore, Counter } from './durable_objects/SessionStore.js';

// 导入消息处理器
const { handleMessageIngest, getMessageStats, getMessageDetails } = require('./handlers/messageIngestHandler.js');

// 导入原有worker处理逻辑
import { handleRequest as originalHandleRequest } from './worker.js';

// Bridge同步处理函数
async function handleBridgeSync(request, env) {
  try {
    // 验证请求头
    const authToken = request.headers.get('X-JEV-Token');
    const bridgeId = request.headers.get('X-Bridge-ID');
    
    if (!authToken || !bridgeId) {
      return createResponse(false, null, '缺少必要的认证头信息');
    }
    
    // 验证令牌（这里简单验证，实际应使用更安全的方式）
    const validToken = env.JEV_MASTER_KEY || 'default_jev_master_key';
    if (authToken !== validToken) {
      return createResponse(false, null, '认证失败，无效的令牌');
    }
    
    // 解析请求体
    const body = await request.json();
    const { sessionId, memory } = body;
    
    if (!sessionId || !memory) {
      return createResponse(false, null, '缺少必要的sessionId或memory字段');
    }
    
    // 写入Durable Object
    try {
      const sessionStoreId = env.SESSION_STORE.idFromName(sessionId);
      const sessionStore = env.SESSION_STORE.get(sessionStoreId);
      
      // 设置会话数据
      await sessionStore.fetch('/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: memory })
      });
      
      // 记录同步成功
      console.log(`[DurableBridge] 会话 ${sessionId} 同步成功`);
      
      // 返回成功响应
      return createResponse(true, {
        status: 'ok',
        syncedAt: new Date().toISOString()
      });
      
    } catch (durableError) {
      console.error(`[DurableBridge] 写入Durable Object失败:`, durableError);
      return createResponse(false, null, '会话同步失败: ' + durableError.message);
    }
    
  } catch (error) {
    console.error(`[DurableBridge] 同步请求处理失败:`, error);
    return createResponse(false, null, '请求处理失败: ' + error.message);
  }
}

// Bridge报告处理函数
async function handleBridgeReport(request, env) {
  try {
    // 验证请求头
    const authToken = request.headers.get('X-JEV-Token');
    const bridgeId = request.headers.get('X-Bridge-ID');
    
    if (!authToken || !bridgeId) {
      return createResponse(false, null, '缺少必要的认证头信息');
    }
    
    // 解析报告数据
    const report = await request.json();
    
    // 记录报告
    console.log(`[DurableBridge] 收到报告:`, {
      syncedSessions: report.synced_sessions,
      avgLatency: report.avg_latency_ms,
      successRate: report.success_rate
    });
    
    // 可以将报告存储到KV或其他存储中
    // 这里简单返回成功
    return createResponse(true, {
      status: 'report_received',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[DurableBridge] 报告处理失败:`, error);
    return createResponse(false, null, '报告处理失败: ' + error.message);
  }
}

// 创建响应函数（兼容handler使用）
function createResponse(success, data = null, error = null, headers = {}, env = null) {
  const response = {
    success,
    data: success ? data : null,
    error: success ? null : error
  };
  
  // 基础头部
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-JEV-Token, X-Bridge-ID'
  };
  
  // 合并自定义头部
  Object.assign(responseHeaders, headers);
  
  return new Response(JSON.stringify(response), {
    headers: responseHeaders
  });
}

// 处理Durable Objects请求
async function handleDurableObjectRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 会话存储Durable Object
  if (path.startsWith('/session/')) {
    try {
      const sessionId = path.split('/')[2] || 'default';
      const sessionStoreId = env.SESSION_STORE.idFromName(sessionId);
      const sessionStore = env.SESSION_STORE.get(sessionStoreId);
      const objectUrl = new URL(request.url);
      objectUrl.pathname = path.replace('/session/' + sessionId, '');
      return await sessionStore.fetch(objectUrl.toString());
    } catch (error) {
      console.error('SessionStore error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Session store error: ' + error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 计数器Durable Object
  if (path.startsWith('/counter/')) {
    try {
      const counterId = path.split('/')[2] || 'default';
      const counterIdRef = env.COUNTER.idFromName(counterId);
      const counter = env.COUNTER.get(counterIdRef);
      const objectUrl = new URL(request.url);
      objectUrl.pathname = path.replace('/counter/' + counterId, '');
      return await counter.fetch(objectUrl.toString());
    } catch (error) {
      console.error('Counter error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Counter error: ' + error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return null;
}

// 测试端点处理函数
async function handleTestEndpoints(request, env) {
  const url = new URL(request.url);
  
  // API测试端点 - 测试Durable Objects
  if (url.pathname === '/api/test-durable-objects') {
    try {
      // 测试SessionStore
      const sessionStoreId = env.SESSION_STORE.idFromName('test');
      const sessionStore = env.SESSION_STORE.get(sessionStoreId);
      
      // 测试ping端点
      const pingResponse = await sessionStore.fetch('/ping');
      const pingData = await pingResponse.json();
      
      // 测试Counter
      const counterIdRef = env.COUNTER.idFromName('test');
      const counter = env.COUNTER.get(counterIdRef);
      
      // 增加计数
      await counter.fetch('/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: 1 })
      });
      
      // 获取当前计数
      const counterResponse = await counter.fetch('/get');
      const counterData = await counterResponse.json();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Durable Objects test successful',
        sessionStore: pingData,
        counter: counterData
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('Durable Objects test failed:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        message: 'Durable Objects test failed'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  return null;
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // CORS预检处理
      if (request.method === 'OPTIONS') {
        return new Response('', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }
      
      // 尝试Durable Object路由
      const durableObjectResponse = await handleDurableObjectRequest(request, env);
      if (durableObjectResponse) {
        return durableObjectResponse;
      }
      
          // 消息处理路由
      const url = new URL(request.url);
      
      // 根路径默认响应
      if (url.pathname === '/' || url.pathname === '') {
        return createResponse(true, {
          message: 'JEV AI智能客服系统 - 服务正常运行',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          endpoints: {
            ingest: '/messages/ingest',
            stats: '/messages/stats',
            details: '/messages/{messageId}'
          }
        }, null, {}, env);
      }
      
      // 消息接收端点
      if (url.pathname === '/messages/ingest') {
        console.log('处理消息接收请求');
        return await handleMessageIngest(request, env);
      }
      
      // 消息统计端点
      if (url.pathname === '/messages/stats') {
        return await getMessageStats(request, env);
      }
      
      // 消息详情端点
      if (url.pathname.startsWith('/messages/')) {
        return await getMessageDetails(request, env);
      }
      
      // Durable Bridge 端点
      // 会话同步端点
      if (url.pathname === '/bridge/sync' && request.method === 'POST') {
        return await handleBridgeSync(request, env);
      }
      
      // 报告数据提交端点
      if (url.pathname === '/bridge/report' && request.method === 'POST') {
        return await handleBridgeReport(request, env);
      }
      
      // 尝试测试端点
      const testResponse = await handleTestEndpoints(request, env);
      if (testResponse) {
        return testResponse;
      }
      
      // 如果原worker.js导出了handleRequest函数，则使用它处理其他请求
      if (typeof originalHandleRequest === 'function') {
        return await originalHandleRequest(request, env);
      }
      
      // 默认处理
      return new Response(JSON.stringify({
        success: false,
        error: 'Route not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

// 导出Durable Object类
export {
  SessionStore,
  Counter
};