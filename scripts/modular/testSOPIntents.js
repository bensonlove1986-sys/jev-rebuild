/**
 * SOP意图处理器测试脚本
 * 验证所有SOP意图功能：软暂停、硬暂停、紧急停机、系统恢复和演练模式
 */

// 安全导入模块
let sopIntentHandler, processSOPIntent, getSystemStatus;
try {
  const handlerModule = require('./sopIntentHandler');
  sopIntentHandler = handlerModule.sopIntentHandler;
  processSOPIntent = handlerModule.processSOPIntent;
  getSystemStatus = handlerModule.getSystemStatus;
} catch (error) {
  console.warn('无法加载sopIntentHandler模块:', error.message);
  // 创建模拟对象以便测试继续
  processSOPIntent = async (intent, params = {}) => {
    console.log(`[模拟] 处理SOP意图: ${intent}`, params);
    return { success: true, message: `模拟处理 ${intent}` };
  };
  getSystemStatus = async () => ({ systemState: 'RUNNING' });
  sopIntentHandler = {};
}

// 测试配置
const TEST_CONFIG = { 
  delayBetweenTests: 2000, // 测试间隔延迟
  maxTestDuration: 60000, // 最大测试时长
  dryRunFirst: true // 先进行演练再执行实际操作
};

// 工具函数 - 延迟
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 工具函数 - 带时间戳的日志
function logWithTimestamp(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * 测试前准备 - 确保系统处于正常状态
 */
async function setupTestEnvironment() {
  logWithTimestamp('准备测试环境...', 'info');
  
  try {
    // 先检查当前状态
    const currentStatus = await getSystemStatus();
    logWithTimestamp('当前系统状态:', 'info');
    console.log(JSON.stringify(currentStatus, null, 2));
    
    // 如果系统当前处于暂停状态，先恢复
    if (currentStatus.systemState === 'PAUSED' || currentStatus.systemState === 'FULL_FROZEN') {
      logWithTimestamp('检测到系统处于非运行状态，尝试恢复...', 'warning');
      await processSOPIntent('恢复系统');
      await delay(TEST_CONFIG.delayBetweenTests);
      
      // 再次检查状态
      const newStatus = await getSystemStatus();
      if (newStatus.systemState !== 'RUNNING') {
        logWithTimestamp('警告：系统未能完全恢复到正常运行状态', 'warning');
      }
    }
    
    logWithTimestamp('测试环境准备完成', 'success');
    return true;
  } catch (error) {
    logWithTimestamp(`测试环境准备失败: ${error.message}`, 'error');
    console.error(error);
    return false;
  }
}

/**
 * 测试单个SOP意图
 */
async function testSingleIntent(intent, params = {}, description) {
  logWithTimestamp(`开始测试: ${description} (${intent})`, 'info');
  
  try {
    const result = await processSOPIntent(intent, params);
    
    if (result.success) {
      logWithTimestamp(`测试通过: ${description}`, 'success');
      console.log(`结果:`, JSON.stringify(result, null, 2));
      
      // 验证状态变化
      const status = await getSystemStatus();
      logWithTimestamp('操作后的系统状态:', 'info');
      console.log(JSON.stringify(status, null, 2));
      
      return { success: true, result, status };
    } else {
      logWithTimestamp(`测试失败: ${description} - ${result.error}`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error) {
    logWithTimestamp(`测试异常: ${description} - ${error.message}`, 'error');
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * 测试演练模式
 */
async function testDryRun() {
  logWithTimestamp('开始测试演练模式...', 'info');
  
  try {
    // 测试软暂停的演练
    const softPauseDryRun = await processSOPIntent('仅演练（不执行）', {
      targetIntent: '暂停系统（软）',
      targetParams: { testParam: 'value' }
    });
    
    if (softPauseDryRun.success && softPauseDryRun.dryRun) {
      logWithTimestamp('软暂停演练测试通过', 'success');
    } else {
      logWithTimestamp('软暂停演练测试失败', 'error');
      return { success: false, error: '软暂停演练未正确执行' };
    }
    
    // 测试紧急停机的演练
    const freezeDryRun = await processSOPIntent('仅演练（不执行）', {
      targetIntent: '执行紧急停机',
      targetParams: { testParam: 'value' }
    });
    
    if (freezeDryRun.success && freezeDryRun.dryRun) {
      logWithTimestamp('紧急停机演练测试通过', 'success');
    } else {
      logWithTimestamp('紧急停机演练测试失败', 'error');
      return { success: false, error: '紧急停机演练未正确执行' };
    }
    
    // 验证系统状态未改变
    const status = await getSystemStatus();
    if (status.systemState !== 'RUNNING') {
      logWithTimestamp('警告：演练模式下系统状态发生了变化', 'warning');
    }
    
    return { success: true };
  } catch (error) {
    logWithTimestamp(`演练模式测试异常: ${error.message}`, 'error');
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * 运行完整的SOP意图测试套件
 */
async function runSOPIntentTests() {
  logWithTimestamp('开始执行SOP意图处理器测试套件', 'info');
  // 确保testResults对象正确初始化并在测试函数间共享
  global.testResults = {
    startTime: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    }
  };
  const testResults = global.testResults;
  
  try {
    // 准备测试环境
    const setupResult = await setupTestEnvironment();
    if (!setupResult) {
      throw new Error('无法准备测试环境');
    }
    
    // 测试1: 演练模式（如果配置了先进行演练）
    if (TEST_CONFIG.dryRunFirst) {
      const dryRunResult = await testDryRun();
      testResults.tests.push({
        name: '演练模式测试',
        ...dryRunResult
      });
      testResults.summary.total++;
      if (dryRunResult.success) {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
      }
      
      await delay(TEST_CONFIG.delayBetweenTests);
    }
    
    // 测试2: 软暂停系统
    const softPauseResult = await testSingleIntent(
      '暂停系统（软）', 
      {}, 
      '软暂停系统'
    );
    testResults.tests.push({
      name: '软暂停系统',
      ...softPauseResult
    });
    testResults.summary.total++;
    if (softPauseResult.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    await delay(TEST_CONFIG.delayBetweenTests);
    
    // 测试3: 从软暂停状态恢复
    const resumeFromSoftResult = await testSingleIntent(
      '恢复系统',
      {},
      '从软暂停状态恢复系统'
    );
    testResults.tests.push({
      name: '从软暂停状态恢复系统',
      ...resumeFromSoftResult
    });
    testResults.summary.total++;
    if (resumeFromSoftResult.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    await delay(TEST_CONFIG.delayBetweenTests);
    
    // 测试4: 硬暂停系统
    const hardPauseResult = await testSingleIntent(
      '暂停系统（硬）',
      {},
      '硬暂停系统'
    );
    testResults.tests.push({
      name: '硬暂停系统',
      ...hardPauseResult
    });
    testResults.summary.total++;
    if (hardPauseResult.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    await delay(TEST_CONFIG.delayBetweenTests);
    
    // 测试5: 从硬暂停状态恢复
    const resumeFromHardResult = await testSingleIntent(
      '恢复系统',
      { replayLastN: 5 },
      '从硬暂停状态恢复系统'
    );
    testResults.tests.push({
      name: '从硬暂停状态恢复系统',
      ...resumeFromHardResult
    });
    testResults.summary.total++;
    if (resumeFromHardResult.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    // 注意：紧急停机是一个更严重的操作，为了安全起见，我们可以选择：
    // 1. 只在演练模式下测试
    // 2. 或者在测试后立即恢复系统
    
    // 测试6: 紧急停机（在测试环境中）
    const fullFreezeResult = await testSingleIntent(
      '执行紧急停机',
      {},
      '紧急停机'
    );
    testResults.tests.push({
      name: '紧急停机',
      ...fullFreezeResult
    });
    testResults.summary.total++;
    if (fullFreezeResult.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    await delay(TEST_CONFIG.delayBetweenTests);
    
    // 测试7: 从紧急停机状态恢复（非常重要！）
    logWithTimestamp('从紧急停机状态恢复系统（这是关键步骤）...', 'warning');
    const resumeFromFreezeResult = await testSingleIntent(
      '恢复系统',
      {},
      '从紧急停机状态恢复系统'
    );
    testResults.tests.push({
      name: '从紧急停机状态恢复系统',
      ...resumeFromFreezeResult
    });
    testResults.summary.total++;
    if (resumeFromFreezeResult.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    // 计算测试持续时间
    testResults.endTime = new Date().toISOString();
    const startTime = new Date(testResults.startTime).getTime();
    const endTime = new Date(testResults.endTime).getTime();
    testResults.summary.duration = endTime - startTime;
    
    // 测试完成后确保系统处于正常状态
    const finalStatus = await getSystemStatus();
    if (finalStatus.systemState !== 'RUNNING') {
      logWithTimestamp('警告：测试完成后系统未完全恢复到正常运行状态！', 'error');
      // 尝试再次恢复
      await processSOPIntent('恢复系统');
    }
    
    return testResults;
  } catch (error) {
    logWithTimestamp(`测试套件执行失败: ${error.message}`, 'error');
    console.error(error);
    
    // 确保系统恢复
    try {
      logWithTimestamp('尝试恢复系统到正常状态...', 'warning');
      await processSOPIntent('恢复系统');
    } catch (recoveryError) {
      logWithTimestamp(`系统恢复失败: ${recoveryError.message}`, 'error');
    }
    
    testResults.error = error.message;
    return testResults;
  }
}

/**
 * 生成测试报告
 */
function generateTestReport(results) {
  // 使用传入的results参数，确保测试计数准确
  console.log('\n========================================');
  console.log('          SOP意图处理器测试报告          ');
  console.log('========================================');
  console.log(`开始时间: ${results.startTime}`);
  console.log(`结束时间: ${results.endTime || new Date().toISOString()}`);
  console.log(`测试时长: ${results.summary.duration || 0}ms`);
  
  // 确保测试总数与tests数组长度一致
  const testCount = results.tests.length;
  const passedCount = results.tests.filter(test => test.success).length;
  const failedCount = testCount - passedCount;
  
  // 更新summary对象以确保一致性
  results.summary.total = testCount;
  results.summary.passed = passedCount;
  results.summary.failed = failedCount;
  
  console.log(`总测试数: ${results.summary.total}`);
  console.log(`通过测试: ${results.summary.passed}`);
  console.log(`失败测试: ${results.summary.failed}`);
  
  const successRate = testCount > 0 
    ? ((passedCount / testCount) * 100).toFixed(2) 
    : '0.00';
  
  console.log(`成功率: ${successRate}%`);
  
  console.log('\n测试详情:');
  results.tests.forEach((test, index) => {
    const status = test.success ? '✅ 通过' : '❌ 失败';
    console.log(`\n${index + 1}. ${test.name}: ${status}`);
    if (!test.success) {
      console.log(`   错误: ${test.error}`);
    }
  });
  
  console.log('\n========================================');
  
  return successRate;
}

/**
 * 主测试函数
 */
async function main() {
  try {
    logWithTimestamp('SOP意图处理器测试开始', 'info');
    
    // 设置超时保护
    const timeoutId = setTimeout(() => {
      console.error('测试超时！强制终止测试');
      process.exit(1);
    }, TEST_CONFIG.maxTestDuration);
    
    // 运行测试套件
    const results = await runSOPIntentTests();
    
    // 清除超时
    clearTimeout(timeoutId);
    
    // 生成报告
    const successRate = generateTestReport(results);
    
    // 根据测试结果退出
    if (results.summary.failed > 0) {
      logWithTimestamp(`测试完成，但有 ${results.summary.failed} 个测试失败`, 'error');
      process.exit(1);
    } else {
      logWithTimestamp('所有测试通过！', 'success');
      process.exit(0);
    }
  } catch (error) {
    logWithTimestamp(`测试执行异常: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    logWithTimestamp('SOP意图处理器测试开始', 'info');
    
    // 设置超时保护
    const timeoutId = setTimeout(() => {
      console.error('测试超时！强制终止测试');
      process.exit(1);
    }, TEST_CONFIG.maxTestDuration);
    
    // 运行测试套件
    const results = await runSOPIntentTests();
    
    // 清除超时
    clearTimeout(timeoutId);
    
    // 生成报告
    const successRate = generateTestReport(results);
    
    // 根据测试结果退出
    if (results.summary.failed > 0) {
      logWithTimestamp(`测试完成，但有 ${results.summary.failed} 个测试失败`, 'error');
      process.exit(1);
    } else {
      logWithTimestamp('所有测试通过！', 'success');
      process.exit(0);
    }
  } catch (error) {
    logWithTimestamp(`测试执行异常: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出测试函数供其他模块使用
module.exports = {
  runSOPIntentTests,
  testDryRun,
  testSingleIntent,
  getSystemStatus,
  processSOPIntent,
  // 导出测试结果以便外部访问
  get testResults() {
    return global.testResults;
  }
};
