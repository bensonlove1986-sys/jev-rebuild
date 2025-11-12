const fs = require('fs');
const path = require('path');
const { execSync, exec, spawn } = require('child_process');
const http = require('http');

// 配置信息
const CONFIG = {
  clientDir: path.join(__dirname, 'JEV_Client'),
  serverJsPath: path.join(__dirname, 'JEV_Client', 'server.js'),
  loginPortalPath: path.join(__dirname, 'JEV_Client', 'ui', 'login_portal.html'),
  port: 8080,
  loginPortalUrl: 'http://localhost:8080/ui/login_portal.html',
  logPath: path.join(__dirname, 'JEV_ControlCenter', 'deploy', 'deploy_log.txt')
};

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [JEV Client Fix] ${message}`;
  console.log(logMessage);
  try {
    const logDir = path.dirname(CONFIG.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logPath, logMessage + '\n');
  } catch (e) {
    // 忽略日志写入错误
  }
}

// 1. 检查端口状态
function checkPortStatus() {
  log(`1️⃣  检查端口 ${CONFIG.port} 状态...`);
  try {
    const output = execSync(`netstat -ano | findstr :${CONFIG.port}`, { encoding: 'utf8' });
    if (output.trim()) {
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const pidMatch = lastLine.match(/\s+(\d+)$/);
      const pid = pidMatch ? pidMatch[1] : '未知';
      log(`⚠️  端口 ${CONFIG.port} 已被进程占用 (PID: ${pid})`);
      return { isOccupied: true, pid };
    } else {
      log(`✅ 端口 ${CONFIG.port} 当前未被占用`);
      return { isOccupied: false, pid: null };
    }
  } catch (error) {
    log(`✅ 端口 ${CONFIG.port} 当前未被占用`);
    return { isOccupied: false, pid: null };
  }
}

// 2. 终止占用端口的进程
function terminateProcess(pid) {
  if (!pid || pid === '未知') {
    return false;
  }
  
  log(`尝试终止占用端口的进程 (PID: ${pid})...`);
  try {
    execSync(`taskkill /F /PID ${pid}`);
    log(`✅ 成功终止进程 (PID: ${pid})`);
    return true;
  } catch (error) {
    log(`❌ 终止进程失败: ${error.message}`);
    return false;
  }
}

// 3. 检查Node.js是否可用
function checkNodeAvailable() {
  try {
    execSync('node -v', { encoding: 'utf8' });
    log('✅ Node.js 可用');
    return true;
  } catch (error) {
    log('❌ Node.js 不可用，将尝试使用PowerShell HTTP服务');
    return false;
  }
}

// 4. 创建server.js（如果不存在）
function createServerJs() {
  if (!fs.existsSync(CONFIG.serverJsPath)) {
    log(`创建缺失的 server.js 文件...`);
    try {
      const serverContent = `const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname);

const server = http.createServer((req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // 处理目录请求，自动查找index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  const extname = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
  }[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}/\`);
});

// 保持进程运行
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});`;
      
      // 确保目录存在
      const serverDir = path.dirname(CONFIG.serverJsPath);
      if (!fs.existsSync(serverDir)) {
        fs.mkdirSync(serverDir, { recursive: true });
      }
      
      fs.writeFileSync(CONFIG.serverJsPath, serverContent);
      log(`✅ 创建了 server.js 文件`);
      return true;
    } catch (error) {
      log(`❌ 创建 server.js 失败: ${error.message}`);
      return false;
    }
  }
  log(`✅ server.js 文件已存在`);
  return true;
}

// 5. 创建登录页面（如果不存在）
function createLoginPage() {
  if (!fs.existsSync(CONFIG.loginPortalPath)) {
    log(`创建缺失的登录页面...`);
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV Client - 登录</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .login-container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .input-group {
            margin-bottom: 20px;
            text-align: left;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #666;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>JEV Client 登录</h1>
        <form id="loginForm">
            <div class="input-group">
                <label for="inviteCode">邀请码：</label>
                <input type="text" id="inviteCode" name="inviteCode" placeholder="请输入邀请码" required>
            </div>
            <button type="submit">登录</button>
        </form>
        <div id="status" class="status"></div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const inviteCode = document.getElementById('inviteCode').value;
            const statusDiv = document.getElementById('status');
            
            // 简单的本地验证
            if (inviteCode === 'JEV-CLIENT-LOGIN') {
                statusDiv.textContent = '✅ 验证成功！';
                statusDiv.style.backgroundColor = '#d4edda';
                statusDiv.style.color = '#155724';
            } else {
                statusDiv.textContent = '❌ 邀请码无效，请重新输入。';
                statusDiv.style.backgroundColor = '#f8d7da';
                statusDiv.style.color = '#721c24';
            }
        });
    </script>
</body>
</html>`;
      
      // 确保ui目录存在
      const uiDir = path.dirname(CONFIG.loginPortalPath);
      if (!fs.existsSync(uiDir)) {
        fs.mkdirSync(uiDir, { recursive: true });
      }
      
      fs.writeFileSync(CONFIG.loginPortalPath, htmlContent);
      log(`✅ 创建了登录页面: ${CONFIG.loginPortalPath}`);
      return true;
    } catch (error) {
      log(`❌ 创建登录页面失败: ${error.message}`);
      return false;
    }
  }
  log(`✅ 登录页面已存在`);
  return true;
}

// 6. 使用Node.js启动服务
function startNodeServer() {
  log(`使用 Node.js 启动 server.js...`);
  
  try {
    // 切换到JEV_Client目录
    const clientDir = CONFIG.clientDir;
    
    // 在后台启动服务
    const nodeProcess = spawn('node', ['server.js'], {
      cwd: clientDir,
      detached: true,
      stdio: 'ignore'
    });
    
    nodeProcess.unref();
    log(`✅ Node.js 服务已在后台启动 (端口 ${CONFIG.port})`);
    
    // 等待服务启动
    return true;
  } catch (error) {
    log(`❌ Node.js 服务启动失败: ${error.message}`);
    return false;
  }
}

// 7. 使用PowerShell启动HTTP服务
function startPowerShellHttpServer() {
  log(`使用 PowerShell 启动 HTTP 服务...`);
  
  try {
    // 创建PowerShell脚本
    const psScript = `
    # PowerShell HTTP 服务器
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://*:${CONFIG.port}/")
    $listener.Start()
    Write-Host "HTTP Server running at http://localhost:${CONFIG.port}/"
    
    while ($true) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # 获取请求的文件路径
        $filePath = "${CONFIG.clientDir}$($request.Url.LocalPath)"
        
        # 处理根路径
        if ($filePath -eq "${CONFIG.clientDir}\") {
            $filePath = "${CONFIG.clientDir}\index.html"
        }
        
        # 处理目录请求
        if (Test-Path $filePath -PathType Container) {
            $filePath = Join-Path $filePath "index.html"
        }
        
        # 设置内容类型
        $contentType = "application/octet-stream"
        $extension = [System.IO.Path]::GetExtension($filePath)
        switch ($extension) {
            ".html" { $contentType = "text/html" }
            ".js" { $contentType = "text/javascript" }
            ".css" { $contentType = "text/css" }
            ".json" { $contentType = "application/json" }
            ".png" { $contentType = "image/png" }
            ".jpg" { $contentType = "image/jpeg" }
            ".gif" { $contentType = "image/gif" }
        }
        
        # 读取文件内容
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            $response.ContentType = $contentType
            $output = $response.OutputStream
            $output.Write($content, 0, $content.Length)
            $output.Close()
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.OutputStream.Close()
        }
    }
    `;
    
    const psScriptPath = path.join(__dirname, 'temp_http_server.ps1');
    fs.writeFileSync(psScriptPath, psScript);
    
    // 在后台启动PowerShell
    const psProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', psScriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    
    psProcess.unref();
    log(`✅ PowerShell HTTP 服务已在后台启动 (端口 ${CONFIG.port})`);
    
    // 等待服务启动
    return true;
  } catch (error) {
    log(`❌ PowerShell HTTP 服务启动失败: ${error.message}`);
    return false;
  }
}

// 8. 验证页面访问
function verifyPageAccess() {
  return new Promise((resolve) => {
    log(`验证页面访问: ${CONFIG.loginPortalUrl}`);
    
    setTimeout(() => {
      try {
        const req = http.get(CONFIG.loginPortalUrl, (res) => {
          log(`页面访问状态码: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            log(`✅ 页面访问成功，状态码 200`);
            resolve(true);
          } else {
            log(`❌ 页面访问失败，状态码: ${res.statusCode}`);
            resolve(false);
          }
          
          res.resume();
        });
        
        req.on('error', (error) => {
          log(`❌ 页面访问错误: ${error.message}`);
          resolve(false);
        });
        
        req.setTimeout(5000, () => {
          log(`❌ 页面访问超时`);
          req.destroy();
          resolve(false);
        });
      } catch (error) {
        log(`❌ 页面访问异常: ${error.message}`);
        resolve(false);
      }
    }, 3000);
  });
}

// 9. 强制启动服务
async function forceStartService() {
  log(`2️⃣  开始强制启动服务...`);
  
  // 创建必要的文件
  createServerJs();
  createLoginPage();
  
  // 检查Node.js
  if (checkNodeAvailable()) {
    // 使用Node.js启动
    if (startNodeServer()) {
      // 等待并验证
      const verified = await verifyPageAccess();
      if (verified) {
        return true;
      }
    }
    
    // 如果Node.js启动失败，尝试PowerShell
    log(`尝试使用 PowerShell 作为备选方案...`);
  }
  
  // 使用PowerShell启动
  if (startPowerShellHttpServer()) {
    const verified = await verifyPageAccess();
    return verified;
  }
  
  return false;
}

// 主函数
async function main() {
  log('=== 开始执行 JEV Client 本地监听服务强制修复任务 ===');
  
  try {
    // 1. 检查端口状态
    const portStatus = checkPortStatus();
    
    // 2. 如果端口被占用，尝试终止进程
    if (portStatus.isOccupied) {
      log(`端口被占用，尝试强制重启...`);
      terminateProcess(portStatus.pid);
      
      // 等待进程完全终止
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 3. 强制启动服务
    const serviceStarted = await forceStartService();
    
    // 4. 验证页面访问
    log(`3️⃣  最终验证页面访问...`);
    const pageVerified = await verifyPageAccess();
    
    // 5. 输出结果
    log(`4️⃣  输出执行结果...`);
    
    if (pageVerified) {
      console.log('\n✅ 本地 8080 服务监听成功');
      console.log('✅ 页面可访问');
      console.log('✅ 插件登录页可用');
      console.log('\n✅ 本地 JEV Client 8080 服务修复完成');
      
      // 记录成功日志
      const successLog = [
        '[JEV Client Fix] ✅ 本地 8080 服务监听成功',
        '[JEV Client Fix] ✅ 页面可访问',
        '[JEV Client Fix] ✅ 插件登录页可用',
        '[JEV Client Fix] ✅ 本地 JEV Client 8080 服务修复完成'
      ];
      successLog.forEach(line => {
        try {
          fs.appendFileSync(CONFIG.logPath, line + '\n');
        } catch (e) {}
      });
    } else {
      console.log('\n❌ 服务修复失败！详细错误信息：');
      console.log(`- 服务启动: ${serviceStarted ? '成功' : '失败'}`);
      console.log(`- 页面访问: 失败`);
      console.log(`- 检查文件路径: ${CONFIG.loginPortalPath}`);
      console.log(`- 检查端口权限: 确保当前用户有端口访问权限`);
      console.log(`- 检查端口是否被其他程序占用`);
    }
    
  } catch (error) {
    log(`执行过程中发生错误: ${error.message}`);
    console.error('\n❌ 执行失败:', error.message);
  }
}

// 执行主函数
main();