/**
 * JEV 安全模块初始化脚本
 * 用于初始化安全系统并准备接收命令
 */

const { securityController } = require('./securityController.js');

async function initializeSecuritySystem() {
  console.log('======================================================');
  console.log('            JEV 系统安全模块初始化                    ');
  console.log('======================================================');
  
  try {
    // 初始化安全模块
    const initResult = await securityController.initialize();
    
    if (initResult.success) {
      console.log('✅ 安全模块初始化成功');
      console.log('\n安全操作流程已记录到以下位置:');
      console.log('  - 文件备份: security_sop_backup.json');
      console.log('  - ExternalMemory: security:security_sop');
      console.log('  - 安全策略: security:security_policy');
      
      // 显示当前状态
      await securityController.showStatus();
      
      console.log('\n======================================================');
      console.log('✅ 安全模块已准备就绪');
      console.log('📋 等待命令: "执行暂停" 或 "恢复系统"');
      console.log('======================================================');
      
      // 导出全局函数，便于直接调用
      global.executePause = async () => {
        return await securityController.executePause();
      };
      
      global.executeResume = async () => {
        return await securityController.executeResume();
      };
      
      return {
        success: true,
        message: '安全模块初始化完成，已导出全局命令函数',
        availableCommands: [
          'executePause() - 执行暂停操作',
          'executeResume() - 恢复系统操作'
        ]
      };
    } else {
      console.error('❌ 安全模块初始化失败:', initResult.message);
      return initResult;
    }
  } catch (error) {
    console.error('❌ 初始化过程中发生错误:', error);
    return {
      success: false,
      message: '初始化失败: ' + error.message
    };
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initializeSecuritySystem().then(result => {
    console.log('初始化结果:', result);
    
    // 在Node.js环境中，提供一个简单的命令行接口
    if (typeof process !== 'undefined' && process.stdin) {
      console.log('\n进入交互式模式，可以直接输入命令:');
      console.log('  - 执行暂停');
      console.log('  - 恢复系统');
      console.log('  - status (查看状态)');
      console.log('  - exit (退出)');
      
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', async (input) => {
        const command = input.trim();
        
        if (command.toLowerCase() === 'exit') {
          process.exit(0);
        } else if (command.toLowerCase() === 'status') {
          await securityController.showStatus();
        } else {
          await securityController.handleCommand(command);
        }
      });
    }
  }).catch(console.error);
}

// 导出初始化函数
module.exports = {
  initializeSecuritySystem,
  securityController
};

// 立即执行初始化，确保模块加载时就准备就绪
console.log('[安全系统] 正在后台初始化...');
initializeSecuritySystem().catch(err => {
  console.warn('[安全系统] 后台初始化遇到问题:', err.message);
  console.log('[安全系统] 将在需要时重新尝试初始化');
});
