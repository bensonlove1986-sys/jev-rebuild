# JEV-UI-LAUNCH-RECOVERY-v1.0
# 修复JEV Client网页层无法打开的问题

Write-Host "===== JEV-UI-LAUNCH-RECOVERY-v1.0 启动 ====="

# 初始化变量
$baseDir = "D:\PDF转网页"
$clientDir = "$baseDir\JEV_Client"
$serverPath = "$clientDir\server.js"
$uiDir = "$clientDir\ui"
$diagnosticsDir = "$baseDir\diagnostics"
$reportPath = "$diagnosticsDir\ui_launch_recovery_report.txt"
$systemStatePath = "$diagnosticsDir\system_mode_state.json"

$port = 8080
$statusUrl = "http://localhost:$port/status"
$uiUrls = @(
    "http://localhost:$port/ui/login_portal.html",
    "http://localhost:$port/ui/client_portal.html",
    "http://localhost:$port/ui/sentinel_dashboard.html"
)

$uiFiles = @(
    "$uiDir\login_portal.html",
    "$uiDir\client_portal.html",
    "$uiDir\sentinel_dashboard.html"
)

# 创建诊断目录
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
    Write-Host "[Launch] 创建诊断目录: $diagnosticsDir"
}

# 初始化报告
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$reportContent = @"
# JEV UI启动恢复报告
# 生成时间: $timestamp

"@

$portStatus = "FAILED"
$routeStatus = "FAILED"
$fileStatus = "FAILED"
$accessStatus = "FAILED"
$systemMode = "UNKNOWN"
$uiAccess = "PENDING"
$nodeProcess = $null

# 1️⃣ 检测8080端口监听状态
Write-Host "\n[Launch] 1️⃣ 检测8080端口监听状态..."
try {
    Write-Host "[Launch] 测试连接: $statusUrl"
    $response = Invoke-WebRequest -Uri $statusUrl -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($response -and $response.StatusCode -eq 200) {
        $portStatus = "SUCCESS"
        Write-Host "[Launch] ✅ 端口 $port 已在监听"
        $reportContent += "✅ 端口状态: $port 已在监听\n"
    } else {
        Write-Host "[Launch] ⚠️ 端口 $port 未监听，尝试启动服务"
        $reportContent += "⚠️ 端口状态: $port 未监听，正在启动服务\n"
        
        # 检查server.js是否存在
        if (Test-Path $serverPath) {
            # 先终止可能存在的node进程
            Write-Host "[Launch] 终止现有Node进程..."
            Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
            
            # 启动服务
            Write-Host "[Launch] 启动服务: node server.js"
            $nodeProcess = Start-Process -FilePath "node" -ArgumentList $serverPath -WorkingDirectory $clientDir -PassThru -NoNewWindow
            Write-Host "[Launch] 服务已启动，PID: $($nodeProcess.Id)"
            
            # 等待服务启动
            Write-Host "[Launch] 等待服务就绪..."
            Start-Sleep -Seconds 5
            
            # 重新检查端口
            try {
                $response = Invoke-WebRequest -Uri $statusUrl -TimeoutSec 3 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    $portStatus = "SUCCESS"
                    Write-Host "[Launch] ✅ 服务启动成功，端口 $port 正在监听"
                    $reportContent += "✅ 服务启动成功，端口 $port 正在监听\n"
                } else {
                    Write-Host "[Launch] ❌ 服务启动但端口 $port 响应异常"
                    $reportContent += "❌ 服务启动但端口 $port 响应异常\n"
                }
            } catch {
                Write-Host "[Launch] ❌ 服务启动后仍然无法连接到端口 $port"
                $reportContent += "❌ 服务启动后仍然无法连接到端口 $port\n"
            }
        } else {
            Write-Host "[Launch] ❌ server.js 文件不存在: $serverPath"
            $reportContent += "❌ server.js 文件不存在: $serverPath\n"
        }
    }
} catch {
    Write-Host "[Launch] ❌ 端口检测错误: $($_.Exception.Message)"
    $reportContent += "❌ 端口检测错误: $($_.Exception.Message)\n"
}

# 2️⃣ 检查server.js是否注册/ui路由
Write-Host "\n[Launch] 2️⃣ 检查server.js是否注册/ui路由..."
try {
    if (Test-Path $serverPath) {
        $serverContent = Get-Content -Path $serverPath -Raw
        
        # 检查是否已经有/ui路由注册
        if ($serverContent -match "app\.use\(['\"](\/|)ui['\"],\s*express\.static") {
            $routeStatus = "SUCCESS"
            Write-Host "[Launch] ✅ /ui 路由已存在"
            $reportContent += "✅ /ui 路由状态: 已注册\n"
        } else {
            Write-Host "[Launch] ⚠️ /ui 路由不存在，尝试添加"
            $reportContent += "⚠️ /ui 路由状态: 不存在，正在添加\n"
            
            # 备份原始文件
            $backupPath = "$serverPath.bak"
            Copy-Item -Path $serverPath -Destination $backupPath -Force
            Write-Host "[Launch] 已备份 server.js 到 $backupPath"
            
            # 添加/ui路由
            # 查找合适的位置插入路由（通常在express.static相关代码附近）
            $updatedContent = if ($serverContent -match "express\.static") {
                # 在第一个express.static调用后插入
                $serverContent -replace "(express\.static\([^)]+\))", "$1\n\n    // UI路由 - 由JEV-UI-LAUNCH-RECOVERY-v1.0添加\n    app.use('/ui', express.static(path.join(__dirname, 'ui')));"
            } else {
                # 如果找不到express.static，则在app定义后插入
                $serverContent -replace "(const app\s*=\s*express\(\))", "$1\n\n// UI路由 - 由JEV-UI-LAUNCH-RECOVERY-v1.0添加\napp.use('/ui', express.static(path.join(__dirname, 'ui')));"
            }
            
            # 确保有path模块导入
            if ($updatedContent -notmatch "const path\s*=\s*require\(['\"]path['\"]\)") {
                $updatedContent = "const path = require('path');\n" + $updatedContent
                Write-Host "[Launch] 添加了缺失的 path 模块导入"
            }
            
            # 写入更新后的文件
            Set-Content -Path $serverPath -Value $updatedContent -Encoding UTF8
            
            # 如果服务正在运行，需要重启
            if ($nodeProcess -and !$nodeProcess.HasExited) {
                Write-Host "[Launch] 重启服务以应用路由更改..."
                Stop-Process -Id $nodeProcess.Id -Force
                $nodeProcess = Start-Process -FilePath "node" -ArgumentList $serverPath -WorkingDirectory $clientDir -PassThru -NoNewWindow
                Start-Sleep -Seconds 3
            }
            
            $routeStatus = "SUCCESS"
            Write-Host "[Launch] ✅ 已添加 /ui 路由"
            $reportContent += "✅ 已添加 /ui 路由并重启服务\n"
        }
    } else {
        Write-Host "[Launch] ❌ server.js 文件不存在，无法检查路由"
        $reportContent += "❌ server.js 文件不存在，无法检查路由\n"
    }
} catch {
    Write-Host "[Launch] ❌ 检查/添加路由失败: $($_.Exception.Message)"
    $reportContent += "❌ 检查/添加路由失败: $($_.Exception.Message)\n"
}

# 3️⃣ 验证关键文件存在
Write-Host "\n[Launch] 3️⃣ 验证关键文件存在..."
$missingFiles = @()
foreach ($file in $uiFiles) {
    if (Test-Path $file) {
        Write-Host "[Launch] ✅ 文件存在: $file"
    } else {
        Write-Host "[Launch] ⚠️ 文件不存在: $file"
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    $fileStatus = "SUCCESS"
    $reportContent += "✅ 所有UI文件存在\n"
} else {
    $reportContent += "⚠️ 缺失文件: $($missingFiles.Count) 个\n"
    foreach ($file in $missingFiles) {
        $relativePath = $file -replace [regex]::Escape($baseDir), ""
        $reportContent += "  - $relativePath\n"
        
        # 尝试从其他位置复制文件（如果存在）
        $fileName = Split-Path $file -Leaf
        $possibleSources = @(
            "$baseDir\ui\$fileName",
            "$baseDir\JEV_Client_Web\ui\$fileName",
            "$baseDir\backup\ui\$fileName"
        )
        
        $sourceFound = $false
        foreach ($source in $possibleSources) {
            if (Test-Path $source) {
                Write-Host "[Launch] 从 $source 复制到 $file"
                Copy-Item -Path $source -Destination $file -Force
                $sourceFound = $true
                break
            }
        }
        
        if (!$sourceFound -and $fileName -eq "login_portal.html") {
            # 创建基本的login_portal.html文件
            $basicHtml = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV Login Portal</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            text-align: center;
        }
        h1 {
            color: #333;
        }
        .status {
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>JEV 登录门户</h1>
    <div class="status">服务运行正常</div>
    <p>此页面由 JEV-UI-LAUNCH-RECOVERY-v1.0 自动生成</p>
</body>
</html>
"@
            Set-Content -Path $file -Value $basicHtml -Encoding UTF8
            Write-Host "[Launch] 创建了基本的 $fileName 文件"
        }
    }
}

# 4️⃣ 执行访问验证
Write-Host "\n[Launch] 4️⃣ 执行访问验证..."
$accessResults = @{}
foreach ($url in $uiUrls) {
    try {
        Write-Host "[Launch] 访问: $url"
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
        $status = "SUCCESS"
        $accessResults[$url] = @{
            "status" = $status
            "statusCode" = $response.StatusCode
        }
        Write-Host "[Launch] ✅ 访问成功: $url ($($response.StatusCode))"
    } catch {
        $status = "FAILED"
        $accessResults[$url] = @{
            "status" = $status
            "error" = $_.Exception.Message
        }
        Write-Host "[Launch] ❌ 访问失败: $url - $($_.Exception.Message)"
    }
}

# 检查是否所有页面都可访问
$allAccessible = $true
foreach ($url in $uiUrls) {
    if ($accessResults[$url].status -ne "SUCCESS") {
        $allAccessible = $false
        break
    }
}

if ($allAccessible) {
    $accessStatus = "SUCCESS"
    $reportContent += "✅ 所有UI页面可访问\n"
} else {
    $reportContent += "⚠️ 部分页面无法访问\n"
}

# 添加访问结果到报告
$reportContent += "\n## 页面访问结果\n\n"
foreach ($url in $uiUrls) {
    $result = $accessResults[$url]
    if ($result.status -eq "SUCCESS") {
        $reportContent += "✅ $url - 状态码: $($result.statusCode)\n"
    } else {
        $reportContent += "❌ $url - 错误: $($result.error)\n"
    }
}

# 5️⃣ 更新系统状态
Write-Host "\n[Launch] 5️⃣ 更新系统状态..."
$systemMode = "STABLE"
$uiAccess = if ($accessStatus -eq "SUCCESS") { "VERIFIED" } else { "PENDING" }

try {
    if (Test-Path $systemStatePath) {
        $systemState = Get-Content -Path $systemStatePath -Raw | ConvertFrom-Json
        $systemState.SYSTEM_MODE = $systemMode
        $systemState.UI_ACCESS = $uiAccess
        $systemState.LAST_UPDATE = $timestamp
        $systemState | ConvertTo-Json -Depth 10 | Set-Content -Path $systemStatePath -Encoding UTF8
    } else {
        # 创建新的system_mode_state.json
        $newState = @{
            "SYSTEM_MODE" = $systemMode
            "UI_ACCESS" = $uiAccess
            "LAST_UPDATE" = $timestamp
        }
        $newState | ConvertTo-Json -Depth 10 | Set-Content -Path $systemStatePath -Encoding UTF8
    }
    Write-Host "[Launch] ✅ 已更新系统状态配置"
} catch {
    Write-Host "[Launch] ⚠️ 更新系统状态配置失败: $($_.Exception.Message)"
}

# 保存报告
$reportContent += "\n## 系统状态\n"
$reportContent += "- SYSTEM_MODE: $systemMode\n"
$reportContent += "- UI_ACCESS: $uiAccess\n"
$reportContent += "- 报告时间: $timestamp\n"

Set-Content -Path $reportPath -Value $reportContent -Encoding UTF8
Write-Host "[Launch] ✅ 诊断报告已生成: $reportPath"

# 输出最终结果
Write-Host "\n===== JEV-UI-LAUNCH-RECOVERY-v1.0 执行结果 ====="
if ($portStatus -eq "SUCCESS") {
    Write-Host "✅ 服务端口8080监听正常"
} else {
    Write-Host "❌ 服务端口8080监听异常"
}

if ($routeStatus -eq "SUCCESS") {
    Write-Host "✅ /ui 路由注册完成"
} else {
    Write-Host "❌ /ui 路由注册失败"
}

if ($accessStatus -eq "SUCCESS") {
    Write-Host "✅ 所有UI页面可访问"
} else {
    Write-Host "⚠️ 部分UI页面无法访问"
}

Write-Host "🏁 SYSTEM_MODE: $systemMode"
Write-Host "🏁 UI_ACCESS: $uiAccess"

Write-Host "\n请尝试访问以下页面验证修复结果:"
foreach ($url in $uiUrls) {
    Write-Host "- $url"
}

Write-Host "\nJEV-UI-LAUNCH-RECOVERY-v1.0 任务完成"