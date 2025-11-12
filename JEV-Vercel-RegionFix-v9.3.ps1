# JEV-Vercel-RegionFix-v9.3 - 修复Vercel部署区域限制脚本

# 配置变量
$GITHUB_REPO = "bensonlove1986-sys/jev-ui"
$LOCAL_UI_DIR = "d:/PDF转网页/JEV_Client_Web/ui"
$VERCEL_DOMAIN = "jev-ui.vercel.app"
$API_BASE = "https://jevshop.bensonlove1986.workers.dev"
$DEPLOY_TEMP_DIR = "d:/PDF转网页/deploy_temp"
$LOGS_DIR = "d:/PDF转网页/logs"

# 创建日志目录
if (-not (Test-Path $LOGS_DIR)) {
    New-Item -Path $LOGS_DIR -ItemType Directory -Force | Out-Null
}

# 日志函数
function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Write-Host $logMessage
    Add-Content -Path "$LOGS_DIR\vercel_region_fix_log_v9.3.txt" -Value $logMessage
}

# 初始化日志
Write-Log "===== JEV-Vercel-RegionFix-v9.3 开始执行 ====="
Write-Log "修复目标：Vercel多区域部署限制问题"
Write-Log "GitHub仓库: $GITHUB_REPO"
Write-Log "Vercel域名: $VERCEL_DOMAIN"

# 检查本地文件
Write-Log ""
Write-Log "🔍 检查本地vercel.json配置..."
if (Test-Path "$LOCAL_UI_DIR/vercel.json") {
    $vercelConfig = Get-Content -Path "$LOCAL_UI_DIR/vercel.json" -Raw
    Write-Log "✅ 找到vercel.json文件"
    Write-Log "当前配置:"
    Write-Log $vercelConfig
} else {
    Write-Log "❌ 未找到vercel.json文件"
    exit 1
}

# 确保临时部署目录存在并清空
Write-Log ""
Write-Log "📁 准备临时部署目录..."
if (Test-Path $DEPLOY_TEMP_DIR) {
    Remove-Item -Path "$DEPLOY_TEMP_DIR\*" -Recurse -Force
} else {
    New-Item -Path $DEPLOY_TEMP_DIR -ItemType Directory -Force | Out-Null
}

# 复制必要文件到临时目录
Write-Log "🔄 复制配置文件到部署目录..."
Copy-Item -Path "$LOCAL_UI_DIR/vercel.json" -Destination "$DEPLOY_TEMP_DIR/vercel.json" -Force

# 进入临时目录进行Git操作
Write-Log ""
Write-Log "📤 开始Git操作..."
Set-Location -Path $DEPLOY_TEMP_DIR

# 初始化Git仓库（如果尚未初始化）
if (-not (Test-Path ".git")) {
    Write-Log "🔄 初始化Git仓库..."
    git init
    git config user.name "JEV-Auto-Deploy"
    git config user.email "jev-auto-deploy@example.com"
    git remote add origin "https://github.com/$GITHUB_REPO.git"
}

# 拉取最新代码
Write-Log "📥 拉取最新代码..."
git fetch origin main
if ($LASTEXITCODE -eq 0) {
    git reset --hard origin/main
    git clean -fd
}

# 复制最新的vercel.json
Copy-Item -Path "$LOCAL_UI_DIR/vercel.json" -Destination "$DEPLOY_TEMP_DIR/vercel.json" -Force

# 提交更改
git add vercel.json
git status
Write-Log "📝 提交更改..."
git commit -m "fix: 修复Vercel部署区域限制，从'all'改为单区域'iad1' [v9.3]" 2>$null

# 推送更改到GitHub
Write-Log "🚀 推送更改到GitHub..."
git push -f origin HEAD:main

if ($LASTEXITCODE -eq 0) {
    Write-Log "✅ GitHub推送成功！"
    Write-Log "已成功提交vercel.json到 $GITHUB_REPO 的main分支"
    Write-Log "已将regions配置从'all'修改为'iad1'，符合Vercel Hobby计划限制"
} else {
    Write-Log "❌ GitHub推送失败，请检查错误信息"
    exit 1
}

# 等待一段时间让Vercel开始构建
Write-Log ""
Write-Log "⏳ 等待Vercel开始构建..."
Start-Sleep -Seconds 30

# 验证Cloudflare Worker接口
try {
    Write-Log ""
    Write-Log "🔗 检查Cloudflare Worker接口..."
    $response = Invoke-WebRequest -Uri "$API_BASE/ping" -UseBasicParsing -TimeoutSec 10
    Write-Log "✅ Cloudflare Worker /ping 接口正常 (状态码: $response.StatusCode)"
} catch {
    Write-Log "⚠️ Cloudflare Worker接口检查失败: $_"
}

# 返回原始目录
Set-Location -Path "d:/PDF转网页"

# 输出最终结果
Write-Log ""
Write-Log "✅ JEV-UI 单区域部署修复成功"
Write-Log "🌍 部署地址：https://$VERCEL_DOMAIN"
Write-Log "📦 构建区域：iad1（单区，Hobby计划兼容）"
Write-Log "🕒 时间戳：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"

Write-Log ""
Write-Log "===== JEV-Vercel-RegionFix-v9.3 任务完成 ====="

# 确保脚本正常退出
exit 0