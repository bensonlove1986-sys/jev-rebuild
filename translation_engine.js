// 翻译引擎模块 v1.0
// 提供翻译功能与其他模块的集成接口

/**
 * 翻译引擎管理器
 * 负责翻译引擎的初始化、配置和与其他模块的交互
 */
class TranslationEngineManager {
    constructor() {
        this.translationEngine = null;
        this.isInitialized = false;
        this.initializedModules = new Set();
        this.listeners = new Map();
        this.config = {
            enableCache: true,
            maxCacheSize: 100,
            timeout: 15000,
            retryCount: 3,
            retryDelay: 1000,
            defaultSourceLang: 'auto',
            defaultTargetLang: 'zh-CN',
            enableQualityCheck: true
        };
        
        // 事件常量
        this.EVENTS = {
            INITIALIZED: 'translationInitialized',
            MODULE_READY: 'translationModuleReady',
            ERROR: 'translationError',
            TRANSLATION_START: 'translationStart',
            TRANSLATION_COMPLETE: 'translationComplete'
        };
        
        // 缓存系统
        this.cache = new Map();
        
        // 初始化集成
        this.initialize();
    }
    
    /**
     * 初始化翻译引擎管理器
     */
    async initialize() {
        try {
            console.log('[Translation Engine] 初始化翻译引擎管理器');
            
            // 等待文档加载完成
            if (document.readyState !== 'complete') {
                await new Promise(resolve => window.addEventListener('load', resolve));
            }
            
            // 动态加载翻译引擎模块
            await this.loadTranslationEngine();
            
            // 初始化配置
            this.loadConfiguration();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            this.isInitialized = true;
            console.log('[Translation Engine] 初始化完成');
            
            // 触发初始化完成事件
            this.emit(this.EVENTS.INITIALIZED, { status: 'success' });
            
        } catch (error) {
            console.error('[Translation Engine] 初始化失败:', error);
            this.emit(this.EVENTS.ERROR, { error: error.message });
        }
    }
    
    /**
     * 加载翻译引擎模块
     */
    async loadTranslationEngine() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (window.translationEngine) {
                this.translationEngine = window.translationEngine;
                this.initializedModules.add('translationEngine');
                this.emit(this.EVENTS.MODULE_READY, { module: 'translationEngine' });
                return resolve();
            }
            
            // 动态加载翻译引擎脚本
            const scriptPath = './modules/translation_engine.js';
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            
            script.onload = () => {
                if (window.translationEngine) {
                    this.translationEngine = window.translationEngine;
                    this.initializedModules.add('translationEngine');
                    console.log('[Translation Engine] 翻译引擎加载成功');
                    this.emit(this.EVENTS.MODULE_READY, { module: 'translationEngine' });
                    resolve();
                } else {
                    const error = new Error('翻译引擎未正确初始化');
                    reject(error);
                }
            };
            
            script.onerror = (error) => {
                reject(new Error(`翻译引擎加载失败: ${error?.message || '未知错误'}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 加载配置
     */
    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('translationEngineConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsedConfig };
                console.log('[Translation Engine] 已加载保存的配置');
            }
        } catch (error) {
            console.warn('[Translation Engine] 配置加载失败，使用默认配置:', error);
        }
    }
    
    /**
     * 保存配置
     */
    saveConfiguration() {
        try {
            localStorage.setItem('translationEngineConfig', JSON.stringify(this.config));
            console.log('[Translation Engine] 配置已保存');
        } catch (error) {
            console.warn('[Translation Engine] 配置保存失败:', error);
        }
    }
    
    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 监听页面卸载事件，清理资源
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // 监听翻译引擎相关事件
        if (typeof document !== 'undefined') {
            document.addEventListener('translationEngineLoaded', () => {
                this.translationEngine = window.translationEngine;
                this.initializedModules.add('translationEngine');
                this.emit(this.EVENTS.MODULE_READY, { module: 'translationEngine' });
            });
        }
    }
    
    /**
     * 配置翻译引擎管理器
     * @param {Object} newConfig - 新的配置对象
     */
    configure(newConfig) {
        if (typeof newConfig === 'object' && newConfig !== null) {
            this.config = { ...this.config, ...newConfig };
            this.saveConfiguration();
            console.log('[Translation Engine] 配置已更新:', this.config);
            return { status: 'success', message: '配置已更新' };
        }
        return { status: 'error', message: '无效的配置对象' };
    }
    
    /**
     * 执行翻译
     * @param {string|Array|Object} input - 输入数据（文本、文本数组或对象）
     * @param {Object} options - 翻译选项
     * @returns {Promise<Object>} 翻译结果
     */
    async translate(input, options = {}) {
        const startTime = performance.now();
        
        // 检查初始化状态
        if (!this.isInitialized || !this.translationEngine) {
            throw new Error('翻译引擎未初始化完成');
        }
        
        this.emit(this.EVENTS.TRANSLATION_START, { 
            input: typeof input === 'string' ? input.substring(0, 50) + '...' : 
                   Array.isArray(input) ? `${input.length} 条文本` : '对象数据'
        });
        
        try {
            // 生成缓存键
            const cacheKey = this.generateCacheKey(input, options);
            
            // 检查缓存
            if (this.config.enableCache && this.cache.has(cacheKey)) {
                console.log('[Translation Engine] 使用缓存结果');
                const cachedResult = this.cache.get(cacheKey);
                cachedResult.fromCache = true;
                cachedResult.processTime = 0;
                
                this.emit(this.EVENTS.TRANSLATION_COMPLETE, { success: true });
                return cachedResult;
            }
            
            // 执行翻译
            const result = await this.executeTranslationWithRetry(input, options);
            
            // 计算处理时间
            const processTime = Math.round(performance.now() - startTime);
            result.processTime = processTime;
            
            // 质量检查
            if (this.config.enableQualityCheck) {
                this.checkTranslationQuality(result);
            }
            
            // 更新缓存
            if (this.config.enableCache && result.status === 'success') {
                this.updateCache(cacheKey, result);
            }
            
            this.emit(this.EVENTS.TRANSLATION_COMPLETE, { success: true });
            
            // 返回标准格式的结果
            return {
                status: 'success',
                message: 'Translation completed',
                data: result.data || result.translatedText,
                detectedLanguage: result.detectedLanguage,
                processTime: processTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[Translation Engine] 翻译失败:', error);
            this.emit(this.EVENTS.TRANSLATION_COMPLETE, { success: false, error: error.message });
            this.emit(this.EVENTS.ERROR, { error: error.message });
            
            throw error;
        }
    }
    
    /**
     * 执行翻译并支持重试
     */
    async executeTranslationWithRetry(input, options) {
        let lastError = null;
        
        for (let attempt = 0; attempt < this.config.retryCount; attempt++) {
            try {
                // 设置超时
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('翻译超时')), this.config.timeout);
                });
                
                // 合并选项与配置
                const mergedOptions = {
                    sourceLang: this.config.defaultSourceLang,
                    targetLang: this.config.defaultTargetLang,
                    ...options
                };
                
                const translationPromise = this.translationEngine.translate(input, mergedOptions);
                const result = await Promise.race([translationPromise, timeoutPromise]);
                
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[Translation Engine] 翻译尝试 ${attempt + 1} 失败，${attempt + 1 < this.config.retryCount ? '将重试' : '已达到最大重试次数'}`);
                
                if (attempt + 1 < this.config.retryCount) {
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt)));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * 生成缓存键
     */
    generateCacheKey(input, options) {
        let inputKey;
        
        if (typeof input === 'string') {
            // 对于文本输入，使用内容的简短摘要
            inputKey = input.length > 100 ? input.substring(0, 100) : input;
        } else if (Array.isArray(input)) {
            // 对于文本数组，使用长度和前几个元素
            inputKey = `array_${input.length}_${input.slice(0, 3).map(t => t.substring(0, 20)).join(',')}`;
        } else if (typeof input === 'object') {
            // 对于对象，使用JSON字符串
            try {
                inputKey = JSON.stringify(input);
                if (inputKey.length > 200) {
                    inputKey = inputKey.substring(0, 200) + '...';
                }
            } catch {
                inputKey = String(input);
            }
        } else {
            inputKey = String(input);
        }
        
        const optionsKey = JSON.stringify(options);
        return `${inputKey}_${optionsKey}`;
    }
    
    /**
     * 更新缓存
     */
    updateCache(key, value) {
        // 检查缓存大小
        if (this.cache.size >= this.config.maxCacheSize) {
            // 删除最旧的缓存项（Map 保持插入顺序）
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, value);
    }
    
    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('[Translation Engine] 缓存已清除');
        return { status: 'success', message: '缓存已清除' };
    }
    
    /**
     * 获取缓存状态
     */
    getCacheStatus() {
        return {
            enabled: this.config.enableCache,
            size: this.cache.size,
            maxSize: this.config.maxCacheSize
        };
    }
    
    /**
     * 检查模块状态
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            modules: {
                translationEngine: this.initializedModules.has('translationEngine')
            },
            config: { ...this.config },
            cache: this.getCacheStatus()
        };
    }
    
    /**
     * 检查翻译质量
     */
    checkTranslationQuality(result) {
        // 简单的质量检查逻辑
        if (result.data && typeof result.data === 'string') {
            // 检查翻译文本是否与原文完全相同（可能翻译失败）
            if (result.data.length > 0 && result.originalText && result.data === result.originalText) {
                console.warn('[Translation Engine] 警告: 翻译结果与原文相同，可能翻译失败');
                result.qualityWarning = 'translation_may_have_failed';
            }
        }
    }
    
    /**
     * 与 OCR 和 BOLO 结果集成
     * @param {Object} processedResult - 处理后的结果（包含OCR和BOLO数据）
     * @param {Object} options - 翻译选项
     * @returns {Promise<Object>} 集成处理结果
     */
    async integrateWithProcessingResults(processedResult, options = {}) {
        try {
            if (!processedResult || processedResult.status !== 'success') {
                throw new Error('无效的处理结果');
            }
            
            // 收集需要翻译的文本
            const textsToTranslate = this.collectTextsForTranslation(processedResult);
            
            if (textsToTranslate.length === 0) {
                return {
                    status: 'success',
                    message: '没有需要翻译的文本',
                    data: { ...processedResult.data, translations: {} }
                };
            }
            
            // 执行翻译
            const translationResult = await this.translate(textsToTranslate, {
                ...options,
                preserveFormatting: true
            });
            
            // 合并结果
            return {
                status: 'success',
                message: '翻译与处理结果集成完成',
                data: this.mergeTranslationWithProcessedResults(processedResult.data, translationResult.data)
            };
            
        } catch (error) {
            console.error('[Translation Engine] 与处理结果集成失败:', error);
            return {
                status: 'error',
                message: `与处理结果集成失败: ${error.message}`
            };
        }
    }
    
    /**
     * 收集需要翻译的文本
     */
    collectTextsForTranslation(processedResult) {
        const texts = [];
        const data = processedResult.data || {};
        
        // 从不同来源收集文本
        if (data.ocr && data.ocr.text) {
            texts.push(data.ocr.text);
        }
        
        if (data.bolo && data.bolo.addresses && Array.isArray(data.bolo.addresses)) {
            data.bolo.addresses.forEach(addr => {
                if (addr.fullAddress) texts.push(addr.fullAddress);
                if (addr.street) texts.push(addr.street);
                if (addr.city) texts.push(addr.city);
            });
        }
        
        if (data.combined && data.combined.rawText) {
            texts.push(data.combined.rawText);
        }
        
        // 去重
        return [...new Set(texts)];
    }
    
    /**
     * 合并翻译结果
     */
    mergeTranslationWithProcessedResults(processedData, translationData) {
        // 创建翻译映射
        const translations = Array.isArray(translationData) ? 
            translationData.reduce((map, item, index) => {
                map[item.originalText || `text_${index}`] = item.translatedText;
                return map;
            }, {}) : translationData;
        
        // 返回合并后的结果
        return {
            ...processedData,
            translations: translations,
            translatedAt: new Date().toISOString()
        };
    }
    
    /**
     * 批量翻译
     * @param {Array} inputs - 输入数据数组
     * @param {Object} options - 翻译选项
     * @returns {Promise<Array>} 批量翻译结果
     */
    async batchTranslate(inputs, options = {}) {
        if (!Array.isArray(inputs)) {
            throw new Error('inputs 必须是数组');
        }
        
        const results = [];
        const batchSize = options.batchSize || 10;
        
        for (let i = 0; i < inputs.length; i += batchSize) {
            const batch = inputs.slice(i, i + batchSize);
            const batchPromises = batch.map(input => 
                this.translate(input, options).catch(error => ({
                    status: 'error',
                    message: error.message,
                    data: null,
                    input: typeof input === 'string' ? input.substring(0, 30) + '...' : String(input)
                }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // 如果不是最后一批，添加延迟避免请求过于密集
            if (i + batchSize < inputs.length && options.delayBetweenBatches) {
                await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
            }
        }
        
        return results;
    }
    
    /**
     * 事件订阅
     */
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
        return this;
    }
    
    /**
     * 取消事件订阅
     */
    off(event, listener) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }
    
    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`[Translation Engine] 事件监听器错误 (${event}):`, error);
                }
            });
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        console.log('[Translation Engine] 清理资源');
        this.listeners.clear();
        // 可以在这里添加其他清理逻辑
    }
}

// 初始化全局翻译引擎管理器
if (!window.translationEngine) {
    window.translationEngine = new TranslationEngineManager();
    
    // 导出到全局 JEV 命名空间（如果存在）
    if (window.JEV) {
        window.JEV.TranslationEngine = window.translationEngine;
    }
    
    console.log('[Translation Engine] 已初始化全局翻译引擎管理器');
    
    // 触发加载完成事件
    const event = new CustomEvent('translationEngineLoaded', { detail: { status: 'success' } });
    document.dispatchEvent(event);
} else {
    console.warn('[Translation Engine] 翻译引擎管理器已存在');
}

// 模块导出（支持 ESM）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = TranslationEngineManager;
}

// 支持 Promise 风格的初始化检查
window.translationEngine.ready = new Promise((resolve) => {
    if (window.translationEngine.isInitialized) {
        resolve(window.translationEngine);
    } else {
        window.translationEngine.on(window.translationEngine.EVENTS.INITIALIZED, () => {
            resolve(window.translationEngine);
        });
    }
});

// 提供简单的 API 接口
window.translateText = async (input, options) => {
    const engine = await window.translationEngine.ready;
    return engine.translate(input, options);
};

// 提供错误处理的翻译方法
window.safeTranslateText = async (input, options) => {
    try {
        return await window.translateText(input, options);
    } catch (error) {
        console.error('[Translation] 安全翻译失败:', error);
        return {
            status: 'error',
            message: error.message,
            data: null
        };
    }
};

// 预加载提示
console.log('[Translation Engine] 模块已加载，正在初始化...');