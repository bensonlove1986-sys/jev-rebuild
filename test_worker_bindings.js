// JEV Worker绑定测试脚本
// 用于验证KV和R2绑定是否正常工作

// 测试配置
const WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev';
const TEST_KEYS = {
  ui: 'ui:test_config',
  mem: 'agent:test_status',
  health: 'health-check.txt'
};

// 颜色输出函数
function logSuccess(message) {
  console.log('\x1b[32m✓\x1b[0m ' + message);
}

function logError(message) {
  console.log('\x1b[31m✗\x1b[0m ' + message);
}

function logInfo(message) {
  console.log('\x1b[34mℹ\x1b[0m ' + message);
}

function logWarning(message) {
  console.log('\x1b[33m⚠\x1b[0m ' + message);
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API请求函数
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${WORKER_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logError(`API请求失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 测试系统状态
async function testSystemStatus() {
  logInfo('测试系统状态...');
  
  const result = await apiRequest('/status');
  
  if (result.success) {
    logSuccess('系统状态API可用');
    
    // 检查绑定状态
    const bindings = result.data.bindings;
    logInfo('绑定状态:');
    
    if (bindings.jevui) {
      logSuccess(`  - jevui KV: 已绑定`);
    } else {
      logError(`  - jevui KV: 未绑定`);
    }
    
    if (bindings.MEM_STORE) {
      logSuccess(`  - MEM_STORE KV: 已绑定`);
    } else {
      logError(`  - MEM_STORE KV: 未绑定`);
    }
    
    if (bindings.R2_BUCKET) {
      logSuccess(`  - R2_BUCKET: 已绑定`);
    } else {
      logError(`  - R2_BUCKET: 未绑定`);
    }
    
    // 显示KV统计信息
    if (result.data.ui_kv) {
      logInfo(`UI KV 键数量: ${result.data.ui_kv.count || 0}`);
      if (result.data.ui_kv.example_keys && result.data.ui_kv.example_keys.length > 0) {
        logInfo(`示例键: ${result.data.ui_kv.example_keys.join(', ')}`);
      }
    }
    
    if (result.data.mem_kv) {
      logInfo(`内存KV 键数量: ${result.data.mem_kv.count || 0}`);
    }
    
    return bindings;
  } else {
    logError(`获取系统状态失败: ${result.error}`);
    return null;
  }
}

// 测试KV写入
async function testKVWrite(store, key, value) {
  logInfo(`测试 ${store === 'ui' ? 'UI' : '内存'} KV写入: ${key}`);
  
  const result = await apiRequest('/kv/set', {
    method: 'POST',
    body: JSON.stringify({ key, value, store })
  });
  
  if (result.success) {
    logSuccess(`KV写入成功`);
    return true;
  } else {
    logError(`KV写入失败: ${result.error}`);
    return false;
  }
}

// 测试KV读取
async function testKVRead(store, key) {
  logInfo(`测试 ${store === 'ui' ? 'UI' : '内存'} KV读取: ${key}`);
  
  const result = await apiRequest(`/kv/get?key=${encodeURIComponent(key)}&store=${store}`);
  
  if (result.success) {
    logSuccess(`KV读取成功`);
    logInfo(`读取的值: ${JSON.stringify(result.data)}`);
    return result.data;
  } else {
    logError(`KV读取失败: ${result.error}`);
    return null;
  }
}

// 测试KV删除
async function testKVDelete(store, key) {
  logInfo(`测试 ${store === 'ui' ? 'UI' : '内存'} KV删除: ${key}`);
  
  const result = await apiRequest(`/kv/del?key=${encodeURIComponent(key)}&store=${store}`);
  
  if (result.success) {
    logSuccess(`KV删除成功`);
    return true;
  } else {
    logError(`KV删除失败: ${result.error}`);
    return false;
  }
}

// 测试R2上传
async function testR2Upload() {
  logInfo('测试R2文件上传...');
  
  try {
    // 创建一个简单的文本文件
    const blob = new Blob(['JEV Test File Content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'test_upload.txt');
    
    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      logSuccess('R2文件上传成功');
      logInfo(`文件名: ${result.data.fileName}`);
      logInfo(`文件URL: ${result.data.publicUrl}`);
      return true;
    } else {
      logError(`R2上传失败: ${result.error}`);
      return false;
    }
  } catch (error) {
    logError(`R2上传异常: ${error.message}`);
    return false;
  }
}

// 测试UI接口
async function testUIInterface() {
  logInfo('测试UI状态接口...');
  
  // 先测试读取
  const getResult = await apiRequest('/ui');
  
  if (getResult.success) {
    logSuccess('UI状态读取成功');
    logInfo(`UI状态键数量: ${Object.keys(getResult.data).length}`);
  } else {
    logError(`UI状态读取失败: ${getResult.error}`);
    return false;
  }
  
  // 再测试写入
  const testConfig = {
    theme: 'dark',
    language: 'zh-CN',
    last_login: new Date().toISOString(),
    version: 'L6.0'
  };
  
  const postResult = await apiRequest('/ui', {
    method: 'POST',
    body: JSON.stringify({ 'ui:test_interface': testConfig })
  });
  
  if (postResult.success) {
    logSuccess('UI状态写入成功');
    return true;
  } else {
    logError(`UI状态写入失败: ${postResult.error}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('\n========================================');
  console.log('\x1b[33mJEV Worker 绑定测试套件\x1b[0m');
  console.log('========================================\n');
  
  logInfo(`测试目标: ${WORKER_URL}`);
  logInfo('开始运行所有测试...\n');
  
  const results = {
    status: false,
    kv_ui: false,
    kv_mem: false,
    r2: false,
    ui_interface: false
  };
  
  try {
    // 1. 测试系统状态
    const bindings = await testSystemStatus();
    if (bindings) {
      results.status = true;
      
      // 2. 如果jevui已绑定，测试UI KV
      if (bindings.jevui) {
        await delay(500);
        const testValue = {
          timestamp: Date.now(),
          config: { theme: 'dark', sidebar: true },
          userSettings: { notifications: true }
        };
        
        if (await testKVWrite('ui', TEST_KEYS.ui, testValue)) {
          await delay(300);
          const readValue = await testKVRead('ui', TEST_KEYS.ui);
          if (readValue) {
            results.kv_ui = true;
            // 最后删除测试键
            await testKVDelete('ui', TEST_KEYS.ui);
          }
        }
      }
      
      // 3. 如果MEM_STORE已绑定，测试内存KV
      if (bindings.MEM_STORE) {
        await delay(500);
        const testValue = {
          status: 'online',
          last_ping: Date.now(),
          performance: { latency: 15, load: 0.3 }
        };
        
        if (await testKVWrite('mem', TEST_KEYS.mem, testValue)) {
          await delay(300);
          const readValue = await testKVRead('mem', TEST_KEYS.mem);
          if (readValue) {
            results.kv_mem = true;
            // 最后删除测试键
            await testKVDelete('mem', TEST_KEYS.mem);
          }
        }
      }
      
      // 4. 如果R2_BUCKET已绑定，测试R2上传
      if (bindings.R2_BUCKET) {
        await delay(500);
        results.r2 = await testR2Upload();
      }
      
      // 5. 测试UI接口
      if (bindings.jevui) {
        await delay(500);
        results.ui_interface = await testUIInterface();
      }
    }
    
  } catch (error) {
    logError(`测试过程中发生异常: ${error.message}`);
  }
  
  // 输出测试摘要
  console.log('\n========================================');
  console.log('\x1b[33m测试结果摘要\x1b[0m');
  console.log('========================================');
  
  logInfo(`系统状态检查: ${results.status ? '\x1b[32m通过\x1b[0m' : '\x1b[31m失败\x1b[0m'}`);
  logInfo(`UI KV 功能: ${results.kv_ui ? '\x1b[32m通过\x1b[0m' : '\x1b[31m失败\x1b[0m'}`);
  logInfo(`内存 KV 功能: ${results.kv_mem ? '\x1b[32m通过\x1b[0m' : '\x1b[31m失败\x1b[0m'}`);
  logInfo(`R2 存储功能: ${results.r2 ? '\x1b[32m通过\x1b[0m' : '\x1b[31m失败\x1b[0m'}`);
  logInfo(`UI 接口功能: ${results.ui_interface ? '\x1b[32m通过\x1b[0m' : '\x1b[31m失败\x1b[0m'}`);
  
  const allPass = results.status && results.kv_ui && results.kv_mem && results.r2 && results.ui_interface;
  console.log('\n' + (allPass ? '\x1b[32m🎉 所有测试通过！Worker绑定配置正确\x1b[0m' : '\x1b[31m❌ 部分测试失败，请检查绑定配置\x1b[0m'));
  console.log('========================================');
}

// 运行测试
if (typeof require === 'function') {
  // Node.js环境
  const fetch = require('node-fetch');
  global.fetch = fetch;
  runTests();
} else {
  // 浏览器环境
  runTests();
}
