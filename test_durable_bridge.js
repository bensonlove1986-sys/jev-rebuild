/**
 * JEV L6.9 Durable Bridge 测试脚本
 * 验证同步功能和报告功能是否正常工作
 */

const https = require('https');

// 配置
const CONFIG = {
  baseUrl: 'https://jevshop.bensonlove1986.workers.dev',
  masterKey: 'default_jev_master_key', // 默认测试密钥
  bridgeId: 'DurableSyncBridge',
  testSessionId: 'test-session-' + Date.now()
};

/**
 * 发送HTTP请求
 * @param {string} endpoint - 端点路径
 * @param {string} method - HTTP方法
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>} 响应数据
 */
async function sendRequest(endpoint, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(CONFIG.baseUrl).hostname,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-JEV-Token': CONFIG.masterKey,
        'X-Bridge-ID': CONFIG.bridgeId
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          reject(new Error('解析响应失败: ' + error.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error('请求失败: ' + error.message));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * 测试同步功能
 */
async function testSync() {
  console.log('\n=== 测试会话同步功能 ===');
  
  try {
    const testMemory = {
      lastMsg: '这是一条测试消息',
      lang: 'zh-CN',
      context: 'test_environment',
      testTimestamp: new Date().toISOString()
    };
    
    console.log(`发送同步请求到 /bridge/sync`);
    console.log(`会话ID: ${CONFIG.testSessionId}`);
    console.log(`测试数据:`, testMemory);
    
    const response = await sendRequest('/bridge/sync', 'POST', {
      sessionId: CONFIG.testSessionId,
      memory: testMemory
    });
    
    console.log(`\n响应状态: ${response.statusCode}`);
    console.log(`响应数据:`, response.data);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ 同步测试成功!');
      return true;
    } else {
      console.log('❌ 同步测试失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 同步测试发生错误:', error.message);
    return false;
  }
}

/**
 * 测试报告功能
 */
async function testReport() {
  console.log('\n=== 测试报告提交功能 ===');
  
  try {
    const testReport = {
      synced_sessions: 5,
      avg_latency_ms: 243,
      success_rate: 98.7,
      offline_replays: 1,
      pending_cache: 0,
      last_sync: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    console.log(`发送报告到 /bridge/report`);
    console.log(`报告数据:`, testReport);
    
    const response = await sendRequest('/bridge/report', 'POST', testReport);
    
    console.log(`\n响应状态: ${response.statusCode}`);
    console.log(`响应数据:`, response.data);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ 报告测试成功!');
      return true;
    } else {
      console.log('❌ 报告测试失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 报告测试发生错误:', error.message);
    return false;
  }
}

/**
 * 测试无效认证
 */
async function testInvalidAuth() {
  console.log('\n=== 测试无效认证 ===');
  
  try {
    // 临时修改密钥为无效值
    const originalKey = CONFIG.masterKey;
    CONFIG.masterKey = 'invalid_key';
    
    const response = await sendRequest('/bridge/sync', 'POST', {
      sessionId: 'test-invalid',
      memory: { test: 'invalid' }
    });
    
    // 恢复原始密钥
    CONFIG.masterKey = originalKey;
    
    console.log(`响应状态: ${response.statusCode}`);
    console.log(`响应数据:`, response.data);
    
    if (response.statusCode === 200 && !response.data.success && response.data.error.includes('认证失败')) {
      console.log('✅ 无效认证测试通过!');
      return true;
    } else {
      console.log('❌ 无效认证测试失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 无效认证测试发生错误:', error.message);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('========================================');
  console.log('JEV L6.9 Durable Bridge 功能测试开始');
  console.log('========================================');
  
  let syncSuccess = false;
  let reportSuccess = false;
  let authTestSuccess = false;
  
  try {
    // 运行各项测试
    syncSuccess = await testSync();
    reportSuccess = await testReport();
    authTestSuccess = await testInvalidAuth();
    
  } catch (error) {
    console.error('\n❌ 测试执行过程中发生未捕获的错误:', error);
  }
  
  // 总结报告
  console.log('\n========================================');
  console.log('测试总结报告:');
  console.log(`✅ 会话同步测试: ${syncSuccess ? '通过' : '失败'}`);
  console.log(`✅ 报告提交测试: ${reportSuccess ? '通过' : '失败'}`);
  console.log(`✅ 安全认证测试: ${authTestSuccess ? '通过' : '失败'}`);
  
  const allPassed = syncSuccess && reportSuccess && authTestSuccess;
  console.log('\n总体结果:', allPassed ? '🎉 所有测试通过!' : '⚠️ 部分测试失败');
  console.log('========================================');
  
  return allPassed;
}

// 执行测试
if (require.main === module) {
  runAllTests();
}

// 导出测试函数供其他模块使用
module.exports = {
  runAllTests,
  testSync,
  testReport,
  testInvalidAuth
};