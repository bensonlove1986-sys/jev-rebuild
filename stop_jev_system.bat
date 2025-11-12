@echo off
cls
echo ===================================================
echo            JEV系统一键关闭脚本
            
echo 当前时间: %date% %time%
echo ===================================================
echo.
echo 正在查找并关闭JEV系统相关进程...
echo ===================================================

rem 查找并终止Node.js进程中包含特定关键词的进程
echo [1/3] 正在关闭中继服务器...
taskkill /F /IM node.exe /FI "MODULES eq *cloud_relay.js*" > nul 2>&1
taskkill /F /IM node.exe /FI "MODULES eq *Cloud_Relay*" > nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo 中继服务器已成功关闭
) else (
    echo 中继服务器可能未运行或关闭失败
)

echo.
echo [2/3] 正在关闭中控端...
taskkill /F /IM node.exe /FI "MODULES eq *server.js*" > nul 2>&1
taskkill /F /IM node.exe /FI "MODULES eq *JEV_ControlCenter*" > nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo 中控端已成功关闭
) else (
    echo 中控端可能未运行或关闭失败
)

echo.
echo [3/3] 正在关闭客户端...
taskkill /F /IM node.exe /FI "MODULES eq *start_client.js*" > nul 2>&1
taskkill /F /IM node.exe /FI "MODULES eq *JEV_Client*" > nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo 客户端已成功关闭
) else (
    echo 客户端可能未运行或关闭失败
)

echo.
echo ===================================================
echo 强制终止所有包含JEV关键词的Node.js进程...
taskkill /F /IM node.exe /FI "MODULES eq *JEV*" > nul 2>&1

rem 检查是否还有Node.js进程在运行
echo.
echo 检查是否还有相关Node.js进程在运行...
tasklist /FI "IMAGENAME eq node.exe" /FI "MODULES eq *JEV*" /FI "MODULES eq *cloud_relay*" /FI "MODULES eq *ControlCenter*" /FI "MODULES eq *Client*"

echo.
echo ===================================================
echo 操作完成！
echo 提示：
if %ERRORLEVEL% equ 0 (
    echo - 部分JEV进程可能仍在运行，建议手动检查并关闭
) else (
    echo - 所有已知的JEV进程已成功关闭
)
echo - 如需重新启动系统，请运行 start_jev_system.bat
echo - 如需检查系统状态，请运行 node check_jev_status.js
echo ===================================================
echo 按任意键退出...
pause > nul