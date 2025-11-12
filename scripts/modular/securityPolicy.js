/**
 * JEV 系统安全策略模块
 * 记录和管理系统安全操作流程(SOP)
 */

const SECURITY_MODULE = {
  /**
   * 系统暂停操作
   * 当接收到"执行暂停"指令时，将系统设置为暂停状态
   */
  async pauseSystem() {
    try {
      // 导入必要的模块
      const { ExternalMemory } = require('./memory.js');
      
      // 获取当前安全策略
      const currentPolicy = await ExternalMemory.get('security_policy', { ns: 'security' }) || {};
      
      // 更新为暂停状态
      const updatedPolicy = {
        ...currentPolicy,
        paused: true,
        pausedAt: new Date().toISOString(),
        pausedBy: 'system_security_module'
      };
      
      // 保存更新后的策略
      await ExternalMemory.set('security_policy', updatedPolicy, { ns: 'security' });
      
      console.log('[安全策略] 系统已成功设置为暂停状态');
      return {
        success: true,
        message: '系统已暂停',
        action: 'pause',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[安全策略] 设置系统暂停状态失败:', error);
      return {
        success: false,
        message: '设置暂停状态失败: ' + error.message,
        error: error.message
      };
    }
  },

  /**
   * 系统恢复操作
   * 当接收到"恢复系统"指令时，将系统恢复为正常状态
   */
  async resumeSystem() {
    try {
      // 导入必要的模块
      const { ExternalMemory } = require('./memory.js');
      
      // 获取当前安全策略
      const currentPolicy = await ExternalMemory.get('security_policy', { ns: 'security' }) || {};
      
      // 更新为正常状态
      const updatedPolicy = {
        ...currentPolicy,
        paused: false,
        resumedAt: new Date().toISOString(),
        resumedBy: 'system_security_module'
      };
      
      // 保存更新后的策略
      await ExternalMemory.set('security_policy', updatedPolicy, { ns: 'security' });
      
      console.log('[安全策略] 系统已成功恢复正常状态');
      return {
        success: true,
        message: '系统已恢复',
        action: 'resume',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[安全策略] 恢复系统正常状态失败:', error);
      return {
        success: false,
        message: '恢复系统状态失败: ' + error.message,
        error: error.message
      };
    }
  },

  /**
   * 检查系统当前状态
   */
  async checkSystemStatus() {
    try {
      const { ExternalMemory } = require('./memory.js');
      const policy = await ExternalMemory.get('security_policy', { ns: 'security' }) || {};
      
      return {
        success: true,
        paused: policy.paused || false,
        policy: {
          paused: policy.paused,
          pausedAt: policy.pausedAt,
          pausedBy: policy.pausedBy,
          resumedAt: policy.resumedAt,
          resumedBy: policy.resumedBy
        }
      };
    } catch (error) {
      console.error('[安全策略] 检查系统状态失败:', error);
      return {
        success: false,
        message: '检查状态失败: ' + error.message
      };
    }
  },

  /**
   * 执行等待队列中的任务
   * 系统恢复后，可以选择性地执行等待队列中的任务
   */
  async processWaitQueue(options = {}) {
    try {
      const { ExternalMemory } = require('./memory.js');
      const { executeTask } = require('./operator.js');
      
      // 获取等待队列
      const waitQueue = await ExternalMemory.get('wait_queue', { ns: 'security' }) || [];
      
      if (!Array.isArray(waitQueue) || waitQueue.length === 0) {
        return {
          success: true,
          message: '等待队列为空',
          processed: 0
        };
      }
      
      console.log(`[安全策略] 开始处理等待队列中的 ${waitQueue.length} 个任务`);
      
      // 根据选项决定处理方式
      const processCount = options.limit || waitQueue.length;
      const tasksToProcess = waitQueue.slice(0, processCount);
      
      const results = [];
      let successCount = 0;
      
      for (const task of tasksToProcess) {
        try {
          const result = await executeTask(task);
          results.push({ taskId: task.id, result });
          if (result.success) {
            successCount++;
          }
        } catch (taskError) {
          results.push({ taskId: task.id, error: taskError.message });
        }
      }
      
      // 如果选项指定清除已处理的任务
      if (options.clearProcessed) {
        const remainingTasks = waitQueue.slice(processCount);
        await ExternalMemory.set('wait_queue', remainingTasks, { ns: 'security' });
      }
      
      return {
        success: true,
        message: `已处理 ${processCount} 个任务，成功 ${successCount} 个`,
        processed: processCount,
        success: successCount,
        results
      };
    } catch (error) {
      console.error('[安全策略] 处理等待队列失败:', error);
      return {
        success: false,
        message: '处理等待队列失败: ' + error.message
      };
    }
  }
};

// 监听命令行参数，用于手动测试
if (require.main === module) {
  const command = process.argv[2];
  
  async function executeCommand() {
    switch (command) {
      case 'pause':
        await SECURITY_MODULE.pauseSystem();
        break;
      case 'resume':
        await SECURITY_MODULE.resumeSystem();
        break;
      case 'status':
        const status = await SECURITY_MODULE.checkSystemStatus();
        console.log('系统状态:', status);
        break;
      default:
        console.log('用法: node securityPolicy.js [pause|resume|status]');
    }
  }
  
  executeCommand().catch(console.error);
}

module.exports = SECURITY_MODULE;
