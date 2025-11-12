/**
 * 简单测试脚本 - 直接测试advancedSecurityPolicy核心功能
 */

const { securityPolicy } = require('./advancedSecurityPolicy');

async function runBasicTests() {
  console.log('开始执行基础安全策略测试...');
  
  try {
    // 初始化安全策略
    console.log('1. 加载安全策略...');
    await securityPolicy.loadPolicy();
    console.log('✅ 安全策略加载成功');
    
    // 显示当前策略配置
    console.log('\n当前安全策略配置:');
    console.log(JSON.stringify(securityPolicy.policy, null, 2));
    
    // 测试1: 暂停/恢复功能
    console.log('\n2. 测试暂停/恢复功能:');
    await securityPolicy.setPaused(true);
    console.log('   暂停后状态:', securityPolicy.policy.paused);
    
    await securityPolicy.setPaused(false);
    console.log('   恢复后状态:', securityPolicy.policy.paused);
    
    // 测试2: 路径限制检查
    console.log('\n3. 测试路径限制:');
    const testPaths = [
      { path: 'D:\\PDF转网页', expected: true, desc: '工作目录' },
      { path: 'C:\\Windows', expected: false, desc: '受限系统目录' },
      { path: 'C:\\Users\\test\\AppData', expected: false, desc: '通配符受限目录' },
      { path: '/etc', expected: false, desc: 'Linux受限目录' }
    ];
    
    for (const test of testPaths) {
      const result = await securityPolicy.checkOperationAllowed('read', { path: test.path });
      console.log(`   ${test.desc} (${test.path}): 允许=${result.allowed}, 原因=${result.reason}`);
    }
    
    // 测试3: 令牌白名单
    console.log('\n4. 测试令牌白名单:');
    const testTokens = [
      { token: 'TREA_MAIN', expected: true, desc: '白名单令牌' },
      { token: 'WORKER_OP', expected: true, desc: '白名单令牌' },
      { token: 'INVALID_TOKEN', expected: false, desc: '无效令牌' }
    ];
    
    for (const test of testTokens) {
      const result = await securityPolicy.checkOperationAllowed('open', { token: test.token });
      console.log(`   ${test.desc} (${test.token}): 允许=${result.allowed}, 原因=${result.reason}`);
    }
    
    // 测试4: 操作类型检查
    console.log('\n5. 测试操作类型限制:');
    const testActions = [
      { action: 'read', expected: true, desc: '允许的操作' },
      { action: 'write', expected: true, desc: '允许的操作' },
      { action: 'delete', expected: false, desc: '不允许的操作' }
    ];
    
    for (const test of testActions) {
      const result = await securityPolicy.checkOperationAllowed(test.action, { token: 'TREA_MAIN' });
      console.log(`   ${test.desc} (${test.action}): 允许=${result.allowed}, 原因=${result.reason}`);
    }
    
    // 测试5: 故障计数
    console.log('\n6. 测试故障计数:');
    securityPolicy.failureCount = 0;
    console.log('   初始故障计数:', securityPolicy.failureCount);
    
    securityPolicy.incrementFailureCount();
    securityPolicy.incrementFailureCount();
    console.log('   增加后故障计数:', securityPolicy.failureCount);
    
    // 测试6: 日志功能
    console.log('\n7. 测试日志功能:');
    await securityPolicy.log('security', 'test_event', { test: 'value' });
    console.log('   ✅ 日志记录成功');
    console.log('   日志条目数:', securityPolicy.logHistory.length);
    
    console.log('\n🎉 所有基础测试执行完成！');
    return true;
  } catch (error) {
    console.error('❌ 测试执行出错:', error.message);
    console.error(error.stack);
    return false;
  }
}

// 执行测试
runBasicTests().then(success => {
  process.exit(success ? 0 : 1);
});
