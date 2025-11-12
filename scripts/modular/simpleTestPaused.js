/**
 * simpleTestPaused.js
 * 简单测试operator.js的暂停功能
 */

// 简单直接的测试，避免复杂的模拟
const fs = require('fs');
const path = require('path');

// 读取并修改operator.js，使其能够直接测试paused功能
function prepareOperatorForTest() {
  const operatorPath = path.join(__dirname, 'operator.js');
  let code = fs.readFileSync(operatorPath, 'utf8');
  
  // 替换loadSecurityPolicy函数为直接返回指定策略的版本
  const mockLoadSecurityPolicy = `
async function loadSecurityPolicy() {
  console.log('[测试模式] 加载安全策略:', global.testPolicy);
  return global.testPolicy || SECURITY_POLICY;
}`;
  
  code = code.replace(/async function loadSecurityPolicy\([^)]*\) \{[^}]*\}/s, mockLoadSecurityPolicy);
  
  // 替换promptUser函数为自动返回Y
  code = code.replace(
    'function promptUser(question) { \n  return new Promise((resolve) => { \n    process.stdout.write(question); \n    process.stdin.once("data", (data) => resolve(data.toString().trim())); \n  }); \n}',
    'function promptUser(question) { \n  console.log(question + " (自动确认: Y)"); \n  return Promise.resolve("Y"); \n}'
  );
  
  // 替换addToWaitQueue为简单的内存队列
  global.waitQueue = [];
  const mockAddToWaitQueue = `
async function addToWaitQueue(task) {
  const queuedTask = {
    ...task,
    queuedAt: new Date().toISOString(),
    status: 'queued'
  };
  global.waitQueue.push(queuedTask);
  console.log('[测试模式] 任务已添加到等待队列:', task.id, '队列长度:', global.waitQueue.length);
  return true;
}`;
  
  code = code.replace(/async function addToWaitQueue\([^)]*\) \{[^}]*\}/s, mockAddToWaitQueue);
  
  // 写入临时版本
  const tempPath = path.join(__dirname, 'operator_test.js');
  fs.writeFileSync(tempPath, code);
  
  return tempPath;
}

async function runSimpleTest() {
  console.log('=== 简单测试 operator 暂停功能 ===');
  
  try {
    // 准备测试版本的operator
    const tempPath = prepareOperatorForTest();
    
    // 测试1: 系统未暂停
    console.log('\n=== 测试1: 系统未暂停 ===');
    global.testPolicy = {
      paused: false,
      allowedActions: ["open", "move", "click", "type", "capture", "read", "write"],
      tokenWhitelist: ["TREA_MAIN", "WORKER_OP"],
      confirmBeforeExecute: true
    };
    
    // 清空模块缓存并加载测试版本
    delete require.cache[require.resolve(tempPath)];
    const { executeTask } = require(tempPath);
    
    const result1 = await executeTask({
      id: 'test_unpaused',
      token: 'TREA_MAIN',
      action: 'open',
      data: { app: 'notepad.exe' }
    });
    
    console.log('测试1结果:', result1);
    console.log('等待队列长度:', global.waitQueue.length);
    
    // 测试2: 系统暂停
    console.log('\n=== 测试2: 系统暂停 ===');
    global.testPolicy = {
      paused: true,
      allowedActions: ["open", "move", "click", "type", "capture", "read", "write"],
      tokenWhitelist: ["TREA_MAIN", "WORKER_OP"]
    };
    
    // 重新加载以获取最新的策略设置
    delete require.cache[require.resolve(tempPath)];
    const { executeTask: executeTask2 } = require(tempPath);
    
    const result2 = await executeTask2({
      id: 'test_paused',
      token: 'TREA_MAIN',
      action: 'open',
      data: { app: 'notepad.exe' }
    });
    
    console.log('测试2结果:', result2);
    console.log('等待队列长度:', global.waitQueue.length);
    console.log('等待队列内容:', global.waitQueue);
    
    // 验证结果
    if (result2.queued === true && result2.message.includes('系统已暂停') && global.waitQueue.length === 1) {
      console.log('\n✅ 测试通过: 系统暂停时任务被正确添加到等待队列');
    } else {
      console.log('\n❌ 测试失败: 系统暂停时任务处理不正确');
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    // 清理临时文件
    try {
      fs.unlinkSync(path.join(__dirname, 'operator_test.js'));
    } catch (e) {
      // 忽略删除错误
    }
    console.log('\n=== 测试完成 ===');
  }
}

// 执行测试
runSimpleTest();
