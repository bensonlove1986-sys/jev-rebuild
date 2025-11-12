// router-worker.js - Cloudflare Worker 多节点路由器
// 功能：自动分流、重试、健康检测，确保识别线路永不堵塞

// 配置区域
const CONFIG = {
  // 子Worker节点列表
  workerNodes: [
    'https://jevshop.bensonlove1986.workers.dev'
  ],
  
  // 健康检查间隔（毫秒）
  healthCheckInterval: 60000,
  
  // 重试配置
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, // 基础延迟
    exponentialBackoff: true
  },
  
  // 安全配置
  security: {
    requireSecret: true,
    defaultSecrets: ['jevindustry2025'] // 可配置多个密钥
  }
};

// 运行时状态
let runtimeState = {
  // 节点健康状态
  nodeHealth: CONFIG.workerNodes.reduce((acc, node) => {
    acc[node] = {
      healthy: true,
      lastChecked: 0,
      errorCount: 0
    };
    return acc;
  }, {}),
  
  // 请求计数器
  requestCount: 0,
  
  // 最后健康检查时间
  lastHealthCheck: 0
};

// 健康检查函数
async function checkNodeHealth(node) {
  try {
    const start = Date.now();
    // 使用Bearer认证进行健康检查，与主要认证逻辑保持一致
    const response = await fetch(`${node}/ping`, {
      method: 'GET',
      timeout: 3000,
      headers: {
        'Authorization': `Bearer ${CONFIG.security.defaultSecrets[0]}`
      }
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    runtimeState.nodeHealth[node] = {
      healthy: response.ok && data && data.status === 'ok',
      lastChecked: Date.now(),
      errorCount: 0,
      responseTime: duration
    };
    
    return runtimeState.nodeHealth[node].healthy;
  } catch (error) {
    runtimeState.nodeHealth[node] = {
      healthy: false,
      lastChecked: Date.now(),
      errorCount: (runtimeState.nodeHealth[node].errorCount || 0) + 1
    };
    
    console.error(`Health check failed for ${node}:`, error.message);
    return false;
  }
}

// 执行所有节点的健康检查
async function performHealthChecks() {
  const now = Date.now();
  
  // 检查是否需要执行健康检查
  if (now - runtimeState.lastHealthCheck < CONFIG.healthCheckInterval) {
    return;
  }
  
  runtimeState.lastHealthCheck = now;
  
  // 并行检查所有节点
  const checkPromises = CONFIG.workerNodes.map(node => 
    checkNodeHealth(node).catch(err => {
      console.error(`Health check promise failed:`, err);
      return false;
    })
  );
  
  await Promise.all(checkPromises);
  
  console.log('Health check completed:', runtimeState.nodeHealth);
}

// 获取健康的节点列表
function getHealthyNodes() {
  return CONFIG.workerNodes.filter(node => 
    runtimeState.nodeHealth[node].healthy
  );
}

// 轮询选择节点
function selectNode(strategy = 'random') {
  const healthyNodes = getHealthyNodes();
  
  // 如果没有健康节点，尝试使用所有节点作为后备
  const availableNodes = healthyNodes.length > 0 ? healthyNodes : CONFIG.workerNodes;
  
  if (availableNodes.length === 0) {
    throw new Error('No worker nodes available');
  }
  
  switch (strategy) {
    case 'round-robin':
      // 轮询策略
      const idx = runtimeState.requestCount % availableNodes.length;
      runtimeState.requestCount++;
      return availableNodes[idx];
    
    case 'weighted':
      // 基于响应时间的加权随机
      if (healthyNodes.length === 0) {
        // 如果没有健康节点，回退到随机
        return availableNodes[Math.floor(Math.random() * availableNodes.length)];
      }
      
      // 计算总权重（响应时间越短，权重越高）
      let totalWeight = 0;
      const weights = healthyNodes.map(node => {
        const health = runtimeState.nodeHealth[node];
        const responseTime = health.responseTime || 1000; // 默认为1000ms
        const weight = Math.max(1, 2000 - responseTime); // 响应时间越短，权重越高
        totalWeight += weight;
        return weight;
      });
      
      // 根据权重随机选择
      let random = Math.random() * totalWeight;
      for (let i = 0; i < healthyNodes.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return healthyNodes[i];
        }
      }
      return healthyNodes[0]; // 后备
    
    case 'random':
    default:
      // 随机策略
      return availableNodes[Math.floor(Math.random() * availableNodes.length)];
  }
}

// 多密钥认证验证函数 - 支持多种认证方式
function validateSecret(request) {
  if (!CONFIG.security.requireSecret) {
    return true;
  }
  
  // 尝试从Authorization头获取Bearer token
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.replace('Bearer ', '').trim();
  
  // 尝试从X-Webhook-Secret头获取密钥
  const webhookSecretHeader = request.headers.get('X-Webhook-Secret') || '';
  
  // 检查是否有任何有效的认证方式
  return CONFIG.security.defaultSecrets.includes(bearerToken) || 
         CONFIG.security.defaultSecrets.includes(webhookSecretHeader);
}

// 处理重试逻辑
async function withRetry(fn, maxRetries = CONFIG.retryConfig.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 计算重试延迟
      let delay = CONFIG.retryConfig.retryDelay;
      if (CONFIG.retryConfig.exponentialBackoff) {
        delay *= Math.pow(2, attempt);
      }
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// 转发请求到子Worker
async function forwardRequest(request, path, useRetry = true) {
  const originalUrl = new URL(request.url);
  const headers = new Headers(request.headers);
  
  // 添加路由器标识
  headers.set('X-Router-ID', 'img-router');
  headers.set('X-Router-Request-ID', crypto.randomUUID());
  
  const forwardFn = async () => {
    // 选择节点
    const node = selectNode('weighted'); // 使用加权策略优化性能
    const targetUrl = `${node}${path}`;
    
    console.log(`Forwarding to ${targetUrl}`);
    
    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow'
    });
    
    // 如果返回429或503，标记节点不健康并重试
    if ([429, 503].includes(response.status)) {
      runtimeState.nodeHealth[node].healthy = false;
      runtimeState.nodeHealth[node].errorCount++;
      throw new Error(`Node ${node} returned status ${response.status}`);
    }
    
    // 克隆响应以添加额外头信息
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Router-Node', node);
    responseHeaders.set('X-Router-Response-Time', `${Date.now() - Date.parse(headers.get('Date'))}ms`);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  };
  
  // 使用重试逻辑
  if (useRetry) {
    return withRetry(forwardFn);
  }
  
  return forwardFn();
}

// 主事件处理程序
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 执行健康检查（非阻塞）
  performHealthChecks().catch(err => {
    console.error('Health check background task failed:', err);
  });
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理ping请求
  if (path === '/ping') {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      healthyNodes: getHealthyNodes().length,
      totalNodes: CONFIG.workerNodes.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 处理stats请求
  if (path === '/stats') {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      requestCount: runtimeState.requestCount,
      lastHealthCheck: runtimeState.lastHealthCheck,
      nodeHealth: runtimeState.nodeHealth
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 验证secret
  if (!validateSecret(request)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid or missing X-Webhook-Secret'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 转发图片处理请求
  try {
    const response = await forwardRequest(request, path);
    
    // 如果响应包含图片数据，更新统计信息
    if (path === '/receive-image' || path === '/get-image-by-url') {
      runtimeState.requestCount++;
    }
    
    return response;
  } catch (error) {
    console.error('Request handling failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: `Router error: ${error.message}`,
      allNodesDown: getHealthyNodes().length === 0
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}