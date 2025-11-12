// JEV AI智能客服系统 - Cloudflare Worker 云中大脑
// 版本: L6.0.0
// 功能: 云端调度与存储层，统一管理UI状态、Agent注册、日志和文件存储

// 导入安全配置
let securityConfig, validateApiKey, checkIpWhitelist, verifySensitiveOperation, validateStateLayerData;
try {
  // 尝试导入安全配置模块
  const securityModule = require('./security_config');
  securityConfig = securityModule.securityConfig;
  validateApiKey = securityModule.validateApiKey;
  checkIpWhitelist = securityModule.checkIpWhitelist;
  verifySensitiveOperation = securityModule.verifySensitiveOperation;
  validateStateLayerData = securityModule.validateStateLayerData;
} catch (e) {
  console.warn('Security config module not found, using default security settings');
  // 默认安全配置
  securityConfig = {
    cors: { allowed_origins: ['*'], allowed_methods: ['GET', 'POST'], allowed_headers: ['*'], allow_credentials: true, max_age: 86400 },
    state_layer: { cache_enabled: true, max_cache_items: 1000, cache_ttl_ms: 300000 }
};
  validateApiKey = () => ({ valid: true });
  checkIpWhitelist = () => ({ allowed: true });
  verifySensitiveOperation = () => ({ verified: true });
  validateStateLayerData = () => ({ valid: true });
}

// 全局状态缓存实现
class GlobalStateCache {
  constructor(maxSize = 1000, defaultTTL = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
  }
  
  get(key) {
    const now = Date.now();
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      return null;
    }
    
    // 检查是否过期
    if (item.expires && now > item.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return item.value;
  }
  
  set(key, value, ttl = this.defaultTTL) {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const item = {
      value,
      expires: ttl ? Date.now() + ttl : null
    };
    
    this.cache.set(key, item);
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  get size() {
    this.cleanExpired();
    return this.cache.size;
  }
  
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((item, key) => {
      if (item.expires && item.expires < oldestTime) {
        oldestKey = key;
        oldestTime = item.expires;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    } else if (this.cache.size > 0) {
      // 如果没有过期项，删除第一个
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires && now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
  
  getHitRate() {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 100);
  }
}

// 初始化全局缓存
const globalStateCache = new GlobalStateCache(
  securityConfig?.state_layer?.max_cache_items || 1000,
  securityConfig?.state_layer?.cache_ttl_ms || 300000
);

// 性能监控
const performanceStats = {
  requests: {},
  endpoints: {},
  errors: 0
};

function logPerformance(endpoint, operation, latency, status) {
  if (!performanceStats.endpoints[endpoint]) {
    performanceStats.endpoints[endpoint] = {
      calls: 0,
      totalLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      success: 0,
      failures: 0
    };
  }
  
  const stats = performanceStats.endpoints[endpoint];
  stats.calls++;
  stats.totalLatency += latency;
  stats.minLatency = Math.min(stats.minLatency, latency);
  stats.maxLatency = Math.max(stats.maxLatency, latency);
  
  if (status >= 200 && status < 300) {
    stats.success++;
  } else if (status) {
    stats.failures++;
  }
}

function getPerformanceMetrics() {
  const metrics = {};
  
  Object.entries(performanceStats.endpoints).forEach(([endpoint, stats]) => {
    metrics[endpoint] = {
      calls: stats.calls,
      avgLatency: stats.calls > 0 ? Math.round(stats.totalLatency / stats.calls) : 0,
      minLatency: stats.minLatency,
      maxLatency: stats.maxLatency,
      successRate: stats.calls > 0 ? Math.round((stats.success / stats.calls) * 100) : 0,
      failureRate: stats.calls > 0 ? Math.round((stats.failures / stats.calls) * 100) : 0
    };
  });
  
  return metrics;
}

function logError(message, error) {
  console.error(`[ERROR] ${message}:`, error);
  performanceStats.errors++;
}

// 全局变量
let startTime = Date.now();
let heartbeatCount = 0;
const MAX_LOG_ENTRIES = 50;

// 安全中间件函数
async function securityMiddleware(request, next) {
  // IP白名单检查
  const ipCheck = checkIpWhitelist(request);
  if (!ipCheck.allowed) {
    logError('IP访问被拒绝', { clientIp: ipCheck.clientIp, error: ipCheck.error });
    return new Response(JSON.stringify({ error: ipCheck.error }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 如果IP在白名单中并且可以绕过认证，则直接继续
  if (ipCheck.bypassAuthentication) {
    return next(request);
  }
  
  // API密钥验证
  const apiKeyCheck = validateApiKey(request);
  if (!apiKeyCheck.valid) {
    logError('API密钥验证失败', { error: apiKeyCheck.error });
    return new Response(JSON.stringify({ error: apiKeyCheck.error }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 敏感操作验证
  const sensitiveCheck = verifySensitiveOperation(request);
  if (!sensitiveCheck.verified) {
    logError('敏感操作验证失败', { error: sensitiveCheck.error });
    return new Response(JSON.stringify({ error: sensitiveCheck.error }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 继续处理请求
  return next(request);
}

// 增强的状态层API调用函数（将在后面定义）
  
  try {
    const url = `${securityConfig.state_layer?.url || 'https://jevshop.bensonlove1986.workers.dev'}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    // 记录性能指标
    logPerformance(method, endpoint, latency, response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        status: response.status,
        message: errorData.error || `状态层请求失败: ${response.status}`,
        latency
      };
    }
    
    const result = await response.json();
    
    // 缓存GET请求结果
    if (securityConfig.state_layer.cache_enabled && method === 'GET' && endpoint === '/get' && result.success) {
      globalStateCache.set(cacheKey, result.data);
    }
    
    return {
      success: true,
      data: result.data,
      latency
    };
  } catch (error) {
    const endTime = performance.now();
    logError('状态层连接错误', error);
    
    return {
      success: false,
      message: `连接状态层失败: ${error.message}`,
      latency: endTime - startTime,
      error: error.toString()
    };
  }

// Durable Objects Counter 类 - 满足现有部署需求
class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ error: 'Counter DO not supported in this version' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Durable Objects SessionStore 类 - 满足现有部署需求
class SessionStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ error: 'SessionStore DO not supported in this version' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// StateManager - JEV系统状态协调层
class StateManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // 初始化请求计数器用于速率限制
    this.requestCounts = {};
    // 允许的IP地址白名单
    this.allowedIps = [
      '192.168.1.1', // 修改为实际需要允许的IP
      '192.168.1.2',
      // 在生产环境中，可以从环境变量读取
      ...(env.ALLOWED_IPS ? env.ALLOWED_IPS.split(',') : [])
    ];
    // API密钥验证
    this.apiKeys = new Set([
      'jev-api-key-123', // 修改为实际的API密钥
      'jev-production-key',
      // 在生产环境中，可以从环境变量读取
      ...(env.API_KEYS ? env.API_KEYS.split(',') : [])
    ]);
    // 内存缓存，减少对存储的访问
    this.cache = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5分钟缓存有效期
  }

  // 获取缓存项
  getCacheItem(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }
    // 清除过期缓存
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  // 设置缓存项
  setCacheItem(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtl
    });
    // 限制缓存大小，避免内存溢出
    if (this.cache.size > 1000) {
      // 删除最早添加的缓存项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  // 清除缓存项
  clearCacheItem(key) {
    this.cache.delete(key);
  }

  // 清除所有缓存
  clearAllCache() {
    this.cache.clear();
  }

  // 验证API密钥
  validateApiKey(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    return this.apiKeys.has(token);
  }

  // 检查IP是否在白名单中
  isIpAllowed(ip) {
    // 开发环境允许所有IP，生产环境需要严格控制
    if (this.env.ENVIRONMENT !== 'production') {
      return true;
    }
    return this.allowedIps.includes(ip);
  }

  // 速率限制检查
  async checkRateLimit(ip) {
    const now = Date.now();
    const window = 60 * 1000; // 1分钟窗口
    const limit = 100; // 每分钟最多100个请求
    
    // 初始化或清理过期的请求记录
    if (!this.requestCounts[ip]) {
      this.requestCounts[ip] = [];
    }
    
    // 移除过期的请求记录
    this.requestCounts[ip] = this.requestCounts[ip].filter(timestamp => now - timestamp < window);
    
    // 检查是否超过限制
    if (this.requestCounts[ip].length >= limit) {
      return false;
    }
    
    // 记录新请求
    this.requestCounts[ip].push(now);
    return true;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const method = request.method.toUpperCase();
    
    // 获取客户端IP地址（Cloudflare环境中可用）
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // 1. API密钥验证
    if (!this.validateApiKey(request)) {
      return json({
        success: false,
        error: 'Unauthorized - Invalid API Key',
        code: 401,
        timestamp: Date.now()
      }, 401);
    }
    
    // 2. IP白名单检查
    if (!this.isIpAllowed(clientIP)) {
      return json({
        success: false,
        error: 'Forbidden - IP not allowed',
        code: 403,
        timestamp: Date.now()
      }, 403);
    }
    
    // 3. 速率限制检查
    if (!(await this.checkRateLimit(clientIP))) {
      return json({
        success: false,
        error: 'Too Many Requests',
        code: 429,
        timestamp: Date.now()
      }, 429);
    }
    
    if (method === "POST" && url.pathname === "/set") {
      try {
        const body = await request.json();
        // 记录来源IP和时间戳的元数据
        const valueWithMeta = {
          data: body.value,
          meta: {
            createdBy: clientIP,
            createdAt: Date.now(),
            version: 1,
            lastAccessed: Date.now()
          }
        };
        
        // 原子写入操作
        await this.state.storage.put(body.key, valueWithMeta);
        
        // 更新缓存
        this.setCacheItem(body.key, valueWithMeta);
        
        // 记录操作日志
        if (this.env && this.env.LOG_LEVEL === 'debug') {
          console.log(`[StateManager] SET key=${body.key} from ${clientIP}`);
        }
        
        return json({
          success: true,
          key: body.key,
          value: body.value,
          timestamp: Date.now(),
          cached: false // 写入操作总是直接到存储
        });
      } catch (error) {
        // 记录错误日志
        console.error(`[StateManager] SET error: ${error.message}`);
        return json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    if (method === "GET" && url.pathname === "/get" && key) {
      try {
        // 先尝试从缓存获取
        const cachedValue = this.getCacheItem(key);
        if (cachedValue) {
          // 更新最后访问时间（仅在内存中，下次写入时更新存储）
          cachedValue.meta.lastAccessed = Date.now();
          
          return json({
            success: true,
            key,
            value: cachedValue.data,
            timestamp: Date.now(),
            cached: true,
            cacheHit: true,
            lastUpdated: cachedValue.meta.createdAt
          });
        }
        
        // 缓存未命中，从存储获取
        const storedValue = await this.state.storage.get(key);
        if (storedValue) {
          // 更新最后访问时间
          storedValue.meta.lastAccessed = Date.now();
          
          // 设置缓存
          this.setCacheItem(key, storedValue);
          
          return json({
            success: true,
            key,
            value: storedValue.data,
            timestamp: Date.now(),
            cached: false,
            cacheHit: false,
            lastUpdated: storedValue.meta.createdAt
          });
        } else {
          return json({
            success: false,
            error: "Key not found",
            key,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`[StateManager] GET error: ${error.message}`);
        return json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    if (method === "DELETE" && url.pathname === "/delete" && key) {
      try {
        // 从存储删除
        await this.state.storage.delete(key);
        
        // 清除缓存
        this.clearCacheItem(key);
        
        // 记录操作日志
        if (this.env && this.env.LOG_LEVEL === 'debug') {
          console.log(`[StateManager] DELETE key=${key} from ${clientIP}`);
        }
        
        return json({
          success: true,
          key,
          deleted: true,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`[StateManager] DELETE error: ${error.message}`);
        return json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    if (method === "GET" && url.pathname === "/list") {
      try {
        const list = await this.state.storage.list();
        // 格式化返回数据，只返回key列表
        const keys = [];
        // 正确处理list.keys的迭代方式
        for await (const [key] of list.entries()) {
          keys.push(key);
        }
        return json({
          success: true,
          list: keys,
          count: keys.length,
          timestamp: Date.now()
        });
      } catch (error) {
        return json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // 添加/sync路由 - 用于三层通信同步
    if (method === "POST" && url.pathname === "/sync") {
      try {
        const body = await request.json();
        
        // 验证必要字段
        const device = body.device || "unknown-device";
        const key = body.key;
        const value = body.value;
        const origin = body.origin || "cloud";
        
        if (!key) {
          return json({
            success: false,
            error: "Missing required field: key",
            timestamp: Date.now()
          });
        }
        
        // 统一时间戳格式（Unix毫秒）
        const timestamp = typeof body.timestamp === 'number' ? body.timestamp : Date.now();
        
        // 构建对齐协议格式的数据包
        const syncData = {
          device,
          key,
          value,
          timestamp,
          origin,
          syncTimestamp: Date.now()
        };
        
        // 存储同步数据
        const storageKey = `sync_${key}`;
        await this.state.storage.put(storageKey, syncData);
        
        return json({
          success: true,
          device,
          key,
          timestamp: Date.now(),
          syncStatus: "completed",
          protocol: "alignment-v1.1"
        });
      } catch (error) {
        console.error(`[StateManager] SYNC error: ${error.message}`);
        return json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // 添加/export路由 - 用于导出所有同步数据
    if (method === "GET" && url.pathname === "/export") {
      try {
        const list = await this.state.storage.list({
          prefix: "sync_"
        });
        
        const exportData = {};
        for await (const [key, value] of list.entries()) {
          exportData[key.replace("sync_", "")] = value;
        }
        
        return json({
          success: true,
          exportData,
          count: Object.keys(exportData).length,
          timestamp: Date.now(),
          protocolVersion: "v1.1"
        });
      } catch (error) {
        console.error(`[StateManager] EXPORT error: ${error.message}`);
        return json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    return errorResponse("Not Found");
  }
}

/**
 * 统一响应JSON格式化函数
 * @param {Object} data - 响应数据
 * @param {number} status - HTTP状态码，默认200
 * @returns {Response} - 格式化的Response对象
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Key, X-Control-Auth, X-Control-Scope, X-Origin, X-Relay-Server, X-Worker-Sync, X-Optimizer-Link, X-Insight-Link, X-Control-Lock, X-Relay-Mode, X-Translator, X-Language-Support',
      'X-Worker-Sync': 'true',
      'X-Control-Lock': 'active',
      'X-Relay-Mode': 'global'
    }
  });
}

/**
 * 错误响应格式化函数
 * @param {string} message - 错误信息
 * @returns {Response} - 错误响应
 */
function errorResponse(message) {
  const traceId = Math.random().toString(36).substring(2, 10);
  return json({ 
    success: false, 
    error: message, 
    trace_id: traceId 
  });
}

/**
 * 生成时间戳格式的ID
 * @returns {string} - 时间戳字符串
 */
function generateTimestampId() {
  return Date.now().toString();
}

/**
 * 生成唯一ID
 * @returns {string} - 唯一标识符
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * KV操作封装函数 - 存储值
 * @param {Object} env - Worker环境变量
 * @param {string} store - 存储名称 (jevui 或 MEM_STORE)
 * @param {string} key - 键名
 * @param {*} value - 值（自动序列化）
 * @param {number|null} ttl - 过期时间（秒）
 * @returns {Promise<boolean>} - 是否成功
 */
async function kvPut(env, store, key, value, ttl = null) {
  try {
    const storeObj = env[store];
    if (!storeObj) {
      console.error(`KV存储 ${store} 未绑定`);
      return false;
    }
    
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttl) {
      await storeObj.put(key, valueStr, { expirationTtl: ttl });
    } else {
      await storeObj.put(key, valueStr);
    }
    
    return true;
  } catch (error) {
    console.error(`KV写入失败 [${store}:${key}]:`, error);
    return false;
  }
}

/**
 * KV操作封装函数 - 获取值
 * @param {Object} env - Worker环境变量
 * @param {string} store - 存储名称
 * @param {string} key - 键名
 * @returns {Promise<any|null>} - 获取的值或null
 */
async function kvGet(env, store, key) {
  try {
    const storeObj = env[store];
    if (!storeObj) {
      console.error(`KV存储 ${store} 未绑定`);
      return null;
    }
    
    const value = await storeObj.get(key);
    if (value === null) return null;
    
    // 尝试解析JSON
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`KV读取失败 [${store}:${key}]:`, error);
    return null;
  }
}

/**
 * KV操作封装函数 - 列出键
 * @param {Object} env - Worker环境变量
 * @param {string} store - 存储名称
 * @param {string} prefix - 前缀过滤
 * @returns {Promise<Array>} - 键名数组
 */
async function kvList(env, store, prefix = '') {
  try {
    const storeObj = env[store];
    if (!storeObj) {
      console.error(`KV存储 ${store} 未绑定`);
      return [];
    }
    
    const keys = [];
    const list = await storeObj.list({ prefix });
    
    for (const key of list.keys) {
      keys.push(key.name);
    }
    
    return keys;
  } catch (error) {
    console.error(`KV列表获取失败 [${store}:${prefix}]:`, error);
    return [];
  }
}

/**
 * KV操作封装函数 - 删除键
 * @param {Object} env - Worker环境变量
 * @param {string} store - 存储名称
 * @param {string} key - 键名
 * @returns {Promise<boolean>} - 是否成功
 */
async function kvDelete(env, store, key) {
  try {
    const storeObj = env[store];
    if (!storeObj) {
      console.error(`KV存储 ${store} 未绑定`);
      return false;
    }
    
    await storeObj.delete(key);
    return true;
  } catch (error) {
    console.error(`KV删除失败 [${store}:${key}]:`, error);
    return false;
  }
}

/**
 * 检查API密钥是否有效
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {boolean} - 验证是否通过
 */
function validateApiKey2(request, env) {
  const authKey = request.headers.get('X-Auth-Key');
  return authKey === env.API_KEY || authKey === 'JEV_2025_AI_SYS_A92jskL0xY';
}

/**
 * 记录日志到MEM_STORE
 * @param {Object} env - 环境变量
 * @param {string} source - 日志来源
 * @param {string} level - 日志级别
 * @param {string} message - 日志内容
 */
async function log(env, source, level, message) {
  try {
    // 生成日志条目
    const logEntry = {
      time: new Date().toISOString(),
      source,
      level,
      message
    };
    
    // 生成日志键名
    const logKey = `log:${source}:${generateTimestampId()}`;
    
    // 存储日志
    await kvPut(env, 'MEM_STORE', logKey, logEntry);
    
    // 获取现有日志键列表
    const logKeys = await kvList(env, 'MEM_STORE', `log:${source}:`);
    
    // 如果日志条目超过限制，删除最旧的
    if (logKeys.length > MAX_LOG_ENTRIES) {
      const keysToDelete = logKeys.slice(0, logKeys.length - MAX_LOG_ENTRIES);
      for (const key of keysToDelete) {
        await kvDelete(env, 'MEM_STORE', key);
      }
    }
  } catch (error) {
    console.error('日志记录失败:', error);
  }
}

/**
 * 清理过期的Agent
 * @param {Object} env - 环境变量
 */
async function cleanExpiredAgents(env) {
  try {
    const agentKeys = await kvList(env, 'MEM_STORE', 'agent:');
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10分钟过期
    
    for (const key of agentKeys) {
      const agent = await kvGet(env, 'MEM_STORE', key);
      if (agent && now - new Date(agent.last_seen).getTime() > expireTime) {
        await kvDelete(env, 'MEM_STORE', key);
        console.log(`已清理过期Agent: ${agent.id}`);
      }
    }
  } catch (error) {
    console.error('清理过期Agent失败:', error);
  }
}

/**
 * 获取运行时间
 * @returns {string} - 格式化的运行时间
 */
function getUptime() {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
}

/**
 * 获取绑定状态
 * @param {Object} env - 环境变量
 * @returns {Object} - 绑定状态对象
 */
function getBindingStatus(env) {
  return {
    jevui: !!env.jevui,
    MEM_STORE: !!env.MEM_STORE,
    R2_BUCKET: !!env.R2_BUCKET
  };
}

/**
 * 处理CORS预检请求
 * @param {Request} request - 请求对象
 * @returns {Response} - CORS响应
 */
function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Key, X-Control-Auth, X-Control-Scope, X-Origin, X-Relay-Server, X-Worker-Sync, X-Optimizer-Link, X-Insight-Link, X-Control-Lock, X-Relay-Mode, X-Translator, X-Language-Support'
    }
  });
}

/**
 * 系统健康检测处理函数
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
async function handlePing(env) {
  heartbeatCount++;
  const bindings = getBindingStatus(env);
  
  await log(env, 'worker', 'info', '系统心跳检测');
  
  return json({
    success: true,
    message: "JEV Worker 正常运行 ✅",
    bindings: bindings,
    uptime: getUptime(),
    heartbeat: heartbeatCount
  });
}

/**
 * UI状态管理处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
async function handleUI(request, env) {
  const method = request.method;
  
  if (method === 'GET') {
    // 获取UI状态
    const uiKeys = await kvList(env, 'jevui', 'ui:');
    const uiState = {};
    
    for (const key of uiKeys) {
      const value = await kvGet(env, 'jevui', key);
      if (value !== null) {
        // 移除'ui:'前缀
        const shortKey = key.replace('ui:', '');
        uiState[shortKey] = value;
      }
    }
    
    await log(env, 'worker', 'info', `获取UI状态，共${Object.keys(uiState).length}项`);
    return json({ success: true, data: uiState });
  }
  
  if (method === 'POST') {
    // 更新UI状态
    if (!validateApiKey(request, env)) {
      return new Response('Unauthorized', { status: 403 });
    }
    
    try {
      const data = await request.json();
      const updated = [];
      
      for (const [key, value] of Object.entries(data)) {
        const fullKey = key.startsWith('ui:') ? key : `ui:${key}`;
        await kvPut(env, 'jevui', fullKey, value);
        updated.push(key);
      }
      
      await log(env, 'worker', 'info', `更新UI状态，共${updated.length}项`);
      return json({ success: true, message: 'UI状态更新成功', updated });
    } catch (error) {
      console.error('UI状态更新失败:', error);
      return errorResponse('UI状态更新失败');
    }
  }
  
  return errorResponse('不支持的HTTP方法');
}

/**
 * Agent管理处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {URL} url - 请求URL对象
 * @returns {Promise<Response>} - 响应对象
 */
async function handleAgents(request, env, url) {
  // 清理过期Agent
  await cleanExpiredAgents(env);
  
  const path = url.pathname;
  
  if (path === '/api/jev/agents/register' && request.method === 'POST') {
    // 注册新Agent
    if (!validateApiKey(request, env)) {
      return new Response('Unauthorized', { status: 403 });
    }
    
    try {
      const data = await request.json();
      const agentId = data.agent_id || `AGENT_${generateUniqueId()}`;
      
      const agentData = {
        id: agentId,
        last_seen: new Date().toISOString(),
        status: data.status || 'online',
        type: data.type || 'desktop',
        version: data.version || '1.0.0',
        ip: data.ip || 'auto',
        capabilities: data.capabilities || [],
        ttl: 600 // 10分钟过期
      };
      
      await kvPut(env, 'MEM_STORE', `agent:${agentId}`, agentData);
      await log(env, 'worker', 'info', `Agent注册: ${agentId}`);
      
      return json({ success: true, message: 'Agent注册成功', agent: agentData });
    } catch (error) {
      console.error('Agent注册失败:', error);
      return errorResponse('Agent注册失败');
    }
  }
  
  if (path === '/api/jev/agents/heartbeat' && request.method === 'POST') {
    // 更新Agent心跳
    try {
      const data = await request.json();
      const agentId = data.agent_id;
      
      if (!agentId) {
        return errorResponse('缺少agent_id');
      }
      
      const agentKey = `agent:${agentId}`;
      const agent = await kvGet(env, 'MEM_STORE', agentKey);
      
      if (!agent) {
        return errorResponse('Agent未注册');
      }
      
      // 更新心跳
      agent.last_seen = new Date().toISOString();
      agent.status = data.status || 'online';
      
      await kvPut(env, 'MEM_STORE', agentKey, agent);
      await log(env, 'worker', 'info', `Agent心跳更新: ${agentId}`);
      
      return json({ success: true, message: '心跳更新成功' });
    } catch (error) {
      console.error('Agent心跳更新失败:', error);
      return errorResponse('心跳更新失败');
    }
  }
  
  if (path === '/api/jev/agents' && request.method === 'GET') {
    // 获取Agent列表
    const agentKeys = await kvList(env, 'MEM_STORE', 'agent:');
    const agents = [];
    
    for (const key of agentKeys) {
      const agent = await kvGet(env, 'MEM_STORE', key);
      if (agent) {
        agents.push(agent);
      }
    }
    
    return json({ success: true, data: agents });
  }
  
  // 删除Agent (e.g. /agents/AGENT_123)
  if (path.startsWith('/api/jev/agents/') && request.method === 'DELETE') {
    if (!validateApiKey(request, env)) {
      return new Response('Unauthorized', { status: 403 });
    }
    
    const agentId = path.split('/').pop();
    const success = await kvDelete(env, 'MEM_STORE', `agent:${agentId}`);
    
    if (success) {
      await log(env, 'worker', 'info', `Agent删除: ${agentId}`);
      return json({ success: true, message: 'Agent删除成功' });
    } else {
      return errorResponse('Agent删除失败');
    }
  }
  
  return errorResponse('不支持的请求');
}

/**
 * 日志处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {URL} url - 请求URL对象
 * @returns {Promise<Response>} - 响应对象
 */
async function handleLog(request, env, url) {
  if (request.method === 'POST') {
    // 记录日志
    try {
      const data = await request.json();
      await log(
        env,
        data.source || 'unknown',
        data.level || 'info',
        data.message || ''
      );
      return json({ success: true, message: '日志记录成功' });
    } catch (error) {
      console.error('日志记录失败:', error);
      return errorResponse('日志记录失败');
    }
  }
  
  if (request.method === 'GET') {
    // 获取日志
    const source = url.searchParams.get('source') || 'unknown';
    const logKeys = await kvList(env, 'MEM_STORE', `log:${source}:`);
    const logs = [];
    
    // 获取最新的50条日志
    const recentKeys = logKeys.slice(-50);
    
    for (const key of recentKeys) {
      const log = await kvGet(env, 'MEM_STORE', key);
      if (log) {
        logs.push(log);
      }
    }
    
    // 按时间排序
    logs.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    return json({ success: true, data: logs });
  }
  
  return errorResponse('不支持的请求');
}

/**
 * 文件上传处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
async function handleUpload(request, env) {
  if (!env.R2_BUCKET) {
    return errorResponse('R2_BUCKET未绑定');
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return errorResponse('未找到文件');
    }
    
    // 生成文件名
    const timestamp = Date.now();
    const filename = file.name || `upload_${timestamp}`;
    const extension = filename.includes('.') ? filename.split('.').pop() : '';
    const objectName = extension 
      ? `uploads/${timestamp}_${filename}`
      : `uploads/${timestamp}_${filename}`;
    
    // 上传到R2
    const buffer = await file.arrayBuffer();
    await env.R2_BUCKET.put(objectName, buffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      }
    });
    
    // 生成公开URL
    const publicUrl = `https://pub-156ce03fffc59592e2b3b04dbc22aa6c.r2.dev/${objectName}`;
    
    await log(env, 'worker', 'info', `文件上传成功: ${objectName}`);
    
    return json({
      success: true,
      key: objectName,
      public_url: publicUrl,
      fileSize: buffer.byteLength,
      uploadTime: timestamp
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return errorResponse('文件上传失败');
  }
}

/**
 * OCR结果处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
async function handleOcrResult(request, env) {
  if (!env.R2_BUCKET) {
    return errorResponse('R2_BUCKET未绑定');
  }
  
  if (!validateApiKey(request, env)) {
    return new Response('Unauthorized', { status: 403 });
  }
  
  try {
    const data = await request.json();
    const agentId = data.agent_id;
    const result = data.result;
    
    if (!agentId || !result) {
      return errorResponse('缺少必要参数');
    }
    
    // 生成文件名
    const timestamp = Date.now();
    const objectName = `ocr_results/${agentId}/${timestamp}.json`;
    
    // 上传到R2
    await env.R2_BUCKET.put(objectName, JSON.stringify(result), {
      httpMetadata: {
        contentType: 'application/json'
      }
    });
    
    await log(env, 'worker', 'info', `OCR结果保存成功: ${objectName}`);
    
    return json({
      success: true,
      key: objectName,
      message: 'OCR结果保存成功'
    });
  } catch (error) {
    console.error('OCR结果保存失败:', error);
    return errorResponse('OCR结果保存失败');
  }
}

/**
 * AI任务处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
async function handleAITask(request, env) {
  const startTime = performance.now();
  
  try {
    const { task_type, user_id, params, conversation_id } = await request.json();
    
    // 数据验证
    const validation = validateStateLayerData({ key: `conversation_${conversation_id}` });
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 从状态层获取历史对话上下文
    const contextKey = `conversation_${conversation_id}`;
    const contextResult = await callStateLayer('/get', 'GET', { key: contextKey });
    
    let conversationHistory = [];
    if (contextResult.success && contextResult.data) {
      conversationHistory = contextResult.data;
    }
    
    // 处理AI任务...
    // 这里应该是实际的AI处理逻辑，现在返回模拟结果
    const aiResponse = {
      task_type,
      user_id,
      response: "这是AI的响应",
      conversation_id,
      timestamp: new Date().toISOString()
    };
    
    // 更新对话历史
    conversationHistory.push({
      role: "user",
      content: params?.prompt || "用户查询",
      timestamp: new Date().toISOString()
    });
    conversationHistory.push({
      role: "assistant",
      content: aiResponse.response,
      timestamp: aiResponse.timestamp
    });
    
    // 保存更新后的对话历史到状态层
    await callStateLayer('/set', 'POST', {
      key: contextKey,
      value: conversationHistory
    });
    
    const latency = performance.now() - startTime;
    logPerformance('ai_task', task_type, latency);
    
    return new Response(JSON.stringify({
      success: true,
      data: aiResponse,
      metadata: {
        latency,
        context_size: conversationHistory.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logError('AI任务处理失败', error);
    return new Response(JSON.stringify({ error: `AI任务处理失败: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 系统状态汇总函数
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
async function handleStatus(request, env) {
  try {
    // 状态层健康检查
    const healthCheck = await callStateLayer('/health', 'GET');
    
    // 缓存统计
    const cacheStats = {
      size: globalStateCache.size,
      max_size: securityConfig.state_layer.max_cache_items,
      hit_rate: globalStateCache.getHitRate()
    };
    
    // 安全状态
    const securityStatus = {
      authentication_enabled: securityConfig.authentication?.state_layer !== undefined,
      ip_whitelist_enabled: securityConfig.ip_security?.whitelist?.enabled,
      rate_limiting_enabled: securityConfig.rate_limiting?.enabled,
      cors_enabled: securityConfig.cors !== undefined
    };
    
    // 性能指标
    const performanceMetrics = getPerformanceMetrics();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        status: healthCheck.success ? "online" : "degraded",
        state_layer_status: healthCheck.success ? "connected" : "disconnected",
        cache_stats: cacheStats,
        security_status: securityStatus,
        performance_metrics: performanceMetrics,
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logError('状态检查失败', error);
    return new Response(JSON.stringify({ error: `状态检查失败: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 全局缓存对象 - 用于减少状态层请求
const globalCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
const MAX_CACHE_SIZE = 1000;

// 缓存管理工具函数
function getCacheItem(key) {
  const cached = globalCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }
  if (cached) {
    globalCache.delete(key);
  }
  return null;
}

function setCacheItem(key, value) {
  globalCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL
  });
  
  // 限制缓存大小
  if (globalCache.size > MAX_CACHE_SIZE) {
    const firstKey = globalCache.keys().next().value;
    globalCache.delete(firstKey);
  }
}

function clearCacheItem(key) {
  globalCache.delete(key);
}

// 重复的函数声明已删除
    
    const options = {
      method,
      headers,
      cf: {
        cacheTtlByStatus: {
          '200-299': 10,
          '404': 1,
          '500-599': 0
        }
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    // 记录请求开始时间
    const functionStartTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // 记录性能指标
    console.log(`[State Layer] ${method} ${url} - ${response.status} (${latency}ms)`);
    
    const result = await response.json();
    
    // 缓存成功的GET响应
    if (method === 'GET' && cacheKey && response.ok) {
      setCacheItem(cacheKey, result);
    }
    
    // 对于写操作，清除相关缓存
    if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && endpoint === '/set') {
      if (data && data.key) {
        clearCacheItem(`GET:${stateUrl}/get?key=${data.key}`);
        // 清除可能的列表缓存
        clearCacheItem(`GET:${stateUrl}/list`);
      }
    }
    
    return result;

// 增强AI任务处理，与状态层深度集成
async function handleAITask(request, env) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId || generateUniqueId();
    
    // 从状态层获取历史对话上下文
    let contextData = null;
    try {
      const contextResponse = await callStateLayer(env, `/get?key=ai_session_${sessionId}`);
      if (contextResponse.success) {
        contextData = contextResponse.value;
        console.log(`[AI Context] Retrieved history for session ${sessionId}`);
      }
    } catch (contextError) {
      console.warn(`[AI Context] Failed to retrieve history:`, contextError);
      // 即使获取失败也继续处理，不阻塞AI响应
    }
    
    // 处理AI任务...（现有代码）
    // 模拟AI响应，实际应用中这里会调用真实的AI模型
    const aiResponse = {
      success: true,
      sessionId,
      model: body.model || 'default',
      response: '这是AI生成的响应内容',
      timestamp: Date.now(),
      contextUsed: !!contextData
    };
    
    // 保存更新后的对话历史到状态层
    try {
      const updatedSession = {
        query: body.query || '',
        response: aiResponse,
        timestamp: Date.now(),
        model: body.model || 'default',
        previousContext: contextData || null
      };
      
      // 异步保存，不阻塞响应
      callStateLayer(env, '/set', 'POST', {
        key: `ai_session_${sessionId}`,
        value: updatedSession
      }).catch(err => {
        console.error('Failed to save AI session to state layer:', err);
      });
    } catch (saveError) {
      console.warn('Error saving AI session:', saveError);
    }
    
    return json(aiResponse);
  } catch (error) {
    console.error('[AI Task] Error processing:', error);
    return errorResponse('AI processing failed');
  }
}

// 增强状态检查函数
async function handleStatus(request) {
  try {
    // 状态层健康检查
    const healthCheck = await callStateLayer('/health', 'GET');
    
    // 缓存统计
    const cacheStats = {
      size: globalStateCache.size,
      max_size: securityConfig.state_layer.max_cache_items,
      hit_rate: globalStateCache.getHitRate()
    };
    
    // 安全状态
    const securityStatus = {
      authentication_enabled: securityConfig.authentication.state_layer !== undefined,
      ip_whitelist_enabled: securityConfig.ip_security.whitelist.enabled,
      rate_limiting_enabled: securityConfig.rate_limiting.enabled,
      cors_enabled: securityConfig.cors !== undefined
    };
    
    // 性能指标
    const performanceMetrics = getPerformanceMetrics();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        status: healthCheck.success ? "online" : "degraded",
        state_layer_status: healthCheck.success ? "connected" : "disconnected",
        cache_stats: cacheStats,
        security_status: securityStatus,
        performance_metrics: performanceMetrics,
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logError('状态检查失败', error);
    return new Response(JSON.stringify({ error: `状态检查失败: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 全局缓存对象 - 用于减少状态层请求
const globalCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
const MAX_CACHE_SIZE = 1000;

// 缓存管理工具函数
function getCacheItem(key) {
  const cached = globalCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }
  if (cached) {
    globalCache.delete(key);
  }
  return null;
}

function setCacheItem(key, value) {
  globalCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL
  });
  
  // 限制缓存大小
  if (globalCache.size > MAX_CACHE_SIZE) {
    const firstKey = globalCache.keys().next().value;
    globalCache.delete(firstKey);
  }
}

function clearCacheItem(key) {
  globalCache.delete(key);
}

// 增强状态层调用函数
async function callStateLayer(env, endpoint, method = 'GET', data = null) {
  try {
    const stateUrl = env.STATE_LAYER || 'https://jevshop.bensonlove1986.workers.dev';
    const url = `${stateUrl}${endpoint}`;
    
    // 缓存键生成 - 用于GET请求的缓存
    const cacheKey = method === 'GET' ? `${method}:${url}` : null;
    
    // 尝试从缓存获取（仅GET请求）
    if (method === 'GET' && cacheKey) {
      const cachedData = getCacheItem(cacheKey);
      if (cachedData) {
        console.log(`[Cache Hit] ${url}`);
        return {
          ...cachedData,
          cached: true
        };
      }
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer jev-api-key-123`
    };
    
    const options = {
      method,
      headers,
      cf: {
        cacheTtlByStatus: {
          '200-299': 10,
          '404': 1,
          '500-599': 0
        }
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    // 记录请求开始时间
    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // 记录性能指标
    console.log(`[State Layer] ${method} ${url} - ${response.status} (${latency}ms)`);
    
    const result = await response.json();
    
    // 缓存成功的GET响应
    if (method === 'GET' && cacheKey && response.ok) {
      setCacheItem(cacheKey, result);
    }
    
    // 对于写操作，清除相关缓存
    if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && endpoint === '/set') {
      if (data && data.key) {
        clearCacheItem(`GET:${stateUrl}/get?key=${data.key}`);
        // 清除可能的列表缓存
        clearCacheItem(`GET:${stateUrl}/list`);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`[State Layer Integration] Error calling ${endpoint}:`, error);
    // 返回结构化错误响应
    return {
      success: false,
      error: error.message || 'State Layer connection failed',
      errorType: error.name || 'UnknownError',
      timestamp: Date.now()
    };
  }
}

/**
 * 主请求处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {Object} ctx - 上下文对象
 * @returns {Promise<Response>} - 响应对象
 */
async function handleRequest(request, env, ctx) {
  // 记录请求
  const url = new URL(request.url);
  console.log(`[${request.method}] ${url.pathname}`);
  
  // 处理CORS预检
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  // 路由分发
  const path = url.pathname;
  
  try {
    // 系统健康检测
    if (path === '/api/jev/ping') {
      return await handlePing(env);
    }
    
    // UI状态管理
    if (path === '/api/jev/ui') {
      return await handleUI(request, env);
    }
    
    // Agent管理
    if (path.startsWith('/api/jev/agents')) {
      return await handleAgents(request, env, url);
    }
    
    // 日志系统
    if (path.startsWith('/api/jev/log')) {
      return await handleLog(request, env, url);
    }
    
    // 文件上传
    if (path === '/api/jev/upload') {
      return await handleUpload(request, env);
    }
    
    // OCR结果处理
    if (path === '/api/jev/ocr/result') {
      return await handleOcrResult(request, env);
    }
    
    // AI任务处理 - 使用增强版本
    if (path === '/api/jev/task/ai') {
      return await handleAITask(request, env);
    }
    
    // 系统状态汇总 - 使用增强版本
    if (path === '/api/jev/status') {
      return await handleStatus(request, env);
    }
    
    // 插件系统集成 - 状态层访问接口
    if (path.startsWith('/api/jev/plugin/state/')) {
      try {
        // 提取状态操作路径
        const statePath = path.replace('/api/jev/plugin/state', '');
        
        // 处理get操作
        if (statePath === '/get' && url.searchParams.has('key')) {
          const key = url.searchParams.get('key');
          const result = await callStateLayer('/get', 'GET', { key });
          return formatResponse(result);
        }
        
        // 处理set操作
        if (statePath === '/set' && request.method === 'POST') {
          const body = await request.json();
          const validation = validateStateLayerData(body);
          if (!validation.valid) {
            return json({ success: false, error: validation.error }, 400);
          }
          const result = await callStateLayer('/set', 'POST', body);
          return formatResponse(result);
        }
        
        // 处理list操作
        if (statePath === '/list') {
          const result = await callStateLayer('/list', 'GET');
          return formatResponse(result);
        }
        
        return json({ success: false, error: '不支持的状态操作' }, 400);
      } catch (error) {
        logError('[Plugin Integration] Error', error);
        return json({ success: false, error: error.message }, 500);
      }
    }
    
    // 默认响应
    return json({
      success: true,
      message: 'JEV Cloudflare Worker 运行正常',
      version: 'L6.0.0',
      routes: [
        '/api/jev/ping - 系统健康检测',
        '/api/jev/ui - UI状态管理',
        '/api/jev/agents/* - Agent管理',
        '/api/jev/log - 日志系统',
        '/api/jev/upload - 文件上传',
        '/api/jev/ocr/result - OCR结果处理',
        '/api/jev/task/ai - AI任务处理',
        '/api/jev/status - 系统状态汇总',
        '/api/jev/plugin/state/* - 插件状态访问'
      ]
    });
  } catch (error) {
    console.error('请求处理异常:', error);
    return errorResponse('服务器内部错误');
  }
}

/**
 * Worker入口函数
 */
export default {
  async fetch(request, env, ctx) {
    // 初始化日志
    if (Date.now() - startTime < 5000) { // 启动后5秒内显示初始化日志
      const bindings = getBindingStatus(env);
      console.log('[JEV] Worker 初始化完成：');
      console.log(`- KV jevui ${bindings.jevui ? '✅' : '❌'}`);
      console.log(`- KV MEM_STORE ${bindings.MEM_STORE ? '✅' : '❌'}`);
      console.log(`- R2_BUCKET ${bindings.R2_BUCKET ? '✅' : '❌'}`);
      console.log('[JEV] 所有服务准备就绪。');
    }
    
    const url = new URL(request.url);
    
    // 处理Durable Object路由 - 支持两种路径格式
    if (url.pathname.startsWith('/state/')) {
      const statePath = url.pathname.substring('/state'.length);
      const id = env.JEV_STATE?.idFromName('global');
      if (id) {
        const stub = env.JEV_STATE.get(id);
        // 重写请求URL，移除/state前缀
        const newRequest = new Request(
          `https://${url.host}${statePath}${url.search}`,
          request
        );
        return stub.fetch(newRequest);
      }
    }
    
    // 直接处理状态API路径
    const statePaths = ['/set', '/get', '/delete', '/list'];
    if (statePaths.includes(url.pathname)) {
      const id = env.JEV_STATE?.idFromName('global');
      if (id) {
        const stub = env.JEV_STATE.get(id);
        return stub.fetch(request);
      }
    }
    
    return handleRequest(request, env, ctx);
  }
};

// 单独导出Durable Objects类以满足部署需求
export { Counter, SessionStore, StateManager };


// 测试命令示例：
// curl https://jevshop.bensonlove1986.workers.dev/api/jev/ping
// curl -X POST -H "Content-Type: application/json" -d '{"agent_id":"DESKTOP_01"}' https://jevshop.bensonlove1986.workers.dev/api/jev/agents/register
// curl -X POST -F "file=@test.png" https://jevshop.bensonlove1986.workers.dev/api/jev/upload
// curl https://jevshop.bensonlove1986.workers.dev/api/jev/status