const path = require('path');
const fs = require('fs');
const { getDeepSeekSecurityExecutor } = require('./deepseekSecurityExecutor');

/**
 * DeepSeek路径限制和运行时控制模块
 * 实现路径安全检查和运行时超时控制
 */
class DeepSeekPathRuntimeControl {
    constructor(options = {}) {
        // 获取安全执行器实例
        this.securityExecutor = getDeepSeekSecurityExecutor();
        
        // 配置
        this.config = {
            // 默认受限路径
            restrictedPaths: [
                '/system', '/secure', '/private',
                'C:\\Windows\\', 'C:\\System32\\', 
                'C:\\Program Files\\', 'C:\\ProgramData\\'
            ],
            // 默认允许的路径模式
            allowedPathPatterns: [
                '/app/', '/data/', '/temp/', '/tmp/',
                'D:\\PDF转网页\\'
            ],
            // 最大运行时间（分钟）
            maxRuntimeMinutes: 30,
            // 运行时检查间隔（秒）
            runtimeCheckInterval: 5,
            // 文件操作限制
            maxFileSizeMB: 100,
            maxFileOperations: 1000,
            ...options
        };
        
        // 运行时任务跟踪
        this.activeTasks = new Map();
        // 文件操作计数器
        this.fileOperationCounter = 0;
        
        console.log('[DeepSeekPathRuntime] 路径和运行时控制模块初始化完成');
    }
    
    /**
     * 增强的路径安全检查
     */
    enhancePathSecurityCheck(filePath) {
        // 标准化路径
        const normalizedPath = this._normalizePath(filePath);
        console.log(`[DeepSeekPathRuntime] 检查路径: ${normalizedPath}`);
        
        // 1. 检查路径是否为空或无效
        if (!filePath || typeof filePath !== 'string') {
            return { safe: false, reason: '无效的路径参数' };
        }
        
        // 2. 检查是否包含路径遍历攻击
        if (this._containsPathTraversal(normalizedPath)) {
            return { safe: false, reason: '检测到路径遍历攻击模式' };
        }
        
        // 3. 检查是否在受限路径列表中
        if (this._isInRestrictedPath(normalizedPath)) {
            return { safe: false, reason: '路径在受限列表中' };
        }
        
        // 4. 检查是否在允许的路径模式中
        if (!this._matchesAllowedPattern(normalizedPath)) {
            return { safe: false, reason: '路径不在允许的模式中' };
        }
        
        // 5. 检查文件是否存在（如果是读操作）
        try {
            if (fs.existsSync(normalizedPath)) {
                // 检查文件大小
                const stats = fs.statSync(normalizedPath);
                if (stats.isFile()) {
                    const fileSizeMB = stats.size / (1024 * 1024);
                    if (fileSizeMB > this.config.maxFileSizeMB) {
                        return { 
                            safe: false, 
                            reason: `文件大小 (${fileSizeMB.toFixed(2)}MB) 超过限制 (${this.config.maxFileSizeMB}MB)` 
                        };
                    }
                }
            }
        } catch (error) {
            // 文件不存在或无法访问，这不影响路径检查
            console.warn(`[DeepSeekPathRuntime] 文件检查错误: ${error.message}`);
        }
        
        // 6. 检查文件操作计数
        if (!this._checkFileOperationLimit()) {
            return { safe: false, reason: '文件操作次数超过限制' };
        }
        
        return { 
            safe: true, 
            reason: '路径检查通过',
            normalizedPath: normalizedPath
        };
    }
    
    /**
     * 启动运行时控制
     */
    startRuntimeControl(taskId, options = {}) {
        // 生成唯一的任务ID
        const runtimeTaskId = taskId || `runtime_${Date.now()}`;
        
        // 设置任务开始时间
        const startTime = Date.now();
        const maxRuntimeMs = (options.maxRuntimeMinutes || this.config.maxRuntimeMinutes) * 60 * 1000;
        
        // 创建任务记录
        const task = {
            id: runtimeTaskId,
            startTime,
            maxRuntimeMs,
            expiryTime: startTime + maxRuntimeMs,
            status: 'RUNNING',
            operation: options.operation || 'unknown',
            resourcePath: options.path || null,
            interruptHandler: null
        };
        
        // 添加到活动任务
        this.activeTasks.set(runtimeTaskId, task);
        
        // 设置超时检查间隔
        const checkInterval = setInterval(() => {
            this._checkTaskTimeout(runtimeTaskId);
        }, this.config.runtimeCheckInterval * 1000);
        
        // 存储定时器引用
        task.checkInterval = checkInterval;
        
        console.log(`[DeepSeekPathRuntime] 启动运行时控制 - 任务ID: ${runtimeTaskId}`);
        console.log(`[DeepSeekPathRuntime] 最大运行时间: ${maxRuntimeMs / 60000} 分钟`);
        
        return runtimeTaskId;
    }
    
    /**
     * 停止运行时控制
     */
    stopRuntimeControl(taskId) {
        const task = this.activeTasks.get(taskId);
        
        if (!task) {
            console.warn(`[DeepSeekPathRuntime] 未找到任务: ${taskId}`);
            return false;
        }
        
        // 清除定时器
        if (task.checkInterval) {
            clearInterval(task.checkInterval);
        }
        
        // 更新任务状态
        task.status = 'COMPLETED';
        task.endTime = Date.now();
        task.runtimeMs = task.endTime - task.startTime;
        
        // 从活动任务中移除
        this.activeTasks.delete(taskId);
        
        console.log(`[DeepSeekPathRuntime] 停止运行时控制 - 任务ID: ${taskId}`);
        console.log(`[DeepSeekPathRuntime] 实际运行时间: ${task.runtimeMs / 1000} 秒`);
        
        return true;
    }
    
    /**
     * 设置任务中断处理程序
     */
    setInterruptHandler(taskId, handler) {
        const task = this.activeTasks.get(taskId);
        
        if (!task) {
            console.warn(`[DeepSeekPathRuntime] 未找到任务: ${taskId}`);
            return false;
        }
        
        if (typeof handler === 'function') {
            task.interruptHandler = handler;
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取任务运行时信息
     */
    getTaskRuntimeInfo(taskId) {
        const task = this.activeTasks.get(taskId);
        
        if (!task) {
            return null;
        }
        
        const currentTime = Date.now();
        const elapsedMs = currentTime - task.startTime;
        const remainingMs = Math.max(0, task.expiryTime - currentTime);
        const progressPercent = Math.min(100, (elapsedMs / task.maxRuntimeMs) * 100);
        
        return {
            taskId: task.id,
            status: task.status,
            startTime: new Date(task.startTime).toISOString(),
            elapsedSeconds: Math.floor(elapsedMs / 1000),
            remainingSeconds: Math.floor(remainingMs / 1000),
            progressPercent: progressPercent.toFixed(2),
            operation: task.operation,
            resourcePath: task.resourcePath
        };
    }
    
    /**
     * 获取所有活动任务
     */
    getActiveTasks() {
        const tasks = [];
        
        for (const [taskId, task] of this.activeTasks.entries()) {
            tasks.push(this.getTaskRuntimeInfo(taskId));
        }
        
        return tasks;
    }
    
    /**
     * 设置受限路径列表
     */
    setRestrictedPaths(paths) {
        if (Array.isArray(paths)) {
            this.config.restrictedPaths = paths;
            console.log(`[DeepSeekPathRuntime] 更新受限路径列表，当前有 ${paths.length} 个受限路径`);
            return true;
        }
        return false;
    }
    
    /**
     * 添加允许的路径模式
     */
    addAllowedPathPattern(pattern) {
        if (typeof pattern === 'string' && !this.config.allowedPathPatterns.includes(pattern)) {
            this.config.allowedPathPatterns.push(pattern);
            console.log(`[DeepSeekPathRuntime] 添加允许的路径模式: ${pattern}`);
            return true;
        }
        return false;
    }
    
    /**
     * 私有方法：标准化路径
     */
    _normalizePath(filePath) {
        // 处理不同操作系统的路径分隔符
        let normalized = filePath.replace(/\\/g, '/');
        // 规范化路径
        normalized = path.normalize(normalized);
        // 转换为小写以进行大小写不敏感的比较
        return normalized.toLowerCase();
    }
    
    /**
     * 私有方法：检查是否包含路径遍历攻击
     */
    _containsPathTraversal(normalizedPath) {
        // 检查常见的路径遍历模式
        const traversalPatterns = [
            '../', '..\\', '/../', '\\..\\',
            '%2e%2e%2f', '%2e%2e/', '..%2f',
            '....//', '....\\', '..\\', '..\\'
        ];
        
        return traversalPatterns.some(pattern => 
            normalizedPath.includes(this._normalizePath(pattern))
        );
    }
    
    /**
     * 私有方法：检查路径是否在受限列表中
     */
    _isInRestrictedPath(normalizedPath) {
        return this.config.restrictedPaths.some(restrictedPath => {
            const normalizedRestricted = this._normalizePath(restrictedPath);
            return normalizedPath.startsWith(normalizedRestricted);
        });
    }
    
    /**
     * 私有方法：检查路径是否匹配允许的模式
     */
    _matchesAllowedPattern(normalizedPath) {
        // 如果允许的路径模式为空，则默认为允许
        if (this.config.allowedPathPatterns.length === 0) {
            return true;
        }
        
        return this.config.allowedPathPatterns.some(pattern => {
            const normalizedPattern = this._normalizePath(pattern);
            return normalizedPath.includes(normalizedPattern);
        });
    }
    
    /**
     * 私有方法：检查文件操作限制
     */
    _checkFileOperationLimit() {
        this.fileOperationCounter++;
        
        if (this.fileOperationCounter > this.config.maxFileOperations) {
            console.warn(`[DeepSeekPathRuntime] 文件操作次数 (${this.fileOperationCounter}) 超过限制 (${this.config.maxFileOperations})`);
            return false;
        }
        
        // 每100次操作输出一次日志
        if (this.fileOperationCounter % 100 === 0) {
            console.log(`[DeepSeekPathRuntime] 文件操作计数: ${this.fileOperationCounter}`);
        }
        
        return true;
    }
    
    /**
     * 私有方法：检查任务超时
     */
    _checkTaskTimeout(taskId) {
        const task = this.activeTasks.get(taskId);
        
        if (!task) {
            return;
        }
        
        const currentTime = Date.now();
        
        // 检查是否超时
        if (currentTime > task.expiryTime) {
            console.warn(`[DeepSeekPathRuntime] 任务超时 - 任务ID: ${taskId}`);
            console.warn(`[DeepSeekPathRuntime] 运行时间: ${(currentTime - task.startTime) / 1000} 秒，超过最大限制`);
            
            // 更新任务状态
            task.status = 'TIMED_OUT';
            task.endTime = currentTime;
            task.runtimeMs = currentTime - task.startTime;
            
            // 执行中断处理程序
            if (task.interruptHandler) {
                try {
                    task.interruptHandler({
                        reason: 'timeout',
                        message: `任务运行时间超过最大限制 (${task.maxRuntimeMs / 60000} 分钟)`,
                        taskId: task.id
                    });
                } catch (error) {
                    console.error(`[DeepSeekPathRuntime] 中断处理程序执行失败: ${error.message}`);
                }
            }
            
            // 记录安全日志
            this.securityExecutor.recordFailure(new Error(`任务超时: ${taskId}`));
            
            // 从活动任务中移除
            if (task.checkInterval) {
                clearInterval(task.checkInterval);
            }
            this.activeTasks.delete(taskId);
        } else {
            // 检查是否接近超时（剩余时间少于10%）
            const remainingMs = task.expiryTime - currentTime;
            const remainingPercent = (remainingMs / task.maxRuntimeMs) * 100;
            
            if (remainingPercent < 10 && !task.warningIssued) {
                console.warn(`[DeepSeekPathRuntime] 任务即将超时 - 任务ID: ${taskId}，剩余时间: ${remainingMs / 1000} 秒`);
                task.warningIssued = true;
            }
        }
    }
    
    /**
     * 重置文件操作计数器
     */
    resetFileOperationCounter() {
        this.fileOperationCounter = 0;
        console.log(`[DeepSeekPathRuntime] 文件操作计数器已重置`);
    }
    
    /**
     * 清理所有运行中的任务
     */
    cleanupAllTasks() {
        for (const [taskId, task] of this.activeTasks.entries()) {
            if (task.checkInterval) {
                clearInterval(task.checkInterval);
            }
        }
        
        const taskCount = this.activeTasks.size;
        this.activeTasks.clear();
        
        console.log(`[DeepSeekPathRuntime] 已清理所有 ${taskCount} 个活动任务`);
        return taskCount;
    }
}

// 创建单例实例
let pathRuntimeControlInstance = null;

function getDeepSeekPathRuntimeControl(options = {}) {
    if (!pathRuntimeControlInstance) {
        pathRuntimeControlInstance = new DeepSeekPathRuntimeControl(options);
    }
    return pathRuntimeControlInstance;
}

// 导出模块
module.exports = {
    DeepSeekPathRuntimeControl,
    getDeepSeekPathRuntimeControl
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekPathRuntime = {
        DeepSeekPathRuntimeControl,
        getDeepSeekPathRuntimeControl
    };
}