@echo off
cls
echo ================================
echo JEV-NODE-PATH-FIXER-v2.0
 echo ================================

rem Step 1: 检查 Node.js 是否存在
echo Step 1: 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Warning: 未检测到 Node.js
echo 检查默认安装路径...
    if exist "C:\Program Files\nodejs\node.exe" (
        echo Found: Node.js 安装在默认路径
        echo 请手动添加 C:\Program Files\nodejs 到系统环境变量 PATH
        echo 完成后请重启命令提示符
    ) else (
        echo Error: 未找到 Node.js 安装
        echo 请访问 https://nodejs.org/zh-cn 下载安装
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i
    echo OK: Node.js 路径: %NODE_PATH%
)

echo.

rem Step 2: 检查脚本路径
echo Step 2: 检查脚本路径...
if exist "%~dp0JEV_SAFE_RECOVERY.bat" (
    echo OK: 找到脚本文件
) else (
    echo Error: 未找到 JEV_SAFE_RECOVERY.bat
    pause
    exit /b 1
)

echo.

rem Step 3: 测试执行权限
echo Step 3: 测试批处理文件执行...
echo 尝试执行 JEV_SAFE_RECOVERY.bat 测试...
call "%~dp0JEV_SAFE_RECOVERY.bat"

if %errorlevel% equ 0 (
    echo OK: 批处理文件执行成功
) else (
    echo Warning: 批处理文件执行可能存在问题
)

echo.
echo ================================
echo 环境检查完成
 echo System Ready for Recovery
echo ================================
pause