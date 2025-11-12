// JEV-UI-Origin-v9.3 Cloudflare Worker 入口文件

/**
 * 响应帮助函数
 */
const respond = (status, body, headers = {}) => {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      ...headers
    }
  });
};

/**
 * 处理静态文件请求
 */
async function handleStaticFile(request, env) {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // 移除 /ui/ 前缀
  if (path.startsWith('/ui/')) {
    path = path.slice(4);
  }
  
  // 如果路径为空，提供 index.html
  if (path === '' || path === '/') {
    path = 'index.html';
  }
  
  // 添加 .html 扩展名（如果需要）
  if (!path.includes('.') && !path.endsWith('/')) {
    path += '.html';
  }
  
  try {
    // 尝试从绑定的静态目录获取文件
    const file = await env.public.get(path);
    if (!file) {
      return respond(404, JSON.stringify({ error: 'File not found' }));
    }
    
    // 确定内容类型
    let contentType = 'text/plain';
    if (path.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (path.endsWith('.css')) contentType = 'text/css';
    else if (path.endsWith('.js')) contentType = 'application/javascript';
    else if (path.endsWith('.json')) contentType = 'application/json';
    else if (path.endsWith('.png')) contentType = 'image/png';
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (path.endsWith('.gif')) contentType = 'image/gif';
    else if (path.endsWith('.svg')) contentType = 'image/svg+xml';
    
    // 返回文件内容
    return new Response(file.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return respond(500, JSON.stringify({ error: 'Internal server error' }));
  }
}

/**
 * 处理API请求
 */
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理 /ping 端点
  if (path === '/ping' || path === '/ui/ping') {
    return respond(200, JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: 'v9.3',
      environment: env.DEPLOY_ENV || 'development'
    }));
  }
  
  // 处理 /status 端点
  if (path === '/status' || path === '/ui/status') {
    return respond(200, JSON.stringify({
      status: 'running',
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
      memory_usage: 'N/A',
      cpu_load: 'N/A',
      last_update: new Date().toISOString()
    }));
  }
  
  // 处理 /analyze-image 端点
  if (path === '/analyze-image' || path === '/ui/analyze-image') {
    // 检查请求方法
    if (request.method !== 'POST') {
      return respond(405, JSON.stringify({ error: 'Method not allowed' }));
    }
    
    try {
      // 读取请求体
      const formData = await request.formData();
      const image = formData.get('image');
      
      // 验证图像
      if (!image) {
        return respond(400, JSON.stringify({ error: 'No image provided' }));
      }
      
      // 模拟分析延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回模拟分析结果
      return respond(200, JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        analysis_time: '1.2s',
        results: {
          image_type: image.type || 'unknown',
          image_size: image.size || 0,
          resolution: '800x600',
          detected_elements: ['text', 'graphics'],
          text_blocks: 5,
          confidence: 0.95
        },
        recommendations: [
          'Optimize image for web display',
          'Consider text extraction for better searchability'
        ]
      }));
    } catch (error) {
      console.error('Error analyzing image:', error);
      return respond(500, JSON.stringify({ error: 'Failed to analyze image' }));
    }
  }
  
  // 处理认证相关端点
  if (path.startsWith('/auth/')) {
    const authPath = path.slice(6); // 移除 /auth/ 前缀
    
    switch (authPath) {
      case 'login':
        if (request.method !== 'POST') {
          return respond(405, JSON.stringify({ error: 'Method not allowed' }));
        }
        
        try {
          const data = await request.json();
          
          // 简单验证（实际应用中应连接到真实认证系统）
          if (data.username && data.password) {
            return respond(200, JSON.stringify({
              success: true,
              token: 'mock-jwt-token-' + Date.now(),
              refresh_token: 'mock-refresh-token-' + Date.now(),
              user: {
                id: '1',
                username: data.username,
                role: 'user',
                permissions: ['read', 'write']
              }
            }));
          } else {
            return respond(401, JSON.stringify({ error: 'Invalid credentials' }));
          }
        } catch (error) {
          return respond(400, JSON.stringify({ error: 'Invalid request format' }));
        }
        
      case 'logout':
        return respond(200, JSON.stringify({ success: true, message: 'Logged out successfully' }));
        
      case 'user':
        return respond(200, JSON.stringify({
          id: '1',
          username: 'demo_user',
          role: 'user',
          email: 'demo@example.com',
          last_login: new Date(Date.now() - 86400000).toISOString(),
          permissions: ['read', 'write']
        }));
        
      default:
        return respond(404, JSON.stringify({ error: 'Auth endpoint not found' }));
    }
  }
  
  // 处理仪表板数据端点
  if (path === '/api/dashboard' || path === '/ui/api/dashboard') {
    return respond(200, JSON.stringify({
      stats: {
        total_files: 258,
        processed_files: 258,
        success_rate: '98.5%',
        average_processing_time: '2.3s'
      },
      charts: {
        daily_activity: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [35, 42, 28, 51, 47, 29, 33]
        },
        processing_time: {
          min: 0.5,
          max: 8.2,
          average: 2.3,
          p95: 4.1
        }
      },
      recent_activities: [
        {
          id: '1',
          type: 'file_processed',
          description: 'Invoice-2024.pdf processed successfully',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'success'
        },
        {
          id: '2',
          type: 'user_login',
          description: 'User demo_user logged in',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'success'
        }
      ]
    }));
  }
  
  // 处理系统信息端点
  if (path === '/api/system' || path === '/ui/api/system') {
    return respond(200, JSON.stringify({
      version: 'v9.3',
      build: '20240101.001',
      environment: env.DEPLOY_ENV || 'development',
      services: {
        api: 'online',
        database: 'online',
        cache: 'online',
        storage: 'online'
      },
      resources: {
        memory: {
          used: '512MB',
          total: '1GB',
          percentage: '50%'
        },
        cpu: {
          usage: '25%',
          cores: 4
        },
        storage: {
          used: '25GB',
          total: '100GB',
          percentage: '25%'
        }
      },
      uptime: '45d 12h 30m',
      last_restart: new Date(Date.now() - 3888000000).toISOString(),
      maintenance_mode: false
    }));
  }
  
  // 处理活动日志端点
  if (path === '/api/activities' || path === '/ui/api/activities') {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    return respond(200, JSON.stringify({
      total: 156,
      page,
      limit,
      activities: Array.from({ length: limit }, (_, i) => ({
        id: `${page * limit - limit + i + 1}`,
        type: ['file_upload', 'file_processed', 'user_login', 'user_logout', 'system_update'][Math.floor(Math.random() * 5)],
        description: `Activity ${page * limit - limit + i + 1} description`,
        user: 'demo_user',
        timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
        status: ['success', 'warning', 'error'][Math.floor(Math.random() * 3)],
        details: {}
      }))
    }));
  }
  
  // API端点未找到
  return respond(404, JSON.stringify({ error: 'API endpoint not found' }));
}

/**
 * 处理OPTIONS请求（CORS预检）
 */
function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * 主请求处理函数
 */
async function handleRequest(request, env) {
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  const url = new URL(request.url);
  
  // 处理API请求
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/auth/') || 
      url.pathname.startsWith('/ping') || 
      url.pathname.startsWith('/status') || 
      url.pathname.startsWith('/analyze-image') ||
      url.pathname.startsWith('/ui/api/') || 
      url.pathname.startsWith('/ui/auth/') || 
      url.pathname.startsWith('/ui/ping') || 
      url.pathname.startsWith('/ui/status') || 
      url.pathname.startsWith('/ui/analyze-image')) {
    return handleApiRequest(request, env);
  }
  
  // 处理静态文件请求
  return handleStaticFile(request, env);
}

/**
 * Worker入口点
 */
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Unhandled error:', error);
      return respond(500, JSON.stringify({ error: 'Internal server error' }));
    }
  }
};

// 添加TypeScript类型定义（可选）
if (false) {
  export interface Env {
    public: R2Bucket;
    JEV_CONFIG: KVNamespace;
    STATE_LAYER: string;
    ANALYZE_IMAGE_URL: string;
    GREETING_MODE: string;
    DEPLOY_ENV: string;
  }
}