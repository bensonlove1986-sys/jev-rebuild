// JEV 客户端桥接同步 Worker

// 配置 CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Token, X-System-Layer',
  'Access-Control-Max-Age': '86400',
};

// 处理 OPTIONS 请求
function handleOptions(request) {
  if (
    request.method === 'OPTIONS' &&
    request.headers.has('Access-Control-Request-Method')
  ) {
    return new Response(null, {
      headers: {
        ...corsHeaders,
      },
    });
  }
  return null;
}

// 处理请求
async function handleRequest(request) {
  // 检查 OPTIONS 请求
  const optionsResponse = handleOptions(request);
  if (optionsResponse) {
    return optionsResponse;
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 广播消息端点
  if (path === '/bridge/broadcast') {
    if (request.method === 'POST') {
      // 存储广播消息
      try {
        const message = await request.json();
        const messageId = `broadcast_${Date.now()}`;
        await KV_JEV_BRIDGE.put(messageId, JSON.stringify(message));
        return new Response(JSON.stringify({ success: true, messageId }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    } else if (request.method === 'GET') {
      // 获取最新广播消息
      try {
        const messages = await KV_JEV_BRIDGE.list({ prefix: 'broadcast_' });
        const latestMessages = [];
        
        for (const key of messages.keys) {
          const message = await KV_JEV_BRIDGE.get(key.name);
          if (message) {
            latestMessages.push(JSON.parse(message));
          }
        }
        
        return new Response(JSON.stringify(latestMessages), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }
  }

  // 代理同步端点
  if (path === '/bridge/sync' && request.method === 'POST') {
    try {
      // 从请求中获取目标URL和数据
      const { targetUrl, data } = await request.json();
      
      // 验证目标URL只允许访问指定Worker
      if (!targetUrl.includes('jevshop.bensonlove1986.workers.dev')) {
        return new Response(JSON.stringify({ error: 'Unauthorized target URL' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
      
      // 转发请求到目标URL，添加安全头部
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': 'jev-secure-key-001',
          'X-System-Layer': 'plugin',
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      return new Response(JSON.stringify(responseData), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  }

  // 默认响应
  return new Response('Not Found', {
    status: 404,
    headers: corsHeaders,
  });
}

// 监听 fetch 事件
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});