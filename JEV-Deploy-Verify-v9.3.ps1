# JEV-Vercel-AutoDeploy-v9.3-Final 验证脚本

# 配置变量
$VERCEL_DOMAIN = "jev-ui.vercel.app"
$API_BASE = "https://jevshop.bensonlove1986.workers.dev"

# 路径配置
$logsDir = "D:\PDF转网页\logs"

# 创建报告对象
$report = @{
    "success" = $false
    "vercel_url" = "https://$VERCEL_DOMAIN"
    "worker_status" = 0
    "timestamp" = ""
    "details" = @{
        "page_check" = $false
        "page_content" = $false
        "client_portal" = $false
        "scripts_check" = $false
        "worker_analyze" = 0
        "error" = ""
    }
}

# 日志函数
function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Write-Host $logMessage
    
    # 确保日志目录存在
    if (-not (Test-Path $logsDir)) {
        New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
    }
    
    Add-Content -Path "$logsDir\deploy_verify_log_v9.3.txt" -Value $logMessage
}

# 初始化日志
Write-Log "===== 开始 JEV UI v9.3 部署验证 ====="
Write-Log "验证目标："
Write-Log "- Vercel 域名: $VERCEL_DOMAIN"
Write-Log "- API Base: $API_BASE"

# 1️⃣ 检查主页面
Write-Log "检查主页面 https://$VERCEL_DOMAIN/..."
try {
    $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/" -UseBasicParsing -TimeoutSec 20
    $statusCode = $response.StatusCode
    
    if ($statusCode -eq 200) {
        Write-Log "✅ 主页面访问成功 (状态码: 200)"
        $report.details.page_check = $true
        
        # 检查页面内容
        $content = $response.Content
        if ($content -match "🌸 欢迎进入 JEV System") {
            Write-Log "✅ 页面包含预期文本: '🌸 欢迎进入 JEV System'"
            $report.details.page_content = $true
        } else {
            Write-Log "⚠️  页面不包含预期文本，但访问成功"
        }
    } else {
        Write-Log "❌ 主页面访问失败 (状态码: $statusCode)"
    }
} catch {
    Write-Log "❌ 主页面访问异常: $_"
    $report.details.error = "主页面访问失败: $_"
}

# 2️⃣ 检查client_portal.html
Write-Log "检查client_portal.html..."
try {
    $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/client_portal.html" -UseBasicParsing -TimeoutSec 20
    $statusCode = $response.StatusCode
    
    if ($statusCode -eq 200) {
        Write-Log "✅ client_portal.html 访问成功 (状态码: 200)"
        $report.details.client_portal = $true
    } else {
        Write-Log "❌ client_portal.html 访问失败 (状态码: $statusCode)"
    }
} catch {
    Write-Log "❌ client_portal.html 访问异常: $_"
}

# 3️⃣ 检查脚本文件
Write-Log "检查UI资源文件..."
$scriptFiles = @(
    "jev_ai_assistant.js",
    "jev_image_capture.js",
    "jev_ui_style.css"
)

$allScriptsFound = $true
foreach ($script in $scriptFiles) {
    Write-Log "检查脚本文件 $script..."
    try {
        $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/$script" -UseBasicParsing -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ $script 访问成功"
        } else {
            Write-Log "❌ $script 访问失败 (状态码: $response.StatusCode)"
            $allScriptsFound = $false
        }
    } catch {
        Write-Log "❌ $script 访问异常: $_"
        $allScriptsFound = $false
    }
}

$report.details.scripts_check = $allScriptsFound

# 4️⃣ 检查Cloudflare Worker接口
Write-Log "检查Cloudflare Worker接口..."

# 检查/ping接口
try {
    $response = Invoke-WebRequest -Uri "${API_BASE}/ping" -UseBasicParsing -TimeoutSec 10
    $statusCode = $response.StatusCode
    $report.worker_status = $statusCode
    
    if ($statusCode -eq 200) {
        Write-Log "✅ Cloudflare Worker /ping 接口正常 (状态码: 200)"
    } else {
        Write-Log "❌ Cloudflare Worker /ping 接口异常 (状态码: $statusCode)"
    }
} catch {
    Write-Log "❌ Cloudflare Worker /ping 接口访问失败: $_"
}

# 检查/analyze-image接口
try {
    $response = Invoke-WebRequest -Uri "${API_BASE}/analyze-image" -Method Options -UseBasicParsing -TimeoutSec 10
    $statusCode = $response.StatusCode
    $report.details.worker_analyze = $statusCode
    
    if ($statusCode -eq 200) {
        Write-Log "✅ Cloudflare Worker /analyze-image 接口正常 (状态码: 200)"
    } else {
        Write-Log "⚠️  Cloudflare Worker /analyze-image 接口返回状态码: $statusCode"
    }
} catch {
    Write-Log "⚠️  Cloudflare Worker /analyze-image 接口访问异常: $_"
}

# 综合判断部署是否成功
if ($report.details.page_check -and $report.details.client_portal -and $report.details.scripts_check -and $report.worker_status -eq 200) {
    $report.success = $true
    Write-Log "✅ 部署验证成功！所有检查项均通过"
} else {
    Write-Log "⚠️  部署验证未完全通过，请检查上述日志了解详情"
    
    # 显示未通过的检查项
    $failedChecks = @()
    if (-not $report.details.page_check) { $failedChecks += "主页面" }
    if (-not $report.details.client_portal) { $failedChecks += "client_portal.html" }
    if (-not $report.details.scripts_check) { $failedChecks += "脚本文件" }
    if ($report.worker_status -ne 200) { $failedChecks += "Cloudflare Worker /ping" }
    
    if ($failedChecks.Count -gt 0) {
        Write-Log "未通过的检查项: $($failedChecks -join ', ')"
    }
}

# 更新时间戳
$report.timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 生成JSON报告
$reportJson = $report | ConvertTo-Json -Depth 5
Write-Log "===== 验证报告 ====="
Write-Log $reportJson

# 保存报告到文件
$reportPath = "$logsDir\deploy_verify_report_v9.3.json"
$reportJson | Out-File -FilePath $reportPath -Encoding utf8
Write-Log "验证报告已保存到: $reportPath"

# 输出结果摘要
Write-Log ""
Write-Log "📊 验证结果摘要："

# 主页面访问状态
if ($report.details.page_check) {
    Write-Log "✅ 主页面访问: 通过"
} else {
    Write-Log "❌ 主页面访问: 失败"
}

# 页面内容验证状态
if ($report.details.page_content) {
    Write-Log "✅ 页面内容验证: 通过"
} else {
    Write-Log "❓ 页面内容验证: 未检查"
}

# client_portal.html状态
if ($report.details.client_portal) {
    Write-Log "✅ client_portal.html: 通过"
} else {
    Write-Log "❌ client_portal.html: 失败"
}

# UI资源文件状态
if ($report.details.scripts_check) {
    Write-Log "✅ UI资源文件: 全部通过"
} else {
    Write-Log "⚠️  UI资源文件: 部分失败"
}

# Worker /ping状态
if ($report.worker_status -eq 200) {
    Write-Log "✅ Worker /ping: 正常"
} else {
    Write-Log "❌ Worker /ping: 异常"
}

# Worker /analyze-image状态
if ($report.details.worker_analyze -eq 200) {
    Write-Log "✅ Worker /analyze-image: 正常"
} else {
    Write-Log "❌ Worker /analyze-image: 异常"
}
Write-Log ""
Write-Log "🌐 部署地址: https://$VERCEL_DOMAIN"
Write-Log "🔗 API地址: $API_BASE"
Write-Log "🗓️  验证时间: $($report.timestamp)"
Write-Log ""
Write-Log "===== JEV UI v9.3 部署验证完成 ====="

if ($report.success) {
    Write-Log "🎉 恭喜！JEV UI v9.3 部署成功并通过所有验证！"
    exit 0
} else {
    Write-Log "💡 提示：Vercel部署可能需要更多时间，请稍后再次运行此验证脚本"
    exit 1
}