// JEV.Agent.EnvInspector - 环境一致性检测工具
console.log('[JEV][EnvInspector] 环境检测开始...');

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// 配置项
const CONFIG = {
  endpoints: {
    worker: 'https://jevshop.bensonlove1986.workers.dev',
    localGateway: 'http://localhost:8080',
    traeAgent: 'http://localhost:1820',
    desktopAgent: 'http://localhost:1822'
  },
  apiTests: ['/ping', '/status', '/kv/test', '/modules/manifest', '/ai/bridge'],
  headersToCheck: [
    'Access-Control-Allow-Origin',
    'Content-Type',
    'Authorization',
    'X-Daojie-Token',
    'X-JEV-Session',
    'Version'
  ],
  requiredKVBindings: ['JEV_AI_CACHE', 'JEV_LOGS', 'JEV_PLUGIN_STATE', 'Bensonai_memory']
};

// 检测结果
const results = {
  startTime: new Date().toISOString(),
  services: {},
  headerComparison: {},
  apiReachability: {},
  kvBindings: {},
  securityChecks: {},
  summary: {
    passed: 0,
    warning: 0,
    failed: 0,
    consistencyScore: 0
  }
};

// HTTP请求函数
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(5000);
    req.end();
  });
}

// 检查服务状态
async function checkServiceStatus() {
  console.log('\n[JEV][EnvInspector] 检查服务状态...');
  
  for (const [service, endpoint] of Object.entries(CONFIG.endpoints)) {
    try {
      const startTime = Date.now();
      const response = await httpRequest(`${endpoint}/ping`);
      const latency = Date.now() - startTime;
      
      results.services[service] = {
        status: 'online',
        latency,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ ${service} 连通 (延迟: ${latency}ms)`);
      results.summary.passed++;
    } catch (error) {
      results.services[service] = {
        status: 'offline',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log(`❌ ${service} 未连通: ${error.message}`);
      results.summary.failed++;
    }
  }
}

// 比较HTTP头部
async function compareHeaders() {
  console.log('\n[JEV][EnvInspector] 比较HTTP头部一致性...');
  
  try {
    const workerResponse = await httpRequest(CONFIG.endpoints.worker);
    const localResponse = await httpRequest(CONFIG.endpoints.localGateway);
    
    const headerDifferences = [];
    
    CONFIG.headersToCheck.forEach(header => {
      const workerHas = header.toLowerCase() in workerResponse.headers;
      const localHas = header.toLowerCase() in localResponse.headers;
      
      if (workerHas !== localHas) {
        if (!workerHas) {
          headerDifferences.push(`Worker 缺少 ${header}`);
        } else {
          headerDifferences.push(`Local 缺少 ${header}`);
        }
      } else if (workerHas && localHas) {
        const workerValue = workerResponse.headers[header.toLowerCase()];
        const localValue = localResponse.headers[header.toLowerCase()];
        
        if (workerValue !== localValue) {
          headerDifferences.push(`${header} 值不匹配: Worker="${workerValue}", Local="${localValue}"`);
        }
      }
    });
    
    results.headerComparison = {
      workerHeaders: Object.fromEntries(
        Object.entries(workerResponse.headers)
          .filter(([key]) => CONFIG.headersToCheck.some(h => h.toLowerCase() === key))
      ),
      localHeaders: Object.fromEntries(
        Object.entries(localResponse.headers)
          .filter(([key]) => CONFIG.headersToCheck.some(h => h.toLowerCase() === key))
      ),
      differences: headerDifferences,
      isConsistent: headerDifferences.length === 0
    };
    
    if (headerDifferences.length === 0) {
      console.log('✅ HTTP头部完全一致');
      results.summary.passed++;
    } else {
      console.log(`⚠️ Header 差异: ${headerDifferences.join(', ')}`);
      results.summary.warning++;
    }
  } catch (error) {
    console.log(`❌ 头部比较失败: ${error.message}`);
    results.headerComparison = { error: error.message };
    results.summary.failed++;
  }
}

// 检查API可达性
async function checkApiReachability() {
  console.log('\n[JEV][EnvInspector] 检查API可达性...');
  
  for (const endpoint of [CONFIG.endpoints.worker, CONFIG.endpoints.localGateway]) {
    results.apiReachability[endpoint] = {};
    
    for (const apiPath of CONFIG.apiTests) {
      const fullUrl = `${endpoint}${apiPath}`;
      try {
        const response = await httpRequest(fullUrl);
        let isJsonValid = false;
        let jsonStructure = null;
        
        try {
          jsonStructure = JSON.parse(response.body);
          isJsonValid = true;
        } catch (jsonError) {
          // 忽略非JSON响应
        }
        
        results.apiReachability[endpoint][apiPath] = {
          status: response.statusCode === 200 ? 'success' : 'error',
          statusCode: response.statusCode,
          isJsonValid,
          hasJsonStructure: jsonStructure !== null
        };
        
        if (response.statusCode === 200) {
          console.log(`✅ ${endpoint}${apiPath} 访问成功`);
          results.summary.passed++;
        } else {
          console.log(`❌ ${endpoint}${apiPath} 返回非200状态码: ${response.statusCode}`);
          results.summary.failed++;
        }
      } catch (error) {
        results.apiReachability[endpoint][apiPath] = {
          status: 'error',
          error: error.message
        };
        
        console.log(`❌ ${fullUrl} 访问失败: ${error.message}`);
        results.summary.failed++;
      }
    }
  }
}

// 检查KV绑定（通过wrangler.toml文件分析）
function checkKVBindings() {
  console.log('\n[JEV][EnvInspector] 检查KV绑定...');
  
  try {
    const wranglerPath = 'd:\\PDF转网页\\JEV_Client_Web\\wrangler.toml';
    const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
    
    const missingBindings = [];
    CONFIG.requiredKVBindings.forEach(binding => {
      if (!wranglerContent.includes(binding)) {
        missingBindings.push(binding);
      }
    });
    
    results.kvBindings = {
      checkedBindings: CONFIG.requiredKVBindings,
      missingBindings,
      hasAllBindings: missingBindings.length === 0
    };
    
    if (missingBindings.length === 0) {
      console.log('✅ KV绑定全部通过');
      results.summary.passed++;
    } else {
      console.log(`⚠️ Missing Bindings: ${missingBindings.join(', ')}`);
      results.summary.warning++;
    }
  } catch (error) {
    console.log(`❌ KV绑定检查失败: ${error.message}`);
    results.kvBindings = { error: error.message };
    results.summary.failed++;
  }
}

// 安全校验
async function performSecurityChecks() {
  console.log('\n[JEV][EnvInspector] 执行安全校验...');
  
  // 检查签名头
  try {
    const workerResponse = await httpRequest(CONFIG.endpoints.worker, {
      headers: { 'Accept': 'application/json' }
    });
    
    const traeResponse = await httpRequest(`${CONFIG.endpoints.traeAgent}/status`, {
      headers: { 'Accept': 'application/json' }
    });
    
    const workerSignature = workerResponse.headers['x-jev-auth-signature'] || '';
    const traeSignature = traeResponse.headers['x-jev-auth-signature'] || '';
    
    results.securityChecks.signatureComparison = {
      workerSignature,
      traeSignature,
      isConsistent: workerSignature === traeSignature || (!workerSignature && !traeSignature)
    };
    
    if (workerSignature === traeSignature || (!workerSignature && !traeSignature)) {
      console.log('✅ 全局签名校验通过');
      results.summary.passed++;
    } else {
      console.log('⚠️ 签名头不一致');
      results.summary.warning++;
    }
  } catch (error) {
    results.securityChecks.signatureComparison = { error: error.message };
    console.log(`⚠️ 签名校验失败: ${error.message}`);
    results.summary.warning++;
  }
  
  // 检查安全配置文件
  try {
    const securityPolicyPath = 'd:\\PDF转网页\\security\\security_policy.json';
    let strictTokenMode = false;
    
    if (fs.existsSync(securityPolicyPath)) {
      const policyContent = JSON.parse(fs.readFileSync(securityPolicyPath, 'utf8'));
      strictTokenMode = policyContent.strict_token_mode === true;
    }
    
    results.securityChecks.strictTokenMode = strictTokenMode;
    
    if (strictTokenMode) {
      console.log('✅ 严格令牌模式已启用');
      results.summary.passed++;
    } else {
      console.log('⚠️ 严格令牌模式未启用');
      results.summary.warning++;
    }
  } catch (error) {
    results.securityChecks.strictTokenMode = { error: error.message };
    console.log(`⚠️ 安全策略检查失败: ${error.message}`);
    results.summary.warning++;
  }
}

// 生成修复建议
function generateFixSuggestions() {
  const suggestions = [];
  
  // 头部差异修复建议
  if (results.headerComparison.differences && results.headerComparison.differences.length > 0) {
    suggestions.push('HTTP头部修复建议:');
    suggestions.push('- 更新worker.js中的CORS头配置，确保与本地环境一致');
    suggestions.push('- 检查是否需要添加缺失的X-Daojie-Token或X-JEV-Session头');
  }
  
  // KV绑定修复建议
  if (results.kvBindings.missingBindings && results.kvBindings.missingBindings.length > 0) {
    suggestions.push('\nKV绑定修复建议:');
    suggestions.push('- 在wrangler.toml中添加缺失的KV绑定');
    suggestions.push('- 运行: wrangler kv:namespace create <binding_name> 来创建缺失的KV命名空间');
  }
  
  // 安全配置修复建议
  if (!results.securityChecks.strictTokenMode) {
    suggestions.push('\n安全配置修复建议:');
    suggestions.push('- 在security_policy.json中将strict_token_mode设置为true');
  }
  
  results.fixSuggestions = suggestions.length > 0 ? suggestions : ['未发现需要修复的问题'];
}

// 计算一致性分数
function calculateConsistencyScore() {
  const totalChecks = results.summary.passed + results.summary.warning + results.summary.failed;
  const weightedScore = (results.summary.passed * 100 + results.summary.warning * 50) / totalChecks;
  results.summary.consistencyScore = Math.round(weightedScore * 10) / 10;
}

// 生成报告
function generateReport() {
  console.log('\n[JEV][EnvInspector] 生成环境一致性报告...');
  
  // 完成报告数据
  results.endTime = new Date().toISOString();
  results.duration = new Date(results.endTime) - new Date(results.startTime);
  calculateConsistencyScore();
  generateFixSuggestions();
  
  // 输出控制台摘要
  console.log(`\n🏁 检测完成，环境一致性: ${results.summary.consistencyScore}%`);
  console.log(`✅ 通过: ${results.summary.passed}, ⚠️ 警告: ${results.summary.warning}, ❌ 失败: ${results.summary.failed}`);
  
  // 输出修复建议
  if (results.fixSuggestions && results.fixSuggestions.length > 0) {
    console.log('\n修复建议:');
    results.fixSuggestions.forEach(suggestion => console.log(suggestion));
  }
  
  // 保存报告文件
  const reportDir = 'd:\\PDF转网页\\logs';
  const reportPath = path.join(reportDir, 'env_inspector_report.json');
  
  try {
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n报告已保存至: ${reportPath}`);
  } catch (error) {
    console.error(`❌ 保存报告失败: ${error.message}`);
  }
}

// 主执行函数
async function runInspection() {
  try {
    await checkServiceStatus();
    await compareHeaders();
    await checkApiReachability();
    checkKVBindings();
    await performSecurityChecks();
    generateReport();
  } catch (error) {
    console.error(`[JEV][EnvInspector] 检测过程中发生错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 开始执行检测
runInspection();