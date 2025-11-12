/**
 * SOP终止开关(KILL_SWITCH)模块
 * 实现系统紧急中断和恢复机制
 */

const fs = require('fs');
const path = require('path');

class SOPKillSwitch {
  constructor(options = {}) {
    this.flagPath = options.flagPath || 'C:\\JEV\\PAUSE.flag';
    this.externalMemory = options.externalMemory || null;
    this.securityPolicy = options.securityPolicy || null;
    this.logger = options.logger || console;
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.monitorFrequency = options.monitorFrequency || 1000; // 1秒检查一次
  }

  /**
   * 初始化终止开关
   */
  initialize() {
    try {
      // 确保JEV目录存在
      const jevDir = path.dirname(this.flagPath);
      if (!fs.existsSync(jevDir)) {
        fs.mkdirSync(jevDir, { recursive: true });
        this.logger.info(`已创建JEV目录: ${jevDir}`);
      }

      // 注册ConsoleBreak事件处理（Windows平台）
      if (process.platform === 'win32') {
        process.on('SIGINT', (signal) => {
          this.logger.info('检测到Ctrl+C中断信号');
          this.triggerEmergencyStop('ConsoleBreak');
        });
      } else {
        // Unix/Linux平台
        process.on('SIGINT', () => {
          this.logger.info('检测到SIGINT信号');
          this.triggerEmergencyStop('SIGINT');
        });
      }

      this.logger.info('SOP终止开关初始化完成');
      return true;
    } catch (error) {
      this.logger.error('SOP终止开关初始化失败', error);
      return false;
    }
  }

  /**
   * 触发紧急停止
   */
  async triggerEmergencyStop(reason = 'manual') {
    try {
      this.logger.warn(`=== 紧急停止触发 === 原因: ${reason}`);

      // 1. 创建暂停标志文件
      fs.writeFileSync(this.flagPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        reason,
        pid: process.pid
      }));
      this.logger.info(`已创建暂停标志文件: ${this.flagPath}`);

      // 2. 更新externalMemory记录
      if (this.externalMemory) {
        try {
          await this.externalMemory.set(
            'last_interrupt',
            {
              timestamp: new Date().toISOString(),
              reason,
              pid: process.pid
            },
            { namespace: 'security' }
          );
          this.logger.info('已在externalMemory中记录中断信息');
        } catch (memError) {
          this.logger.error('写入externalMemory失败', memError);
          // 即使externalMemory失败，也要继续执行其他操作
        }
      }

      // 3. 更新安全策略状态为暂停
      if (this.securityPolicy) {
        this.securityPolicy.setPaused(true);
        this.logger.info('安全策略已设置为暂停状态');
      }

      return {
        success: true,
        flagCreated: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('触发紧急停止失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查是否存在暂停标志
   */
  hasPauseFlag() {
    try {
      return fs.existsSync(this.flagPath);
    } catch (error) {
      this.logger.error('检查暂停标志失败', error);
      return false;
    }
  }

  /**
   * 获取暂停标志信息
   */
  getPauseFlagInfo() {
    try {
      if (this.hasPauseFlag()) {
        const content = fs.readFileSync(this.flagPath, 'utf8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      this.logger.error('读取暂停标志信息失败', error);
      return null;
    }
  }

  /**
   * 恢复系统运行
   */
  async resumeSystem() {
    try {
      this.logger.info('开始恢复系统运行...');
      let flagDeleted = false;

      // 1. 删除暂停标志文件
      if (this.hasPauseFlag()) {
        fs.unlinkSync(this.flagPath);
        flagDeleted = true;
        this.logger.info(`已删除暂停标志文件: ${this.flagPath}`);
      }

      // 2. 更新安全策略状态为恢复
      if (this.securityPolicy) {
        this.securityPolicy.setPaused(false);
        this.securityPolicy.resetFailures();
        this.logger.info('安全策略已恢复运行状态');
      }

      // 3. 记录恢复信息到externalMemory
      if (this.externalMemory) {
        try {
          await this.externalMemory.set(
            'last_resume',
            {
              timestamp: new Date().toISOString(),
              pid: process.pid
            },
            { namespace: 'security' }
          );
          this.logger.info('已在externalMemory中记录恢复信息');
        } catch (memError) {
          this.logger.error('写入恢复信息到externalMemory失败', memError);
        }
      }

      return {
        success: true,
        flagDeleted,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('恢复系统运行失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 开始监控暂停标志
   */
  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('监控已经在运行中');
      return false;
    }

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.checkPauseFlag();
    }, this.monitorFrequency);

    this.logger.info(`已启动暂停标志监控，频率: ${this.monitorFrequency}ms`);
    return true;
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      this.logger.warn('没有正在运行的监控');
      return false;
    }

    clearInterval(this.monitorInterval);
    this.isMonitoring = false;
    this.monitorInterval = null;
    
    this.logger.info('已停止暂停标志监控');
    return true;
  }

  /**
   * 检查暂停标志并更新安全策略
   */
  checkPauseFlag() {
    try {
      const hasFlag = this.hasPauseFlag();
      
      if (this.securityPolicy) {
        // 如果有标志但策略不是暂停状态，则更新为暂停
        if (hasFlag && !this.securityPolicy.policy.paused) {
          const flagInfo = this.getPauseFlagInfo();
          this.logger.warn(`检测到暂停标志，系统将暂停运行`, flagInfo || {});
          this.securityPolicy.setPaused(true);
        }
        // 如果没有标志但策略是暂停状态，则可以考虑自动恢复（可选）
        // 注意：这里通常需要人工确认后再恢复，自动恢复可能有风险
      }

      return hasFlag;
    } catch (error) {
      this.logger.error('检查暂停标志时发生错误', error);
      return false;
    }
  }

  /**
   * 执行硬暂停（端口封禁）
   * 注意：此功能需要更高级别的系统权限
   */
  async triggerHardPause() {
    try {
      this.logger.warn('=== 执行硬暂停（端口封禁）===');
      
      // 首先触发标准紧急停止
      await this.triggerEmergencyStop('hard_pause');
      
      // 这里可以添加端口封禁逻辑
      // 例如使用iptables或Windows防火墙命令
      // 注意：这需要管理员/root权限
      
      this.logger.info('硬暂停操作已执行');
      return { success: true };
    } catch (error) {
      this.logger.error('执行硬暂停失败', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行完全冻结（FULL_FREEZE）
   */
  async triggerFullFreeze() {
    try {
      this.logger.warn('=== 执行完全冻结 ===');
      
      // 触发紧急停止
      await this.triggerEmergencyStop('full_freeze');
      
      // 可以添加更多的冻结逻辑，如停止所有服务等
      
      this.logger.info('完全冻结操作已执行');
      return { success: true };
    } catch (error) {
      this.logger.error('执行完全冻结失败', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      hasPauseFlag: this.hasPauseFlag(),
      isMonitoring: this.isMonitoring,
      flagPath: this.flagPath,
      pauseFlagInfo: this.getPauseFlagInfo(),
      monitorFrequency: this.monitorFrequency
    };
  }
}

// 导出单例实例和类
let instance = null;

function getKillSwitch(options) {
  if (!instance) {
    instance = new SOPKillSwitch(options);
  }
  return instance;
}

module.exports = {
  SOPKillSwitch,
  getKillSwitch
};
