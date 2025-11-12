// OCR 集成模块 v1.0
// 提供 OCR 识别功能与其他模块的集成接口

/**
 * OCR 集成管理器
 * 负责 OCR 引擎的初始化、配置和与其他模块的交互
 */
class OCRIntegrationManager {
    constructor() {
        this.ocrEngine = null;
        this.isInitialized = false;
        this.initializedModules = new Set();
        this.listeners = new Map();
        this.config = {
            enableCache: true,
            maxCacheSize: 100,
            timeout: 30000,
            retryCount: 3,
            retryDelay: 1000
        };
        
        // 事件常量
        this.EVENTS = {
            INITIALIZED: 'ocrInitialized',
            MODULE_READY: 'ocrModuleReady',
            ERROR: 'ocrError',
            RECOGNITION_START: 'recognitionStart',
            RECOGNITION_COMPLETE: 'recognitionComplete'
        };
        
        // 缓存系统
        this.cache = new Map();
        
        // 初始化集成
        this.initialize();
    }
    
    /**
     * 初始化 OCR 集成管理器
     */
    async initialize() {
        try {
            console.log('[OCR Integration] 初始化 OCR 集成管理器');
            
            // 等待文档加载完成
            if (document.readyState !== 'complete') {
                await new Promise(resolve => window.addEventListener('load', resolve));
            }
            
            // 动态加载 OCR 引擎模块
            await this.loadOCREngine();
            
            // 初始化配置
            this.loadConfiguration();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            this.isInitialized = true;
            console.log('[OCR Integration] 初始化完成');
            
            // 触发初始化完成事件
            this.emit(this.EVENTS.INITIALIZED, { status: 'success' });
            
        } catch (error) {
            console.error('[OCR Integration] 初始化失败:', error);
            this.emit(this.EVENTS.ERROR, { error: error.message });
        }
    }
    
    /**
     * 加载 OCR 引擎模块
     */
    async loadOCREngine() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (window.ocrEngine) {
                this.ocrEngine = window.ocrEngine;
                this.initializedModules.add('ocrEngine');
                this.emit(this.EVENTS.MODULE_READY, { module: 'ocrEngine' });
                return resolve();
            }
            
            // 动态加载 OCR 引擎脚本
            const scriptPath = './modules/ocr_engine.js';
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            
            script.onload = () => {
                if (window.ocrEngine) {
                    this.ocrEngine = window.ocrEngine;
                    this.initializedModules.add('ocrEngine');
                    console.log('[OCR Integration] OCR 引擎加载成功');
                    this.emit(this.EVENTS.MODULE_READY, { module: 'ocrEngine' });
                    resolve();
                } else {
                    const error = new Error('OCR 引擎未正确初始化');
                    reject(error);
                }
            };
            
            script.onerror = (error) => {
                reject(new Error(`OCR 引擎加载失败: ${error?.message || '未知错误'}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 加载配置
     */
    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('ocrIntegrationConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsedConfig };
                console.log('[OCR Integration] 已加载保存的配置');
            }
        } catch (error) {
            console.warn('[OCR Integration] 配置加载失败，使用默认配置:', error);
        }
    }
    
    /**
     * 保存配置
     */
    saveConfiguration() {
        try {
            localStorage.setItem('ocrIntegrationConfig', JSON.stringify(this.config));
            console.log('[OCR Integration] 配置已保存');
        } catch (error) {
            console.warn('[OCR Integration] 配置保存失败:', error);
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
        
        // 监听 OCR 引擎相关事件
        if (typeof document !== 'undefined') {
            document.addEventListener('ocrEngineLoaded', () => {
                this.ocrEngine = window.ocrEngine;
                this.initializedModules.add('ocrEngine');
                this.emit(this.EVENTS.MODULE_READY, { module: 'ocrEngine' });
            });
        }
    }
    
    /**
     * 配置 OCR 集成管理器
     * @param {Object} newConfig - 新的配置对象
     */
    configure(newConfig) {
        if (typeof newConfig === 'object' && newConfig !== null) {
            this.config = { ...this.config, ...newConfig };
            this.saveConfiguration();
            console.log('[OCR Integration] 配置已更新:', this.config);
            return { status: 'success', message: '配置已更新' };
        }
        return { status: 'error', message: '无效的配置对象' };
    }
    
    /**
     * 执行 OCR 识别
     * @param {string|Blob|File} input - 输入数据（文本、图片或文件）
     * @param {Object} options - 识别选项
     * @returns {Promise<Object>} 识别结果
     */
    async recognize(input, options = {}) {
        const startTime = performance.now();
        
        // 检查初始化状态
        if (!this.isInitialized || !this.ocrEngine) {
            throw new Error('OCR 集成未初始化完成');
        }
        
        this.emit(this.EVENTS.RECOGNITION_START, { input: typeof input === 'string' ? input.substring(0, 50) + '...' : input.name });
        
        try {
            // 生成缓存键
            const cacheKey = this.generateCacheKey(input, options);
            
            // 检查缓存
            if (this.config.enableCache && this.cache.has(cacheKey)) {
                console.log('[OCR Integration] 使用缓存结果');
                const cachedResult = this.cache.get(cacheKey);
                cachedResult.fromCache = true;
                cachedResult.processTime = 0;
                
                this.emit(this.EVENTS.RECOGNITION_COMPLETE, { success: true });
                return cachedResult;
            }
            
            // 执行识别
            const result = await this.executeRecognitionWithRetry(input, options);
            
            // 计算处理时间
            const processTime = Math.round(performance.now() - startTime);
            result.processTime = processTime;
            
            // 更新缓存
            if (this.config.enableCache && result.status === 'success') {
                this.updateCache(cacheKey, result);
            }
            
            this.emit(this.EVENTS.RECOGNITION_COMPLETE, { success: true });
            
            // 返回标准格式的结果
            return {
                status: 'success',
                message: 'OCR recognition completed',
                data: result.data || result.text,
                processTime: processTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[OCR Integration] 识别失败:', error);
            this.emit(this.EVENTS.RECOGNITION_COMPLETE, { success: false, error: error.message });
            this.emit(this.EVENTS.ERROR, { error: error.message });
            
            throw error;
        }
    }
    
    /**
     * 执行识别并支持重试
     */
    async executeRecognitionWithRetry(input, options) {
        let lastError = null;
        
        for (let attempt = 0; attempt < this.config.retryCount; attempt++) {
            try {
                // 设置超时
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('OCR 识别超时')), this.config.timeout);
                });
                
                const recognitionPromise = this.ocrEngine.recognize(input, options);
                const result = await Promise.race([recognitionPromise, timeoutPromise]);
                
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[OCR Integration] 识别尝试 ${attempt + 1} 失败，${attempt + 1 < this.config.retryCount ? '将重试' : '已达到最大重试次数'}`);
                
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
        console.log('[OCR Integration] 缓存已清除');
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
                ocrEngine: this.initializedModules.has('ocrEngine')
            },
            config: { ...this.config },
            cache: this.getCacheStatus()
        };
    }
    
    /**
     * 与 BOLO 地址提取模块集成
     * @param {Object} boloResult - BOLO 提取结果
     * @returns {Promise<Object>} 集成处理结果
     */
    async integrateWithBOLO(boloResult) {
        try {
            if (!boloResult || boloResult.status !== 'success') {
                throw new Error('无效的 BOLO 结果');
            }
            
            // 从 BOLO 结果中提取文本进行 OCR 处理
            const textForOCR = this.extractTextFromBOLO(boloResult);
            
            // 执行 OCR 识别
            const ocrResult = await this.recognize(textForOCR, {
                mode: 'address',
                enhanceAccuracy: true
            });
            
            // 合并结果
            return {
                status: 'success',
                message: 'OCR 与 BOLO 集成处理完成',
                data: {
                    bolo: boloResult.data,
                    ocr: ocrResult.data,
                    combined: this.combineResults(boloResult.data, ocrResult.data)
                }
            };
            
        } catch (error) {
            console.error('[OCR Integration] 与 BOLO 集成失败:', error);
            return {
                status: 'error',
                message: `与 BOLO 集成失败: ${error.message}`
            };
        }
    }
    
    /**
     * 从 BOLO 结果中提取文本
     */
    extractTextFromBOLO(boloResult) {
        // 根据 BOLO 结果的结构提取文本
        if (typeof boloResult.data === 'string') {
            return boloResult.data;
        } else if (typeof boloResult.data === 'object') {
            // 提取对象中的所有文本字段
            return Object.values(boloResult.data)
                .filter(val => typeof val === 'string')
                .join(' ');
        }
        return '';
    }
    
    /**
     * 合并 BOLO 和 OCR 结果
     */
    combineResults(boloData, ocrData) {
        // 根据实际需求实现结果合并逻辑
        return {
            addresses: boloData.addresses || [],
            rawText: ocrData.text || '',
            confidence: ocrData.confidence || 0
        };
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
                    console.error(`[OCR Integration] 事件监听器错误 (${event}):`, error);
                }
            });
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        console.log('[OCR Integration] 清理资源');
        this.listeners.clear();
        // 可以在这里添加其他清理逻辑
    }
}

// 初始化全局 OCR 集成管理器
if (!window.ocrIntegration) {
    window.ocrIntegration = new OCRIntegrationManager();
    
    // 导出到全局 JEV 命名空间（如果存在）
    if (window.JEV) {
        window.JEV.OCRIntegration = window.ocrIntegration;
    }
    
    console.log('[OCR Integration] 已初始化全局 OCR 集成管理器');
    
    // 触发加载完成事件
    const event = new CustomEvent('ocrIntegrationLoaded', { detail: { status: 'success' } });
    document.dispatchEvent(event);
} else {
    console.warn('[OCR Integration] OCR 集成管理器已存在');
}

// 模块导出（支持 ESM）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = OCRIntegrationManager;
}

// 支持 Promise 风格的初始化检查
window.ocrIntegration.ready = new Promise((resolve) => {
    if (window.ocrIntegration.isInitialized) {
        resolve(window.ocrIntegration);
    } else {
        window.ocrIntegration.on(window.ocrIntegration.EVENTS.INITIALIZED, () => {
            resolve(window.ocrIntegration);
        });
    }
});

// 提供简单的 API 接口
window.ocrRecognize = async (input, options) => {
    const integration = await window.ocrIntegration.ready;
    return integration.recognize(input, options);
};

// 提供错误处理的识别方法
window.safeOcrRecognize = async (input, options) => {
    try {
        return await window.ocrRecognize(input, options);
    } catch (error) {
        console.error('[OCR] 安全识别失败:', error);
        return {
            status: 'error',
            message: error.message,
            data: null
        };
    }
};

// 预加载提示
console.log('[OCR Integration] 模块已加载，正在初始化...');