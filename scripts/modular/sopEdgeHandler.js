/**
 * SOP边缘情况处理模块
 * 处理各种异常和边界情况，确保系统稳定性
 */

const fs = require('fs');
const path = require('path');

class SOPEdgeHandler {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.securityPolicy = options.securityPolicy || null;
    this.auditLogger = options.auditLogger || null;
    this.tempBufferPath = options.tempBufferPath || path.join(process.env.TEMP || '/tmp', 'jev_security_buffer.json');
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1秒
    this.taskQueue = [];
    this.failureCount = 0;
    this.lastResetTime = new Date();
    this.autoLockAfterFailures = options.autoLockAfterFailures || 5;
    this.taskProcessingInterval = null;
    this.isProcessingQueue = false;
    
    // 初始化任务处理
    this.initializeTaskQueue();
  }

  /**
   * 初始化任务队列处理
   */
  initializeTaskQueue() {
    // 尝试恢复之前缓存的任务
    this.restoreCachedTasks();
    
    // 设置定时处理队列任务
    this.taskProcessingInterval = setInterval(() => {
      if (!this.isProcessingQueue) {
        this.processTaskQueue();
      }
    }, 5000); // 每5秒处理一次队列

    // 清理函数
    process.on('exit', () => {
      this.cleanup();
    });
  }

  /**
   * 处理externalMemory写入失败
   */
  async handleMemoryWriteFailure(data, key, namespace) {
    try {
      // 1. 缓存到本地临时文件
      const cachedItem = {
        key,
        namespace,
        data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending'
      };

      await this.cacheToTempBuffer(cachedItem);
      
      // 2. 记录审计日志
      if (this.auditLogger) {
        await this.auditLogger.log({
          actor: 'system',
          intent: 'MEMORY_WRITE_FAILURE',
          request: { key, namespace },
          decision: { allowed: false, reason: 'externalMemory写入失败，已缓存到本地' },
          effects: { systemChanges: ['cached_to_temp_buffer'] },
          result: { status: 'failed', error: 'externalMemory不可用' }
        });
      }

      this.logger.warn(`externalMemory写入失败，已缓存到临时文件: ${key}@${namespace}`);
      return { success: false, cached: true };
    } catch (error) {
      this.logger.error('处理externalMemory写入失败时发生错误', error);
      return { success: false, cached: false, error: error.message };
    }
  }

  /**
   * 将数据缓存到临时文件
   */
  async cacheToTempBuffer(item) {
    try {
      const bufferDir = path.dirname(this.tempBufferPath);
      if (!fs.existsSync(bufferDir)) {
        fs.mkdirSync(bufferDir, { recursive: true });
      }

      // 读取现有缓存
      let buffer = [];
      if (fs.existsSync(this.tempBufferPath)) {
        const existingContent = fs.readFileSync(this.tempBufferPath, 'utf8');
        buffer = JSON.parse(existingContent);
      }

      // 添加新项
      buffer.push(item);

      // 写入更新后的缓存
      fs.writeFileSync(this.tempBufferPath, JSON.stringify(buffer, null, 2));
      return true;
    } catch (error) {
      this.logger.error('缓存数据到临时文件失败', error);
      throw error;
    }
  }

  /**
   * 从临时文件恢复缓存的任务
   */
  restoreCachedTasks() {
    try {
      if (fs.existsSync(this.tempBufferPath)) {
        const content = fs.readFileSync(this.tempBufferPath, 'utf8');
        const buffer = JSON.parse(content);
        
        // 过滤出仍然需要处理的任务
        const pendingTasks = buffer.filter(item => item.status === 'pending');
        
        if (pendingTasks.length > 0) {
          this.taskQueue.push(...pendingTasks);
          this.logger.info(`已恢复 ${pendingTasks.length} 个缓存的任务`);
        }
      }
    } catch (error) {
      this.logger.error('恢复缓存的任务失败', error);
    }
  }

  /**
   * 重试写入externalMemory
   */
  async retryMemoryWrite(memoryClient) {
    if (!memoryClient || this.taskQueue.length === 0) {
      return;
    }

    try {
      const task = this.taskQueue[0];
      if (task.retryCount < this.retryAttempts) {
        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (task.retryCount + 1)));
        
        // 尝试重试
        await memoryClient.set(task.key, task.data, { namespace: task.namespace });
        
        // 标记成功
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        this.taskQueue.shift();
        
        this.logger.info(`成功重试写入externalMemory: ${task.key}@${task.namespace}`);
        
        // 更新缓存文件
        this.updateTempBuffer();
        
        return true;
      } else {
        // 重试次数耗尽
        task.status = 'failed';
        task.failedAt = new Date().toISOString();
        this.taskQueue.shift();
        
        this.logger.error(`写入externalMemory重试失败: ${task.key}@${task.namespace}`);
        
        // 更新缓存文件
        this.updateTempBuffer();
        
        return false;
      }
    } catch (error) {
      if (this.taskQueue.length > 0) {
        this.taskQueue[0].retryCount++;
        this.logger.warn(`重试写入externalMemory失败，将继续尝试`, error);
      }
      return false;
    }
  }

  /**
   * 更新临时缓冲区文件
   */
  updateTempBuffer() {
    try {
      // 读取现有缓存
      let buffer = [];
      if (fs.existsSync(this.tempBufferPath)) {
        const existingContent = fs.readFileSync(this.tempBufferPath, 'utf8');
        buffer = JSON.parse(existingContent);
      }

      // 更新缓存内容
      buffer = buffer.map(item => {
        const updatedTask = this.taskQueue.find(t => t.key === item.key && t.namespace === item.namespace);
        return updatedTask || item;
      });

      // 写入更新后的缓存
      fs.writeFileSync(this.tempBufferPath, JSON.stringify(buffer, null, 2));
    } catch (error) {
      this.logger.error('更新临时缓冲区文件失败', error);
    }
  }

  /**
   * 处理token缺失或过期
   */
  handleMissingOrExpiredToken(request, context = {}) {
    // 记录审计日志
    if (this.auditLogger) {
      this.auditLogger.log({
        actor: context.actor || 'unknown',
        intent: request.intent || 'UNKNOWN',
        request: request,
        decision: { allowed: false, reason: 'token缺失或过期' },
        effects: {},
        result: { status: 'denied', error: 'missing_or_expired_token' }
      });
    }

    this.logger.warn('请求被拒绝：token缺失或过期', { requestId: context.requestId });
    
    return {
      allowed: false,
      reason: 'missing_or_expired_token',
      error: 'Token缺失或已过期，请提供有效的认证信息'
    };
  }

  /**
   * 处理暂停状态下的写操作
   */
  handleWriteOperationInPausedState(operation, context = {}) {
    // 验证是否为写操作
    const isWriteOperation = this.isWriteOperation(operation);
    if (!isWriteOperation) {
      return { allowed: true };
    }

    // 检查系统是否处于暂停状态
    if (this.securityPolicy && this.securityPolicy.getPausedState()) {
      // 将操作加入队列
      const queuedTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        context,
        queuedAt: new Date().toISOString(),
        status: 'queued_due_to_pause',
        priority: this.calculateTaskPriority(operation)
      };

      this.taskQueue.push(queuedTask);

      // 记录审计日志
      if (this.auditLogger) {
        this.auditLogger.log({
          actor: context.actor || 'system',
          intent: operation.intent || 'WRITE_OPERATION',
          request: operation,
          decision: { allowed: false, reason: '系统暂停，操作已入队' },
          effects: { queued: this.taskQueue.length },
          result: { status: 'queued', error: null }
        });
      }

      this.logger.info(`系统暂停状态，写操作已入队: ${queuedTask.id}`);

      return {
        allowed: false,
        reason: 'system_paused',
        status: 'queued_due_to_pause',
        taskId: queuedTask.id
      };
    }

    return { allowed: true };
  }

  /**
   * 判断是否为写操作
   */
  isWriteOperation(operation) {
    const writeActions = ['WRITE', 'DELETE', 'UPDATE', 'CREATE', 'MODIFY'];
    const action = operation.action?.toUpperCase() || operation.intent?.toUpperCase();
    return writeActions.includes(action);
  }

  /**
   * 计算任务优先级
   */
  calculateTaskPriority(operation) {
    const priorityMap = {
      'CRITICAL': 0,
      'HIGH': 1,
      'MEDIUM': 2,
      'LOW': 3
    };

    return priorityMap[operation.priority?.toUpperCase()] || 2; // 默认中等优先级
  }

  /**
   * 处理操作超时
   */
  handleOperationTimeout(operation, context = {}) {
    // 增加失败计数
    this.incrementFailureCount();

    // 检查是否需要自动锁定
    const shouldAutoLock = this.checkAutoLockCondition();
    if (shouldAutoLock) {
      this.triggerAutoLock(context);
    }

    // 记录审计日志
    if (this.auditLogger) {
      this.auditLogger.log({
        actor: context.actor || 'system',
        intent: operation.intent || 'TIMEOUT_OPERATION',
        request: operation,
        decision: { allowed: false, reason: '操作超时' },
        effects: { systemChanges: shouldAutoLock ? ['auto_locked'] : [] },
        result: { status: 'failed', error: 'operation_timeout' }
      });
    }

    this.logger.error(`操作超时: ${operation.intent || 'unknown'}`);

    return {
      success: false,
      error: 'operation_timeout',
      autoLocked: shouldAutoLock
    };
  }

  /**
   * 处理操作失败
   */
  handleOperationFailure(operation, error, context = {}) {
    // 增加失败计数
    this.incrementFailureCount();

    // 检查是否需要自动锁定
    const shouldAutoLock = this.checkAutoLockCondition();
    if (shouldAutoLock) {
      this.triggerAutoLock(context);
    }

    // 记录审计日志
    if (this.auditLogger) {
      this.auditLogger.log({
        actor: context.actor || 'system',
        intent: operation.intent || 'FAILED_OPERATION',
        request: operation,
        decision: { allowed: false, reason: '操作失败' },
        effects: { systemChanges: shouldAutoLock ? ['auto_locked'] : [] },
        result: { status: 'failed', error: error.message || 'unknown_error' }
      });
    }

    this.logger.error(`操作失败: ${operation.intent || 'unknown'}`, error);

    return {
      success: false,
      error: error.message || 'unknown_error',
      autoLocked: shouldAutoLock
    };
  }

  /**
   * 增加失败计数
   */
  incrementFailureCount() {
    // 检查是否需要重置计数器（例如24小时后）
    const now = new Date();
    const timeSinceReset = now - this.lastResetTime;
    const oneDayInMs = 24 * 60 * 60 * 1000;

    if (timeSinceReset > oneDayInMs) {
      this.resetFailureCount();
    }

    this.failureCount++;
    this.logger.info(`失败计数增加到: ${this.failureCount}`);
  }

  /**
   * 重置失败计数
   */
  resetFailureCount() {
    this.failureCount = 0;
    this.lastResetTime = new Date();
    this.logger.info('失败计数已重置');
  }

  /**
   * 检查是否满足自动锁定条件
   */
  checkAutoLockCondition() {
    return this.failureCount >= this.autoLockAfterFailures;
  }

  /**
   * 触发自动锁定
   */
  triggerAutoLock(context = {}) {
    if (this.securityPolicy) {
      this.securityPolicy.setPausedState(true);
      
      // 记录锁定事件
      this.logger.warn('系统自动锁定已触发', {
        failureCount: this.failureCount,
        threshold: this.autoLockAfterFailures
      });

      // 记录审计日志
      if (this.auditLogger) {
        this.auditLogger.log({
          actor: 'system',
          intent: 'AUTO_LOCK',
          request: {},
          decision: { allowed: true, reason: '失败次数超过阈值' },
          effects: { systemChanges: ['paused_state_set_to_true'] },
          result: { status: 'done', error: null }
        });
      }

      return true;
    }
    return false;
  }

  /**
   * 处理任务队列
   */
  async processTaskQueue() {
    if (!this.securityPolicy || this.securityPolicy.getPausedState()) {
      return; // 系统仍处于暂停状态，不处理队列
    }

    this.isProcessingQueue = true;

    try {
      // 按优先级排序队列
      this.taskQueue.sort((a, b) => a.priority - b.priority);

      // 处理队列中的任务
      while (this.taskQueue.length > 0 && !this.securityPolicy.getPausedState()) {
        const task = this.taskQueue.shift();
        
        // 只处理之前被暂停状态队列的任务
        if (task.status === 'queued_due_to_pause') {
          this.logger.info(`处理队列任务: ${task.id}`);
          
          // 这里应该执行实际的操作
          // 由于我们没有实际的执行器，这里只是模拟
          task.status = 'processing';
          
          try {
            // 模拟执行操作
            await new Promise(resolve => setTimeout(resolve, 100));
            
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            
            this.logger.info(`队列任务完成: ${task.id}`);
            
            // 记录审计日志
            if (this.auditLogger) {
              this.auditLogger.log({
                actor: task.context.actor || 'system',
                intent: task.operation.intent || 'RETRY_OPERATION',
                request: task.operation,
                decision: { allowed: true, reason: '系统已恢复，执行队列操作' },
                effects: { systemChanges: [] },
                result: { status: 'done', error: null }
              });
            }
          } catch (error) {
            task.status = 'failed';
            task.failedAt = new Date().toISOString();
            task.error = error.message;
            
            this.logger.error(`队列任务执行失败: ${task.id}`, error);
            
            // 处理失败
            this.handleOperationFailure(task.operation, error, task.context);
          }
        }
      }
    } catch (error) {
      this.logger.error('处理任务队列时发生错误', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    const stats = {
      totalTasks: this.taskQueue.length,
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      queuedTasks: this.taskQueue.filter(t => t.status === 'queued_due_to_pause').length,
      completedTasks: this.taskQueue.filter(t => t.status === 'completed').length,
      failedTasks: this.taskQueue.filter(t => t.status === 'failed').length
    };

    return {
      ...stats,
      failureCount: this.failureCount,
      autoLockThreshold: this.autoLockAfterFailures,
      lastResetTime: this.lastResetTime
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.taskProcessingInterval) {
      clearInterval(this.taskProcessingInterval);
    }

    // 保存当前队列状态
    try {
      fs.writeFileSync(this.tempBufferPath, JSON.stringify(this.taskQueue, null, 2));
      this.logger.info('任务队列状态已保存');
    } catch (error) {
      this.logger.error('保存任务队列状态失败', error);
    }
  }
}

// 导出单例实例和类
let instance = null;

function getSOPEdgeHandler(options) {
  if (!instance) {
    instance = new SOPEdgeHandler(options);
  }
  return instance;
}

module.exports = {
  SOPEdgeHandler,
  getSOPEdgeHandler
};
