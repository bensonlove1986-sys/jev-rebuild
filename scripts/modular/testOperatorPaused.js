/**
 * testOperatorPaused.js
 * 测试operator.js的暂停功能
 */

// 保存原始的stdin
const originalStdin = process.stdin;

// 模拟用户输入 'Y'
const mockStdin = new require('stream').Readable();
mockStdin._read = () => {};
process.stdin = mockStdin;

// 直接修改operator.js的全局变量
const operatorModule = require('./operator.js');

// 注入模拟的ExternalMemory
const mockStore = {};
operatorModule.ExternalMemory = {
  async get(key, options = {}) {
    const ns = options.ns || 'default';
    const fullKey = `${ns}:${key}`;
    console.log(`Mock ExternalMemory get: ${fullKey}`);
    return mockStore[fullKey];
  },
  async set(key, value, options = {}) {
    const ns = options.ns || 'default';
    const fullKey = `${ns}:${key}`;
    console.log(`Mock ExternalMemory set: ${fullKey}`);
    mockStore[fullKey] = value;
    return { success: true };
  },
  async list(options = {}) {
    const ns = options.ns || 'default';
    return Object.keys(mockStore).filter(key => key.startsWith(`${ns}:`));
  }
};

// 直接修改operator.js中的函数
const fs = require('fs');
const path = require('path');
const operatorPath = path.join(__dirname, 'operator.js');
let operatorCode = fs.readFileSync(operatorPath, 'utf8');

// 修改promptUser函数为自动返回'Y'
operatorCode = operatorCode.replace(
  'function promptUser(question) { \n  return new Promise((resolve) => { \n    process.stdout.write(question); \n    process.stdin.once("data", (data) => resolve(data.toString().trim())); \n  }); \n}',
  'function promptUser(question) { \n  console.log(question + " (自动确认: Y)"); \n  return Promise.resolve("Y"); \n}'
);

// 临时写入修改后的代码
fs.writeFileSync(operatorPath, operatorCode);

// 重新加载模块
delete require.cache[require.resolve('./operator.js')];
const { executeTask } = require('./operator.js');

// 测试函数
async function runTests() {
  console.log('=== 开始测试operator暂停功能 ===');
  
  try {
    // 重置模拟存储
    Object.keys(mockStore).forEach(key => delete mockStore[key]);
    
    // 设置未暂停的策略
    await operatorModule.ExternalMemory.set('security_policy', {
      paused: false,
      allowedActions: ["open", "move", "click", "type", "capture", "read", "write"],
      tokenWhitelist: ["TREA_MAIN", "WORKER_OP"],
      confirmBeforeExecute: true
    }, { ns: 'security' });
    
    console.log('\n=== 测试1: 系统未暂停 ===');
    // 模拟fetch函数
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ success: true, result: 'mock success' })
    });
    
    const result1 = await executeTask({
      id: `test_${Date.now()}_1`,
      token: 'TREA_MAIN',
      action: 'open',
      data: { app: 'notepad.exe' }
    });
    console.log('测试1结果:', result1);
    
    console.log('\n=== 测试2: 系统暂停 ===');
    // 设置暂停的策略
    await operatorModule.ExternalMemory.set('security_policy', {
      paused: true,
      allowedActions: ["open", "move", "click", "type", "capture", "read", "write"],
      tokenWhitelist: ["TREA_MAIN", "WORKER_OP"]
    }, { ns: 'security' });
    
    const result2 = await executeTask({
      id: `test_${Date.now()}_2`,
      token: 'TREA_MAIN',
      action: 'open',
      data: { app: 'notepad.exe' }
    });
    console.log('测试2结果:', result2);
    
    // 验证等待队列
    const waitQueue = await operatorModule.ExternalMemory.get('wait_queue', { ns: 'security' });
    console.log('等待队列内容:', waitQueue);
    
    // 验证结果
    if (result2.queued === true && result2.message.includes('系统已暂停') && waitQueue && waitQueue.length > 0) {
      console.log('\n✅ 测试通过: 系统暂停时任务被正确添加到等待队列');
    } else {
      console.log('\n❌ 测试失败: 系统暂停时任务处理不正确');
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    // 恢复原始stdin
    process.stdin = originalStdin;
    // 恢复原始operator.js
    fs.writeFileSync(operatorPath, operatorCode.replace(
      'function promptUser(question) { \n  console.log(question + " (自动确认: Y)"); \n  return Promise.resolve("Y"); \n}',
      'function promptUser(question) { \n  return new Promise((resolve) => { \n    process.stdout.write(question); \n    process.stdin.once("data", (data) => resolve(data.toString().trim())); \n  }); \n}'
    ));
    console.log('\n=== 测试完成，环境已恢复 ===');
  }
}

// 执行测试
runTests();
