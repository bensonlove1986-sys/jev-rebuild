/**
 * 高级安全策略实现 - 基于[SOP_POLICY_SCHEMA]
 * 实现完整的系统安全控制机制
 */

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// 导入外部依赖
let ExternalMemory;
try {
  const memoryModule = require('./externalMemory.js');
  ExternalMemory = memoryModule.ExternalMemory || memoryModule.default;
} catch (error) {
  console.warn('高级安全策略: 无法加载ExternalMemory，使用模拟实现');
  // 模拟ExternalMemory实现
  const _testMemoryStore = {};
  ExternalMemory = {
    set: async (key, value) => { _testMemoryStore[key] = value; return { success: true }; },
    get: async (key) => _testMemoryStore[key] || null,
    del: async (key) => { delete _testMemoryStore[key]; return { success: true }; }
  };
}

/**
 * 高级安全策略类
 */
class AdvancedSecurityPolicy {
  constructor() {
    // 默认安全策略配置
    this.policy = {
      paused: false,
      confirmBeforeExecute: true,
      tokenWhitelist: ['TREA_MAIN', 'WORKER_OP'],
      allowedActions: ['open', 'move', 'click', 'type', 'capture', 'read', 'write'],
      restrictedPaths: ['C:\\Windows', 'C:\\Users\\*\\AppData', '/etc', '/var'],
      maxRuntimeMinutes: 5,
      autoLockAfterFailures: 3,
      killSwitch: {
        ctrl_c: true,
        flag_file: 'C:\\JEV\\PAUSE.flag'
      },
      logging: {
        operator_ns: 'operator_log',
        desktop_ns: 'desktop_log',
        security_ns: 'security'
      },
      queueOnPause: true,
      dryRunSupported: true
    };
    
    // 内部状态
    this.waitQueue = [];
    this.failureCount = 0;
    this.startTime = Date.now();
    this.isLocked = false;
    this.logHistory = [];
  }

  /**
   * 从externalMemory加载安全策略
   */
  async loadPolicy() {
    try {
      const memory = ExternalMemory;
      const storedPolicy = await memory.get('security:security_policy');
      
      if (storedPolicy && typeof storedPolicy === 'object') {
        // 合并存储的策略与默认策略
        this.policy = { ...this.policy, ...storedPolicy };
        console.log('✅ 安全策略已从externalMemory加载');
      } else {
        // 首次使用，保存默认策略
        await this.savePolicy();
        console.log('✅ 默认安全策略已保存到externalMemory');
      }
      
      return this.policy;
    } catch (error) {
      console.error('❌ 加载安全策略失败:', error.message);
      return this.policy; // 返回默认策略
    }
  }

  /**
   * 保存安全策略到externalMemory
   */
  async savePolicy() {
    try {
      const memory = ExternalMemory;
      await memory.set('security:security_policy', this.policy);
      console.log('✅ 安全策略已保存到externalMemory');
      return true;
    } catch (error) {
      console.error('❌ 保存安全策略失败:', error.message);
      return false;
    }
  }

  /**
   * 设置系统暂停状态
   */
  async setPaused(paused) {
    try {
      this.policy.paused = Boolean(paused);
      await this.savePolicy();
      
      // 检查是否需要创建/删除暂停标志文件
      if (this.policy.killSwitch && this.policy.killSwitch.flag_file) {
        if (paused) {
          // 创建暂停标志文件
          try {
            // 确保目录存在
            const flagDir = path.dirname(this.policy.killSwitch.flag_file);
            if (!fs.existsSync(flagDir)) {
              fs.mkdirSync(flagDir, { recursive: true });
            }
            fs.writeFileSync(this.policy.killSwitch.flag_file, Date.now().toString());
          } catch (err) {
            console.warn('⚠️ 无法创建暂停标志文件:', err.message);
          }
        } else {
          // 删除暂停标志文件
          try {
            if (fs.existsSync(this.policy.killSwitch.flag_file)) {
              fs.unlinkSync(this.policy.killSwitch.flag_file);
            }
          } catch (err) {
            console.warn('⚠️ 无法删除暂停标志文件:', err.message);
          }
        }
      }
      
      return this.policy.paused;
    } catch (error) {
      console.error('❌ 设置暂停状态失败:', error.message);
      return this.policy.paused;
    }
  }

  /**
   * 检查是否允许执行操作
   */
  async checkOperationAllowed(action, options = {}) {
    // 检查系统锁定状态
    if (this.isLocked) {
      return { allowed: false, reason: 'system_locked', message: '系统已锁定，请检查故障' };
    }

    // 检查暂停状态
    if (this.policy.paused) {
      if (this.policy.queueOnPause) {
        // 添加到等待队列
        this.waitQueue.push({ action, options, timestamp: Date.now() });
        return { allowed: false, reason: 'system_paused_queued', message: '操作已加入等待队列' };
      }
      return { allowed: false, reason: 'system_paused', message: '系统已暂停' };
    }

    // 检查令牌白名单
    if (options.token && this.policy.tokenWhitelist) {
      if (!this.policy.tokenWhitelist.includes(options.token)) {
        this.incrementFailureCount();
        return { allowed: false, reason: 'token_not_whitelisted', message: '令牌不在白名单中' };
      }
    }

    // 检查允许的操作
    if (this.policy.allowedActions && !this.policy.allowedActions.includes(action)) {
      this.incrementFailureCount();
      return { allowed: false, reason: 'action_not_allowed', message: `操作 "${action}" 不被允许` };
    }

    // 检查路径限制
    if (options.path && this.policy.restrictedPaths) {
      const normalizedPath = path.normalize(options.path).toLowerCase();
      for (const restrictedPath of this.policy.restrictedPaths) {
        const normalizedRestricted = path.normalize(restrictedPath).toLowerCase();
        // 处理通配符路径
        if (normalizedRestricted.includes('*')) {
          const regexPattern = normalizedRestricted
            .replace(/\\/g, '\\\\')
            .replace(/\*/g, '.*');
          const regex = new RegExp(`^${regexPattern}`);
          if (regex.test(normalizedPath)) {
            this.incrementFailureCount();
            return { allowed: false, reason: 'path_restricted', message: '路径被限制' };
          }
        } else if (normalizedPath.startsWith(normalizedRestricted)) {
          this.incrementFailureCount();
          return { allowed: false, reason: 'path_restricted', message: '路径被限制' };
        }
      }
    }

    // 检查运行时间限制
    if (this.policy.maxRuntimeMinutes && this.policy.maxRuntimeMinutes > 0) {
      const runtimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
      if (runtimeMinutes > this.policy.maxRuntimeMinutes) {
        await this.lockSystem('运行时间超出限制');
        return { allowed: false, reason: 'runtime_exceeded', message: '运行时间超出限制' };
      }
    }

    // 检查停止开关标志文件
    if (this.policy.killSwitch && this.policy.killSwitch.flag_file) {
      try {
        if (fs.existsSync(this.policy.killSwitch.flag_file)) {
          await this.setPaused(true);
          return { allowed: false, reason: 'kill_switch_activated', message: '停止开关已激活' };
        }
      } catch (err) {
        console.warn('⚠️ 检查停止开关文件时出错:', err.message);
      }
    }

    // 如果需要确认，返回需要确认的状态
    if (this.policy.confirmBeforeExecute && !options.skipConfirmation) {
      return { allowed: false, reason: 'confirmation_required', message: '需要执行确认' };
    }

    // 操作允许
    return { allowed: true, reason: 'operation_allowed', message: '操作允许' };
  }

  /**
   * 执行确认操作
   */
  confirmOperation(action, options = {}) {
    options.skipConfirmation = true;
    return this.checkOperationAllowed(action, options);
  }

  /**
   * 增加失败计数
   */
  incrementFailureCount() {
    this.failureCount++;
    
    // 检查是否需要锁定系统
    if (this.policy.autoLockAfterFailures && 
        this.failureCount >= this.policy.autoLockAfterFailures) {
      this.lockSystem('连续失败次数过多');
    }
    
    return this.failureCount;
  }

  /**
   * 锁定系统
   */
  async lockSystem(reason) {
    this.isLocked = true;
    await this.log('security', 'system_locked', { reason, failureCount: this.failureCount });
    console.error(`🔒 系统已锁定: ${reason}`);
    return this.isLocked;
  }

  /**
   * 解锁系统
   */
  async unlockSystem() {
    this.isLocked = false;
    this.failureCount = 0;
    await this.log('security', 'system_unlocked', {});
    console.log('🔓 系统已解锁');
    return this.isLocked;
  }

  /**
   * 执行等待队列中的操作
   */
  async processWaitQueue() {
    if (this.policy.paused) {
      console.warn('⚠️ 系统处于暂停状态，无法处理等待队列');
      return { processed: 0, remaining: this.waitQueue.length };
    }

    let processedCount = 0;
    const currentQueue = [...this.waitQueue];
    this.waitQueue = [];

    for (const item of currentQueue) {
      const { allowed, reason } = await this.checkOperationAllowed(item.action, item.options);
      if (allowed) {
        processedCount++;
        await this.log('operator', 'queue_operation_executed', {
          action: item.action,
          options: item.options,
          queuedTime: Date.now() - item.timestamp
        });
      } else {
        // 重新加入队列
        this.waitQueue.push(item);
      }
    }

    return { 
      processed: processedCount, 
      remaining: this.waitQueue.length 
    };
  }

  /**
   * 记录日志到对应的命名空间
   */
  async log(namespace, event, data = {}) {
    try {
      const logEntry = {
        timestamp: Date.now(),
        event,
        data,
        namespace
      };
      
      // 存储到日志历史
      this.logHistory.push(logEntry);
      if (this.logHistory.length > 1000) { // 限制历史记录大小
        this.logHistory.shift();
      }

      // 尝试写入externalMemory
      try {
        const memory = ExternalMemory;
        const nsKey = this.getNamespaceKey(namespace);
        if (nsKey) {
          // 使用简单的日志存储策略
          const logKey = `${nsKey}:${Date.now()}`;
          await memory.set(logKey, logEntry);
        }
      } catch (err) {
        console.warn('⚠️ 写入日志到externalMemory失败:', err.message);
      }

      return true;
    } catch (error) {
      console.error('❌ 记录日志失败:', error.message);
      return false;
    }
  }

  /**
   * 获取命名空间对应的键名
   */
  getNamespaceKey(namespace) {
    if (!this.policy.logging) return null;
    
    switch (namespace) {
      case 'operator':
        return this.policy.logging.operator_ns || 'operator_log';
      case 'desktop':
        return this.policy.logging.desktop_ns || 'desktop_log';
      case 'security':
        return this.policy.logging.security_ns || 'security';
      default:
        return 'general_log';
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    const runtimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
    
    return {
      policy: { ...this.policy }, // 返回策略副本
      system: {
        paused: this.policy.paused,
        locked: this.isLocked,
        failureCount: this.failureCount,
        waitQueueLength: this.waitQueue.length,
        runtimeMinutes: runtimeMinutes.toFixed(2),
        startTime: this.startTime,
        killSwitchActive: this.policy.killSwitch && 
                         this.policy.killSwitch.flag_file && 
                         fs.existsSync(this.policy.killSwitch.flag_file)
      }
    };
  }

  /**
   * 执行模拟操作（用于测试）
   */
  async dryRun(action, options = {}) {
    if (!this.policy.dryRunSupported) {
      return { supported: false, message: '模拟运行不被支持' };
    }

    const checkResult = await this.checkOperationAllowed(action, options);
    return {
      supported: true,
      allowed: checkResult.allowed,
      reason: checkResult.reason,
      message: checkResult.message,
      action,
      options,
      timestamp: Date.now()
    };
  }
}

// 创建单例实例
const securityPolicy = new AdvancedSecurityPolicy();

// 导出模块
module.exports = {
  AdvancedSecurityPolicy,
  securityPolicy,
  // 便捷函数
  pauseSystem: async () => securityPolicy.setPaused(true),
  resumeSystem: async () => securityPolicy.setPaused(false),
  checkSystemStatus: () => securityPolicy.getSystemStatus(),
  processWaitQueue: () => securityPolicy.processWaitQueue(),
  checkOperation: (action, options) => securityPolicy.checkOperationAllowed(action, options),
  confirmOperation: (action, options) => securityPolicy.confirmOperation(action, options),
  unlockSystem: () => securityPolicy.unlockSystem()
};

// 如果直接运行，执行初始化
if (require.main === module) {
  (async () => {
    console.log('🔐 高级安全策略模块初始化...');
    await securityPolicy.loadPolicy();
    console.log('✅ 初始化完成，安全策略已就绪');
    console.log('📊 当前状态:', securityPolicy.getSystemStatus());
  })();
}