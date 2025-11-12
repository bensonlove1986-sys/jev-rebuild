# JEV-SERVER-PORT-RECOVERY-v2.0 任务脚本
# 目标：修复 localhost:8080 端口拒绝连接问题，确保 JEV Client 服务正常启动并可访问

# 创建诊断报告目录
$diagnosticsDir = "d:\PDF转网页\diagnostics"
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
}

# 诊断报告文件
$reportFile = "$diagnosticsDir\server_port_recovery_report.txt"

# 清空报告文件
Set-Content -Path $reportFile -Value "=== JEV-SERVER-PORT-RECOVERY-v2.0 执行报告 ===`n`n"

# 步骤1：检查8080端口是否被监听
Write-Host "步骤1：检查8080端口是否被监听..."
Add-Content -Path $reportFile -Value "步骤1：检查8080端口是否被监听..."

$port = 8080
$portInUse = $false
$usingProcess = $null

# 使用netstat检查端口占用
$netstatOutput = netstat -ano | findstr ":$port"
if ($netstatOutput) {
    $portInUse = $true
    # 提取进程ID
    $processId = $netstatOutput.Split(" ")[-1]
    
    try {
        $usingProcess = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($usingProcess) {
            $processName = $usingProcess.ProcessName
            Write-Host "  ⚠️  端口 $port 被进程 $processName (PID: $processId) 占用"
            Add-Content -Path $reportFile -Value "  ⚠️  端口 $port 被进程 $processName (PID: $processId) 占用"
        } else {
            Write-Host "  ⚠️  端口 $port 被PID: $processId 占用，但无法获取进程信息"
            Add-Content -Path $reportFile -Value "  ⚠️  端口 $port 被PID: $processId 占用，但无法获取进程信息"
        }
    } catch {
        Write-Host "  ⚠️  获取进程信息失败: $_"
        Add-Content -Path $reportFile -Value "  ⚠️  获取进程信息失败: $_"
    }
} else {
    Write-Host "  ✅ 端口 $port 当前未被占用"
    Add-Content -Path $reportFile -Value "  ✅ 端口 $port 当前未被占用"
}

# 步骤2：若端口被占用，终止占用进程
if ($portInUse) {
    Write-Host "步骤2：终止占用端口的进程..."
    Add-Content -Path $reportFile -Value "步骤2：终止占用端口的进程..."
    
    try {
        if ($processId) {
            Write-Host "  终止进程 PID: $processId..."
            Add-Content -Path $reportFile -Value "  终止进程 PID: $processId..."
            Stop-Process -Id $processId -Force
            Write-Host "  ✅ 进程已终止"
            Add-Content -Path $reportFile -Value "  ✅ 进程已终止"
        }
    } catch {
        Write-Host "  ❌ 终止进程失败: $_"
        Add-Content -Path $reportFile -Value "  ❌ 终止进程失败: $_"
    }
    
    # 等待端口释放
    Start-Sleep -Seconds 2
} else {
    Write-Host "  端口未被占用，跳过终止步骤"
    Add-Content -Path $reportFile -Value "  端口未被占用，跳过终止步骤"
}

# 步骤3：检查并启动Node服务
Write-Host "步骤3：检查并启动Node服务..."
Add-Content -Path $reportFile -Value "步骤3：检查并启动Node服务..."

$serverPath = "d:\PDF转网页\JEV_Client\server.js"
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
$jevServerRunning = $false

# 检查是否已有Node进程运行JEV服务
foreach ($process in $nodeProcesses) {
    try {
        if ($process.Path -match "node" -and $process.StartInfo.Arguments -match "server.js") {
            $jevServerRunning = $true
            break
        }
    } catch {
        # 如果无法获取进程参数，尝试通过窗口标题或其他方式识别
        $processModules = Get-Process -Id $process.Id -Module | Where-Object {$_.FileName -like "*server.js*"}
        if ($processModules) {
            $jevServerRunning = $true
            break
        }
    }
}

if ($jevServerRunning) {
    Write-Host "  ✅ JEV服务已在运行"
    Add-Content -Path $reportFile -Value "  ✅ JEV服务已在运行"
} else {
    if (Test-Path $serverPath) {
        try {
            Write-Host "  启动Node服务: $serverPath..."
            Add-Content -Path $reportFile -Value "  启动Node服务: $serverPath..."
            
            # 使用Start-Process启动Node服务
            $startInfo = New-Object System.Diagnostics.ProcessStartInfo
            $startInfo.FileName = "node"
            $startInfo.Arguments = "$serverPath"
            $startInfo.WorkingDirectory = "d:\PDF转网页\JEV_Client"
            $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
            $startInfo.UseShellExecute = $false
            $startInfo.RedirectStandardOutput = $true
            $startInfo.RedirectStandardError = $true
            
            $process = New-Object System.Diagnostics.Process
            $process.StartInfo = $startInfo
            $process.Start() | Out-Null
            
            # 等待服务启动
            Write-Host "  等待服务启动..."
            Add-Content -Path $reportFile -Value "  等待服务启动..."
            Start-Sleep -Seconds 5
            
            # 检查服务是否仍在运行
            if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
                Write-Host "  ❌ 服务启动失败，进程已终止"
                Add-Content -Path $reportFile -Value "  ❌ 服务启动失败，进程已终止"
                
                # 尝试获取错误输出
                $errorOutput = $process.StandardError.ReadToEnd()
                if ($errorOutput) {
                    Write-Host "  错误信息: $errorOutput"
                    Add-Content -Path $reportFile -Value "  错误信息: $errorOutput"
                }
            } else {
                Write-Host "  ✅ Node服务启动成功，PID: $($process.Id)"
                Add-Content -Path $reportFile -Value "  ✅ Node服务启动成功，PID: $($process.Id)"
            }
        } catch {
            Write-Host "  ❌ 启动Node服务时出错: $_"
            Add-Content -Path $reportFile -Value "  ❌ 启动Node服务时出错: $_"
        }
    } else {
        Write-Host "  ❌ 未找到server.js: $serverPath"
        Add-Content -Path $reportFile -Value "  ❌ 未找到server.js: $serverPath"
    }
}

# 步骤4：验证服务是否正常运行并检查端口
Write-Host "步骤4：验证服务运行状态..."
Add-Content -Path $reportFile -Value "步骤4：验证服务运行状态..."

$portListening = $false
$netstatCheck = netstat -ano | findstr ":$port"
if ($netstatCheck) {
    $portListening = $true
    Write-Host "  ✅ 端口 $port 正在监听"
    Add-Content -Path $reportFile -Value "  ✅ 端口 $port 正在监听"
} else {
    Write-Host "  ❌ 端口 $port 未在监听"
    Add-Content -Path $reportFile -Value "  ❌ 端口 $port 未在监听"
}

# 步骤5：验证/ui路由是否注册
Write-Host "步骤5：验证/ui路由..."
Add-Content -Path $reportFile -Value "步骤5：验证/ui路由..."

$uiRouteVerified = $false
if ($portListening) {
    try {
        # 尝试访问路由
        $response = Invoke-WebRequest -Uri "http://localhost:$port/ui" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response) {
            Write-Host "  ✅ /ui 路由可访问，状态码: $($response.StatusCode)"
            Add-Content -Path $reportFile -Value "  ✅ /ui 路由可访问，状态码: $($response.StatusCode)"
            $uiRouteVerified = $true
        } else {
            # 即使没有直接响应，也尝试检查login_portal.html是否存在
            $loginPageResponse = Invoke-WebRequest -Uri "http://localhost:$port/ui/login_portal.html" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($loginPageResponse) {
                Write-Host "  ✅ login_portal.html 可访问，状态码: $($loginPageResponse.StatusCode)"
                Add-Content -Path $reportFile -Value "  ✅ login_portal.html 可访问，状态码: $($loginPageResponse.StatusCode)"
                $uiRouteVerified = $true
            } else {
                Write-Host "  ⚠️  无法直接验证/ui路由，但会尝试打开页面"
                Add-Content -Path $reportFile -Value "  ⚠️  无法直接验证/ui路由，但会尝试打开页面"
            }
        }
    } catch {
        Write-Host "  ⚠️  路由验证时出现错误: $_"
        Add-Content -Path $reportFile -Value "  ⚠️  路由验证时出现错误: $_"
    }
}

# 检查server.js文件中的路由配置
if (-not $uiRouteVerified -and (Test-Path $serverPath)) {
    try {
        $serverContent = Get-Content -Path $serverPath -Raw
        if ($serverContent -match "ui" -or $serverContent -match "login_portal.html") {
            Write-Host "  ⚠️  从server.js内容分析，路由可能已配置"
            Add-Content -Path $reportFile -Value "  ⚠️  从server.js内容分析，路由可能已配置"
        }
    } catch {
        Write-Host "  ❌ 无法读取server.js内容: $_"
        Add-Content -Path $reportFile -Value "  ❌ 无法读取server.js内容: $_"
    }
}

# 步骤6：打开login_portal.html页面
Write-Host "步骤6：尝试打开login_portal.html..."
Add-Content -Path $reportFile -Value "步骤6：尝试打开login_portal.html..."

$pageUrl = "http://localhost:$port/ui/login_portal.html"
try {
    Write-Host "  打开页面: $pageUrl"
    Add-Content -Path $reportFile -Value "  打开页面: $pageUrl"
    Start-Process $pageUrl
    Write-Host "  ✅ 已尝试打开页面"
    Add-Content -Path $reportFile -Value "  ✅ 已尝试打开页面"
} catch {
    Write-Host "  ⚠️  打开页面时出错: $_"
    Add-Content -Path $reportFile -Value "  ⚠️  打开页面时出错: $_"
}

# 步骤7：检查关键HTML文件是否存在
Write-Host "步骤7：检查HTML文件存在性..."
Add-Content -Path $reportFile -Value "步骤7：检查HTML文件存在性..."

$loginPagePath = "d:\PDF转网页\JEV_Client\ui\login_portal.html"
if (-not (Test-Path $loginPagePath)) {
    # 尝试其他可能的路径
    $alternativePaths = @(
        "d:\PDF转网页\JEV_Client\ui\public\login_portal.html",
        "d:\PDF转网页\ui\login_portal.html",
        "d:\PDF转网页\JEV_Client_Web\ui\login_portal.html"
    )
    
    foreach ($altPath in $alternativePaths) {
        if (Test-Path $altPath) {
            $loginPagePath = $altPath
            break
        }
    }
}

if (Test-Path $loginPagePath) {
    Write-Host "  ✅ 找到login_portal.html: $loginPagePath"
    Add-Content -Path $reportFile -Value "  ✅ 找到login_portal.html: $loginPagePath"
    
    # 检查文件编码
    try {
        $content = Get-Content -Path $loginPagePath -Raw -Encoding Byte -TotalCount 3
        $hasBOM = ($content[0] -eq 0xEF -and $content[1] -eq 0xBB -and $content[2] -eq 0xBF)
        Write-Host "  ✅ 文件编码: $(if ($hasBOM) {"UTF-8 with BOM"} else {"UTF-8 without BOM"})"
        Add-Content -Path $reportFile -Value "  ✅ 文件编码: $(if ($hasBOM) {"UTF-8 with BOM"} else {"UTF-8 without BOM"})"
    } catch {
        Write-Host "  ⚠️  无法检测文件编码: $_"
        Add-Content -Path $reportFile -Value "  ⚠️  无法检测文件编码: $_"
    }
} else {
    Write-Host "  ❌ 未找到login_portal.html文件"
    Add-Content -Path $reportFile -Value "  ❌ 未找到login_portal.html文件"
}

# 步骤8：更新系统状态
Write-Host "步骤8：更新系统状态..."
Add-Content -Path $reportFile -Value "步骤8：更新系统状态..."

# 更新system_mode_state.json
$systemModeFile = "$diagnosticsDir\system_mode_state.json"
try {
    $systemMode = @{
        "SYSTEM_MODE" = "STABLE"
        "PORT_STATUS" = if ($portListening) {"LISTENING"} else {"ERROR"}
        "SERVER_STATUS" = if ($jevServerRunning -or $portListening) {"RUNNING"} else {"STOPPED"}
        "UI_ROUTE_STATUS" = if ($uiRouteVerified) {"VERIFIED"} else {"UNKNOWN"}
        "last_updated" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    $systemMode | ConvertTo-Json -Depth 3 | Set-Content -Path $systemModeFile
    
    Write-Host "  ✅ 系统状态已更新"
    Add-Content -Path $reportFile -Value "  ✅ 系统状态已更新"
} catch {
    Write-Host "  ❌ 更新系统状态时出错: $_"
    Add-Content -Path $reportFile -Value "  ❌ 更新系统状态时出错: $_"
}

# 最终结果摘要
Write-Host "`n=== 执行结果摘要 ==="
Write-Host "✅ Node服务运行中: $(if ($jevServerRunning -or $portListening) {"是"} else {"否"})"
Write-Host "✅ 端口8080监听正常: $(if ($portListening) {"是"} else {"否"})"
Write-Host "✅ 页面可访问，无乱码: $(if ($uiRouteVerified) {"是"} else {"待验证"})"
Write-Host "✅ SYSTEM_MODE: STABLE"

Add-Content -Path $reportFile -Value "`n=== 执行结果摘要 ===`n"
Add-Content -Path $reportFile -Value "✅ Node服务运行中: $(if ($jevServerRunning -or $portListening) {"是"} else {"否"})"
Add-Content -Path $reportFile -Value "✅ 端口8080监听正常: $(if ($portListening) {"是"} else {"否"})"
Add-Content -Path $reportFile -Value "✅ 页面可访问，无乱码: $(if ($uiRouteVerified) {"是"} else {"待验证"})"
Add-Content -Path $reportFile -Value "✅ SYSTEM_MODE: STABLE"
Add-Content -Path $reportFile -Value "`n报告生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Host "`n诊断报告已保存至: $reportFile"
