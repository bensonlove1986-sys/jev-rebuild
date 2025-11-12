const fs = require('fs').promises;
const path = require('path');

/**
 * 故障保护和停止开关控制器
 * 负责管理系统故障计数、自动锁定和紧急停止功能
 */
class FailSafeController {
  constructor(securityPolicy = {}) {
    // 初始化默认策略配置
    this.securityPolicy = {
      autoLockAfterFailures: 3,
      killSwitch: {
        ctrl_c: true,
        flag_file: "C:\\JEV\\PAUSE.flag"
      },
      ...securityPolicy
    };
    
    // 状态管理
    this.state = {
      failureCount: 0,
      isLocked: false,
      lockReason: null,
      lockTime: null,
      lastFailureTime: null,
      isKillSwitchActive: false
    };
    
    // 停止事件监听器
    this.stopListeners = new Set();
    
    // 初始化停止开关
    this.initKillSwitch();
    
    console.log('[故障保护控制器] 初始化完成');
    console.log(`[故障保护控制器] 自动锁定阈值: ${this.securityPolicy.autoLockAfterFailures} 次失败`);
    console.log(`[故障保护控制器] CTRL+C停止: ${this.securityPolicy.killSwitch.ctrl_c ? '已启用' : '已禁用'}`);
    if (this.securityPolicy.killSwitch.flag_file) {
      console.log(`[故障保护控制器] 标志文件停止: ${this.securityPolicy.killSwitch.flag_file}`);
    }
  }
  
  /**
   * 初始化停止开关
   */
  initKillSwitch() {
    // 设置CTRL+C停止处理
    if (this.securityPolicy.killSwitch.ctrl_c) {
      process.on('SIGINT', () => {
        console.log('\n[故障保护控制器] 检测到CTRL+C信号，触发紧急停止');
        this.activateKillSwitch('CTRL+C触发');
      });
    }
    
    // 设置标志文件监控
    if (this.securityPolicy.killSwitch.flag_file) {
      this.startFlagFileMonitoring();
    }
  }
  
  /**
   * 启动标志文件监控
   */
  startFlagFileMonitoring() {
    const flagFilePath = this.securityPolicy.killSwitch.flag_file;
    let lastCheckTime = Date.now();
    
    // 定期检查标志文件
    this.flagFileInterval = setInterval(async () => {
      try {
        // 检查文件是否存在
        const exists = await this.checkFlagFileExists(flagFilePath);
        
        if (exists && !this.state.isKillSwitchActive) {
          console.log(`[故障保护控制器] 检测到停止标志文件: ${flagFilePath}`);
          this.activateKillSwitch('标志文件触发');
          
          // 可选：检测到后删除标志文件
          try {
            await fs.unlink(flagFilePath);
            console.log(`[故障保护控制器] 已删除停止标志文件: ${flagFilePath}`);
          } catch (err) {
            console.warn(`[故障保护控制器] 无法删除标志文件: ${err.message}`);
          }
        }
        
        lastCheckTime = Date.now();
      } catch (error) {
        console.error(`[故障保护控制器] 标志文件监控错误: ${error.message}`);
      }
    }, 2000); // 每2秒检查一次
    
    console.log(`[故障保护控制器] 标志文件监控已启动`);
  }
  
  /**
   * 检查标志文件是否存在
   * @param {string} flagFilePath - 标志文件路径
   * @returns {Promise<boolean>} - true表示文件存在
   */
  async checkFlagFileExists(flagFilePath) {
    try {
      await fs.access(flagFilePath);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 记录操作失败
   * @param {string} operation - 操作描述
   * @param {Error} error - 错误对象
   * @returns {boolean} - 是否已达到锁定阈值
   */
  recordFailure(operation, error) {
    if (this.state.isLocked) {
      console.warn('[故障保护控制器] 系统已锁定，忽略新的失败记录');
      return true;
    }
    
    // 增加失败计数
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    
    console.error(`[故障保护控制器] 操作失败 #${this.state.failureCount}: ${operation}`);
    console.error(`[故障保护控制器] 错误详情: ${error.message}`);
    
    // 检查是否达到锁定阈值
    if (this.state.failureCount >= this.securityPolicy.autoLockAfterFailures) {
      this.lockSystem(`连续失败 ${this.state.failureCount} 次，超过阈值 ${this.securityPolicy.autoLockAfterFailures}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * 锁定系统
   * @param {string} reason - 锁定原因
   */
  lockSystem(reason) {
    if (this.state.isLocked) {
      console.warn(`[故障保护控制器] 系统已锁定: ${this.state.lockReason}`);
      return;
    }
    
    this.state.isLocked = true;
    this.state.lockReason = reason;
    this.state.lockTime = Date.now();
    
    console.error(`[故障保护控制器] ⚠️  系统已锁定!`);
    console.error(`[故障保护控制器] 锁定原因: ${reason}`);
    console.error(`[故障保护控制器] 锁定时间: ${new Date().toLocaleString()}`);
    
    // 触发锁定事件
    this.notifyListeners('system_locked', {
      reason,
      lockTime: this.state.lockTime,
      failureCount: this.state.failureCount
    });
  }
  
  /**
   * 解锁系统
   * @param {string} reason - 解锁原因
   * @returns {boolean} - 解锁是否成功
   */
  unlockSystem(reason) {
    if (!this.state.isLocked) {
      console.warn('[故障保护控制器] 系统未锁定');
      return false;
    }
    
    this.state.isLocked = false;
    this.state.failureCount = 0;
    
    console.log(`[故障保护控制器] ✅ 系统已解锁`);
    console.log(`[故障保护控制器] 解锁原因: ${reason}`);
    console.log(`[故障保护控制器] 锁定持续时间: ${this.calculateLockDuration()} 秒`);
    
    // 触发解锁事件
    this.notifyListeners('system_unlocked', {
      reason,
      lockDuration: this.calculateLockDuration()
    });
    
    return true;
  }
  
  /**
   * 计算锁定持续时间
   * @returns {number} - 锁定持续时间（秒）
   */
  calculateLockDuration() {
    if (!this.state.lockTime) return 0;
    return Math.round((Date.now() - this.state.lockTime) / 1000);
  }
  
  /**
   * 重置失败计数
   */
  resetFailureCount() {
    const previousCount = this.state.failureCount;
    this.state.failureCount = 0;
    console.log(`[故障保护控制器] 失败计数已重置: ${previousCount} -> 0`);
  }
  
  /**
   * 激活停止开关
   * @param {string} reason - 停止原因
   */
  activateKillSwitch(reason) {
    if (this.state.isKillSwitchActive) {
      console.warn(`[故障保护控制器] 停止开关已激活`);
      return;
    }
    
    this.state.isKillSwitchActive = true;
    
    console.error(`[故障保护控制器] 🚨 紧急停止开关已激活!`);
    console.error(`[故障保护控制器] 停止原因: ${reason}`);
    console.error(`[故障保护控制器] 时间: ${new Date().toLocaleString()}`);
    
    // 触发停止事件
    this.notifyListeners('kill_switch_activated', {
      reason,
      timestamp: Date.now()
    });
    
    // 可选：给系统一些时间来清理资源
    setTimeout(() => {
      console.error(`[故障保护控制器] 系统正在终止...`);
      process.exit(1);
    }, 1000);
  }
  
  /**
   * 注册停止事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} listener - 监听器函数
   */
  on(eventType, listener) {
    const listenerId = `${eventType}_${Date.now()}`;
    const wrappedListener = {
      id: listenerId,
      type: eventType,
      callback: listener
    };
    
    this.stopListeners.add(wrappedListener);
    return listenerId;
  }
  
  /**
   * 移除事件监听器
   * @param {string} listenerId - 监听器ID
   */
  removeListener(listenerId) {
    for (const listener of this.stopListeners) {
      if (listener.id === listenerId) {
        this.stopListeners.delete(listener);
        return true;
      }
    }
    return false;
  }
  
  /**
   * 通知所有监听器
   * @param {string} eventType - 事件类型
   * @param {object} data - 事件数据
   */
  notifyListeners(eventType, data) {
    for (const listener of this.stopListeners) {
      if (listener.type === eventType) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error(`[故障保护控制器] 监听器执行错误: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * 获取系统状态
   * @returns {object} - 当前状态信息
   */
  getStatus() {
    return {
      isLocked: this.state.isLocked,
      lockReason: this.state.lockReason,
      lockTime: this.state.lockTime,
      lockDuration: this.calculateLockDuration(),
      failureCount: this.state.failureCount,
      maxFailures: this.securityPolicy.autoLockAfterFailures,
      lastFailureTime: this.state.lastFailureTime,
      isKillSwitchActive: this.state.isKillSwitchActive,
      killSwitchConfig: this.securityPolicy.killSwitch
    };
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
    
    if (newPolicy.autoLockAfterFailures !== undefined) {
      console.log(`[故障保护控制器] 已更新自动锁定阈值: ${this.securityPolicy.autoLockAfterFailures}`);
    }
    
    if (newPolicy.killSwitch) {
      console.log(`[故障保护控制器] 已更新停止开关配置`);
      
      // 如果启用了标志文件监控且路径有变化，重新启动监控
      if (newPolicy.killSwitch.flag_file && 
          newPolicy.killSwitch.flag_file !== this.securityPolicy.killSwitch.flag_file) {
        if (this.flagFileInterval) {
          clearInterval(this.flagFileInterval);
        }
        this.startFlagFileMonitoring();
      }
    }
  }
  
  /**
   * 清理资源
   */
  cleanup() {
    if (this.flagFileInterval) {
      clearInterval(this.flagFileInterval);
      console.log(`[故障保护控制器] 已停止标志文件监控`);
    }
    
    this.stopListeners.clear();
  }
}

// 创建单例实例
let failSafeControllerInstance = null;

/**
 * 获取故障保护控制器实例
 * @param {object} securityPolicy - 可选的安全策略配置
 * @returns {FailSafeController} - 控制器实例
 */
function getFailSafeController(securityPolicy = {}) {
  if (!failSafeControllerInstance) {
    failSafeControllerInstance = new FailSafeController(securityPolicy);
  }
  return failSafeControllerInstance;
}

// 便捷函数：记录失败
function recordOperationFailure(operation, error) {
  return getFailSafeController().recordFailure(operation, error);
}

// 便捷函数：重置失败计数
function resetFailures() {
  getFailSafeController().resetFailureCount();
}

// 便捷函数：锁定系统
function lockSystem(reason) {
  getFailSafeController().lockSystem(reason);
}

// 便捷函数：解锁系统
function unlockSystem(reason) {
  return getFailSafeController().unlockSystem(reason);
}

// 便捷函数：获取状态
function getFailSafeStatus() {
  return getFailSafeController().getStatus();
}

// 便捷函数：注册事件监听器
function onFailSafeEvent(eventType, listener) {
  return getFailSafeController().on(eventType, listener);
}

// 导出模块
exports.FailSafeController = FailSafeController;
exports.getFailSafeController = getFailSafeController;
exports.recordOperationFailure = recordOperationFailure;
exports.resetFailures = resetFailures;
exports.lockSystem = lockSystem;
exports.unlockSystem = unlockSystem;
exports.getFailSafeStatus = getFailSafeStatus;
exports.onFailSafeEvent = onFailSafeEvent;

// 命令行交互功能
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const controller = getFailSafeController();
  
  // 注册事件监听器示例
  controller.on('system_locked', (data) => {
    console.log('🔒 系统锁定事件:', data.reason);
  });
  
  controller.on('system_unlocked', (data) => {
    console.log('🔓 系统解锁事件:', data.reason);
  });
  
  console.log('===== 故障保护控制器 =====');
  console.log('输入命令: failure <msg> | reset | lock <reason> | unlock <reason> | status | exit');
  
  rl.on('line', (line) => {
    const parts = line.trim().split(' ');
    const command = parts[0];
    
    switch (command) {
      case 'failure':
        const errorMsg = parts.slice(1).join(' ') || '测试失败';
        controller.recordFailure('测试操作', new Error(errorMsg));
        break;
        
      case 'reset':
        controller.resetFailureCount();
        break;
        
      case 'lock':
        const lockReason = parts.slice(1).join(' ') || '手动锁定';
        controller.lockSystem(lockReason);
        break;
        
      case 'unlock':
        const unlockReason = parts.slice(1).join(' ') || '手动解锁';
        controller.unlockSystem(unlockReason);
        break;
        
      case 'status':
        console.log(JSON.stringify(controller.getStatus(), null, 2));
        break;
        
      case 'exit':
        controller.cleanup();
        console.log('退出控制器');
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