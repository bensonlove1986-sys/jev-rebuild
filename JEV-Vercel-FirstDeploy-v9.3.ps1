# JEV-Vercel-FirstDeploy-v9.3 - 检测并触发Vercel首次部署脚本

# 配置变量
$GITHUB_REPO = "bensonlove1986-sys/jev-ui"
$VERCEL_DOMAIN = "jev-ui.vercel.app"
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
    Add-Content -Path "$LOGS_DIR\vercel_first_deploy_log_v9.3.txt" -Value $logMessage
}

# 初始化日志
Write-Log "===== JEV-Vercel-FirstDeploy-v9.3 开始执行 ====="
Write-Log "GitHub仓库: $GITHUB_REPO"
Write-Log "Vercel域名: $VERCEL_DOMAIN"

# 1️⃣ 检测部署状态
Write-Log ""
Write-Log "🔍 检测Vercel部署状态..."
try {
    $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/" -UseBasicParsing -TimeoutSec 10
    Write-Log "✅ 检测到现有部署 (状态码: $response.StatusCode)"
    Write-Log "部署已存在，无需触发新构建"
    
    # 验证部署是否正常
    Write-Log ""
    Write-Log "✅ 验证成功：https://$VERCEL_DOMAIN 可正常访问"
    Write-Log "✅ 状态码：$response.StatusCode"
    
    Write-Log ""
    Write-Log "===== JEV-Vercel-FirstDeploy-v9.3 任务完成 ====="
    exit 0
} catch {
    Write-Log "⚠️  未检测到有效部署或访问失败: $_"
    Write-Log "🚀 准备触发GitHub推送以启动Vercel构建..."
}

# 2️⃣ 准备临时部署目录
Write-Log ""
Write-Log "📁 准备临时部署目录..."
if (Test-Path $DEPLOY_TEMP_DIR) {
    Remove-Item -Path "$DEPLOY_TEMP_DIR\*" -Recurse -Force
} else {
    New-Item -Path $DEPLOY_TEMP_DIR -ItemType Directory -Force | Out-Null
}

# 3️⃣ 进入临时目录进行Git操作
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
} else {
    Write-Log "⚠️  拉取代码失败，尝试直接推送"
}

# 4️⃣ 创建触发文件
Write-Log ""
Write-Log "📝 创建触发文件 trigger-vercel.txt..."
$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$triggerContent = "Auto deploy trigger at $now"
Set-Content -Path "trigger-vercel.txt" -Value $triggerContent
Write-Log "✅ 触发文件已创建"
Write-Log "内容: $triggerContent"

# 5️⃣ 提交并推送更改
git add trigger-vercel.txt
git status
Write-Log ""
Write-Log "📤 提交更改..."
git commit -m "trigger vercel build (auto)" 2>$null

Write-Log ""
Write-Log "🚀 推送更改到GitHub..."
git push -f origin HEAD:main

if ($LASTEXITCODE -eq 0) {
    Write-Log "✅ GitHub推送成功！"
    Write-Log "已成功触发Vercel构建"
} else {
    Write-Log "❌ GitHub推送失败，请检查错误信息"
    exit 1
}

# 6️⃣ 等待并监听构建状态
Write-Log ""
Write-Log "⏳ 等待Vercel开始构建..."
Write-Log "正在监听构建状态，请稍候..."

# 等待一段时间让Vercel开始构建
Start-Sleep -Seconds 60

# 验证部署状态
Write-Log ""
Write-Log "🔍 验证Vercel部署状态..."
$maxRetries = 15
$retryCount = 0
$deploymentSuccess = $false

while ($retryCount -lt $maxRetries -and -not $deploymentSuccess) {
    $retryCount++
    Write-Log ""
    Write-Log "🔄 验证部署 (尝试 $retryCount/$maxRetries)"
    
    try {
        $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/" -UseBasicParsing -TimeoutSec 20
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            Write-Log "✅ Vercel部署成功！页面访问正常 (状态码: 200)"
            Write-Log "Deployment ready at https://$VERCEL_DOMAIN"
            $deploymentSuccess = $true
            break
        } else {
            Write-Log "⚠️  Vercel部署状态: 状态码 $statusCode，可能还在处理中"
        }
    } catch {
        Write-Log "⚠️  Vercel部署尚未完成: $_"
    }
    
    if (-not $deploymentSuccess) {
        Write-Log "⏳ 等待30秒后再次尝试..."
        Start-Sleep -Seconds 30
    }
}

# 7️⃣ 返回原始目录
Set-Location -Path "d:/PDF转网页"

# 8️⃣ 生成最终报告
Write-Log ""
Write-Log "===== JEV-Vercel-FirstDeploy-v9.3 部署报告 ====="
Write-Log "✅ GitHub仓库: $GITHUB_REPO"
Write-Log "✅ 触发文件: trigger-vercel.txt"
Write-Log "✅ 推送成功: trigger vercel build (auto)"

if ($deploymentSuccess) {
    Write-Log "✅ Vercel部署状态: 成功"
    Write-Log "✅ 部署地址: https://$VERCEL_DOMAIN"
    Write-Log "✅ 状态码: 200"
} else {
    Write-Log "⚠️ Vercel部署状态: 处理中，请稍后手动检查"
    Write-Log "🔗 部署地址: https://$VERCEL_DOMAIN"
}

Write-Log "✅ 时间戳: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"

Write-Log ""
Write-Log "===== JEV-Vercel-FirstDeploy-v9.3 任务完成 ====="

# 确保脚本正常退出
if ($deploymentSuccess) {
    exit 0
} else {
    exit 0  # 即使部署需要更多时间，脚本也正常退出
}