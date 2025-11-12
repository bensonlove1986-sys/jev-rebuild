@echo off
cls
echo =====================================
echo JEV_CLIENT_RECOVERY 检查与恢复脚本
echo =====================================

rem 创建日志目录
if not exist "D:\PDF转网页\logs" mkdir "D:\PDF转网页\logs"
set LOG_FILE="D:\PDF转网页\logs\jev_client_recovery.log"

rem 写入日志头部
echo ========== %date% %time% ========== > %LOG_FILE%
echo JEV_CLIENT_RECOVERY 检查开始... >> %LOG_FILE%

rem 1️⃣ 确认 Start-JEV-Client.bat 是否存在
echo [1] 检查 Start-JEV-Client.bat 是否存在...
echo [1] 检查 Start-JEV-Client.bat 是否存在... >> %LOG_FILE%
if exist "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat" (
    echo ✅ Start-JEV-Client.bat 存在
    echo ✅ Start-JEV-Client.bat 存在 >> %LOG_FILE%
) else (
    echo ❌ Start-JEV-Client.bat 不存在
    echo ❌ Start-JEV-Client.bat 不存在 >> %LOG_FILE%
    echo 正在创建默认启动脚本...
    echo 正在创建默认启动脚本... >> %LOG_FILE%
    (echo @echo off
     echo cd /d "D:\PDF转网页\JEV_Client"
     echo node server.js) > "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat"
    echo ✅ 已创建默认启动脚本
    echo ✅ 已创建默认启动脚本 >> %LOG_FILE%
)

rem 2️⃣ 检查端口 8080 服务是否正常监听
echo. 
echo [2] 检查端口 8080 是否正常监听...
echo [2] 检查端口 8080 是否正常监听... >> %LOG_FILE%
netstat -ano | findstr "8080" > nul
if %errorlevel% equ 0 (
    echo ✅ 端口 8080 正在监听
    echo ✅ 端口 8080 正在监听 >> %LOG_FILE%
) else (
    echo ❌ 端口 8080 未监听
    echo ❌ 端口 8080 未监听 >> %LOG_FILE%
    set RESTART_SERVICE=true
)

rem 3️⃣ 若 node server.js 未运行，则自动重启本地服务
if defined RESTART_SERVICE (
    echo. 
    echo [3] 正在重启 JEV Client 服务...
    echo [3] 正在重启 JEV Client 服务... >> %LOG_FILE%
    cd /d "D:\PDF转网页\JEV_Client"
    start "JEV Client" cmd /c "node server.js"
    timeout /t 3 /nobreak > nul
    
    netstat -ano | findstr "8080" > nul
    if %errorlevel% equ 0 (
        echo ✅ JEV Client 服务已成功重启
        echo ✅ JEV Client 服务已成功重启 >> %LOG_FILE%
    ) else (
        echo ❌ JEV Client 服务重启失败
        echo ❌ JEV Client 服务重启失败 >> %LOG_FILE%
    )
) else (
    echo. 
    echo [3] JEV Client 服务无需重启
    echo [3] JEV Client 服务无需重启 >> %LOG_FILE%
)

rem 4️⃣ 输出最终状态报告
echo. 
echo =====================================
echo JEV_CLIENT_RECOVERY 检查完成

echo [4] 生成最终状态报告...
echo [4] 生成最终状态报告... >> %LOG_FILE%
echo 检查时间: %date% %time% >> %LOG_FILE%
netstat -ano | findstr "8080" > nul
if %errorlevel% equ 0 (
    echo ✅ 服务状态: 正常运行
    echo ✅ 服务状态: 正常运行 >> %LOG_FILE%
    echo 访问地址: http://localhost:8080
    echo 访问地址: http://localhost:8080 >> %LOG_FILE%
) else (
    echo ❌ 服务状态: 未运行
    echo ❌ 服务状态: 未运行 >> %LOG_FILE%
)
echo 日志文件: %LOG_FILE%
echo ========== 检查结束 ========== >> %LOG_FILE%

echo =====================================
pause