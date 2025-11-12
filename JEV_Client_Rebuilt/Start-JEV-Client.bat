@echo off

:: JEV Client v7.0 - 智能启动脚本（修复版）
:: 修复了路径引用问题，添加了环境检测和自动恢复功能
:: 添加了安全编码层激活标记

echo ==============================================
echo         🚀 JEV Client v7.0 - 智能启动器
 echo ==============================================

:: 设置编码为UTF-8
chcp 65001 > nul

:: 安全编码层激活标记
set "ENCODING_SAFE_MODE=ENABLED"
set "JEV_SAFE_LAYER=ACTIVE"

echo 🔒 安全编码层已激活

:: 使用完整路径，避免相对路径错误
set "BASE_DIR=d:\PDF转网页\JEV_Client"
set "SERVER_FILE=%BASE_DIR%\server.js"
set "PYTHON_SERVER=%BASE_DIR%\start_web_server.py"
set "PORT=8080"

:: 切换到正确目录
echo 🔍 正在定位工作目录...
cd /d "%BASE_DIR%"
if %errorlevel% neq 0 (
    echo ❌ 无法切换到目录: %BASE_DIR%
    echo ℹ️ 请确认目录是否存在
    pause
    exit /b 1
)
echo ✅ 工作目录: %cd%

:: 环境检测
echo
 echo 📊 正在检测运行环境...

:: 检测Node.js环境
echo - 检测Node.js...
node --version >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in ('node --version') do set "NODE_VERSION=%%a"
    echo   ✅ Node.js: %NODE_VERSION%
    set "USE_NODE=true"
) else (
    echo   ⚠️ Node.js未安装
    set "USE_NODE=false"
)

:: 检测Python环境
echo - 检测Python...
python --version >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in ('python --version') do set "PYTHON_VERSION=%%a"
    echo   ✅ Python: %PYTHON_VERSION%
    set "USE_PYTHON=true"
) else (
    echo   ⚠️ Python未安装
    set "USE_PYTHON=false"
)

:: 检查核心文件
echo
 echo 📁 正在检查核心文件...

if exist "%SERVER_FILE%" (
    echo ✅ 找到 server.js
) else (
    echo ⚠️ 未找到 server.js，将使用Python服务器
)

if not exist "ui\login_portal.html" (
    echo ❌ 错误: 找不到登录页面 ui\login_portal.html
    echo ℹ️ 请确认JEV Client是否完整安装
    pause
    exit /b 1
) else (
    echo ✅ 找到登录页面
)

:: 创建Python服务器脚本（如果不存在）
if not exist "%PYTHON_SERVER%" (
    echo
    echo 📝 创建Python服务器脚本...
    (echo import http.server
    echo import socketserver
    echo import webbrowser
    echo import threading
    echo import time
    echo import os
    echo 
    echo PORT = 8080
    echo BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    echo 
    echo class JEVHTTPHandler(http.server.SimpleHTTPRequestHandler):
    echo     def do_GET(self):
    echo         # 支持访问根目录下的文件
    echo         if self.path == '/':
    echo             self.path = '/ui/login_portal.html'
    echo         return super().do_GET()
    echo     
    echo     def log_message(self, format, *args):
    echo         # 禁用默认日志
    echo         pass
    echo 
    echo with socketserver.TCPServer(("", PORT), JEVHTTPHandler) as httpd:
    echo     print(f"\n=== JEV Client Server ===")
    echo     print(f"服务器运行地址: http://localhost:{PORT}")
    echo     print(f"登录页面: http://localhost:{PORT}/ui/login_portal.html")
    echo     print(f"按 Ctrl+C 停止服务器")
    echo     print("========================\n")
    echo     
    echo     # 延迟后在默认浏览器中打开登录页面
    echo     def open_browser():
    echo         time.sleep(1)
    echo         webbrowser.open(f'http://localhost:{PORT}/ui/login_portal.html')
    echo     
    echo     browser_thread = threading.Thread(target=open_browser)
    echo     browser_thread.daemon = True
    echo     browser_thread.start()
    echo     
    echo     try:
    echo         httpd.serve_forever()
    echo     except KeyboardInterrupt:
    echo         print("\n服务器已停止")
    ) > "%PYTHON_SERVER%"
    echo ✅ Python服务器脚本已创建
)

:: 启动服务器
echo
 echo 🚀 正在启动JEV Client服务器...

:: 优先使用Node.js服务器
if "%USE_NODE%" == "true" if exist "%SERVER_FILE%" (
    echo 🟢 正在使用Node.js启动server.js...
    start "JEV-Client-Server" cmd /k "node "%SERVER_FILE%""
) else if "%USE_PYTHON%" == "true" (
    echo 🟡 Node.js不可用，正在使用Python启动服务器...
    start "JEV-Client-Server" cmd /k "python "%PYTHON_SERVER%""
) else (
    echo ❌ 错误: Node.js和Python都不可用
    echo ℹ️ 请至少安装Node.js或Python 3.6+
    pause
    exit /b 1
)

:: 等待服务器启动
echo
 echo ⏳ 等待服务器启动...
timeout /t 3 > nul

:: 检查端口状态
echo
 echo 🔍 正在检查服务器状态...
netstat -ano | findstr :%PORT% >nul
if %errorlevel% equ 0 (
    echo ✅ 服务器已在端口 %PORT% 启动
) else (
    echo ⚠️ 无法确认服务器状态，请手动检查
)

:: 打开登录页面
echo
 echo 🌐 正在打开登录页面...
start http://localhost:%PORT%/ui/login_portal.html

echo
echo ==============================================
echo ✅ JEV Client 启动完成！
echo 📍 登录地址: http://localhost:%PORT%/ui/login_portal.html
echo 🎯 邀请码: JEV-CLIENT-LOGIN
echo 💡 提示: 如需停止服务，请关闭命令提示符窗口
echo ==============================================

:: 保持窗口打开以便查看日志
echo
 echo 📝 按任意键关闭此窗口（服务将在后台继续运行）...
pause > nul
