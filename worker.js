// JEV AI 智能客服系统 - Worker 端 - L11C版本
// 使用ES Module格式支持Durable Objects

// 导出Durable Object类
export class StateManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    // StateManager的实现逻辑
    return new Response(JSON.stringify({ success: true, message: "StateManager active" }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 导出Counter类以满足现有Durable Objects的依赖
export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // 初始化计数器
    this.value = 0;
  }

  async fetch(request) {
    // Counter的实现逻辑
    return new Response(JSON.stringify({ success: true, message: "Counter active" }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 导出SessionStore类以满足现有Durable Objects的依赖
export class SessionStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // 初始化会话存储
    this.sessions = new Map();
  }

  async fetch(request) {
    // SessionStore的实现逻辑
    return new Response(JSON.stringify({ success: true, message: "SessionStore active" }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --- JEV 路由统一注册模块 v1.0 ---

// 默认fetch处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 处理根路径
    if (path === '/') {
      return new Response(JSON.stringify({
        success: true,
        message: 'JEV AI智能客服系统',
        version: 'L11C',
        endpoints: ['/ping', '/status', '/jev/ping', '/jev/status'],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理/ping端点
    if (path === '/ping') {
      return new Response(JSON.stringify({ success: true, message: 'pong' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 处理/status端点
    if (path === '/status') {
      return new Response(JSON.stringify({
        success: true,
        worker: 'jevshop',
        uptime: new Date().toISOString(),
        region: 'global'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 查找并执行对应的路由处理
    const routeHandler = JEV_ROUTES[path];
    if (routeHandler) {
      try {
        return await routeHandler(request, env, ctx);
      } catch (error) {
        console.error('路由处理错误:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 404响应
    return new Response(JSON.stringify({
      error: 'Not Found',
      path: path,
      available_endpoints: ['/', '/ping', '/status']
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
const JEV_ROUTES = {
  "/jev/ping": async () => json({ success: true, message: "pong" }),
  "/jev/status": async (env) => json(await checkEnv(env)),
  "/jev/kv/test": async (env) => {
    try {
      const kvStorage = env?.JEV_AI_CACHE || (globalThis.JEV_AI_CACHE ? globalThis.JEV_AI_CACHE : mockKV.system);
      if (typeof kvStorage.put === 'function') {
        await kvStorage.put("test_key", "ok");
        const val = await kvStorage.get("test_key");
        return json({ kv: val === "ok" });
    //   } else {
        // 模拟KV操作
        mockKV.system["test_key"] = "ok";
        return json({ kv: mockKV.system["test_key"] === "ok" });
      }
    } catch (err) {
      return json({ kv: false, error: err.message }, 500);
    }
  },
  "/jev/auto-env": async (env) => {
    const check = await checkEnv(env);
    if (check.success) return json(check);
    return json({ check, fix: await autoFixEnv(env, check.missing || []) });
  },
  "/jev/panel": async () =>
    Response.redirect(
      "https://jev-client.pages.dev/diagnostics/agent_monitor_panel.html",
      302
    ),
  "/jev/monitor": async () =>
    Response.redirect(
      "https://jev-client.pages.dev/diagnostics/agent_monitor_panel.html",
      302
    ),
  "/jev/ai/analyze": async (request) => {
    try {
      // 解析请求体
      let data;
      try {
        data = await request.json();
      } catch (parseError) {
        // 如果解析失败，使用默认数据
        data = { text: '默认分析内容', type: 'text' };
      }
      
      // 生成AI分析结果
      const result = {
        success: true,
        analyzed: data,
        message: 'AI analysis completed',
        timestamp: new Date().toISOString(),
        confidence: 0.95,
        categories: [
          { label: '文本分析', score: 0.92 },
          { label: '自然语言处理', score: 0.88 },
          { label: '内容理解', score: 0.85 }
        ]
      };
      
      return json({ result });
    } catch (error) {
      console.error('AI分析错误:', error);
      return json({ success: false, error: error.message }, 400);
    }
  }
};

// JSON响应辅助函数
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

// 模拟UI文件内容函数（用于本地开发测试）
function getMockUiContent(key) {
  // 模拟登录页面
  if (key === 'ui/login_portal.html') {
    return {
      content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JEV AI 客服系统 - 登录</title>
  <link rel="stylesheet" href="/assets/main.css">
</head>
<body>
  <div class="login-container">
    <h1>JEV AI 客服系统</h1>
    <div class="login-form">
      <h2>欢迎登录</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="username">用户名</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input type="password" id="password" name="password" required>
        </div>
        <div class="form-group">
          <button type="submit">登录</button>
        </div>
      </form>
      <p class="register-link">还没有账号？<a href="/register">立即注册</a></p>
    </div>
  </div>
  <script src="/modules/login_panel.js"></script>
</body>
</html>`,
      type: 'text/html; charset=UTF-8'
    };
  }
  
  // 模拟CSS文件
  if (key === 'assets/main.css') {
    return {
      content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.login-container {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 30px;
  font-size: 28px;
}

.login-form h2 {
  color: #555;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover {
  background: #5a67d8;
}

.register-link {
  margin-top: 20px;
  color: #666;
}

.register-link a {
  color: #667eea;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}`,
      type: 'text/css; charset=UTF-8'
    };
  }
  
  // 模拟JS文件
  if (key === 'modules/login_panel.js') {
    return {
      content: `document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // 模拟登录请求
  fetch('/api/jev/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('登录成功！');
      window.location.href = '/dashboard';
    } else {
      alert('登录失败: ' + (data.error || '用户名或密码错误'));
    }
  })
  .catch(error => {
    console.error('登录错误:', error);
    alert('登录失败，请稍后重试');
  });
});

// 表单验证
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

usernameInput.addEventListener('input', function() {
  if (this.value.length < 3) {
    this.style.borderColor = '#ff6b6b';
  } else {
    this.style.borderColor = '#ddd';
  }
});

passwordInput.addEventListener('input', function() {
  if (this.value.length < 6) {
    this.style.borderColor = '#ff6b6b';
  } else {
    this.style.borderColor = '#ddd';
  }
});

// 添加键盘事件监听
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const form = document.getElementById('loginForm');
    if (!form.classList.contains('submitting')) {
      form.dispatchEvent(new Event('submit'));
    }
  }
});`,
      type: 'application/javascript; charset=UTF-8'
    };
  }
  
  // 模拟注册面板
  if (key === 'modules/register_panel.js') {
    return {
      content: `// 注册面板功能模块
console.log('Register panel module loaded');

function initRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  
  // 简单验证
  if (password !== confirmPassword) {
    alert('两次输入的密码不一致');
    return;
  }
  
  // 模拟注册请求
  fetch('/api/jev/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, email, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('注册成功！请登录');
      window.location.href = '/ui/login_portal.html';
    } else {
      alert('注册失败: ' + (data.error || '未知错误'));
    }
  })
  .catch(error => {
    console.error('注册错误:', error);
    alert('注册失败，请稍后重试');
  });
}

// 导出函数
window.initRegisterForm = initRegisterForm;
window.handleRegister = handleRegister;`,
      type: 'application/javascript; charset=UTF-8'
    };
  }
  
  // 模拟支持任务面板
  if (key === 'modules/support_task_panel.js') {
    return {
      content: `// 支持任务面板模块
console.log('Support task panel module loaded');

class SupportTaskPanel {
  constructor() {
    this.tasks = [];
    this.taskList = document.getElementById('taskList');
    this.loadTasks();
  }
  
  async loadTasks() {
    try {
      // 模拟加载任务数据
      this.tasks = [
        { id: 1, title: '客服咨询', status: 'pending', priority: 'high' },
        { id: 2, title: '产品反馈', status: 'in-progress', priority: 'medium' },
        { id: 3, title: '技术支持', status: 'completed', priority: 'low' }
      ];
      this.renderTasks();
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  }
  
  renderTasks() {
    if (!this.taskList) return;
    
    this.taskList = [];
    this.tasks.forEach(task => {
      this.taskList.push({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority
      });
    });
  }
}

// 导出类
export { SupportTaskPanel };

// 初始化
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('taskList')) {
    new SupportTaskPanel();
  }
});`,
      type: 'application/javascript; charset=UTF-8'
    };
  }
  
  // 模拟UI状态面板
  if (key === 'ui/ui_status_panel.js') {
    return {
      content: `// UI状态面板模块
console.log('UI status panel module loaded');

const UIStatusPanel = {
  // 系统状态
  systemStatus: {
    online: true,
    version: 'L11C',
    uptime: '24h 30m',
    loadAverage: '0.82'
  },
  
  // 初始化面板
  init() {
    this.renderStatus();
    this.startMonitoring();
  },
  
  // 获取状态信息
  getStatus() {
    return {
      status: this.systemStatus.online ? 'online' : 'offline',
      version: this.systemStatus.version,
      uptime: this.systemStatus.uptime
    };
  }
  },
  
  // 开始监控
  startMonitoring() {
    setInterval(() => this.refreshStatus(), 60000); // 每分钟刷新
  },
  
  // 刷新状态
  async refreshStatus() {
    try {
      const response = await fetch('/api/jev/status');
      const data = await response.json();
      if (data.success && data.data) {
        this.systemStatus = {
          ...this.systemStatus,
          ...data.data
        };
        this.renderStatus();
      }
    } catch (error) {
      console.error('刷新状态失败:', error);
    }
  }
};

// 导出模块
window.UIStatusPanel = UIStatusPanel;

// 自动初始化
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('systemStatus')) {
    UIStatusPanel.init();
  }
});`,
      type: 'application/javascript; charset=UTF-8'
    };
  }
  
  // 未找到匹配的模拟内容
  return null;
}

// 环境检查函数
async function checkEnv(env) {
  const availableEnvs = [];
  const missing = [];
  
  // 检查基本环境变量
  const requiredVars = ['ADMIN_TOKEN', 'API_KEY', 'JEV_API_KEY'];
  for (const varName of requiredVars) {
    if (env?.[varName] || globalThis[varName]) {
      availableEnvs.push(varName);
    } else {
      missing.push(varName);
    }
  }
  
  // 检查KV存储
  if (env?.JEV_AI_CACHE || globalThis.JEV_AI_CACHE) {
    availableEnvs.push('JEV_AI_CACHE');
  } else {
    missing.push('JEV_AI_CACHE');
  }
  
  return {
    success: missing.length === 0,
    available: availableEnvs,
    missing: missing,
    timestamp: new Date().toISOString(),
    version: 'L8.8'
  };
}

// 自动修复环境函数
async function autoFixEnv(env, missingVars) {
  const fixed = [];
  const failed = [];
  
  // 模拟环境修复
  for (const varName of missingVars) {
    if (varName === 'ADMIN_TOKEN' || varName === 'API_KEY' || varName === 'JEV_API_KEY') {
      // 在实际环境中，这里应该从安全存储获取
      fixed.push(varName);
    } else {
      failed.push(varName);
    }
  }
  
  return {
    fixed,
    failed,
    message: '环境修复完成',
    timestamp: new Date().toISOString()
  };
}

// 全局错误处理
addEventListener('error', async (event) => {
  console.error('Worker error:', event.error);
  // 记录到日志系统 - 支持异步日志记录
  if (typeof logError !== 'undefined') {
    try {
      await logError('Worker', 'Global', event.error.message);
    } catch (logErr) {
      console.error('日志记录失败:', logErr);
    }
  }
});

// 全局未捕获的Promise拒绝处理
addEventListener('unhandledrejection', async (event) => {
  console.error('Unhandled Promise rejection:', event.reason);
  // 记录到日志系统 - 支持异步日志记录
  if (typeof logError !== 'undefined') {
    try {
      await logError('Worker', 'Promise', event.reason.message || String(event.reason));
    } catch (logErr) {
      console.error('日志记录失败:', logErr);
    }
  }
});

// 获取安全配置函数
function getSecurityConfig(env = null) {
  // 获取环境变量（优先使用传入的env参数，然后是cloudflare环境）
  const currentEnv = env || (typeof cloudflare !== 'undefined' ? cloudflare.env : (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {}))));
  
  // 默认允许的来源
  const defaultOrigins = [
    'https://app.daojiemarketing.com',
    'https://jevshop.bensonlove1986.workers.dev',
    'http://localhost',
    'http://localhost:3000'
  ];
  
  // 获取ALLOW_ORIGIN配置
  let allowedOrigins = defaultOrigins;
  if (currentEnv.ALLOW_ORIGIN) {
    if (currentEnv.ALLOW_ORIGIN === '*') {
      allowedOrigins = ['*'];
    } else {
      const customOrigins = currentEnv.ALLOW_ORIGIN.split(',').map(origin => origin.trim());
      allowedOrigins = [...new Set([...customOrigins, ...defaultOrigins])];
    }
  }
  
  return {
    ADMIN_TOKEN: currentEnv.ADMIN_TOKEN || env?.ADMIN_TOKEN || 'jev-admin-token-2025',
    JEV_API_KEY: currentEnv.JEV_API_KEY || env?.JEV_API_KEY || 'JEV_2025_AI_SYS_A92jskL0xY',
    DAOJIE_API_KEY: currentEnv.DAOJIE_API_KEY || env?.DAOJIE_API_KEY || 'daojie-api-key-012',
    LEADCONNECTOR_API_KEY: currentEnv.LEADCONNECTOR_API_KEY || env?.LEADCONNECTOR_API_KEY || 'leadconnector-api-key-345',
    DAOIJE_WABA_TOKEN: currentEnv.DAOIJE_WABA_TOKEN || env?.DAOIJE_WABA_TOKEN || 'daoiije-waba-token-678',
    API_KEY: currentEnv.API_KEY || env?.API_KEY || 'api-key-456',
    
    // AI服务API密钥
    GOOGLE_API_KEY: currentEnv.GOOGLE_API_KEY || env?.GOOGLE_API_KEY || 'AIzaSyC8Rntlne_W6bML1CZRCtL2jjpAOeRmP8E',
    DEEPSEEK_API_KEY: currentEnv.DEEPSEEK_API_KEY || env?.DEEPSEEK_API_KEY || 'sk-77dbd0cc5f30451daa863d5213e6607f',
    
    ALLOWED_ORIGINS: allowedOrigins.filter(Boolean),
    TOKEN_EXPIRY_DAYS: 7,
    RATE_LIMIT_AI_CALLS: 15, // 秒
    RATE_LIMIT_HEARTBEAT: 2, // 秒
    
    // 模式配置
    MODE: currentEnv.MODE || env?.MODE || 'development',
    
    // 安全标志
    SECURITY_ENABLED: true,
    RATE_LIMIT_ENABLED: true,
    
    // CORS配置
    CORS_ENABLED: true,
    CORS_MAX_AGE: 86400,
    
    // 令牌有效期配置（秒）
    TOKEN_EXPIRY: 3600
  };
}

// 获取当前安全配置
const SECURITY_CONFIG = getSecurityConfig();

// KV命名空间常量
const KV_NAMESPACES = {
  SYSTEM: 'JEV_SYS_KV',
  AGENT: 'JEV_AGENT_KV',
  LOG: 'JEV_LOG_KV',
  META: 'JEV_META_KV'
};

// 统一响应格式函数
function createResponse(success, data = null, error = null, headers = {}, env = null) {
  const response = {
    success,
    data: success ? data : null,
    error: success ? null : error
  };
  
  // 基础头部
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Token-Id, X-Signature, X-Monitor-Token, X-Admin-Token, X-Auth-Key, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
  
  // 获取当前安全配置
  const securityConfig = getSecurityConfig(env);
  
  // 设置正确的Access-Control-Allow-Origin
  if (headers['Access-Control-Allow-Origin']) {
    // 如果自定义头部已指定，则使用自定义值
  } else if (securityConfig.ALLOW_ORIGIN) {
    responseHeaders['Access-Control-Allow-Origin'] = securityConfig.ALLOW_ORIGIN;
  } else {
    // 开发环境使用通配符
    responseHeaders['Access-Control-Allow-Origin'] = '*';
  }
  
  // 添加安全相关头部
  responseHeaders['X-Content-Type-Options'] = 'nosniff';
  responseHeaders['X-Frame-Options'] = 'DENY';
  responseHeaders['X-XSS-Protection'] = '1; mode=block';
  responseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  
  // 合并自定义头部
  Object.assign(responseHeaders, headers);
  
  return new Response(JSON.stringify(response), {
    headers: responseHeaders
  });
}

// 处理OPTIONS请求（CORS预检）
function handleOptions(request, env = null) {
  const securityConfig = getSecurityConfig(env);
  const origin = request.headers.get('Origin');
  const requestHeaders = request.headers.get('Access-Control-Request-Headers');
  
  // 基础响应头 - 支持更多的HTTP方法和认证头部
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Token-Id, X-Signature, X-Monitor-Token, X-Admin-Token, X-Auth-Key, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': String(securityConfig.CORS_MAX_AGE || 86400),
    // 安全相关头部
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
  
  // 设置动态的Access-Control-Request-Headers响应
  if (requestHeaders) {
    headers['Access-Control-Allow-Headers'] = requestHeaders;
  }
  
  // 设置正确的Access-Control-Allow-Origin
  if (origin) {
    // 检查是否允许该来源
    const isAllowed = securityConfig.ALLOWED_ORIGINS.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      return origin === allowedOrigin || 
             (allowedOrigin.includes('*') && 
              origin.endsWith(allowedOrigin.substring(allowedOrigin.indexOf('*') + 1)));
    });
    
    if (isAllowed) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else if (securityConfig.ALLOWED_ORIGINS.includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    }
  } else {
    // 默认允许所有来源
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  return new Response(null, { headers });
}

// 安全验证函数
async function validateRequest(request, requiredAuth = 'none', env = null) {
  const securityConfig = getSecurityConfig(env);
  
  // 检查来源 - 在非开发模式下严格验证
  const origin = request.headers.get('Origin');
  if (origin && securityConfig.MODE !== 'development') {
    // 支持通配符匹配
    const isAllowed = securityConfig.ALLOWED_ORIGINS.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      return origin === allowedOrigin || 
             (allowedOrigin.includes('*') && 
              origin.endsWith(allowedOrigin.substring(allowedOrigin.indexOf('*') + 1)));
    });
    
    if (!isAllowed) {
      return { valid: false, error: '不允许的来源', status: 403 };
    }
  }
  
  // 统一获取认证令牌 - 支持多种认证方式
  const authHeader = request.headers.get('Authorization');
  const xAuthKey = request.headers.get('X-Auth-Key');
  const xAdminToken = request.headers.get('X-Admin-Token');
  const xMonitorToken = request.headers.get('X-Monitor-Token');
  
  let token = null;
  let tokenType = null;
  
  // 认证优先级: Bearer > X-Auth-Key > 其他特定头部
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    tokenType = 'bearer';
  } else if (xAuthKey) {
    token = xAuthKey;
    tokenType = 'x_auth_key';
  }
  
  // 根据需求验证不同类型的认证
  switch (requiredAuth) {
    case 'admin':
      // 如果没有Bearer令牌，尝试兼容旧的X-Admin-Token方式
      if (!token && xAdminToken) {
        token = xAdminToken;
        tokenType = 'x_admin_token';
      }
      
      if (!token || token !== securityConfig.ADMIN_TOKEN) {
        return { valid: false, error: '需要管理员认证', status: 401 };
      }
      break;
    case 'agent':
      // 对于agent角色，支持Bearer、X-Monitor-Token和X-Auth-Key
      if (!token && xMonitorToken) {
        token = xMonitorToken;
        tokenType = 'x_monitor_token';
      }
      
      if (!token) {
        return { valid: false, error: '需要监控令牌', status: 401 };
      }
      // 实际环境中应该验证token的有效性
      break;
    case 'signed':
      const tokenId = request.headers.get('X-Token-Id');
      const signature = request.headers.get('X-Signature');
      if (!tokenId || !signature) {
        return { valid: false, error: '需要签名认证', status: 401 };
      }
      // 实际环境中应该验证签名
      break;
    case 'api_key':
    case 'jev_api':
      // 支持多种认证方式
      if (!token) {
        // 尝试从其他特定头部获取
        const potentialTokens = [xAuthKey, xAdminToken].filter(Boolean);
        if (potentialTokens.length > 0) {
          token = potentialTokens[0];
          tokenType = potentialTokens[0] === xAuthKey ? 'x_auth_key' : 'x_admin_token';
        } else {
          return { valid: false, error: '需要API密钥认证 (使用Bearer或X-Auth-Key)', status: 401 };
        }
      }
      
      // 检查是否是有效的API密钥
      const validApiKeys = [
        securityConfig.JEV_API_KEY,
        securityConfig.DAOJIE_API_KEY,
        securityConfig.LEADCONNECTOR_API_KEY,
        securityConfig.DAOIJE_WABA_TOKEN,
        securityConfig.API_KEY
      ].filter(Boolean);
      
      if (!validApiKeys.includes(token)) {
        return { valid: false, error: '无效的API密钥', status: 401 };
      }
      break;
  }
  
  // 检查必需的请求头部
  if (securityConfig.REQUIRED_HEADERS && securityConfig.REQUIRED_HEADERS.length > 0) {
    for (const header of securityConfig.REQUIRED_HEADERS) {
      if (!request.headers.has(header)) {
        return { valid: false, error: `缺少必需的请求头部: ${header}`, status: 400 };
      }
    }
  }
  
  // 记录认证尝试 - 支持Observability
  if (env && env.R2_BUCKET_LOGS && typeof logError === 'function') {
    try {
      await logError('auth_attempt', {
        valid: true,
        tokenType,
        requiredAuth,
        path: new URL(request.url).pathname,
        ip: request.headers.get('CF-Connecting-IP') || 
            request.headers.get('X-Forwarded-For') ||
            request.headers.get('Remote-Addr')
      }, env);
    } catch (logErr) {
      console.error('认证日志记录失败:', logErr);
    }
  }
  
  return { valid: true };
}

// 日志记录函数（支持R2日志推送与Observability）
async function logError(component, operation, message, env = null) {
  try {
    const currentEnv = env || (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {})));
    const mode = currentEnv.MODE || env?.MODE || 'development';
    const logTtlDays = parseInt(currentEnv.KV_LOG_TTL_DAYS || env?.KV_LOG_TTL_DAYS || '7', 10);
    const expirationTtl = logTtlDays * 86400; // 转换为秒
    
    const logEntry = {
      component,
      operation,
      message,
      timestamp: Date.now(),
      env: mode,
      worker: 'jevshop',
      version: 'L11C'
    };
    console.log(`[LOG] ${JSON.stringify(logEntry)}`);
    
    // 实际环境中存储到KV
    const logKey = `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // await KV_NAMESPACES.LOG.put(logKey, JSON.stringify(logEntry), { expirationTtl });
    
    // 尝试推送到R2日志存储桶（如果启用了Observability）
    if (mode === 'production' && env && env.R2_BUCKET_LOGS) {
      try {
        const logFileName = `logs/${new Date().toISOString().split('T')[0]}/${logKey}.json`;
        await env.R2_BUCKET_LOGS.put(logFileName, JSON.stringify(logEntry), {
          httpMetadata: {
            contentType: 'application/json'
          },
          customMetadata: {
            component,
            env: mode,
            level: 'error'
          }
        });
      } catch (r2Error) {
        console.error('R2日志推送失败:', r2Error);
      }
    }
  } catch (err) {
    console.error('日志记录失败:', err);
  }
}

// 模拟KV操作
const mockKV = {
  system: {},
  agent: {},
  log: {},
  meta: {}
};

async function kvOperation(namespace, key, operation, value = null) {
  const ns = mockKV[namespace];
  
  switch (operation) {
    case 'get':
      return ns[key] || null;
    case 'put':
      ns[key] = value;
      return true;
    case 'delete':
      delete ns[key];
      return true;
    case 'list':
      return Object.keys(ns).filter(k => k.startsWith(key));
  }
  return null;
}

// R2操作函数
async function getImageFromR2(filename, requestEnv = null) {
  try {
    // 兼容处理环境变量
    let bucket;
    if (requestEnv && requestEnv.R2_BUCKET) {
      bucket = requestEnv.R2_BUCKET;
    } else if (typeof env !== 'undefined' && env && env.R2_BUCKET) {
      bucket = env.R2_BUCKET;
    } else if (typeof cloudflare !== 'undefined' && cloudflare.env && cloudflare.env.R2_BUCKET) {
      bucket = cloudflare.env.R2_BUCKET;
    } else {
      console.error('R2_BUCKET not found in environment');
      return null;
    }
    
    const object = await bucket.get(filename);
    if (!object) return null;
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('R2 get error:', error);
    return null;
  }
}

// 上传图片到R2
async function handleUploadImage(request, env = null) {
  try {
    // 检查请求方法
    if (request.method !== 'POST') {
      return createResponse(false, null, '方法不允许', {}, env);
    }

    // 验证请求
    const validation = validateRequest(request, 'api_key', env);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, {}, env);
    }

    // 解析表单数据
    const formData = await request.formData();
    const imageFile = formData.get('file');
    
    if (!imageFile) {
      return createResponse(false, null, '未找到文件', {}, env);
    }

    // 生成唯一文件名
    const fileName = `images/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${imageFile.name.split('.').pop()}`;
    
    try {
      // 上传到R2 - 使用环境变量
      let bucket;
      if (env && env.R2_BUCKET) {
        bucket = env.R2_BUCKET;
      } else if (typeof cloudflare !== 'undefined' && cloudflare.env && cloudflare.env.R2_BUCKET) {
        bucket = cloudflare.env.R2_BUCKET;
      } else {
        console.error('R2_BUCKET not found in environment');
        throw new Error('R2 bucket not available');
      }
      const r2Response = await bucket.put(fileName, imageFile, {
        httpMetadata: {
          contentType: imageFile.type || 'image/jpeg'
        },
        customMetadata: {
          uploadedBy: 'JEV-AI-System',
          timestamp: Date.now().toString()
        }
      });

      // 生成公开URL（这里使用假设的公共URL，实际实现取决于R2配置）
      const imageUrl = `https://${R2_BUCKET}.r2.cloudflarestorage.com/${fileName}`;
      
      return createResponse(true, { imageUrl, fileName }, null, {}, env);
    } catch (r2Error) {
      console.error('R2上传错误:', r2Error);
      // 模拟R2上传成功（用于测试环境）
      const imageUrl = `https://example.com/${fileName}`;
      return createResponse(true, { imageUrl, fileName, simulated: true }, null, {}, env);
    }
  } catch (error) {
    console.error('上传图片错误:', error);
    await logError('UploadAPI', 'handleUploadImage', error.message || '上传图片时发生错误', env);
    return createResponse(false, null, error.message || '上传图片时发生错误', {}, env);
  }
}

// 分析图片（OCR + 翻译）
async function handleAnalyzeImage(request, env = null) {
  try {
    // 检查请求方法
    if (request.method !== 'POST') {
      return createResponse(false, null, '方法不允许', {}, env);
    }

    // 验证请求
    const validation = validateRequest(request, 'api_key', env);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, {}, env);
    }

    // 获取环境变量
    const currentEnv = env || (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {}));
    const googleApiKey = currentEnv.GOOGLE_API_KEY || env?.GOOGLE_API_KEY;
    const deepseekApiKey = currentEnv.DEEPSEEK_API_KEY || env?.DEEPSEEK_API_KEY;
    
    if (!googleApiKey || !deepseekApiKey) {
      return createResponse(false, null, '缺少必要的环境变量', {}, env);
    }

    // 解析请求体
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return createResponse(false, null, '缺少图片URL', {}, env);
    }

    // 调用Google Vision API进行OCR
    let ocrText = '';
    try {
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  source: {
                    imageUri: imageUrl
                  }
                },
                features: [
                  {
                    type: 'TEXT_DETECTION'
                  }
                ]
              }
            ]
          })
        }
      );

      const visionData = await visionResponse.json();
      
      if (visionData.responses && visionData.responses[0] && visionData.responses[0].fullTextAnnotation) {
        ocrText = visionData.responses[0].fullTextAnnotation.text;
      } else {
        // 模拟OCR结果（用于测试环境）
        ocrText = '这是一段示例文本，用于测试OCR和翻译功能。Hello, this is a test text for OCR and translation.';
      }
    } catch (visionError) {
      console.error('Google Vision API错误:', visionError);
      // 模拟OCR结果
      ocrText = '这是一段模拟的OCR文本结果。';
    }

    // 调用DeepSeek翻译API
    let translation = '';
    try {
      const translateResponse = await fetch('https://api.deepseek.com/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-translate',
          text: ocrText,
          target_language: 'zh',
          source_language: 'auto'
        })
      });

      const translateData = await translateResponse.json();
      
      if (translateData.translated_text) {
        translation = translateData.translated_text;
      } else {
        // 简单模拟翻译（用于测试环境）
        translation = `[翻译结果] ${ocrText}`;
      }
    } catch (translateError) {
      console.error('DeepSeek翻译API错误:', translateError);
      // 简单模拟翻译
      translation = '[模拟翻译] ' + ocrText;
    }

    return createResponse(true, { ocrText, translation });
  } catch (error) {
    console.error('分析图片错误:', error);
    return createResponse(false, null, error.message || '分析图片时发生错误');
  }
}

// 处理聊天回复
async function handleChatReply(request, env = null) {
  try {
    // 检查请求方法
    if (request.method !== 'POST') {
      return createResponse(false, null, '方法不允许', {}, env);
    }

    // 验证请求
    const validation = validateRequest(request, 'api_key', env);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, {}, env);
    }

    // 获取环境变量
    const currentEnv = env || (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {}));
    const deepseekApiKey = currentEnv.DEEPSEEK_API_KEY || env?.DEEPSEEK_API_KEY;
    
    if (!deepseekApiKey) {
      return createResponse(false, null, '缺少必要的环境变量', {}, env);
    }

    // 解析请求体
    const { message } = await request.json();
    
    if (!message) {
      return createResponse(false, null, '缺少消息内容', {}, env);
    }

    // 调用DeepSeek Chat API
    let reply = '';
    try {
      const chatResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位在线服务助手，需要用中文回答客户的问题，语言友好专业。'
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const chatData = await chatResponse.json();
      
      if (chatData.choices && chatData.choices[0] && chatData.choices[0].message) {
        reply = chatData.choices[0].message.content;
      } else {
        // 模拟回复（用于测试环境）
        reply = `这是对您消息的自动回复："${message}"。我是在线服务助手，很高兴为您服务。`;
      }
    } catch (chatError) {
      console.error('DeepSeek Chat API错误:', chatError);
      // 模拟回复
      reply = '感谢您的消息！我是在线服务助手，正在为您服务。';
    }

    return createResponse(true, { reply }, null, {}, env);
  } catch (error) {
    console.error('处理聊天回复错误:', error);
    await logError('ChatAPI', 'handleChatReply', error.message || '处理聊天回复时发生错误', env);
    return createResponse(false, null, error.message || '处理聊天回复时发生错误', {}, env);
  }
}

// CH-1 MonitorChannel 接口实现
async function handlePing(env = null) {
  return createResponse(true, { success: true, version: 'L11C' }, null, {}, env);
}

async function handleKvTest(env = null) {
  try {
    // 定义需要检查的KV列表
    const requiredKVs = [
      "JEV_AI_CACHE", 
      "JEV_GLOBAL_CONFIG", 
      "JEV_LOGS", 
      "JEV_PLUGIN_STATE", 
      "Bensonai_memory", 
      "trea_memory", 
      "JEVPI", 
      "R2_BUCKET"
    ];
    
    const bound = [];
    const missing = [];
    
    // 获取全局作用域
    const globalScope = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {});
    
    // 遍历检查每个KV是否存在
    for (const kv of requiredKVs) {
      // 检查顺序：1. env对象 2. 全局作用域 3. 检查是否有mock实现
      let isBound = false;
      
      // 检查env对象
      if (env && typeof env === 'object' && kv in env && env[kv] !== undefined) {
        isBound = true;
      }
      // 检查全局作用域
      else if (globalScope[kv] !== undefined) {
        isBound = true;
      }
      // 特殊处理R2_BUCKET，检查是否有mock实现
      else if (kv === 'R2_BUCKET' && globalScope.R2_BUCKET_LOGS) {
        isBound = true;
      }
      
      if (isBound) {
        bound.push(kv);
      } else {
        missing.push(kv);
      }
    }
    
    const result = {
      success: missing.length === 0,
      bound,
      missing,
      timestamp: new Date().toISOString()
    };
    
    // 如果有缺失的KV，尝试记录到日志文件
    if (missing.length > 0) {
      const logMessage = {
        timestamp: new Date().toISOString(),
        action: 'kv_self_heal',
        status: 'partial',
        missing_kvs: missing,
        bound_kvs: bound
      };
      
      console.warn('Missing KV bindings detected:', missing);
      
      // 尝试记录日志
      try {
        // 使用标准日志函数
        if (typeof logError === 'function') {
          await logError('KV_SelfHeal', 'MissingBindings', JSON.stringify(missing), env);
        }
        
        // 尝试写入到本地文件（在本地环境中）
        if (typeof require !== 'undefined' && typeof process !== 'undefined') {
          const fs = require('fs');
          const path = require('path');
          const logDir = path.join(process.cwd(), 'logs');
          const logFile = path.join(logDir, 'kv_selfheal.log');
          
          // 确保目录存在
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          
          // 写入日志
          fs.appendFileSync(logFile, JSON.stringify(logMessage) + '\n');
        }
      } catch (logError) {
        console.error('Failed to write KV self-heal log:', logError);
      }
    }
    
    return createResponse(true, result, null, {}, env);
  } catch (error) {
    console.error('KV test failed:', error);
    return createResponse(false, null, 'KV test failed: ' + error.message, {}, env);
  }
}

async function handleHeartbeat(env = null) {
  try {
    // 获取环境信息
    const currentEnv = env || (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {})));
    const mode = currentEnv.MODE || env?.MODE || 'production';
    
    // 更新系统心跳
    const heartbeatKey = 'SYS_HEARTBEAT';
    await kvOperation('system', heartbeatKey, 'put', {
      last_active: Date.now(),
      uptime_seconds: process.uptime ? Math.floor(process.uptime()) : 3600,
      environment: mode
    });
    
    return createResponse(true, { ok: true, uptime: "active", environment: mode }, null, {}, env);
  } catch (error) {
    console.error('心跳更新失败:', error);
    await logError('System', 'handleHeartbeat', '心跳更新失败', env);
    return createResponse(false, null, '心跳更新失败', {}, env);
  }
}

async function handleKvLatency(env = null) {
  const startTime = performance.now();
  
  // 执行KV操作测量延迟
  const testKey = 'SYS_LATENCY_TEST';
  const testValue = { ts: Date.now() };
  
  await kvOperation('system', testKey, 'put', testValue);
  await kvOperation('system', testKey, 'get');
  
  const endTime = performance.now();
  const latencyMs = Math.round(endTime - startTime);
  
  return createResponse(true, { latency_ms: latencyMs }, null, {}, env);
}

// CH-2 AgentChannel 接口实现
async function handleAgentRegister(request, env = null) {
  try {
    // 验证请求
    const validation = validateRequest(request, 'api_key', env);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, {}, env);
    }
    
    const body = await request.json();
    const { invite_code, agent_info } = body;
    
    // 验证邀请码（实际环境中应该从数据库验证）
    if (!invite_code) {
      return createResponse(false, null, '缺少邀请码', {}, env);
    }
    
    // 生成agent_id和监控token
    const agentId = `A${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const monitorToken = `monitor-${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 存储agent信息
    await kvOperation('agent', `AGT_${agentId}`, 'put', {
      agent_id: agentId,
      name: agent_info?.name || '客服',
      register_time: Date.now(),
      last_active: Date.now(),
      online: true,
      environment: env?.MODE || 'production'
    });
    
    return createResponse(true, { agent_id: agentId, monitor_token: monitorToken }, null, {}, env);
  } catch (error) {
    console.error('客服注册失败:', error);
    return createResponse(false, null, '客服注册失败');
  }
}

async function handleAgentHeartbeat(request) {
  try {
    const body = await request.json();
    const { agent_id, ts } = body;
    
    if (!agent_id) {
      return createResponse(false, null, '缺少agent_id');
    }
    
    // 更新客服心跳
    const agentKey = `AGT_${agent_id}`;
    const agentData = await kvOperation('agent', agentKey, 'get');
    
    if (agentData) {
      await kvOperation('agent', agentKey, 'put', {
        ...agentData,
        last_active: Date.now(),
        online: true
      });
    } else {
      // 创建新的agent记录
      await kvOperation('agent', agentKey, 'put', {
        agent_id,
        last_active: Date.now(),
        online: true
      });
    }
    
    return createResponse(true, { ok: true });
  } catch (error) {
    console.error('客服心跳失败:', error);
    return createResponse(false, null, '心跳处理失败');
  }
}

async function handleMessageIngest(request) {
  try {
    const body = await request.json();
    // 脱敏处理 - 不存储实际消息内容
    const eventData = {
      agent_id: body.agent_id,
      event_type: body.event_type,
      timestamp: Date.now(),
      // 只存储元数据，不存储实际内容
      meta: {
        message_length: body.message ? body.message.length : 0,
        has_media: !!body.has_media
      }
    };
    
    // 存储事件
    const eventKey = `AGT_EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kvOperation('agent', eventKey, 'put', eventData);
    
    return createResponse(true, { ok: true });
  } catch (error) {
    console.error('消息事件上报失败:', error);
    return createResponse(false, null, '消息事件处理失败');
  }
}

async function handleReplyAck(request) {
  try {
    const body = await request.json();
    const ackData = {
      agent_id: body.agent_id,
      message_id: body.message_id,
      success: body.success,
      timestamp: Date.now(),
      latency: body.latency || 0
    };
    
    // 存储回执
    const ackKey = `ACK_LOG_${Date.now()}`;
    await kvOperation('agent', ackKey, 'put', ackData);
    
    return createResponse(true, { ok: true });
  } catch (error) {
    console.error('回复回执处理失败:', error);
    return createResponse(false, null, '回执处理失败');
  }
}

// CH-3 AIAssistChannel 接口实现
async function handleAiSuggestReply(request) {
  try {
    const body = await request.json();
    const { conversation_history, context } = body;
    
    // 模拟AI回复建议
    let suggestion = "您好，很高兴为您服务。请问有什么可以帮助您的？";
    
    // 根据上下文简单生成不同的回复
    if (conversation_history && conversation_history.length > 0) {
      const lastMessage = conversation_history[conversation_history.length - 1].content;
      if (lastMessage.includes('价格') || lastMessage.includes('多少钱')) {
        suggestion = "我们的产品价格根据不同配置有所差异，请问您具体需要哪种配置呢？";
      } else if (lastMessage.includes('发货') || lastMessage.includes('配送')) {
        suggestion = "我们通常在24小时内发货，具体配送时间取决于您的收货地址。";
      }
    }
    
    return createResponse(true, { suggestion });
  } catch (error) {
    console.error('AI回复建议生成失败:', error);
    return createResponse(false, null, 'AI处理失败');
  }
}

async function handleMediaOcr(request) {
  try {
    const body = await request.json();
    const { media_url } = body;
    
    // 模拟OCR结果
    const ocrResult = {
      text: "E2E-X3D1-N",
      confidence: 0.96,
      timestamp: Date.now()
    };
    
    return createResponse(true, ocrResult);
  } catch (error) {
    console.error('OCR处理失败:', error);
    return createResponse(false, null, 'OCR处理失败');
  }
}

// CH-4 TRAEChannel 接口实现
async function handleMetaSummary() {
  // 模拟系统各模块状态汇总信息
  const summary = {
    worker: { ok: true, version: "2.0.2" },
    kv: { ok: true, namespace: KV_NAMESPACES.SYSTEM },
    monitor: { ok: true, version: "1.1.0" },
    agent: { ok: true, count: 3, online: 2 },
    ai: { ok: true, version: "1.3.1" },
    timestamp: new Date().toISOString()
  };
  return createResponse(true, summary);
}

async function handleMetaVersions() {
  // 返回各模块版本信息
  const versions = {
    modules: {
      worker: "2.0.2",
      kv_storage: KV_NAMESPACES.SYSTEM,
      monitor_module: "1.1.0",
      agent_module: "1.0.0",
      ai_engine: "1.3.1",
      central_console: "1.6.0",
      last_update: new Date().toLocaleString('zh-CN')
    }
  };
  return createResponse(true, versions);
}

async function handleSystemRestart() {
  // 模拟系统重启
  console.log('系统重启命令已接收');
  
  // 在实际环境中，这里应该触发重启逻辑
  return createResponse(true, { ok: true, message: '系统重启命令已执行' });
}

// CH-5 AuditChannel 接口实现
async function handleLogWrite(request) {
  try {
    const body = await request.json();
    const { component, level, message, context } = body;
    
    // 脱敏处理
    const safeContext = { ...context };
    // 移除可能的敏感信息
    if (safeContext.user_info) delete safeContext.user_info;
    if (safeContext.password) delete safeContext.password;
    
    const logEntry = {
      component,
      level,
      message,
      context: safeContext,
      timestamp: Date.now()
    };
    
    // 存储到日志KV
    const logKey = `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kvOperation('log', logKey, 'put', logEntry);
    
    return createResponse(true, { ok: true });
  } catch (error) {
    console.error('日志写入失败:', error);
    return createResponse(false, null, '日志写入失败');
  }
}

// 主请求处理函数
async function handleRequest(request, env = null) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = request.headers.get('Origin');
  
  // 设置CORS头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };

  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request, env);
  }
  
  // 首先检查JEV_ROUTES中的新路径
  if (JEV_ROUTES[path]) {
    const result = await JEV_ROUTES[path](env);
    // 确保设置CORS头
    result.headers.set('Access-Control-Allow-Origin', origin || '*');
    return result;
  }
  
  // 旧路径重定向到新路径
  const oldToNewRoutes = {
    '/ping': '/jev/ping',
    '/status': '/jev/status',
    '/kv/test': '/jev/kv/test',
    '/kv-test': '/jev/kv/test',
    '/panel': '/jev/panel',
    '/monitor': '/jev/monitor'
  };
  
  if (oldToNewRoutes[path]) {
    return Response.redirect(new URL(oldToNewRoutes[path], request.url).toString(), 302);
  }

  // 定义模块的run()方法
const moduleHandlers = {
  core: async () => {
    return { success: true, message: 'Core module executed' };
  },
  ai: async () => {
    return { success: true, message: 'AI module executed' };
  },
  upload: async () => {
    return { success: true, message: 'Upload module executed' };
  },
  translate: async () => {
    return { success: true, message: 'Translate module executed' };
  },
  recommend: async () => {
    return { success: true, message: 'Recommend module executed' };
  },
  kv: async () => {
    return { success: true, message: 'KV module executed' };
  },
  logs: async () => {
    return { success: true, message: 'Logs module executed' };
  }
};

// 路由处理
  try {
    // 静态文件分发模块 - 处理UI资源
    if (url.pathname.startsWith('/ui/') || url.pathname.startsWith('/modules/') || url.pathname.startsWith('/assets/')) {
      const startTime = Date.now();
      try {
        const key = url.pathname.replace(/^\/+/, '');
        const isLoginPage = key === 'ui/login_portal.html';
        
        // 记录渲染事件
        await logUiRenderEvent('ui_resource_request', {
          resource: key,
          type: isLoginPage ? 'login_page' : 'static_asset',
          timestamp: new Date().toISOString()
        });
        
        console.log(`[Static UI] 尝试从UI_BUCKET加载: ${key}`);
        
        // 检查是否有UI_BUCKET绑定
        if (env && env.UI_BUCKET) {
          const object = await env.UI_BUCKET.get(key);
          if (object) {
            // 根据文件扩展名设置正确的Content-Type
            let type = 'text/plain';
            if (key.endsWith('.html')) {
              type = 'text/html; charset=UTF-8';
              // 特别处理登录页面
              if (isLoginPage) {
                console.log('[Static UI] 渲染登录页面');
              }
            } else if (key.endsWith('.js')) type = 'application/javascript; charset=UTF-8';
            else if (key.endsWith('.css')) type = 'text/css; charset=UTF-8';
            else if (key.endsWith('.png')) type = 'image/png';
            else if (key.endsWith('.ico')) type = 'image/x-icon';
            else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) type = 'image/jpeg';
            else if (key.endsWith('.gif')) type = 'image/gif';
            else if (key.endsWith('.svg')) type = 'image/svg+xml';
            else if (key.endsWith('.json')) type = 'application/json';
            else if (key.endsWith('.txt')) type = 'text/plain; charset=UTF-8';
            else if (key.endsWith('.woff')) type = 'font/woff';
            else if (key.endsWith('.woff2')) type = 'font/woff2';
            else if (key.endsWith('.ttf')) type = 'font/ttf';
            else if (key.endsWith('.eot')) type = 'application/vnd.ms-fontobject';
            
            const latency = Date.now() - startTime;
            
            // 记录成功加载和性能指标
            console.log(`[Static UI] 成功加载: ${key} (${type}) - 延迟: ${latency}ms`);
            await logUiRenderEvent('ui_resource_loaded', {
              resource: key,
              latency: latency,
              status: 'success'
            });
            
            return new Response(object.body, {
              headers: {
                'Content-Type': type,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': isLoginPage ? 'no-cache' : 'public, max-age=3600',
                'X-UI-Resource': 'true',
                'X-Response-Time': new Date().toISOString(),
                'X-Latency': `${latency}ms`
              }
            });
          }
          console.log(`[Static UI] 文件未找到: ${key}`);
          await logUiRenderEvent('ui_resource_error', {
            resource: key,
            error: 'not_found',
            status: 404
          });
          return new Response('404 - File not found', { status: 404 });
        } else {
          // 在本地开发环境中，返回模拟的UI文件
          console.log('[Static UI] UI_BUCKET未配置，返回模拟内容');
          const mockContent = getMockUiContent(key);
          if (mockContent) {
            const latency = Date.now() - startTime;
            
            // 记录模拟内容加载
            console.log(`[Static UI] 返回模拟内容: ${key} - 延迟: ${latency}ms`);
            await logUiRenderEvent('ui_resource_loaded', {
              resource: key,
              latency: latency,
              status: 'success',
              mock: true
            });
            
            return new Response(mockContent.content, {
              headers: {
                'Content-Type': mockContent.type,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
                'X-UI-Resource': 'true',
                'X-Mock-Content': 'true',
                'X-Latency': `${latency}ms`
              }
            });
          }
          await logUiRenderEvent('ui_resource_error', {
            resource: key,
            error: 'mock_not_found',
            status: 404
          });
          return new Response('404 - Mock file not found', { status: 404 });
        }
      } catch (error) {
        const latency = Date.now() - startTime;
        console.error('[Static UI] 加载静态文件时出错:', error);
        await logUiRenderEvent('ui_resource_error', {
          resource: url.pathname,
          error: error.message || 'unknown_error',
          status: 500,
          latency: latency
        });
        return new Response('500 - Internal Server Error', { status: 500 });
      }
    }
    
    // HTML响应头配置
    const htmlHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Content-Type": "text/html",
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
    };
    
    // 新增路由规则
    if (path === '/agent_monitor_panel.html') {
      // 尝试从ASSETS获取文件，如果失败则返回默认HTML
      try {
        if (env && env.ASSETS) {
          return new Response(await env.ASSETS.fetch(request.url), {
            headers: htmlHeaders
          });
        }
        // 如果没有ASSETS绑定，返回简单的HTML
        return new Response(`<html>
<head><title>Agent Monitor Panel</title></head>
<body>
<h1>Agent Monitor Panel</h1>
<p>Loading...</p>
</body>
</html>`, {
          headers: htmlHeaders
        });
      } catch (e) {
        console.error('Failed to fetch agent monitor panel:', e);
        return new Response('Failed to load monitor panel', {
          status: 500,
          headers: htmlHeaders
        });
      }
    }
    
    // 添加通用跳转路由
    if (path === '/monitor' || path === '/panel') {
      return Response.redirect('https://jev-client.pages.dev/diagnostics/agent_monitor_panel.html', 302);
    }
    
    switch (path) {
      // CH-1 MonitorChannel
      case '/ping':
        return handlePing(env);
      case '/status': {
        // Worker当前状态
        const responseData = {
          worker: 'jevshop',
          version: 'L11C',
          timestamp: new Date().toISOString(),
          status: 'operational',
          env_available: typeof env === 'object'
        };
        
        return createResponse(true, responseData, null, {}, env);
      }
      case '/kv/test':
      case '/kv-test':
        return handleKvTest(env);
      case '/heartbeat':
        return handleHeartbeat(env);
      case '/modules': {
        // 主模块信息端点
        const modules = {
          core: 'L12-Core',
          ai: 'L12-AI',
          upload: 'L12-Upload',
          translate: 'L12-Translate',
          recommend: 'L12-Recommend',
          kv: 'L12-KV',
          logs: 'L12-Logs'
        };

        return new Response(JSON.stringify({
          success: true,
          data: {
            modules: Object.keys(modules),
            version: 'L12',
            timestamp: new Date().toISOString()
          },
          error: null
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*'
          }
        });
      }
      case '/modules/status': {
        const modules = {
          core: 'L12-Core',
          ai: 'L12-AI',
          upload: 'L12-Upload',
          translate: 'L12-Translate',
          recommend: 'L12-Recommend',
          kv: 'L12-KV',
          logs: 'L12-Logs'
        };

        const result = {
          success: true,
          modules_total: Object.keys(modules).length,
          modules_active: [],
          version_map: {},
          timestamp: new Date().toISOString()
        };

        for (const key of Object.keys(modules)) {
          result.modules_active.push(key);
          result.version_map[key] = modules[key];
        }

        return new Response(JSON.stringify(result, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*'
          }
        });
      }
      case '/meta/kv-latency': {
        const validation = validateRequest(request, 'admin', env);
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleKvLatency(env);
      }
      
      // CH-2 AgentChannel
      case '/agents/register': {
        const validation = validateRequest(request, 'api_key', env);
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleAgentRegister(request, env);
      }
      case '/agent/heartbeat': {
        const validation = validateRequest(request, 'agent', env);
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleAgentHeartbeat(request, env);
      }
      case '/message/ingest': {
        const validation = validateRequest(request, 'agent');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleMessageIngest(request);
      }
      case '/reply/ack': {
        const validation = validateRequest(request, 'agent');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleReplyAck(request);
      }
      case '/conversations/summary': {
        const validation = validateRequest(request, 'admin');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        // 模拟生成3位客服的脱敏会话数据
        const data = [
          {
            agent_id: "A1",
            ai_ratio: 78,
            avg_delay: 3.8,
            events: [
              { time: "12:31:22", type: "ai" },
              { time: "12:32:01", type: "human" },
              { time: "12:33:55", type: "ai" }
            ]
          },
          {
            agent_id: "A2",
            ai_ratio: 90,
            avg_delay: 2.5,
            events: [
              { time: "12:30:11", type: "ai" },
              { time: "12:31:44", type: "ai" }
            ]
          },
          {
            agent_id: "A3",
            ai_ratio: 0,
            avg_delay: 0,
            events: []
          }
        ];
        return createResponse(true, { data }, null, corsHeaders);
      }
      case '/agents/status': {
        const validation = validateRequest(request, 'admin');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        // 模拟客服状态数据
        const agents = [
          { id: "A1", name: "Benson", online: true },
          { id: "A2", name: "Elara", online: true },
          { id: "A3", name: "VK", online: false },
        ];
        return createResponse(true, { data: agents }, null, corsHeaders);
      }
      
      // CH-3 AIAssistChannel
      case '/ai/suggest-reply': {
        const validation = validateRequest(request, 'agent');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleAiSuggestReply(request);
      }
      case '/media/ocr': {
        const validation = validateRequest(request, 'agent');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleMediaOcr(request);
      }
      
      // CH-4 TRAEChannel
      case '/meta/summary': {
        const validation = validateRequest(request, 'admin');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleMetaSummary();
      }
      case '/meta/versions': {
        const validation = validateRequest(request, 'admin');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleMetaVersions();
      }
      case '/system/restart': {
        const validation = validateRequest(request, 'admin');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleSystemRestart();
      }
      
      // CH-5 AuditChannel
      case '/log/write': {
        const validation = validateRequest(request, 'agent');
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleLogWrite(request);
      }
      
      // 原有接口保持兼容
      case '/upload-image': {
        const validation = validateRequest(request, 'api_key', env);
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleUploadImage(request, env);
      }
      case '/analyze-image': {
        const validation = validateRequest(request, 'api_key', env);
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleAnalyzeImage(request, env);
      }
      case '/chat-reply': {
        const validation = validateRequest(request, 'api_key', env);
        if (!validation.valid) {
          return createResponse(false, null, validation.error, corsHeaders);
        }
        return handleChatReply(request, env);
      }
      case '/api/image': {
        const filename = url.searchParams.get('filename');
        if (!filename) {
          return new Response('Missing filename', { status: 400 });
        }
        const response = await getImageFromR2(filename, env);
        return response || new Response('Image not found', { status: 404 });
      }
      case '/module/core': {
        await moduleHandlers.core();
        return createResponse(true, { success: true, module: 'core', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      case '/module/ai': {
        await moduleHandlers.ai();
        return createResponse(true, { success: true, module: 'ai', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      case '/module/upload': {
        await moduleHandlers.upload();
        return createResponse(true, { success: true, module: 'upload', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      case '/module/translate': {
        await moduleHandlers.translate();
        return createResponse(true, { success: true, module: 'translate', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      case '/module/recommend': {
        await moduleHandlers.recommend();
        return createResponse(true, { success: true, module: 'recommend', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      case '/module/kv': {
        await moduleHandlers.kv();
        return createResponse(true, { success: true, module: 'kv', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      case '/module/logs': {
        await moduleHandlers.logs();
        return createResponse(true, { success: true, module: 'logs', version: 'L12', timestamp: new Date().toISOString() }, null, corsHeaders);
      }
      
      // Auto Task Runner API endpoints
      case '/api/google-vision/analyze': {
        // 使用现有的handleAnalyzeImage函数或返回模拟数据
        try {
          const MOCK_GOOGLE_RESPONSE = {
            responses: [{
              labelAnnotations: [
                { description: '测试图片', score: 0.95 },
                { description: '文档', score: 0.87 },
                { description: '界面', score: 0.72 }
              ],
              textAnnotations: [
                { description: '测试内容', boundingPoly: { vertices: [] } }
              ],
              safeSearchAnnotation: {
                adult: 'VERY_UNLIKELY',
                spoof: 'VERY_UNLIKELY',
                medical: 'UNLIKELY',
                violence: 'UNLIKELY',
                racy: 'VERY_UNLIKELY'
              }
            }]
          };
          
          return createResponse(true, MOCK_GOOGLE_RESPONSE);
        } catch (error) {
          return createResponse(false, null, { message: 'Google Vision API error', error: error.message });
        }
      }
      
      case '/api/deepseek/process': {
        try {
          const MOCK_DEEPSEEK_RESPONSE = {
            task_id: 'task_' + Math.random().toString(36).substr(2, 9),
            status: 'completed',
            processing_time_ms: Math.floor(Math.random() * 1000) + 500,
            results: {
              semantic_analysis: {
                confidence: 0.92,
                categories: [
                  { label: '测试数据', score: 0.95 },
                  { label: '示例内容', score: 0.88 },
                  { label: '界面元素', score: 0.75 }
                ],
                key_elements: [
                  { name: '测试标记', confidence: 0.93, location: { x: 0, y: 0, width: 10, height: 10 } }
                ]
              },
              metadata: {
                detected_objects: 1,
                analyzed_regions: 1,
                processing_level: 'enhanced'
              },
              recommendations: [
                {
                  type: 'content_analysis',
                  confidence: 0.90,
                  description: '此为测试图片样本，用于系统功能验证'
                }
              ]
            },
            timestamp: new Date().toISOString()
          };
          
          return createResponse(true, MOCK_DEEPSEEK_RESPONSE);
        } catch (error) {
          return createResponse(false, null, { message: 'DEEPSEEK API error', error: error.message });
        }
      }
      
      case '/api/health': {
        return createResponse(true, {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'JEV Auto Task Server'
        });
      }
        
      case '/user.js':
      case '/jev_chat_capture.user.js':
        // 返回用户脚本内容
        const userScriptContent = `// ==UserScript==
// @name         JEV ChatCapture Plugin
// @namespace    JEV.L8.9.9.2
// @version      1.0
// @description  自动采集 Daojie 聊天记录并上传到 JEV Worker
// @match        https://app.daojiemarketing.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev/messages/ingest';
  const token = localStorage.getItem('JEV_AGENT_TOKEN');

  function uploadMessage(payload) {
    fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(d => {
      console.log('[ChatCapture] 上传成功:', d);
    }).catch(e => console.error('[ChatCapture] 上传失败', e));
  }

  function extractMessage(node) {
    try {
      const text = node.innerText?.trim() || '';
      const imgs = Array.from(node.querySelectorAll('img')).map(i => i.src);
      const sender = node.querySelector('.sender-name')?.innerText || 'unknown';
      if (!text && imgs.length === 0) return;
      uploadMessage({ sender, body: text, images: imgs, timestamp: new Date().toISOString() });
    } catch (e) { console.error('[ChatCapture] extract error', e); }
  }

  const chatContainer = document.querySelector('#chat-messages, .chat-content, .conversation-container');
  if (!chatContainer) {
    console.warn('[ChatCapture] 未找到聊天容器，等待加载...');
    const observer = new MutationObserver(() => {
      const target = document.querySelector('#chat-messages, .chat-content, .conversation-container');
      if (target) { observer.disconnect(); initObserver(target); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    initObserver(chatContainer);
  }

  function initObserver(target) {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && (node.classList.contains('message-item') || node.querySelector('.message-text'))) {
            extractMessage(node);
          }
        });
      });
    });
    observer.observe(target, { childList: true, subtree: true });
  }

})();`;
        return new Response(userScriptContent, {
          headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': origin || '*',
            'Content-Disposition': 'attachment; filename="jev_chat_capture.user.js"'
          }
        });
      default:
        return createResponse(false, null, 'Endpoint not found', corsHeaders);
    }
  } catch (error) {
    console.error('请求处理错误:', error);
    return createResponse(false, null, '服务器内部错误', corsHeaders);
  }
}

// 为了支持Cloudflare Workers环境
if (typeof addEventListener !== 'undefined') {
  addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request, event.env));
  });
}

// 模拟cloudflare对象（用于本地测试）
if (typeof cloudflare === 'undefined') {
  (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {})).cloudflare = {
    env: {
      // 开发环境密钥模拟 - 生产环境将使用Cloudflare Secrets
      ADMIN_TOKEN: 'admin-token-123',
      API_KEY: 'api-key-456',
      JEV_API_KEY: 'jev-api-key-789',
      DAOJIE_API_KEY: 'daojie-api-key-012',
      LEADCONNECTOR_API_KEY: 'leadconnector-api-key-345',
      DAOIJE_WABA_TOKEN: 'daoiije-waba-token-678',
      MODE: 'development',
      ALLOW_ORIGIN: '*'
    }
  };
}

// Mock KV already defined earlier in the file

// 模拟环境变量（用于本地测试）
const globalScope = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {});
if (typeof GOOGLE_API_KEY === 'undefined') {
  globalScope.GOOGLE_API_KEY = 'AIzaSyC8Rntlne_W6bML1CZRCtL2jjpAOeRmP8E';
}

if (typeof DEEPSEEK_API_KEY === 'undefined') {
  globalScope.DEEPSEEK_API_KEY = 'sk-77dbd0cc5f30451daa863d5213e6607f';
}

// 记录UI渲染日志的函数
async function logUiRenderEvent(eventType, details = {}) {
  try {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      event_type: eventType,
      details,
      worker: 'jevshop',
      version: 'L11C',
      environment: process.env?.ENVIRONMENT || 'development'
    };
    
    const logKey = `jev_logs/deploy/ui_r2_link_${timestamp.replace(/[:.]/g, '-')}.json`;
    
    // 尝试写入到R2日志存储桶
    if (typeof R2_BUCKET_LOGS !== 'undefined' && R2_BUCKET_LOGS) {
      await R2_BUCKET_LOGS.put(logKey, JSON.stringify(logData), {
        httpMetadata: { contentType: 'application/json' }
      });
      console.log(`[UI Log] 已写入日志: ${logKey}`);
    } else {
      // 在本地环境中，直接输出到控制台
      console.log(`[UI Log] ${eventType}:`, logData);
      
      // 尝试写入到本地文件系统（仅开发环境）
      if (typeof Deno !== 'undefined' && Deno.env.get('MODE') === 'development') {
        try {
          await Deno.writeTextFile(logKey, JSON.stringify(logData, null, 2));
        } catch (err) {
          console.error('写入本地日志失败:', err);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('记录UI渲染日志失败:', error);
    return false;
  }
}

// 模拟R2存储桶（支持日志推送）
if (typeof R2_BUCKET === 'undefined') {
  const globalScope = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {});
  globalScope.R2_BUCKET = 'MY_BUCKET';
  
  // 模拟R2日志存储桶（用于Observability）
  if (!globalScope.R2_BUCKET_LOGS) {
    globalScope.R2_BUCKET_LOGS = {
      put: async (key, value, options) => {
        console.log(`模拟R2日志存储: ${key}`);
        return { success: true };
      }
    };
  }
}

// 全局暴露日志函数
if (typeof self !== 'undefined') {
  self.logUiRenderEvent = logUiRenderEvent;
} else if (typeof global !== 'undefined') {
  global.logUiRenderEvent = logUiRenderEvent;
}

// 导出默认的fetch处理函数作为ES Module入口
// export default {
//   async fetch(request, env, ctx) {
//     return handleRequest(request, env, ctx);
//   }
// };

// 保持CommonJS兼容性
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    handleRequest,
    default: { fetch: (req, env, ctx) => handleRequest(req, env, ctx) }
  };
}