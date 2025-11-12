@echo off

:: JEV客户端启动脚本
:: 版本: 1.0
:: 描述: 一键启动JEV客户端系统并打开登录页面

set "SCRIPT_DIR=d:\PDF转网页\JEV_Client"
set "PYTHON_SCRIPT=start_jev_online.py"

cls
echo =====================================================
echo          🛡️  JEV客户端启动助手 🛡️
echo =====================================================
echo.

:: 检查Python是否已安装
python --version >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 未检测到Python环境
echo 请先安装Python 3.x版本
echo.
    pause
    exit /b 1
)

:: 检查启动脚本是否存在
if not exist "%SCRIPT_DIR%\%PYTHON_SCRIPT%" (
    echo ❌ 错误: 未找到启动脚本
    echo 路径: %SCRIPT_DIR%\%PYTHON_SCRIPT%
echo.
    pause
    exit /b 1
)

echo 📋 启动信息:
echo - 客户端目录: %SCRIPT_DIR%
echo - 启动脚本: %PYTHON_SCRIPT%
echo - 服务端口: 8080
echo - 登录页面: http://localhost:8080/ui/login_portal.html
echo.
echo 🚀 正在启动JEV客户端系统...
echo =====================================================
echo.

:: 切换到脚本目录并执行Python脚本
cd /d "%SCRIPT_DIR%"
python "%PYTHON_SCRIPT%"

:: 检查脚本执行结果
if errorlevel 1 (
    echo.
echo ❌ JEV客户端启动失败
    pause
    exit /b 1
)

pause