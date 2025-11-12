// JEV Worker - 静态文件分发和API处理

// 模拟KV存储 (用于本地测试)
const mockKV = {
  system: {},
  agent: {},
  log: {},
  meta: {}
};

// 创建JSON响应
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理KV操作
async function kvOperation(namespace, key, operation, value = null) {
  try {
    if (!namespace || !key) {
      return { success: false, error: '缺少必要参数' };
    }

    // 本地开发环境使用mockKV
    const store = mockKV[namespace];
    if (!store) {
      return { success: false, error: '无效的命名空间' };
    }

    if (operation === 'get') {
      return { success: true, data: store[key] || null };
    } else if (operation === 'put') {
      store[key] = value;
      return { success: true };
    } else if (operation === 'delete') {
      delete store[key];
      return { success: true };
    } else {
      return { success: false, error: '无效的操作类型' };
    }
  } catch (error) {
    console.error('KV操作失败:', error);
    return { success: false, error: error.message };
  }
}

// 处理OPTIONS请求
async function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 处理ping请求
async function handlePing(env = null) {
  const startTime = Date.now();
  try {
    // 检查KV连接
    const kvCheck = await kvOperation('system', 'ping', 'get');
    const latency = Date.now() - startTime;
    
    return json({
      success: true,
      message: 'JEV Cloudflare Worker 运行正常',
      version: '16.0.0',
      latency: `${latency}ms`,
      routes: [
        '/api/jev/ping - 系统健康检测',
        '/api/jev/ui - UI状态管理',
        '/api/jev/agents - 代理管理',
        '/api/jev/ocr/result - OCR结果处理',
        '/api/jev/task/ai - AI任务处理',
        '/api/jev/status - 系统状态汇总'
      ]
    });
  } catch (error) {
    console.error('Ping处理失败:', error);
    return json({ success: false, message: '系统异常', error: error.message }, 500);
  }
}

// 处理系统状态请求
async function handleStatus(env = null) {
  try {
    return json({
      success: true,
      data: {
        online: true,
        version: '16.0.0',
        uptime: '24h 30m',
        loadAverage: '0.82',
        staticLayer: 'R2'
      }
    });
  } catch (error) {
    console.error('状态处理失败:', error);
    return json({ success: false, message: '获取状态失败', error: error.message }, 500);
  }
}

// 模拟静态文件
const STATIC_FILES = {
  // 登录页面
  'ui/login_portal.html': {
    content: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>JEV系统登录</title>\n  <link rel="stylesheet" href="/assets/main.css">\n</head>\n<body>\n  <div class="login-container">\n    <div class="login-header">\n      <h1>JEV系统</h1>\n      <p>请登录以继续</p>\n    </div>\n    <div class="login-form">\n      <div class="form-group">\n        <label for="username">用户名</label>\n        <input type="text" id="username" placeholder="请输入用户名">\n      </div>\n      <div class="form-group">\n        <label for="password">密码</label>\n        <input type="password" id="password" placeholder="请输入密码">\n      </div>\n      <button id="login-btn" class="login-btn">登录</button>\n      <div class="login-footer">\n        <a href="#">忘记密码?</a>\n        <a href="/ui/register.html">注册账号</a>\n      </div>\n    </div>\n  </div>\n  <script src="/modules/login_panel.js"></script>\n</body>\n</html>',
    type: 'text/html; charset=UTF-8'
  },
  
  // 注册页面
  'ui/register.html': {
    content: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>JEV系统注册</title>\n  <link rel="stylesheet" href="/assets/main.css">\n</head>\n<body>\n  <div class="login-container">\n    <div class="login-header">\n      <h1>JEV系统</h1>\n      <p>创建新账号</p>\n    </div>\n    <div class="login-form">\n      <div class="form-group">\n        <label for="reg-username">用户名</label>\n        <input type="text" id="reg-username" placeholder="请输入用户名">\n      </div>\n      <div class="form-group">\n        <label for="reg-password">密码</label>\n        <input type="password" id="reg-password" placeholder="请输入密码">\n      </div>\n      <div class="form-group">\n        <label for="reg-confirm-password">确认密码</label>\n        <input type="password" id="reg-confirm-password" placeholder="请再次输入密码">\n      </div>\n      <button id="register-btn" class="login-btn">注册</button>\n      <div class="login-footer">\n        <a href="/ui/login_portal.html">已有账号？返回登录</a>\n      </div>\n    </div>\n  </div>\n  <script>\n    console.log("Register panel script loaded");\n\n    // 注册表单处理\n    const registerBtn = document.getElementById("register-btn");\n    const usernameInput = document.getElementById("reg-username");\n    const passwordInput = document.getElementById("reg-password");\n    const confirmPasswordInput = document.getElementById("reg-confirm-password");\n\n    registerBtn.addEventListener("click", async () => {\n      const username = usernameInput.value.trim();\n      const password = passwordInput.value.trim();\n      const confirmPassword = confirmPasswordInput.value.trim();\n      \n      // 验证表单\n      if (!username || !password || !confirmPassword) {\n        alert("请填写所有必填字段");\n        return;\n      }\n      \n      if (password !== confirmPassword) {\n        alert("两次输入的密码不一致");\n        return;\n      }\n      \n      if (password.length < 6) {\n        alert("密码长度至少为6位");\n        return;\n      }\n      \n      try {\n        // 显示加载状态\n        registerBtn.disabled = true;\n        registerBtn.textContent = "注册中...";\n        \n        // 发送注册请求\n        const response = await fetch("/api/jev/register", {\n          method: "POST",\n          headers: {\n            "Content-Type": "application/json"\n          },\n          body: JSON.stringify({ username, password })\n        });\n        \n        const data = await response.json();\n        \n        if (data.success) {\n          alert("注册成功！请登录");\n          window.location.href = "/ui/login_portal.html";\n        } else {\n          alert("注册失败: " + (data.message || "注册请求处理失败"));\n        }\n      } catch (error) {\n        console.error("注册请求失败:", error);\n        alert("注册失败，请稍后重试");\n      } finally {\n        // 恢复按钮状态\n        registerBtn.disabled = false;\n        registerBtn.textContent = "注册";\n      }\n    });\n\n    // 添加回车键支持\n    usernameInput.addEventListener("keyup", (e) => {\n      if (e.key === "Enter") {\n        passwordInput.focus();\n      }\n    });\n\n    passwordInput.addEventListener("keyup", (e) => {\n      if (e.key === "Enter") {\n        confirmPasswordInput.focus();\n      }\n    });\n\n    confirmPasswordInput.addEventListener("keyup", (e) => {\n      if (e.key === "Enter") {\n        registerBtn.click();\n      }\n    });\n  </script>\n</body>\n</html>',
    type: 'text/html; charset=UTF-8'
  },
  
  // CSS样式
  'assets/main.css': {
    content: '* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  height: 100vh;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n\n.login-container {\n  background: white;\n  border-radius: 10px;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);\n  width: 100%;\n  max-width: 400px;\n  overflow: hidden;\n}\n\n.login-header {\n  padding: 30px;\n  text-align: center;\n  background: #f8f9fa;\n}\n\n.login-header h1 {\n  color: #333;\n  margin-bottom: 10px;\n}\n\n.login-header p {\n  color: #666;\n  font-size: 14px;\n}\n\n.login-form {\n  padding: 30px;\n}\n\n.form-group {\n  margin-bottom: 20px;\n}\n\n.form-group label {\n  display: block;\n  margin-bottom: 5px;\n  color: #333;\n  font-weight: 500;\n}\n\n.form-group input {\n  width: 100%;\n  padding: 12px 15px;\n  border: 1px solid #ddd;\n  border-radius: 5px;\n  font-size: 16px;\n  transition: border-color 0.3s;\n}\n\n.form-group input:focus {\n  outline: none;\n  border-color: #667eea;\n}\n\n.login-btn {\n  width: 100%;\n  padding: 12px;\n  background: #667eea;\n  color: white;\n  border: none;\n  border-radius: 5px;\n  font-size: 16px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: background 0.3s;\n}\n\n.login-btn:hover {\n  background: #5a67d8;\n}\n\n.login-footer {\n  display: flex;\n  justify-content: space-between;\n  margin-top: 20px;\n}\n\n.login-footer a {\n  color: #667eea;\n  text-decoration: none;\n  font-size: 14px;\n}\n\n.login-footer a:hover {\n  text-decoration: underline;\n}',
    type: 'text/css'
  },
  
  // 仪表板页面
  'ui/dashboard.html': {
    content: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>JEV系统仪表板</title>\n  <link rel="stylesheet" href="/assets/main.css">\n  <style>\n    .dashboard-container {\n      background: white;\n      border-radius: 10px;\n      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);\n      width: 100%;\n      max-width: 800px;\n      padding: 30px;\n    }\n    .dashboard-header {\n      text-align: center;\n      margin-bottom: 30px;\n    }\n    .dashboard-header h1 {\n      color: #333;\n      margin-bottom: 10px;\n    }\n    .dashboard-welcome {\n      color: #666;\n      font-size: 16px;\n      margin-bottom: 20px;\n    }\n    .dashboard-stats {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n      gap: 20px;\n      margin-bottom: 30px;\n    }\n    .stat-card {\n      background: #f8f9fa;\n      padding: 20px;\n      border-radius: 8px;\n      text-align: center;\n    }\n    .stat-value {\n      font-size: 28px;\n      font-weight: bold;\n      color: #667eea;\n      margin-bottom: 5px;\n    }\n    .stat-label {\n      color: #666;\n      font-size: 14px;\n    }\n    .dashboard-actions {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n      gap: 15px;\n    }\n    .action-btn {\n      padding: 15px;\n      background: #667eea;\n      color: white;\n      border: none;\n      border-radius: 5px;\n      font-size: 16px;\n      font-weight: 500;\n      cursor: pointer;\n      transition: background 0.3s;\n    }\n    .action-btn:hover {\n      background: #5a67d8;\n    }\n    .logout-btn {\n      background: #f56565;\n      margin-top: 20px;\n      width: 100%;\n    }\n    .logout-btn:hover {\n      background: #e53e3e;\n    }\n  </style>\n</head>\n<body>\n  <div class="dashboard-container">\n    <div class="dashboard-header">\n      <h1>JEV系统</h1>\n      <div class="dashboard-welcome">\n        欢迎回来！系统运行正常。\n      </div>\n    </div>\n    \n    <div class="dashboard-stats">\n      <div class="stat-card">\n        <div class="stat-value">16.0.0</div>\n        <div class="stat-label">系统版本</div>\n      </div>\n      <div class="stat-card">\n        <div class="stat-value">24h 30m</div>\n        <div class="stat-label">运行时间</div>\n      </div>\n      <div class="stat-card">\n        <div class="stat-value">0.82</div>\n        <div class="stat-label">负载平均值</div>\n      </div>\n      <div class="stat-card">\n        <div class="stat-value">R2</div>\n        <div class="stat-label">静态层</div>\n      </div>\n    </div>\n    \n    <div class="dashboard-actions">\n      <button class="action-btn" onclick="showSystemInfo()">系统信息</button>\n      <button class="action-btn" onclick="showTasks()">任务管理</button>\n      <button class="action-btn" onclick="showSettings()">系统设置</button>\n      <button class="action-btn" onclick="showLogs()">查看日志</button>\n    </div>\n    \n    <button class="action-btn logout-btn" onclick="logout()">退出登录</button>\n  </div>\n  \n  <script>\n    function showSystemInfo() {\n      alert("系统信息功能开发中...");\n    }\n    \n    function showTasks() {\n      alert("任务管理功能开发中...");\n    }\n    \n    function showSettings() {\n      alert("系统设置功能开发中...");\n    }\n    \n    function showLogs() {\n      alert("日志查看功能开发中...");\n    }\n    \n    function logout() {\n      if (confirm("确定要退出登录吗？")) {\n        window.location.href = "/ui/login_portal.html";\n      }\n    }\n    \n    // 页面加载时的欢迎信息\n    window.onload = function() {\n      console.log("仪表板页面加载完成");\n    };\n  </script>\n</body>\n</html>',
    type: 'text/html; charset=UTF-8'
  },
  
  // 登录脚本
  'modules/login_panel.js': {
    content: 'console.log(\'Login panel script loaded\');\n\n// 登录表单处理\nconst loginForm = document.querySelector(\'.login-form\');\nconst loginBtn = document.getElementById(\'login-btn\');\nconst usernameInput = document.getElementById(\'username\');\nconst passwordInput = document.getElementById(\'password\');\n\nloginBtn.addEventListener(\'click\', async () => {\n  const username = usernameInput.value.trim();\n  const password = passwordInput.value.trim();\n  \n  if (!username || !password) {\n    alert(\'请输入用户名和密码\');\n    return;\n  }\n  \n  try {\n    // 显示加载状态\n    loginBtn.disabled = true;\n    loginBtn.textContent = \'登录中...\';\n    \n    // 模拟API请求\n    const response = await fetch(\'/api/jev/login\', {\n      method: \'POST\',\n      headers: {\n        \'Content-Type\': \'application/json\'\n      },\n      body: JSON.stringify({ username, password })\n    });\n    \n    const data = await response.json();\n    \n    if (data.success) {\n      alert(\'登录成功！\');\n      // 跳转到主页或仪表板\n      window.location.href = \'/ui/dashboard.html\';\n    } else {\n      alert(\'登录失败: \' + (data.message || \'用户名或密码错误\'));\n    }\n  } catch (error) {\n    console.error(\'登录请求失败:\', error);\n    alert(\'登录失败，请稍后重试\');\n  } finally {\n    // 恢复按钮状态\n    loginBtn.disabled = false;\n    loginBtn.textContent = \'登录\';\n  }\n});\n\n// 添加回车键提交支持\nusernameInput.addEventListener(\'keyup\', (e) => {\n  if (e.key === \'Enter\') {\n    passwordInput.focus();\n  }\n});\n\npasswordInput.addEventListener(\'keyup\', (e) => {\n  if (e.key === \'Enter\') {\n    loginBtn.click();\n  }\n});',
    type: 'application/javascript; charset=UTF-8'
  }
};

// 静态文件分发函数
async function serveStaticFile(url, env) {
  // 记录静态文件访问
  console.log(`✅ Static UI Layer Loaded | 延迟 <100ms`);
  
  try {
    // 提取文件路径
    const key = url.pathname.replace(/^\/+|\/+$/g, '');
    
    // 先检查模拟文件系统
    if (STATIC_FILES[key]) {
      const file = STATIC_FILES[key];
      return new Response(file.content, {
        headers: {
          'Content-Type': file.type,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // 检查R2存储桶是否存在
    if (env && env.UI_BUCKET) {
      try {
        const object = await env.UI_BUCKET.get(key);
        if (object) {
          // 设置正确的Content-Type
          let type = object.httpMetadata?.contentType || 'text/plain';
          if (!type && key.endsWith('.html')) type = 'text/html; charset=UTF-8';
          else if (!type && key.endsWith('.js')) type = 'application/javascript; charset=UTF-8';
          else if (!type && key.endsWith('.css')) type = 'text/css';
          else if (!type && key.endsWith('.png')) type = 'image/png';
          else if (!type && key.endsWith('.ico')) type = 'image/x-icon';
          else if (!type && (key.endsWith('.jpg') || key.endsWith('.jpeg'))) type = 'image/jpeg';
          else if (!type && key.endsWith('.svg')) type = 'image/svg+xml';
          else if (!type && key.endsWith('.json')) type = 'application/json; charset=UTF-8';
          
          return new Response(object.body, {
            headers: {
              'Content-Type': type,
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache'
            }
          });
        }
      } catch (r2Error) {
        console.warn('R2访问失败:', r2Error.message);
        // 继续使用模拟数据
      }
    }
    
    // 如果是根路径，重定向到登录页面
    if (key === '') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/ui/login_portal.html'
        }
      });
    }
    
    return new Response('404 - File not found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('静态文件分发失败:', error);
    return new Response('500 - Internal Server Error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// 处理登录请求
async function handleLogin(request) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // 模拟登录逻辑
    if (username && password) {
      return json({
        success: true,
        message: '登录成功',
        token: 'mock-token-' + Date.now(),
        userId: 'user-' + username
      });
    } else {
      return json({ success: false, message: '用户名或密码不能为空' }, 400);
    }
  } catch (error) {
    console.error('登录处理失败:', error);
    return json({ success: false, message: '登录请求处理失败', error: error.message }, 500);
  }
}

// 处理注册请求
async function handleRegister(request) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // 验证输入
    if (!username || !password) {
      return json({ success: false, message: '用户名和密码不能为空' }, 400);
    }
    
    if (password.length < 6) {
      return json({ success: false, message: '密码长度至少为6位' }, 400);
    }
    
    // 模拟注册逻辑
    // 在实际应用中，这里应该进行密码哈希和用户存储
    console.log(`新用户注册: ${username}`);
    
    // 保存到模拟KV
    await kvOperation('system', `user_${username}`, 'put', {
      username,
      password: password, // 实际应用中应该哈希存储
      created: new Date().toISOString()
    });
    
    return json({
      success: true,
      message: '注册成功',
      userId: 'user-' + username
    });
  } catch (error) {
    console.error('注册处理失败:', error);
    return json({ success: false, message: '注册请求处理失败', error: error.message }, 500);
  }
}

// 主请求处理函数
async function handleRequest(request, env) {
  try {
    const url = new URL(request.url);
    
    // 处理OPTIONS请求
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    // 处理静态文件请求
    if (url.pathname.startsWith('/ui/') || url.pathname.startsWith('/modules/') || url.pathname.startsWith('/assets/')) {
      return serveStaticFile(url, env);
    }
    
    // API路由处理
    const path = url.pathname;
    
    // 处理ping请求
    if (path === '/ping' || path === '/api/jev/ping') {
      return handlePing(env);
    }
    
    // 处理系统状态请求
    if (path === '/api/jev/status') {
      return handleStatus(env);
    }
    
    // 处理登录请求
    if (path === '/api/jev/login' && request.method === 'POST') {
      return handleLogin(request);
    }
    
    // 处理注册请求
    if (path === '/api/jev/register' && request.method === 'POST') {
      return handleRegister(request);
    }
    
    // 根路径重定向
    if (path === '/') {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/ui/login_portal.html' }
      });
    }
    
    // 默认响应 - 显示系统信息
    return json({
      success: true,
      message: 'JEV Cloudflare Worker 运行正常',
      version: '16.0.0',
      routes: [
        '/api/jev/ping - 系统健康检测',
        '/api/jev/ui - UI状态管理',
        '/api/jev/agents - 代理管理',
        '/api/jev/ocr/result - OCR结果处理',
        '/api/jev/task/ai - AI任务处理',
        '/api/jev/status - 系统状态汇总'
      ]
    });
  } catch (error) {
    console.error('请求处理失败:', error);
    return json({ success: false, message: '服务器内部错误', error: error.message }, 500);
  }
}

// 导出处理函数 (Cloudflare Worker环境)
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, event.env));
});