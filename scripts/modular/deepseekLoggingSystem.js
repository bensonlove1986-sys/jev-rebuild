const fs = require('fs');
const path = require('path');
const { getDeepSeekSecurityExecutor } = require('./deepseekSecurityExecutor');

/**
 * DeepSeek日志记录系统
 * 安全记录所有任务动作、输入、输出和执行时间
 */
class DeepSeekLoggingSystem {
    constructor(options = {}) {
        // 获取安全执行器实例
        this.securityExecutor = getDeepSeekSecurityExecutor();
        
        // 配置
        this.config = {
            // 日志命名空间
            namespace: 'logging_core',
            // 日志键名
            keyName: 'deepseek_exec.log',
            // 本地日志文件路径
            localLogPath: path.resolve('d:\\PDF转网页\\logs\\deepseek_exec.log'),
            // 日志级别
            logLevel: 'info', // error, warn, info, debug
            // 日志轮转配置
            rotation: {
                enabled: true,
                maxSizeMB: 10, // 每个日志文件最大大小
                maxFiles: 5,   // 保留的最大日志文件数
            },
            // 敏感信息过滤配置
            sensitiveInfoFilter: {
                enabled: true,
                patterns: [
                    // 常见的敏感信息模式
                    /['"]password['"]\s*:\s*['"][^'"]+['"]/gi,
                    /['"]api[_\-]?key['"]\s*:\s*['"][^'"]+['"]/gi,
                    /['"]token['"]\s*:\s*['"][^'"]+['"]/gi,
                    /['"]secret['"]\s*:\s*['"][^'"]+['"]/gi,
                    /['"]credential['"]\s*:\s*['"][^'"]+['"]/gi,
                    // 手机号、身份证等个人信息
                    /1[3-9]\d{9}/g,
                    /\d{17}[\dXx]/g,
                    // 邮箱地址
                    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
                ],
                replacement: '[FILTERED]'
            },
            // 异步日志配置
            async: {
                enabled: true,
                batchSize: 10,
                flushIntervalMs: 5000
            },
            // 性能追踪
            performanceTracking: {
                enabled: true,
                thresholdMs: 500 // 记录超过这个时间的操作
            },
            // 日志格式
            format: 'json', // json, text
            ...options
        };
        
        // 日志缓冲区
        this.logBuffer = [];
        // 统计信息
        this.stats = {
            logCount: 0,
            errorCount: 0,
            warnCount: 0,
            infoCount: 0,
            debugCount: 0,
            bytesWritten: 0,
            lastFlushTime: null
        };
        
        // 初始化
        this._initialize();
        
        console.log('[DeepSeekLogging] 日志记录系统初始化完成');
    }
    
    /**
     * 记录任务开始
     */
    logTaskStart(taskId, taskType, params = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            action: 'task_start',
            taskId: taskId,
            taskType: taskType,
            params: this._filterSensitiveInfo(params),
            executor: 'DeepSeek'
        };
        
        this._writeLog(logEntry);
        return logEntry;
    }
    
    /**
     * 记录任务完成
     */
    logTaskComplete(taskId, result = {}, executionTimeMs = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            action: 'task_complete',
            taskId: taskId,
            executionTimeMs: executionTimeMs,
            result: this._filterSensitiveInfo(result),
            executor: 'DeepSeek'
        };
        
        this._writeLog(logEntry);
        
        // 记录性能统计
        if (this.config.performanceTracking.enabled && executionTimeMs > this.config.performanceTracking.thresholdMs) {
            this._logPerformanceWarning(taskId, executionTimeMs);
        }
        
        return logEntry;
    }
    
    /**
     * 记录任务失败
     */
    logTaskFailure(taskId, error, context = {}) {
        const errorInfo = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null
        };
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            action: 'task_failure',
            taskId: taskId,
            error: this._filterSensitiveInfo(errorInfo),
            context: this._filterSensitiveInfo(context),
            executor: 'DeepSeek'
        };
        
        this._writeLog(logEntry);
        return logEntry;
    }
    
    /**
     * 记录安全事件
     */
    logSecurityEvent(eventType, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'warn',
            action: 'security_event',
            eventType: eventType,
            details: this._filterSensitiveInfo(details),
            executor: 'DeepSeek'
        };
        
        this._writeLog(logEntry);
        return logEntry;
    }
    
    /**
     * 记录系统状态
     */
    logSystemState(stateInfo = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            action: 'system_state',
            state: this._filterSensitiveInfo(stateInfo),
            executor: 'DeepSeek'
        };
        
        this._writeLog(logEntry);
        return logEntry;
    }
    
    /**
     * 通用日志记录方法
     */
    log(level, message, data = {}) {
        // 检查日志级别
        if (!this._shouldLog(level)) {
            return null;
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: this._filterSensitiveInfo(data),
            executor: 'DeepSeek'
        };
        
        this._writeLog(logEntry);
        return logEntry;
    }
    
    /**
     * 错误级别日志
     */
    error(message, data = {}) {
        return this.log('error', message, data);
    }
    
    /**
     * 警告级别日志
     */
    warn(message, data = {}) {
        return this.log('warn', message, data);
    }
    
    /**
     * 信息级别日志
     */
    info(message, data = {}) {
        return this.log('info', message, data);
    }
    
    /**
     * 调试级别日志
     */
    debug(message, data = {}) {
        return this.log('debug', message, data);
    }
    
    /**
     * 强制刷新日志缓冲区
     */
    flush() {
        if (this.logBuffer.length > 0) {
            console.log(`[DeepSeekLogging] 强制刷新日志缓冲区，共 ${this.logBuffer.length} 条记录`);
            this._flushLogBuffer();
            return true;
        }
        return false;
    }
    
    /**
     * 获取日志统计信息
     */
    getStats() {
        return {
            ...this.stats,
            bufferSize: this.logBuffer.length,
            config: {
                namespace: this.config.namespace,
                keyName: this.config.keyName,
                logLevel: this.config.logLevel
            }
        };
    }
    
    /**
     * 导出日志（用于调试或分析）
     */
    exportLogs(options = {}) {
        const { maxRecords = 100, filter = {} } = options;
        
        try {
            // 在实际应用中，这里可能需要从externalMemory或其他存储中获取历史日志
            // 这里仅返回一个示例，实际实现需要根据存储方式调整
            console.log(`[DeepSeekLogging] 导出日志记录，最多 ${maxRecords} 条`);
            
            return {
                success: true,
                message: '日志导出请求已提交',
                timestamp: new Date().toISOString(),
                exportId: `export_${Date.now()}`
            };
        } catch (error) {
            console.error(`[DeepSeekLogging] 导出日志失败: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 设置日志级别
     */
    setLogLevel(level) {
        const validLevels = ['error', 'warn', 'info', 'debug'];
        
        if (validLevels.includes(level)) {
            this.config.logLevel = level;
            console.log(`[DeepSeekLogging] 日志级别已设置为: ${level}`);
            return true;
        }
        
        console.error(`[DeepSeekLogging] 无效的日志级别: ${level}，有效值: ${validLevels.join(', ')}`);
        return false;
    }
    
    /**
     * 启用/禁用敏感信息过滤
     */
    setSensitiveInfoFilter(enabled) {
        this.config.sensitiveInfoFilter.enabled = !!enabled;
        console.log(`[DeepSeekLogging] 敏感信息过滤已${enabled ? '启用' : '禁用'}`);
        return true;
    }
    
    /**
     * 添加自定义敏感信息过滤模式
     */
    addSensitivePattern(pattern) {
        if (pattern instanceof RegExp) {
            this.config.sensitiveInfoFilter.patterns.push(pattern);
            console.log(`[DeepSeekLogging] 添加了自定义敏感信息过滤模式`);
            return true;
        }
        return false;
    }
    
    /**
     * 关闭日志系统
     */
    shutdown() {
        console.log('[DeepSeekLogging] 关闭日志系统...');
        
        // 强制刷新缓冲区
        this.flush();
        
        // 清除定时器
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        console.log('[DeepSeekLogging] 日志系统已关闭');
        return true;
    }
    
    /**
     * 私有方法：初始化
     */
    _initialize() {
        // 确保日志目录存在
        this._ensureLogDirectory();
        
        // 设置异步日志刷新定时器
        if (this.config.async.enabled) {
            this.flushTimer = setInterval(() => {
                this._flushLogBuffer();
            }, this.config.async.flushIntervalMs);
        }
        
        // 捕获未处理的异常
        process.on('uncaughtException', (error) => {
            this.logTaskFailure('system', error, { event: 'uncaughtException' });
        });
        
        // 监听进程退出
        process.on('exit', () => {
            this._flushLogBuffer();
        });
    }
    
    /**
     * 私有方法：确保日志目录存在
     */
    _ensureLogDirectory() {
        try {
            const logDir = path.dirname(this.config.localLogPath);
            
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
                console.log(`[DeepSeekLogging] 创建日志目录: ${logDir}`);
            }
        } catch (error) {
            console.error(`[DeepSeekLogging] 创建日志目录失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：写入日志
     */
    _writeLog(logEntry) {
        // 更新统计信息
        this._updateStats(logEntry.level);
        
        // 格式化日志
        const formattedLog = this._formatLog(logEntry);
        
        // 如果是同步模式，直接写入
        if (!this.config.async.enabled) {
            this._writeToStorage(formattedLog);
        } else {
            // 异步模式，添加到缓冲区
            this.logBuffer.push(formattedLog);
            
            // 检查是否达到批量大小
            if (this.logBuffer.length >= this.config.async.batchSize) {
                this._flushLogBuffer();
            }
        }
    }
    
    /**
     * 私有方法：格式化日志
     */
    _formatLog(logEntry) {
        if (this.config.format === 'json') {
            return JSON.stringify(logEntry);
        } else {
            // 文本格式
            const timestamp = logEntry.timestamp;
            const level = logEntry.level.toUpperCase().padEnd(5);
            const action = logEntry.action || 'log';
            const message = logEntry.message || '';
            
            return `${timestamp} [${level}] [${action}] ${message}`;
        }
    }
    
    /**
     * 私有方法：写入存储
     */
    _writeToStorage(formattedLog) {
        try {
            // 写入本地文件
            fs.appendFileSync(this.config.localLogPath, formattedLog + '\n');
            
            // 检查是否需要轮转日志
            this._checkLogRotation();
            
            // 同时尝试写入externalMemory
            this._writeToExternalMemory(formattedLog);
            
            // 更新字节统计
            this.stats.bytesWritten += formattedLog.length + 1; // +1 for newline
            
            return true;
        } catch (error) {
            console.error(`[DeepSeekLogging] 写入日志失败: ${error.message}`);
            return false;
        }
    }
    
    /**
     * 私有方法：写入externalMemory
     */
    _writeToExternalMemory(formattedLog) {
        try {
            // 这里模拟与externalMemory的交互
            // 在实际应用中，应该使用真实的externalMemory API
            const namespace = this.config.namespace;
            const keyName = this.config.keyName;
            
            console.log(`[DeepSeekLogging] 写入日志到externalMemory: ${namespace}/${keyName}`);
            
            // 模拟写入成功
            return true;
        } catch (error) {
            console.error(`[DeepSeekLogging] 写入externalMemory失败: ${error.message}`);
            // 失败不影响本地日志写入
            return false;
        }
    }
    
    /**
     * 私有方法：刷新日志缓冲区
     */
    _flushLogBuffer() {
        if (this.logBuffer.length === 0) {
            return;
        }
        
        try {
            // 批量写入本地文件
            const logBatch = this.logBuffer.join('\n') + '\n';
            fs.appendFileSync(this.config.localLogPath, logBatch);
            
            // 更新统计信息
            this.stats.bytesWritten += logBatch.length;
            this.stats.lastFlushTime = Date.now();
            
            console.log(`[DeepSeekLogging] 已刷新 ${this.logBuffer.length} 条日志记录`);
            
            // 清空缓冲区
            this.logBuffer = [];
            
            // 检查日志轮转
            this._checkLogRotation();
            
            return true;
        } catch (error) {
            console.error(`[DeepSeekLogging] 刷新日志缓冲区失败: ${error.message}`);
            return false;
        }
    }
    
    /**
     * 私有方法：检查日志轮转
     */
    _checkLogRotation() {
        if (!this.config.rotation.enabled) {
            return;
        }
        
        try {
            const stats = fs.statSync(this.config.localLogPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB >= this.config.rotation.maxSizeMB) {
                this._rotateLog();
            }
        } catch (error) {
            console.error(`[DeepSeekLogging] 检查日志大小失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：轮转日志
     */
    _rotateLog() {
        try {
            const basePath = this.config.localLogPath;
            
            // 删除最旧的日志文件（如果存在）
            const oldestLogPath = `${basePath}.${this.config.rotation.maxFiles}`;
            if (fs.existsSync(oldestLogPath)) {
                fs.unlinkSync(oldestLogPath);
            }
            
            // 重命名现有的日志文件
            for (let i = this.config.rotation.maxFiles - 1; i >= 1; i--) {
                const sourcePath = `${basePath}.${i}`;
                const targetPath = `${basePath}.${i + 1}`;
                
                if (fs.existsSync(sourcePath)) {
                    fs.renameSync(sourcePath, targetPath);
                }
            }
            
            // 将当前日志文件重命名为.1
            if (fs.existsSync(basePath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedPath = `${basePath}.${timestamp}`;
                fs.renameSync(basePath, rotatedPath);
                
                console.log(`[DeepSeekLogging] 日志已轮转: ${basePath} → ${rotatedPath}`);
            }
            
            // 创建新的空日志文件
            fs.writeFileSync(basePath, '');
            
        } catch (error) {
            console.error(`[DeepSeekLogging] 轮转日志失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：过滤敏感信息
     */
    _filterSensitiveInfo(data) {
        if (!this.config.sensitiveInfoFilter.enabled || !data) {
            return data;
        }
        
        // 对不同类型的数据进行处理
        if (typeof data === 'string') {
            return this._filterString(data);
        } else if (Array.isArray(data)) {
            return data.map(item => this._filterSensitiveInfo(item));
        } else if (typeof data === 'object' && data !== null) {
            const filtered = {};
            for (const [key, value] of Object.entries(data)) {
                // 检查键名是否包含敏感词
                if (this._isSensitiveKey(key)) {
                    filtered[key] = this.config.sensitiveInfoFilter.replacement;
                } else {
                    filtered[key] = this._filterSensitiveInfo(value);
                }
            }
            return filtered;
        }
        
        return data;
    }
    
    /**
     * 私有方法：过滤字符串中的敏感信息
     */
    _filterString(str) {
        let filtered = str;
        
        for (const pattern of this.config.sensitiveInfoFilter.patterns) {
            filtered = filtered.replace(pattern, this.config.sensitiveInfoFilter.replacement);
        }
        
        return filtered;
    }
    
    /**
     * 私有方法：检查键名是否敏感
     */
    _isSensitiveKey(key) {
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential', 'auth'];
        const lowerKey = key.toLowerCase();
        
        return sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));
    }
    
    /**
     * 私有方法：检查是否应该记录该级别的日志
     */
    _shouldLog(level) {
        const levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        const currentLevel = levels[this.config.logLevel] || 2;
        const targetLevel = levels[level] || 2;
        
        return targetLevel <= currentLevel;
    }
    
    /**
     * 私有方法：更新统计信息
     */
    _updateStats(level) {
        this.stats.logCount++;
        
        switch (level) {
            case 'error':
                this.stats.errorCount++;
                break;
            case 'warn':
                this.stats.warnCount++;
                break;
            case 'info':
                this.stats.infoCount++;
                break;
            case 'debug':
                this.stats.debugCount++;
                break;
        }
    }
    
    /**
     * 私有方法：记录性能警告
     */
    _logPerformanceWarning(taskId, executionTimeMs) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'warn',
            action: 'performance_warning',
            taskId: taskId,
            executionTimeMs: executionTimeMs,
            thresholdMs: this.config.performanceTracking.thresholdMs,
            executor: 'DeepSeek'
        };
        
        // 直接写入，不经过缓冲区
        const formattedLog = this._formatLog(logEntry);
        this._writeToStorage(formattedLog);
    }
}

// 创建单例实例
let loggingSystemInstance = null;

function getDeepSeekLoggingSystem(options = {}) {
    if (!loggingSystemInstance) {
        loggingSystemInstance = new DeepSeekLoggingSystem(options);
    }
    return loggingSystemInstance;
}

// 导出模块
module.exports = {
    DeepSeekLoggingSystem,
    getDeepSeekLoggingSystem
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekLogging = {
        DeepSeekLoggingSystem,
        getDeepSeekLoggingSystem
    };
}