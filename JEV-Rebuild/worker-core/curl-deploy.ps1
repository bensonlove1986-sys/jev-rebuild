# 部署参数
$ACCOUNT_ID = "156ce03fffc59592e2b3b04dbc22aa6c"
$API_TOKEN = "TFCN9t7EykA8OZkOezGPe4mMHBnAgcixLVvnlrdj"
$WORKER_NAME = "jev-rebuild-worker"

# 清理旧的bundle文件
Remove-Item -Force bundle.js -ErrorAction SilentlyContinue

# 使用esbuild打包worker代码
Write-Host "📦 Bundling worker code..." -ForegroundColor Yellow
npx esbuild index.js --bundle --format=cjs --outfile=bundle.js

# 检查打包是否成功
if (-not (Test-Path bundle.js)) {
    Write-Host "❌ Bundling failed" -ForegroundColor Red
    exit 1
}

# 读取打包后的代码
$BUNDLED_CODE = Get-Content -Raw bundle.js
Write-Host "📦 Bundle size: $($BUNDLED_CODE.Length) bytes" -ForegroundColor Green

# 准备部署数据（使用Cloudflare Module Worker格式）
$moduleContent = @{
    name = "index.js"
    type = "ESModule"
    script = $BUNDLED_CODE
}

$modules = @($moduleContent)

# 使用PowerShell内置的ConvertTo-Json，但处理大文件
$modulesJson = $modules | ConvertTo-Json -Depth 5
$bindingsJson = @() | ConvertTo-Json

# 手动构建JSON，避免ConvertTo-Json的大小限制
$jsonData = @"
{
    "name": "$WORKER_NAME",
    "compatibility_date": "2025-01-01",
    "modules": $modulesJson,
    "bindings": $bindingsJson
}
"@

# 部署到Cloudflare API
Write-Host "📤 Deploying to Cloudflare API..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $API_TOKEN"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" `
    -Method Put `
    -Headers $headers `
    -Body $jsonData `
    -ContentType "application/json"

# 检查部署结果
if ($response.success) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Worker URL: https://$WORKER_NAME.$ACCOUNT_ID.workers.dev" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Error details: $($response.errors | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}
