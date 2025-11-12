/**
 * JEV-PluginSync-v1.0 三层通信闭环错误处理与恢复模块
 * 功能：提供故障检测、智能重试、自动恢复和降级机制
 */

class JEVThreeLayerErrorHandler {
  constructor(config = {}) {
    this.config = {
      retryStrategy: config.retryStrategy || {
        maxRetries: 3,
        baseDelay: 1000, // 1秒
        maxDelay: 30000, // 30秒
        backoffMultiplier: 2
      },
      circuitBreaker: config.circuitBreaker || {
        failureThreshold: 5,
        resetTimeout: 30000, // 30秒后尝试半开
        halfOpenSuccessThreshold: 2
      },
      fallbackEnabled: config.fallbackEnabled !== undefined ? config.fallbackEnabled : true,
      offlineModeThreshold: config.offlineModeThreshold || 30000, // 30秒连接失败进入离线模式
      ...config
    };

    // 电路状态：closed, open, half-open
    this.circuitState = {
      plugin: 'closed',
      relay: 'closed',
      worker: 'closed'
    };

    // 故障计数器
    this.failureCount = {
      plugin: 0,
      relay: 0,
      worker: 0
    };

    // 半开状态成功计数器
    this.successCount = {
      plugin: 0,
      relay: 0,
      worker: 0
    };

    // 最后重置时间
    this.lastResetTime = {
      plugin: Date.now(),
      relay: Date.now(),
      worker: Date.now()
    };

    // 失败历史
    this.failureHistory = [];
    
    // 降级策略
    this.fallbacks = new Map();
    
    // 事件监听器
    this.listeners = new Map();
    
    // 离线模式计时器
    this.offlineModeTimer = null;
    this.isOfflineMode = false;

    // 初始化降级策略
    this.initFallbacks();
  }

  /**
   * 初始化降级策略
   */
  initFallbacks() {
    // 插件层降级策略
    this.registerFallback('plugin', async (operation, params) => {
      this.logger('插件层降级：使用本地缓存数据', 'warn');
      // 返回缓存数据或默认值
      return this.getCachedData(operation, params) || {
        success: false,
        error: '插件层不可用，已启用降级模式'
      };
    });

    // 中继层降级策略
    this.registerFallback('relay', async (operation, params) => {
      this.logger('中继层降级：尝试直接连接Worker', 'warn');
      // 尝试直接连接Worker
      if (this.config.workerDirectEndpoint) {
        try {
          const response = await fetch(this.config.workerDirectEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
          return await response.json();
        } catch (error) {
          this.logger(`直接连接Worker失败: ${error.message}`, 'error');
        }
      }
      return {
        success: false,
        error: '中继层不可用，直接连接Worker失败'
      };
    });

    // Worker层降级策略
    this.registerFallback('worker', async (operation, params) => {
      this.logger('Worker层降级：使用本地处理', 'warn');
      // 在本地处理部分功能
      return this.processLocally(operation, params);
    });
  }

  /**
   * 注册降级策略
   */
  registerFallback(layer, fallbackFunction) {
    this.fallbacks.set(layer, fallbackFunction);
    this.logger(`已注册${layer}层降级策略`, 'info');
  }

  /**
   * 处理错误
   */
  async handleError(layer, operation, error, params = {}) {
    const now = Date.now();
    
    // 记录错误
    this.recordError(layer, operation, error, params);
    
    // 更新故障计数和电路状态
    this.updateCircuitState(layer, 'failure');
    
    // 检查是否应该触发重试
    const shouldRetry = this.shouldRetry(layer, operation, error);
    
    if (shouldRetry) {
      const retryCount = (params.retryCount || 0) + 1;
      const delay = this.calculateRetryDelay(retryCount);
      
      this.logger(`${layer}层操作失败，将在${delay}ms后重试 (第${retryCount}次)`, 'warn');
      
      // 触发重试事件
      this.triggerEvent('retry', {
        layer,
        operation,
        retryCount,
        delay,
        error: error.message
      });
      
      // 执行重试
      return this.retryOperation(layer, operation, params, delay, retryCount);
    } else {
      // 检查是否应该使用降级策略
      if (this.config.fallbackEnabled && this.fallbacks.has(layer)) {
        this.logger(`${layer}层操作失败，启用降级策略`, 'warn');
        
        // 触发降级事件
        this.triggerEvent('fallback', {
          layer,
          operation,
          error: error.message
        });
        
        try {
          const fallbackFunction = this.fallbacks.get(layer);
          return await fallbackFunction(operation, params);
        } catch (fallbackError) {
          this.logger(`${layer}层降级策略失败: ${fallbackError.message}`, 'error');
          throw fallbackError;
        }
      }
      
      // 检查是否应该进入离线模式
      if (!this.isOfflineMode && this.shouldEnterOfflineMode()) {
        this.enterOfflineMode();
      }
      
      // 抛出原始错误
      throw error;
    }
  }

  /**
   * 记录成功
   */
  recordSuccess(layer, operation, result) {
    this.updateCircuitState(layer, 'success');
    
    // 重置离线模式计时器
    this.resetOfflineModeTimer();
    
    if (this.isOfflineMode && this.allCriticalLayersHealthy()) {
      this.exitOfflineMode();
    }
    
    this.logger(`${layer}层操作成功: ${operation}`, 'debug');
  }

  /**
   * 更新电路状态
   */
  updateCircuitState(layer, result) {
    const now = Date.now();
    
    if (result === 'failure') {
      this.failureCount[layer]++;
      this.successCount[layer] = 0;
      
      // 检查是否应该打开电路
      if (this.failureCount[layer] >= this.config.circuitBreaker.failureThreshold) {
        this.circuitState[layer] = 'open';
        this.lastResetTime[layer] = now;
        
        this.logger(`${layer}层电路已打开，防止进一步请求`, 'warn');
        this.triggerEvent('circuitOpen', { layer });
      }
    } else if (result === 'success') {
      if (this.circuitState[layer] === 'half-open') {
        this.successCount[layer]++;
        
        // 检查是否应该关闭电路
        if (this.successCount[layer] >= this.config.circuitBreaker.halfOpenSuccessThreshold) {
          this.circuitState[layer] = 'closed';
          this.failureCount[layer] = 0;
          this.successCount[layer] = 0;
          
          this.logger(`${layer}层电路已关闭，恢复正常操作`, 'info');
          this.triggerEvent('circuitClosed', { layer });
        }
      } else if (this.circuitState[layer] === 'closed') {
        // 重置失败计数
        this.failureCount[layer] = 0;
      }
    }
    
    // 检查是否应该进入半开状态
    if (this.circuitState[layer] === 'open') {
      const timeSinceOpen = now - this.lastResetTime[layer];
      if (timeSinceOpen >= this.config.circuitBreaker.resetTimeout) {
        this.circuitState[layer] = 'half-open';
        this.successCount[layer] = 0;
        
        this.logger(`${layer}层电路已进入半开状态，尝试恢复`, 'info');
        this.triggerEvent('circuitHalfOpen', { layer });
      }
    }
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(layer, operation, error) {
    // 检查电路状态
    if (this.circuitState[layer] === 'open') {
      return false;
    }
    
    // 特定错误类型不重试
    const noRetryErrors = ['Unauthorized', 'Forbidden', 'NotFound'];
    const errorMessage = error.message || '';
    
    for (const noRetryError of noRetryErrors) {
      if (errorMessage.includes(noRetryError)) {
        return false;
      }
    }
    
    // 网络错误通常值得重试
    const networkErrors = ['NetworkError', 'ConnectionRefused', 'Timeout', 'fetch failed'];
    for (const networkError of networkErrors) {
      if (errorMessage.includes(networkError)) {
        return true;
      }
    }
    
    // 默认策略
    return true;
  }

  /**
   * 计算重试延迟
   */
  calculateRetryDelay(retryCount) {
    const { baseDelay, maxDelay, backoffMultiplier } = this.config.retryStrategy;
    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, retryCount - 1),
      maxDelay
    );
    
    // 添加随机抖动 (±20%)
    const jitter = 0.8 + Math.random() * 0.4;
    return Math.round(delay * jitter);
  }

  /**
   * 重试操作
   */
  async retryOperation(layer, operation, params, delay, retryCount) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // 注意：这里需要外部传入的操作函数
          // 实际使用时，应该将操作函数作为参数传递
          const retryParams = { ...params, retryCount };
          // resolve(await operation(retryParams));
          
          // 由于无法直接执行操作函数，这里返回一个特殊的重试标记
          resolve({
            __retryRequired: true,
            layer,
            operation,
            params: retryParams,
            delay
          });
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * 记录错误到历史
   */
  recordError(layer, operation, error, params) {
    const errorRecord = {
      layer,
      operation,
      error: error.message || 'Unknown error',
      timestamp: Date.now(),
      params: this.sanitizeParams(params)
    };
    
    this.failureHistory.push(errorRecord);
    
    // 保留最近100条错误记录
    if (this.failureHistory.length > 100) {
      this.failureHistory.shift();
    }
    
    this.logger(`记录错误: [${layer}] ${operation} - ${error.message}`, 'error');
  }

  /**
   * 清理参数（移除敏感信息）
   */
  sanitizeParams(params) {
    if (!params || typeof params !== 'object') return params;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...params };
    
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  /**
   * 检查是否应该进入离线模式
   */
  shouldEnterOfflineMode() {
    const criticalLayers = ['relay', 'worker'];
    const now = Date.now();
    
    // 检查关键层是否都处于开路状态
    for (const layer of criticalLayers) {
      if (this.circuitState[layer] !== 'open') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 进入离线模式
   */
  enterOfflineMode() {
    this.isOfflineMode = true;
    this.logger('系统已进入离线模式', 'warn');
    
    // 停止离线模式计时器
    if (this.offlineModeTimer) {
      clearTimeout(this.offlineModeTimer);
    }
    
    // 触发离线模式事件
    this.triggerEvent('offlineModeEntered', {
      timestamp: Date.now()
    });
  }

  /**
   * 退出离线模式
   */
  exitOfflineMode() {
    this.isOfflineMode = false;
    this.logger('系统已退出离线模式', 'info');
    
    // 触发恢复在线模式事件
    this.triggerEvent('onlineModeRestored', {
      timestamp: Date.now()
    });
  }

  /**
   * 重置离线模式计时器
   */
  resetOfflineModeTimer() {
    if (this.offlineModeTimer) {
      clearTimeout(this.offlineModeTimer);
    }
    
    this.offlineModeTimer = setTimeout(() => {
      this.enterOfflineMode();
    }, this.config.offlineModeThreshold);
  }

  /**
   * 检查所有关键层是否健康
   */
  allCriticalLayersHealthy() {
    const criticalLayers = ['relay', 'worker'];
    
    for (const layer of criticalLayers) {
      if (this.circuitState[layer] !== 'closed') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取缓存数据
   */
  getCachedData(operation, params) {
    try {
      // 在浏览器环境中使用localStorage
      if (typeof localStorage !== 'undefined') {
        const cacheKey = `jev_cache_${operation}_${JSON.stringify(params)}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          // 检查缓存是否过期（5分钟）
          if (Date.now() - data.timestamp < 300000) {
            return data.value;
          }
        }
      }
      
      // 在Node.js环境中使用内存缓存
      // 注意：实际使用时应该有更复杂的缓存机制
    } catch (error) {
      this.logger(`获取缓存数据失败: ${error.message}`, 'error');
    }
    
    return null;
  }

  /**
   * 本地处理操作
   */
  processLocally(operation, params) {
    // 实现基本的本地处理逻辑
    const handlers = {
      'getConfig': () => ({ success: true, config: this.getLocalConfig() }),
      'getStatus': () => ({ 
        success: true, 
        status: 'offline',
        message: '系统当前处于离线模式'
      }),
      'syncData': () => ({ 
        success: false, 
        error: '数据同步需要在线连接',
        queued: true,
        message: '操作已加入离线队列，将在恢复连接后处理'
      })
    };
    
    return handlers[operation] ? handlers[operation]() : {
      success: false,
      error: `不支持的本地操作: ${operation}`
    };
  }

  /**
   * 获取本地配置
   */
  getLocalConfig() {
    return {
      mode: 'offline',
      lastSyncTime: Date.now(),
      offlineMode: this.isOfflineMode
    };
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = {
      byLayer: {},
      byOperation: {},
      totalErrors: this.failureHistory.length,
      recentErrors: this.failureHistory.slice(-10)
    };
    
    // 按层统计
    for (const error of this.failureHistory) {
      if (!stats.byLayer[error.layer]) {
        stats.byLayer[error.layer] = 0;
      }
      stats.byLayer[error.layer]++;
      
      if (!stats.byOperation[error.operation]) {
        stats.byOperation[error.operation] = 0;
      }
      stats.byOperation[error.operation]++;
    }
    
    return stats;
  }

  /**
   * 获取系统恢复建议
   */
  getRecoverySuggestions() {
    const suggestions = [];
    
    // 检查各层状态
    for (const [layer, state] of Object.entries(this.circuitState)) {
      if (state === 'open') {
        suggestions.push(`检查${layer}层服务是否正常运行`);
      }
    }
    
    // 检查离线模式
    if (this.isOfflineMode) {
      suggestions.push('检查网络连接，重新启动本地中继服务');
    }
    
    // 根据错误统计提供建议
    const stats = this.getErrorStats();
    if (stats.totalErrors > 0) {
      // 找出错误最多的操作
      const mostFailingOperation = Object.entries(stats.byOperation)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (mostFailingOperation) {
        suggestions.push(`操作"${mostFailingOperation[0]}"失败次数过多，建议检查其实现或参数`);
      }
    }
    
    return suggestions;
  }

  /**
   * 注册事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  triggerEvent(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.logger(`事件监听器执行失败: ${error.message}`, 'error');
      }
    });
  }

  /**
   * 日志记录
   */
  logger(message, level = 'info') {
    const levels = ['debug', 'info', 'warn', 'error'];
    const logLevel = 'info'; // 默认日志级别
    const levelIndex = levels.indexOf(logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= levelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] JEV-ErrorHandler: ${message}`);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      circuitState: { ...this.circuitState },
      failureCount: { ...this.failureCount },
      isOfflineMode: this.isOfflineMode,
      errorStats: this.getErrorStats(),
      recoverySuggestions: this.getRecoverySuggestions()
    };
  }

  /**
   * 重置错误处理状态
   */
  reset() {
    this.circuitState = {
      plugin: 'closed',
      relay: 'closed',
      worker: 'closed'
    };
    
    this.failureCount = {
      plugin: 0,
      relay: 0,
      worker: 0
    };
    
    this.successCount = {
      plugin: 0,
      relay: 0,
      worker: 0
    };
    
    this.failureHistory = [];
    
    if (this.isOfflineMode) {
      this.exitOfflineMode();
    }
    
    this.logger('错误处理状态已重置', 'info');
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = JEVThreeLayerErrorHandler;
} else if (typeof window !== 'undefined') {
  window.JEVThreeLayerErrorHandler = JEVThreeLayerErrorHandler;
}

// 浏览器环境的使用提示
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('JEV三层通信错误处理模块已加载');
  });
}