// Cloudflare Workers环境中crypto已经可用，无需额外导入

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const startTime = performance.now();
    
    // 通用响应封装
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    
    // HTML响应封装，包含统一的响应头
    const htmlResponse = (content, status = 200) =>
      new Response(content, {
        status,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        },
      });
    
    // 默认登录页面内容
    const loginPageHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV Client - 登录门户</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #1a56db;
            --background-light: #ffffff;
            --background-gray: #f9fafb;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--background-gray);
            color: #1f2937;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .login-container {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
        }
        .login-card {
            background-color: var(--background-light);
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 2rem;
        }
        .card-header {
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .navbar-brand {
            color: var(--primary-color);
            font-size: 1.5rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .card-title {
            margin: 0;
            font-size: 1.5rem;
            color: #1f2937;
        }
        .card-subtitle {
            margin-top: 0.5rem;
            color: #6b7280;
            font-size: 0.875rem;
        }
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            color: #374151;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .form-control {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-size: 1rem;
            transition: border-color 0.15s ease-in-out;
            box-sizing: border-box;
        }
        .form-control:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1);
        }
        .captcha-image {
            background-color: #f8f9fa;
            cursor: pointer;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 0.75rem;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 0.375rem;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
        }
        .btn:hover {
            background-color: #1e40af;
        }
        .text-center {
            text-align: center;
            margin-top: 1rem;
        }
        .text-center a {
            color: var(--primary-color);
            text-decoration: none;
        }
        .text-center a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="card-header">
                <div class="navbar-brand">
                    <i class="fas fa-shield-alt fa-2x"></i>
                    <span>JEV Client</span>
                </div>
                <h1 class="card-title">登录门户</h1>
                <p class="card-subtitle">请输入您的凭证以访问系统</p>
            </div>
            
            <div class="card-body">
                <form id="login-form">
                    <div class="form-group">
                        <label for="email" class="form-label">
                            <i class="fas fa-envelope"></i> 邮箱
                        </label>
                        <input 
                            type="email" 
                            id="email" 
                            class="form-control" 
                            placeholder="请输入邮箱"
                            required
                            autocomplete="email"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">
                            <i class="fas fa-lock"></i> 密码
                        </label>
                        <input 
                            type="password" 
                            id="password" 
                            class="form-control" 
                            placeholder="请输入密码"
                            required
                            autocomplete="current-password"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="captcha" class="form-label">
                            <i class="fas fa-puzzle-piece"></i> 验证码
                        </label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input 
                                type="text" 
                                id="captcha" 
                                class="form-control" 
                                placeholder="请输入验证码"
                                required
                                autocomplete="off"
                                style="flex: 1;">
                            <div id="captcha-image" style="height: 40px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 18px; letter-spacing: 5px; user-select: none;">
                                点击生成验证码
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group" style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input 
                                type="checkbox" 
                                id="remember-me" 
                                style="width: auto; margin: 0;">
                            <label for="remember-me" style="margin: 0;">记住我</label>
                        </div>
                        <div style="display: flex; gap: 1rem;">
                            <a href="/register" style="color: var(--primary-color); text-decoration: none;">
                                注册账号
                            </a>
                            <a href="#" style="color: var(--primary-color); text-decoration: none;">
                                忘记密码？
                            </a>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn">登录</button>
                </form>
            </div>
        </div>
        <div class="text-center" style="margin-top: 1rem; color: #6b7280; font-size: 0.875rem;">
            © 2025 JEV AI 智能客服系统 - Cloudflare Worker 部署
        </div>
    </div>
    
    <script>
        // 验证码生成
        document.getElementById('captcha-image').addEventListener('click', function() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            let captchaText = '';
            for (let i = 0; i < 4; i++) {
                captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            this.textContent = captchaText;
        });
        
        // 表单提交
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // 添加安全头并发送请求
            fetch('/api/jev/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': 'jev-secure-key-001',
                    'X-System-Layer': 'support'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 存储token并跳转到主页
                    localStorage.setItem('jev_token', data.token);
                    localStorage.setItem('jev_userId', data.userId);
                    alert('登录成功！');
                    window.location.href = '/dashboard';
                } else {
                    alert('登录失败：' + data.message);
                }
            })
            .catch(error => {
                alert('登录出错：' + error.message);
            });
        });
    </script>
</body>
</html>`;
    
    // 注册页面内容
    const registerPageHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV Client - 注册账号</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #1a56db;
            --background-light: #ffffff;
            --background-gray: #f9fafb;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--background-gray);
            color: #1f2937;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .register-container {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
        }
        .register-card {
            background-color: var(--background-light);
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 2rem;
        }
        .card-header {
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .navbar-brand {
            color: var(--primary-color);
            font-size: 1.5rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .card-title {
            margin: 0;
            font-size: 1.5rem;
            color: #1f2937;
        }
        .card-subtitle {
            margin-top: 0.5rem;
            color: #6b7280;
            font-size: 0.875rem;
        }
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            color: #374151;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .form-control {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-size: 1rem;
            transition: border-color 0.15s ease-in-out;
            box-sizing: border-box;
        }
        .form-control:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1);
        }
        .btn {
            display: block;
            width: 100%;
            padding: 0.75rem;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 0.375rem;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
        }
        .btn:hover {
            background-color: #1e40af;
        }
        .text-center {
            text-align: center;
            margin-top: 1rem;
        }
        .text-center a {
            color: var(--primary-color);
            text-decoration: none;
        }
        .text-center a:hover {
            text-decoration: underline;
        }
        .password-strength {
            height: 5px;
            margin-top: 0.5rem;
            border-radius: 2.5px;
            background-color: #e5e7eb;
            transition: width 0.3s ease;
        }
        .password-hint {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="register-container">
        <div class="register-card">
            <div class="card-header">
                <div class="navbar-brand">
                    <i class="fas fa-shield-alt fa-2x"></i>
                    <span>JEV Client</span>
                </div>
                <h1 class="card-title">注册账号</h1>
                <p class="card-subtitle">创建新账号以访问JEV系统</p>
            </div>
            
            <div class="card-body">
                <form id="register-form">
                    <div class="form-group">
                        <label for="email" class="form-label">
                            <i class="fas fa-envelope"></i> 邮箱
                        </label>
                        <input 
                            type="email" 
                            id="email" 
                            class="form-control" 
                            placeholder="请输入邮箱"
                            required
                            autocomplete="email"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">
                            <i class="fas fa-lock"></i> 密码
                        </label>
                        <input 
                            type="password" 
                            id="password" 
                            class="form-control" 
                            placeholder="请输入密码（至少8位）"
                            required
                            autocomplete="new-password"
                        >
                        <div id="password-strength" class="password-strength"></div>
                        <div class="password-hint">密码应包含字母、数字和特殊字符</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm-password" class="form-label">
                            <i class="fas fa-lock"></i> 确认密码
                        </label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            class="form-control" 
                            placeholder="请再次输入密码"
                            required
                            autocomplete="new-password"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="captcha" class="form-label">
                            <i class="fas fa-puzzle-piece"></i> 验证码
                        </label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input 
                                type="text" 
                                id="captcha" 
                                class="form-control" 
                                placeholder="请输入验证码"
                                required
                                autocomplete="off"
                                style="flex: 1;">
                            <div id="captcha-image" style="height: 40px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 18px; letter-spacing: 5px; user-select: none;">
                                点击生成验证码
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input 
                            type="checkbox" 
                            id="agree-terms" 
                            style="width: auto; margin: 0;"
                            required
                        >
                        <label for="agree-terms" style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                            我已阅读并同意 <a href="#" style="color: var(--primary-color); text-decoration: none;">服务条款</a> 和 <a href="#" style="color: var(--primary-color); text-decoration: none;">隐私政策</a>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn">注册</button>
                </form>
            </div>
        </div>
        <div class="text-center">
            <p style="color: #6b7280; font-size: 0.875rem;">已有账号？ <a href="/">立即登录</a></p>
            <p style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">
                © 2025 JEV AI 智能客服系统 - Cloudflare Worker 部署
            </p>
        </div>
    </div>
    
    <script>
        // 验证码生成
        document.getElementById('captcha-image').addEventListener('click', function() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            let captchaText = '';
            for (let i = 0; i < 4; i++) {
                captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            this.textContent = captchaText;
        });
        
        // 密码强度检测
        document.getElementById('password').addEventListener('input', function() {
            const password = this.value;
            const strengthBar = document.getElementById('password-strength');
            
            let strength = 0;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            strengthBar.style.width = (strength * 25) + '%';
            
            if (strength <= 1) {
                strengthBar.style.backgroundColor = '#ef4444'; // 红色
            } else if (strength <= 2) {
                strengthBar.style.backgroundColor = '#f59e0b'; // 黄色
            } else if (strength <= 3) {
                strengthBar.style.backgroundColor = '#10b981'; // 绿色
            } else {
                strengthBar.style.backgroundColor = '#059669'; // 深绿色
            }
        });
        
        // 表单提交
        document.getElementById('register-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // 验证密码是否一致
            if (password !== confirmPassword) {
                alert('两次输入的密码不一致');
                return;
            }
            
            // 验证密码强度
            if (password.length < 8) {
                alert('密码长度至少8位');
                return;
            }
            
            // 添加安全头并发送请求
            fetch('/api/jev/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': 'jev-secure-key-001',
                    'X-System-Layer': 'support'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 注册成功，自动登录
                    localStorage.setItem('jev_token', data.token);
                    localStorage.setItem('jev_userId', data.userId);
                    alert('注册成功！正在自动登录...');
                    window.location.href = '/dashboard';
                } else {
                    alert('注册失败：' + data.message);
                }
            })
            .catch(error => {
                alert('注册出错：' + error.message);
            });
        });
    </script>
</body>
</html>`;
    
    // 路由逻辑：处理根路径、index和login_portal.html
    if (path === '/' || path === '/index' || path === '/index.html' || path === '/login_portal.html') {
        return htmlResponse(loginPageHtml);
    }
    
    // 处理注册页面
    if (path === '/register') {
        return htmlResponse(registerPageHtml);
    }
    
    // 验证安全头
    const validateSecurityHeaders = (req) => {
      const token = req.headers.get('X-Agent-Token');
      const layer = req.headers.get('X-System-Layer');
      return token === 'jev-secure-key-001' && layer === 'support';
    };
    
    // 生成SHA256 Token
    const generateToken = () => {
      const randomSalt = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now().toString();
      const data = randomSalt + timestamp;
      
      // 在Workers环境中使用crypto.subtle
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
        .then(buffer => {
          return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        });
    };
    
    // 健康检测 - 不依赖KV
    if (path === "/ping") {
      return json({
        success: true,
        message: "JEV Worker Online ✅",
        time: new Date().toISOString(),
        environment: {
          hasEnv: !!env,
          workerName: env?.WORKER_NAME || "unknown",
        }
      });
    }
    
    // 简单状态检查
    if (path === "/status" || path === "/api/jev/status") {
      return json({
        success: true,
        status: "online",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      });
    }
    
    // 登录接口
    if (path === "/api/jev/login" && request.method === 'POST') {
      // 验证安全头
      if (!validateSecurityHeaders(request)) {
        return json({ success: false, message: '安全头验证失败' }, 401);
      }
      
      try {
        const data = await request.json();
        const { email, password } = data;
        
        if (!email || !password) {
          return json({ success: false, message: '邮箱和密码不能为空' }, 400);
        }
        
        // 模拟KV读取用户信息（实际应该从KV中读取）
        // 在开发环境中模拟用户数据
        const mockUser = {
          email: email,
          password: password, // 注意：实际应该存储哈希后的密码
          userId: 'U' + Math.random().toString(36).substring(2, 10)
        };
        
        // 生成token
        const token = await generateToken();
        
        return json({
          success: true,
          userId: mockUser.userId,
          token: token
        });
      } catch (error) {
        return json({ success: false, message: '登录失败: ' + error.message }, 500);
      }
    }
    
    // 注册接口
    if (path === "/api/jev/register" && request.method === 'POST') {
      // 验证安全头
      if (!validateSecurityHeaders(request)) {
        return json({ success: false, message: '安全头验证失败' }, 401);
      }
      
      try {
        const data = await request.json();
        const { email, password } = data;
        
        if (!email || !password) {
          return json({ success: false, message: '邮箱和密码不能为空' }, 400);
        }
        
        // 模拟写入KV（实际应该写入KV）
        const userId = 'U' + Math.random().toString(36).substring(2, 10);
        const userData = {
          email: email,
          password: password, // 注意：实际应该存储哈希后的密码
          userId: userId,
          createdAt: new Date().toISOString()
        };
        
        // 生成token
        const token = await generateToken();
        
        return json({
          success: true,
          userId: userId,
          token: token
        });
      } catch (error) {
        return json({ success: false, message: '注册失败: ' + error.message }, 500);
      }
    }
    
    // 验证接口
    if (path === "/api/jev/verify" && request.method === 'POST') {
      // 验证安全头
      if (!validateSecurityHeaders(request)) {
        return json({ success: false, message: '安全头验证失败' }, 401);
      }
      
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return json({ success: false, message: '缺少有效的Authorization头' }, 401);
        }
        
        const token = authHeader.split(' ')[1];
        
        // 模拟token验证（实际应该验证token有效性）
        // 简单验证token是否存在
        if (!token) {
          return json({ success: false, message: '无效的token' }, 401);
        }
        
        return json({
          success: true,
          message: 'Token验证成功'
        });
      } catch (error) {
        return json({ success: false, message: '验证失败: ' + error.message }, 500);
      }
    }
    
    // 提供API信息
    return json({
      success: true,
      message: "JEV Cloudflare Worker 运行正常",
      version: "6.0.0",
      routes: {
        "/api/jev/ping": "系统健康检测",
        "/api/jev/ui": "UI状态管理",
        "/api/jev/agents/*": "Agent管理",
        "/api/jev/log": "日志系统",
        "/api/jev/upload": "文件上传",
        "/api/jev/results": "决策结果处理",
        "/api/jev/load": "AI评估处理",
        "/api/jev/routes": "系统状态汇总",
        "/api/jev/login": "登录接口",
        "/api/jev/register": "注册接口",
        "/api/jev/verify": "验证接口",
        "/api/jev/status": "状态接口"
      }
    });
  },
};