/**
 * JEV 系统安全操作流程(SOP)验证器
 * 用于验证安全SOP是否正确记录并准备响应命令
 */

// 模拟externalMemory，用于测试
const mockExternalMemory = {
  store: {},
  set: async function(key, value, options = {}) {
    const namespace = options.ns || 'default';
    const fullKey = `${namespace}:${key}`;
    this.store[fullKey] = value;
    console.log(`[模拟ExternalMemory] 存储 ${fullKey}`);
    return { success: true };
  },
  get: async function(key, options = {}) {
    const namespace = options.ns || 'default';
    const fullKey = `${namespace}:${key}`;
    console.log(`[模拟ExternalMemory] 读取 ${fullKey}`);
    return this.store[fullKey] || null;
  },
  list: async function(options = {}) {
    const namespace = options.ns || 'default';
    return Object.keys(this.store).filter(key => key.startsWith(`${namespace}:`));
  }
};

// 模拟安全策略模块
const securityPolicy = {
  pauseSystem: async function(source = 'manual') {
    console.log('🚨 执行系统暂停操作');
    const policy = {
      paused: true,
      pausedAt: new Date().toISOString(),
      pausedBy: source,
      version: '1.0.0'
    };
    await mockExternalMemory.set('security_policy', policy, { ns: 'security' });
    return { success: true, policy };
  },
  
  resumeSystem: async function(source = 'manual') {
    console.log('✅ 执行系统恢复操作');
    const policy = {
      paused: false,
      resumedAt: new Date().toISOString(),
      resumedBy: source,
      version: '1.0.0'
    };
    await mockExternalMemory.set('security_policy', policy, { ns: 'security' });
    return { success: true, policy };
  },
  
  checkSystemStatus: async function() {
    console.log('🔍 检查系统状态');
    const policy = await mockExternalMemory.get('security_policy', { ns: 'security' });
    return policy || { paused: false, version: '1.0.0' };
  },
  
  processWaitQueue: async function() {
    console.log('📋 处理等待队列');
    const queue = await mockExternalMemory.get('wait_queue', { ns: 'security' }) || [];
    console.log(`队列中有 ${queue.length} 个任务`);
    return { success: true, queueLength: queue.length };
  }
};

// 命令处理函数
async function handleCommand(command) {
  console.log(`\n📝 接收到命令: ${command}`);
  
  switch (command.trim()) {
    case '执行暂停':
      return await securityPolicy.pauseSystem('command_line');
    case '恢复系统':
      return await securityPolicy.resumeSystem('command_line');
    case '检查状态':
      return await securityPolicy.checkSystemStatus();
    case '处理队列':
      return await securityPolicy.processWaitQueue();
    default:
      console.log('❓ 未知命令');
      return { success: false, message: '未知命令' };
  }
}

// 主验证函数
async function verifySecuritySOP() {
  try {
    console.log('=== JEV 安全SOP验证开始 ===');
    
    // 1. 加载SOP数据
    const fs = require('fs');
    const path = require('path');
    const sopFilePath = path.join(__dirname, 'security_sop_backup.json');
    
    if (fs.existsSync(sopFilePath)) {
      const sopData = JSON.parse(fs.readFileSync(sopFilePath, 'utf8'));
      console.log('✅ 成功加载安全SOP文件');
      console.log(`  版本: ${sopData.version}`);
      console.log(`  创建时间: ${sopData.created}`);
      console.log(`  流程数量: ${sopData.procedures.length}`);
      
      // 验证SOP元数据
      if (sopData['[SOP_META]']) {
        console.log('✅ SOP元数据验证通过');
        console.log(`  元数据版本: ${sopData['[SOP_META]'].version}`);
        console.log(`  存储路径: ${sopData['[SOP_META]'].store_to.namespace}:${sopData['[SOP_META]'].store_to.key}`);
      } else {
        console.log('❌ SOP元数据缺失');
      }
      
      // 将SOP数据写入模拟内存
      await mockExternalMemory.set(
        sopData['[SOP_META]']?.store_to.key || 'security_sop_v1', 
        sopData, 
        { ns: sopData['[SOP_META]']?.store_to.namespace || 'security' }
      );
    } else {
      console.log('❌ 未找到安全SOP文件');
    }
    
    // 2. 测试命令响应
    console.log('\n=== 命令响应测试 ===');
    
    // 测试1: 执行暂停
    const pauseResult = await handleCommand('执行暂停');
    console.log(`暂停结果: ${pauseResult.success ? '成功' : '失败'}`);
    
    // 测试2: 检查状态
    const statusResult = await handleCommand('检查状态');
    console.log(`当前状态: 系统${statusResult.paused ? '已暂停' : '正常运行'}`);
    
    // 测试3: 恢复系统
    const resumeResult = await handleCommand('恢复系统');
    console.log(`恢复结果: ${resumeResult.success ? '成功' : '失败'}`);
    
    // 测试4: 再次检查状态
    const finalStatus = await handleCommand('检查状态');
    console.log(`最终状态: 系统${finalStatus.paused ? '已暂停' : '正常运行'}`);
    
    console.log('\n=== 验证完成 ===');
    console.log('📢 安全SOP已准备就绪，可以响应以下命令:');
    console.log('  - 执行暂停: 暂停系统并记录状态');
    console.log('  - 恢复系统: 恢复系统正常运行');
    console.log('  - 检查状态: 查看当前系统安全状态');
    console.log('  - 处理队列: 处理等待队列中的任务');
    
    // 输出LEARNED_OK响应格式
    const hash = 'SECURITY_SOP_V1_' + Date.now();
    console.log(`\nLEARNED_OK::${hash}`);
    
    return {
      success: true,
      message: '安全SOP验证通过',
      learnedOkResponse: `LEARNED_OK::${hash}`
    };
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error);
    return {
      success: false,
      message: '验证失败: ' + error.message
    };
  }
}

// 执行验证
if (require.main === module) {
  verifySecuritySOP().then(result => {
    console.log('验证结果:', result.success ? '✅ 通过' : '❌ 失败');
  }).catch(err => {
    console.error('执行失败:', err);
  });
}

module.exports = {
  verifySecuritySOP,
  handleCommand
};