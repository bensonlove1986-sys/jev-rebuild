// Tampermonkey 配置助手 - 用于验证 Worker 连接和认证设置

/**
 * 模拟 Tampermonkey 环境中的配置设置
 * 帮助用户正确配置 Worker URL 和认证方式
 */

// 正确的 Worker URL 配置示例
const CORRECT_WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev';

// 本地开发域名已移除，仅使用以下域名
// const INCORRECT_LOCAL_URL = 'https://jevshop.bensonlove1986.workers.dev'; // 更新为新域名

// 有效的认证密钥
const VALID_SECRET = 'jevindustry2025';

/**
 * 模拟 Tampermonkey 脚本中的 STATE 对象设置
 * 这是用户应该在 Tampermonkey 脚本中添加的代码
 */
function setupTampermonkeyConfig() {
  console.log('=== Tampermonkey 配置助手 ===');
  console.log('');
  console.log('📌 请在 Tampermonkey 脚本中添加以下代码：');
  console.log('```javascript');
  console.log('// 设置全局配置');
  console.log('if (!window.JEV) window.JEV = {};');
  console.log('if (!window.JEV.STATE) window.JEV.STATE = {};');
  console.log('');
  console.log('// ✅ 正确的 Worker URL 配置');
  console.log(`window.JEV.STATE.workerUrl = "${CORRECT_WORKER_URL}";`);
  console.log('');
  console.log('// ✅ 认证配置 (Bearer 方式)');
  console.log(`window.JEV.STATE.authToken = "${VALID_SECRET}";`);
  console.log('```');
  console.log('');
}

/**
 * 模拟发送带有正确认证的请求到 Worker
 * 展示如何在 Tampermonkey 中正确实现请求
 */
function simulateTampermonkeyRequest() {
  console.log('=== 模拟 Tampermonkey 请求 ===');
  console.log('');
  console.log('📌 Tampermonkey 脚本中应该这样发送请求：');
  console.log('```javascript');
  console.log('// 发送请求到 Worker');
  console.log('async function sendToWorker(endpoint, data) {');
  console.log('  const url = window.JEV.STATE.workerUrl + endpoint;');
  console.log('  const authToken = window.JEV.STATE.authToken;');
  console.log('');
  console.log('  try {');
  console.log('    const response = await fetch(url, {');
  console.log('      method: "POST",');
  console.log('      headers: {');
  console.log('        "Content-Type": "application/json",');
  console.log('        "Authorization": `Bearer ${authToken}`  // 使用 Bearer 认证');
  console.log('      },');
  console.log('      body: JSON.stringify(data)');
  console.log('    });');
  console.log('');
  console.log('    if (!response.ok) {');
  console.log('      throw new Error(`Worker 请求失败: ${response.status}`);');
  console.log('    }');
  console.log('');
  console.log('    return await response.json();');
  console.log('  } catch (error) {');
  console.log('    console.error("Worker 通信错误:", error);');
  console.log('    throw error;');
  console.log('  }');
  console.log('}');
  console.log('```');
  console.log('');
}

/**
 * 检查 Worker 连接状态的指南
 */
function connectionCheckGuide() {
  console.log('=== Worker 连接检查指南 ===');
  console.log('');
  console.log('1️⃣  首先在浏览器中测试 Worker 是否可访问：');
  console.log(`   访问: ${CORRECT_WORKER_URL}/ping`);
  console.log('   期望响应: {"success": true, "pong": true}');
  console.log('');
  console.log('2️⃣  如果无法访问，请检查：');
  console.log('   - Worker 是否已成功部署 (使用 wrangler deploy)');
  console.log('   - Cloudflare Workers 控制台中是否有错误');
  console.log('   - 网络连接是否正常');
  console.log('');
  console.log('3️⃣  常见错误及解决方案：');
  console.log('   - "无法获取 jevshop...": 使用正确的Worker URL');
  console.log('   - "认证失败": 确保使用正确的 authToken (jevindustry2025)');
  console.log('   - "CORS 错误": Worker 已配置支持 CORS，检查浏览器扩展设置');
  console.log('');
}

/**
 * 运行配置助手
 */
function runConfigHelper() {
  setupTampermonkeyConfig();
  simulateTampermonkeyRequest();
  connectionCheckGuide();
  
  console.log('=== 注意事项 ===');
  console.log('• 请确保使用部署到 Cloudflare 的 Worker URL，而不是本地调试 URL');
  console.log('• 认证方式使用 Bearer token，值为 jevindustry2025');
  console.log('• 如果 Worker 连接仍然有问题，请重新部署 Worker');
}

// 运行助手
runConfigHelper();
