// JEV插件整合项目 - AI对话系统模块

// 初始化JEV命名空间
window.JEV = window.JEV || {};

class AIDialogSystem {
    constructor() {
        console.log('[AI Engine] Module initialized');
        // 缓存机制
        this.cache = {
            data: new Map(),
            maxSize: 150, // AI对话缓存项数
            ttl: 45 * 60 * 1000, // 45分钟缓存过期时间
            lastAccess: new Map() // 记录最后访问时间，用于LRU淘汰
        };
        console.log('[AI Engine] Cache system initialized, max size:', this.cache.maxSize);
        // 处理延迟记录
        this.processingTimes = [];
        // 对话历史
        this.conversationHistory = [];
        // 缓存统计
        this.cacheStats = {
            hits: 0,
            misses: 0
        };
    }
    
    // 核心对话处理方法
    processQuery(query, context = {}) {
        try {
            // 计算缓存键
            const cacheKey = this.generateCacheKey(query, context);
            
            // 检查缓存
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                this.cacheStats.hits++;
                console.log('[AI Engine] Using cached result');
                return {
                    ...cachedResult,
                    fromCache: true
                };
            }
            
            // 缓存未命中
            this.cacheStats.misses++;
            
            // 开始计时
            const startTime = performance.now();
            
            // 参数验证
            if (!query || typeof query !== 'string' || query.trim().length === 0) {
                console.error('[AI Engine] Invalid query provided');
                return {
                    success: false,
                    error: 'Invalid query',
                    response: null
                };
            }
            
            // 模拟AI处理（实际项目中会调用真实AI API）
            const result = this.simulateAIProcessing(query, context);
            
            if (result.success) {
                console.log(`[AI Engine] Processed query: "${query.substring(0, 30)}..."`);
                
                // 记录处理时间
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                this.processingTimes.push(processingTime);
                console.log(`[AI Engine] Processing time: ${processingTime.toFixed(2)}ms`);
                
                // 保存对话历史
                this.addToHistory(query, result.response);
                
                // 存入缓存
                this.saveToCache(cacheKey, result);
                
                return result;
            } else {
                console.log('[AI Engine] Query processing failed');
                // 缓存错误结果，但过期时间较短
                this.saveToCache(cacheKey, result, 2 * 60 * 1000); // 2分钟
                return result;
            }
        } catch (error) {
            console.error('[AI Engine] Error during query processing:', error);
            return {
                success: false,
                error: error.message || 'Processing failed',
                response: null
            };
        }
    }
    
    // 处理地址相关查询
    processAddressQuery(addressInfo) {
        const query = `分析地址: ${addressInfo.address || ''}`;
        const context = {
            address: addressInfo.address,
            text: addressInfo.text,
            translation: addressInfo.translation,
            type: 'address_analysis'
        };
        
        return this.processQuery(query, context);
    }
    
    // 模拟AI处理
    simulateAIProcessing(query, context) {
        // 基于上下文生成响应
        let response = '';
        
        if (context.type === 'address_analysis' && context.address) {
            // 地址分析响应模板
            response = this.generateAddressAnalysisResponse(context);
        } else {
            // 通用响应模板
            response = this.generateGenericResponse(query, context);
        }
        
        return {
            success: true,
            response: response,
            timestamp: new Date().toISOString(),
            context: context
        };
    }
    
    // 生成地址分析响应
    generateAddressAnalysisResponse(context) {
        const { address, text, translation } = context;
        
        let response = `我已分析地址信息:\n`;
        response += `- 原始地址: ${address || '未提供'}\n`;
        
        if (text && text !== address) {
            response += `- 识别文本: ${text}\n`;
        }
        
        if (translation && translation !== address) {
            response += `- 翻译结果: ${translation}\n`;
        }
        
        // 添加一些分析内容
        if (address) {
            const hasNumber = /\d/.test(address);
            const hasStreet = /[街道路巷弄StStreetAveAvenueRdRoadDrDrive]/i.test(address);
            const hasPostalCode = /\b\d{5,6}\b/.test(address);
            
            response += `\n地址特征分析:\n`;
            response += `- 包含门牌号: ${hasNumber ? '是' : '否'}\n`;
            response += `- 包含街道名称: ${hasStreet ? '是' : '否'}\n`;
            response += `- 包含邮政编码: ${hasPostalCode ? '是' : '否'}\n`;
        }
        
        response += `\n如需更详细的地址信息，请提供其他上下文。`;
        
        return response;
    }
    
    // 生成通用响应
    generateGenericResponse(query, context) {
        return `我已收到您的查询: "${query}"。在实际应用中，我会基于您提供的上下文生成更详细的响应。`;
    }
    
    // 添加到对话历史
    addToHistory(query, response) {
        this.conversationHistory.push({
            query: query,
            response: response,
            timestamp: new Date().toISOString()
        });
        
        // 限制历史记录数量
        if (this.conversationHistory.length > 50) {
            this.conversationHistory.shift();
        }
    }
    
    // 获取对话历史
    getConversationHistory() {
        return [...this.conversationHistory];
    }
    
    // 清除对话历史
    clearHistory() {
        this.conversationHistory = [];
        console.log('[AI Engine] Conversation history cleared');
    }
    
    // 获取平均处理时间
    getAverageProcessingTime() {
        if (this.processingTimes.length === 0) return 0;
        const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
        return sum / this.processingTimes.length;
    }
    
    // 获取平均处理时间
    getAverageProcessingTime() {
        if (this.processingTimes.length === 0) return 0;
        const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
        return sum / this.processingTimes.length;
    }
    
    // 获取缓存统计
    getCacheStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        return {
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            hitRate: total > 0 ? (this.cacheStats.hits / total) * 100 : 0,
            currentSize: this.cache.data.size,
            maxSize: this.cache.maxSize
        };
    }
    
    // 生成缓存键
    generateCacheKey(query, context) {
        // 使用查询内容和上下文生成缓存键
        let baseKey = query.trim();
        if (baseKey.length > 500) {
            baseKey = baseKey.substring(0, 500) + '...';
        }
        
        // 添加上下文的关键部分（如果有）
        let contextKey = '';
        if (context && typeof context === 'object') {
            // 只取上下文的部分关键字段用于缓存键
            const contextFields = ['type', 'intent', 'userType'];
            const contextValues = contextFields
                .filter(field => context[field])
                .map(field => `${field}:${context[field]}`)
                .join('|');
            
            contextKey = contextValues;
        }
        
        // 组合所有部分生成最终键
        const combinedKey = `${baseKey}||${contextKey}`;
        return this.hashCode(combinedKey);
    }
    
    // 简单的哈希函数
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(16);
    }
    
    // 从缓存获取
    getFromCache(key) {
        const cachedItem = this.cache.data.get(key);
        if (!cachedItem) {
            return null;
        }
        
        // 检查是否过期
        if (Date.now() > cachedItem.expiry) {
            this.cache.data.delete(key);
            this.cache.lastAccess.delete(key);
            return null;
        }
        
        // 更新最后访问时间（用于LRU）
        this.cache.lastAccess.set(key, Date.now());
        
        // 返回缓存的结果（深拷贝避免引用问题）
        return JSON.parse(JSON.stringify(cachedItem.value));
    }
    
    // 保存到缓存
    saveToCache(key, value, customTtl = null) {
        // 检查缓存大小，如果超过限制则删除最旧的项
        if (this.cache.data.size >= this.cache.maxSize) {
            this.evictLeastRecentlyUsed();
        }
        
        // 计算过期时间
        const expiry = Date.now() + (customTtl || this.cache.ttl);
        
        // 保存缓存项（深拷贝避免引用问题）
        this.cache.data.set(key, {
            value: JSON.parse(JSON.stringify(value)),
            expiry: expiry
        });
        
        // 记录最后访问时间
        this.cache.lastAccess.set(key, Date.now());
    }
    
    // 淘汰最久未使用的缓存项（LRU策略）
    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        // 找出最久未使用的项
        for (const [key, time] of this.cache.lastAccess.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }
        
        // 删除最旧的项
        if (oldestKey) {
            this.cache.data.delete(oldestKey);
            this.cache.lastAccess.delete(oldestKey);
            console.log(`[AI Engine] Cache evicted: ${oldestKey}`);
        }
    }
    
    // 清除缓存
    clearCache() {
        const oldSize = this.cache.data.size;
        this.cache.data.clear();
        this.cache.lastAccess.clear();
        console.log(`[AI Engine] Cache cleared, removed ${oldSize} items`);
    }
    
    // 设置缓存大小
    setCacheSize(maxSize) {
        if (typeof maxSize === 'number' && maxSize > 0) {
            this.cache.maxSize = maxSize;
            
            // 如果当前缓存大小超过新的限制，淘汰多余的项
            while (this.cache.data.size > maxSize) {
                this.evictLeastRecentlyUsed();
            }
            
            console.log(`[AI Engine] Cache size set to: ${maxSize}`);
        }
    }
    
    // 设置缓存过期时间（毫秒）
    setCacheTtl(ttl) {
        if (typeof ttl === 'number' && ttl > 0) {
            this.cache.ttl = ttl;
            console.log(`[AI Engine] Cache TTL set to: ${ttl}ms`);
        }
    }
}

// 创建实例并导出
const aiDialogSystem = new AIDialogSystem();

// 注册到控制器（如果控制器已加载）
if (window.JEV && JEV.Controller) {
    JEV.Controller.registerModule('aiDialogSystem', {
        onInit: () => console.log('[AI Engine] Registered with controller'),
        processQuery: (query, context) => aiDialogSystem.processQuery(query, context),
        processAddressQuery: (addressInfo) => aiDialogSystem.processAddressQuery(addressInfo),
        getConversationHistory: () => aiDialogSystem.getConversationHistory(),
        clearHistory: () => aiDialogSystem.clearHistory(),
        getAverageProcessingTime: () => aiDialogSystem.getAverageProcessingTime(),
        clearCache: () => aiDialogSystem.clearCache()
    });
}