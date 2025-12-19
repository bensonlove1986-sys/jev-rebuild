// Worker 入口文件 - 只做路由注册

import { ROUTES, CORS_CONFIG } from './config/constants.js';
import { pingHandler } from './routes/ping.js';
import { statusHandler } from './routes/status.js';
import { websocketHandler } from './routes/websocket.js';
import { handleDaojieInbound, getConversations, getConversationMessages, replyToCustomer, generateDraftReply } from './routes/daojie.js';
import { info } from './modules/trace.js';

// 记录 Worker 启动时间
globalThis.workerStartTimestamp = Date.now();

// 辅助函数：创建统一格式的错误响应
function createErrorResponse(error, status = 500) {
  return new Response(JSON.stringify({
    success: false,
    error: error.message || error
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 辅助函数：添加CORS头
function addCorsHeaders(response, requestOrigin) {
  // 检查请求来源是否在允许列表中
  const allowedOrigin = CORS_CONFIG.ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : 'http://localhost:3000';
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': CORS_CONFIG.ALLOWED_METHODS,
    'Access-Control-Allow-Headers': CORS_CONFIG.ALLOWED_HEADERS,
    'Access-Control-Max-Age': CORS_CONFIG.MAX_AGE.toString(),
  };
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// 处理请求
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 显式注册路由
  if (path === ROUTES.PING) {
    return pingHandler(request, env);
  }
  
  if (path === ROUTES.STATUS) {
    return statusHandler(request, env);
  }
  
  if (path === ROUTES.WEBSOCKET) {
    return websocketHandler(request, env);
  }
  
  // 显式注册 Daojie 入站路由
  if (path === ROUTES.DAOJIE_INBOUND && request.method === 'POST') {
    return handleDaojieInbound(request, env);
  }
  
  // 获取会话列表
  if (path === ROUTES.DAOJIE_CONVERSATIONS && request.method === 'GET') {
    return getConversations(request, env);
  }
  
  // 获取会话消息列表
  if (path.startsWith('/api/daojie/conversations/') && path.endsWith('/messages') && request.method === 'GET') {
    return getConversationMessages(request, env);
  }
  
  // 回复客户
  if (path.startsWith('/api/daojie/conversations/') && path.endsWith('/messages') && request.method === 'POST') {
    return replyToCustomer(request, env);
  }
  
  // AI 生成回复草稿
  if (path === ROUTES.AI_DRAFT_REPLY && request.method === 'POST') {
    return generateDraftReply(request, env);
  }
  
  // 404
  return createErrorResponse('Not found', 404);
}

// Worker 入口
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const upgrade = request.headers.get('Upgrade');
    
    // ====== HARD STOP DAOJIE WS ====== 
    if (url.pathname === '/ws/daojie' || upgrade === 'websocket') {
      return new Response('WS disabled', { status: 410 });
    }
    // =================================
    
    const requestOrigin = request.headers.get('Origin') || 'http://localhost:3000';
    
    // 处理 CORS OPTIONS 请求
    if (request.method === 'OPTIONS') {
      const response = new Response(null, {
        status: 204
      });
      return addCorsHeaders(response, requestOrigin);
    }
    
    try {
      // 处理实际请求
      let response = await handleRequest(request, env);
      
      // 添加 CORS 头
      response = addCorsHeaders(response, requestOrigin);
      
      return response;
    } catch (error) {
      info('Unhandled error', { error: error.message });
      
      // 创建错误响应
      let errorResponse = createErrorResponse(error);
      
      // 添加 CORS 头
      errorResponse = addCorsHeaders(errorResponse, requestOrigin);
      
      return errorResponse;
    }
  }
};
