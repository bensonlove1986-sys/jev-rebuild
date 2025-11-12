# Start-UTF8-Server.ps1
Write-Host "`n🚀 正在启动 JEV Client UTF-8 本地服务..." -ForegroundColor Cyan

# 检查并关闭被占用的 8080 端口
$port = 8080
$processInfo = netstat -ano | findstr ":$port" | findstr "LISTENING"
if ($processInfo) {
    $processId = ($processInfo -split "\s+")[-1]
    Write-Host "⚠️ 发现端口 $port 被进程 PID=$processId 占用，正在结束..." -ForegroundColor Yellow
    taskkill /PID $processId /F | Out-Null
    Start-Sleep -Seconds 2
}

# 设置控制台编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 在启动前执行编码检查和meta标签注入
Write-Host "🔍 执行编码完整性检查..." -ForegroundColor Magenta
node scripts/encoding_guard.js
Write-Host "📝 执行Meta标签注入..." -ForegroundColor Magenta
node scripts/meta_charset_injector.js

# 启动 server.js 并监控输出
Write-Host "✅ 启动 UTF-8 服务器: http://localhost:$port" -ForegroundColor Green
node server.js | Tee-Object -FilePath "D:\PDF转网页\JEV_Client\server_runtime.log"