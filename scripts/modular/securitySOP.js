/**
 * JEV 系统安全操作流程(SOP)记录器
 * 用于将安全规则写入externalMemory
 */

async function recordSecuritySOP() {
  try {
    console.log('[安全SOP] 开始记录安全操作流程...');
    
    // 定义完整的安全操作流程，包含SOP元数据
    const currentTime = new Date().toISOString();
    const securitySOP = {
      "[SOP_META]": {
        version: "1.0.0",
        updated_at: currentTime,
        owner: "JEV Security",
        mode: "LEARN_ONLY",
        store_to: {
          namespace: "security",
          key: "security_sop_v1"
        },
        reply_format: "LEARNED_OK::<hash>"
      },
      version: '1.0.0',
      created: currentTime,
      updated_at: currentTime,
      description: 'JEV系统安全操作流程(SOP)',
      procedures: [
        {
          id: 'PROC-001',
          name: '系统暂停',
          trigger: '执行暂停',
          actions: [
            '1. 调用ExternalMemory.set()更新security命名空间中的security_policy',
            '2. 设置paused字段为true',
            '3. 记录暂停时间(pausedAt)和操作来源(pausedBy)',
            '4. operator.js将自动检测paused状态并暂停任务执行',
            '5. 新任务将被添加到等待队列(wait_queue)'
          ],
          implementation: 'securityPolicy.pauseSystem()'
        },
        {
          id: 'PROC-002', 
          name: '系统恢复',
          trigger: '恢复系统',
          actions: [
            '1. 调用ExternalMemory.set()更新security命名空间中的security_policy',
            '2. 设置paused字段为false',
            '3. 记录恢复时间(resumedAt)和操作来源(resumedBy)',
            '4. operator.js将检测到系统恢复并正常执行新任务',
            '5. 可选：通过processWaitQueue()处理等待队列中的任务'
          ],
          implementation: 'securityPolicy.resumeSystem()'
        },
        {
          id: 'PROC-003',
          name: '状态检查',
          trigger: '需要验证系统状态',
          actions: [
            '1. 调用ExternalMemory.get()获取security命名空间中的security_policy',
            '2. 检查paused字段的值',
            '3. 验证其他安全策略参数'
          ],
          implementation: 'securityPolicy.checkSystemStatus()'
        },
        {
          id: 'PROC-004',
          name: '等待队列处理',
          trigger: '系统恢复后需要处理暂停期间积累的任务',
          actions: [
            '1. 获取security命名空间中的wait_queue',
            '2. 按顺序执行队列中的任务',
            '3. 记录处理结果',
            '4. 根据选项决定是否清除已处理的任务'
          ],
          implementation: 'securityPolicy.processWaitQueue()'
        }
      ],
      rules: [
        '1. 严格按照命令触发相应操作，不执行未授权操作',
        '2. 所有操作必须记录到ExternalMemory',
        '3. 操作失败时记录详细错误信息',
        '4. 系统暂停时，所有任务必须进入等待队列',
        '5. 系统恢复时，尊重原有的安全策略设置'
      ],
      memoryKeys: {
        securityPolicy: 'security:security_policy',
        waitQueue: 'security:wait_queue',
        securityLogs: 'security:logs'
      }
    };
    
    // 记录到文件
    const fs = require('fs');
    const path = require('path');
    const sopFilePath = path.join(__dirname, 'security_sop_backup.json');
    fs.writeFileSync(sopFilePath, JSON.stringify(securitySOP, null, 2));
    console.log(`[安全SOP] 已保存到文件: ${sopFilePath}`);
    
    // 尝试写入ExternalMemory
    try {
      const { ExternalMemory } = require('./memory.js');
      // 按照SOP_META中指定的路径保存
      await ExternalMemory.set('security_sop_v1', securitySOP, { ns: 'security' });
      console.log('[安全SOP] 已成功写入ExternalMemory的security命名空间');
      console.log('[安全SOP] 保存路径: security:security_sop_v1');
    } catch (memoryError) {
      console.warn('[安全SOP] 写入ExternalMemory失败，将使用模拟方式:', memoryError.message);
      
      // 模拟ExternalMemory写入
      console.log('[安全SOP] 模拟写入成功，在真实环境中会写入到以下路径:');
      console.log('  - security:security_sop_v1 (完整SOP)');
      console.log('  - security:security_policy (策略状态)');
    }
    
    // 确保security_policy初始结构存在
    try {
      const initialPolicy = {
        paused: false,
        allowedActions: ["open", "move", "click", "type", "capture", "read", "write"],
        tokenWhitelist: ["TREA_MAIN", "WORKER_OP"],
        confirmBeforeExecute: true,
        logToMemory: true,
        autoLockAfterFailures: 3
      };
      
      const { ExternalMemory } = require('./memory.js');
      await ExternalMemory.set('security_policy', initialPolicy, { ns: 'security' });
      console.log('[安全SOP] 初始安全策略已设置');
    } catch (policyError) {
      console.warn('[安全SOP] 设置初始策略失败:', policyError.message);
    }
    
    return {
      success: true,
      message: '安全操作流程已成功记录',
      sopVersion: securitySOP.version,
      procedures: securitySOP.procedures.length
    };
    
  } catch (error) {
    console.error('[安全SOP] 记录过程中出错:', error);
    return {
      success: false,
      message: '记录安全SOP失败: ' + error.message
    };
  }
}

// 执行记录
if (require.main === module) {
  recordSecuritySOP().then(result => {
    console.log('[安全SOP] 记录结果:', result);
  }).catch(err => {
    console.error('[安全SOP] 执行失败:', err);
  });
}

module.exports = {
  recordSecuritySOP
};
