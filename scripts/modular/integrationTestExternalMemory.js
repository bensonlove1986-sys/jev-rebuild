/**
 * 外部记忆模块集成测试
 * 测试从JEV.externalMemory到Worker的完整闭环系统
 */

// 等待JEV模块加载完成
function waitForJEV() {
  // Node.js环境下的模拟JEV对象
  if (typeof window === 'undefined') {
    logWithTimestamp('Node.js环境，使用模拟JEV对象');
    return Promise.resolve({
      externalMemory: {
        set: async () => {},
        get: async () => null,
        list: async () => [],
        del: async () => {},
        delete: async () => {},
        batchSet: async () => {},
        batchGet: async () => {},
        batchDel: async () => {},
        configure: () => {},
        healthCheck: async () => true
      }
    });
  }

  return new Promise((resolve, reject) => {
    // 立即检查是否已加载
    if (window.JEV && window.JEV.externalMemory) {
      logWithTimestamp('JEV已加载，立即返回');
      resolve(window.JEV);
      return;
    }

    logWithTimestamp('等待JEV模块加载...');
    const checkInterval = setInterval(() => {
      if (window.JEV && window.JEV.externalMemory) {
        clearInterval(checkInterval);
        logWithTimestamp('✅ JEV模块加载完成');
        resolve(window.JEV);
      }
    }, 100);
    
    // 超时处理
    setTimeout(() => {
      clearInterval(checkInterval);
      const error = new Error('JEV模块加载超时');
      logWithTimestamp(`❌ ${error.message}`, 'ERROR');
      reject(error);
    }, 15000);
  });
}

// 工具函数
function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[集成测试] [${timestamp}] [${level}] ${message}`;
  
  // 确保控制台可用
  if (typeof console !== 'undefined') {
    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else if (level === 'WARN') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }
  
  // 在浏览器环境中记录到测试日志元素
  if (typeof window !== 'undefined' && window.document) {
    try {
      const logElement = window.document.getElementById('log-output');
      if (logElement) {
        const logLine = document.createElement('div');
        logLine.textContent = formattedMessage;
        if (level === 'ERROR') {
          logLine.style.color = '#e53e3e';
        } else if (level === 'WARN') {
          logLine.style.color = '#ed8936';
        } else if (level === 'SUCCESS') {
          logLine.style.color = '#38a169';
        }
        logElement.appendChild(logLine);
        logElement.scrollTop = logElement.scrollHeight;
      }
    } catch (e) {
      // 忽略DOM操作错误
    }
  }
  
  return formattedMessage;
}

function generateTestId() {
  return `integration_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateResponse(response, expectedType = null) {
  if (expectedType && typeof response !== expectedType) {
    throw new Error(`响应类型验证失败: 期望 ${expectedType}，实际 ${typeof response}`);
  }
  return true;
}

// 清理测试数据
async function cleanupTestData(prefix) {
  try {
    const JEV = await waitForJEV();
    logWithTimestamp(`开始清理前缀为 ${prefix} 的测试数据`);
    
    const keys = await JEV.externalMemory.list();
    const testKeys = keys.filter(key => key.startsWith(prefix));
    
    if (testKeys.length > 0) {
      logWithTimestamp(`清理 ${testKeys.length} 个测试键`);
      await JEV.externalMemory.batchDel(testKeys);
    } else {
      logWithTimestamp('没有需要清理的测试数据');
    }
    
    return testKeys.length;
  } catch (error) {
    logWithTimestamp(`清理测试数据失败: ${error.message}`, 'WARN');
    return 0;
  }
}

/**
 * 压力测试函数
 * @param {number} iterations - 迭代次数
 * @param {number} concurrency - 并发数
 */
async function stressTest(iterations = 10, concurrency = 3) {
  logWithTimestamp(`开始压力测试 - ${iterations}次操作，${concurrency}个并发`);
  
  let JEV;
  try {
    JEV = await waitForJEV();
  } catch (error) {
    logWithTimestamp(`获取JEV实例失败: ${error.message}`, 'ERROR');
    throw error;
  }
  
  const testId = generateTestId();
  const batchSize = Math.ceil(iterations / concurrency);
  const promises = [];
  
  let successCount = 0;
  let failCount = 0;
  
  // 记录开始时间
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  for (let batch = 0; batch < concurrency; batch++) {
    const batchPromises = [];
    
    for (let i = 0; i < batchSize && (batch * batchSize + i) < iterations; i++) {
      const index = batch * batchSize + i;
      const key = `${testId}_stress_${index}`;
      const value = { batch, index, timestamp: Date.now(), random: Math.random() };
      
      // 混合操作类型
      const opType = index % 3;
      let operation;
      
      if (opType === 0) {
        operation = JEV.externalMemory.set(key, value)
          .then(() => { successCount++; return { type: 'set', key, success: true }; })
          .catch(err => { 
            failCount++; 
            logWithTimestamp(`压力测试set失败[${index}]: ${err.message}`, 'WARN');
            return { type: 'set', key, success: false, error: err.message }; 
          });
      } else if (opType === 1) {
        operation = JEV.externalMemory.get(key)
          .then(() => { successCount++; return { type: 'get', key, success: true }; })
          .catch(err => { 
            failCount++; 
            logWithTimestamp(`压力测试get失败[${index}]: ${err.message}`, 'WARN');
            return { type: 'get', key, success: false, error: err.message }; 
          });
      } else {
        // 确保有数据后再删除
        operation = JEV.externalMemory.set(key, value)
          .then(() => JEV.externalMemory.del(key))
          .then(() => { successCount++; return { type: 'setDel', key, success: true }; })
          .catch(err => { 
            failCount++; 
            logWithTimestamp(`压力测试setDel失败[${index}]: ${err.message}`, 'WARN');
            return { type: 'setDel', key, success: false, error: err.message }; 
          });
      }
      
      batchPromises.push(operation);
    }
    
    promises.push(Promise.all(batchPromises));
  }
  
  const results = await Promise.all(promises);
  const flattenedResults = results.flat();
  
  // 记录结束时间
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const duration = endTime - startTime;
  
  // 统计
  const stats = {
    total: flattenedResults.length,
    success: successCount,
    failed: failCount,
    successRate: Math.round((successCount / iterations) * 100),
    duration,
    operationsPerSecond: (iterations / (duration / 1000)).toFixed(2),
    set: flattenedResults.filter(r => r.type === 'set' && r.success).length,
    get: flattenedResults.filter(r => r.type === 'get' && r.success).length,
    setDel: flattenedResults.filter(r => r.type === 'setDel' && r.success).length
  };
  
  logWithTimestamp(`压力测试完成: ${stats.success}/${stats.total} 成功 (${stats.successRate}%)`);
  logWithTimestamp(`总耗时: ${stats.duration.toFixed(2)}ms, 每秒操作: ${stats.operationsPerSecond}`);
  logWithTimestamp(`操作分布: set=${stats.set}, get=${stats.get}, setDel=${stats.setDel}`);
  
  // 清理测试数据
  try {
    const keys = flattenedResults
      .filter(r => r.key && r.success)
      .map(r => r.key);
    
    if (keys.length > 0) {
      await JEV.externalMemory.batchDel(keys);
      logWithTimestamp(`压力测试数据已清理: ${keys.length} 个键`);
    }
  } catch (cleanupError) {
    logWithTimestamp(`清理压力测试数据失败: ${cleanupError.message}`, 'WARN');
  }
  
  return stats;
}

/**
 * 恢复功能测试
 * 测试在网络波动情况下系统的恢复能力
 */
async function resilienceTest() {
  logWithTimestamp('开始恢复功能测试');
  
  let JEV;
  try {
    JEV = await waitForJEV();
  } catch (error) {
    logWithTimestamp(`获取JEV实例失败: ${error.message}`, 'ERROR');
    throw error;
  }
  
  const testId = generateTestId();
  const testKey = `${testId}_resilience`;
  
  // 保存原始配置
  const originalConfig = JEV.externalMemory.config ? { ...JEV.externalMemory.config } : {};
  
  try {
    // 先设置一个基准值
    logWithTimestamp('设置基准测试数据');
    await JEV.externalMemory.set(testKey, { base: true, timestamp: Date.now() });
    
    // 临时降低超时以模拟网络不稳定
    logWithTimestamp('临时调整配置测试恢复能力');
    JEV.externalMemory.configure({ timeout: 1000, maxRetries: 1 });
    
    // 模拟网络不稳定场景（多次快速操作）
    const quickOps = [];
    for (let i = 0; i < 8; i++) {
      quickOps.push(
        JEV.externalMemory.set(`${testKey}_quick_${i}`, { quick: true, index: i })
          .catch(err => logWithTimestamp(`快速操作${i}失败（预期可能发生）: ${err.message}`, 'WARN'))
      );
    }
    
    await Promise.all(quickOps);
    
    // 短暂延迟让系统有恢复时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 恢复正常配置
    logWithTimestamp('恢复正常配置');
    JEV.externalMemory.configure({ ...originalConfig, timeout: 10000, maxRetries: 3 });
    
    // 验证基本功能仍然可用
    logWithTimestamp('验证系统恢复后功能正常');
    const recoveredData = await JEV.externalMemory.get(testKey);
    validateResponse(recoveredData, 'object');
    
    if (recoveredData.base !== true) {
      throw new Error('基准数据不一致');
    }
    
    logWithTimestamp('恢复功能测试完成 - 系统成功恢复', 'SUCCESS');
    return true;
  } finally {
    // 清理测试数据
    try {
      await JEV.externalMemory.del(testKey);
      for (let i = 0; i < 8; i++) {
        await JEV.externalMemory.del(`${testKey}_quick_${i}`).catch(() => {});
      }
      logWithTimestamp('恢复功能测试数据已清理');
    } catch (cleanupError) {
      logWithTimestamp(`清理恢复测试数据失败: ${cleanupError.message}`, 'WARN');
    }
  }
}

/**
 * 数据一致性测试
 */
async function consistencyTest() {
  logWithTimestamp('开始数据一致性测试');
  
  let JEV;
  try {
    JEV = await waitForJEV();
  } catch (error) {
    logWithTimestamp(`获取JEV实例失败: ${error.message}`, 'ERROR');
    throw error;
  }
  
  const testId = generateTestId();
  const testData = {
    string: '这是一个测试字符串',
    number: Math.PI,
    boolean: true,
    null: null,
    array: [1, 2, 3, 'test', { nested: 'value' }],
    object: {
      level1: {
        level2: {
          level3: 'deep value'
        }
      }
    },
    date: new Date().toISOString()
  };
  
  const testKey = `${testId}_consistency`;
  
  try {
    // 存储复杂数据
    logWithTimestamp('存储复杂嵌套数据结构');
    await JEV.externalMemory.set(testKey, testData);
    
    // 多次获取验证一致性
    let allConsistent = true;
    for (let i = 0; i < 5; i++) {
      logWithTimestamp(`第${i+1}次获取数据验证一致性`);
      const retrievedData = await JEV.externalMemory.get(testKey);
      
      // 深度比较
      const isEqual = JSON.stringify(retrievedData) === JSON.stringify(testData);
      if (!isEqual) {
        logWithTimestamp('❌ 数据不一致', 'ERROR');
        allConsistent = false;
        break;
      }
    }
    
    if (!allConsistent) {
      throw new Error('数据一致性验证失败');
    }
    
    logWithTimestamp('✅ 数据一致性测试通过', 'SUCCESS');
    return true;
  } finally {
    // 清理
    try {
      await JEV.externalMemory.del(testKey);
      logWithTimestamp('数据一致性测试数据已清理');
    } catch (cleanupError) {
      logWithTimestamp(`清理一致性测试数据失败: ${cleanupError.message}`, 'WARN');
    }
  }
}

/**
 * 批量操作性能测试
 */
async function batchPerformanceTest() {
  logWithTimestamp('开始批量操作性能测试');
  
  let JEV;
  try {
    JEV = await waitForJEV();
  } catch (error) {
    logWithTimestamp(`获取JEV实例失败: ${error.message}`, 'ERROR');
    throw error;
  }
  
  const testId = generateTestId();
  const batchSize = 15; // 增加批量大小以更好地测试性能
  
  // 准备批量数据
  const batchData = {};
  const keys = [];
  
  for (let i = 0; i < batchSize; i++) {
    const key = `${testId}_batch_${i}`;
    keys.push(key);
    batchData[key] = { 
      index: i, 
      batch: testId,
      timestamp: Date.now(),
      testData: { nested: { data: `测试数据 ${i}` } }
    };
  }
  
  try {
    // 测试批量存储
    logWithTimestamp(`测试批量存储 ${batchSize} 条数据`);
    const setStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const setResults = await JEV.externalMemory.batchSet(batchData);
    const setEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const setTime = setEnd - setStart;
    
    logWithTimestamp(`批量存储耗时: ${setTime.toFixed(2)}ms`);
    
    // 测试批量获取
    logWithTimestamp(`测试批量获取 ${batchSize} 条数据`);
    const getStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const getResults = await JEV.externalMemory.batchGet(keys);
    const getEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const getTime = getEnd - getStart;
    
    logWithTimestamp(`批量获取耗时: ${getTime.toFixed(2)}ms`);
    
    // 验证数据完整性
    let validCount = 0;
    for (const key of keys) {
      if (getResults[key] && getResults[key].index !== undefined) {
        validCount++;
      }
    }
    
    logWithTimestamp(`数据完整性验证: ${validCount}/${batchSize} 条数据有效`);
    
    // 测试批量删除
    logWithTimestamp(`测试批量删除 ${batchSize} 条数据`);
    const delStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const delResults = await JEV.externalMemory.batchDel(keys);
    const delEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const delTime = delEnd - delStart;
    
    logWithTimestamp(`批量删除耗时: ${delTime.toFixed(2)}ms`);
    
    // 验证删除
    const verifyGet = await JEV.externalMemory.batchGet(keys);
    const remainingCount = Object.values(verifyGet).filter(v => v !== null).length;
    
    if (remainingCount > 0) {
      logWithTimestamp(`警告: 批量删除后仍有 ${remainingCount} 条数据存在`, 'WARN');
    }
    
    // 性能分析
    const avgSetTime = setTime / batchSize;
    const avgGetTime = getTime / batchSize;
    const avgDelTime = delTime / batchSize;
    
    logWithTimestamp(`性能分析 - 平均每条: 设置=${avgSetTime.toFixed(2)}ms, 获取=${avgGetTime.toFixed(2)}ms, 删除=${avgDelTime.toFixed(2)}ms`);
    
    return {
      batchSize,
      setTime,
      getTime,
      delTime,
      validCount,
      remainingCount: remainingCount || 0
    };
  } finally {
    // 额外清理确保所有数据都被删除
    try {
      await JEV.externalMemory.batchDel(keys);
      logWithTimestamp('批量测试数据已清理');
    } catch (cleanupError) {
      logWithTimestamp(`清理批量测试数据失败: ${cleanupError.message}`, 'WARN');
    }
  }
}

/**
 * 完整的集成测试套件
 */
async function runIntegrationTests() {
  logWithTimestamp('========== 开始外部记忆模块集成测试 ==========');
  
  let JEV;
  const results = {
    config: false,
    health: false,
    basic: false,
    batch: false,
    consistency: false,
    resilience: false,
    stress: false
  };
  
  // 测试配置
  const testConfig = {
    iterations: 20,
    concurrency: 4
  };
  
  // 记录测试开始时间
  const testStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  try {
    // 1. 等待JEV加载
    logWithTimestamp('阶段1: 等待JEV模块加载');
    JEV = await waitForJEV();
    logWithTimestamp('✅ JEV模块加载成功');
    
    // 2. 配置测试
    logWithTimestamp('阶段2: 配置模块测试');
    JEV.externalMemory.configure({
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000
    });
    logWithTimestamp('✅ 模块配置成功');
    results.config = true;
    
    // 3. 健康检查
    logWithTimestamp('阶段3: 健康检查测试');
    const healthStatus = await JEV.externalMemory.healthCheck();
    logWithTimestamp(`✅ 健康检查: ${healthStatus ? '服务可用' : '服务不可用'}`);
    results.health = healthStatus;
    
    if (!healthStatus) {
      throw new Error('健康检查失败，服务不可用');
    }
    
    // 4. 基本操作测试
    logWithTimestamp('阶段4: 基本操作测试');
    const testId = generateTestId();
    const testKey = `${testId}_basic`;
    const testValue = { 
      message: '集成测试', 
      timestamp: Date.now(),
      complex: { nested: 'data' }
    };
    
    await JEV.externalMemory.set(testKey, testValue);
    logWithTimestamp('✅ 基本set操作成功');
    
    const getValue = await JEV.externalMemory.get(testKey);
    validateResponse(getValue, 'object');
    
    // 验证获取的数据是否与存储的数据一致
    const isEqual = JSON.stringify(getValue) === JSON.stringify(testValue);
    if (!isEqual) {
      throw new Error('获取的数据与存储的数据不一致');
    }
    logWithTimestamp('✅ 基本get操作成功');
    
    const allKeys = await JEV.externalMemory.list();
    validateResponse(allKeys, 'array');
    logWithTimestamp(`✅ 基本list操作成功，获取到 ${allKeys.length} 个键`);
    
    // 同时测试del和delete方法
    await JEV.externalMemory.del(testKey);
    logWithTimestamp('✅ 基本del操作成功');
    
    const deletedCheck = await JEV.externalMemory.get(testKey);
    if (deletedCheck !== null) {
      throw new Error('删除验证失败');
    }
    logWithTimestamp('✅ 删除验证成功');
    
    results.basic = true;
    
    // 5. 批量操作测试
    logWithTimestamp('阶段5: 批量操作测试');
    const batchStats = await batchPerformanceTest();
    
    // 验证批量操作的有效性
    if (batchStats.validCount < batchStats.batchSize * 0.9) { // 允许90%以上的成功率
      throw new Error(`批量操作数据完整性不足: ${batchStats.validCount}/${batchStats.batchSize}`);
    }
    
    logWithTimestamp(`✅ 批量操作测试完成: ${batchStats.validCount}/${batchStats.batchSize} 数据有效`);
    results.batch = true;
    
    // 6. 数据一致性测试
    logWithTimestamp('阶段6: 数据一致性测试');
    await consistencyTest();
    results.consistency = true;
    
    // 7. 恢复功能测试
    logWithTimestamp('阶段7: 恢复功能测试');
    await resilienceTest();
    results.resilience = true;
    
    // 8. 压力测试
    logWithTimestamp('阶段8: 压力测试');
    const stressStats = await stressTest(testConfig.iterations, testConfig.concurrency);
    
    // 压力测试通过标准：成功率大于80%
    const stressPass = stressStats.successRate >= 80;
    results.stress = stressPass;
    
    if (!stressPass) {
      logWithTimestamp(`⚠️ 压力测试成功率不足: ${stressStats.successRate}%`, 'WARN');
    }
    
    // 总结结果
    logWithTimestamp('\n========== 集成测试总结 ==========');
    logWithTimestamp(`配置测试: ${results.config ? '✅ 通过' : '❌ 失败'}`);
    logWithTimestamp(`健康检查: ${results.health ? '✅ 通过' : '❌ 失败'}`);
    logWithTimestamp(`基本操作: ${results.basic ? '✅ 通过' : '❌ 失败'}`);
    logWithTimestamp(`批量操作: ${results.batch ? '✅ 通过' : '❌ 失败'}`);
    logWithTimestamp(`数据一致性: ${results.consistency ? '✅ 通过' : '❌ 失败'}`);
    logWithTimestamp(`恢复功能: ${results.resilience ? '✅ 通过' : '❌ 失败'}`);
    logWithTimestamp(`压力测试: ${results.stress ? '✅ 通过' : '❌ 失败'}`);
    
    // 记录总耗时
    const testEndTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const totalDuration = testEndTime - testStartTime;
    logWithTimestamp(`总测试耗时: ${totalDuration.toFixed(2)}ms`);
    
    const overallSuccess = Object.values(results).every(result => result);
    
    const summary = overallSuccess 
      ? `🎉 集成测试全部通过！总耗时: ${totalDuration.toFixed(2)}ms` 
      : `⚠️ 集成测试部分失败，通过: ${Object.values(results).filter(r => r).length}/7 项`;
    
    logWithTimestamp(`\n总体结果: ${summary}`);
    
    return {
      success: overallSuccess,
      results,
      stats: {
        duration: totalDuration,
        stressStats
      },
      summary
    };
    
  } catch (error) {
    logWithTimestamp(`❌ 集成测试过程中发生错误: ${error.message}`, 'ERROR');
    
    // 详细记录错误堆栈
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      for (const line of stackLines) {
        logWithTimestamp(`  ${line.trim()}`, 'ERROR');
      }
    }
    
    return {
      success: false,
      error: error.message,
      results,
      summary: `集成测试失败: ${error.message}`
    };
  } finally {
    logWithTimestamp('========== 集成测试结束 ==========');
  }
}

// 兼容所有模块系统的导出
// 支持ES模块导出
try {
  // CommonJS环境
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runIntegrationTests };
  }
  
  // ESM环境
  if (typeof exports !== 'undefined') {
    exports.runIntegrationTests = runIntegrationTests;
  }
  
  // 浏览器全局变量
  if (typeof window !== 'undefined') {
    window.ExternalMemoryIntegrationTest = {
      run: runIntegrationTests,
      version: '1.0.0'
    };
    
    logWithTimestamp('集成测试套件已加载到全局变量 ExternalMemoryIntegrationTest');
    logWithTimestamp('使用方法: ExternalMemoryIntegrationTest.run()');
  }
} catch (exportError) {
  logWithTimestamp(`导出测试函数失败: ${exportError.message}`, 'WARN');
}

// 浏览器环境下的行为
if (typeof window !== 'undefined') {
  // 避免自动运行测试，让用户手动触发
  // 只在控制台提示如何运行测试
  console.log('==================================================');
  console.log('外部记忆模块集成测试就绪');
  console.log('运行测试: ExternalMemoryIntegrationTest.run()');
  console.log('通过JEV运行: JEV.externalMemory.test.runIntegration()');
  console.log('==================================================');
}

// Node.js环境下直接运行
if (typeof require !== 'undefined' && require.main === module) {
  logWithTimestamp('Node.js环境: 直接运行集成测试');
  
  (async () => {
    try {
      const results = await runIntegrationTests();
      
      if (!results.success) {
        logWithTimestamp('❌ 测试失败，退出代码1', 'ERROR');
        process.exit(1);
      } else {
        logWithTimestamp('✅ 测试成功，退出代码0', 'SUCCESS');
        process.exit(0);
      }
    } catch (error) {
      logWithTimestamp(`运行测试时发生错误: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  })();
}

// 确保ESM环境也能正确导出
try {
  if (typeof exports !== 'undefined') {
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "runIntegrationTests", { 
      enumerable: true, 
      get: () => runIntegrationTests 
    });
  }
} catch (e) {
  // 忽略定义属性时的错误
}

// 显式ESM导出
export { runIntegrationTests };