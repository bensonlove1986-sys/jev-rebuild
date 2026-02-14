@echo off

REM 部署参数
set ACCOUNT_ID=156ce03fffc59592e2b3b04dbc22aa6c
set API_TOKEN=kCJ4yXElwA8x9aytKldiRGPZ1qJcEPzZ82qvEuFr
set WORKER_NAME=jev-rebuild-worker

REM 清理旧的bundle文件
del /f /q bundle.js

REM 使用esbuild打包worker代码
echo 📦 Bundling worker code...
npx esbuild index.js --bundle --format=esm --outfile=bundle.js

REM 检查打包是否成功
if not exist bundle.js (
    echo ❌ Bundling failed
    exit /b 1
)

REM 部署到Cloudflare API
echo 📤 Deploying to Cloudflare API...
echo 🌐 Account ID: %ACCOUNT_ID%
echo 👷 Worker: %WORKER_NAME%
echo 🔐 API Token: %API_TOKEN:~0,8%...

REM 使用curl命令部署
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/javascript" ^
  --data-binary @bundle.js

REM 检查部署结果
if %errorlevel% equ 0 (
    echo ✅ Deployment successful!
) else (
    echo ❌ Deployment failed
    exit /b 1
)
