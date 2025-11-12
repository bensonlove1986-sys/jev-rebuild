// Cloudflare Worker for JEV Auto-Quote System
// 自动识别+报价系统 Worker端

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 处理所有请求
async function handleRequest(request) {
  // 设置CORS响应头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return new Response('', {
      headers: corsHeaders
    });
  }

  try {
    // 解析URL
    const url = new URL(request.url);
    
    // 处理/analyze-image接口
    if (url.pathname === '/analyze-image') {
      return handleAnalyzeImage(request, corsHeaders);
    }

    // 处理/status接口
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({ worker_ok: true, message: 'JEV Auto-Quote Worker is running' }), {
        headers: corsHeaders
      });
    }

    // 返回404错误
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    // 错误处理
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 处理图片分析请求
async function handleAnalyzeImage(request, corsHeaders) {
  try {
    // 解析请求参数
    const body = await request.json();
    const imageUrl = body.image_url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing image_url parameter' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 转发请求到本地AI服务
    const aiServiceUrl = 'http://127.0.0.1:1822/analyze-image';
    const aiResponse = await fetch(aiServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image_url: imageUrl })
    });

    // 检查本地AI服务响应
    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    // 获取AI服务的响应数据
    const aiData = await aiResponse.json();

    // 统一返回格式
    const responseData = {
      success: true,
      recognized_text: aiData.recognized_text || '',
      matched: aiData.matched || [],
      summary: aiData.summary || { total_items: 0, total_value: 0 },
      processing_time: aiData.processing_time || 'unknown'
    };

    return new Response(JSON.stringify(responseData), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error in analyze-image:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      recognized_text: '',
      matched: [],
      summary: { total_items: 0, total_value: 0 }
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 记录日志函数
function log(message, level = 'info') {
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
}