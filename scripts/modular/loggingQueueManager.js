const fs = require('fs').promises;
const path = require('path');

/**
 * 日志和等待队列管理器
 * 负责系统日志记录和暂停时的操作队列管理
 */
class LoggingQueueManager {
  constructor(securityPolicy = {}) {
    // 初始化默认策略配置
    this.securityPolicy = {
      logging: {
        operator_ns: "operator_log",
        desktop_ns: "desktop_log",
        security_ns: "security"
      },
      queueOnPause: true,
      dryRunSupported: true,
      ...securityPolicy
    };
    
    // 状态管理
    this.state = {
      isPaused: false,
      operationQueue: [],
      logHistory: [],
      logFilePaths: {},
      maxLogHistory: 1000
    };
    
    // 初始化日志系统
    this.initLogging();
    
    console.log('[日志队列管理器] 初始化完成');
    console.log(`[日志队列管理器] 日志命名空间: ${JSON.stringify(this.securityPolicy.logging)}`);
    console.log(`[日志队列管理器] 暂停时队列处理: ${this.securityPolicy.queueOnPause ? '已启用' : '已禁用'}`);
    console.log(`[日志队列管理器] 支持模拟运行: ${this.securityPolicy.dryRunSupported ? '是' : '否'}`);
  }
  
  /**
   * 初始化日志系统
   */
  initLogging() {
    // 创建日志目录
    const logDir = path.join(__dirname, '..', 'logs');
    
    // 为每个命名空间设置日志文件路径
    Object.entries(this.securityPolicy.logging).forEach(([key, namespace]) => {
      this.state.logFilePaths[key] = path.join(logDir, `${namespace}.log`);
    });
    
    // 确保日志目录存在
    this.ensureLogDirectoryExists(logDir);
  }
  
  /**
   * 确保日志目录存在
   * @param {string} logDir - 日志目录路径
   */
  async ensureLogDirectoryExists(logDir) {
    try {
      await fs.mkdir(logDir, { recursive: true });
      console.log(`[日志队列管理器] 日志目录已准备: ${logDir}`);
    } catch (error) {
      console.error(`[日志队列管理器] 创建日志目录失败: ${error.message}`);
    }
  }
  
  /**
   * 记录日志到指定命名空间
   * @param {string} namespaceType - 命名空间类型 (operator/desktop/security)
   * @param {string} level - 日志级别 (info/warn/error/debug)
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   */
  async log(namespaceType, level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    // 将日志添加到历史记录
    this.state.logHistory.push(logEntry);
    
    // 限制历史记录大小
    if (this.state.logHistory.length > this.state.maxLogHistory) {
      this.state.logHistory.shift();
    }
    
    // 格式化日志输出
    const formattedLog = this.formatLogEntry(logEntry);
    console.log(`[${namespaceType.toUpperCase()}] ${formattedLog}`);
    
    // 写入日志文件
    try {
      const logFilePath = this.state.logFilePaths[namespaceType];
      if (logFilePath) {
        await fs.appendFile(logFilePath, formattedLog + '\n');
      }
    } catch (error) {
      console.error(`[日志队列管理器] 写入日志失败: ${error.message}`);
    }
    
    return logEntry;
  }
  
  /**
   * 格式化日志条目
   * @param {object} logEntry - 日志条目对象
   * @returns {string} - 格式化的日志字符串
   */
  formatLogEntry(logEntry) {
    const { timestamp, level, message, data } = logEntry;
    let dataStr = '';
    
    if (Object.keys(data).length > 0) {
      try {
        dataStr = ' ' + JSON.stringify(data);
      } catch (e) {
        dataStr = ' [数据序列化失败]';
      }
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }
  
  /**
   * 记录操作日志
   * @param {string} operation - 操作描述
   * @param {string} status - 操作状态 (pending/completed/failed)
   * @param {object} metadata - 操作元数据
   */
  async logOperation(operation, status, metadata = {}) {
    return this.log('operator_ns', 'info', `${operation} - ${status}`, metadata);
  }
  
  /**
   * 记录桌面操作日志
   * @param {string} action - 桌面动作
   * @param {string} target - 目标元素
   * @param {object} details - 详细信息
   */
  async logDesktopAction(action, target, details = {}) {
    return this.log('desktop_ns', 'info', `${action} ${target}`, details);
  }
  
  /**
   * 记录安全事件日志
   * @param {string} event - 安全事件
   * @param {string} severity - 严重程度 (low/medium/high/critical)
   * @param {object} details - 详细信息
   */
  async logSecurityEvent(event, severity, details = {}) {
    const level = severity === 'critical' ? 'error' : 
                 severity === 'high' ? 'error' : 
                 severity === 'medium' ? 'warn' : 'info';
    
    return this.log('security_ns', level, `${event} (${severity})`, details);
  }
  
  /**
   * 设置系统暂停状态
   * @param {boolean} isPaused - 是否暂停
   */
  setPaused(isPaused) {
    const previousState = this.state.isPaused;
    this.state.isPaused = isPaused;
    
    console.log(`[日志队列管理器] 系统${isPaused ? '已暂停' : '已恢复'}`);
    
    // 如果从暂停状态恢复，处理队列中的操作
    if (!isPaused && previousState && this.securityPolicy.queueOnPause) {
      console.log(`[日志队列管理器] 开始处理队列中的 ${this.state.operationQueue.length} 个操作`);
      this.processQueuedOperations();
    }
    
    // 记录状态变更
    this.logSecurityEvent('system_state_change', 'medium', {
      previous_state: previousState ? 'paused' : 'active',
      current_state: isPaused ? 'paused' : 'active'
    });
  }
  
  /**
   * 尝试执行操作，根据暂停状态决定执行或排队
   * @param {Function} operationFn - 要执行的操作函数
   * @param {string} operationId - 操作ID
   * @param {object} operationData - 操作数据
   * @returns {Promise} - 操作结果
   */
  async executeOrQueue(operationFn, operationId, operationData = {}) {
    // 检查是否为模拟运行
    const isDryRun = operationData.dryRun && this.securityPolicy.dryRunSupported;
    
    // 如果系统暂停且启用了队列功能，则将操作加入队列
    if (this.state.isPaused && this.securityPolicy.queueOnPause && !isDryRun) {
      const queuedOperation = {
        id: operationId,
        operationFn,
        data: operationData,
        queuedAt: Date.now()
      };
      
      this.state.operationQueue.push(queuedOperation);
      console.log(`[日志队列管理器] 操作已加入队列: ${operationId} (队列长度: ${this.state.operationQueue.length})`);
      
      // 记录队列事件
      await this.logSecurityEvent('operation_queued', 'info', {
        operation_id: operationId,
        queue_position: this.state.operationQueue.length,
        operation_data: operationData
      });
      
      return {
        queued: true,
        queuePosition: this.state.operationQueue.length,
        operationId
      };
    }
    
    // 直接执行操作
    return this.executeOperation(operationFn, operationId, operationData, isDryRun);
  }
  
  /**
   * 执行操作
   * @param {Function} operationFn - 操作函数
   * @param {string} operationId - 操作ID
   * @param {object} operationData - 操作数据
   * @param {boolean} isDryRun - 是否为模拟运行
   * @returns {Promise} - 操作结果
   */
  async executeOperation(operationFn, operationId, operationData, isDryRun = false) {
    const startTime = Date.now();
    
    try {
      await this.logOperation(operationId, 'pending', {
        data: operationData,
        dry_run: isDryRun
      });
      
      let result;
      if (isDryRun) {
        console.log(`[日志队列管理器] 模拟执行: ${operationId}`, operationData);
        result = { dryRun: true, success: true, message: '模拟执行成功' };
      } else {
        // 执行实际操作
        result = await operationFn(operationData);
      }
      
      const duration = Date.now() - startTime;
      
      await this.logOperation(operationId, 'completed', {
        result,
        duration_ms: duration,
        dry_run: isDryRun
      });
      
      return {
        executed: true,
        success: true,
        result,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logOperation(operationId, 'failed', {
        error: error.message,
        stack: error.stack,
        duration_ms: duration,
        dry_run: isDryRun
      });
      
      return {
        executed: true,
        success: false,
        error: error.message,
        duration
      };
    }
  }
  
  /**
   * 处理队列中的操作
   */
  async processQueuedOperations() {
    // 处理队列中的所有操作
    while (this.state.operationQueue.length > 0 && !this.state.isPaused) {
      const queuedOperation = this.state.operationQueue.shift();
      const waitTime = Date.now() - queuedOperation.queuedAt;
      
      console.log(`[日志队列管理器] 处理队列操作: ${queuedOperation.id} (等待时间: ${Math.round(waitTime/1000)}秒)`);
      
      // 更新操作数据，添加等待信息
      queuedOperation.data.queueWaitTime = waitTime;
      queuedOperation.data.queuedAt = queuedOperation.queuedAt;
      
      // 执行操作
      await this.executeOperation(
        queuedOperation.operationFn,
        queuedOperation.id,
        queuedOperation.data
      );
      
      // 避免操作过于密集
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[日志队列管理器] 队列处理完成`);
  }
  
  /**
   * 获取队列状态
   * @returns {object} - 队列状态信息
   */
  getQueueStatus() {
    const now = Date.now();
    const queueStats = {
      length: this.state.operationQueue.length,
      operations: this.state.operationQueue.map(op => ({
        id: op.id,
        waitTime: Math.round((now - op.queuedAt) / 1000),
        queuedAt: op.queuedAt
      })),
      isProcessing: this.state.isProcessingQueue || false
    };
    
    return queueStats;
  }
  
  /**
   * 获取日志历史
   * @param {number} limit - 返回的日志数量限制
   * @param {string} level - 日志级别过滤
   * @returns {Array} - 日志条目数组
   */
  getLogHistory(limit = 100, level = null) {
    let logs = [...this.state.logHistory];
    
    // 按级别过滤
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    // 返回最新的日志
    return logs.slice(-limit);
  }
  
  /**
   * 清空操作队列
   * @param {string} reason - 清空原因
   */
  clearOperationQueue(reason = '手动清空') {
    const queueLength = this.state.operationQueue.length;
    this.state.operationQueue = [];
    
    console.log(`[日志队列管理器] 已清空操作队列: ${queueLength} 个操作被移除`);
    
    // 记录清空事件
    this.logSecurityEvent('queue_cleared', 'medium', {
      removed_operations: queueLength,
      reason
    });
  }
  
  /**
   * 更新策略配置
   * @param {object} newPolicy - 新的策略配置
   */
  updatePolicy(newPolicy) {
    this.securityPolicy = {
      ...this.securityPolicy,
      ...newPolicy
    };
    
    if (newPolicy.logging) {
      console.log(`[日志队列管理器] 已更新日志配置`);
      // 重新初始化日志系统
      this.initLogging();
    }
    
    if (newPolicy.queueOnPause !== undefined) {
      console.log(`[日志队列管理器] 已更新队列配置: ${newPolicy.queueOnPause ? '启用' : '禁用'}`);
    }
  }
  
  /**
   * 生成系统状态报告
   * @returns {object} - 系统状态报告
   */
  generateStatusReport() {
    return {
      paused: this.state.isPaused,
      queueEnabled: this.securityPolicy.queueOnPause,
      dryRunSupported: this.securityPolicy.dryRunSupported,
      queueStatus: this.getQueueStatus(),
      logNamespaces: this.securityPolicy.logging,
      logHistoryCount: this.state.logHistory.length
    };
  }
}

// 创建单例实例
let loggingQueueManagerInstance = null;

/**
 * 获取日志队列管理器实例
 * @param {object} securityPolicy - 可选的安全策略配置
 * @returns {LoggingQueueManager} - 管理器实例
 */
function getLoggingQueueManager(securityPolicy = {}) {
  if (!loggingQueueManagerInstance) {
    loggingQueueManagerInstance = new LoggingQueueManager(securityPolicy);
  }
  return loggingQueueManagerInstance;
}

// 便捷函数：记录日志
async function logMessage(namespace, level, message, data = {}) {
  return getLoggingQueueManager().log(namespace, level, message, data);
}

// 便捷函数：记录操作
async function logOperation(operation, status, metadata = {}) {
  return getLoggingQueueManager().logOperation(operation, status, metadata);
}

// 便捷函数：执行或排队操作
async function executeOrQueueOperation(operationFn, operationId, operationData = {}) {
  return getLoggingQueueManager().executeOrQueue(operationFn, operationId, operationData);
}

// 便捷函数：设置暂停状态
function setSystemPaused(isPaused) {
  getLoggingQueueManager().setPaused(isPaused);
}

// 便捷函数：获取队列状态
function getQueueStatus() {
  return getLoggingQueueManager().getQueueStatus();
}

// 导出模块
exports.LoggingQueueManager = LoggingQueueManager;
exports.getLoggingQueueManager = getLoggingQueueManager;
exports.logMessage = logMessage;
exports.logOperation = logOperation;
exports.executeOrQueueOperation = executeOrQueueOperation;
exports.setSystemPaused = setSystemPaused;
exports.getQueueStatus = getQueueStatus;

// 命令行交互功能
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const manager = getLoggingQueueManager();
  
  console.log('===== 日志和队列管理器 =====');
  console.log('输入命令: pause | resume | queue <opId> | status | clear | log <ns> <level> <msg> | exit');
  
  // 模拟操作函数
  const mockOperation = async (data) => {
    console.log(`执行操作: ${JSON.stringify(data)}`);
    return { success: true, result: '操作完成' };
  };
  
  rl.on('line', async (line) => {
    const parts = line.trim().split(' ');
    const command = parts[0];
    
    switch (command) {
      case 'pause':
        manager.setPaused(true);
        console.log('系统已暂停，新操作将加入队列');
        break;
        
      case 'resume':
        manager.setPaused(false);
        console.log('系统已恢复，开始处理队列');
        break;
        
      case 'queue':
        if (parts.length > 1) {
          const opId = parts[1];
          const result = await manager.executeOrQueue(mockOperation, opId, { test: true });
          console.log(`操作结果: ${JSON.stringify(result)}`);
        } else {
          console.log('请提供操作ID');
        }
        break;
        
      case 'status':
        console.log(JSON.stringify(manager.generateStatusReport(), null, 2));
        break;
        
      case 'clear':
        manager.clearOperationQueue();
        break;
        
      case 'log':
        if (parts.length > 3) {
          const [ns, level, ...msgParts] = parts.slice(1);
          const message = msgParts.join(' ');
          await manager.log(ns, level, message);
          console.log(`日志已记录: ${ns} ${level}`);
        } else {
          console.log('请提供完整参数: log <ns> <level> <message>');
        }
        break;
        
      case 'exit':
        console.log('退出管理器');
        rl.close();
        break;
        
      default:
        console.log('未知命令');
    }
  });
  
  rl.on('close', () => {
    process.exit(0);
  });
}