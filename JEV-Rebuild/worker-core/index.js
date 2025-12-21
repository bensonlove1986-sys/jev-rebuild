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
  
  // 新增：获取客户列表（/api/inbox/customers）
  if (path === '/api/inbox/customers' && request.method === 'GET') {
    try {
      const customers = [];
      
      // 从 KV 中读取客户索引
      if (env.MESSAGES) {
        // 遍历 KV 中所有客户索引
        const keys = await env.MESSAGES.list({
          prefix: 'inbox:customers:index:',
          limit: 100
        });
        
        // 批量获取客户详情
        for (const key of keys.keys) {
          // 从 key 中提取 customerId（格式：inbox:customers:index:customerId）
          const customerId = key.name.replace('inbox:customers:index:', '');
          const customerRaw = await env.MESSAGES.get(`inbox:customer:${customerId}`);
          
          if (customerRaw) {
            const customer = JSON.parse(customerRaw);
            customers.push(customer);
          }
        }
      }
      
      // 构造响应
      const response = new Response(JSON.stringify({
        ok: true,
        customers: customers
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error getting customers:', error);
      return new Response(JSON.stringify({
        ok: false,
        error: 'Failed to get customers'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  // 新增：翻译消息接口 POST /api/translate/message
  if (path === '/api/translate/message' && request.method === 'POST') {
    try {
      // 从请求体读取原文
      const body = await request.json();
      const text = body.text || '';
      
      // 强制日志：TRANSLATE_REQUEST
      console.log('[TRANSLATE_REQUEST] text=' + text.slice(0, 50) + '...');
      
      // 验证文本不为空
      if (!text.trim()) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'TEXT_IS_EMPTY'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // 验证环境变量
      if (!env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY_NOT_CONFIGURED');
      }
      
      // 调用 DeepSeek 翻译 API
      const response = await fetch('https://api.deepseek.com/v1/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          text: text,
          target_lang: 'zh-CN'
        })
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`DEEPSEEK_API_ERROR: ${JSON.stringify(errorBody)}`);
      }
      
      const result = await response.json();
      
      // 构造响应
      const translatedText = result.translated_text;
      const sourceLang = result.source_lang || 'auto';
      
      // 强制日志：TRANSLATE_RESULT
      console.log('[TRANSLATE_RESULT] translated_text=' + translatedText.slice(0, 50) + '...');
      
      return new Response(JSON.stringify({
        ok: true,
        source_lang: sourceLang,
        translated_text: translatedText
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('[TRANSLATE_ERROR]', error);
      return new Response(JSON.stringify({
        ok: false,
        error: error.message || 'TRANSLATE_ERROR'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  // 404
  return new Response(JSON.stringify({
    ok: false,
    error: 'ROUTE_NOT_HANDLED',
    path
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json'
    }
  });
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
