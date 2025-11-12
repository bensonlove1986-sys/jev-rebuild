@echo off

set SCRIPT_DIR=%~dp0
set WORKER_FILE=worker_kv_automated.js
set DEPLOY_LOG=%SCRIPT_DIR%deploy_kv_log.txt

cls
echo ==========================================
echo JEV KV自动绑定Worker部署脚本
echo ==========================================
echo.

REM 检查必要文件
echo 检查文件...
if not exist "%SCRIPT_DIR%%WORKER_FILE%" (
    echo ERROR: %WORKER_FILE% not found
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%wrangler.toml" (
    echo ERROR: wrangler.toml not found
    pause
    exit /b 1
)

echo OK: Files checked

REM 开始部署
echo.
echo Deploying Worker...
echo Command: wrangler publish
echo.

REM 执行部署
wrangler publish > "%DEPLOY_LOG%" 2>&1
set DEPLOY_RESULT=%errorlevel%

if %DEPLOY_RESULT% equ 0 (
    echo OK: Worker deployed successfully
    
    echo.
    echo Testing KV bindings...
    echo Please manually visit: https://jevshop.bensonlove1986.workers.dev/kv/test
    
    echo.
    echo Deployment complete!
    echo Check %DEPLOY_LOG% for details
) else (
    echo ERROR: Worker deployment failed
    echo See %DEPLOY_LOG% for errors
)

echo.
echo Press any key to exit...
pause >nul