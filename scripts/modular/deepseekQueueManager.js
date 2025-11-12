const fs = require('fs');
const path = require('path');
const { getDeepSeekSecurityExecutor } = require('./deepseekSecurityExecutor');
const { getDeepSeekLoggingSystem } = require('./deepseekLoggingSystem');

/**
 * DeepSeek队列管理器
 * 实现暂停状态下的任务队列等待机制
 */
class DeepSeekQueueManager {
    constructor(options = {}) {
        // 获取安全执行器实例
        this.securityExecutor = getDeepSeekSecurityExecutor();
        // 获取日志系统实例
        this.logger = getDeepSeekLoggingSystem();
        
        // 配置
        this.config = {
            // 队列命名空间
            namespace: 'queue_deepseek',
            // 队列本地存储路径
            queueStoragePath: path.resolve('d:\\PDF转网页\\queues\\deepseek_tasks.json'),
            // 检查间隔（毫秒）
            checkIntervalMs: 5000,
            // 最大队列长度
            maxQueueSize: 1000,
            // 任务超时时间（毫秒）
            taskTimeoutMs: 3600000, // 1小时
            // 任务重试配置
            retry: {
                maxAttempts: 3,
                initialDelayMs: 1000,
                maxDelayMs: 60000
            },
            // 自动重放开关
            autoReplayOnResume: true,
            // 重放并发数
            replayConcurrency: 3,
            ...options
        };
        
        // 任务队列
        this.queue = [];
        // 正在执行的任务
        this.activeTasks = new Map();
        // 系统状态
        this.systemState = {
            paused: false,
            replaying: false,
            lastCheckTime: null
        };
        // 统计信息
        this.stats = {
            totalQueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalReplayed: 0,
            queueSize: 0
        };
        
        // 初始化
        this._initialize();
        
        console.log('[DeepSeekQueue] 队列等待机制初始化完成');
        this.logger.info('队列管理器已初始化', { namespace: this.config.namespace });
    }
    
    /**
     * 将任务添加到队列
     */
    enqueueTask(taskData, options = {}) {
        // 检查队列大小限制
        if (this.queue.length >= this.config.maxQueueSize) {
            const errorMsg = `队列已满，当前长度: ${this.queue.length}，超过最大限制: ${this.config.maxQueueSize}`;
            console.error(`[DeepSeekQueue] ${errorMsg}`);
            this.logger.error(errorMsg, { queueSize: this.queue.length, maxSize: this.config.maxQueueSize });
            
            return {
                success: false,
                error: errorMsg,
                code: 'QUEUE_FULL'
            };
        }
        
        // 创建任务对象
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: taskData,
            priority: options.priority || 'normal', // high, normal, low
            createdAt: Date.now(),
            expiryTime: Date.now() + (options.timeoutMs || this.config.taskTimeoutMs),
            attempts: 0,
            status: 'QUEUED',
            metadata: options.metadata || {},
            retryConfig: {
                maxAttempts: options.maxAttempts || this.config.retry.maxAttempts,
                initialDelayMs: options.initialDelayMs || this.config.retry.initialDelayMs,
                maxDelayMs: options.maxDelayMs || this.config.retry.maxDelayMs
            }
        };
        
        // 添加到队列
        this.queue.push(task);
        // 根据优先级排序
        this._sortQueueByPriority();
        
        // 更新统计信息
        this.stats.totalQueued++;
        this.stats.queueSize = this.queue.length;
        
        console.log(`[DeepSeekQueue] 任务已加入队列 - ID: ${task.id}, 优先级: ${task.priority}`);
        this.logger.info('任务已加入队列', { taskId: task.id, priority: task.priority, queueSize: this.queue.length });
        
        // 持久化队列
        this._persistQueue();
        
        return {
            success: true,
            taskId: task.id,
            position: this._getTaskPosition(task.id),
            queueSize: this.queue.length
        };
    }
    
    /**
     * 从队列中移除任务
     */
    dequeueTask(taskId) {
        const taskIndex = this.queue.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            console.warn(`[DeepSeekQueue] 未找到任务: ${taskId}`);
            this.logger.warn('尝试移除不存在的任务', { taskId: taskId });
            
            return {
                success: false,
                error: '任务不存在',
                code: 'TASK_NOT_FOUND'
            };
        }
        
        // 移除任务
        const removedTask = this.queue.splice(taskIndex, 1)[0];
        
        // 更新统计信息
        this.stats.queueSize = this.queue.length;
        
        console.log(`[DeepSeekQueue] 任务已从队列移除 - ID: ${taskId}`);
        this.logger.info('任务已从队列移除', { taskId: taskId, queueSize: this.queue.length });
        
        // 持久化队列
        this._persistQueue();
        
        return {
            success: true,
            task: removedTask,
            queueSize: this.queue.length
        };
    }
    
    /**
     * 获取队列状态
     */
    getQueueStatus() {
        const now = Date.now();
        
        // 计算超时任务数量
        const expiredTasks = this.queue.filter(task => task.expiryTime < now);
        
        // 按优先级分组统计
        const priorityStats = this._getPriorityStats();
        
        return {
            timestamp: new Date().toISOString(),
            queueSize: this.queue.length,
            maxQueueSize: this.config.maxQueueSize,
            activeTasks: this.activeTasks.size,
            expiredTasks: expiredTasks.length,
            priorityBreakdown: priorityStats,
            systemState: this.systemState,
            stats: this.stats
        };
    }
    
    /**
     * 获取任务信息
     */
    getTaskInfo(taskId) {
        const task = this.queue.find(task => task.id === taskId);
        
        if (!task) {
            // 检查是否在活动任务中
            const activeTask = this.activeTasks.get(taskId);
            if (activeTask) {
                return {
                    success: true,
                    task: activeTask,
                    status: 'ACTIVE'
                };
            }
            
            return {
                success: false,
                error: '任务不存在',
                code: 'TASK_NOT_FOUND'
            };
        }
        
        const position = this._getTaskPosition(taskId);
        const timeInQueueMs = Date.now() - task.createdAt;
        const isExpired = task.expiryTime < Date.now();
        
        return {
            success: true,
            task: task,
            position: position,
            timeInQueueMs: timeInQueueMs,
            timeInQueueMinutes: Math.round(timeInQueueMs / 60000),
            isExpired: isExpired,
            queueSize: this.queue.length
        };
    }
    
    /**
     * 清空队列
     */
    clearQueue(options = {}) {
        const taskCount = this.queue.length;
        
        // 可以选择只清空特定状态或优先级的任务
        if (options.filter) {
            const initialLength = this.queue.length;
            
            if (options.filter.status) {
                this.queue = this.queue.filter(task => task.status !== options.filter.status);
            }
            
            if (options.filter.priority) {
                this.queue = this.queue.filter(task => task.priority !== options.filter.priority);
            }
            
            const removedCount = initialLength - this.queue.length;
            this.stats.queueSize = this.queue.length;
            
            console.log(`[DeepSeekQueue] 已过滤 ${removedCount} 个任务`);
            this.logger.info('队列已过滤', { removedCount: removedCount, remainingCount: this.queue.length, filter: options.filter });
        } else {
            // 清空所有任务
            this.queue = [];
            this.stats.queueSize = 0;
            
            console.log(`[DeepSeekQueue] 队列已清空，共 ${taskCount} 个任务`);
            this.logger.info('队列已清空', { clearedCount: taskCount });
        }
        
        // 持久化队列
        this._persistQueue();
        
        return {
            success: true,
            queueSize: this.queue.length,
            clearedCount: taskCount - this.queue.length
        };
    }
    
    /**
     * 手动触发队列重放
     */
    replayQueue(options = {}) {
        if (this.systemState.replaying) {
            console.warn('[DeepSeekQueue] 重放已经在进行中');
            this.logger.warn('队列重放请求被忽略，重放已经在进行中');
            
            return {
                success: false,
                error: '重放已经在进行中',
                code: 'REPLAY_IN_PROGRESS'
            };
        }
        
        // 检查系统是否暂停
        if (this.systemState.paused) {
            console.warn('[DeepSeekQueue] 系统处于暂停状态，无法重放队列');
            this.logger.warn('队列重放请求被忽略，系统处于暂停状态');
            
            return {
                success: false,
                error: '系统处于暂停状态',
                code: 'SYSTEM_PAUSED'
            };
        }
        
        // 开始重放
        this.systemState.replaying = true;
        
        console.log('[DeepSeekQueue] 开始队列重放...');
        this.logger.info('队列重放开始', { queueSize: this.queue.length });
        
        // 异步执行重放
        this._performReplay(options).then(result => {
            this.systemState.replaying = false;
            
            console.log(`[DeepSeekQueue] 队列重放完成 - 成功: ${result.successCount}, 失败: ${result.failedCount}`);
            this.logger.info('队列重放完成', result);
        }).catch(error => {
            this.systemState.replaying = false;
            
            console.error(`[DeepSeekQueue] 队列重放过程出错: ${error.message}`);
            this.logger.error('队列重放失败', { error: error.message });
        });
        
        return {
            success: true,
            message: '队列重放已启动',
            queueSize: this.queue.length
        };
    }
    
    /**
     * 检查并更新系统状态
     */
    updateSystemState() {
        const pausedStatus = this.securityExecutor.checkSystemPaused();
        const previousPausedState = this.systemState.paused;
        
        // 更新系统状态
        this.systemState.paused = pausedStatus;
        this.systemState.lastCheckTime = Date.now();
        
        console.log(`[DeepSeekQueue] 系统状态更新 - 暂停: ${pausedStatus}`);
        
        // 如果状态从暂停变为非暂停，并且启用了自动重放
        if (!pausedStatus && previousPausedState && this.config.autoReplayOnResume) {
            console.log('[DeepSeekQueue] 系统恢复，触发自动队列重放');
            this.logger.info('系统恢复，触发自动队列重放', { queueSize: this.queue.length });
            this.replayQueue({ autoTriggered: true });
        }
        
        return pausedStatus;
    }
    
    /**
     * 设置任务处理器
     */
    setTaskProcessor(processorFunction) {
        if (typeof processorFunction !== 'function') {
            console.error('[DeepSeekQueue] 无效的任务处理器，必须是一个函数');
            return false;
        }
        
        this.taskProcessor = processorFunction;
        console.log('[DeepSeekQueue] 任务处理器已设置');
        return true;
    }
    
    /**
     * 私有方法：初始化
     */
    _initialize() {
        // 确保队列存储目录存在
        this._ensureQueueDirectory();
        
        // 加载持久化的队列
        this._loadQueue();
        
        // 设置状态检查定时器
        this.stateCheckTimer = setInterval(() => {
            this.updateSystemState();
            // 清理过期任务
            this._cleanupExpiredTasks();
        }, this.config.checkIntervalMs);
        
        // 执行初始状态检查
        this.updateSystemState();
    }
    
    /**
     * 私有方法：确保队列目录存在
     */
    _ensureQueueDirectory() {
        try {
            const queueDir = path.dirname(this.config.queueStoragePath);
            
            if (!fs.existsSync(queueDir)) {
                fs.mkdirSync(queueDir, { recursive: true });
                console.log(`[DeepSeekQueue] 创建队列存储目录: ${queueDir}`);
            }
        } catch (error) {
            console.error(`[DeepSeekQueue] 创建队列存储目录失败: ${error.message}`);
            this.logger.error('创建队列存储目录失败', { error: error.message });
        }
    }
    
    /**
     * 私有方法：持久化队列
     */
    _persistQueue() {
        try {
            const queueData = {
                timestamp: Date.now(),
                version: '1.0',
                queue: this.queue,
                stats: this.stats
            };
            
            fs.writeFileSync(this.config.queueStoragePath, JSON.stringify(queueData, null, 2));
            
            console.log(`[DeepSeekQueue] 队列已持久化到 ${this.config.queueStoragePath}`);
        } catch (error) {
            console.error(`[DeepSeekQueue] 持久化队列失败: ${error.message}`);
            this.logger.error('持久化队列失败', { error: error.message });
        }
    }
    
    /**
     * 私有方法：加载队列
     */
    _loadQueue() {
        try {
            if (fs.existsSync(this.config.queueStoragePath)) {
                const queueData = JSON.parse(fs.readFileSync(this.config.queueStoragePath, 'utf8'));
                
                if (queueData.queue && Array.isArray(queueData.queue)) {
                    this.queue = queueData.queue;
                    this.stats = queueData.stats || this.stats;
                    this.stats.queueSize = this.queue.length;
                    
                    console.log(`[DeepSeekQueue] 已从 ${this.config.queueStoragePath} 加载队列，共 ${this.queue.length} 个任务`);
                    this.logger.info('队列已加载', { taskCount: this.queue.length });
                    
                    // 清理过期任务
                    this._cleanupExpiredTasks();
                }
            }
        } catch (error) {
            console.error(`[DeepSeekQueue] 加载队列失败: ${error.message}`);
            this.logger.error('加载队列失败', { error: error.message });
            // 继续使用空队列
            this.queue = [];
        }
    }
    
    /**
     * 私有方法：按优先级排序队列
     */
    _sortQueueByPriority() {
        const priorityOrder = {
            high: 0,
            normal: 1,
            low: 2
        };
        
        this.queue.sort((a, b) => {
            // 首先按优先级排序
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            
            // 优先级相同时按创建时间排序（FIFO）
            return a.createdAt - b.createdAt;
        });
    }
    
    /**
     * 私有方法：获取任务在队列中的位置
     */
    _getTaskPosition(taskId) {
        const index = this.queue.findIndex(task => task.id === taskId);
        return index !== -1 ? index + 1 : null; // 位置从1开始计数
    }
    
    /**
     * 私有方法：获取优先级统计信息
     */
    _getPriorityStats() {
        const stats = {
            high: 0,
            normal: 0,
            low: 0
        };
        
        this.queue.forEach(task => {
            if (stats.hasOwnProperty(task.priority)) {
                stats[task.priority]++;
            }
        });
        
        return stats;
    }
    
    /**
     * 私有方法：清理过期任务
     */
    _cleanupExpiredTasks() {
        const now = Date.now();
        const initialLength = this.queue.length;
        
        // 过滤出未过期的任务
        this.queue = this.queue.filter(task => {
            if (task.expiryTime < now) {
                console.warn(`[DeepSeekQueue] 任务已过期并移除 - ID: ${task.id}`);
                this.logger.warn('任务已过期并移除', { taskId: task.id });
                this.stats.totalFailed++;
                return false;
            }
            return true;
        });
        
        const expiredCount = initialLength - this.queue.length;
        
        if (expiredCount > 0) {
            this.stats.queueSize = this.queue.length;
            console.log(`[DeepSeekQueue] 已清理 ${expiredCount} 个过期任务`);
            this.logger.info('过期任务已清理', { expiredCount: expiredCount, remainingCount: this.queue.length });
            
            // 持久化更新后的队列
            this._persistQueue();
        }
    }
    
    /**
     * 私有方法：执行队列重放
     */
    async _performReplay(options = {}) {
        const result = {
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            totalCount: 0
        };
        
        // 创建一个队列副本以避免在迭代过程中修改队列
        const replayQueue = [...this.queue];
        result.totalCount = replayQueue.length;
        
        console.log(`[DeepSeekQueue] 开始处理 ${replayQueue.length} 个队列任务`);
        
        // 使用并发控制执行任务
        const activeTasks = new Set();
        const taskPromises = [];
        
        for (const task of replayQueue) {
            // 等待直到并发数低于限制
            while (activeTasks.size >= this.config.replayConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 如果系统重新进入暂停状态，停止重放
            if (this.systemState.paused) {
                console.warn('[DeepSeekQueue] 系统重新进入暂停状态，停止队列重放');
                this.logger.warn('系统重新进入暂停状态，停止队列重放');
                break;
            }
            
            // 执行任务
            const taskPromise = this._executeTask(task).then(taskResult => {
                activeTasks.delete(task.id);
                
                if (taskResult.success) {
                    result.successCount++;
                    // 从队列中移除成功的任务
                    this.dequeueTask(task.id);
                    this.stats.totalProcessed++;
                    this.stats.totalReplayed++;
                } else {
                    result.failedCount++;
                    this.stats.totalFailed++;
                    
                    // 更新任务状态
                    const queueTask = this.queue.find(t => t.id === task.id);
                    if (queueTask) {
                        queueTask.attempts = task.attempts;
                        queueTask.status = 'FAILED';
                    }
                }
                
                return taskResult;
            }).catch(error => {
                activeTasks.delete(task.id);
                result.failedCount++;
                this.stats.totalFailed++;
                
                console.error(`[DeepSeekQueue] 执行任务时发生未捕获错误: ${error.message}`);
                this.logger.error('任务执行时发生未捕获错误', { taskId: task.id, error: error.message });
                
                return { success: false, error: error.message };
            });
            
            activeTasks.add(task.id);
            taskPromises.push(taskPromise);
        }
        
        // 等待所有任务完成
        await Promise.all(taskPromises);
        
        // 计算跳过的任务数
        result.skippedCount = result.totalCount - result.successCount - result.failedCount;
        
        console.log(`[DeepSeekQueue] 队列重放结果 - 成功: ${result.successCount}, 失败: ${result.failedCount}, 跳过: ${result.skippedCount}`);
        
        return result;
    }
    
    /**
     * 私有方法：执行单个任务
     */
    async _executeTask(task) {
        // 检查任务是否已过期
        if (task.expiryTime < Date.now()) {
            console.warn(`[DeepSeekQueue] 跳过过期任务 - ID: ${task.id}`);
            return { success: false, error: '任务已过期', code: 'TASK_EXPIRED' };
        }
        
        // 增加尝试次数
        task.attempts++;
        task.status = 'PROCESSING';
        
        // 记录任务开始执行
        console.log(`[DeepSeekQueue] 开始执行任务 - ID: ${task.id}, 尝试次数: ${task.attempts}`);
        this.logger.info('开始执行队列任务', { taskId: task.id, attempts: task.attempts, priority: task.priority });
        
        // 记录开始时间
        const startTime = Date.now();
        
        try {
            // 检查是否有自定义的任务处理器
            if (!this.taskProcessor) {
                throw new Error('未设置任务处理器');
            }
            
            // 执行任务
            const result = await this.taskProcessor(task);
            
            // 记录执行时间
            const executionTimeMs = Date.now() - startTime;
            
            console.log(`[DeepSeekQueue] 任务执行成功 - ID: ${task.id}, 耗时: ${executionTimeMs}ms`);
            this.logger.info('队列任务执行成功', { 
                taskId: task.id, 
                executionTimeMs: executionTimeMs,
                attempts: task.attempts 
            });
            
            return {
                success: true,
                result: result,
                executionTimeMs: executionTimeMs
            };
        } catch (error) {
            // 记录错误
            const executionTimeMs = Date.now() - startTime;
            
            console.error(`[DeepSeekQueue] 任务执行失败 - ID: ${task.id}, 错误: ${error.message}`);
            this.logger.error('队列任务执行失败', { 
                taskId: task.id, 
                error: error.message, 
                attempts: task.attempts,
                executionTimeMs: executionTimeMs
            });
            
            // 检查是否需要重试
            if (task.attempts < task.retryConfig.maxAttempts) {
                // 计算重试延迟（指数退避）
                const delayMs = Math.min(
                    task.retryConfig.initialDelayMs * Math.pow(2, task.attempts - 1),
                    task.retryConfig.maxDelayMs
                );
                
                console.log(`[DeepSeekQueue] 任务将在 ${delayMs}ms 后重试 - ID: ${task.id}`);
                
                return {
                    success: false,
                    error: error.message,
                    willRetry: true,
                    retryAfterMs: delayMs,
                    remainingAttempts: task.retryConfig.maxAttempts - task.attempts
                };
            } else {
                // 已达到最大重试次数
                console.error(`[DeepSeekQueue] 任务已达到最大重试次数 - ID: ${task.id}`);
                
                return {
                    success: false,
                    error: error.message,
                    willRetry: false,
                    maxAttemptsReached: true
                };
            }
        }
    }
    
    /**
     * 关闭队列管理器
     */
    shutdown() {
        console.log('[DeepSeekQueue] 关闭队列管理器...');
        
        // 清除定时器
        if (this.stateCheckTimer) {
            clearInterval(this.stateCheckTimer);
        }
        
        // 持久化当前队列状态
        this._persistQueue();
        
        console.log('[DeepSeekQueue] 队列管理器已关闭');
        this.logger.info('队列管理器已关闭', { finalQueueSize: this.queue.length });
        
        return true;
    }
}

// 创建单例实例
let queueManagerInstance = null;

function getDeepSeekQueueManager(options = {}) {
    if (!queueManagerInstance) {
        queueManagerInstance = new DeepSeekQueueManager(options);
    }
    return queueManagerInstance;
}

// 导出模块
module.exports = {
    DeepSeekQueueManager,
    getDeepSeekQueueManager
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekQueue = {
        DeepSeekQueueManager,
        getDeepSeekQueueManager
    };
}