# JEV-CLIENT-STABILITY-VALIDATION-v3.2
# 网页验证与稳定模式切换脚本

# 配置参数
$BasePath = "D:\PDF转网页"
$DiagnosticsDir = "$BasePath\diagnostics"
$ReportFile = "$DiagnosticsDir\web_validation_report.txt"
$SystemModeFile = "$DiagnosticsDir\system_mode_state.json"
$HealthCheckScript = "$DiagnosticsDir\system_health_check.js"
$JevClientBat = "$BasePath\Start-JEV-Client.bat"

# 确保诊断目录存在
if (-not (Test-Path $DiagnosticsDir)) {
    New-Item -ItemType Directory -Path $DiagnosticsDir -Force | Out-Null
}

# 日志函数
function Write-ValidationLog {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message"
    Add-Content -Path $ReportFile -Value "[$timestamp] $message"
}

# 初始化报告
$header = @"
=====================================================
JEV-CLIENT-STABILITY-VALIDATION-v3.2 验证报告
=====================================================
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
=====================================================
"@
Set-Content -Path $ReportFile -Value $header
Write-ValidationLog "开始JEV客户端稳定性验证任务..."

# 统计变量
$validPages = @()
$invalidPages = @()
$encodingVerified = $false
$systemHealthy = $false
$finalHealthScore = 0
$convergenceIndex = 0
$utf8GuardStatus = "INACTIVE"

# 检查端口8080是否已在使用
function Test-PortInUse {
    param(
        [int]$port = 8080
    )
    try {
        $socket = New-Object System.Net.Sockets.TcpClient
        $socket.ConnectTimeout = 1000
        $result = $socket.BeginConnect("localhost", $port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(1000, $false)
        $socket.Close()
        return $success
    } catch {
        return $false
    }
}

# 启动JEV Client服务
Write-ValidationLog "1️⃣ 启动JEV Client服务..."
try {
    # 检查是否已在运行
    if (Test-PortInUse -port 8080) {
        Write-ValidationLog "⚠️ 端口8080已在使用中，服务可能已启动"
    } else {
        # 检查启动脚本是否存在
        if (Test-Path $JevClientBat) {
            Write-ValidationLog "正在运行 $JevClientBat..."
            Start-Process -FilePath $JevClientBat -WorkingDirectory $BasePath -WindowStyle Hidden
            # 等待服务启动
            Write-ValidationLog "等待服务启动..."
            Start-Sleep -Seconds 5
        } else {
            # 如果启动脚本不存在，尝试直接启动node服务
            Write-ValidationLog "⚠️ 未找到Start-JEV-Client.bat，尝试直接启动JEV客户端..."
            if (Test-Path "$BasePath\JEV_Client\server.js") {
                Start-Process -FilePath "node" -ArgumentList "$BasePath\JEV_Client\server.js" -WorkingDirectory "$BasePath\JEV_Client" -WindowStyle Hidden
                Start-Sleep -Seconds 5
            } else {
                Write-ValidationLog "❌ 无法启动JEV客户端服务"
            }
        }
    }
    
    # 验证服务是否启动
    if (Test-PortInUse -port 8080) {
        Write-ValidationLog "✅ JEV Client服务已启动，端口8080正常监听"
    } else {
        Write-ValidationLog "❌ JEV Client服务启动失败，端口8080未监听"
    }
} catch {
    Write-ValidationLog "❌ 启动服务时出错: $_"
}

# 验证网页
function Test-WebPage {
    param(
        [string]$url
    )
    Write-ValidationLog "正在验证页面: $url"
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
        $statusCode = $response.StatusCode
        $content = $response.Content
        
        # 检查状态码
        if ($statusCode -eq 200) {
            # 检查UTF-8编码
            $hasUtf8 = $content -match '<meta charset="UTF-8">'
            
            # 检查关键字
            $hasKeywords = $content -match 'JEV Client' -or $content -match '系统状态'
            
            # 简单的乱码检查（检查是否有非中文正常字符的Unicode范围）
            $hasGarbled = $content -match '[\uD800-\uDFFF]' -or $content -match '[\u0370-\u03FF]' # 检查代理对和希腊字符等
            
            if ($hasUtf8 -and $hasKeywords -and -not $hasGarbled) {
                $validPages += "✅ $url — OK (UTF-8 verified)"
                Write-ValidationLog "✅ $url 验证成功"
                return $true
            } else {
                $errorMsg = "❌ $url 验证失败: "
                if (-not $hasUtf8) { $errorMsg += "缺少UTF-8编码设置; " }
                if (-not $hasKeywords) { $errorMsg += "缺少关键字; " }
                if ($hasGarbled) { $errorMsg += "检测到乱码; " }
                $invalidPages += $errorMsg.TrimEnd('; ')
                Write-ValidationLog $errorMsg.TrimEnd('; ')
                return $false
            }
        } else {
            $invalidPages += "❌ $url 访问失败 (状态码: $statusCode)"
            Write-ValidationLog "❌ $url 访问失败，状态码: $statusCode"
            return $false
        }
    } catch {
        $invalidPages += "❌ $url 访问异常: $_"
        Write-ValidationLog "❌ $url 访问异常: $_"
        return $false
    }
}

# 执行网页验证
Write-ValidationLog "2️⃣ 开始网页访问验证..."
$pagesToTest = @(
    "http://localhost:8080/ui/login_portal.html",
    "http://localhost:8080/ui/admin_panel.html",
    "http://localhost:8080/diagnostics/status_panel.html"
)

$allPagesValid = $true
foreach ($page in $pagesToTest) {
    if (-not (Test-WebPage -url $page)) {
        $allPagesValid = $false
    }
}

# 检查是否所有页面都验证通过
if ($allPagesValid) {
    $encodingVerified = $true
    Write-ValidationLog "✅ 所有页面编码验证通过"
} else {
    Write-ValidationLog "❌ 部分页面验证失败"
}

# 执行系统健康检查
Write-ValidationLog "4️⃣ 执行系统健康检查..."
try {
    if (Test-Path $HealthCheckScript) {
        Set-Location -Path $BasePath
        $healthCheckOutput = & node "$DiagnosticsDir\system_health_check.js" --summary 2>&1
        
        # 将输出写入日志
        $healthCheckOutput | ForEach-Object { Write-ValidationLog $_ }
        
        # 提取健康检查指标
        foreach ($line in $healthCheckOutput) {
            if ($line -match "最终健康评分: (\d+)/100") {
                $finalHealthScore = [int]$matches[1]
            }
            if ($line -match "收敛指数: (\d+)%") {
                $convergenceIndex = [int]$matches[1]
            }
            if ($line -match "UTF-8 Guard.*Active") {
                $utf8GuardStatus = "ACTIVE"
            }
            if ($line -match "系统状态.*STABLE") {
                $systemHealthy = $true
            }
        }
        
        Write-ValidationLog "📊 健康评分: $finalHealthScore/100"
        Write-ValidationLog "🔄 收敛指数: $convergenceIndex%"
        Write-ValidationLog "🛡️ UTF8_GUARD: $utf8GuardStatus"
    } else {
        Write-ValidationLog "❌ 未找到系统健康检查脚本: $HealthCheckScript"
    }
} catch {
    Write-ValidationLog "❌ 执行系统健康检查失败: $_"
}

# 检查是否满足稳定模式条件
$canSwitchToStable = $false
if ($allPagesValid -and $finalHealthScore -ge 95 -and $convergenceIndex -ge 90 -and $utf8GuardStatus -eq "ACTIVE") {
    $canSwitchToStable = $true
    Write-ValidationLog "✅ 满足稳定模式条件，可以切换到STABLE模式"
} else {
    Write-ValidationLog "❌ 不满足稳定模式条件，无法切换到STABLE模式"
}

# 更新系统模式状态
Write-ValidationLog "5️⃣ 更新系统模式状态..."
try {
    $systemModeData = @{
        "SYSTEM_MODE" = if ($canSwitchToStable) { "STABLE" } else { "CHECKING" }
        "UTF8_GUARD" = $utf8GuardStatus
        "CLIENT_STATUS" = if ($allPagesValid) { "VERIFIED" } else { "FAILED" }
        "HEALTH_SCORE" = "$finalHealthScore"
        "CONVERGENCE_INDEX" = "$convergenceIndex"
        "TIMESTAMP" = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        "VALIDATION_PASSED" = $canSwitchToStable
    }
    
    $systemModeData | ConvertTo-Json | Set-Content -Path $SystemModeFile
    Write-ValidationLog "✅ 系统模式状态已更新到: $SystemModeFile"
} catch {
    Write-ValidationLog "❌ 更新系统模式状态失败: $_"
}

# 生成最终报告
Write-ValidationLog ""
Write-ValidationLog "===== 验证结果摘要 ====="
Write-ValidationLog "🧱 UTF-8 编码验证: $(if ($encodingVerified) { "✅ PASSED" } else { "❌ FAILED" })"
Write-ValidationLog "🛡️ UTF8_GUARD 状态: $utf8GuardStatus"
Write-ValidationLog "🔄 收敛指数: $convergenceIndex%"
Write-ValidationLog "💯 健康评分: $finalHealthScore/100"
Write-ValidationLog "🏁 系统模式: $(if ($canSwitchToStable) { "✅ STABLE" } else { "⚠️ CHECKING" })"
Write-ValidationLog ""

if ($validPages.Count -gt 0) {
    Write-ValidationLog "✅ 正常网页列表:"
    $validPages | ForEach-Object { Write-ValidationLog $_ }
    Write-ValidationLog ""
}

if ($invalidPages.Count -gt 0) {
    Write-ValidationLog "⚠️ 异常网页列表:"
    $invalidPages | ForEach-Object { Write-ValidationLog $_ }
    Write-ValidationLog ""
}

Write-ValidationLog "📄 报告保存路径: $ReportFile"
Write-ValidationLog "📄 系统状态文件: $SystemModeFile"
Write-ValidationLog ""
Write-ValidationLog "====================================================="
Write-ValidationLog "JEV-CLIENT-STABILITY-VALIDATION-v3.2 验证完成"
Write-ValidationLog "====================================================="

# 输出最终结果
Write-Host ""
Write-Host "✅ JEV-CLIENT-STABILITY-VALIDATION-v3.2 验证完成"
Write-Host ""

if ($validPages.Count -gt 0) {
    Write-Host "✅ 正常网页列表:"
    $validPages | ForEach-Object { Write-Host $_ }
    Write-Host ""
}

if ($invalidPages.Count -gt 0) {
    Write-Host "⚠️ 异常网页列表:"
    $invalidPages | ForEach-Object { Write-Host $_ }
    Write-Host ""
}

Write-Host "🧱 UTF-8 Encoding: $(if ($encodingVerified) { "Verified" } else { "Failed" })"
Write-Host "🛡️ UTF8_GUARD: $utf8GuardStatus"
Write-Host "🔄 收敛指数: $convergenceIndex%"
Write-Host "💯 Health Score: $finalHealthScore/100"
Write-Host "🏁 System Mode: $(if ($canSwitchToStable) { "STABLE" } else { "CHECKING" })"
Write-Host "📄 Report: $ReportFile"
Write-Host ""

exit 0
