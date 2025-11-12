/** 
 * operator.js 
 * L3.5闭环执行系统 - 安全任务调度与执行管理中�? * 增强功能：自动确�?+ 自动截图回传 + 失败重试 + Evolver记录学习
 */ 
// 使用Node.js原生模块
const https = require('https');
const http = require('http');
const { setTimeout } = require('timers/promises');

// 简单的fetch替代实现
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        // 模拟Response对象
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        };
        resolve(response);
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// === 配置 === 
let SECURITY_POLICY = { 
  allowedActions: ["open", "move", "click", "type", "capture", "read", "write"], 
  tokenWhitelist: ["TREA_MAIN", "WORKER_OP"], 
  confirmBeforeExecute: false, // L3.5: 默认启用自动确认
  autoConfirm: true, // L3.5: 自动确认模式
  autoScreenshot: true, // L3.5: 自动截图回传
  retryOnFailure: true, // L3.5: 失败重试
  maxRetryAttempts: 3, // L3.5: 最大重试次�?  retryDelay: 2000, // L3.5: 重试延迟(ms)
  evolverLearning: true, // L3.5: Evolver学习模式
  logToMemory: true,
  paused: false, // 默认不暂�?  autoLockAfterFailures: 3,
  desktopAgentEndpoint: "http://localhost:1820/execute", // �?PowerShell 提供 
  memoryAPI: "https://treamemory.bensonlove1986.workers.dev/memory",
  evolverAPI: "https://treamemory.bensonlove1986.workers.dev/memory/evolver", // L3.5: Evolver API
};

// === ExternalMemory 支持 ===
global.ExternalMemory = null;
let ExternalMemory;
try {
  // 尝试加载 ExternalMemory 模块
  if (typeof require !== 'undefined') {
    const memoryModule = require('./externalMemory.js');
    ExternalMemory = memoryModule.ExternalMemory || memoryModule.default;
    global.ExternalMemory = ExternalMemory; // 暴露到全局以便测试
  }
} catch (e) {
  console.warn("ExternalMemory 模块加载失败，将使用默认策略:", e.message);
  // 创建备用的模拟ExternalMemory
  ExternalMemory = {
    async get(key, options = {}) {
      console.log(`模拟 ExternalMemory.get: ${key}`, options);
      return null;
    },
    async set(key, value, options = {}) {
      console.log(`模拟 ExternalMemory.set: ${key}`, options);
      return { success: true };
    }
  };
  global.ExternalMemory = ExternalMemory;
}

// === 基础工具 === 
async function loadSecurityPolicy() {
  try {
    // 优先使用 ExternalMemory 读取策略
    if (ExternalMemory) {
      const policy = await ExternalMemory.get('security_policy', { ns: 'security' });
      if (policy) {
        console.log("�?ExternalMemory 加载安全策略成功");
        return { ...SECURITY_POLICY, ...policy };
      }
    }
    
    // 尝试通过 API 获取策略
    const response = await fetch(`${SECURITY_POLICY.memoryAPI}/get?ns=security&key=security_policy`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.value) {
        console.log("�?API 加载安全策略成功");
        return { ...SECURITY_POLICY, ...data.value };
      }
    }
  } catch (e) {
    console.warn("加载安全策略失败，使用默认策�?", e.message);
  }
  return SECURITY_POLICY;
}

async function logToMemory(entry) { 
  if (!SECURITY_POLICY.logToMemory) return; 
  try { 
    await fetch(`${SECURITY_POLICY.memoryAPI}/set?ns=operator_log`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
        key: `log_${Date.now()}`, 
        value: entry, 
      }), 
    }); 
  } catch (e) {
    // 尝试使用 ExternalMemory 记录日志
    if (ExternalMemory) {
      try {
        await ExternalMemory.set(`log_${Date.now()}`, entry, { ns: 'operator_log' });
      } catch (memError) {
        console.warn("ExternalMemory 日志写入失败:", memError.message);
      }
    }
    console.warn("API 日志写入失败:", e.message); 
  } 
}

async function addToWaitQueue(task) {
  try {
    console.log(`[addToWaitQueue] 开始添加任�? ${task.id}`);
    const waitQueueKey = 'wait_queue';
    let waitQueue = [];
    
    // 获取现有等待队列 - 更可靠的错误处理
    try {
      if (ExternalMemory) {
        console.log(`[addToWaitQueue] �?ExternalMemory 获取等待队列`);
        const existingQueue = await ExternalMemory.get(waitQueueKey, { ns: 'security' });
        if (Array.isArray(existingQueue)) {
          waitQueue = existingQueue;
        } else {
          console.log(`[addToWaitQueue] 等待队列不存在或格式错误，创建新队列`);
          waitQueue = [];
        }
      } else {
        // API模式的降级处�?        console.log(`[addToWaitQueue] ExternalMemory 不可用，跳过获取现有队列`);
      }
    } catch (getError) {
      console.warn(`[addToWaitQueue] 获取等待队列失败，使用空队列:`, getError.message);
      waitQueue = [];
    }
    
    // 添加到等待队�?    const queuedTask = {
      ...task,
      queuedAt: new Date().toISOString(),
      status: 'queued'
    };
    waitQueue.push(queuedTask);
    console.log(`[addToWaitQueue] 任务已添加到内存队列，当前长�? ${waitQueue.length}`);
    
    // 保存更新后的等待队列
    let saveSuccess = false;
    if (ExternalMemory) {
      try {
        console.log(`[addToWaitQueue] 保存等待队列�?ExternalMemory`);
        await ExternalMemory.set(waitQueueKey, waitQueue, { ns: 'security' });
        saveSuccess = true;
      } catch (setError) {
        console.error(`[addToWaitQueue] 保存�?ExternalMemory 失败:`, setError.message);
      }
    }
    
    // 如果 ExternalMemory 保存失败，尝�?API 方式
    if (!saveSuccess && SECURITY_POLICY && SECURITY_POLICY.memoryAPI) {
      try {
        console.log(`[addToWaitQueue] 尝试通过 API 保存等待队列`);
        await fetch(`${SECURITY_POLICY.memoryAPI}/set?ns=security`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: waitQueueKey, value: waitQueue })
        });
        saveSuccess = true;
      } catch (apiError) {
        console.error(`[addToWaitQueue] API 保存失败:`, apiError.message);
      }
    }
    
    // 即使保存失败，也返回成功，因为任务已在内存中排队
    console.log(`[addToWaitQueue] 任务 ${task.id} 排队${saveSuccess ? '并保�? : ''}完成`);
    return true;
  } catch (e) {
    console.error("[addToWaitQueue] 整体处理失败:", e.message);
    return false;
  }
}

function isAllowed(action, token) { 
  return ( 
    SECURITY_POLICY.allowedActions.includes(action) && 
    SECURITY_POLICY.tokenWhitelist.includes(token) 
  ); 
}

// L3.5: 自动截图功能
async function captureScreenshot(taskId) {
  try {
    console.log(`[captureScreenshot] 开始执行自动截�? ${taskId}`);
    const captureResult = await fetch(SECURITY_POLICY.desktopAgentEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `capture_${taskId}`,
        action: "capture",
        data: ""
      }),
    });
    const captureData = await captureResult.json();
    console.log(`[captureScreenshot] 截图结果:`, captureData);
    return captureData;
  } catch (error) {
    console.error(`[captureScreenshot] 截图失败:`, error.message);
    return null;
  }
}

// L3.5: Evolver学习记录
async function recordForEvolver(task, result, screenshotResult) {
  if (!SECURITY_POLICY.evolverLearning) return;
  
  try {
    const learningRecord = {
      taskId: task.id,
      timestamp: new Date().toISOString(),
      action: task.action,
      inputData: task.data,
      executionResult: result,
      screenshotResult: screenshotResult,
      performanceMetrics: {
        executionTime: Date.now() - new Date(task.timestamp || Date.now()).getTime(),
        success: result.success
      }
    };
    
    console.log(`[recordForEvolver] 记录学习数据: ${task.id}`);
    
    // 保存到memory
    await fetch(`${SECURITY_POLICY.memoryAPI}/set?ns=evolver_learning`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: `learning_${task.id}_${Date.now()}`,
        value: learningRecord,
      }),
    });
    
    return true;
  } catch (error) {
    console.error(`[recordForEvolver] 学习记录失败:`, error.message);
    return false;
  }
}

// === 主执行函�?- L3.5增强�?=== 
async function executeTask(task) { 
  const { id, token, action, data } = task;
  let screenshotResult = null;
  
  console.log(`[executeTask] 开始处理任�? ${id}, 操作: ${action}`);
  
  // 1️⃣ 加载最新的安全策略
  const currentPolicy = await loadSecurityPolicy();
  console.log(`[executeTask] 加载策略结果:`, currentPolicy);
  SECURITY_POLICY = currentPolicy; // 更新全局策略
  
  // 2️⃣ 检查系统是否暂�?- 确保严格检查paused字段
  const isPaused = SECURITY_POLICY && SECURITY_POLICY.paused === true;
  console.log(`[executeTask] 系统暂停状�? ${isPaused}`);
  
  if (isPaused) {
    const msg = "系统已暂停，任务将被添加到等待队�?;
    console.log(`[executeTask] ${msg}: ${id}`);
    
    // 记录日志
    try {
      await logToMemory({ id, status: "queued", reason: msg, action, data });
    } catch (logError) {
      console.warn("日志记录失败，但继续执行:", logError.message);
    }
    
    // 添加到等待队�?    const queueResult = await addToWaitQueue(task);
    console.log(`[executeTask] 添加到等待队列结�? ${queueResult}`);
    
    return { success: false, message: msg, queued: true };
  }

  // 3️⃣ 安全验证 
  if (!isAllowed(action, token)) { 
    const msg = `安全验证失败：action=${action}, token=${token}`; 
    await logToMemory({ id, status: "rejected", reason: msg }); 
    return { success: false, message: msg }; 
  }

  // 4️⃣ 确认机制 - L3.5: 支持自动确认
  let confirmed = true;
  if (SECURITY_POLICY.confirmBeforeExecute && !SECURITY_POLICY.autoConfirm) {
    console.log(`⚠️ 请求执行: ${action}`, data); 
    const userInput = await promptUser(`是否允许执行? (Y/N): `); 
    confirmed = userInput.toUpperCase() === "Y";
    if (!confirmed) {
      await logToMemory({ id, status: "denied", action, data }); 
      return { success: false, message: "用户拒绝执行" }; 
    }
  } else if (SECURITY_POLICY.autoConfirm) {
    console.log(`�?自动确认执行: ${action}`, data);
  }

  // 5️⃣ 执行前截图（可选）
  if (SECURITY_POLICY.autoScreenshot) {
    console.log(`📸 执行前自动截图`);
    const preScreenshot = await captureScreenshot(`${id}_pre`);
  }

  // 6️⃣ 执行任务 - L3.5: 支持失败重试
  let result = null;
  let attempts = 0;
  const maxAttempts = SECURITY_POLICY.maxRetryAttempts || 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`[executeTask] 执行尝试 ${attempts}/${maxAttempts}: ${id}`);
      const resp = await fetch(SECURITY_POLICY.desktopAgentEndpoint, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ id, action, data }), 
      }); 
      result = await resp.json();
      
      if (result.success) {
        console.log(`[executeTask] 执行成功: ${id}`);
        break; // 成功则退出重试循�?      } else {
        console.warn(`[executeTask] 执行失败 (${attempts}/${maxAttempts}):`, result.message || result.error);
        if (SECURITY_POLICY.retryOnFailure && attempts < maxAttempts) {
          const delay = SECURITY_POLICY.retryDelay || 2000;
          console.log(`[executeTask] 将在 ${delay}ms 后重�?..`);
          await setTimeout(delay);
        } else {
          break; // 达到最大重试次�?        }
      }
    } catch (error) {
      console.error(`[executeTask] 执行异常 (${attempts}/${maxAttempts}):`, error.message);
      result = { success: false, message: error.message };
      
      if (SECURITY_POLICY.retryOnFailure && attempts < maxAttempts) {
        const delay = SECURITY_POLICY.retryDelay || 2000;
        console.log(`[executeTask] 将在 ${delay}ms 后重�?..`);
        await setTimeout(delay);
      } else {
        break;
      }
    }
  }

  // 7️⃣ 执行后截�?- L3.5: 自动截图回传
  if (SECURITY_POLICY.autoScreenshot) {
    console.log(`📸 执行后自动截图`);
    screenshotResult = await captureScreenshot(`${id}_post`);
  }

  // 8️⃣ 写入日志 - 包含更多执行细节
  const executionLog = {
    id,
    action,
    data,
    status: result.success ? "done" : "error",
    attempts,
    maxAttempts,
    screenshotUrl: screenshotResult?.path || null,
    timestamp: new Date().toISOString(),
    ...(result.error && { error: result.error })
  };
  
  await logToMemory(executionLog);

  // 9️⃣ Evolver学习记录 - L3.5: 记录学习数据
  await recordForEvolver(task, result, screenshotResult);

  return { 
    ...result, 
    attempts, 
    maxAttempts,
    screenshot: screenshotResult?.path || null
  }; 
}

// === 工具：命令行输入 === 
function promptUser(question) { 
  return new Promise((resolve) => { 
    process.stdout.write(question); 
    process.stdin.once("data", (data) => resolve(data.toString().trim())); 
  }); 
}

// === 测试工具函数 ===
function createTestModeMemory() {
  const testStore = {};
  return {
    async get(key, options = {}) {
      const ns = options.ns || 'default';
      const fullKey = `${ns}:${key}`;
      console.log(`[测试模式] ExternalMemory.get: ${fullKey}`);
      return testStore[fullKey] || null;
    },
    async set(key, value, options = {}) {
      const ns = options.ns || 'default';
      const fullKey = `${ns}:${key}`;
      console.log(`[测试模式] ExternalMemory.set: ${fullKey}`);
      testStore[fullKey] = value;
      return { success: true };
    }
  };
}

// === 示例测试 === 
if (process.argv[2] === "test") { 
  executeTask({ 
    id: `task_${Date.now()}`, 
    token: "TREA_MAIN", 
    action: "type", 
    data: "Hello JEV Operator!", 
  }).then(console.log); 
}

// === 暂停功能测试 ===
if (process.argv[2] === "test-paused") {
  console.log("=== 开始测试暂停功�?===");
  
  // 强制使用测试模式的内�?  ExternalMemory = createTestModeMemory();
  
  // 设置暂停的安全策�?  const pausedPolicy = {
    paused: true,
    allowedActions: ["open", "move", "click", "type", "capture", "read", "write"],
    tokenWhitelist: ["TREA_MAIN", "WORKER_OP"],
    confirmBeforeExecute: false // 测试模式下不需要确�?  };
  
  // 保存到测试内�?  ExternalMemory.set('security_policy', pausedPolicy, { ns: 'security' });
  
  // 模拟promptUser自动返回Y
  const originalPrompt = promptUser;
  promptUser = () => Promise.resolve('Y');
  
  // 执行测试任务
  executeTask({
    id: `test_paused_${Date.now()}`,
    token: 'TREA_MAIN',
    action: 'open',
    data: { app: 'notepad.exe' }
  }).then(result => {
    console.log("测试结果:", result);
    
    // 验证等待队列
    ExternalMemory.get('wait_queue', { ns: 'security' }).then(waitQueue => {
      console.log("等待队列内容:", waitQueue);
      
      if (result.queued === true && result.message.includes('系统已暂�?) && waitQueue && waitQueue.length > 0) {
        console.log("�?暂停功能测试通过!");
      } else {
        console.log("�?暂停功能测试失败!");
      }
      
      // 恢复原始函数
      promptUser = originalPrompt;
    });
  }).catch(error => {
    console.error("测试出错:", error);
    promptUser = originalPrompt;
  });
}

// CommonJS导出
module.exports = {
  executeTask,
  SECURITY_POLICY
};
