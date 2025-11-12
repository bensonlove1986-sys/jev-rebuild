@echo off

rem JEV系统管理面板启动脚本

color 0A
echo ========================================
echo       JEV系统管理面板启动脚本         
echo ========================================
echo.

rem 检查是否安装了Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到Node.js环境!
    echo 请先安装Node.js，然后再运行此脚本。
    pause
    exit /b 1
)

rem 检查是否安装了http-server模块
npm list -g http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo 提示: 未安装http-server模块，正在安装...
    npm install -g http-server
    if %errorlevel% neq 0 (
        echo 错误: 安装http-server失败!
        pause
        exit /b 1
    )
)

echo 正在启动JEV系统管理面板...
echo. 
echo 注意: 请确保JEV系统的中继服务器、中控端和客户端已经运行。
echo.

rem 启动http-server，托管当前目录
echo 启动Web服务器...
echo 管理面板地址: http://localhost:8080/jev_admin_dashboard.html
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================

http-server -p 8080 -o /jev_admin_dashboard.html