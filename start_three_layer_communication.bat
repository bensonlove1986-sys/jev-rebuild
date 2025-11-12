@echo off
:: JEV-PluginSync-v1.0 三层通信闭环启动脚本
:: 用于一键启动所有必要服务并打开测试界面

set "ROOT_DIR=d:\PDF转网页"
set "WEB_DIR=%ROOT_DIR%\JEV_Client_Web"
set "LOG_DIR=%ROOT_DIR%\jev_logs\communication"
set "CONFIG_FILE=%ROOT_DIR%\jev_three_layer_config.js"

:: 彩色输出函数
:ColorText
for /f "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set "COL=%%a"
)
<nul set /p ".=%COL%" > "%~2"
findstr /v /a:%1 /r "^$" "%~2" nul
<nul set /p ".=%COL%" > "%~2"

:: 检查Node.js环境
:check_nodejs
where node >nul 2>nul
if %errorlevel% neq 0 (
  call :ColorText "0C" "temp.txt" "错误: 未找到Node.js。请先安装Node.js 14+。"
  echo.
  pause
  exit /b 1
)

:: 显示欢迎信息
echo.
echo =======================================================
echo           JEV-PluginSync-v1.0 三层通信启动器
echo =======================================================
echo.
echo 正在准备启动三层通信闭环系统...
echo.

:: 检查日志目录
if not exist "%LOG_DIR%" (
  echo 创建日志目录: %LOG_DIR%
  mkdir "%LOG_DIR%" 2>nul
)

:: 检查配置文件
if not exist "%CONFIG_FILE%" (
  call :ColorText "0C" "temp.txt" "警告: 未找到配置文件! 将使用默认配置。"
  echo.
)

:: 启动Web UI测试服务器
:start_web_server
echo 启动Web UI测试服务器...
start "JEV Web UI Server" cmd /k "cd /d %WEB_DIR% && echo 启动HTTP服务器在端口8080... && npx http-server -p 8080 --cors"

:: 等待服务器启动
echo 等待服务器启动...
timeout /t 3 /nobreak >nul

:: 检查中继服务配置
echo 检查本地中继服务配置...
if not exist "%ROOT_DIR%\JEV_Client\relay\jev_plugin_relay_bridge.js" (
  call :ColorText "0E" "temp.txt" "警告: 中继桥接模块未找到! 请确保已正确安装。"
  echo.
)

:: 显示启动信息
echo.
echo =======================================================
echo           启动完成!
echo =======================================================
echo.
echo 已启动的服务:
echo - Web UI测试服务器: http://localhost:8080
call :ColorText "0A" "temp.txt" "测试控制台地址: http://localhost:8080/jev_three_layer_test_ui.html"
echo.
echo 请确保以下服务已手动启动:
echo - 本地中继服务 (默认端口3000)
echo - Cloudflare Worker服务
echo.
echo 启动步骤:
echo 1. 在测试控制台中检查所有服务状态
echo 2. 点击"开始测试"运行集成测试
echo 3. 查看实时结果和性能指标
echo.
echo 按任意键打开测试控制台...

:: 等待用户输入
pause >nul

:: 打开测试控制台
echo 打开测试控制台...
start http://localhost:8080/jev_three_layer_test_ui.html

:: 提供快速测试命令
echo.
echo =======================================================
echo 快速测试命令:
echo =======================================================
echo 运行集成测试: node %ROOT_DIR%\jev_three_layer_integration_test.js
echo.
echo 按任意键退出启动器...
pause >nul

:: 清理
del "temp.txt" 2>nul
exit /b 0