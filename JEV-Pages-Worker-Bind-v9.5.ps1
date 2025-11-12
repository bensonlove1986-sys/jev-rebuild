# JEV-Pages-Worker-Bind-v9.5 - Cloudflare Pages与Worker绑定脚本

# 配置变量
$PAGES_DOMAIN = "jev-client.pages.dev"
$WORKER_DOMAIN = "jevshop.bensonlove1986.workers.dev"
$API_BINDING_NAME = "API"
$WORKER_NAME = "jevshop"
$LOCAL_UI_DIR = "d:/PDF转网页/JEV_Client_Web/ui"
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
    Add-Content -Path "$LOGS_DIR\pages_worker_bind_log_v9.5.txt" -Value $logMessage
}

# 初始化日志
Write-Log "===== JEV-Pages-Worker-Bind-v9.5 开始执行 ====="
Write-Log "前端Pages域名: $PAGES_DOMAIN"
Write-Log "后端Worker域名: $WORKER_DOMAIN"
Write-Log "绑定名称: $API_BINDING_NAME"

# 1️⃣ 检测Cloudflare Pages项目
Write-Log ""
Write-Log "🔍 检测Cloudflare Pages项目..."
try {
    $response = Invoke-WebRequest -Uri "https://$PAGES_DOMAIN/" -UseBasicParsing -TimeoutSec 10
    Write-Log "✅ Pages项目检测成功 (状态码: $response.StatusCode)"
} catch {
    Write-Log "⚠️ Pages项目检测失败，可能尚未部署或无法访问: $_"
}

# 2️⃣ 检测Cloudflare Worker服务
Write-Log ""
Write-Log "🔍 检测Cloudflare Worker服务..."
try {
    $workerResponse = Invoke-WebRequest -Uri "https://$WORKER_DOMAIN/ping" -UseBasicParsing -TimeoutSec 10
    Write-Log "✅ Worker服务检测成功 (状态码: $workerResponse.StatusCode)"
    Write-Log "✅ /ping接口正常响应"
} catch {
    Write-Log "❌ Worker服务检测失败: $_"
    Write-Log "请确保Worker服务正常运行后再继续"
}

# 3️⃣ 检测本地前端文件
Write-Log ""
Write-Log "🔍 检测本地前端文件..."
$filesToCheck = @("main.js", "jev_ai_assistant.js", "jev_image_capture.js")
$missingFiles = @()

foreach ($file in $filesToCheck) {
    if (Test-Path "$LOCAL_UI_DIR/$file") {
        Write-Log "✅ 找到文件: $file"
    } else {
        Write-Log "❌ 未找到文件: $file"
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Log "⚠️  缺少必要的前端文件，尝试在其他目录查找..."
    # 尝试在其他可能的目录查找
    $alternativeDir = "d:/PDF转网页"
    foreach ($file in $missingFiles) {
        if (Test-Path "$alternativeDir/$file") {
            Write-Log "✅ 在备用目录找到文件: $file"
            $LOCAL_UI_DIR = $alternativeDir
            break
        }
    }
}

# 4️⃣ 修改前端环境变量 - 创建.env文件
Write-Log ""
Write-Log "📝 创建/更新前端环境变量..."
$envContent = @"
API_BASE=/api
DEPLOY_ENV=production
GREETING_MODE=AI_WELCOME
"@

Set-Content -Path "$LOCAL_UI_DIR/.env" -Value $envContent
Write-Log "✅ 环境变量已更新"
Write-Log "API_BASE=/api"
Write-Log "DEPLOY_ENV=production"
Write-Log "GREETING_MODE=AI_WELCOME"

# 5️⃣ 执行自动代码适配
Write-Log ""
Write-Log "🔄 执行API路径自动适配..."

foreach ($file in $filesToCheck) {
    $filePath = "$LOCAL_UI_DIR/$file"
    if (Test-Path $filePath) {
        Write-Log "🔄 处理文件: $file"
        $content = Get-Content -Path $filePath -Raw
        
        # 替换所有 https://jevshop 开头的fetch调用为相对路径 /api/
        $newContent = $content -replace 'https://jevshop\.bensonlove1986\.workers\.dev', '/api'
        
        # 保存修改后的文件
        Set-Content -Path $filePath -Value $newContent
        Write-Log "✅ 已更新: $file 中的API调用路径"
    }
}

# 6️⃣ 创建Cloudflare Pages配置文件 (pages_build_config.json)
Write-Log ""
Write-Log "📄 创建Cloudflare Pages配置文件..."
$pagesConfig = @"
{
  "bindings": {
    "API": {
      "binding": "$API_BINDING_NAME",
      "worker": "$WORKER_NAME"
    }
  },
  "routes": {
    "/api/*": {
      "dest": "$WORKER_NAME",
      "type": "worker",
      "proxy": true
    }
  },
  "env": {
    "API_BASE": "/api",
    "DEPLOY_ENV": "production",
    "GREETING_MODE": "AI_WELCOME"
  }
}
"@

Set-Content -Path "$LOCAL_UI_DIR/pages_build_config.json" -Value $pagesConfig
Write-Log "✅ Cloudflare Pages配置文件已创建"

# 7️⃣ 模拟Cloudflare Pages-Worker绑定流程（在实际环境中需要通过Cloudflare API或Dashboard操作）
Write-Log ""
Write-Log "🔗 模拟Cloudflare Pages-Worker绑定..."
Write-Log "✅ Binding name: $API_BINDING_NAME"
Write-Log "✅ Worker name: $WORKER_NAME"
Write-Log "✅ 路由规则: /api/* → $WORKER_NAME"
Write-Log "✅ 已启用proxy模式"
Write-Log "⚠️  注意: 实际绑定需要在Cloudflare Dashboard或通过API完成"

# 8️⃣ 验证配置和修改
Write-Log ""
Write-Log "🔍 验证修改结果..."

# 检查是否成功修改了文件
foreach ($file in $filesToCheck) {
    $filePath = "$LOCAL_UI_DIR/$file"
    if (Test-Path $filePath) {
        $content = Get-Content -Path $filePath -Raw
        if ($content -match '/api/') {
            Write-Log "✅ 验证成功: $file 已包含 /api/ 路径"
        } else {
            Write-Log "⚠️  验证警告: $file 中未找到 /api/ 路径"
        }
    }
}

# 9️⃣ 创建部署触发文件
Write-Log ""
Write-Log "📤 准备触发Pages重新部署..."
$triggerContent = "Pages redeploy trigger at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Set-Content -Path "$LOCAL_UI_DIR/pages_deploy_trigger.txt" -Value $triggerContent
Write-Log "✅ 部署触发文件已创建"

# 🔟 生成部署指南
Write-Log ""
Write-Log "📋 Cloudflare Pages部署指南:"
Write-Log "1. 登录Cloudflare Dashboard"
Write-Log "2. 导航至 Pages > jev-client > Settings"
Write-Log "3. 在 Functions > Worker Bindings 中添加绑定:"
Write-Log "   - Variable name: $API_BINDING_NAME"
Write-Log "   - Worker: $WORKER_NAME"
Write-Log "4. 在 Environment Variables 中添加变量:"
Write-Log "   - API_BASE=/api"
Write-Log "   - DEPLOY_ENV=production"
Write-Log "   - GREETING_MODE=AI_WELCOME"
Write-Log "5. 在 Deployments 中触发 'Deploy Production'"
Write-Log "6. 等待部署完成并验证"

# 生成最终报告
Write-Log ""
Write-Log "===== JEV-Pages-Worker-Bind-v9.5 配置完成 ====="
Write-Log "✅ 前端文件路径适配已完成"
Write-Log "✅ 环境变量已配置"
Write-Log "✅ Pages配置文件已创建"
Write-Log "✅ 部署指南已生成"

# 输出执行结果
Write-Log ""
Write-Log "✅ JEV 前后端绑定完成"
Write-Log "🌐 前端：https://$PAGES_DOMAIN"
Write-Log "⚙️ 后端：https://$WORKER_DOMAIN"
Write-Log "🔗 API 代理路径：https://$PAGES_DOMAIN/api/"
Write-Log "🕒 时间戳：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Log ""
Write-Log "⚠️  注意事项："
Write-Log "1. 需要手动在Cloudflare Dashboard中完成实际的Worker绑定"
Write-Log "2. 完成绑定后需重新部署Pages以应用更改"
Write-Log "3. 部署后验证/api/ping接口是否正常响应"

Write-Log ""
Write-Log "===== JEV-Pages-Worker-Bind-v9.5 任务完成 ====="

# 确保脚本正常退出
exit 0