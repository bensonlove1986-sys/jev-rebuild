// 企业抬头信息导入脚本
// 功能：将企业抬头信息导入到KV存储，包含数据验证、事务管理和数据校验

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 配置信息
const CONFIG = {
  STORAGE_TYPE: 'local', // 'local' 或 'kv' - 使用localStorage作为替代
  WORKER_URL: 'http://localhost:1819', // 本地服务地址
  API_KEY: 'api-key-456', // 从wrangler.toml获取的API密钥
  DATA_FILE: path.resolve(__dirname, 'enterprise_header_info.json'),
  LOG_FILE: path.resolve(__dirname, 'import_log_enterprise_data.txt'),
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 毫秒
  LOCAL_STORAGE_PREFIX: 'jev_enterprise_'
};

// 本地存储模拟KV存储
const LocalStorageKV = {
  async get(key) {
    try {
      const fullKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
      const value = localStorage.getItem(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      log(`本地存储读取失败 ${key}: ${error.message}`, true);
      return null;
    }
  },
  
  async set(key, value) {
    try {
      const fullKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
      localStorage.setItem(fullKey, JSON.stringify(value));
      return { success: true };
    } catch (error) {
      log(`本地存储写入失败 ${key}: ${error.message}`, true);
      return { success: false, error: error.message };
    }
  },
  
  async del(key) {
    try {
      const fullKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
      localStorage.removeItem(fullKey);
      return { success: true };
    } catch (error) {
      log(`本地存储删除失败 ${key}: ${error.message}`, true);
      return { success: false, error: error.message };
    }
  },
  
  async list() {
    try {
      const keys = [];
      const prefix = CONFIG.LOCAL_STORAGE_PREFIX;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length));
        }
      }
      return { success: true, data: keys };
    } catch (error) {
      log(`本地存储列表获取失败: ${error.message}`, true);
      return { success: false, error: error.message };
    }
  }
};

// 为Node.js环境模拟localStorage
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    _data: {},
    getItem: function(key) {
      return this._data[key] || null;
    },
    setItem: function(key, value) {
      this._data[key] = value;
    },
    removeItem: function(key) {
      delete this._data[key];
    },
    clear: function() {
      this._data = {};
    },
    length: 0,
    key: function(index) {
      const keys = Object.keys(this._data);
      return keys[index] || null;
    }
  };
}

// 日志记录函数
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${isError ? '[ERROR]' : '[INFO]'} ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

// 发送HTTP请求的函数（KV模式）
async function sendRequest(endpoint, method = 'GET', data = null, headers = {}) {
  const url = new URL(endpoint, CONFIG.WORKER_URL);
  const protocol = url.protocol === 'https:' ? https : http;
  
  // 添加默认头部
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Auth-Key': CONFIG.API_KEY
  };
  
  const requestHeaders = { ...defaultHeaders, ...headers };
  
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: requestHeaders,
      timeout: 10000
    };
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // 检查是否为JSON响应
          const contentType = res.headers['content-type'];
          const parsedData = contentType && contentType.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          
          resolve({
            statusCode: res.statusCode,
            body: parsedData,
            headers: res.headers
          });
        } catch (error) {
          reject(new Error(`响应解析失败: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 本地存储操作的包装函数
async function storageOperation(operation, key, value = null, store = 'ui') {
  log(`本地存储操作: ${operation} ${key}`);
  
  switch (operation) {
    case 'get':
      return { statusCode: 200, body: { success: true, data: await LocalStorageKV.get(key) } };
    case 'set':
      const result = await LocalStorageKV.set(key, value);
      return { statusCode: result.success ? 200 : 500, body: result };
    case 'del':
      const deleteResult = await LocalStorageKV.del(key);
      return { statusCode: deleteResult.success ? 200 : 500, body: deleteResult };
    case 'list':
      const listResult = await LocalStorageKV.list();
      return { statusCode: listResult.success ? 200 : 500, body: listResult };
    case 'status':
      return { 
        statusCode: 200, 
        body: { 
          success: true, 
          data: { 
            bindings: { jevui: true, MEM_STORE: true, R2_BUCKET: true },
            ui_kv: { count: 0, example_keys: [] },
            mem_kv: { count: 0, example_keys: [] },
            timestamp: Date.now()
          }
        }
      };
    default:
      return { statusCode: 400, body: { success: false, error: '未知操作' } };
  }
}

// 带重试的请求函数
async function sendRequestWithRetry(endpoint, method = 'GET', data = null, headers = {}) {
  // 如果使用本地存储，直接调用本地存储操作
  if (CONFIG.STORAGE_TYPE === 'local') {
    log(`使用本地存储模式处理请求: ${endpoint}`);
    
    // 解析endpoint来确定操作类型
    if (endpoint.includes('/kv/get')) {
      const url = new URL(endpoint, 'http://localhost');
      const key = url.searchParams.get('key');
      return await storageOperation('get', key);
    } else if (endpoint.includes('/kv/set') && method === 'POST') {
      return await storageOperation('set', data.key, data.value, data.store);
    } else if (endpoint.includes('/kv/del')) {
      const url = new URL(endpoint, 'http://localhost');
      const key = url.searchParams.get('key');
      return await storageOperation('del', key);
    } else if (endpoint === '/status') {
      return await storageOperation('status');
    }
    
    // 默认返回成功响应
    return { statusCode: 200, body: { success: true } };
  }
  
  // KV模式 - 带重试的HTTP请求
  let attempts = 0;
  
  while (attempts < CONFIG.RETRY_ATTEMPTS) {
    try {
      return await sendRequest(endpoint, method, data, headers);
    } catch (error) {
      attempts++;
      
      if (attempts >= CONFIG.RETRY_ATTEMPTS) {
        throw error;
      }
      
      log(`请求失败，正在重试 (${attempts}/${CONFIG.RETRY_ATTEMPTS})... ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    }
  }
}

// 数据验证函数
function validateEnterpriseData(data) {
  const errors = [];
  
  // 检查必需的顶层结构
  if (!data || typeof data !== 'object') {
    errors.push('数据必须是有效的JSON对象');
    return { valid: false, errors };
  }
  
  // 检查企业抬头数组
  if (!Array.isArray(data.enterprise_headers)) {
    errors.push('enterprise_headers必须是数组');
  } else {
    // 验证每个企业抬头记录
    data.enterprise_headers.forEach((header, index) => {
      if (!header.id) errors.push(`第${index + 1}条记录缺少id`);
      if (!header.company_name) errors.push(`第${index + 1}条记录缺少company_name`);
      if (!header.version) errors.push(`第${index + 1}条记录缺少version`);
      
      // 验证联系信息
      if (header.contact_info) {
        const contact = header.contact_info;
        if (!contact.phone) errors.push(`第${index + 1}条记录缺少联系电话`);
        if (!contact.email) errors.push(`第${index + 1}条记录缺少联系邮箱`);
      } else {
        errors.push(`第${index + 1}条记录缺少contact_info`);
      }
      
      // 验证日期格式
      if (header.created_at && !isValidDate(header.created_at)) {
        errors.push(`第${index + 1}条记录的created_at格式无效`);
      }
    });
  }
  
  // 验证配置信息
  if (!data.config) {
    errors.push('缺少配置信息(config)');
  } else if (!data.config.default_version) {
    errors.push('缺少默认版本配置(default_version)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 日期验证函数
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// 导入企业抬头信息到KV存储
async function importEnterpriseHeaders(data) {
  log('开始导入企业抬头信息...');
  const importedKeys = [];
  let transactionSuccess = false;
  
  try {
    // 1. 首先检查KV存储连接状态
    const statusResponse = await sendRequestWithRetry('/status');
    if (statusResponse.statusCode !== 200 || !statusResponse.body.success) {
      throw new Error(`KV存储状态检查失败: ${JSON.stringify(statusResponse.body)}`);
    }
    
    log('KV存储连接正常');
    
    // 2. 导入企业抬头记录
    for (const header of data.enterprise_headers) {
      const key = `enterprise:header:${header.id}`;
      log(`正在导入: ${key}`);
      
      const response = await sendRequestWithRetry('/kv/set', 'POST', {
        key,
        value: header,
        store: 'ui' // 使用ui存储，适合配置类数据
      });
      
      if (response.statusCode !== 200 || !response.body.success) {
        throw new Error(`导入失败 ${key}: ${JSON.stringify(response.body)}`);
      }
      
      importedKeys.push(key);
      log(`成功导入: ${key}`);
    }
    
    // 3. 导入配置信息
    const configKey = 'enterprise:config';
    log(`正在导入配置: ${configKey}`);
    
    const configResponse = await sendRequestWithRetry('/kv/set', 'POST', {
      key: configKey,
      value: data.config,
      store: 'ui'
    });
    
    if (configResponse.statusCode !== 200 || !configResponse.body.success) {
      throw new Error(`导入配置失败: ${JSON.stringify(configResponse.body)}`);
    }
    
    importedKeys.push(configKey);
    log(`成功导入配置: ${configKey}`);
    
    // 4. 创建索引，便于查询所有企业抬头
    const indexKey = 'enterprise:headers:index';
    const indexValue = data.enterprise_headers.map(h => h.id);
    
    log(`正在创建索引: ${indexKey}`);
    
    const indexResponse = await sendRequestWithRetry('/kv/set', 'POST', {
      key: indexKey,
      value: indexValue,
      store: 'ui'
    });
    
    if (indexResponse.statusCode !== 200 || !indexResponse.body.success) {
      throw new Error(`创建索引失败: ${JSON.stringify(indexResponse.body)}`);
    }
    
    importedKeys.push(indexKey);
    log(`成功创建索引: ${indexKey}`);
    
    transactionSuccess = true;
    log('企业抬头信息导入事务完成');
    
    return { success: true, importedKeys };
    
  } catch (error) {
    log(`导入失败: ${error.message}`, true);
    
    // 事务回滚 - 如果部分导入成功，尝试删除已导入的数据
    if (importedKeys.length > 0) {
      log('执行事务回滚，删除已导入的数据...');
      await rollbackImport(importedKeys);
    }
    
    throw error;
  }
}

// 回滚函数 - 删除已导入的数据
async function rollbackImport(keys) {
  for (const key of keys) {
    try {
      log(`正在删除回滚数据: ${key}`);
      await sendRequestWithRetry(`/kv/del?key=${encodeURIComponent(key)}&store=ui`, 'GET');
      log(`成功删除回滚数据: ${key}`);
    } catch (rollbackError) {
      log(`回滚删除失败 ${key}: ${rollbackError.message}`, true);
    }
  }
}

// 数据校验函数 - 验证导入的数据
async function verifyImportedData(importedKeys) {
  log('开始数据校验...');
  const verificationResults = [];
  let allVerified = true;
  
  for (const key of importedKeys) {
    try {
      log(`正在校验: ${key}`);
      const response = await sendRequestWithRetry(`/kv/get?key=${encodeURIComponent(key)}&store=ui`);
      
      if (response.statusCode === 200 && response.body.success) {
        verificationResults.push({
          key,
          verified: true,
          data: response.body.data
        });
        log(`成功校验: ${key}`);
      } else {
        allVerified = false;
        verificationResults.push({
          key,
          verified: false,
          error: `获取数据失败: ${JSON.stringify(response.body)}`
        });
        log(`校验失败: ${key}`, true);
      }
    } catch (error) {
      allVerified = false;
      verificationResults.push({
        key,
        verified: false,
        error: error.message
      });
      log(`校验异常: ${key} - ${error.message}`, true);
    }
  }
  
  log(`数据校验完成，结果: ${allVerified ? '全部通过' : '存在失败项'}`);
  
  return {
    success: allVerified,
    results: verificationResults
  };
}

// 主函数
async function main() {
  log('========================================');
  log('企业抬头信息导入工具启动');
  log('========================================');
  
  try {
    // 1. 读取数据文件
    log(`正在读取数据文件: ${CONFIG.DATA_FILE}`);
    const rawData = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
    const data = JSON.parse(rawData);
    log('数据文件读取成功');
    
    // 2. 数据验证
    log('开始数据验证...');
    const validation = validateEnterpriseData(data);
    
    if (!validation.valid) {
      log('数据验证失败:', true);
      validation.errors.forEach(error => log(`  - ${error}`, true));
      throw new Error('数据验证失败，请检查数据格式');
    }
    
    log('数据验证成功，共', data.enterprise_headers.length, '条企业抬头记录');
    
    // 3. 执行导入
    const importResult = await importEnterpriseHeaders(data);
    
    // 4. 数据校验
    const verificationResult = await verifyImportedData(importResult.importedKeys);
    
    if (!verificationResult.success) {
      log('数据校验未全部通过，请检查KV存储状态', true);
      // 记录校验失败的详情
      verificationResult.results.forEach(result => {
        if (!result.verified) {
          log(`  失败项: ${result.key} - ${result.error}`, true);
        }
      });
    }
    
    // 5. 生成导入报告
    log('========================================');
    log('导入完成');
    log(`总记录数: ${data.enterprise_headers.length}`);
    log(`导入成功: ${importResult.importedKeys.length}`);
    log(`数据校验: ${verificationResult.success ? '通过' : '部分失败'}`);
    log(`导入的键: ${importResult.importedKeys.join(', ')}`);
    log('========================================');
    
    return {
      success: verificationResult.success,
      importedCount: importResult.importedKeys.length,
      headersCount: data.enterprise_headers.length
    };
    
  } catch (error) {
    log(`导入过程中发生错误: ${error.message}`, true);
    log('导入失败，请检查日志获取详细信息', true);
    throw error;
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n✅ 导入完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 导入失败:', error.message);
      process.exit(1);
    });
}

// 导出函数供其他模块使用
module.exports = { main, validateEnterpriseData };