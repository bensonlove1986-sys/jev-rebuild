@echo off
cls

:: JEV L5+ 智能客服闭环自动部署脚本 v2.1
:: 功能：一键启动完整的客服闭环系统
:: 包括：环境检查、服务启动、模块部署、监控启动

:: 设置控制台标题和颜色
title JEV L5+ 智能客服闭环 - 自动部署系统
color 3F

:: 输出欢迎信息
echo ===================================================
echo          🚀 JEV L5+ 智能客服闭环系统
 echo          ⚡ 自动部署脚本 v2.1
 echo ===================================================
echo.
echo 🔍 正在检查系统环境...
echo.

:: 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到Python，请先安装Python 3.6+
    echo    下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 检查当前目录
cd /d "%~dp0"
set "BASE_DIR=%cd%"
set "JEV_CLIENT_DIR=%BASE_DIR%\JEV_Client"

echo 📁 基础目录: %BASE_DIR%
echo 📁 客户端目录: %JEV_CLIENT_DIR%
echo.

:: 检查JEV_Client目录是否存在
if not exist "%JEV_CLIENT_DIR%" (
    echo ❌ 错误: JEV_Client目录不存在
    pause
    exit /b 1
)

:: 检查必要文件是否存在
set "DEPLOY_FILE=%JEV_CLIENT_DIR%\auto_deploy_chatloop.html"
if not exist "%DEPLOY_FILE%" (
    echo ❌ 错误: 自动部署文件不存在
    echo    正在尝试创建基础文件...
    
    :: 创建简单的HTML文件
    echo ^<!DOCTYPE html^> ^<html^> ^<head^> ^<title^>JEV 自动部署^</title^> ^</head^> ^<body^> ^<h1^>JEV L5+ 智能客服闭环^</h1^> ^<p^>自动部署页面^</p^> ^</body^> ^</html^> > "%DEPLOY_FILE%"
    
    if %errorlevel% neq 0 (
        echo ❌ 创建文件失败
        pause
        exit /b 1
    )
)

:: 检查是否有正在运行的Python服务器
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080"') do (
    set "PID=%%a"
)

if defined PID (
    echo ⚠️  发现8080端口已被占用 (PID: %PID%)
    echo    正在尝试终止占用进程...
    taskkill /F /PID %PID% >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️  终止进程失败，尝试使用其他端口
        set "PORT=8081"
    ) else (
        echo ✅ 已终止占用进程
        set "PORT=8080"
    )
) else (
    set "PORT=8080"
)

:: 启动HTTP服务器
echo.
echo 🚀 正在启动HTTP服务器 (端口: %PORT%)...
start "JEV HTTP Server" cmd /c "cd /d "%JEV_CLIENT_DIR%" && python -m http.server %PORT%"

:: 等待服务器启动
ping -n 3 127.0.0.1 >nul

echo.
echo 📊 正在初始化JEV环境...
echo.

:: 检查worker服务是否需要启动
set "WORKER_JS=%BASE_DIR%\worker.js"
if exist "%WORKER_JS%" (
    echo 🛠️  检测到worker.js，准备启动worker服务...
    
    :: 检查是否安装了npm和wrangler
    npm --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️  未找到npm，跳过worker服务启动
    ) else (
        wrangler --version >nul 2>&1
        if %errorlevel% neq 0 (
            echo ⚠️  未找到wrangler，尝试安装...
            npm install -g wrangler >nul 2>&1
            if %errorlevel% neq 0 (
                echo ⚠️  安装wrangler失败，跳过worker服务启动
            )
        )
        
        if %errorlevel% equ 0 (
            echo 🚀 正在启动worker服务...
            start "JEV Worker" cmd /c "cd /d "%BASE_DIR%" && npx wrangler dev worker.js --local"
            ping -n 2 127.0.0.1 >nul
        )
    )
)

:: 检查AI服务是否需要启动
set "AI_SERVICE_PY=%BASE_DIR%\jev_ai_service.py"
if exist "%AI_SERVICE_PY%" (
    echo 🤖 检测到AI服务脚本，准备启动...
    start "JEV AI Service" cmd /c "cd /d "%BASE_DIR%" && python "%AI_SERVICE_PY%""
    ping -n 2 127.0.0.1 >nul
)

:: 打开自动部署页面
echo.
echo 🌐 正在打开自动部署页面...
echo.

echo ===================================================
echo 🎯 部署信息
 echo ---------------------------------------------------
echo 🌐 部署页面: http://localhost:%PORT%/auto_deploy_chatloop.html
 echo 📁 工作目录: %JEV_CLIENT_DIR%
 echo ⚡ 端口: %PORT%
 echo 📊 状态: 准备就绪
 echo ===================================================
echo.
echo 📋 使用说明：
echo    1. 在打开的浏览器页面中，点击「一键部署智能客服闭环」按钮
 echo    2. 等待部署完成，监控面板将显示各模块状态
 echo    3. 部署成功后可查看运行报告和系统日志
 echo.
echo 🎉 启动完成！正在打开浏览器...

:: 打开浏览器
start http://localhost:%PORT%/auto_deploy_chatloop.html

:: 启动监控窗口
start "JEV 部署监控" cmd /k "echo JEV L5+ 智能客服闭环监控窗口 && echo 请保持此窗口开启以维持服务运行 && echo. && echo 访问 http://localhost:%PORT%/auto_deploy_chatloop.html 进行部署"

echo.
echo 💡 提示: 请保持服务器窗口开启以维持系统运行
pause
