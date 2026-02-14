#!/usr/bin/env pwsh

# 部署参数
$ACCOUNT_ID = "156ce03fffc59592e2b3b04dbc22aa6c"
$API_TOKEN = "TFCN9t7EykA8OZkOezGPe4mMHBnAgcixLVvnlrdj"
$WORKER_NAME = "jev-rebuild-worker"
$MAX_RETRIES = 5
$RETRY_DELAY = 5 # 秒

# 清理旧文件
Remove-Item -Force bundle.js -ErrorAction SilentlyContinue
Remove-Item -Force deploy-payload.json -ErrorAction SilentlyContinue

Write-Host "🚀 开始部署 Cloudflare Worker..." -ForegroundColor Green
Write-Host "📦 账号 ID: $ACCOUNT_ID" -ForegroundColor Cyan
Write-Host "👷 Worker 名称: $WORKER_NAME" -ForegroundColor Cyan
Write-Host "🔐 API Token: $($API_TOKEN.Substring(0, 8))..." -ForegroundColor Cyan

# 1. 使用 esbuild 打包代码
Write-Host "📦 打包 worker 代码..." -ForegroundColor Yellow
try {
    npx esbuild index.js --bundle --format=cjs --outfile=bundle.js
    if (-not (Test-Path bundle.js)) {
        Write-Host "❌ 打包失败" -ForegroundColor Red
        exit 1
    }
    $bundleSize = (Get-Item bundle.js).Length
    Write-Host "✅ 打包成功! 大小: $bundleSize 字节" -ForegroundColor Green
} catch {
    Write-Host "❌ 打包失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. 读取打包后的代码
$bundleContent = Get-Content -Raw bundle.js

# 3. 准备部署 payload
$deployPayload = @{
    script = $bundleContent
}

$deployPayload | ConvertTo-Json -Depth 1 | Out-File -Encoding UTF8 deploy-payload.json

# 4. 使用 curl 部署
Write-Host "📤 部署到 Cloudflare API..." -ForegroundColor Yellow

$retryCount = 0
$success = $false

while ($retryCount -lt $MAX_RETRIES -and -not $success) {
    $retryCount++
    Write-Host "🔄 尝试 $retryCount/$MAX_RETRIES..." -ForegroundColor Yellow
    
    try {
        # 使用 curl 命令
        $curlCommand = @"
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" `
     -H "Authorization: Bearer $API_TOKEN" `
     -H "Content-Type: application/javascript" `
     -T "bundle.js" `
     -v `
     --connect-timeout 30 `
     --max-time 60
"@
        
        # 执行 curl 命令
        $result = Invoke-Expression -Command $curlCommand
        
        # 检查结果
        if ($result -like '*"success": true*') {
            Write-Host "✅ 部署成功!" -ForegroundColor Green
            $success = $true
            
            # 显示 worker URL
            $workerUrl = "https://$WORKER_NAME.bensonlove1986.workers.dev"
            Write-Host "🌐 Worker URL: $workerUrl" -ForegroundColor Green
            
            # 验证部署
            Write-Host "🔍 验证部署..." -ForegroundColor Yellow
            try {
                $healthCheck = Invoke-RestMethod -Uri "$workerUrl/api/health" -Method GET -TimeoutSec 30
                Write-Host "✅ 健康检查通过!" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  健康检查失败，但部署可能仍然成功。请在浏览器中检查 worker URL。" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ 部署失败 (尝试 $retryCount):" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ 部署错误 (尝试 $retryCount): $($_.Exception.Message)" -ForegroundColor Red
    }
    
    if (-not $success -and $retryCount -lt $MAX_RETRIES) {
        Write-Host "⏳ 等待 $RETRY_DELAY 秒后重试..." -ForegroundColor Yellow
        Start-Sleep -Seconds $RETRY_DELAY
    }
}

if (-not $success) {
    Write-Host "❌ 所有部署尝试都失败了" -ForegroundColor Red
    Write-Host "💡 建议:"
    Write-Host "1. 检查网络连接"
    Write-Host "2. 验证 API Token 是否有效"
    Write-Host "3. 确保 API Token 有 Workers 编辑权限"
    Write-Host "4. 稍后网络稳定时再试"
    Write-Host "5. 使用 Cloudflare 仪表板手动部署作为备选方案"
    exit 1
}

# 清理临时文件
Remove-Item -Force bundle.js -ErrorAction SilentlyContinue
Remove-Item -Force deploy-payload.json -ErrorAction SilentlyContinue

Write-Host "🎉 部署过程完成!" -ForegroundColor Green
