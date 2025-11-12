# JEV-Vercel-AutoDeploy-v9.3-Final 部署脚本

# 配置变量
$GITHUB_USER = "bensonlove1986-sys"
$GITHUB_REPO = "jev-ui"
$GITHUB_TOKEN = "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"
$VERCEL_PROJECT = "jev-ui"
$VERCEL_DOMAIN = "jev-ui.vercel.app"
$API_BASE = "https://jevshop.bensonlove1986.workers.dev"
$DEPLOY_ENV = "production"
$VERSION = "v9.3"

# 路径配置
$uiDir = "D:\PDF转网页\JEV_Client_Web\ui"
$deployTempDir = "D:\PDF转网页\deploy_temp"
$logsDir = "D:\PDF转网页\logs"

# 创建报告对象
$report = @{
    "success" = $false
    "vercel_url" = "https://$VERCEL_DOMAIN"
    "worker_status" = 0
    "timestamp" = ""
    "details" = @{
        "github_push" = "pending"
        "vercel_deploy" = "pending"
        "page_check" = $false
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
    
    Add-Content -Path "$logsDir\vercel_deploy_log_v9.3.txt" -Value $logMessage
}

# 初始化日志
Write-Log "===== 开始 JEV UI v9.3 自动部署任务 ====="
Write-Log "部署环境配置："
Write-Log "- GitHub: $GITHUB_USER/$GITHUB_REPO"
Write-Log "- Vercel: $VERCEL_PROJECT ($VERCEL_DOMAIN)"
Write-Log "- API Base: $API_BASE"
Write-Log "- 环境: $DEPLOY_ENV"
Write-Log "- 版本: $VERSION"

# 1️⃣ 检查必要文件是否存在
Write-Log "检查UI文件完整性..."
$requiredFiles = @(
    "index.html",
    "client_portal.html",
    "jev_ai_assistant.js",
    "jev_image_capture.js",
    "jev_ui_style.css",
    "vercel.json"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path "$uiDir\$file")) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Log "❌ 错误: 缺少必要文件: $($missingFiles -join ', ')"
    $report.details.error = "缺少必要文件: $($missingFiles -join ', ')"
    # 继续执行，但标记为失败
} else {
    Write-Log "✅ 所有必要文件检查通过"
}

# 清理并准备部署临时目录
Write-Log "准备部署目录..."
if (Test-Path $deployTempDir) {
    Remove-Item -Path $deployTempDir -Recurse -Force | Out-Null
}
New-Item -Path $deployTempDir -ItemType Directory -Force | Out-Null

# 复制文件到部署目录
Write-Log "复制UI文件到部署目录..."
try {
    # 复制所有文件
    Copy-Item -Path "$uiDir\*" -Destination $deployTempDir -Recurse -Force
    
    # 复制assets目录（如果存在）
    $assetsDir = "$uiDir\assets"
    if (Test-Path $assetsDir) {
        if (-not (Test-Path "$deployTempDir\assets")) {
            New-Item -Path "$deployTempDir\assets" -ItemType Directory -Force | Out-Null
        }
        Copy-Item -Path "$assetsDir\*" -Destination "$deployTempDir\assets" -Recurse -Force
    }
    
    Write-Log "✅ UI文件复制完成"
} catch {
    Write-Log "❌ 复制文件失败: $_"
    $report.details.error = "文件复制失败: $_"
}

# 2️⃣ GitHub 同步
Write-Log "开始GitHub同步..."
try {
    Set-Location -Path $deployTempDir
    
    # 初始化Git仓库
    Write-Log "初始化Git仓库..."
    git init | Out-Default
    
    # 配置Git用户
    git config user.name "JEV Deploy Bot"
    git config user.email "deploy@jev-system.com"
    
    # 添加所有文件
    Write-Log "添加文件到暂存区..."
    git add . | Out-Default
    
    # 提交更改
    Write-Log "提交更改..."
    git commit -m "Auto deploy JEV UI v9.3" | Out-Default
    
    # 重命名主分支
    git branch -M main | Out-Default
    
    # 添加远程仓库（隐藏Token）
    Write-Log "添加GitHub远程仓库..."
    $remoteUrl = "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
    git remote add origin $remoteUrl | Out-Default
    
    # 强制推送（避免分支冲突）
    Write-Log "推送代码到GitHub..."
    git push -f -u origin main | Out-Default
    
    $report.details.github_push = "success"
    Write-Log "✅ GitHub push success"
} catch {
    Write-Log "❌ GitHub同步失败: $_"
    $report.details.github_push = "failed"
    $report.details.error = "GitHub同步失败: $_"
}

# 3️⃣ 等待Vercel自动构建（由于GitHub与Vercel已配置自动部署）
Write-Log "等待Vercel自动构建..."
Write-Log "注意: 由于GitHub与Vercel已配置自动部署，构建将自动触发"
Write-Log "等待部署完成..."

# 模拟等待时间
Start-Sleep -Seconds 10

# 尝试验证Vercel部署
Write-Log "开始验证Vercel部署..."
try {
    # 4️⃣ 健康检查
    
    # 检查主页面
    Write-Log "检查主页面 https://$VERCEL_DOMAIN/..."
    try {
        $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/" -UseBasicParsing -TimeoutSec 15
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            Write-Log "✅ 主页面访问成功 (状态码: 200)"
            $report.details.page_check = $true
            
            # 检查页面内容
            $content = $response.Content
            if ($content -match "🌸 欢迎进入 JEV System") {
                Write-Log "✅ 页面包含预期文本: '🌸 欢迎进入 JEV System'"
            } else {
                Write-Log "⚠️  页面不包含预期文本"
            }
        } else {
            Write-Log "❌ 主页面访问失败 (状态码: $statusCode)"
        }
    } catch {
        Write-Log "❌ 主页面访问异常: $_"
    }
    
    # 检查client_portal.html
    Write-Log "检查client_portal.html..."
    try {
        $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/client_portal.html" -UseBasicParsing -TimeoutSec 15
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            Write-Log "✅ client_portal.html 访问成功 (状态码: 200)"
        } else {
            Write-Log "❌ client_portal.html 访问失败 (状态码: $statusCode)"
        }
    } catch {
        Write-Log "❌ client_portal.html 访问异常: $_"
    }
    
    # 检查脚本文件
    $scriptFiles = @(
        "jev_ai_assistant.js",
        "jev_image_capture.js",
        "jev_ui_style.css"
    )
    
    $allScriptsFound = $true
    foreach ($script in $scriptFiles) {
        Write-Log "检查脚本文件 $script..."
        try {
            $response = Invoke-WebRequest -Uri "https://$VERCEL_DOMAIN/$script" -UseBasicParsing -TimeoutSec 10
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
    
    # 检查Cloudflare Worker接口
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
    if ($report.details.github_push -eq "success" -and $report.details.page_check -and $report.details.scripts_check -and $report.worker_status -eq 200) {
        $report.success = $true
        $report.details.vercel_deploy = "success"
        Write-Log "✅ Vercel deploy success"
    } else {
        $report.details.vercel_deploy = "pending"
        Write-Log "⚠️  Vercel 部署可能还在进行中，请稍后手动验证"
    }
} catch {
    Write-Log "❌ 部署验证失败: $_"
    $report.details.error = "部署验证失败: $_"
}

# 更新时间戳
$report.timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 生成JSON报告
$reportJson = $report | ConvertTo-Json -Depth 5
Write-Log "===== 部署报告 ====="
Write-Log $reportJson

# 保存报告到文件
$reportPath = "$logsDir\vercel_deploy_report_v9.3.json"
$reportJson | Out-File -FilePath $reportPath -Encoding utf8
Write-Log "报告已保存到: $reportPath"

# 输出成功示例格式
Write-Log ""
Write-Log "✅ GitHub push: $($report.details.github_push)"
Write-Log "✅ Vercel deploy: $($report.details.vercel_deploy)"
Write-Log "🌐 URL: https://$VERCEL_DOMAIN"
Write-Log "🔗 Worker: $API_BASE"
Write-Log "🤖 ELara: 待验证"
Write-Log "📷 图像采集: 待验证"
Write-Log "🗓️  时间: $($report.timestamp)"
Write-Log ""
Write-Log "===== JEV UI v9.3 自动部署任务完成 ====="
Write-Log "愿系统稳定如初生之日，愿每一次部署都开启新的世界。"

# 返回到原始目录
Set-Location -Path "D:\PDF转网页"

# 退出码
if ($report.success) {
    exit 0
} else {
    exit 1
}