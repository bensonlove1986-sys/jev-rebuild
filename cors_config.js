// JEV 系统 CORS 配置脚本 v1.0
// 确保所有 API 接口正确处理跨域请求

class CORSCONFIG {
    constructor() {
        // 全局 CORS 配置
        this.config = {
            enabled: true,
            debugMode: false,
            // 允许的源列表
            allowedOrigins: [
                '*', // 生产环境中应限制为特定域名
                'http://localhost:3000',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:8080'
            ],
            // 允许的 HTTP 方法
            allowedMethods: [
                'GET',
                'POST',
                'PUT',
                'DELETE',
                'OPTIONS',
                'PATCH'
            ],
            // 允许的请求头
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'X-Auth-Token',
                'X-API-Key',
                'Accept',
                'Origin',
                'Cache-Control',
                'Pragma'
            ],
            // 允许客户端读取的响应头
            exposedHeaders: [
                'Content-Length',
                'Content-Type',
                'X-Request-Id',
                'X-Response-Time',
                'X-Auth-Token',
                'Access-Control-Allow-Origin'
            ],
            // 是否允许携带凭证（cookies, HTTP认证等）
            allowCredentials: true,
            //预检请求的缓存时间（秒）
            maxAge: 86400, // 24小时
            // 每个模块的特定配置
            moduleConfigs: {
                boloExtractor: {
                    endpoints: ['/api/bolo/extract', '/api/bolo/validate'],
                    customHeaders: {
                        'X-BOLO-Module-Version': '1.0.0'
                    }
                },
                ocrEngine: {
                    endpoints: ['/api/ocr/recognize', '/api/ocr/process'],
                    customHeaders: {
                        'X-OCR-Module-Version': '1.0.0'
                    }
                },
                translationEngine: {
                    endpoints: ['/api/translate/text', '/api/translate/detect'],
                    customHeaders: {
                        'X-Translation-Module-Version': '1.0.0'
                    }
                },
                aiDialogSystem: {
                    endpoints: ['/api/ai/dialog', '/api/ai/process'],
                    customHeaders: {
                        'X-AI-Module-Version': '1.0.0'
                    }
                }
            }
        };
        
        // 初始化日志
        this.logger = this.createLogger();
        
        // 是否已经初始化
        this.initialized = false;
    }
    
    /**
     * 创建日志工具
     */
    createLogger() {
        return {
            log: (level, message) => {
                if (!this.config.debugMode && level === 'debug') return;
                
                const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
                const prefix = `[${timestamp}] [CORS] [${level.toUpperCase()}]`;
                
                switch (level.toLowerCase()) {
                    case 'error':
                        console.error(prefix, message);
                        break;
                    case 'warn':
                        console.warn(prefix, message);
                        break;
                    case 'info':
                        console.info(prefix, message);
                        break;
                    case 'debug':
                        console.debug(prefix, message);
                        break;
                    default:
                        console.log(prefix, message);
                }
            },
            debug: (message) => this.log('debug', message),
            info: (message) => this.log('info', message),
            warn: (message) => this.log('warn', message),
            error: (message) => this.log('error', message)
        };
    }
    
    /**
     * 初始化 CORS 配置
     */
    initialize() {
        if (this.initialized) {
            this.logger.warn('CORS 配置已经初始化');
            return;
        }
        
        this.logger.info('初始化 CORS 配置...');
        
        // 在浏览器环境中设置 CORS 请求拦截器
        if (typeof window !== 'undefined' && window.fetch) {
            this.setupFetchInterceptor();
        }
        
        // 为 XMLHttpRequest 设置拦截器
        if (typeof window !== 'undefined' && window.XMLHttpRequest) {
            this.setupXHRInterceptor();
        }
        
        this.initialized = true;
        this.logger.info('CORS 配置初始化完成');
        
        return this;
    }
    
    /**
     * 设置 fetch API 拦截器
     */
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            try {
                // 应用 CORS 配置到请求选项
                const corsOptions = this.applyCORSConfig(url, options);
                
                // 执行原始 fetch
                this.logger.debug(`执行 fetch 请求: ${url}`);
                this.logger.debug('CORS 配置应用:', {
                    credentials: corsOptions.credentials,
                    headers: corsOptions.headers,
                    mode: corsOptions.mode
                });
                
                const response = await originalFetch(url, corsOptions);
                
                // 验证响应是否通过 CORS
                if (!response.ok) {
                    this.logger.warn(`请求失败: ${url}, 状态码: ${response.status}`);
                }
                
                // 处理特定模块的响应头
                this.processModuleResponseHeaders(response, url);
                
                return response;
            } catch (error) {
                this.logger.error(`CORS 请求错误: ${url}`, error);
                throw error;
            }
        };
        
        this.logger.debug('fetch API 拦截器已设置');
    }
    
    /**
     * 设置 XMLHttpRequest 拦截器
     */
    setupXHRInterceptor() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._corsInfo = {
                method,
                url,
                headers: {}
            };
            return originalOpen.call(this, method, url, ...args);
        };
        
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (this._corsInfo) {
                this._corsInfo.headers[header] = value;
            }
            return originalSetRequestHeader.call(this, header, value);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
            if (this._corsInfo) {
                // 应用 CORS 配置
                const corsInfo = this._corsInfo;
                
                // 设置 withCredentials
                if (window.CORSCONFIG.config.allowCredentials) {
                    this.withCredentials = true;
                }
                
                // 添加必要的 CORS 头
                const moduleConfig = window.CORSCONFIG.getModuleConfigForUrl(corsInfo.url);
                if (moduleConfig && moduleConfig.customHeaders) {
                    for (const [header, value] of Object.entries(moduleConfig.customHeaders)) {
                        if (!corsInfo.headers[header]) {
                            originalSetRequestHeader.call(this, header, value);
                        }
                    }
                }
                
                // 设置事件监听器
                this.addEventListener('load', function() {
                    window.CORSCONFIG.logger.debug(`XHR 请求完成: ${corsInfo.url}, 状态码: ${this.status}`);
                });
                
                this.addEventListener('error', function() {
                    window.CORSCONFIG.logger.error(`XHR 请求错误: ${corsInfo.url}`);
                });
            }
            
            return originalSend.apply(this, args);
        };
        
        this.logger.debug('XMLHttpRequest 拦截器已设置');
    }
    
    /**
     * 应用 CORS 配置到请求选项
     */
    applyCORSConfig(url, options) {
        const config = this.config;
        const corsOptions = { ...options };
        
        // 设置 credentials
        if (config.allowCredentials) {
            corsOptions.credentials = 'include';
        }
        
        // 初始化 headers
        corsOptions.headers = corsOptions.headers || {};
        if (typeof corsOptions.headers !== 'object') {
            corsOptions.headers = {};
        }
        
        // 确保 Content-Type 头
        if (!corsOptions.headers['Content-Type'] && 
            (corsOptions.method === 'POST' || corsOptions.method === 'PUT' || corsOptions.method === 'PATCH') &&
            corsOptions.body && typeof corsOptions.body !== 'string' && !(corsOptions.body instanceof FormData)) {
            corsOptions.headers['Content-Type'] = 'application/json';
        }
        
        // 添加模块特定的头
        const moduleConfig = this.getModuleConfigForUrl(url);
        if (moduleConfig && moduleConfig.customHeaders) {
            for (const [header, value] of Object.entries(moduleConfig.customHeaders)) {
                if (!corsOptions.headers[header]) {
                    corsOptions.headers[header] = value;
                }
            }
        }
        
        // 设置请求模式
        if (!corsOptions.mode) {
            corsOptions.mode = 'cors';
        }
        
        return corsOptions;
    }
    
    /**
     * 根据 URL 获取模块配置
     */
    getModuleConfigForUrl(url) {
        for (const [moduleName, moduleConfig] of Object.entries(this.config.moduleConfigs)) {
            if (moduleConfig.endpoints.some(endpoint => url.includes(endpoint))) {
                return moduleConfig;
            }
        }
        return null;
    }
    
    /**
     * 处理模块响应头
     */
    processModuleResponseHeaders(response, url) {
        const moduleConfig = this.getModuleConfigForUrl(url);
        if (moduleConfig) {
            this.logger.debug(`处理 ${url} 的响应头，匹配模块配置: ${JSON.stringify(moduleConfig)}`);
        }
    }
    
    /**
     * 检查 CORS 配置是否有效
     */
    validateConfig() {
        const errors = [];
        
        // 检查必要的配置项
        if (!Array.isArray(this.config.allowedOrigins) || this.config.allowedOrigins.length === 0) {
            errors.push('允许的源列表不能为空');
        }
        
        if (!Array.isArray(this.config.allowedMethods) || this.config.allowedMethods.length === 0) {
            errors.push('允许的方法列表不能为空');
        }
        
        if (!Array.isArray(this.config.allowedHeaders) || this.config.allowedHeaders.length === 0) {
            errors.push('允许的头列表不能为空');
        }
        
        // 检查是否启用了凭证但同时允许所有源（这是不安全的组合）
        if (this.config.allowCredentials && 
            this.config.allowedOrigins.includes('*') && 
            this.config.allowedOrigins.length === 1) {
            this.logger.warn('安全警告: 启用了凭证但允许所有源 (*)，这可能导致安全风险');
        }
        
        // 输出验证结果
        if (errors.length > 0) {
            this.logger.error('CORS 配置验证失败:');
            errors.forEach(error => this.logger.error(`- ${error}`));
            return false;
        } else {
            this.logger.info('CORS 配置验证通过');
            return true;
        }
    }
    
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.logger.info('更新 CORS 配置...');
        
        // 深度合并配置
        this.config = this.deepMerge(this.config, newConfig);
        
        // 重新验证
        this.validateConfig();
        
        this.logger.info('CORS 配置更新完成');
        return this.config;
    }
    
    /**
     * 深度合并对象
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }
    
    /**
     * 检查是否为对象
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * 生成 CORS 预检请求处理函数
     */
    generatePreflightHandler() {
        return (request) => {
            const headers = {
                'Access-Control-Allow-Origin': this.config.allowedOrigins.join(', '),
                'Access-Control-Allow-Methods': this.config.allowedMethods.join(', '),
                'Access-Control-Allow-Headers': this.config.allowedHeaders.join(', '),
                'Access-Control-Expose-Headers': this.config.exposedHeaders.join(', '),
                'Access-Control-Allow-Credentials': String(this.config.allowCredentials),
                'Access-Control-Max-Age': String(this.config.maxAge)
            };
            
            this.logger.debug('预检请求响应头:', headers);
            
            return {
                status: 204,
                headers,
                body: null
            };
        };
    }
    
    /**
     * 为指定模块生成 API 客户端配置
     */
    getModuleAPIClientConfig(moduleName) {
        const moduleConfig = this.config.moduleConfigs[moduleName];
        
        if (!moduleConfig) {
            this.logger.warn(`模块 ${moduleName} 的配置不存在`);
            return null;
        }
        
        return {
            baseURL: '/api',
            headers: {
                ...moduleConfig.customHeaders,
                'Content-Type': 'application/json'
            },
            withCredentials: this.config.allowCredentials,
            endpoints: moduleConfig.endpoints
        };
    }
    
    /**
     * 模拟 CORS 错误处理
     */
    simulateCORSRequest(url, options = {}) {
        this.logger.info(`模拟 CORS 请求: ${url}`);
        
        // 检查是否允许该源
        const origin = options.origin || 'http://localhost:3000';
        let allowedOrigin = '*';
        
        if (!this.config.allowedOrigins.includes('*')) {
            if (this.config.allowedOrigins.includes(origin)) {
                allowedOrigin = origin;
            } else {
                this.logger.error(`CORS 错误: 源 ${origin} 不被允许`);
                return {
                    status: 403,
                    headers: {},
                    error: 'CORS error: Origin not allowed'
                };
            }
        }
        
        // 检查是否允许该方法
        const method = options.method || 'GET';
        if (!this.config.allowedMethods.includes(method.toUpperCase())) {
            this.logger.error(`CORS 错误: 方法 ${method} 不被允许`);
            return {
                status: 405,
                headers: {},
                error: 'CORS error: Method not allowed'
            };
        }
        
        // 模拟成功响应
        const responseHeaders = {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Credentials': String(this.config.allowCredentials),
            'Content-Type': 'application/json'
        };
        
        // 添加暴露的头
        this.config.exposedHeaders.forEach(header => {
            responseHeaders[header] = 'example-value';
        });
        
        this.logger.info(`模拟 CORS 请求成功: ${url}`);
        
        return {
            status: 200,
            headers: responseHeaders,
            body: { success: true, message: 'CORS test successful' }
        };
    }
    
    /**
     * 生成 CORS 配置文档
     */
    generateDocumentation() {
        return {
            title: 'JEV 系统 CORS 配置文档',
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            configuration: this.getConfig(),
            usageExamples: {
                fetch: `
// 使用 fetch API 发送请求
fetch('/api/bolo/extract', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include', // 包含凭证
    body: JSON.stringify({ text: '要提取的地址文本' })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('CORS 错误:', error));
                `.trim(),
                axios: `
// 使用 axios 发送请求
axios({
    url: '/api/ocr/recognize',
    method: 'POST',
    data: { image: 'base64-image-data' },
    withCredentials: true, // 包含凭证
    headers: {
        'X-OCR-Module-Version': '1.0.0'
    }
})
.then(response => console.log(response.data))
.catch(error => console.error('CORS 错误:', error));
                `.trim()
            },
            troubleshooting: [
                '确保服务器正确设置了 CORS 响应头',
                '检查请求是否包含了必要的凭证设置',
                '验证请求头是否在允许的列表中',
                '对于预检请求 (OPTIONS), 确保服务器返回 204 状态码',
                '检查浏览器控制台是否有 CORS 错误信息'
            ]
        };
    }
}

// 创建全局 CORS 配置实例
const corsConfigInstance = new CORSCONFIG();

// 导出到全局
window.CORSCONFIG = corsConfigInstance;

// 自动初始化
if (typeof window !== 'undefined') {
    // 等待 DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => corsConfigInstance.initialize());
    } else {
        // 如果 DOM 已经加载完成，立即初始化
        corsConfigInstance.initialize();
    }
}

// 在 Node.js 环境中导出
if (typeof module !== 'undefined' && typeof require !== 'undefined') {
    module.exports = CORSCONFIG;
}

// 记录初始化信息
if (typeof window !== 'undefined') {
    console.log('JEV 系统 CORS 配置已加载');
    console.log('配置状态:', window.CORSCONFIG.initialized ? '已初始化' : '待初始化');
}