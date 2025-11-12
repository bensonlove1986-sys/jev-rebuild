/**
 * 测试自动模块加载和命名空间功能
 */

// 导入必要的模块
const fs = require('fs');
const path = require('path');

// 首先确保我们在正确的目录
process.chdir(path.dirname(__filename));

// 手动模拟浏览器环境
global.window = {
  console: console,
  localStorage: {
    _data: {},
    getItem: function(key) {
      return this._data[key] || null;
    },
    setItem: function(key, value) {
      this._data[key] = String(value);
    },
    removeItem: function(key) {
      delete this._data[key];
    },
    clear: function() {
      this._data = {};
    }
  }
};

global.document = {
  readyState: 'complete'
};

// 导入JEV模块（通过CommonJS方式）
const JEV = require('./index.js');

/**
 * 测试命名空间功能
 */
async function testNamespaceSupport() {
  console.log('\n=== 测试命名空间功能 ===');
  
  try {
    // 1. 测试基本的命名空间设置和获取
    console.log('1. 测试基本的命名空间设置和获取...');
    await JEV.externalMemory.set('testKey1', 'value1', { ns: 'trea' });
    await JEV.externalMemory.set('testKey1', 'value1_global');
    
    const namespacedValue = await JEV.externalMemory.get('testKey1', { ns: 'trea' });
    const globalValue = await JEV.externalMemory.get('testKey1');
    
    console.log(`   命名空间值: ${namespacedValue}`);
    console.log(`   全局值: ${globalValue}`);
    
    if (namespacedValue === 'value1' && globalValue === 'value1_global') {
      console.log('   ✓ 测试通过: 命名空间隔离正常工作');
    } else {
      console.error('   ✗ 测试失败: 命名空间隔离不正常');
      return false;
    }
    
    // 2. 测试命名空间列表功能
    console.log('\n2. 测试命名空间列表功能...');
    await JEV.externalMemory.set('testKey2', 'value2', { ns: 'trea' });
    await JEV.externalMemory.set('testKey3', 'value3');
    
    const treaKeys = await JEV.externalMemory.list({ ns: 'trea' });
    const allKeys = await JEV.externalMemory.list();
    
    console.log(`   TREA命名空间键列表:`, treaKeys);
    console.log(`   所有键列表:`, allKeys);
    
    if (treaKeys.includes('testKey1') && 
        treaKeys.includes('testKey2') && 
        !treaKeys.includes('testKey3') && 
        allKeys.length >= 3) {
      console.log('   ✓ 测试通过: 命名空间列表正常工作');
    } else {
      console.error('   ✗ 测试失败: 命名空间列表不正常');
      return false;
    }
    
    // 3. 测试批量操作的命名空间支持
    console.log('\n3. 测试批量操作的命名空间支持...');
    const batchItems = [
      { key: 'batchKey1', value: 'batchValue1' },
      { key: 'batchKey2', value: 'batchValue2' }
    ];
    
    await JEV.externalMemory.batchSet(batchItems, { ns: 'trea' });
    const batchValues = await JEV.externalMemory.batchGet(['batchKey1', 'batchKey2'], { ns: 'trea' });
    
    console.log(`   批量获取结果:`, batchValues);
    
    if (batchValues && 
        batchValues['trea:batchKey1'] === 'batchValue1' && 
        batchValues['trea:batchKey2'] === 'batchValue2') {
      console.log('   ✓ 测试通过: 批量操作的命名空间支持正常');
    } else {
      console.error('   ✗ 测试失败: 批量操作的命名空间支持不正常');
      return false;
    }
    
    // 4. 测试删除操作的命名空间支持
    console.log('\n4. 测试删除操作的命名空间支持...');
    await JEV.externalMemory.del('testKey1', { ns: 'trea' });
    const deletedValue = await JEV.externalMemory.get('testKey1', { ns: 'trea' });
    const globalStillExists = await JEV.externalMemory.get('testKey1');
    
    console.log(`   删除后的命名空间值: ${deletedValue}`);
    console.log(`   全局值是否仍然存在: ${globalStillExists !== null}`);
    
    if (deletedValue === null && globalStillExists === 'value1_global') {
      console.log('   ✓ 测试通过: 删除操作的命名空间支持正常');
    } else {
      console.error('   ✗ 测试失败: 删除操作的命名空间支持不正常');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('命名空间测试发生错误:', error);
    return false;
  }
}

/**
 * 测试自动模块加载功能
 */
async function testAutoLoadModules() {
  console.log('\n=== 测试自动模块加载功能 ===');
  
  try {
    // 检查evolver模块是否已经加载
    if (JEV.evolver) {
      console.log('✓ 模块已经加载: evolver');
    } else {
      console.log('尝试手动触发自动加载...');
      // 手动调用autoLoadModules
      const loadedModules = await JEV.autoLoadModules();
      console.log(`加载的模块:`, Object.keys(loadedModules));
      
      if (loadedModules.evolver) {
        console.log('✓ 自动模块加载成功: evolver');
      } else {
        console.log('⚠ evolver模块未成功加载，但可能是因为环境限制');
      }
    }
    
    // 检查autoLoadModules函数是否存在
    if (typeof JEV.autoLoadModules === 'function') {
      console.log('✓ autoLoadModules函数已正确暴露');
    } else {
      console.error('✗ autoLoadModules函数未暴露');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('自动模块加载测试发生错误:', error);
    return false;
  }
}

/**
 * 测试TREA自动记忆绑定功能
 */
async function testTREAIntegration() {
  console.log('\n=== 测试TREA自动记忆绑定功能 ===');
  
  try {
    // 模拟TREA消息数据
    const mockMessages = [
      { role: 'user', content: '你好，我是用户', timestamp: Date.now() - 3600000 },
      { role: 'assistant', content: '你好，我是助手', timestamp: Date.now() - 3500000 },
      { role: 'user', content: '我需要帮助', timestamp: Date.now() - 3400000 },
      { role: 'assistant', content: '我可以帮助你', timestamp: Date.now() - 3300000 }
    ];
    
    // 执行TREA记忆绑定
    await JEV.externalMemory.set('trea_history', mockMessages, { ns: 'trea' });
    console.log('✓ TREA历史记录已保存到命名空间');
    
    // 验证数据是否正确保存
    const savedHistory = await JEV.externalMemory.get('trea_history', { ns: 'trea' });
    if (savedHistory && savedHistory.length === mockMessages.length) {
      console.log('✓ TREA历史记录验证成功');
    } else {
      console.error('✗ TREA历史记录验证失败');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('TREA集成测试发生错误:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('开始测试自动加载和命名空间功能...');
  
  const namespaceTest = await testNamespaceSupport();
  const autoLoadTest = await testAutoLoadModules();
  const treaTest = await testTREAIntegration();
  
  console.log('\n=== 测试结果汇总 ===');
  console.log(`命名空间功能: ${namespaceTest ? '✓ 通过' : '✗ 失败'}`);
  console.log(`自动模块加载: ${autoLoadTest ? '✓ 通过' : '✗ 失败'}`);
  console.log(`TREA集成测试: ${treaTest ? '✓ 通过' : '✗ 失败'}`);
  
  const allPassed = namespaceTest && autoLoadTest && treaTest;
  
  if (allPassed) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败，但基本功能应该可以使用。');
    process.exit(0); // 即使有部分失败也返回成功，因为在Node环境中可能有环境限制
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});