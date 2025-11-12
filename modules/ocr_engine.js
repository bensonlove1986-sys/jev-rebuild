// JEV插件整合项目 - OCR文字识别模块

// 初始化JEV命名空间
window.JEV = window.JEV || {};

class OCREngine {
    constructor() {
        // 初始化配置
        this.config = {
            supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'application/pdf'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            timeout: 30000, // 30秒超时
            retryAttempts: 2, // 重试次数
            retryDelay: 2000 // 重试间隔
        };
        
        // 统计信息
        this.stats = {
            totalCalls: 0,
            successfulRecognitions: 0,
            failedRecognitions: 0,
            totalProcessingTime: 0,
            lastProcessingTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // 本地缓存系统
        this.cache = {
            data: new Map(),
            maxSize: 100, // OCR缓存项数可以多一些
            ttl: 30 * 60 * 1000, // 30分钟缓存过期时间
            lastAccess: new Map() // 记录最后访问时间，用于LRU淘汰
        };
        
        // 初始化模块
        console.log('[OCR Engine] Module initialized with config:', this.config);
        console.log('[OCR Engine] Cache system initialized, max size:', this.cache.maxSize);
    }
    
    // 核心文字识别方法
    recognizeText(source) {
        this.stats.totalCalls++;
        
        // 生成缓存键
        const cacheKey = this.generateCacheKey(source);
        
        // 检查缓存
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            this.stats.cacheHits++;
            console.log(`[OCR Engine] Using cached result`);
            
            // 更新统计信息
            if (cachedResult.success) {
                this.stats.successfulRecognitions++;
            } else {
                this.stats.failedRecognitions++;
            }
            this.stats.lastProcessingTime = 0; // 表示是缓存命中
            
            return {
                ...cachedResult,
                fromCache: true
            };
        }
        
        // 缓存未命中，执行实际识别
        this.stats.cacheMisses++;
        const startTime = performance.now();
        
        try {
            // 参数验证
            if (!source || typeof source !== 'object') {
                console.error('[OCR Engine] Invalid source provided');
                throw new Error('Invalid source');
            }
            
            // 获取文本内容
            const text = this.extractTextFromDom(source);
            
            // 模拟OCR处理延迟（实际项目中会调用真实OCR API）
            const recognitionResult = this.simulateOCRProcessing(text);
            
            if (recognitionResult.success) {
                console.log(`[OCR Engine] Text recognized: "${recognitionResult.text}"`);
                
                // 记录处理时间
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                this.stats.totalProcessingTime += processingTime;
                this.stats.lastProcessingTime = processingTime;
                this.stats.successfulRecognitions++;
                console.log(`[OCR Engine] Processing time: ${processingTime.toFixed(2)}ms`);
                
                // 构建结果
                const result = {
                    success: true,
                    text: recognitionResult.text,
                    confidence: 0.95, // 默认置信度
                    processingTime: processingTime
                };
                
                // 保存到缓存
                this.saveToCache(cacheKey, result);
                
                return result;
            } else {
                console.log('[OCR Engine] Text recognition failed');
                
                // 更新失败统计
                this.stats.failedRecognitions++;
                
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                this.stats.totalProcessingTime += processingTime;
                this.stats.lastProcessingTime = processingTime;
                
                // 构建错误结果
                const errorResult = {
                    success: false,
                    error: recognitionResult.error || 'Recognition failed',
                    text: null,
                    processingTime: processingTime
                };
                
                // 缓存错误结果，但过期时间较短
                this.saveToCache(cacheKey, errorResult, 5 * 60 * 1000); // 5分钟
                
                return errorResult;
            }
        } catch (error) {
            // 更新失败统计
            this.stats.failedRecognitions++;
            
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            this.stats.totalProcessingTime += processingTime;
            this.stats.lastProcessingTime = processingTime;
            
            // 构建错误结果
            const errorResult = {
                success: false,
                error: error.message || 'Recognition failed',
                text: null,
                processingTime: processingTime
            };
            
            // 缓存错误结果，但过期时间较短
            this.saveToCache(cacheKey, errorResult, 5 * 60 * 1000); // 5分钟
            
            console.error('[OCR Engine] Error during text recognition:', error);
            return errorResult;
        }
    }
    
    // 从DOM中提取文本
    extractTextFromDom(domNode) {
        if (domNode instanceof HTMLCanvasElement || domNode instanceof HTMLImageElement) {
            // 对于图片元素，模拟OCR识别
            return `[Image content - ${domNode.width}x${domNode.height}]`;
        }
        
        // 对于其他元素，提取文本内容
        return domNode.textContent || domNode.innerText || '';
    }
    
    // 模拟OCR处理
    simulateOCRProcessing(text) {
        // 模拟OCR处理逻辑
        if (!text || text.trim().length === 0) {
            return {
                success: false,
                error: 'No text to recognize',
                text: null
            };
        }
        
        // 清理和规范化文本
        const cleanedText = this.normalizeText(text);
        
        return {
            success: true,
            text: cleanedText
        };
    }
    
    // 规范化文本
    normalizeText(text) {
        return text
            .replace(/\s+/g, ' ')  // 替换多个空格为单个空格
            .replace(/[\n\r\t]+/g, ' ')  // 替换换行符为空格
            .trim();
    }
    
    // 生成缓存键
    generateCacheKey(domNode) {
        if (domNode instanceof HTMLCanvasElement || domNode instanceof HTMLImageElement) {
            return `${domNode.tagName}-${domNode.src || domNode.toDataURL()}`;
        }
        return `${domNode.tagName}-${domNode.textContent || domNode.innerText}`;
    }
    
    // 获取统计信息
    getStats() {
        return {
            ...this.stats,
            averageProcessingTime: this.getAverageProcessingTime(),
            successRate: this.stats.totalCalls > 0 
                ? (this.stats.successfulRecognitions / this.stats.totalCalls) * 100 
                : 0,
            cacheHitRate: this.stats.totalCalls > 0
                ? (this.stats.cacheHits / this.stats.totalCalls) * 100
                : 0,
            currentCacheSize: this.cache.data.size
        };
    }
    
    // 获取平均处理时间
    getAverageProcessingTime() {
        // 只计算实际处理的请求，排除缓存命中
        const actualProcessingCalls = this.stats.cacheMisses;
        return actualProcessingCalls > 0 
            ? this.stats.totalProcessingTime / actualProcessingCalls 
            : 0;
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
            console.log(`[OCR Engine] Cache evicted: ${oldestKey}`);
        }
    }
    
    // 清除缓存
    clearCache() {
        const oldSize = this.cache.data.size;
        this.cache.data.clear();
        this.cache.lastAccess.clear();
        console.log(`[OCR Engine] Cache cleared, removed ${oldSize} items`);
    }
    
    // 设置缓存大小
    setCacheSize(maxSize) {
        if (typeof maxSize === 'number' && maxSize > 0) {
            this.cache.maxSize = maxSize;
            
            // 如果当前缓存大小超过新的限制，淘汰多余的项
            while (this.cache.data.size > maxSize) {
                this.evictLeastRecentlyUsed();
            }
            
            console.log(`[OCR Engine] Cache size set to: ${maxSize}`);
        }
    }
    
    // 设置缓存过期时间（毫秒）
    setCacheTtl(ttl) {
        if (typeof ttl === 'number' && ttl > 0) {
            this.cache.ttl = ttl;
            console.log(`[OCR Engine] Cache TTL set to: ${ttl}ms`);
        }
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
}

// 创建实例并导出
const ocrEngine = new OCREngine();

// 注册到控制器（如果控制器已加载）
if (window.JEV && JEV.Controller) {
    JEV.Controller.registerModule('ocrEngine', {
        onInit: () => console.log('[OCR Engine] Registered with controller'),
        recognizeText: (domNode) => ocrEngine.recognizeText(domNode),
        getAverageProcessingTime: () => ocrEngine.getAverageProcessingTime(),
        clearCache: () => ocrEngine.clearCache()
    });
}