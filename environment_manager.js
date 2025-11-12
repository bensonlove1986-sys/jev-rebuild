// JEV 系统环境配置管理器 v1.0
// 处理云同步、日志记录与错误捕获

class EnvironmentManager {
    constructor() {
        // 初始化状态
        this.initialized = false;
        this.config = null;
        this.modules = {
            cloudSync: null,
            logger: null,
            errorHandler: null
        };
        this.isOnline = navigator.onLine;
        this.systemInfo = this.collectSystemInfo();
        this.sessionId = this.generateSessionId();
        
        // 加载配置
        this.loadConfig();
    }
    
    /**
     * 收集系统信息
     */
    collectSystemInfo() {
        return {
            browser: {
                name: navigator.appName,
                version: navigator.appVersion,
                userAgent: navigator.userAgent,
                language: navigator.language || navigator.userLanguage
            },
            os: {
                platform: navigator.platform
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth
            },
            connection: {
                type: navigator.connection ? navigator.connection.type : null,
                effectiveType: navigator.connection ? navigator.connection.effectiveType : null,
                downlink: navigator.connection ? navigator.connection.downlink : null,
                rtt: navigator.connection ? navigator.connection.rtt : null
            },
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 生成会话ID
     */
    generateSessionId() {
        return 'jev-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            // 尝试从config.json加载配置
            const response = await fetch('./config.json');
            if (!response.ok) {
                throw new Error('配置文件加载失败');
            }
            
            this.config = await response.json();
            console.log('[EnvironmentManager] 配置文件加载成功');
            
            // 初始化各模块
            this.initializeModules();
        } catch (error) {
            console.error('[EnvironmentManager] 配置加载失败:', error);
            // 使用默认配置
            this.config = this.getDefaultConfig();
            this.initializeModules();
        }
    }
    
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            logging: {
                enabled: true,
                level: 'info',
                consoleEnabled: true,
                fileEnabled: false
            },
            cloudSync: {
                enabled: false
            },
            errorHandling: {
                enabled: true,
                autoReport: false
            }
        };
    }
    
    /**
     * 初始化各模块
     */
    initializeModules() {
        // 初始化日志系统
        this.modules.logger = new JEVLogger(this.config.logging);
        
        // 初始化错误处理器
        this.modules.errorHandler = new JEVErrorHandler(this.config.errorHandling, this.modules.logger);
        
        // 初始化云同步
        if (this.config.cloudSync && this.config.cloudSync.enabled) {
            this.modules.cloudSync = new JEVCloudSync(this.config.cloudSync, this.modules.logger);
        }
        
        // 设置网络状态监听
        this.setupNetworkListeners();
        
        // 注册全局错误捕获
        this.registerErrorHandlers();
        
        this.initialized = true;
        this.log('info', '环境管理器初始化完成');
    }
    
    /**
     * 设置网络状态监听
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.log('info', '网络连接恢复');
            
            // 网络恢复时尝试同步
            if (this.modules.cloudSync && this.config.cloudSync.syncOnReconnect) {
                this.modules.cloudSync.performSync();
            }
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.log('info', '网络连接断开');
        });
    }
    
    /**
     * 注册全局错误处理器
     */
    registerErrorHandlers() {
        // 捕获未处理的Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || event, 'unhandledrejection');
            event.preventDefault();
        });
        
        // 捕获全局错误
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event, 'error');
            // 不阻止默认处理，以便浏览器控制台显示错误
        });
        
        // 捕获资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.src || event.target.href)) {
                this.handleError(event, 'resource_load_error');
            }
        }, true);
    }
    
    /**
     * 处理错误
     */
    handleError(error, errorType = 'general') {
        if (!this.modules.errorHandler) {
            console.error('未初始化错误处理器:', error);
            return;
        }
        
        this.modules.errorHandler.handle(error, {
            type: errorType,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            systemInfo: this.systemInfo,
            url: window.location.href,
            userAgent: navigator.userAgent
        });
    }
    
    /**
     * 记录日志
     */
    log(level, message, metadata = {}) {
        if (this.modules.logger) {
            this.modules.logger.log(level, message, metadata);
        } else {
            // 备用日志记录
            const timestamp = new Date().toISOString();
            console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
                `[${timestamp}] [${level.toUpperCase()}] ${message}`,
                metadata
            );
        }
    }
    
    /**
     * 执行云同步
     */
    async performCloudSync() {
        if (!this.modules.cloudSync || !this.isOnline) {
            this.log('warn', '云同步未就绪或网络断开');
            return false;
        }
        
        try {
            return await this.modules.cloudSync.performSync();
        } catch (error) {
            this.handleError(error, 'sync_error');
            return false;
        }
    }
    
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            isOnline: this.isOnline,
            sessionId: this.sessionId,
            modules: {
                logger: this.modules.logger ? 'initialized' : 'not_initialized',
                errorHandler: this.modules.errorHandler ? 'initialized' : 'not_initialized',
                cloudSync: this.modules.cloudSync ? 'initialized' : 'not_initialized'
            },
            configVersion: this.config?.app?.version || 'unknown'
        };
    }
    
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('info', '配置已更新');
        
        // 重新初始化受影响的模块
        this.initializeModules();
        
        return this.config;
    }
}

// JEV 日志系统
class JEVLogger {
    constructor(config) {
        this.config = config || {};
        this.levels = ['debug', 'info', 'warn', 'error'];
        this.currentLevel = this.levels.indexOf(config.level || 'info');
        this.logs = [];
        this.maxLogs = 1000;
    }
    
    /**
     * 记录日志
     */
    log(level, message, metadata = {}) {
        if (this.levels.indexOf(level) < this.currentLevel) {
            return;
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            metadata
        };
        
        // 保存日志
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // 控制台输出
        if (this.config.consoleEnabled) {
            this.consoleLog(logEntry);
        }
        
        // 文件输出
        if (this.config.fileEnabled) {
            this.fileLog(logEntry);
        }
    }
    
    /**
     * 控制台日志
     */
    consoleLog(logEntry) {
        const { timestamp, level, message, metadata } = logEntry;
        const formattedTimestamp = timestamp.split('T')[1].split('.')[0];
        
        switch (level) {
            case 'debug':
                console.debug(`[${formattedTimestamp}] [DEBUG] ${message}`, metadata);
                break;
            case 'info':
                console.info(`[${formattedTimestamp}] [INFO] ${message}`, metadata);
                break;
            case 'warn':
                console.warn(`[${formattedTimestamp}] [WARN] ${message}`, metadata);
                break;
            case 'error':
                console.error(`[${formattedTimestamp}] [ERROR] ${message}`, metadata);
                break;
        }
    }
    
    /**
     * 文件日志（在浏览器环境中模拟）
     */
    fileLog(logEntry) {
        // 在浏览器中，我们可以使用 localStorage 来模拟文件日志
        try {
            const logKey = 'jev_file_logs';
            const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
            existingLogs.push(logEntry);
            
            // 限制日志大小
            if (existingLogs.length > this.maxLogs) {
                existingLogs.splice(0, existingLogs.length - this.maxLogs);
            }
            
            localStorage.setItem(logKey, JSON.stringify(existingLogs));
        } catch (error) {
            console.error('文件日志记录失败:', error);
        }
    }
    
    /**
     * 便捷方法
     */
    debug(message, metadata) { this.log('debug', message, metadata); }
    info(message, metadata) { this.log('info', message, metadata); }
    warn(message, metadata) { this.log('warn', message, metadata); }
    error(message, metadata) { this.log('error', message, metadata); }
    
    /**
     * 获取日志历史
     */
    getLogs(options = {}) {
        const { level, limit = 100 } = options;
        
        let filteredLogs = this.logs;
        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }
        
        return filteredLogs.slice(-limit).reverse();
    }
    
    /**
     * 清除日志
     */
    clearLogs() {
        this.logs = [];
        try {
            localStorage.removeItem('jev_file_logs');
        } catch (error) {
            console.error('清除日志失败:', error);
        }
    }
}

// JEV 错误处理器
class JEVErrorHandler {
    constructor(config, logger) {
        this.config = config || {};
        this.logger = logger;
        this.errors = [];
        this.errorCount = 0;
        this.lastNotification = 0;
    }
    
    /**
     * 处理错误
     */
    handle(error, context = {}) {
        const errorInfo = this.formatError(error, context);
        
        // 保存错误
        this.errors.push(errorInfo);
        this.errorCount++;
        
        // 记录错误
        if (this.logger) {
            this.logger.error('未处理的错误:', errorInfo);
        }
        
        // 显示错误对话框
        if (this.config.showErrorDialogs) {
            this.showErrorDialog(errorInfo);
        }
        
        // 自动报告错误
        if (this.config.autoReport) {
            this.reportError(errorInfo);
        }
        
        // 检查通知阈值
        this.checkNotificationThreshold();
    }
    
    /**
     * 格式化错误信息
     */
    formatError(error, context) {
        const errorInfo = {
            id: 'error-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            type: context.type || 'unknown',
            message: error.message || String(error),
            stack: error.stack || 'No stack trace available',
            context: this.sanitizeContext(context)
        };
        
        // 错误分类
        if (errorInfo.message.includes('NetworkError')) {
            errorInfo.category = 'network';
        } else if (errorInfo.message.includes('Timeout')) {
            errorInfo.category = 'timeout';
        } else if (errorInfo.message.includes('Not found') || errorInfo.message.includes('404')) {
            errorInfo.category = 'not_found';
        } else {
            errorInfo.category = 'general';
        }
        
        return errorInfo;
    }
    
    /**
     * 清理敏感信息
     */
    sanitizeContext(context) {
        const sanitized = { ...context };
        const sensitivePatterns = [
            /api[_-]?key/i,
            /password/i,
            /secret/i,
            /token/i,
            /credential/i
        ];
        
        // 递归清理对象
        const sanitizeObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                // 检查键名是否包含敏感信息
                const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
                if (isSensitive) {
                    result[key] = '***REDACTED***';
                } else if (typeof value === 'object') {
                    result[key] = sanitizeObject(value);
                } else {
                    result[key] = value;
                }
            }
            return result;
        };
        
        return sanitizeObject(sanitized);
    }
    
    /**
     * 显示错误对话框
     */
    showErrorDialog(errorInfo) {
        // 简单的错误提示
        if (typeof alert === 'function') {
            const message = `
错误: ${errorInfo.message}
类型: ${errorInfo.type}

如果问题持续，请联系技术支持。
错误ID: ${errorInfo.id}
            `.trim();
            
            alert(message);
        }
    }
    
    /**
     * 报告错误
     */
    async reportError(errorInfo) {
        if (!this.config.reportEndpoint) {
            return;
        }
        
        try {
            const response = await fetch(this.config.reportEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorInfo),
                timeout: this.config.reportTimeout || 5000
            });
            
            if (!response.ok) {
                throw new Error('错误报告失败');
            }
            
            this.logger?.info('错误报告成功');
        } catch (error) {
            this.logger?.error('错误报告发送失败:', error);
        }
    }
    
    /**
     * 检查通知阈值
     */
    checkNotificationThreshold() {
        if (!this.config.notificationThreshold) {
            return;
        }
        
        const now = Date.now();
        const cooldown = this.config.notificationCooldown || 3600000;
        
        if (this.errorCount >= this.config.notificationThreshold && 
            now - this.lastNotification >= cooldown) {
            
            this.lastNotification = now;
            this.sendErrorNotification();
        }
    }
    
    /**
     * 发送错误通知
     */
    sendErrorNotification() {
        const message = `系统在短时间内检测到 ${this.errorCount} 个错误。建议检查系统状态。`;
        this.logger?.warn(message);
        
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('⚠️ ' + message);
        }
    }
    
    /**
     * 获取错误统计
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errorCount,
            byCategory: {},
            byType: {},
            recentErrors: this.errors.slice(-10)
        };
        
        // 按分类统计
        this.errors.forEach(error => {
            stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });
        
        return stats;
    }
}

// JEV 云同步管理器
class JEVCloudSync {
    constructor(config, logger) {
        this.config = config || {};
        this.logger = logger;
        this.lastSyncTime = null;
        this.isSyncing = false;
        this.syncQueue = [];
        
        // 设置同步定时器
        if (this.config.syncInterval) {
            this.syncInterval = setInterval(() => this.performSync(), this.config.syncInterval);
        }
        
        // 初始同步
        if (this.config.syncOnStart) {
            setTimeout(() => this.performSync(), 1000);
        }
    }
    
    /**
     * 执行同步
     */
    async performSync() {
        if (this.isSyncing) {
            this.logger?.debug('同步已在进行中，添加到队列');
            return new Promise((resolve) => this.syncQueue.push(resolve));
        }
        
        this.isSyncing = true;
        
        try {
            this.logger?.info('开始云同步...');
            
            // 模拟同步逻辑
            await this.syncFiles();
            
            // 记录同步时间
            this.lastSyncTime = new Date().toISOString();
            this.saveLastSyncTime();
            
            this.logger?.info('云同步完成', { lastSyncTime: this.lastSyncTime });
            
            return true;
        } catch (error) {
            this.logger?.error('云同步失败:', error);
            return false;
        } finally {
            this.isSyncing = false;
            
            // 处理队列中的下一个同步请求
            if (this.syncQueue.length > 0) {
                const nextResolve = this.syncQueue.shift();
                nextResolve(this.performSync());
            }
        }
    }
    
    /**
     * 同步文件
     */
    async syncFiles() {
        // 在浏览器环境中，我们使用 IndexedDB 来模拟文件同步
        return new Promise((resolve) => {
            setTimeout(() => {
                this.logger?.debug('模拟文件同步完成');
                resolve();
            }, 1000);
        });
    }
    
    /**
     * 保存最后同步时间
     */
    saveLastSyncTime() {
        try {
            localStorage.setItem('jev_last_sync', this.lastSyncTime);
        } catch (error) {
            this.logger?.error('保存同步时间失败:', error);
        }
    }
    
    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            lastSyncTime: this.lastSyncTime || localStorage.getItem('jev_last_sync') || null,
            isSyncing: this.isSyncing,
            queueLength: this.syncQueue.length
        };
    }
    
    /**
     * 触发立即同步
     */
    triggerSync() {
        return this.performSync();
    }
    
    /**
     * 停止同步服务
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.logger?.info('云同步服务已停止');
        }
    }
}

// 初始化环境管理器
const environmentManager = new EnvironmentManager();

// 导出到全局
window.JEV_ENVIRONMENT = environmentManager;

// 记录初始化信息
console.log('[JEV] 环境管理器已加载');