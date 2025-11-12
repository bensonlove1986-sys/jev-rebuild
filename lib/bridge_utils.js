// JEV L6.9.1 - Bridge 工具函数库
// 封装请求签名、缓存管理与错误恢复功能

/**
 * 请求签名工具
 */
export const signatureUtils = {
  /**
   * 生成 SHA256 签名
   * @param {string} data - 待签名数据
   * @param {string} secret - 密钥
   * @returns {Promise<string>} SHA256 签名的十六进制字符串
   */
  async generateSHA256(data, secret) {
    try {
      // 浏览器环境使用 Web Crypto API
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const message = new TextEncoder().encode(data + secret);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', message);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      
      // Node.js 环境使用 crypto 模块
      if (typeof require !== 'undefined') {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
          .update(data + secret)
          .digest('hex');
      }
      
      // 降级方案：简单哈希实现
      return this.fallbackHash(data + secret);
      
    } catch (error) {
      console.error('[BridgeUtils] SHA256 生成失败:', error);
      return this.fallbackHash(data + secret);
    }
  },

  /**
   * 降级哈希实现
   * @param {string} str - 输入字符串
   * @returns {string} 哈希值
   */
  fallbackHash(str) {
    let hash = 0n;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash * 31n + BigInt(char)) & 0xffffffffffffffffn;
    }
    return hash.toString(16).padStart(16, '0');
  },

  /**
   * 创建请求签名头
   * @param {string} sessionId - 会话 ID
   * @param {string} masterKey - 主密钥
   * @returns {Promise<Object>} 签名头对象
   */
  async createSignatureHeaders(sessionId, masterKey) {
    const timestamp = Date.now().toString();
    const signature = await this.generateSHA256(sessionId + timestamp, masterKey);
    
    return {
      'X-JEV-Session-ID': sessionId,
      'X-JEV-Bridge-Signature': signature,
      'X-JEV-Timestamp': timestamp
    };
  },

  /**
   * 验证签名
   * @param {Object} headers - 请求头
   * @param {string} masterKey - 主密钥
   * @returns {Promise<boolean>} 验证结果
   */
  async verifySignature(headers, masterKey) {
    const sessionId = headers['X-JEV-Session-ID'];
    const signature = headers['X-JEV-Bridge-Signature'];
    const timestamp = headers['X-JEV-Timestamp'];
    
    if (!sessionId || !signature || !timestamp) {
      return false;
    }
    
    // 验证时间戳（防止重放攻击）
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    const timeDiff = Math.abs(now - requestTime);
    
    // 允许 5 分钟的时间窗口
    if (timeDiff > 300000) {
      return false;
    }
    
    // 重新计算签名并验证
    const expectedSignature = await this.generateSHA256(sessionId + timestamp, masterKey);
    return signature === expectedSignature;
  }
};

/**
 * 缓存管理工具
 */
export const cacheManager = {
  /**
   * 缓存键前缀
   */
  PREFIX: 'jev_bridge_',
  
  /**
   * 存储数据
   * @param {string} key - 缓存键
   * @param {*} value - 要存储的值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = 3600000) {
    try {
      const cacheKey = this.PREFIX + key;
      const data = {
        value,
        expires: ttl ? Date.now() + ttl : null
      };
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } else if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      }
      
      return true;
    } catch (error) {
      console.error('[CacheManager] 存储失败:', error);
      return false;
    }
  },
  
  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {*} 缓存的值，如果不存在或已过期则返回 null
   */
  get(key) {
    try {
      const cacheKey = this.PREFIX + key;
      let data;
      
      if (typeof localStorage !== 'undefined') {
        data = localStorage.getItem(cacheKey);
      } else if (typeof sessionStorage !== 'undefined') {
        data = sessionStorage.getItem(cacheKey);
      }
      
      if (!data) {
        return null;
      }
      
      const parsed = JSON.parse(data);
      
      // 检查是否过期
      if (parsed.expires && Date.now() > parsed.expires) {
        this.remove(key);
        return null;
      }
      
      return parsed.value;
    } catch (error) {
      console.error('[CacheManager] 获取失败:', error);
      return null;
    }
  },
  
  /**
   * 移除缓存
   * @param {string} key - 缓存键
   */
  remove(key) {
    try {
      const cacheKey = this.PREFIX + key;
      
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(cacheKey);
      } else if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.error('[CacheManager] 移除失败:', error);
    }
  },
  
  /**
   * 清空所有缓存
   */
  clear() {
    try {
      const storage = typeof localStorage !== 'undefined' ? localStorage : 
                     typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      
      if (storage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            storage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('[CacheManager] 清空失败:', error);
    }
  },
  
  /**
   * 批量存储会话数据
   * @param {Object} sessions - 会话数据对象
   */
  storeSessions(sessions) {
    this.set('sessions', sessions, 86400000); // 24小时过期
  },
  
  /**
   * 获取所有会话数据
   * @returns {Object} 会话数据对象
   */
  getSessions() {
    return this.get('sessions') || {};
  },
  
  /**
   * 存储待发送的写操作
   * @param {Array} pendingWrites - 待发送的写操作数组
   */
  storePendingWrites(pendingWrites) {
    this.set('pending_writes', pendingWrites);
  },
  
  /**
   * 获取待发送的写操作
   * @returns {Array} 待发送的写操作数组
   */
  getPendingWrites() {
    return this.get('pending_writes') || [];
  }
};

/**
 * 错误恢复工具
 */
export const recoveryUtils = {
  /**
   * 重试机制
   * @param {Function} fn - 要重试的函数
   * @param {Object} options - 重试选项
   * @returns {Promise<any>} 函数执行结果
   */
  async retry(fn, options = {}) {
    const {
      attempts = 3,
      delay = 1000,
      maxDelay = 10000,
      exponentialBackoff = true,
      retryableErrors = []
    } = options;

    let lastError;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // 检查是否是可重试的错误
        const shouldRetry = retryableErrors.length === 0 || 
                           retryableErrors.some(errType => error instanceof errType || error.message.includes(errType));
        
        if (!shouldRetry || i === attempts - 1) {
          throw error;
        }
        
        // 计算延迟时间
        const currentDelay = exponentialBackoff 
          ? Math.min(delay * Math.pow(2, i), maxDelay)
          : delay;
        
        console.log(`[RecoveryUtils] 操作失败，${currentDelay}ms 后重试 (${i + 1}/${attempts})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }
    
    throw lastError;
  },

  /**
   * 自动恢复管理器
   */
  recoveryManager: {
    _listeners: [],
    _isRecovering: false,
    
    /**
     * 注册恢复监听器
     * @param {Function} listener - 恢复监听器函数
     * @returns {Function} 取消注册函数
     */
    registerRecoveryListener(listener) {
      this._listeners.push(listener);
      return () => {
        this._listeners = this._listeners.filter(l => l !== listener);
      };
    },
    
    /**
     * 触发恢复流程
     */
    async triggerRecovery() {
      if (this._isRecovering) {
        console.log('[RecoveryManager] 恢复流程已在进行中');
        return;
      }
      
      this._isRecovering = true;
      console.log('[RecoveryManager] 开始恢复流程');
      
      try {
        // 并行执行所有恢复监听器
        await Promise.allSettled(
          this._listeners.map(listener => {
            try {
              return Promise.resolve(listener());
            } catch (error) {
              console.error('[RecoveryManager] 恢复监听器执行失败:', error);
              return Promise.resolve();
            }
          })
        );
        
        console.log('[RecoveryManager] 恢复流程完成');
      } finally {
        this._isRecovering = false;
      }
    }
  },

  /**
   * 健康检查
   * @param {string} url - 检查 URL
   * @param {Object} options - 选项
   * @returns {Promise<boolean>} 健康状态
   */
  async healthCheck(url, options = {}) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: options.timeout || 5000,
        ...options
      });
      return response.ok;
    } catch (error) {
      console.error('[RecoveryUtils] 健康检查失败:', error);
      return false;
    }
  },

  /**
   * 会话数据修复
   * @param {Object} sessionData - 会话数据
   * @returns {Object} 修复后的会话数据
   */
  repairSessionData(sessionData) {
    if (!sessionData || typeof sessionData !== 'object') {
      return { history: [], lastMessage: '', lastResponse: '' };
    }
    
    // 确保必要字段存在
    const repaired = {
      history: Array.isArray(sessionData.history) ? sessionData.history : [],
      lastMessage: sessionData.lastMessage || '',
      lastResponse: sessionData.lastResponse || '',
      lang: sessionData.lang || 'zh-CN',
      ...sessionData
    };
    
    // 清理无效数据
    repaired.history = repaired.history.filter(msg => msg && typeof msg === 'string');
    
    return repaired;
  }
};

/**
 * 网络工具
 */
export const networkUtils = {
  /**
   * 检查网络状态
   * @returns {boolean} 是否在线
   */
  isOnline() {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true; // 默认为在线
  },

  /**
   * 增强的 fetch 函数，包含重试和错误处理
   * @param {string} url - 请求 URL
   * @param {Object} options - fetch 选项
   * @param {Object} retryOptions - 重试选项
   * @returns {Promise<Response>} fetch 响应
   */
  async enhancedFetch(url, options = {}, retryOptions = {}) {
    // 默认重试选项
    const defaultRetryOptions = {
      attempts: 3,
      delay: 1000,
      retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout', 'AbortError']
    };
    
    const mergedRetryOptions = {
      ...defaultRetryOptions,
      ...retryOptions
    };
    
    return recoveryUtils.retry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            // 对于特定的状态码也进行重试
            if ([429, 500, 502, 503, 504].includes(response.status)) {
              throw new Error(`HTTP error ${response.status}`);
            }
          }
          
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      mergedRetryOptions
    );
  },

  /**
   * 批量请求处理
   * @param {Array} requests - 请求配置数组
   * @param {number} concurrency - 并发数
   * @returns {Promise<Array>} 所有请求的结果
   */
  async batchRequests(requests, concurrency = 3) {
    const results = [];
    const queue = [...requests];
    const activeRequests = new Set();
    
    const executeRequest = async (requestConfig) => {
      activeRequests.add(requestConfig);
      
      try {
        const response = await this.enhancedFetch(
          requestConfig.url,
          requestConfig.options,
          requestConfig.retryOptions
        );
        
        let result;
        try {
          result = await response.json();
        } catch {
          result = await response.text();
        }
        
        results.push({
          ...requestConfig,
          success: true,
          data: result,
          status: response.status
        });
      } catch (error) {
        results.push({
          ...requestConfig,
          success: false,
          error: error.message
        });
      } finally {
        activeRequests.delete(requestConfig);
      }
    };
    
    while (queue.length > 0 || activeRequests.size > 0) {
      while (activeRequests.size < concurrency && queue.length > 0) {
        const requestConfig = queue.shift();
        executeRequest(requestConfig);
      }
      
      if (activeRequests.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
};

/**
 * 合并工具
 */
export const mergeUtils = {
  /**
   * 智能合并会话数据，避免重复
   * @param {Object} target - 目标会话数据
   * @param {Object} source - 源会话数据
   * @returns {Object} 合并后的会话数据
   */
  mergeSessionData(target, source) {
    if (!source) return target;
    if (!target) return source;
    
    const merged = { ...target, ...source };
    
    // 智能合并历史记录
    if (source.history && Array.isArray(source.history)) {
      const targetHistory = Array.isArray(target.history) ? target.history : [];
      
      // 找出源历史中不在目标历史中的消息
      const newMessages = source.history.filter(msg => 
        !targetHistory.includes(msg)
      );
      
      // 合并历史记录，保持顺序
      merged.history = [...targetHistory];
      
      // 添加新消息到历史记录
      newMessages.forEach(msg => {
        if (!merged.history.includes(msg)) {
          merged.history.push(msg);
        }
      });
      
      // 限制历史记录长度
      if (merged.history.length > 100) {
        merged.history = merged.history.slice(-100);
      }
    }
    
    // 时间戳处理
    merged.lastUpdated = new Date().toISOString();
    
    return merged;
  },

  /**
   * 去重待处理的写操作
   * @param {Array} pendingWrites - 待处理的写操作数组
   * @returns {Array} 去重后的写操作数组
   */
  deduplicatePendingWrites(pendingWrites) {
    if (!Array.isArray(pendingWrites)) {
      return [];
    }
    
    const sessionMap = new Map();
    
    // 按会话 ID 分组，保留最新的操作
    pendingWrites.forEach(write => {
      const existing = sessionMap.get(write.sessionId);
      if (!existing || new Date(write.timestamp) > new Date(existing.timestamp)) {
        sessionMap.set(write.sessionId, write);
      }
    });
    
    // 转换回数组
    return Array.from(sessionMap.values());
  }
};

// 导出所有工具
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    signatureUtils,
    cacheManager,
    recoveryUtils,
    networkUtils,
    mergeUtils
  };
}