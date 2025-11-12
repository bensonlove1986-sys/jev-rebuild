@echo off

REM JEV L7.1 - Dashboard 启动脚本

set "dashboard_path=d:\PDF转网页\ui\sentinel_dashboard.html"
set "port=8888"

echo =========================================
echo         🛡️  JEV L7.1 Dashboard 🛡️
echo =========================================
echo 

echo 正在检查 dashboard 文件...
if exist "%dashboard_path%" (
    echo ✅ Dashboard 文件存在
    echo 
    echo 启动方式选择:
    echo 1. 使用默认浏览器直接打开
    echo 2. 使用 Node.js 启动本地服务器
    echo 
    set /p choice=请输入选择 (1/2): 
    
    if "%choice%" == "1" (
        echo 
        echo 🚀 正在启动浏览器...
        start "JEV Dashboard" "%dashboard_path%"
        echo 
        echo ✅ Dashboard 已在默认浏览器中打开
        echo 📍 文件位置: %dashboard_path%
    ) else if "%choice%" == "2" (
        echo 
        echo 🚀 正在启动 Node.js 本地服务器...
        echo ℹ️  端口: %port%
        echo ℹ️  地址: http://localhost:%port%
        
        cd /d "d:\PDF转网页\ui"
        echo 
        echo 尝试使用 Python 启动服务器...
        python -m http.server %port% || (
            echo 
            echo ⚠️ Python 服务器启动失败，尝试使用其他方式...
            echo 
            echo 请手动在浏览器中打开以下文件:
            echo %dashboard_path%
        )
    ) else (
        echo 
        echo ❌ 无效的选择，默认直接打开
        start "JEV Dashboard" "%dashboard_path%"
    )
) else (
    echo ❌ Dashboard 文件不存在: %dashboard_path%
    echo ℹ️  请检查文件路径是否正确
    echo 
    pause
    exit /b 1
)

echo 
echo =========================================
echo 🧠 提示: Dashboard 将自动刷新数据（每30秒）
echo 💡 功能: 实时监控 FaceID 状态、安全事件和系统模块
echo =========================================

if "%choice%" neq "2" (
    pause
)