/**
 * API优化模块 - 用于请求合并和超时重试机制
 * 此模块提供统一的API请求优化功能，包括请求合并、超时处理、重试机制等
 */
class APIOptimizer {
    constructor() {
        // 配置参数
        this.config = {
            // 重试配置
            retryConfig: {
                maxRetries: 3,
                baseDelay: 1000, // 基础延迟1秒
                maxDelay: 10000, // 最大延迟10秒
                exponentialBackoff: true, // 使用指数退避策略
                retryableStatuses: [408, 429, 500, 502, 503, 504] // 可重试的HTTP状态码
            },
            
            // 请求合并配置
            batchingConfig: {
                enabled: true,
                batchInterval: 200, // 合并窗口200ms
                maxBatchSize: 10 // 最大批处理大小
            },
            
            // 超时配置
            timeoutConfig: {
                defaultTimeout: 10000, // 默认超时10秒
                boloTimeout: 5000,    // BOLO提取超时5秒
                ocrTimeout: 15000,    // OCR识别超时15秒
                translationTimeout: 8000, // 翻译超时8秒
                aiTimeout: 20000      // AI对话超时20秒
            }
        };
        
        // 请求批处理队列
        this.batchQueues = {
            ocr: [],
            translation: [],
            ai: []
        };
        
        // 批处理定时器
        this.batchTimers = {};
        
        // 请求统计
        this.stats = {
            totalRequests: 0,
            batchedRequests: 0,
            retriedRequests: 0,
            failedRequests: 0,
            timeoutRequests: 0
        };
        
        // 初始化
        console.log('[API Optimizer] Module initialized');
        console.log('[API Optimizer] Retry enabled:', this.config.retryConfig.maxRetries > 0);
        console.log('[API Optimizer] Batching enabled:', this.config.batchingConfig.enabled);
    }
    
    /**
     * 带超时和重试的fetch包装器
     * @param {string} url - 请求URL
     * @param {Object} options - fetch选项
     * @param {Object} requestConfig - 请求配置（包含超时和重试设置）
     * @returns {Promise} - 返回fetch结果
     */
    async fetchWithRetryAndTimeout(url, options = {}, requestConfig = {}) {
        this.stats.totalRequests++;
        
        // 合并配置
        const config = {
            timeout: this.getTimeoutForEndpoint(url),
            ...this.config.retryConfig,
            ...requestConfig
        };
        
        let lastError;
        
        // 重试逻辑
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                // 带超时的fetch
                const result = await this.fetchWithTimeout(url, options, config.timeout);
                
                // 检查响应状态
                if (!result.ok) {
                    // 如果是可重试的状态码，进行重试
                    if (config.retryableStatuses.includes(result.status) && attempt < config.maxRetries) {
                        lastError = new Error(`HTTP error! status: ${result.status}`);
                        const delay = this.calculateRetryDelay(attempt, config);
                        console.log(`[API Optimizer] Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
                        this.stats.retriedRequests++;
                        await this.delay(delay);
                        continue;
                    }
                    
                    // 不可重试的错误，直接抛出
                    throw new Error(`HTTP error! status: ${result.status}`);
                }
                
                return result;
            } catch (error) {
                // 处理网络错误或超时
                if (attempt < config.maxRetries && error.name === 'AbortError') {
                    lastError = error;
                    const delay = this.calculateRetryDelay(attempt, config);
                    console.log(`[API Optimizer] Request timed out, retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
                    this.stats.retriedRequests++;
                    this.stats.timeoutRequests++;
                    await this.delay(delay);
                } else {
                    lastError = error;
                    break;
                }
            }
        }
        
        // 所有重试都失败
        this.stats.failedRequests++;
        throw lastError || new Error('Unknown request error');
    }
    
    /**
     * 带超时的fetch
     * @param {string} url - 请求URL
     * @param {Object} options - fetch选项
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise} - 返回fetch结果
     */
    async fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const { signal } = controller;
        
        // 设置超时
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // 转换AbortError为更有描述性的错误
            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${timeout}ms`);
                timeoutError.name = 'AbortError';
                throw timeoutError;
            }
            
            throw error;
        }
    }
    
    /**
     * 计算重试延迟时间
     * @param {number} attempt - 当前尝试次数
     * @param {Object} config - 重试配置
     * @returns {number} - 延迟时间（毫秒）
     */
    calculateRetryDelay(attempt, config) {
        if (!config.exponentialBackoff) {
            return config.baseDelay;
        }
        
        // 指数退避 + 随机抖动
        const delay = Math.min(
            config.baseDelay * Math.pow(2, attempt),
            config.maxDelay
        );
        
        // 添加10%的随机抖动以避免重试风暴
        const jitter = delay * 0.1 * (Math.random() - 0.5);
        return Math.max(0, delay + jitter);
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 延迟时间（毫秒）
     * @returns {Promise} - Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 根据端点获取适当的超时时间
     * @param {string} url - 请求URL
     * @returns {number} - 超时时间（毫秒）
     */
    getTimeoutForEndpoint(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('bolo') || urlLower.includes('address')) {
            return this.config.timeoutConfig.boloTimeout;
        } else if (urlLower.includes('ocr')) {
            return this.config.timeoutConfig.ocrTimeout;
        } else if (urlLower.includes('translate') || urlLower.includes('translation')) {
            return this.config.timeoutConfig.translationTimeout;
        } else if (urlLower.includes('ai') || urlLower.includes('dialog')) {
            return this.config.timeoutConfig.aiTimeout;
        }
        
        return this.config.timeoutConfig.defaultTimeout;
    }
    
    /**
     * 注册批处理请求
     * @param {string} type - 请求类型 (ocr, translation, ai)
     * @param {Object} requestData - 请求数据
     * @param {Function} callback - 回调函数
     */
    registerBatchRequest(type, requestData, callback) {
        if (!this.config.batchingConfig.enabled || !this.batchQueues[type]) {
            // 批处理未启用或类型不支持，直接执行
            callback(requestData);
            return;
        }
        
        // 添加到批处理队列
        this.batchQueues[type].push({
            data: requestData,
            callback: callback,
            timestamp: Date.now()
        });
        
        this.stats.batchedRequests++;
        
        // 如果队列达到最大大小，立即处理
        if (this.batchQueues[type].length >= this.config.batchingConfig.maxBatchSize) {
            this.processBatch(type);
            return;
        }
        
        // 设置定时器（如果还没有设置）
        if (!this.batchTimers[type]) {
            this.batchTimers[type] = setTimeout(() => {
                this.processBatch(type);
            }, this.config.batchingConfig.batchInterval);
        }
    }
    
    /**
     * 处理批处理队列
     * @param {string} type - 请求类型
     */
    processBatch(type) {
        // 清除定时器
        if (this.batchTimers[type]) {
            clearTimeout(this.batchTimers[type]);
            this.batchTimers[type] = null;
        }
        
        const queue = this.batchQueues[type];
        if (queue.length === 0) {
            return;
        }
        
        console.log(`[API Optimizer] Processing batch of ${queue.length} ${type} requests`);
        
        // 为了演示，这里我们单独处理每个请求
        // 在实际应用中，这里会将多个请求合并为一个批处理请求
        queue.forEach(request => {
            try {
                request.callback(request.data);
            } catch (error) {
                console.error(`[API Optimizer] Error processing batch request:`, error);
            }
        });
        
        // 清空队列
        this.batchQueues[type] = [];
    }
    
    /**
     * 获取API优化器统计信息
     * @returns {Object} - 统计信息
     */
    getStats() {
        const batchingEfficiency = this.stats.totalRequests > 0 
            ? (this.stats.batchedRequests / this.stats.totalRequests) * 100 
            : 0;
        
        const retryRate = this.stats.totalRequests > 0
            ? (this.stats.retriedRequests / this.stats.totalRequests) * 100
            : 0;
        
        return {
            ...this.stats,
            batchingEfficiency: batchingEfficiency,
            retryRate: retryRate,
            failureRate: this.stats.totalRequests > 0
                ? (this.stats.failedRequests / this.stats.totalRequests) * 100
                : 0,
            timeoutRate: this.stats.totalRequests > 0
                ? (this.stats.timeoutRequests / this.stats.totalRequests) * 100
                : 0
        };
    }
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            retryConfig: {
                ...this.config.retryConfig,
                ...(newConfig.retryConfig || {})
            },
            batchingConfig: {
                ...this.config.batchingConfig,
                ...(newConfig.batchingConfig || {})
            },
            timeoutConfig: {
                ...this.config.timeoutConfig,
                ...(newConfig.timeoutConfig || {})
            }
        };
        
        console.log('[API Optimizer] Configuration updated');
    }
    
    /**
     * 清空所有队列和统计信息
     */
    reset() {
        // 清除所有定时器
        Object.values(this.batchTimers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
            }
        });
        
        // 清空队列
        this.batchQueues = {
            ocr: [],
            translation: [],
            ai: []
        };
        
        this.batchTimers = {};
        this.stats = {
            totalRequests: 0,
            batchedRequests: 0,
            retriedRequests: 0,
            failedRequests: 0,
            timeoutRequests: 0
        };
        
        console.log('[API Optimizer] Module reset');
    }
}

// 创建单例实例
const apiOptimizer = new APIOptimizer();

// 注册到JEV命名空间
if (window.JEV) {
    window.JEV.APIOptimizer = apiOptimizer;
    
    // 添加初始化事件
    JEV.Controller.on('init', () => {
        console.log('[API Optimizer] Registered with JEV Controller');
    });
}

// 导出单例
export default apiOptimizer;
