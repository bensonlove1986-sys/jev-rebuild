
// 环境变量配置
const SYSTEM_VERSION = 'v2.0.7';
const CONTROL_CENTER_URL = 'https://control.jevshop.workers.dev';
const LOCK = 'ACTIVE';
const RELAY_MODE = 'cloud';
/**
 * JEV Plugin v2.0 - 云端统一调用中心
 * 接收插件端 relay 请求
 * 调用对应模块函数
 * 输出统一格式的响应
 * 提供健康检测端点
 */

// 系统配置
const API_CONFIG = {
  // API基础配置
  api: {
    VERSION: 'v2.0',
    NAME: 'JEV Plugin Cloud API',
    DESCRIPTION: 'JEV Plugin v2.0 云端模块统一调用中心',
    MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
    DEFAULT_TIMEOUT: 30000, // 30秒
    CORS_ENABLED: true,
    RATE_LIMIT_ENABLED: true,
    LOG_ENABLED: true,
    ERROR_DETAILS: true,
    ENABLE_HEALTH_CHECK: true,
    ENABLE_METRICS: true
  },
  
  // 模块配置
  modules: {
    // 各模块的配置参数
    translation_engine: {
      enabled: true,
      timeout: 15000
    },
    ai_responder: {
      enabled: true,
      timeout: 20000
    },
    ocr_engine: {
      enabled: true,
      timeout: 30000
    },
    profit_calc: {
      enabled: true,
      timeout: 5000
    },
    pi_generator: {
      enabled: true,
      timeout: 10000
    },
    semantic_analyzer: {
      enabled: true,
      timeout: 10000
    },
    task_tracker: {
      enabled: true,
      timeout: 8000
    },
    security_guard: {
      enabled: true,
      timeout: 2000
    }
  },
  
  // 日志配置
  logging: {
    LOG_DIR: '/logs/',
    LOG_FILE: 'api_gateway.log',
    LOG_LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR, FATAL
    ROTATE_INTERVAL: '1d', // 每日轮换
    MAX_SIZE: '10MB',
    MAX_BACKUPS: 7
  },
  
  // 错误码配置
  errorCodes: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TIMEOUT: 408,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    MODULE_ERROR: 504
  },
  
  // 健康检查配置
  healthCheck: {
    ENABLED: true,
    INTERVAL: 60000, // 每分钟检查一次
    TIMEOUT: 5000,   // 5秒超时
    RETRIES: 3
  },
  
  // 监控指标配置
  metrics: {
    ENABLED: true,
    COLLECTION_INTERVAL: 30000, // 30秒收集一次
    RETENTION_DAYS: 7
  },
  
  // 安全配置
  security: {
    ENABLE_AUTH: true,
    VALIDATE_REQUESTS: true,
    SANITIZE_INPUTS: true,
    REQUIRE_MODULE_ENABLED: true,
    ALLOW_UNKNOWN_MODULES: false
  }
};

// 模块状态存储
let moduleRegistry = {
  // 已加载模块缓存
  loadedModules: new Map(),
  
  // 模块状态
  moduleStatus: {
    translation_engine: { status: 'UNLOADED', lastError: null },
    ai_responder: { status: 'UNLOADED', lastError: null },
    ocr_engine: { status: 'UNLOADED', lastError: null },
    profit_calc: { status: 'UNLOADED', lastError: null },
    pi_generator: { status: 'UNLOADED', lastError: null },
    semantic_analyzer: { status: 'UNLOADED', lastError: null },
    task_tracker: { status: 'UNLOADED', lastError: null },
    security_guard: { status: 'UNLOADED', lastError: null }
  },
  
  // API调用统计
  metrics: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    byModule: {},
    byEndpoint: {},
    responseTimes: [],
    errors: {},
    startTime: Date.now()
  },
  
  // 健康检查状态
  health: {
    status: 'UNKNOWN',
    lastCheck: null,
    modulesHealth: {},
    systemResources: {}
  },
  
  // 活跃请求跟踪
  activeRequests: new Map(),
  
  // 最近的错误记录
  recentErrors: []
};

// 生成API请求ID
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 生成时间戳
function getTimestamp() {
  return new Date().toISOString();
}

// 日志记录函数
function logMessage(level, message, details = {}) {
  if (!API_CONFIG.logging.LOG_ENABLED) return;
  
  const timestamp = getTimestamp();
  const logEntry = {
    level,
    timestamp,
    message,
    details
  };
  
  // 根据日志级别过滤
  const levelOrder = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'FATAL': 4 };
  const currentLevel = levelOrder[API_CONFIG.logging.LOG_LEVEL] || 1;
  
  if (levelOrder[level] >= currentLevel) {
    // 输出到控制台
    switch (level) {
      case 'DEBUG':
        console.debug(`[api_gateway] ${JSON.stringify(logEntry)}`);
        break;
      case 'INFO':
        console.info(`[api_gateway] ${JSON.stringify(logEntry)}`);
        break;
      case 'WARN':
        console.warn(`[api_gateway] ${JSON.stringify(logEntry)}`);
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(`[api_gateway] ${JSON.stringify(logEntry)}`);
        // 记录错误到最近错误列表
        if (moduleRegistry.recentErrors.length < 100) {
          moduleRegistry.recentErrors.unshift(logEntry);
        } else {
          moduleRegistry.recentErrors.pop();
          moduleRegistry.recentErrors.unshift(logEntry);
        }
        break;
    }
  }
}

// 加载模块
async function loadModule(moduleName) {
  try {
    // 检查模块是否已经加载
    if (moduleRegistry.loadedModules.has(moduleName)) {
      logMessage('DEBUG', `Module already loaded: ${moduleName}`);
      return moduleRegistry.loadedModules.get(moduleName);
    }
    
    // 检查模块是否启用
    if (!API_CONFIG.modules[moduleName]?.enabled) {
      throw new Error(`Module ${moduleName} is disabled`);
    }
    
    logMessage('INFO', `Loading module: ${moduleName}`);
    
    // 动态导入模块
    const modulePath = `./${moduleName}.js`;
    const module = await import(modulePath);
    
    // 更新模块状态
    moduleRegistry.moduleStatus[moduleName] = {
      status: 'LOADED',
      lastError: null,
      loadedAt: getTimestamp()
    };
    
    // 缓存模块
    moduleRegistry.loadedModules.set(moduleName, module);
    
    logMessage('INFO', `Module loaded successfully: ${moduleName}`);
    return module;
  } catch (error) {
    // 更新模块状态为错误
    moduleRegistry.moduleStatus[moduleName] = {
      status: 'ERROR',
      lastError: error.message,
      errorTime: getTimestamp()
    };
    
    logMessage('ERROR', `Failed to load module: ${moduleName}`, { error: error.message });
    throw error;
  }
}

// 卸载模块
function unloadModule(moduleName) {
  if (moduleRegistry.loadedModules.has(moduleName)) {
    moduleRegistry.loadedModules.delete(moduleName);
    moduleRegistry.moduleStatus[moduleName] = {
      status: 'UNLOADED',
      lastError: null,
      unloadedAt: getTimestamp()
    };
    
    logMessage('INFO', `Module unloaded: ${moduleName}`);
    return true;
  }
  
  logMessage('WARN', `Attempted to unload non-existent module: ${moduleName}`);
  return false;
}

// 重新加载模块
async function reloadModule(moduleName) {
  try {
    unloadModule(moduleName);
    const module = await loadModule(moduleName);
    return { success: true, module };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 获取模块状态
function getModuleStatus() {
  return { ...moduleRegistry.moduleStatus };
}

// 验证请求
function validateRequest(request) {
  try {
    // 检查请求结构
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request format');
    }
    
    // 检查必要字段
    if (!request.module) {
      throw new Error('Missing required field: module');
    }
    
    // 检查模块名称格式
    if (!/^[a-zA-Z0-9_]+$/.test(request.module)) {
      throw new Error('Invalid module name format');
    }
    
    // 检查是否允许未知模块
    if (!API_CONFIG.security.ALLOW_UNKNOWN_MODULES) {
      const validModules = Object.keys(API_CONFIG.modules);
      if (!validModules.includes(request.module)) {
        throw new Error(`Unknown module: ${request.module}`);
      }
    }
    
    // 检查模块是否启用
    if (API_CONFIG.security.REQUIRE_MODULE_ENABLED && 
        API_CONFIG.modules[request.module]?.enabled === false) {
      throw new Error(`Module ${request.module} is disabled`);
    }
    
    // 检查请求大小
    const requestSize = JSON.stringify(request).length;
    if (requestSize > API_CONFIG.api.MAX_REQUEST_SIZE) {
      throw new Error(`Request size exceeds maximum allowed size of ${API_CONFIG.api.MAX_REQUEST_SIZE} bytes`);
    }
    
    // 检查payload格式
    if (request.payload && typeof request.payload !== 'object') {
      throw new Error('Invalid payload format, must be an object');
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// 清理输入数据
function sanitizeInput(input) {
  if (!API_CONFIG.security.SANITIZE_INPUTS) {
    return input;
  }
  
  if (typeof input === 'string') {
    // 移除潜在的危险字符
    return input.replace(/[<>"'&]/g, (char) => {
      const entityMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return entityMap[char] || char;
    });
  } else if (typeof input === 'object' && input !== null) {
    // 递归清理对象
    if (Array.isArray(input)) {
      return input.map(item => sanitizeInput(item));
    } else {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = sanitizeInput(value);
      }
      return sanitized;
    }
  }
  
  return input;
}

// 执行模块调用
async function executeModuleCall(request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    // 记录活跃请求
    moduleRegistry.activeRequests.set(requestId, {
      id: requestId,
      module: request.module,
      endpoint: request.endpoint || 'default',
      startTime,
      timestamp: getTimestamp()
    });
    
    // 验证请求
    const validation = validateRequest(request);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const { module: moduleName, payload = {}, endpoint = 'default' } = request;
    
    // 清理输入
    const sanitizedPayload = sanitizeInput(payload);
    
    // 加载模块
    const module = await loadModule(moduleName);
    
    // 检查安全模块是否可用
    let securityCheckResult = { allowed: true };
    try {
      if (moduleName !== 'security_guard' && moduleRegistry.loadedModules.has('security_guard')) {
        const securityModule = moduleRegistry.loadedModules.get('security_guard');
        securityCheckResult = await securityModule.auditRequest({
          ip: request.ip || 'unknown',
          module: moduleName,
          endpoint,
          payload: sanitizedPayload,
          headers: request.headers || {}
        });
      }
    } catch (securityError) {
      logMessage('WARN', 'Security check failed, continuing with caution', {
        error: securityError.message,
        module: moduleName
      });
    }
    
    // 检查是否允许请求
    if (!securityCheckResult.allowed) {
      throw new Error(securityCheckResult.reason || 'Request rejected by security guard');
    }
    
    // 设置超时
    const timeout = API_CONFIG.modules[moduleName]?.timeout || API_CONFIG.api.DEFAULT_TIMEOUT;
    
    // 执行模块调用
    const result = await Promise.race([
      executeModuleFunction(module, endpoint, sanitizedPayload),
      new Promise((_, reject) => setTimeout(() => 
        reject(new Error(`Module execution timed out after ${timeout}ms`)), timeout)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    // 更新指标
    updateMetrics(requestId, moduleName, endpoint, 'success', responseTime);
    
    // 移除活跃请求
    moduleRegistry.activeRequests.delete(requestId);
    
    // 返回统一格式的响应
    return {
      success: true,
      data: result,
      module: moduleName,
      endpoint,
      timestamp: getTimestamp(),
      requestId,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // 更新错误指标
    updateMetrics(requestId, request.module, request.endpoint || 'default', 'error', responseTime, error);
    
    // 移除活跃请求
    moduleRegistry.activeRequests.delete(requestId);
    
    // 记录错误
    logMessage('ERROR', `Module call failed: ${request.module}`, {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    // 返回错误响应
    return {
      success: false,
      error: error.message,
      module: request.module,
      endpoint: request.endpoint || 'default',
      timestamp: getTimestamp(),
      requestId,
      responseTime,
      ...(API_CONFIG.api.ERROR_DETAILS && { details: { stack: error.stack } })
    };
  }
}

// 执行模块函数
async function executeModuleFunction(module, endpoint, payload) {
  try {
    // 尝试直接调用命名端点
    if (typeof module[endpoint] === 'function') {
      return await module[endpoint](payload);
    }
    
    // 尝试调用默认导出的方法
    if (module.default && typeof module.default[endpoint] === 'function') {
      return await module.default[endpoint](payload);
    }
    
    // 尝试调用默认函数
    if (typeof module.default === 'function' && endpoint === 'default') {
      return await module.default(payload);
    }
    
    throw new Error(`Endpoint not found: ${endpoint}`);
  } catch (error) {
    throw new Error(`Module execution error: ${error.message}`);
  }
}

// 更新指标
function updateMetrics(requestId, moduleName, endpoint, status, responseTime, error = null) {
  // 更新总请求数
  moduleRegistry.metrics.totalRequests++;
  
  // 更新成功/失败计数
  if (status === 'success') {
    moduleRegistry.metrics.successfulRequests++;
  } else {
    moduleRegistry.metrics.failedRequests++;
    
    // 记录错误类型
    const errorType = error?.constructor?.name || 'UnknownError';
    moduleRegistry.metrics.errors[errorType] = (moduleRegistry.metrics.errors[errorType] || 0) + 1;
  }
  
  // 更新模块级统计
  if (!moduleRegistry.metrics.byModule[moduleName]) {
    moduleRegistry.metrics.byModule[moduleName] = {
      requests: 0,
      successful: 0,
      failed: 0,
      responseTimes: []
    };
  }
  
  moduleRegistry.metrics.byModule[moduleName].requests++;
  moduleRegistry.metrics.byModule[moduleName][status === 'success' ? 'successful' : 'failed']++;
  moduleRegistry.metrics.byModule[moduleName].responseTimes.push(responseTime);
  
  // 更新端点级统计
  const endpointKey = `${moduleName}.${endpoint}`;
  if (!moduleRegistry.metrics.byEndpoint[endpointKey]) {
    moduleRegistry.metrics.byEndpoint[endpointKey] = {
      requests: 0,
      successful: 0,
      failed: 0,
      responseTimes: []
    };
  }
  
  moduleRegistry.metrics.byEndpoint[endpointKey].requests++;
  moduleRegistry.metrics.byEndpoint[endpointKey][status === 'success' ? 'successful' : 'failed']++;
  moduleRegistry.metrics.byEndpoint[endpointKey].responseTimes.push(responseTime);
  
  // 记录响应时间（限制数组大小）
  if (moduleRegistry.metrics.responseTimes.length > 1000) {
    moduleRegistry.metrics.responseTimes.shift();
  }
  moduleRegistry.metrics.responseTimes.push({
    timestamp: Date.now(),
    module: moduleName,
    endpoint,
    time: responseTime,
    status
  });
}

// 获取健康状态
async function getHealthStatus() {
  try {
    const modulesHealth = {};
    
    // 检查每个模块的状态
    for (const moduleName of Object.keys(API_CONFIG.modules)) {
      if (API_CONFIG.modules[moduleName].enabled) {
        try {
          // 尝试加载模块（如果尚未加载）
          await loadModule(moduleName);
          
          // 尝试执行健康检查
          if (moduleRegistry.loadedModules.has(moduleName)) {
            const module = moduleRegistry.loadedModules.get(moduleName);
            if (module.healthCheck || (module.default && module.default.healthCheck)) {
              const healthCheckFn = module.healthCheck || module.default.healthCheck;
              const healthResult = await healthCheckFn();
              modulesHealth[moduleName] = healthResult;
            } else {
              modulesHealth[moduleName] = {
                status: 'HEALTHY',
                module: moduleName,
                message: 'Module is loaded and enabled'
              };
            }
          } else {
            modulesHealth[moduleName] = {
              status: 'ERROR',
              module: moduleName,
              error: 'Failed to load module'
            };
          }
        } catch (error) {
          modulesHealth[moduleName] = {
            status: 'ERROR',
            module: moduleName,
            error: error.message
          };
        }
      } else {
        modulesHealth[moduleName] = {
          status: 'DISABLED',
          module: moduleName,
          message: 'Module is disabled'
        };
      }
    }
    
    // 检查系统资源
    const systemResources = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeRequests: moduleRegistry.activeRequests.size
    };
    
    // 确定整体健康状态
    let overallStatus = 'HEALTHY';
    for (const health of Object.values(modulesHealth)) {
      if (health.status === 'ERROR') {
        overallStatus = 'DEGRADED';
        break;
      }
    }
    
    // 更新健康状态
    moduleRegistry.health = {
      status: overallStatus,
      lastCheck: getTimestamp(),
      modulesHealth,
      systemResources
    };
    
    return moduleRegistry.health;
  } catch (error) {
    logMessage('ERROR', 'Health check failed', { error: error.message });
    return {
      status: 'ERROR',
      lastCheck: getTimestamp(),
      error: error.message
    };
  }
}

// 获取API指标
function getApiMetrics() {
  // 计算平均响应时间
  const avgResponseTime = moduleRegistry.metrics.responseTimes.length > 0 
    ? moduleRegistry.metrics.responseTimes.reduce((sum, item) => sum + item.time, 0) / moduleRegistry.metrics.responseTimes.length
    : 0;
  
  // 计算成功率
  const successRate = moduleRegistry.metrics.totalRequests > 0
    ? (moduleRegistry.metrics.successfulRequests / moduleRegistry.metrics.totalRequests) * 100
    : 0;
  
  // 计算模块级别的平均响应时间
  const moduleAvgResponseTimes = {};
  for (const [moduleName, metrics] of Object.entries(moduleRegistry.metrics.byModule)) {
    if (metrics.responseTimes.length > 0) {
      moduleAvgResponseTimes[moduleName] = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
    } else {
      moduleAvgResponseTimes[moduleName] = 0;
    }
  }
  
  return {
    totalRequests: moduleRegistry.metrics.totalRequests,
    successfulRequests: moduleRegistry.metrics.successfulRequests,
    failedRequests: moduleRegistry.metrics.failedRequests,
    successRate,
    avgResponseTime,
    uptime: process.uptime(),
    startTime: new Date(moduleRegistry.metrics.startTime).toISOString(),
    activeRequests: moduleRegistry.activeRequests.size,
    moduleStats: moduleRegistry.metrics.byModule,
    moduleAvgResponseTimes,
    errorStats: moduleRegistry.metrics.errors,
    recentErrors: moduleRegistry.recentErrors.slice(0, 10)
  };
}

// 执行定期健康检查
function startHealthChecks() {
  if (!API_CONFIG.healthCheck.ENABLED) return;
  
  logMessage('INFO', `Starting periodic health checks (interval: ${API_CONFIG.healthCheck.INTERVAL}ms)`);
  
  setInterval(async () => {
    try {
      await getHealthStatus();
    } catch (error) {
      logMessage('ERROR', 'Periodic health check failed', { error: error.message });
    }
  }, API_CONFIG.healthCheck.INTERVAL);
  
  // 立即执行一次健康检查
  getHealthStatus();
}

// 处理API请求
async function handleApiRequest(request) {
  try {
    // 处理特殊端点
    if (request.module === 'system') {
      return handleSystemRequest(request.endpoint, request.payload);
    }
    
    // 执行模块调用
    return await executeModuleCall(request);
  } catch (error) {
    return {
      success: false,
      error: error.message,
      module: request?.module || 'unknown',
      timestamp: getTimestamp(),
      ...(API_CONFIG.api.ERROR_DETAILS && { details: { stack: error.stack } })
    };
  }
}

// 处理系统请求
async function handleSystemRequest(endpoint, payload) {
  switch (endpoint) {
    case 'status':
    case 'health':
      return {
        success: true,
        data: await getHealthStatus(),
        module: 'system',
        endpoint: 'health',
        timestamp: getTimestamp()
      };
      
    case 'metrics':
      return {
        success: true,
        data: getApiMetrics(),
        module: 'system',
        endpoint: 'metrics',
        timestamp: getTimestamp()
      };
      
    case 'modules':
      return {
        success: true,
        data: {
          loadedModules: Array.from(moduleRegistry.loadedModules.keys()),
          moduleStatus: getModuleStatus(),
          config: API_CONFIG.modules
        },
        module: 'system',
        endpoint: 'modules',
        timestamp: getTimestamp()
      };
      
    case 'reload_module':
      if (!payload?.module) {
        return {
          success: false,
          error: 'Module name is required',
          module: 'system',
          endpoint: 'reload_module',
          timestamp: getTimestamp()
        };
      }
      
      const reloadResult = await reloadModule(payload.module);
      return {
        success: reloadResult.success,
        data: reloadResult.module ? { message: `Module ${payload.module} reloaded successfully` } : null,
        error: reloadResult.success ? null : reloadResult.error,
        module: 'system',
        endpoint: 'reload_module',
        timestamp: getTimestamp()
      };
      
    case 'config':
      return {
        success: true,
        data: {
          api: API_CONFIG.api,
          version: API_CONFIG.api.VERSION,
          name: API_CONFIG.api.NAME,
          description: API_CONFIG.api.DESCRIPTION
        },
        module: 'system',
        endpoint: 'config',
        timestamp: getTimestamp()
      };
      
    case 'active_requests':
      return {
        success: true,
        data: Array.from(moduleRegistry.activeRequests.values()),
        module: 'system',
        endpoint: 'active_requests',
        timestamp: getTimestamp()
      };
      
    case 'clear_cache':
      // 清除模块缓存
      moduleRegistry.loadedModules.clear();
      
      // 重置模块状态
      for (const moduleName of Object.keys(moduleRegistry.moduleStatus)) {
        moduleRegistry.moduleStatus[moduleName] = {
          status: 'UNLOADED',
          lastError: null
        };
      }
      
      return {
        success: true,
        data: { message: 'Module cache cleared successfully' },
        module: 'system',
        endpoint: 'clear_cache',
        timestamp: getTimestamp()
      };
      
    case 'recent_errors':
      return {
        success: true,
        data: moduleRegistry.recentErrors.slice(0, payload?.limit || 50),
        module: 'system',
        endpoint: 'recent_errors',
        timestamp: getTimestamp()
      };
      
    default:
      return {
        success: false,
        error: `Unknown system endpoint: ${endpoint}`,
        module: 'system',
        timestamp: getTimestamp()
      };
  }
}

// 模拟HTTP请求处理（用于测试）
async function handleHttpRequest(method, path, headers, body) {
  try {
    // 健康检查端点
    if (path === '/status' || path === '/health') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': API_CONFIG.api.VERSION
        },
        body: JSON.stringify({
          ok: true,
          modules_loaded: Array.from(moduleRegistry.loadedModules.keys()),
          timestamp: getTimestamp(),
          version: API_CONFIG.api.VERSION
        })
      };
    }
    
    // API端点
    if (path === '/api/relay' && method === 'POST') {
      // 解析请求体
      let request;
      try {
        request = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': API_CONFIG.api.VERSION
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON payload',
            timestamp: getTimestamp()
          })
        };
      }
      
      // 处理API请求
      const response = await handleApiRequest(request);
      
      // 确定状态码
      const statusCode = response.success ? 200 : 
                        response.error?.includes('not found') ? 404 :
                        response.error?.includes('timeout') ? 408 :
                        500;
      
      return {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': API_CONFIG.api.VERSION,
          'X-Response-Time': response.responseTime || 0,
          'X-Request-ID': response.requestId || generateRequestId()
        },
        body: JSON.stringify(response)
      };
    }
    
    // 404 Not Found
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': API_CONFIG.api.VERSION
      },
      body: JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        timestamp: getTimestamp()
      })
    };
  } catch (error) {
    logMessage('ERROR', 'HTTP request handling failed', { error: error.message });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': API_CONFIG.api.VERSION
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: getTimestamp(),
        ...(API_CONFIG.api.ERROR_DETAILS && { details: { error: error.message } })
      })
    };
  }
}

// 初始化API网关
function initializeApiGateway() {
  logMessage('INFO', `Initializing API Gateway - ${API_CONFIG.api.NAME} v${API_CONFIG.api.VERSION}`);
  
  // 启动定期健康检查
  startHealthChecks();
  
  // 初始化模块指标
  for (const moduleName of Object.keys(API_CONFIG.modules)) {
    moduleRegistry.metrics.byModule[moduleName] = {
      requests: 0,
      successful: 0,
      failed: 0,
      responseTimes: []
    };
  }
  
  logMessage('INFO', 'API Gateway initialized successfully');
}

// 核心API导出
export async function relay(request) {
  return await handleApiRequest(request);
}

// 健康检查导出
export async function health() {
  return await getHealthStatus();
}

// 指标导出
export function metrics() {
  return getApiMetrics();
}

// 模块管理导出
export async function reloadModule(moduleName) {
  return await reloadModule(moduleName);
}

// HTTP处理导出
export async function httpRequest(method, path, headers, body) {
  return await handleHttpRequest(method, path, headers, body);
}

// 完整模块导出
module.exports = {
  // 核心功能
  relay,
  health,
  metrics,
  reloadModule,
  httpRequest,
  
  // 模块管理
  loadModule,
  unloadModule,
  getModuleStatus,
  
  // 系统功能
  getHealthStatus,
  getApiMetrics,
  validateRequest,
  sanitizeInput,
  
  // 配置信息
  getConfig: () => ({ ...API_CONFIG }),
  
  // 初始化
  initialize: initializeApiGateway,
  
  // 状态信息
  getStatus: () => ({
    loadedModules: Array.from(moduleRegistry.loadedModules.keys()),
    activeRequests: moduleRegistry.activeRequests.size,
    uptime: process.uptime(),
    version: API_CONFIG.api.VERSION
  })
};

// ES模块默认导出
exports.default = {
  relay,
  health,
  metrics,
  reloadModule,
  httpRequest,
  loadModule,
  unloadModule,
  getModuleStatus,
  getHealthStatus,
  getApiMetrics,
  validateRequest,
  sanitizeInput,
  getConfig: () => ({ ...API_CONFIG }),
  initialize: initializeApiGateway,
  getStatus: () => ({
    loadedModules: Array.from(moduleRegistry.loadedModules.keys()),
    activeRequests: moduleRegistry.activeRequests.size,
    uptime: process.uptime(),
    version: API_CONFIG.api.VERSION
  })
};

// 自初始化
initializeApiGateway();

// 健康检查端点
async function handleStatusRequest(request) {
    const response = {
        system: 'JEV Plugin ' + SYSTEM_VERSION,
        state: 'stable',
        modules_loaded: 9,
        timestamp: new Date().toISOString(),
        environment: {
            lock: LOCK,
            relay_mode: RELAY_MODE
        }
    };
    
    return new Response(JSON.stringify(response), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
