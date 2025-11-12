/**
 * 暂停/恢复系统控制器
 * 提供简单的命令接口来管理系统的暂停状态
 */

const { securityPolicy, pauseSystem, resumeSystem, checkSystemStatus } = require('./advancedSecurityPolicy.js');

/**
 * 暂停/恢复控制器类
 */
class PauseResumeController {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * 初始化控制器
   */
  async initialize() {
    try {
      // 加载安全策略
      await securityPolicy.loadPolicy();
      this.isInitialized = true;
      console.log('✅ 暂停/恢复控制器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 暂停/恢复控制器初始化失败:', error.message);
      return false;
    }
  }

  /**
   * 执行系统暂停
   */
  async executePause() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('⏸️  正在执行系统暂停...');
      const pausedStatus = await pauseSystem();
      
      if (pausedStatus) {
        console.log('✅ 系统已成功暂停');
        
        // 记录暂停事件
        await securityPolicy.log('security', 'system_paused', {
          source: 'controller',
          timestamp: Date.now()
        });
        
        return {
          success: true,
          message: '系统已成功暂停',
          status: this.getStatusSummary()
        };
      } else {
        throw new Error('暂停操作失败');
      }
    } catch (error) {
      console.error('❌ 执行暂停失败:', error.message);
      return {
        success: false,
        message: `暂停失败: ${error.message}`
      };
    }
  }

  /**
   * 恢复系统运行
   */
  async executeResume() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('▶️  正在执行系统恢复...');
      const resumedStatus = !(await resumeSystem()); // resumeSystem返回恢复后的paused状态，应该是false
      
      if (resumedStatus) {
        console.log('✅ 系统已成功恢复运行');
        
        // 记录恢复事件
        await securityPolicy.log('security', 'system_resumed', {
          source: 'controller',
          timestamp: Date.now()
        });
        
        // 如果启用了等待队列，尝试处理队列中的操作
        if (securityPolicy.policy && securityPolicy.policy.queueOnPause) {
          const queueResult = await securityPolicy.processWaitQueue();
          console.log(`📋 处理等待队列: 已处理 ${queueResult.processed} 个操作，剩余 ${queueResult.remaining} 个`);
        }
        
        return {
          success: true,
          message: '系统已成功恢复运行',
          status: this.getStatusSummary()
        };
      } else {
        throw new Error('恢复操作失败');
      }
    } catch (error) {
      console.error('❌ 执行恢复失败:', error.message);
      return {
        success: false,
        message: `恢复失败: ${error.message}`
      };
    }
  }

  /**
   * 检查系统当前状态
   */
  async checkStatus() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const status = checkSystemStatus();
      const summary = this.getStatusSummary(status);
      
      console.log('📊 系统状态检查:');
      console.log(`   当前状态: ${summary.statusText}`);
      console.log(`   等待队列: ${status.system.waitQueueLength} 个操作`);
      console.log(`   运行时间: ${status.system.runtimeMinutes} 分钟`);
      
      if (status.system.locked) {
        console.log(`   ⚠️  系统已锁定，失败次数: ${status.system.failureCount}`);
      }
      
      if (status.system.killSwitchActive) {
        console.log('   ⚠️  停止开关已激活');
      }
      
      return {
        success: true,
        status,
        summary
      };
    } catch (error) {
      console.error('❌ 状态检查失败:', error.message);
      return {
        success: false,
        message: `状态检查失败: ${error.message}`
      };
    }
  }

  /**
   * 获取状态摘要
   */
  getStatusSummary(status = null) {
    const currentStatus = status || checkSystemStatus();
    
    let statusText = '正常运行';
    let statusCode = 'RUNNING';
    
    if (currentStatus.system.locked) {
      statusText = '已锁定';
      statusCode = 'LOCKED';
    } else if (currentStatus.system.paused) {
      statusText = '已暂停';
      statusCode = 'PAUSED';
    } else if (currentStatus.system.killSwitchActive) {
      statusText = '停止开关激活';
      statusCode = 'KILL_SWITCH';
    }
    
    return {
      statusCode,
      statusText,
      paused: currentStatus.system.paused,
      locked: currentStatus.system.locked,
      queueLength: currentStatus.system.waitQueueLength,
      runtimeMinutes: currentStatus.system.runtimeMinutes
    };
  }

  /**
   * 处理命令行指令
   */
  async handleCommand(command) {
    command = command.trim().toLowerCase();
    
    switch (command) {
      case 'pause':
      case 'p':
      case '暂停':
        return await this.executePause();
        
      case 'resume':
      case 'r':
      case '恢复':
        return await this.executeResume();
        
      case 'status':
      case 's':
      case '状态':
        return await this.checkStatus();
        
      case 'help':
      case 'h':
      case '帮助':
        return this.showHelp();
        
      default:
        return {
          success: false,
          message: `未知命令: ${command}`,
          availableCommands: this.getAvailableCommands()
        };
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    const commands = this.getAvailableCommands();
    
    console.log('📋 暂停/恢复控制器命令帮助:');
    console.log('------------------------');
    
    commands.forEach(cmd => {
      console.log(`   ${cmd.command.padEnd(20)} - ${cmd.description}`);
    });
    
    return {
      success: true,
      commands
    };
  }

  /**
   * 获取可用命令列表
   */
  getAvailableCommands() {
    return [
      { command: 'pause/p/暂停', description: '暂停系统运行' },
      { command: 'resume/r/恢复', description: '恢复系统运行' },
      { command: 'status/s/状态', description: '检查当前系统状态' },
      { command: 'help/h/帮助', description: '显示帮助信息' }
    ];
  }
}

// 创建全局控制器实例
const pauseResumeController = new PauseResumeController();

// 导出模块
module.exports = {
  PauseResumeController,
  pauseResumeController,
  executePause: () => pauseResumeController.executePause(),
  executeResume: () => pauseResumeController.executeResume(),
  checkStatus: () => pauseResumeController.checkStatus(),
  handleCommand: (cmd) => pauseResumeController.handleCommand(cmd)
};

// 如果直接运行，提供交互式命令行
if (require.main === module) {
  (async () => {
    console.log('🔐 JEV系统暂停/恢复控制器');
    console.log('=====================');
    
    // 初始化控制器
    await pauseResumeController.initialize();
    
    // 显示初始状态
    await pauseResumeController.checkStatus();
    console.log('---------------------');
    
    // 如果有命令行参数，执行相应命令
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const command = args[0];
      console.log(`执行命令: ${command}`);
      const result = await pauseResumeController.handleCommand(command);
      
      if (!result.success) {
        console.log(result.message);
        pauseResumeController.showHelp();
      }
    } else {
      // 没有参数时显示帮助
      pauseResumeController.showHelp();
    }
  })();
}