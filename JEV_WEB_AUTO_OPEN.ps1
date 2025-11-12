#!/usr/bin/env pwsh
# JEV-WEB-AUTO-OPEN-v1.0
# 启动JEV Client网页界面并验证UI层加载完整性

# 确保diagnostics目录存在
$diagnosticsDir = "D:\PDF转网页\diagnostics"
if (-not (Test-Path -Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
}

# 创建报告文件
$reportFile = "$diagnosticsDir\web_auto_open_report.txt"

# 记录开始时间
$startTime = Get-Date

# 初始化报告内容
$reportContent = @"
===================================================
JEV网页层自动启动与验证报告
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
===================================================

"@

Write-Host "[INFO] 开始执行JEV网页层自动启动与验证..."

# 检查server.js是否运行
$serverJsPath = "D:\PDF转网页\JEV_Client\server.js"
$serverRunning = $false
$serverPid = $null

Write-Host "[INFO] 检查server.js运行状态..."
try {
    # 查找node进程运行server.js
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    foreach ($process in $nodeProcesses) {
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($commandLine -like "*server.js*" -and $commandLine -like "*JEV_Client*") {
            $serverRunning = $true
            $serverPid = $process.Id
            Write-Host "[INFO] server.js 正在运行 (PID: $serverPid)"
            $reportContent += "server.js 状态: 正在运行 (PID: $serverPid)\n\n"
            break
        }
    }
    
    # 如果server.js未运行，尝试启动
    if (-not $serverRunning) {
        Write-Host "[INFO] server.js 未运行，尝试启动..."
        $reportContent += "server.js 状态: 未运行，正在启动...\n\n"
        
        # 启动server.js在后台运行
        Start-Process -FilePath "node" -ArgumentList $serverJsPath -WorkingDirectory "D:\PDF转网页\JEV_Client" -PassThru
        
        # 等待3秒让服务器启动
        Write-Host "[INFO] 等待服务器启动..."
        Start-Sleep -Seconds 3
        
        # 再次检查是否启动成功
        $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
        foreach ($process in $nodeProcesses) {
            $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -like "*server.js*" -and $commandLine -like "*JEV_Client*") {
                $serverRunning = $true
                $serverPid = $process.Id
                Write-Host "[INFO] server.js 已成功启动 (PID: $serverPid)" -ForegroundColor Green
                break
            }
        }
        
        if (-not $serverRunning) {
            Write-Host "[ERROR] 无法启动server.js" -ForegroundColor Red
            $reportContent += "错误: 无法启动server.js\n\n"
        }
    }
} catch {
    Write-Host "[ERROR] 检查server.js状态时出错: $_" -ForegroundColor Red
    $reportContent += "错误: 检查server.js状态时出错: $_\n\n"
}

# 检查端口8080是否监听
Write-Host "[INFO] 检查端口8080监听状态..."
$portListening = $false
try {
    $tcpListeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    foreach ($listener in $tcpListeners) {
        if ($listener.Port -eq 8080) {
            $portListening = $true
            Write-Host "[INFO] 端口8080正在监听 ✓" -ForegroundColor Green
            $reportContent += "端口8080状态: 正在监听 ✓\n\n"
            break
        }
    }
    
    if (-not $portListening) {
        Write-Host "[ERROR] 端口8080未监听" -ForegroundColor Red
        $reportContent += "错误: 端口8080未监听\n\n"
    }
} catch {
    Write-Host "[ERROR] 检查端口监听状态时出错: $_" -ForegroundColor Red
    $reportContent += "错误: 检查端口监听状态时出错: $_\n\n"
}

# 定义要验证的页面
$pages = @(
    @{ Name = "登录页"; Url = "http://localhost:8080/ui/login_portal.html"; ExpectedStatusCode = 200 }
    @{ Name = "管理页"; Url = "http://localhost:8080/ui/admin_panel.html"; ExpectedStatusCode = 200 }
    @{ Name = "状态面板"; Url = "http://localhost:8080/diagnostics/status_panel.html"; ExpectedStatusCode = 200 }
)

# 验证页面访问
Write-Host "[INFO] 验证网页访问状态..."
$reportContent += "[页面验证结果]\n"
$successfulPages = 0

foreach ($page in $pages) {
    $statusCode = $null
    $responseTime = 0
    $success = $false
    $errorMessage = ""
    
    try {
        # 测量响应时间
        $pageStartTime = Get-Date
        $response = Invoke-WebRequest -Uri $page.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $responseTime = ((Get-Date) - $pageStartTime).TotalMilliseconds
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq $page.ExpectedStatusCode) {
            $success = $true
            $successfulPages++
            Write-Host "✅ $($page.Name) 加载成功 ($([math]::Round($responseTime))ms)" -ForegroundColor Green
            $errorMessage = "页面加载正常"
        } else {
            Write-Host "❌ $($page.Name) 加载失败: 状态码 $statusCode" -ForegroundColor Red
            $errorMessage = "状态码不匹配: 预期 $($page.ExpectedStatusCode)，实际 $statusCode"
        }
    } catch {
        Write-Host "❌ $($page.Name) 加载失败: $_" -ForegroundColor Red
        $errorMessage = "请求错误: $_"
    }
    
    # 添加到报告
    $reportContent += "- 页面: $($page.Name) ($($page.Url))\n"
    $reportContent += "  加载用时: $([math]::Round($responseTime))ms\n"
    $reportContent += "  状态码: $(if ($statusCode) { $statusCode } else { "N/A" })\n"
    $reportContent += "  状态: $(if ($success) { "✅ 成功" } else { "❌ 失败" })\n"
    $reportContent += "  详细信息: $errorMessage\n\n"
    
    # 如果页面存在，尝试用默认浏览器打开
    if ($success -and $portListening) {
        try {
            Start-Process $page.Url
            Write-Host "[INFO] 已在浏览器中打开: $($page.Name)"
        } catch {
            Write-Host "[WARNING] 无法打开浏览器: $_" -ForegroundColor Yellow
        }
    }
}

# 计算网页层状态
$webLayerStatus = if ($successfulPages -eq $pages.Count) { "CONNECTED" } else { "PARTIAL" }
if ($successfulPages -eq 0) { $webLayerStatus = "DISCONNECTED" }

# 计算执行时间
$endTime = Get-Date
$executionTime = ($endTime - $startTime).TotalSeconds

# 添加汇总信息到报告
$reportContent += @"
===================================================
[验证汇总]
- 成功加载页面数: $successfulPages/$($pages.Count)
- 网页层状态: $webLayerStatus
- 执行耗时: $executionTime 秒
===================================================

JEV网页层自动启动与验证完成
"@

# 保存报告
$reportContent | Out-File -FilePath $reportFile -Encoding utf8
Write-Host "[INFO] 网页验证报告已生成: $reportFile"

# 输出最终状态
Write-Host "🏁 Web层状态: $webLayerStatus" -ForegroundColor $(if ($webLayerStatus -eq "CONNECTED") { "Green" } else { "Yellow" })
Write-Host "📄 报告: $reportFile"

# 返回状态码
if ($webLayerStatus -eq "CONNECTED") { exit 0 } else { exit 1 }
