// JEV插件整合项目 - 翻译引擎模块

// 初始化JEV命名空间
window.JEV = window.JEV || {};

class TranslationEngine {
    constructor() {
        console.log('[Translation Engine] Module initialized');
        // 初始化配置
        this.config = {
            supportedLanguages: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'],
            defaultSourceLang: 'en',
            defaultTargetLang: 'zh',
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1500
        };
        
        // 处理统计信息
        this.stats = {
            totalCalls: 0,
            successfulTranslations: 0,
            failedTranslations: 0,
            totalProcessingTime: 0,
            lastTranslationTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // 本地缓存系统
        this.cache = {
            data: new Map(),
            maxSize: 200, // 翻译缓存项数可以多一些
            ttl: 60 * 60 * 1000, // 1小时缓存过期时间
            lastAccess: new Map() // 记录最后访问时间，用于LRU淘汰
        };
        
        // 处理延迟记录
        this.processingTimes = [];
        // 语言支持列表
        this.supportedLanguages = [
            { code: 'en', name: 'English' },
            { code: 'zh', name: '中文' },
            { code: 'fr', name: 'Français' },
            { code: 'es', name: 'Español' },
            { code: 'de', name: 'Deutsch' },
            { code: 'ja', name: '日本語' }
        ];
        
        console.log('[Translation Engine] Cache system initialized, max size:', this.cache.maxSize);
    }
    
    // 核心翻译方法（带缓存）
    translate(text, options = {}) {
        return this.retryWithTimeout(() => {
            this.stats.totalCalls++;
            
            // 处理选项
            const { sourceLang = this.config.defaultSourceLang, targetLang = 'en' } = options;
            const actualTargetLang = options.targetLanguage || targetLang;
            
            // 生成缓存键
            const cacheKey = this.generateCacheKey(text, sourceLang, actualTargetLang);
            
            // 检查缓存
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                this.stats.cacheHits++;
                console.log(`[Translation Engine] Cache hit for translation`);
                
                // 更新统计信息
                if (cachedResult.success) {
                    this.stats.successfulTranslations++;
                } else {
                    this.stats.failedTranslations++;
                }
                this.stats.lastTranslationTime = 0; // 表示是缓存命中
                
                return cachedResult;
            }
            
            // 缓存未命中，执行实际翻译
            this.stats.cacheMisses++;
            // 开始计时
            const startTime = performance.now();
            
            // 参数验证
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                console.error('[Translation Engine] Invalid text provided');
                const errorResult = {
                    success: false,
                    error: 'Invalid text',
                    translation: null,
                    processingTime: performance.now() - startTime
                };
                
                // 缓存错误结果，但过期时间较短
                this.saveToCache(cacheKey, errorResult, 3 * 60 * 1000); // 3分钟
                
                // 更新失败统计
                this.stats.failedTranslations++;
                this.stats.totalProcessingTime += errorResult.processingTime;
                this.stats.lastTranslationTime = errorResult.processingTime;
                this.processingTimes.push(errorResult.processingTime);
                
                return errorResult;
            }
            
            if (!this.isSupportedLanguage(actualTargetLang)) {
                console.error(`[Translation Engine] Unsupported language: ${actualTargetLang}`);
                const errorResult = {
                    success: false,
                    error: `Unsupported language: ${actualTargetLang}`,
                    translation: null,
                    processingTime: performance.now() - startTime
                };
                
                // 缓存错误结果
                this.saveToCache(cacheKey, errorResult, 3 * 60 * 1000); // 3分钟
                
                // 更新失败统计
                this.stats.failedTranslations++;
                this.stats.totalProcessingTime += errorResult.processingTime;
                this.stats.lastTranslationTime = errorResult.processingTime;
                this.processingTimes.push(errorResult.processingTime);
                
                return errorResult;
            }
            
            // 如果源语言和目标语言相同，直接返回原文
            if (sourceLang === actualTargetLang) {
                const endTime = performance.now();
                const processingTime = endTime - startTime;
                
                const sameLangResult = {
                    success: true,
                    translation: text,
                    sourceLanguage: sourceLang,
                    targetLanguage: actualTargetLang,
                    processingTime
                };
                
                // 保存到缓存
                this.saveToCache(cacheKey, sameLangResult);
                
                // 更新统计信息
                this.stats.successfulTranslations++;
                this.stats.totalProcessingTime += processingTime;
                this.stats.lastTranslationTime = processingTime;
                this.processingTimes.push(processingTime);
                
                return sameLangResult;
            }
            
            // 模拟翻译处理（实际项目中会调用真实翻译API）
            const result = this.simulateTranslation(text, actualTargetLang);
            
            // 记录处理时间
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            result.processingTime = processingTime;
            
            if (result.success) {
                console.log(`[Translation Engine] Translated: "${result.translation}"`);
                
                // 更新统计信息
                this.stats.successfulTranslations++;
                this.stats.totalProcessingTime += processingTime;
                this.stats.lastTranslationTime = processingTime;
                this.processingTimes.push(processingTime);
                console.log(`[Translation Engine] Processing time: ${processingTime.toFixed(2)}ms`);
                
                // 保存到缓存
                this.saveToCache(cacheKey, result);
                
                return result;
            } else {
                // 更新失败统计
                this.stats.failedTranslations++;
                this.stats.totalProcessingTime += processingTime;
                this.stats.lastTranslationTime = processingTime;
                this.processingTimes.push(processingTime);
                
                // 缓存错误结果
                this.saveToCache(cacheKey, result, 3 * 60 * 1000); // 3分钟
                
                console.log('[Translation Engine] Translation failed');
                return result;
            }
        }, 3000, 2); // 3秒超时，最多重试2次
    }
    
    // 模拟翻译处理
    simulateTranslation(text, targetLanguage) {
        // 模拟翻译逻辑
        let translatedText = text;
        
        // 简单的翻译模拟（实际项目中会使用真实的翻译API）
        switch (targetLanguage) {
            case 'zh':
                // 模拟英文到中文的翻译
                if (this.isLikelyEnglish(text)) {
                    translatedText = this.mockTranslateToChinese(text);
                }
                break;
            case 'en':
                // 模拟中文到英文的翻译
                if (this.isLikelyChinese(text)) {
                    translatedText = this.mockTranslateToEnglish(text);
                }
                break;
            case 'fr':
                // 模拟英文/中文到法语的翻译
                translatedText = this.mockTranslateToFrench(text);
                break;
            case 'es':
                // 模拟英文/中文到西班牙语的翻译
                translatedText = this.mockTranslateToSpanish(text);
                break;
        }
        
        return {
            success: true,
            translation: translatedText,
            sourceLanguage: this.detectLanguage(text),
            targetLanguage: targetLanguage
        };
    }
    
    // 检测文本语言
    detectLanguage(text) {
        if (this.isLikelyChinese(text)) return 'zh';
        if (this.isLikelyJapanese(text)) return 'ja';
        return 'en'; // 默认返回英文
    }
    
    // 检查是否可能是中文
    isLikelyChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }
    
    // 检查是否可能是英文
    isLikelyEnglish(text) {
        return /[a-zA-Z]/.test(text);
    }
    
    // 检查是否可能是日文
    isLikelyJapanese(text) {
        return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
    }
    
    // 检查语言是否支持
    isSupportedLanguage(languageCode) {
        return this.supportedLanguages.some(lang => lang.code === languageCode);
    }
    
    // 模拟翻译成中文
    mockTranslateToChinese(text) {
        const translations = {
            '123 Main St': '主街123号',
            'New York': '纽约',
            'City': '城市',
            'Street': '街道',
            'Avenue': '大道',
            'Road': '道路'
        };
        
        let result = text;
        for (const [key, value] of Object.entries(translations)) {
            result = result.replace(new RegExp(key, 'gi'), value);
        }
        
        return result;
    }
    
    // 模拟翻译成英文
    mockTranslateToEnglish(text) {
        const translations = {
            '主街': 'Main Street',
            '号': 'No.',
            '纽约': 'New York',
            '城市': 'City',
            '街道': 'Street',
            '大道': 'Avenue',
            '道路': 'Road'
        };
        
        let result = text;
        for (const [key, value] of Object.entries(translations)) {
            result = result.replace(new RegExp(key, 'gi'), value);
        }
        
        return result;
    }
    
    // 模拟翻译成法语
    mockTranslateToFrench(text) {
        const translations = {
            'Street': 'Rue',
            'Avenue': 'Avenue',
            'Road': 'Route',
            'City': 'Ville',
            'Country': 'Pays',
            '号': 'Numéro',
            '街道': 'Rue',
            '大道': 'Avenue',
            '道路': 'Route'
        };
        
        let result = text;
        for (const [key, value] of Object.entries(translations)) {
            result = result.replace(new RegExp(key, 'gi'), value);
        }
        
        return result;
    }
    
    // 模拟翻译成西班牙语
    mockTranslateToSpanish(text) {
        const translations = {
            'Street': 'Calle',
            'Avenue': 'Avenida',
            'Road': 'Carretera',
            'City': 'Ciudad',
            'Country': 'País',
            '号': 'Número',
            '街道': 'Calle',
            '大道': 'Avenida',
            '道路': 'Carretera'
        };
        
        let result = text;
        for (const [key, value] of Object.entries(translations)) {
            result = result.replace(new RegExp(key, 'gi'), value);
        }
        
        return result;
    }
    
    // 获取统计信息
    getStats() {
        return {
            ...this.stats,
            averageProcessingTime: this.getAverageProcessingTime(),
            successRate: this.stats.totalCalls > 0 
                ? (this.stats.successfulTranslations / this.stats.totalCalls) * 100 
                : 0,
            cacheHitRate: this.stats.totalCalls > 0
                ? (this.stats.cacheHits / this.stats.totalCalls) * 100
                : 0,
            currentCacheSize: this.cache.data.size,
            minProcessingTime: this.processingTimes.length > 0 ? Math.min(...this.processingTimes) : 0,
            maxProcessingTime: this.processingTimes.length > 0 ? Math.max(...this.processingTimes) : 0
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
    
    // 生成缓存键
    generateCacheKey(text, sourceLang, targetLang) {
        // 使用文本内容、源语言和目标语言生成缓存键
        let shortText = text.trim();
        if (shortText.length > 1000) {
            shortText = shortText.substring(0, 1000) + '...';
        }
        
        return `${sourceLang}_${targetLang}_${this.hashCode(shortText)}`;
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
            console.log(`[Translation Engine] Cache evicted: ${oldestKey}`);
        }
    }
    
    // 清除缓存
    clearCache() {
        const oldSize = this.cache.data.size;
        this.cache.data.clear();
        this.cache.lastAccess.clear();
        console.log(`[Translation Engine] Cache cleared, removed ${oldSize} items`);
    }
    
    // 设置缓存大小
    setCacheSize(maxSize) {
        if (typeof maxSize === 'number' && maxSize > 0) {
            this.cache.maxSize = maxSize;
            
            // 如果当前缓存大小超过新的限制，淘汰多余的项
            while (this.cache.data.size > maxSize) {
                this.evictLeastRecentlyUsed();
            }
            
            console.log(`[Translation Engine] Cache size set to: ${maxSize}`);
        }
    }
    
    // 设置缓存过期时间（毫秒）
    setCacheTtl(ttl) {
        if (typeof ttl === 'number' && ttl > 0) {
            this.cache.ttl = ttl;
            console.log(`[Translation Engine] Cache TTL set to: ${ttl}ms`);
        }
    }
    
    // 带超时和重试的执行函数
    retryWithTimeout(fn, timeoutMs, maxRetries) {
        let retries = 0;
        
        const execute = () => {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Operation timed out'));
                }, timeoutMs);
                
                try {
                    const result = fn();
                    clearTimeout(timeoutId);
                    resolve(result);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }).catch(error => {
                retries++;
                if (retries <= maxRetries) {
                    console.log(`[Translation Engine] Retry ${retries}/${maxRetries} after error: ${error.message}`);
                    return execute();
                }
                throw error;
            });
        };
        
        try {
            // 同步执行，保持与其他模块接口一致
            const result = fn();
            return result;
        } catch (error) {
            retries++;
            if (retries <= maxRetries) {
                console.log(`[Translation Engine] Retry ${retries}/${maxRetries} after error: ${error.message}`);
                try {
                    return fn();
                } catch (secondError) {
                    console.error('[Translation Engine] All retries failed');
                    return {
                        success: false,
                        error: secondError.message || 'Translation failed with all retries',
                        translation: null
                    };
                }
            }
            return {
                success: false,
                error: error.message || 'Translation failed',
                translation: null
            };
        }
    }
}

// 创建实例并导出
const translationEngine = new TranslationEngine();

// 注册到控制器（如果控制器已加载）
if (window.JEV && JEV.Controller) {
    JEV.Controller.registerModule('translationEngine', {
        onInit: () => console.log('[Translation Engine] Registered with controller'),
        translate: (text, targetLanguage) => translationEngine.translate(text, targetLanguage),
        getAverageProcessingTime: () => translationEngine.getAverageProcessingTime(),
        clearCache: () => translationEngine.clearCache()
    });
}