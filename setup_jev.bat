@echo off
cls
echo.  _____  _____  ______       _    ______
echo. |  __ \|  __ \|  ____|     | |  |  ____|
echo. | |__) | |__) | |__    ___ | |__| |__
echo. |  ___/|  _  /|  __|  / _ \|  __  __|
echo. | |    | | \ \| |____| (_) | |  | |____
echo. |_|    |_|  \_\______|\___/|_|  |______|
echo.
echo. ===== JEV 控制面板配置助手 =====
echo.

rem 创建必要的目录
mkdir D:\JEV\panel 2>nul
mkdir D:\JEV\agent 2>nul

rem 检查核心文件
echo 检查核心文件...
echo --------------------------
if exist "D:\JEV\panel\jev_panel.html" (
    echo ✓ jev_panel.html 已找到
) else (
    echo ❌ jev_panel.html 缺失
)

if exist "D:\JEV\panel\jev_sync.js" (
    echo ✓ jev_sync.js 已找到
) else (
    echo ❌ jev_sync.js 缺失
)

if exist "D:\JEV\panel\jev_panel.js" (
    echo ✓ jev_panel.js 已找到
) else (
    echo ❌ jev_panel.js 缺失
)
echo.

rem 创建HTTP服务器启动脚本
echo 创建HTTP服务器启动脚本...
echo --------------------------
echo @echo off > "D:\JEV\panel\start_http_server.bat"
echo cd /d %%~dp0 >> "D:\JEV\panel\start_http_server.bat"
echo python -m http.server 1820 --bind 127.0.0.1 >> "D:\JEV\panel\start_http_server.bat"
echo echo HTTP服务器已启动在端口 1820 >> "D:\JEV\panel\start_http_server.bat"
echo pause >> "D:\JEV\panel\start_http_server.bat"
echo ✓ HTTP服务器脚本已创建: D:\JEV\panel\start_http_server.bat
echo.

rem 配置报告
echo ===== 配置报告 =====
echo 面板目录: D:\JEV\panel
echo HTTP端口: 1820
echo Desktop Agent路径: D:\JEV\agent\desktopAgent.exe
echo.

rem 访问说明
echo ===== 使用说明 =====
echo 1. 启动方式选择:
echo    - 方式A: 如果有desktopAgent.exe，直接运行它
echo    - 方式B: 双击运行 D:\JEV\panel\start_http_server.bat
echo.
echo 2. 访问地址:
echo    http://localhost:1820/jev_panel.html
echo.
echo 3. 给TRAE的提示词:
echo ------------------------------------------
echo 请检测并建立与本地JEV系统的连接:
echo - 检查端口 1820 是否可访问
echo - 验证能否访问以下文件:
echo   * http://localhost:1820/jev_panel.html
echo   * http://localhost:1820/jev_sync.js
echo   * http://localhost:1820/jev_panel.js
echo ------------------------------------------
echo.
echo 配置完成！请按照说明操作。
pause