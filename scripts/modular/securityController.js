/**
 * JEV 系统安全控制器
 * 响应 "执行暂停" 和 "恢复系统" 命令
 */

const SECURITY_POLICY = require('./securityPolicy.js');
const { recordSecuritySOP } = require('./securitySOP.js');

class SecurityController {
  constructor() {
    console.log('[安全控制器] 初始化安全管理模块...');
    this.isInitialized = false;
  }

  /**
   * 初始化安全模块
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: '安全模块已初始化' };
    }

    try {
      // 记录安全SOP
      const sopResult = await recordSecuritySOP();
      if (!sopResult.success) {
        console.warn('[安全控制器] SOP记录警告:', sopResult.message);
      }

      // 检查当前系统状态
      const status = await SECURITY_POLICY.checkSystemStatus();
      console.log(`[安全控制器] 初始系统状态: ${status.success && status.paused ? '已暂停' : '正常运行'}`);

      this.isInitialized = true;
      return { 
        success: true, 
        message: '安全模块初始化完成',
        version: '1.0'
      };
    } catch (error) {
      console.error('[安全控制器] 初始化失败:', error);
      return { 
        success: false, 
        message: '初始化失败: ' + error.message
      };
    }
  }

  /**
   * 执行暂停操作
   * 响应 "执行暂停" 命令
   */
  async executePause() {
    try {
      // 确保模块已初始化
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('[安全控制器] 执行暂停命令...');
      
      // 调用暂停功能
      const result = await SECURITY_POLICY.pauseSystem();
      
      // 记录操作日志
      console.log(`[安全控制器] 暂停命令执行结果: ${result.success ? '成功' : '失败'}`);
      
      // 返回结构化的响应
      return {
        command: 'executePause',
        timestamp: new Date().toISOString(),
        ...result
      };
    } catch (error) {
      console.error('[安全控制器] 执行暂停失败:', error);
      return {
        command: 'executePause',
        timestamp: new Date().toISOString(),
        success: false,
        message: '执行暂停失败: ' + error.message,
        error: error.stack
      };
    }
  }

  /**
   * 执行恢复操作
   * 响应 "恢复系统" 命令
   */
  async executeResume() {
    try {
      // 确保模块已初始化
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('[安全控制器] 执行恢复系统命令...');
      
      // 调用恢复功能
      const result = await SECURITY_POLICY.resumeSystem();
      
      // 记录操作日志
      console.log(`[安全控制器] 恢复命令执行结果: ${result.success ? '成功' : '失败'}`);
      
      // 返回结构化的响应
      return {
        command: 'executeResume',
        timestamp: new Date().toISOString(),
        ...result
      };
    } catch (error) {
      console.error('[安全控制器] 执行恢复失败:', error);
      return {
        command: 'executeResume',
        timestamp: new Date().toISOString(),
        success: false,
        message: '执行恢复失败: ' + error.message,
        error: error.stack
      };
    }
  }

  /**
   * 处理命令
   * 根据输入命令执行相应操作
   */
  async handleCommand(command) {
    console.log(`[安全控制器] 收到命令: ${command}`);
    
    switch (command.trim()) {
      case '执行暂停':
        return await this.executePause();
      case '恢复系统':
        return await this.executeResume();
      default:
        return {
          success: false,
          message: '未知命令，仅支持: "执行暂停" 和 "恢复系统"'
        };
    }
  }

  /**
   * 显示当前状态
   */
  async showStatus() {
    try {
      const status = await SECURITY_POLICY.checkSystemStatus();
      
      if (status.success) {
        console.log('========= JEV 系统安全状态 =========');
        console.log(`系统状态: ${status.paused ? '已暂停 ⚠️' : '正常运行 ✅'}`);
        console.log(`暂停时间: ${status.policy.pausedAt || '从未暂停'}`);
        console.log(`暂停来源: ${status.policy.pausedBy || '未知'}`);
        console.log(`恢复时间: ${status.policy.resumedAt || '未恢复'}`);
        console.log(`恢复来源: ${status.policy.resumedBy || '未知'}`);
        console.log('==================================');
      }
      
      return status;
    } catch (error) {
      console.error('[安全控制器] 获取状态失败:', error);
      return {
        success: false,
        message: '获取状态失败: ' + error.message
      };
    }
  }
}

// 创建全局实例，便于直接使用
const securityController = new SecurityController();

// 命令行交互
if (require.main === module) {
  async function startInteractiveMode() {
    console.log('========== JEV 系统安全控制器 ==========');
    console.log('输入 "执行暂停" 或 "恢复系统" 命令');
    console.log('输入 "status" 查看当前状态');
    console.log('输入 "exit" 退出');
    console.log('=======================================');

    // 初始化
    await securityController.initialize();

    // 监听标准输入
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (input) => {
      const command = input.trim();
      
      if (command.toLowerCase() === 'exit') {
        console.log('退出安全控制器');
        process.exit(0);
      } else if (command.toLowerCase() === 'status') {
        await securityController.showStatus();
      } else {
        const result = await securityController.handleCommand(command);
        console.log('执行结果:', result);
        
        // 显示更新后的状态
        await securityController.showStatus();
      }
      
      console.log('\n输入命令:');
    });

    console.log('输入命令:');
  }

  startInteractiveMode().catch(console.error);
}

// 导出控制器实例
module.exports = {
  securityController,
  SecurityController
};
