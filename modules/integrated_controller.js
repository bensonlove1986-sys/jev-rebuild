// JEV插件整合项目 - 系统主控制器

// 初始化JEV命名空间
window.JEV = window.JEV || {};

// 导入API优化器模块
const apiOptimizerScript = document.createElement('script');
apiOptimizerScript.src = '/modules/api_optimizer.js';
document.head.appendChild(apiOptimizerScript);

// 导入性能监控模块
const performanceMonitorScript = document.createElement('script');
performanceMonitorScript.src = '/modules/performance_monitor.js';
document.head.appendChild(performanceMonitorScript);

// 导入性能分析器模块
const performanceAnalyzerScript = document.createElement('script');
performanceAnalyzerScript.src = '/modules/performance_analyzer.js';
document.head.appendChild(performanceAnalyzerScript);

// 导入BOLO地址提取模块
const boloExtractorScript = document.createElement('script');
boloExtractorScript.src = '/modules/bolo_extractor.js';
document.head.appendChild(boloExtractorScript);

// 导入OCR识别引擎模块
const ocrEngineScript = document.createElement('script');
ocrEngineScript.src = '/modules/ocr_engine.js';
document.head.appendChild(ocrEngineScript);

// 导入翻译引擎模块
const translationEngineScript = document.createElement('script');
translationEngineScript.src = '/modules/translation_engine.js';
document.head.appendChild(translationEngineScript);

// 导入AI对话系统模块
const aiDialogSystemScript = document.createElement('script');
aiDialogSystemScript.src = '/modules/ai_dialog_system.js';
document.head.appendChild(aiDialogSystemScript);

// 定义集成控制器类
class JEVIntegratedController {
    constructor() {
        // 模块注册表
        this.modules = {};
        // 事件监听器映射
        this.eventListeners = {};
        // 状态缓存
        this.stateCache = {
            systemStatus: 'initializing',
            activeModule: null,
            uploadHistory: [],
            addressExtractionResults: [],
            processingStats: {
                boloTime: 0,
                ocrTime: 0,
                translationTime: 0,
                aiTime: 0,
                apiRetryCount: 0,
                batchRequestsMerged: 0,
                timeoutCount: 0
            },
            processingQueue: []
        };
        
        // 任务队列系统
        this.taskQueue = {
            queue: [],
            processingTasks: new Set(),
            maxConcurrentTasks: 3,
            processing: false,
            paused: false
        };
        
        // 缓存管理器
        this.cacheManager = {
            caches: {
                bolo: new Map(),
                ocr: new Map(),
                translation: new Map(),
                ai: new Map()
            },
            maxCacheSize: 100,
            ttl: 30 * 60 * 1000 // 30分钟缓存过期时间
        };
        
        // API优化器引用
        this.apiOptimizer = null;
        
        // 性能监控器引用
        this.performanceMonitor = null;
        
        // 性能分析器引用
        this.performanceAnalyzer = null;
        
        // 初始化集成
        this.setupAPIOptimizerIntegration();
        this.setupPerformanceMonitorIntegration();
        this.setupPerformanceAnalyzerIntegration();
        
        // 集成业务模块
        this.setupBoloExtractorIntegration();
        this.setupOCREngineIntegration();
        this.setupTranslationEngineIntegration();
        this.setupAIDialogSystemIntegration();
        
        // 加载时输出初始化日志
        console.log('[JEV] Integrated Controller initialized');
        console.log('[JEV] API Optimizer integration setup');
        console.log('[JEV] Performance Monitor integration setup');
        console.log('[JEV] Performance Analyzer integration setup');
        console.log('[JEV] Business modules integration setup');
    }
    
    // 设置API优化器集成
    setupAPIOptimizerIntegration() {
        // 监听API优化器加载完成
        window.addEventListener('apiOptimizerLoaded', () => {
            if (window.JEV?.APIOptimizer) {
                this.apiOptimizer = window.JEV.APIOptimizer;
                console.log('[JEV] API Optimizer loaded successfully');
                
                // 注册API优化器到模块系统
                this.registerModule('apiOptimizer', {
                    onInit: () => console.log('[API Optimizer] Registered with controller'),
                    getStats: () => this.apiOptimizer.getStats(),
                    updateConfig: (config) => this.apiOptimizer.updateConfig(config),
                    clearStats: () => this.apiOptimizer.clearStats()
                });
            }
        });
        
        // 如果API优化器已经加载
        if (window.JEV?.APIOptimizer) {
            this.apiOptimizer = window.JEV.APIOptimizer;
            console.log('[JEV] API Optimizer already loaded');
        }
    }
    
    // 设置性能监控器集成
    setupPerformanceMonitorIntegration() {
        // 监听性能监控器加载完成
        window.addEventListener('performanceMonitorLoaded', () => {
            if (window.JEV?.PerformanceMonitor) {
                this.performanceMonitor = window.JEV.PerformanceMonitor;
                console.log('[JEV] Performance Monitor loaded successfully');
                
                // 注册性能监控器到模块系统
                this.registerModule('performanceMonitor', {
                    onInit: () => console.log('[Performance Monitor] Registered with controller'),
                    getReport: () => this.performanceMonitor.getPerformanceReport(),
                    updateData: (module, time) => this.performanceMonitor.updatePerformanceData(module, time),
                    resetData: () => this.performanceMonitor.resetPerformanceData()
                });
            }
        });
        
        // 如果性能监控器已经加载
        if (window.JEV?.PerformanceMonitor) {
            this.performanceMonitor = window.JEV.PerformanceMonitor;
            console.log('[JEV] Performance Monitor already loaded');
        }
    }
    
    // 设置性能分析器集成
    setupPerformanceAnalyzerIntegration() {
        // 监听性能分析器加载完成
        window.addEventListener('performanceAnalyzerLoaded', () => {
            if (window.JEV?.PerformanceAnalyzer) {
                this.performanceAnalyzer = window.JEV.PerformanceAnalyzer;
                console.log('[JEV] Performance Analyzer loaded successfully');
                
                // 注册性能分析器到模块系统
                this.registerModule('performanceAnalyzer', {
                    onInit: () => console.log('[Performance Analyzer] Registered with controller'),
                    getReport: () => this.performanceAnalyzer.getAnalysisReport(),
                    triggerAnalysis: () => this.performanceAnalyzer.analyzePerformance(),
                    resetData: () => this.performanceAnalyzer.clearAnalysisData()
                });
            }
        });
        
        // 如果性能分析器已经加载
        if (window.JEV?.PerformanceAnalyzer) {
            this.performanceAnalyzer = window.JEV.PerformanceAnalyzer;
            console.log('[JEV] Performance Analyzer already loaded');
        }
    }
    
    // 设置BOLO地址提取器集成
    setupBoloExtractorIntegration() {
        // 监听BOLO提取器加载完成
        window.addEventListener('boloExtractorLoaded', () => {
            if (window.JEV?.BoloExtractor) {
                this.boloExtractor = window.JEV.BoloExtractor;
                console.log('[JEV] BOLO Extractor loaded successfully');
                
                // 注册BOLO提取器到模块系统
                this.registerModule('boloExtractor', {
                    onInit: () => console.log('[BOLO Extractor] Registered with controller'),
                    extractAddress: (domNode) => {
                        const result = this.boloExtractor.extractAddress(domNode);
                        // 添加成功确认返回格式
                        if (result.success) {
                            return {
                                ...result,
                                status: 'success',
                                message: 'Address extraction completed'
                            };
                        }
                        return result;
                    },
                    clearCache: () => this.boloExtractor.clearCache()
                });
            }
        });
        
        // 如果BOLO提取器已经加载
        if (window.JEV?.BoloExtractor) {
            this.boloExtractor = window.JEV.BoloExtractor;
            console.log('[JEV] BOLO Extractor already loaded');
        }
    }
    
    // 设置OCR引擎集成
    setupOCREngineIntegration() {
        // 监听OCR引擎加载完成
        window.addEventListener('ocrEngineLoaded', () => {
            if (window.JEV?.OCREngine) {
                this.ocrEngine = window.JEV.OCREngine;
                console.log('[JEV] OCR Engine loaded successfully');
                
                // 注册OCR引擎到模块系统
                this.registerModule('ocrEngine', {
                    onInit: () => console.log('[OCR Engine] Registered with controller'),
                    recognizeText: (domNode) => {
                        const result = this.ocrEngine.recognizeText(domNode);
                        // 添加成功确认返回格式
                        if (result.success) {
                            return {
                                ...result,
                                status: 'success',
                                message: 'OCR recognition completed'
                            };
                        }
                        return result;
                    },
                    getSupportedFormats: () => this.ocrEngine.getSupportedFormats()
                });
            }
        });
        
        // 如果OCR引擎已经加载
        if (window.JEV?.OCREngine) {
            this.ocrEngine = window.JEV.OCREngine;
            console.log('[JEV] OCR Engine already loaded');
        }
    }
    
    // 设置翻译引擎集成
    setupTranslationEngineIntegration() {
        // 监听翻译引擎加载完成
        window.addEventListener('translationEngineLoaded', () => {
            if (window.JEV?.TranslationEngine) {
                this.translationEngine = window.JEV.TranslationEngine;
                console.log('[JEV] Translation Engine loaded successfully');
                
                // 注册翻译引擎到模块系统
                this.registerModule('translationEngine', {
                    onInit: () => console.log('[Translation Engine] Registered with controller'),
                    translate: (text, targetLanguage) => {
                        const result = this.translationEngine.translate(text, targetLanguage);
                        // 添加成功确认返回格式
                        if (result.success) {
                            return {
                                ...result,
                                status: 'success',
                                message: 'Translation completed'
                            };
                        }
                        return result;
                    },
                    getSupportedLanguages: () => this.translationEngine.getSupportedLanguages()
                });
            }
        });
        
        // 如果翻译引擎已经加载
        if (window.JEV?.TranslationEngine) {
            this.translationEngine = window.JEV.TranslationEngine;
            console.log('[JEV] Translation Engine already loaded');
        }
    }
    
    // 设置AI对话系统集成
    setupAIDialogSystemIntegration() {
        // 监听AI对话系统加载完成
        window.addEventListener('aiDialogSystemLoaded', () => {
            if (window.JEV?.AIDialogSystem) {
                this.aiDialogSystem = window.JEV.AIDialogSystem;
                console.log('[JEV] AI Dialog System loaded successfully');
                
                // 注册AI对话系统到模块系统
                this.registerModule('aiDialogSystem', {
                    onInit: () => {
                        console.log('[AI Dialog System] Registered with controller');
                        // 所有模块注册完成后输出集成成功消息
                        if (this.modules.boloExtractor && this.modules.ocrEngine && 
                            this.modules.translationEngine && this.modules.aiDialogSystem) {
                            console.log('[JEV Controller] Module integration successful');
                        }
                    },
                    processAddressQuery: (data) => {
                        const result = this.aiDialogSystem.processAddressQuery(data);
                        // 添加成功确认返回格式
                        if (result.success) {
                            return {
                                ...result,
                                status: 'success',
                                message: 'AI processing completed'
                            };
                        }
                        return result;
                    },
                    clearContext: () => this.aiDialogSystem.clearContext()
                });
            }
        });
        
        // 如果AI对话系统已经加载
        if (window.JEV?.AIDialogSystem) {
            this.aiDialogSystem = window.JEV.AIDialogSystem;
            console.log('[JEV] AI Dialog System already loaded');
        }
    }
    
    // 注册模块
    registerModule(name, moduleObj) {
        if (!name || typeof name !== 'string') {
            console.error('[JEV] Module name must be a valid string');
            return false;
        }
        
        if (!moduleObj || typeof moduleObj !== 'object') {
            console.error('[JEV] Module object must be valid');
            return false;
        }
        
        // 注册模块
        this.modules[name] = moduleObj;
        
        // 如果模块有onInit方法，调用它
        if (typeof moduleObj.onInit === 'function') {
            moduleObj.onInit();
        }
        
        return true;
    }
    
    // 获取模块
    getModule(name) {
        return this.modules[name] || null;
    }
    
    // 事件总线 - 发布事件
    emit(eventName, data) {
        if (!this.eventListeners[eventName]) {
            return;
        }
        
        // 触发所有监听器
        this.eventListeners[eventName].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`[JEV] Error in event listener for ${eventName}:`, error);
            }
        });
    }
    
    // 事件总线 - 订阅事件
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error('[JEV] Event callback must be a function');
            return false;
        }
        
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        
        this.eventListeners[eventName].push(callback);
        return true;
    }
    
    // 状态管理 - 设置状态
    setState(key, value) {
        this.stateCache[key] = value;
        return true;
    }
    
    // 状态管理 - 获取状态
    getState(key) {
        if (!key) {
            return this.stateCache;
        }
        return this.stateCache[key] || null;
    }
    
    // 状态管理 - 更新状态
    updateState(newState) {
        this.stateCache = { ...this.stateCache, ...newState };
        this.emit('stateChanged', this.stateCache);
        return true;
    }
    
    // 状态管理 - 清除状态
    clearState(key) {
        if (key) {
            delete this.stateCache[key];
        } else {
            // 如果没有提供key，清除所有状态
            this.stateCache = {};
        }
        return true;
    }
    
    // 便捷方法：提取地址
    extractAddress(domNode) {
        if (this.modules.boloExtractor && this.modules.boloExtractor.extractAddress) {
            return this.modules.boloExtractor.extractAddress(domNode);
        } else {
            console.error('[JEV] BOLO extractor module not available');
            return { success: false, error: 'BOLO extractor not available' };
        }
    }
    
    // 核心方法：处理地址全流程 - 基于任务队列
    processAddress(data) {
        // 创建任务对象
        const task = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: 'addressProcessing',
            input: data,
            priority: data.options?.priority || 'medium', // high, medium, low
            createdAt: Date.now(),
            status: 'queued',
            resolve: null,
            reject: null
        };
        
        // 将任务添加到队列
        this.addTaskToQueue(task);
        
        // 立即开始处理队列
        this.processTaskQueue();
        
        // 返回Promise，等待任务完成
        return new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
        });
    }
    
    // 添加任务到队列
    addTaskToQueue(task) {
        console.log(`[Task Queue] 添加任务: ${task.id}, 优先级: ${task.priority}`);
        
        // 根据优先级插入队列
        const highPriorityTasks = this.taskQueue.queue.filter(t => t.priority === 'high');
        const mediumPriorityTasks = this.taskQueue.queue.filter(t => t.priority === 'medium');
        const lowPriorityTasks = this.taskQueue.queue.filter(t => t.priority === 'low');
        
        // 清空并重建队列（高优先级在前）
        this.taskQueue.queue = [];
        this.taskQueue.queue.push(...highPriorityTasks);
        
        // 插入当前任务
        if (task.priority === 'high') {
            this.taskQueue.queue.push(task);
        }
        
        this.taskQueue.queue.push(...mediumPriorityTasks);
        
        if (task.priority === 'medium') {
            this.taskQueue.queue.push(task);
        }
        
        this.taskQueue.queue.push(...lowPriorityTasks);
        
        if (task.priority === 'low') {
            this.taskQueue.queue.push(task);
        }
        
        // 更新队列状态
        const queue = [...this.stateCache.processingQueue];
        queue.push(task);
        this.updateState({ processingQueue: queue });
    }
    
    // 处理任务队列
    async processTaskQueue() {
        // 如果队列已经在处理中或暂停，直接返回
        if (this.taskQueue.processing || this.taskQueue.paused) return;
        
        this.taskQueue.processing = true;
        
        try {
            while (this.taskQueue.queue.length > 0 && 
                   this.taskQueue.processingTasks.size < this.taskQueue.maxConcurrentTasks) {
                
                // 获取下一个任务
                const task = this.taskQueue.queue.shift();
                
                // 标记任务为处理中
                task.status = 'processing';
                task.startTime = Date.now();
                this.taskQueue.processingTasks.add(task.id);
                
                console.log(`[Task Queue] 开始处理任务: ${task.id}`);
                
                // 更新系统状态
                if (this.taskQueue.processingTasks.size >= this.taskQueue.maxConcurrentTasks * 0.8) {
                    this.updateState({ systemStatus: 'busy' });
                } else {
                    this.updateState({ systemStatus: 'processing' });
                }
                
                // 更新队列状态
                const queue = this.stateCache.processingQueue.filter(t => t.id !== task.id);
                this.updateState({ processingQueue: [...queue, task] });
                
                // 并行处理任务
                this.executeTask(task).catch(error => {
                    console.error(`[Task Queue] 任务 ${task.id} 处理失败:`, error);
                    
                    if (task.reject) {
                        task.reject(error);
                    }
                });
            }
        } finally {
            this.taskQueue.processing = false;
        }
    }
    
    // 执行单个任务
    async executeTask(task) {
        const startTime = performance.now();
        const { addressNode, options = {} } = task.input;
        
        // 初始化统一数据格式
        const processData = {
            taskId: task.id,
            address: null,
            text: null,
            translation: null,
            aiResponse: null,
            processingTimes: {},
            errors: [],
            status: 'processing',
            timestamp: new Date().toISOString()
        };
        
        try {
            // 使用并行处理执行BOLO和OCR
            const [addressResult, ocrResult] = await Promise.all([
                this.performBoloExtractionWithCache(addressNode, options),
                this.performOCRRecognitionWithCache(addressNode, options)
            ]);
            
            // 处理BOLO结果
            if (addressResult.success) {
                processData.address = addressResult.address;
                processData.processingTimes.bolo = addressResult.processingTime;
                this.updateProcessingStats('boloTime', addressResult.processingTime);
            } else {
                processData.errors.push('BOLO extraction failed: ' + (addressResult.error || 'Unknown error'));
            }
            
            // 处理OCR结果
            if (ocrResult.success) {
                processData.text = ocrResult.text;
                processData.processingTimes.ocr = ocrResult.processingTime;
                this.updateProcessingStats('ocrTime', ocrResult.processingTime);
            } else {
                processData.errors.push('OCR recognition failed: ' + (ocrResult.error || 'Unknown error'));
            }
            
            // 执行翻译（使用缓存）
            const translationText = processData.address || processData.text;
            const translationResult = await this.performTranslationWithCache(translationText, options.targetLanguage || 'en');
            
            if (translationResult.success) {
                processData.translation = translationResult.translation;
                processData.processingTimes.translation = translationResult.processingTime;
                this.updateProcessingStats('translationTime', translationResult.processingTime);
            } else {
                processData.errors.push('Translation failed: ' + (translationResult.error || 'Unknown error'));
            }
            
            // 执行AI处理（使用缓存）
            const aiResult = await this.performAIProcessingWithCache(processData);
            
            if (aiResult.success) {
                processData.aiResponse = aiResult.response;
                processData.processingTimes.ai = aiResult.processingTime;
                this.updateProcessingStats('aiTime', aiResult.processingTime);
            } else {
                processData.errors.push('AI processing failed: ' + (aiResult.error || 'Unknown error'));
            }
            
            // 计算总处理时间
            processData.totalProcessingTime = performance.now() - startTime;
            processData.status = processData.errors.length > 0 ? 'partial' : 'success';
            
            // 完成任务
            this.completeTask(task, processData);
            
            // 返回处理结果
            if (task.resolve) {
                task.resolve(processData);
            }
            
            return processData;
        } catch (error) {
            console.error(`[Task Queue] 执行任务 ${task.id} 时出错:`, error);
            
            processData.status = 'error';
            processData.error = error.message;
            processData.totalProcessingTime = performance.now() - startTime;
            
            // 完成任务（失败）
            this.completeTask(task, processData, error);
            
            // 拒绝Promise
            if (task.reject) {
                task.reject(error);
            }
            
            throw error;
        }
    }
    
    // 完成任务
    completeTask(task, result, error = null) {
        task.status = error ? 'failed' : 'completed';
        task.endTime = Date.now();
        task.duration = task.endTime - task.startTime;
        task.result = result;
        task.error = error;
        
        // 从处理中的任务集合中移除
        this.taskQueue.processingTasks.delete(task.id);
        
        console.log(`[Task Queue] 任务 ${task.id} ${error ? '失败' : '完成'}, 耗时: ${task.duration}ms`);
        
        // 更新队列状态
        const queue = this.stateCache.processingQueue.filter(t => t.id !== task.id);
        this.updateState({ processingQueue: queue });
        
        // 更新系统状态
        if (this.taskQueue.processingTasks.size === 0) {
            this.updateState({ systemStatus: 'idle' });
        }
        
        // 触发完成事件
        this.emit('addressProcessingComplete', result);
        
        // 继续处理队列中的下一个任务
        this.processTaskQueue();
    }
    
    // 执行OCR文字识别
    performOCRRecognition(domNode, processData) {
        if (!this.modules.ocrEngine || !this.modules.ocrEngine.recognizeText) {
            console.error('[JEV] OCR engine module not available');
            processData.errors.push('OCR engine not available');
            this.completeProcess(processData);
            return;
        }
        
        const ocrStartTime = performance.now();
        const ocrResult = this.modules.ocrEngine.recognizeText(domNode);
        const ocrEndTime = performance.now();
        
        processData.processingTimes.ocr = ocrEndTime - ocrStartTime;
        
        if (ocrResult.success) {
            processData.text = ocrResult.text;
            this.updateProcessingStats('ocrTime', processData.processingTimes.ocr);
            
            // 步骤3: 翻译引擎
            this.processStep('translation', () => {
                this.performTranslation(processData.address || processData.text, processData);
            });
        } else {
            processData.errors.push('OCR recognition failed: ' + (ocrResult.error || 'Unknown error'));
            // 即使OCR失败，也尝试继续翻译
            this.performTranslation(processData.address, processData);
        }
    }
    
    // 带缓存和API优化的BOLO地址提取
    async performBoloExtractionWithCache(addressNode, options = {}) {
        const startTime = performance.now();
        
        try {
            // 生成缓存键
            const cacheKey = this.generateCacheKey('bolo', addressNode, options);
            
            // 尝试从缓存获取
            const cachedResult = this.getFromCache('bolo', cacheKey);
            if (cachedResult) {
                console.log(`[BOLO Extractor] 从缓存获取地址: "${cachedResult.address}"`);
                return {
                    ...cachedResult,
                    processingTime: performance.now() - startTime
                };
            }
            
            // 使用API优化器进行地址提取
            const extractionRequest = () => this.extractAddress(addressNode);
            
            let addressResult;
            
            if (this.apiOptimizer) {
                // 使用API优化器处理请求
                addressResult = await this.apiOptimizer.executeWithRetry({
                    request: extractionRequest,
                    module: 'bolo',
                    operation: 'extractAddress',
                    maxRetries: 3,
                    timeout: 5000,
                    priority: options.priority || 'high'
                });
                
                // 更新API统计信息
                this.updateProcessingStats('apiRetryCount', this.apiOptimizer.getStats().retryCount);
            } else {
                // 降级到直接执行（API优化器未加载时）
                console.warn('[JEV] API Optimizer not available, falling back to direct extraction');
                addressResult = await extractionRequest();
            }
            
            // 计算处理时间
            const processingTime = performance.now() - startTime;
            console.log(`[BOLO Extractor] 地址提取完成: "${addressResult.address}", 耗时: ${processingTime}ms`);
            
            // 保存到缓存
            this.saveToCache('bolo', cacheKey, addressResult);
            
            return {
                ...addressResult,
                processingTime
            };
        } catch (error) {
            console.error('[JEV] BOLO地址提取失败:', error);
            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime
            };
        }
    }
    
    // 带缓存和API优化的OCR文字识别
    async performOCRRecognitionWithCache(addressNode, options = {}) {
        const startTime = performance.now();
        
        try {
            // 生成缓存键
            const cacheKey = this.generateCacheKey('ocr', addressNode, options);
            
            // 尝试从缓存获取
            const cachedResult = this.getFromCache('ocr', cacheKey);
            if (cachedResult) {
                console.log(`[OCR Engine] 从缓存获取文本: "${cachedResult.text}"`);
                return {
                    ...cachedResult,
                    processingTime: performance.now() - startTime
                };
            }
            
            // 使用API优化器进行OCR识别
            const recognitionRequest = () => {
                if (this.modules.ocrEngine && this.modules.ocrEngine.recognizeText) {
                    return this.modules.ocrEngine.recognizeText(addressNode);
                }
                throw new Error('OCR engine module not available');
            };
            
            let ocrResult;
            
            if (this.apiOptimizer) {
                // 使用API优化器处理请求
                ocrResult = await this.apiOptimizer.executeWithRetry({
                    request: recognitionRequest,
                    module: 'ocr',
                    operation: 'recognizeText',
                    maxRetries: 3,
                    timeout: 10000, // OCR可能需要更长时间
                    priority: options.priority || 'medium'
                });
                
                // 更新API统计信息
                const stats = this.apiOptimizer.getStats();
                this.updateProcessingStats('apiRetryCount', stats.retryCount);
                this.updateProcessingStats('timeoutCount', stats.timeoutCount);
            } else {
                // 降级到直接执行（API优化器未加载时）
                console.warn('[JEV] API Optimizer not available, falling back to direct OCR');
                ocrResult = await recognitionRequest();
            }
            
            // 计算处理时间
            const processingTime = performance.now() - startTime;
            console.log(`[OCR Engine] 文字识别完成: "${ocrResult.text}", 耗时: ${processingTime}ms`);
            
            // 保存到缓存
            this.saveToCache('ocr', cacheKey, ocrResult);
            
            return {
                ...ocrResult,
                processingTime
            };
        } catch (error) {
            console.error('[JEV] OCR文字识别失败:', error);
            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime
            };
        }
    }
    
    // 带缓存和API优化的翻译处理
    async performTranslationWithCache(text, targetLanguage, options = {}) {
        const startTime = performance.now();
        
        try {
            // 生成缓存键
            const cacheKey = `${text}_${targetLanguage}`;
            
            // 尝试从缓存获取
            const cachedResult = this.getFromCache('translation', cacheKey);
            if (cachedResult) {
                console.log(`[Translation Engine] 从缓存获取翻译: "${cachedResult.translation}"`);
                return {
                    ...cachedResult,
                    processingTime: performance.now() - startTime
                };
            }
            
            // 使用API优化器进行翻译
            const translationRequest = () => {
                if (this.modules.translationEngine && this.modules.translationEngine.translate) {
                    return this.modules.translationEngine.translate(text, targetLanguage);
                }
                throw new Error('Translation engine module not available');
            };
            
            let translationResult;
            
            if (this.apiOptimizer) {
                // 使用API优化器处理请求
                translationResult = await this.apiOptimizer.executeWithRetry({
                    request: translationRequest,
                    module: 'translation',
                    operation: 'translate',
                    maxRetries: 3,
                    timeout: 8000,
                    priority: options.priority || 'medium'
                });
                
                // 更新API统计信息
                const stats = this.apiOptimizer.getStats();
                this.updateProcessingStats('apiRetryCount', stats.retryCount);
                this.updateProcessingStats('batchRequestsMerged', stats.batchRequestsMerged);
            } else {
                // 降级到直接执行（API优化器未加载时）
                console.warn('[JEV] API Optimizer not available, falling back to direct translation');
                translationResult = await translationRequest();
            }
            
            // 计算处理时间
            const processingTime = performance.now() - startTime;
            console.log(`[Translation Engine] 翻译完成: "${translationResult.translation}", 耗时: ${processingTime}ms`);
            
            // 保存到缓存
            this.saveToCache('translation', cacheKey, translationResult);
            
            return {
                ...translationResult,
                processingTime
            };
        } catch (error) {
            console.error('[JEV] 翻译处理失败:', error);
            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime
            };
        }
    }
    
    // 带缓存和API优化的AI对话处理
    async performAIProcessingWithCache(processData) {
        const startTime = performance.now();
        
        try {
            // 生成缓存键
            const cacheKey = this.generateCacheKey('ai', processData);
            
            // 尝试从缓存获取
            const cachedResult = this.getFromCache('ai', cacheKey);
            if (cachedResult) {
                console.log(`[AI Dialog System] 从缓存获取AI响应`);
                return {
                    ...cachedResult,
                    processingTime: performance.now() - startTime
                };
            }
            
            // 使用API优化器进行AI处理
            const aiRequest = () => {
                if (this.modules.aiDialogSystem && this.modules.aiDialogSystem.processAddressQuery) {
                    return this.modules.aiDialogSystem.processAddressQuery(processData);
                }
                throw new Error('AI dialog system module not available');
            };
            
            let aiResult;
            
            if (this.apiOptimizer) {
                // 使用API优化器处理请求
                aiResult = await this.apiOptimizer.executeWithRetry({
                    request: aiRequest,
                    module: 'ai',
                    operation: 'processAddressQuery',
                    maxRetries: 3,
                    timeout: 15000, // AI处理可能需要更长时间
                    priority: 'medium'
                });
                
                // 更新API统计信息
                const stats = this.apiOptimizer.getStats();
                this.updateProcessingStats('apiRetryCount', stats.retryCount);
                this.updateProcessingStats('timeoutCount', stats.timeoutCount);
            } else {
                // 降级到直接执行（API优化器未加载时）
                console.warn('[JEV] API Optimizer not available, falling back to direct AI processing');
                aiResult = await aiRequest();
            }
            
            // 计算处理时间
            const processingTime = performance.now() - startTime;
            console.log(`[AI Dialog System] AI处理完成: "${aiResult.response}", 耗时: ${processingTime}ms`);
            
            // 保存到缓存
            this.saveToCache('ai', cacheKey, aiResult);
            
            return {
                ...aiResult,
                processingTime
            };
        } catch (error) {
            console.error('[JEV] AI对话处理失败:', error);
            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime
            };
        }
    }
    
    // 执行翻译
    performTranslation(textToTranslate, processData) {
        if (!this.modules.translationEngine || !this.modules.translationEngine.translate) {
            console.error('[JEV] Translation engine module not available');
            processData.errors.push('Translation engine not available');
            this.completeProcess(processData);
            return;
        }
        
        const translationStartTime = performance.now();
        const translationResult = this.modules.translationEngine.translate(textToTranslate);
        const translationEndTime = performance.now();
        
        processData.processingTimes.translation = translationEndTime - translationStartTime;
        
        if (translationResult.success) {
            processData.translation = translationResult.translation;
            this.updateProcessingStats('translationTime', processData.processingTimes.translation);
        } else {
            processData.errors.push('Translation failed: ' + (translationResult.error || 'Unknown error'));
        }
        
        // 步骤4: AI对话系统
        this.processStep('aiProcessing', () => {
            this.performAIProcessing(processData);
        });
    }
    
    // 生成缓存键
    generateCacheKey(type, data, options = {}) {
        if (type === 'bolo' || type === 'ocr') {
            // 对于DOM节点，使用其内容和结构特征
            if (data && data.innerText) {
                let content = data.innerText;
                // 限制缓存键长度
                if (content.length > 200) {
                    content = content.substring(0, 200) + '...';
                }
                return `${content}_${JSON.stringify(options)}`;
            }
        } else if (type === 'ai') {
            // 对于AI处理，使用地址、文本和翻译的组合
            return JSON.stringify({
                address: data.address,
                text: data.text,
                translation: data.translation
            });
        }
        
        // 对于其他类型，使用字符串化的数据
        return JSON.stringify(data);
    }
    
    // 从缓存获取
    getFromCache(type, key) {
        const cache = this.cacheManager.caches[type];
        if (!cache) return null;
        
        const cachedItem = cache.get(key);
        if (!cachedItem) return null;
        
        // 检查是否过期
        if (Date.now() > cachedItem.expiry) {
            cache.delete(key);
            return null;
        }
        
        return cachedItem.value;
    }
    
    // 保存到缓存
    saveToCache(type, key, value) {
        const cache = this.cacheManager.caches[type];
        if (!cache) return;
        
        // 检查缓存大小
        if (cache.size >= this.cacheManager.maxCacheSize) {
            // 删除最早的缓存项
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        // 保存缓存项
        cache.set(key, {
            value,
            expiry: Date.now() + this.cacheManager.ttl,
            timestamp: Date.now()
        });
    }
    
    // 清除缓存
    clearCache(type = null) {
        if (type && this.cacheManager.caches[type]) {
            this.cacheManager.caches[type].clear();
            console.log(`[Cache Manager] 已清除 ${type} 缓存`);
        } else {
            // 清除所有缓存
            Object.values(this.cacheManager.caches).forEach(cache => cache.clear());
            console.log('[Cache Manager] 已清除所有缓存');
        }
    }
    
    // 获取队列状态
    getQueueStatus() {
        return {
            pendingTasks: this.taskQueue.queue.length,
            processingTasks: this.taskQueue.processingTasks.size,
            maxConcurrentTasks: this.taskQueue.maxConcurrentTasks,
            queueLengthByPriority: {
                high: this.taskQueue.queue.filter(t => t.priority === 'high').length,
                medium: this.taskQueue.queue.filter(t => t.priority === 'medium').length,
                low: this.taskQueue.queue.filter(t => t.priority === 'low').length
            },
            systemStatus: this.stateCache.systemStatus
        };
    }
    
    // 设置最大并发任务数
    setMaxConcurrentTasks(maxTasks) {
        if (typeof maxTasks === 'number' && maxTasks > 0) {
            this.taskQueue.maxConcurrentTasks = maxTasks;
            console.log(`[Task Queue] 最大并发任务数已设置为: ${maxTasks}`);
            
            // 立即触发队列处理
            this.processTaskQueue();
        }
    }
    
    // 暂停任务队列
    pauseTaskQueue() {
        this.taskQueue.paused = true;
        console.log('[Task Queue] 任务队列已暂停');
    }
    
    // 恢复任务队列
    resumeTaskQueue() {
        this.taskQueue.paused = false;
        console.log('[Task Queue] 任务队列已恢复');
        
        // 恢复后立即处理队列
        this.processTaskQueue();
    }
    
    // 取消任务
    cancelTask(taskId) {
        // 从待处理队列中移除
        const queueIndex = this.taskQueue.queue.findIndex(t => t.id === taskId);
        if (queueIndex > -1) {
            const task = this.taskQueue.queue.splice(queueIndex, 1)[0];
            console.log(`[Task Queue] 已从队列中取消任务: ${taskId}`);
            
            // 更新队列状态
            const queue = this.stateCache.processingQueue.filter(t => t.id !== taskId);
            this.updateState({ processingQueue: queue });
            
            if (task.reject) {
                task.reject(new Error('Task cancelled'));
            }
            return true;
        }
        
        // 注：处理中的任务无法直接取消，需要通过其他机制中断
        console.log(`[Task Queue] 未找到任务: ${taskId}`);
        return false;
    }
    
    // 执行AI处理
    performAIProcessing(processData) {
        if (!this.modules.aiDialogSystem || !this.modules.aiDialogSystem.processAddressQuery) {
            console.error('[JEV] AI dialog system module not available');
            processData.errors.push('AI dialog system not available');
            this.completeProcess(processData);
            return;
        }
        
        const aiStartTime = performance.now();
        const aiResult = this.modules.aiDialogSystem.processAddressQuery(processData);
        const aiEndTime = performance.now();
        
        processData.processingTimes.ai = aiEndTime - aiStartTime;
        
        if (aiResult.success) {
            processData.aiResponse = aiResult.response;
            this.updateProcessingStats('aiTime', processData.processingTimes.ai);
        } else {
            processData.errors.push('AI processing failed: ' + (aiResult.error || 'Unknown error'));
        }
        
        // 完成整个处理流程
        this.completeProcess(processData);
    }
    
    // 处理单个步骤（支持并行处理）
    processStep(stepName, stepFn) {
        // 记录步骤开始
        console.log(`[JEV] Starting step: ${stepName}`);
        
        // 立即执行步骤
        stepFn();
    }
    
    // 完成整个处理流程
    completeProcess(processData) {
        // 计算总处理时间
        const totalTime = Object.values(processData.processingTimes).reduce((sum, time) => sum + time, 0);
        processData.totalProcessingTime = totalTime;
        
        console.log(`[JEV] Address processing completed in ${totalTime.toFixed(2)}ms`);
        
        // 保存结果到状态
        const results = [...this.getState('addressExtractionResults')];
        results.push(processData);
        this.updateState({ addressExtractionResults: results });
        
        // 触发完成事件
        this.emit('addressProcessingComplete', processData);
        
        return processData;
    }
    
    // 更新处理统计信息
    updateProcessingStats(key, value) {
        const stats = { ...this.getState('processingStats') };
        stats[key] = value;
        this.updateState({ processingStats: stats });
        
        // 将处理时间同步到性能监控器
        if (this.performanceMonitor) {
            switch(key) {
                case 'boloTime':
                    this.performanceMonitor.updatePerformanceData('bolo', value);
                    // 增加请求计数
                    stats.boloRequestCount = (stats.boloRequestCount || 0) + 1;
                    break;
                case 'ocrTime':
                    this.performanceMonitor.updatePerformanceData('ocr', value);
                    // 增加请求计数
                    stats.ocrRequestCount = (stats.ocrRequestCount || 0) + 1;
                    break;
                case 'translationTime':
                    this.performanceMonitor.updatePerformanceData('translation', value);
                    // 增加请求计数
                    stats.translationRequestCount = (stats.translationRequestCount || 0) + 1;
                    break;
                case 'aiTime':
                    this.performanceMonitor.updatePerformanceData('ai', value);
                    // 增加请求计数
                    stats.aiRequestCount = (stats.aiRequestCount || 0) + 1;
                    break;
                case 'apiRetryCount':
                    // 更新API统计
                    if (this.apiOptimizer) {
                        const stats = this.apiOptimizer.getStats();
                        this.performanceMonitor.updateAPIStats(
                            stats.retryCount,
                            stats.batchRequestsMerged,
                            stats.timeoutCount
                        );
                    }
                    break;
            }
        }
        
        // 检查是否需要触发性能分析
        this.checkAndTriggerPerformanceAnalysis();
    }
    
    // 检查并触发性能分析
    checkAndTriggerPerformanceAnalysis() {
        const stats = this.getState('processingStats');
        // 计算总请求数
        const totalRequests = ['bolo', 'ocr', 'translation', 'ai'].reduce((total, module) => {
            return total + (stats[`${module}RequestCount`] || 0);
        }, 0);
        
        // 如果累计请求数达到阈值且存在性能分析器，触发分析
        if (totalRequests > 0 && totalRequests % 50 === 0 && this.performanceAnalyzer) {
            console.log(`[JEV] 触发性能分析，累计处理请求数: ${totalRequests}`);
            this.performanceAnalyzer.analyzePerformance();
        }
    }
}

// 创建单例实例并挂载到JEV命名空间
JEV.Controller = new JEVIntegratedController();

// 加载依赖模块
function loadModules() {
    console.log('[JEV] Loading modules...');
    // 模拟模块加载延迟
    setTimeout(() => {
        JEV.Controller.updateState({ systemStatus: 'ready' });
        console.log('[JEV] All modules loaded successfully');
        
        // 注册所有必要的模块
        registerAllModules();
    }, 500);
}

// 注册所有模块
    function registerAllModules() {
        // 注册BOLO地址提取模块
        if (window.boloExtractor) {
            JEV.Controller.registerModule('boloExtractor', {
                onInit: () => console.log('[BOLO Extractor] Registered with controller'),
                extractAddress: (domNode) => boloExtractor.extractAddress(domNode),
                validateAddress: (address) => boloExtractor.validateAddress(address),
                getAverageProcessingTime: () => (boloExtractor.getAverageProcessingTime ? boloExtractor.getAverageProcessingTime() : 0)
            });
            console.log('[JEV] BOLO address extraction module integrated');
        }
        
        // 注册OCR引擎模块
        if (window.ocrEngine) {
            JEV.Controller.registerModule('ocrEngine', {
                onInit: () => console.log('[OCR Engine] Registered with controller'),
                recognizeText: (domNode) => ocrEngine.recognizeText(domNode),
                getAverageProcessingTime: () => ocrEngine.getAverageProcessingTime(),
                clearCache: () => ocrEngine.clearCache()
            });
            console.log('[JEV] OCR engine module integrated');
        }
        
        // 注册翻译引擎模块
        if (window.translationEngine) {
            JEV.Controller.registerModule('translationEngine', {
                onInit: () => console.log('[Translation Engine] Registered with controller'),
                translate: (text, targetLanguage) => translationEngine.translate(text, targetLanguage),
                getAverageProcessingTime: () => translationEngine.getAverageProcessingTime(),
                clearCache: () => translationEngine.clearCache()
            });
            console.log('[JEV] Translation engine module integrated');
        }
        
        // 注册AI对话系统模块
        if (window.aiDialogSystem) {
            JEV.Controller.registerModule('aiDialogSystem', {
                onInit: () => console.log('[AI Engine] Registered with controller'),
                processQuery: (query, context) => aiDialogSystem.processQuery(query, context),
                processAddressQuery: (addressInfo) => aiDialogSystem.processAddressQuery(addressInfo),
                getConversationHistory: () => aiDialogSystem.getConversationHistory(),
                clearHistory: () => aiDialogSystem.clearHistory(),
                getAverageProcessingTime: () => aiDialogSystem.getAverageProcessingTime(),
                clearCache: () => aiDialogSystem.clearCache()
            });
            console.log('[JEV] AI dialog system module integrated');
        }
        
        // 注册延迟监控模块
        if (window.delayMonitor) {
            JEV.Controller.registerModule('delayMonitor', {
                onInit: () => console.log('[Delay Monitor] Registered with controller'),
                initialize: (chartElement, statsElement) => delayMonitor.initialize(chartElement, statsElement),
                recordProcessingTime: (module, time) => delayMonitor.recordProcessingTime(module, time),
                generatePerformanceReport: () => delayMonitor.generatePerformanceReport(),
                clearHistory: () => delayMonitor.clearHistory()
            });
            console.log('[JEV] Delay monitor module integrated');
        }
        
        // 注册数据模型模块
        if (window.dataModel) {
            JEV.Controller.registerModule('dataModel', {
                onInit: () => console.log('[Data Model] Registered with controller'),
                validateData: (data, schema) => dataModel.validateData(data, schema),
                createTemplate: (templateType) => dataModel.createTemplate(templateType),
                formatData: (data) => dataModel.formatData(data)
            });
            console.log('[JEV] Data model module integrated');
        }
        
        console.log('[JEV] All modules registered successfully');
        console.log('[JEV] 任务队列系统已初始化，最大并发任务数:', JEV.Controller.taskQueue.maxConcurrentTasks);
        console.log('[JEV] 缓存管理系统已初始化');
    }

// 初始化时加载模块
loadModules();

// 注册测试模块并验证事件系统
function initializeTestModule() {
    JEV.Controller.registerModule('testModule', {
        onInit: () => console.log('[testModule] initialized'),
        onPing: () => console.log('[testModule] received ping')
    });
    
    // 订阅ping事件
    JEV.Controller.on('ping', (data) => {
        const testModule = JEV.Controller.getModule('testModule');
        if (testModule && typeof testModule.onPing === 'function') {
            testModule.onPing();
        }
    });
    
    // 监听地址提取结果事件
    JEV.Controller.on('addressExtracted', (result) => {
        console.log('[JEV] Address extraction result received:', result);
        // 更新状态存储提取结果
        const results = [...JEV.Controller.getState('addressExtractionResults')];
        results.push(result);
        JEV.Controller.updateState({ addressExtractionResults: results });
    });
    
    // 监听地址处理完成事件
    JEV.Controller.on('addressProcessingComplete', (result) => {
        console.log('[JEV] Address processing complete:', {
            address: result.address,
            text: result.text,
            translation: result.translation,
            processingTime: result.totalProcessingTime
        });
    });
    
    // 监听状态变化
    JEV.Controller.on('stateChanged', (newState) => {
        console.log('[JEV] State updated:', {
            systemStatus: newState.systemStatus,
            processingStats: newState.processingStats
        });
    });
    
    // 注册processAddress事件处理
    JEV.Controller.on('processAddress', (data) => {
        console.log('[JEV] Received processAddress event');
        JEV.Controller.processAddress(data);
    });
    
    // 触发ping事件
    JEV.Controller.emit('ping', { source: 'controller' });
    
    // 输出核心系统在线日志
    console.log('[JEV] Core systems online');
}

// 延迟初始化测试模块，确保控制器完全加载
setTimeout(initializeTestModule, 100);
