@echo off

rem JEV L7.8 Client Web 一键启动脚本
rem 版本: 7.8.0

cls
echo ===================================================
echo              JEV L7.8 Client Web 启动器
                v7.8.0
                线上客户端系统部署包

echo ===================================================

rem 设置日志文件路径
set LOG_DIR=d:\PDF转网页\logs
set LOG_FILE=%LOG_DIR%\client_web_start.log

rem 创建日志目录
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%date% %time%] JEV L7.8 Client Web 启动中... > "%LOG_FILE%"

echo [INFO] 正在检测系统环境...

rem 检测Node.js环境
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到Node.js环境，请先安装Node.js
    pause
    exit /b 1
)

echo [SUCCESS] Node.js环境检测成功

rem 检查必要文件
if not exist "d:\PDF转网页\ui\client_portal.html" (
    echo [WARNING] 客户端门户文件未找到
)

rem 启动本地Web服务器
echo [INFO] 启动本地Web服务器...

rem 尝试使用Python启动Web服务器
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] 使用Python启动Web服务器...
    start "JEV Web Server" python -m http.server 8080 -d d:\PDF转网页
    timeout /t 2 >nul
) else (
    rem 尝试使用Node.js的http-server
    npm list -g http-server >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] 使用Node.js http-server启动Web服务器...
        start "JEV Web Server" http-server d:\PDF转网页 -p 8080
        timeout /t 2 >nul
    ) else (
        echo [ERROR] 未找到可用的Web服务器环境
        echo [INFO] 请手动启动Web服务器
        pause
        exit /b 1
    )
)

rem 启动Client Gateway Bridge
if exist "d:\PDF转网页\modules\client_gateway_bridge.js" (
    echo [INFO] 启动Client Gateway Bridge...
    start "JEV Client Gateway Bridge" node d:\PDF转网页\modules\client_gateway_bridge.js
)

rem 打开客户端门户页面
echo [INFO] 打开客户端门户页面...
start http://localhost:8080/ui/client_portal.html

echo ===================================================
echo ✅ JEV L7.8 Client Web 启动成功!
echo 
echo 🚀 服务地址: http://localhost:8080
echo 🌐 客户端门户: http://localhost:8080/ui/client_portal.html
echo ===================================================

echo [INFO] 按任意键关闭此窗口
pause