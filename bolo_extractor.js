// BOLO 地址提取模块 v1.0
// 提供地址提取功能与其他模块的集成接口

/**
 * BOLO 地址提取管理器
 * 负责地址提取引擎的初始化、配置和与其他模块的交互
 */
class BOLOExtractorManager {
    constructor() {
        this.boloEngine = null;
        this.isInitialized = false;
        this.initializedModules = new Set();
        this.listeners = new Map();
        this.config = {
            enableCache: true,
            maxCacheSize: 100,
            timeout: 20000,
            retryCount: 3,
            retryDelay: 1000,
            defaultLanguage: 'zh-CN',
            enableEnhancedExtraction: true
        };
        
        // 事件常量
        this.EVENTS = {
            INITIALIZED: 'boloInitialized',
            MODULE_READY: 'boloModuleReady',
            ERROR: 'boloError',
            EXTRACTION_START: 'extractionStart',
            EXTRACTION_COMPLETE: 'extractionComplete'
        };
        
        // 缓存系统
        this.cache = new Map();
        
        // 初始化集成
        this.initialize();
    }
    
    /**
     * 初始化 BOLO 地址提取管理器
     */
    async initialize() {
        try {
            console.log('[BOLO Extractor] 初始化 BOLO 地址提取管理器');
            
            // 等待文档加载完成
            if (document.readyState !== 'complete') {
                await new Promise(resolve => window.addEventListener('load', resolve));
            }
            
            // 动态加载 BOLO 引擎模块
            await this.loadBOLOEngine();
            
            // 初始化配置
            this.loadConfiguration();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            this.isInitialized = true;
            console.log('[BOLO Extractor] 初始化完成');
            
            // 触发初始化完成事件
            this.emit(this.EVENTS.INITIALIZED, { status: 'success' });
            
        } catch (error) {
            console.error('[BOLO Extractor] 初始化失败:', error);
            this.emit(this.EVENTS.ERROR, { error: error.message });
        }
    }
    
    /**
     * 加载 BOLO 引擎模块
     */
    async loadBOLOEngine() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (window.boloEngine) {
                this.boloEngine = window.boloEngine;
                this.initializedModules.add('boloEngine');
                this.emit(this.EVENTS.MODULE_READY, { module: 'boloEngine' });
                return resolve();
            }
            
            // 动态加载 BOLO 引擎脚本
            const scriptPath = './modules/bolo_engine.js';
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            
            script.onload = () => {
                if (window.boloEngine) {
                    this.boloEngine = window.boloEngine;
                    this.initializedModules.add('boloEngine');
                    console.log('[BOLO Extractor] BOLO 引擎加载成功');
                    this.emit(this.EVENTS.MODULE_READY, { module: 'boloEngine' });
                    resolve();
                } else {
                    const error = new Error('BOLO 引擎未正确初始化');
                    reject(error);
                }
            };
            
            script.onerror = (error) => {
                reject(new Error(`BOLO 引擎加载失败: ${error?.message || '未知错误'}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 加载配置
     */
    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('boloExtractorConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsedConfig };
                console.log('[BOLO Extractor] 已加载保存的配置');
            }
        } catch (error) {
            console.warn('[BOLO Extractor] 配置加载失败，使用默认配置:', error);
        }
    }
    
    /**
     * 保存配置
     */
    saveConfiguration() {
        try {
            localStorage.setItem('boloExtractorConfig', JSON.stringify(this.config));
            console.log('[BOLO Extractor] 配置已保存');
        } catch (error) {
            console.warn('[BOLO Extractor] 配置保存失败:', error);
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
        
        // 监听 BOLO 引擎相关事件
        if (typeof document !== 'undefined') {
            document.addEventListener('boloEngineLoaded', () => {
                this.boloEngine = window.boloEngine;
                this.initializedModules.add('boloEngine');
                this.emit(this.EVENTS.MODULE_READY, { module: 'boloEngine' });
            });
        }
    }
    
    /**
     * 配置 BOLO 提取管理器
     * @param {Object} newConfig - 新的配置对象
     */
    configure(newConfig) {
        if (typeof newConfig === 'object' && newConfig !== null) {
            this.config = { ...this.config, ...newConfig };
            this.saveConfiguration();
            console.log('[BOLO Extractor] 配置已更新:', this.config);
            return { status: 'success', message: '配置已更新' };
        }
        return { status: 'error', message: '无效的配置对象' };
    }
    
    /**
     * 执行地址提取
     * @param {string|Blob|File} input - 输入数据（文本、图片或文件）
     * @param {Object} options - 提取选项
     * @returns {Promise<Object>} 提取结果
     */
    async extract(input, options = {}) {
        const startTime = performance.now();
        
        // 检查初始化状态
        if (!this.isInitialized || !this.boloEngine) {
            throw new Error('BOLO 提取器未初始化完成');
        }
        
        this.emit(this.EVENTS.EXTRACTION_START, { input: typeof input === 'string' ? input.substring(0, 50) + '...' : input.name });
        
        try {
            // 生成缓存键
            const cacheKey = this.generateCacheKey(input, options);
            
            // 检查缓存
            if (this.config.enableCache && this.cache.has(cacheKey)) {
                console.log('[BOLO Extractor] 使用缓存结果');
                const cachedResult = this.cache.get(cacheKey);
                cachedResult.fromCache = true;
                cachedResult.processTime = 0;
                
                this.emit(this.EVENTS.EXTRACTION_COMPLETE, { success: true });
                return cachedResult;
            }
            
            // 执行提取
            const result = await this.executeExtractionWithRetry(input, options);
            
            // 计算处理时间
            const processTime = Math.round(performance.now() - startTime);
            result.processTime = processTime;
            
            // 更新缓存
            if (this.config.enableCache && result.status === 'success') {
                this.updateCache(cacheKey, result);
            }
            
            this.emit(this.EVENTS.EXTRACTION_COMPLETE, { success: true });
            
            // 返回标准格式的结果
            return {
                status: 'success',
                message: 'Address extraction completed',
                data: result.data || result.addresses,
                processTime: processTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[BOLO Extractor] 提取失败:', error);
            this.emit(this.EVENTS.EXTRACTION_COMPLETE, { success: false, error: error.message });
            this.emit(this.EVENTS.ERROR, { error: error.message });
            
            throw error;
        }
    }
    
    /**
     * 执行提取并支持重试
     */
    async executeExtractionWithRetry(input, options) {
        let lastError = null;
        
        for (let attempt = 0; attempt < this.config.retryCount; attempt++) {
            try {
                // 设置超时
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('BOLO 提取超时')), this.config.timeout);
                });
                
                // 合并选项与配置
                const mergedOptions = {
                    language: this.config.defaultLanguage,
                    enhancedExtraction: this.config.enableEnhancedExtraction,
                    ...options
                };
                
                const extractionPromise = this.boloEngine.extract(input, mergedOptions);
                const result = await Promise.race([extractionPromise, timeoutPromise]);
                
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[BOLO Extractor] 提取尝试 ${attempt + 1} 失败，${attempt + 1 < this.config.retryCount ? '将重试' : '已达到最大重试次数'}`);
                
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
        } else if (input instanceof File || input instanceof Blob) {
            // 对于文件，使用文件名 + 大小 + 类型
            inputKey = `${input.name || 'blob'}_${input.size}_${input.type}`;
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
        console.log('[BOLO Extractor] 缓存已清除');
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
                boloEngine: this.initializedModules.has('boloEngine')
            },
            config: { ...this.config },
            cache: this.getCacheStatus()
        };
    }
    
    /**
     * 与 OCR 模块集成
     * @param {Object} ocrResult - OCR 识别结果
     * @returns {Promise<Object>} 集成处理结果
     */
    async integrateWithOCR(ocrResult) {
        try {
            if (!ocrResult || ocrResult.status !== 'success') {
                throw new Error('无效的 OCR 结果');
            }
            
            // 从 OCR 结果中提取文本进行地址提取
            const textForExtraction = this.extractTextFromOCR(ocrResult);
            
            // 执行地址提取
            const boloResult = await this.extract(textForExtraction, {
                mode: 'address_extraction',
                confidenceThreshold: 0.8
            });
            
            // 合并结果
            return {
                status: 'success',
                message: 'BOLO 与 OCR 集成处理完成',
                data: {
                    ocr: ocrResult.data,
                    bolo: boloResult.data,
                    combined: this.combineResults(ocrResult.data, boloResult.data)
                }
            };
            
        } catch (error) {
            console.error('[BOLO Extractor] 与 OCR 集成失败:', error);
            return {
                status: 'error',
                message: `与 OCR 集成失败: ${error.message}`
            };
        }
    }
    
    /**
     * 从 OCR 结果中提取文本
     */
    extractTextFromOCR(ocrResult) {
        if (typeof ocrResult.data === 'string') {
            return ocrResult.data;
        } else if (typeof ocrResult.data === 'object') {
            if (ocrResult.data.text) return ocrResult.data.text;
            // 提取对象中的所有文本字段
            return Object.values(ocrResult.data)
                .filter(val => typeof val === 'string')
                .join(' ');
        }
        return '';
    }
    
    /**
     * 合并 OCR 和 BOLO 结果
     */
    combineResults(ocrData, boloData) {
        // 根据实际需求实现结果合并逻辑
        return {
            rawText: ocrData.text || '',
            addresses: boloData.addresses || [],
            confidence: {
                ocr: ocrData.confidence || 0,
                bolo: boloData.confidence || 0
            }
        };
    }
    
    /**
     * 批量提取地址
     * @param {Array} inputs - 输入数据数组
     * @param {Object} options - 提取选项
     * @returns {Promise<Array>} 批量提取结果
     */
    async batchExtract(inputs, options = {}) {
        if (!Array.isArray(inputs)) {
            throw new Error('inputs 必须是数组');
        }
        
        const results = [];
        const batchSize = options.batchSize || 5;
        
        for (let i = 0; i < inputs.length; i += batchSize) {
            const batch = inputs.slice(i, i + batchSize);
            const batchPromises = batch.map(input => 
                this.extract(input, options).catch(error => ({
                    status: 'error',
                    message: error.message,
                    data: null,
                    input: typeof input === 'string' ? input.substring(0, 30) + '...' : input.name
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
                    console.error(`[BOLO Extractor] 事件监听器错误 (${event}):`, error);
                }
            });
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        console.log('[BOLO Extractor] 清理资源');
        this.listeners.clear();
        // 可以在这里添加其他清理逻辑
    }
}

// 初始化全局 BOLO 提取管理器
if (!window.boloExtractor) {
    window.boloExtractor = new BOLOExtractorManager();
    
    // 导出到全局 JEV 命名空间（如果存在）
    if (window.JEV) {
        window.JEV.BOLOExtractor = window.boloExtractor;
    }
    
    console.log('[BOLO Extractor] 已初始化全局 BOLO 提取管理器');
    
    // 触发加载完成事件
    const event = new CustomEvent('boloExtractorLoaded', { detail: { status: 'success' } });
    document.dispatchEvent(event);
} else {
    console.warn('[BOLO Extractor] BOLO 提取管理器已存在');
}

// 模块导出（支持 ESM）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = BOLOExtractorManager;
}

// 支持 Promise 风格的初始化检查
window.boloExtractor.ready = new Promise((resolve) => {
    if (window.boloExtractor.isInitialized) {
        resolve(window.boloExtractor);
    } else {
        window.boloExtractor.on(window.boloExtractor.EVENTS.INITIALIZED, () => {
            resolve(window.boloExtractor);
        });
    }
});

// 提供简单的 API 接口
window.boloExtract = async (input, options) => {
    const extractor = await window.boloExtractor.ready;
    return extractor.extract(input, options);
};

// 提供错误处理的提取方法
window.safeBoloExtract = async (input, options) => {
    try {
        return await window.boloExtract(input, options);
    } catch (error) {
        console.error('[BOLO] 安全提取失败:', error);
        return {
            status: 'error',
            message: error.message,
            data: null
        };
    }
};

// 预加载提示
console.log('[BOLO Extractor] 模块已加载，正在初始化...');