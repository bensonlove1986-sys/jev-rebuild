#!/usr/bin/env pwsh
# JEV管理脚本 v2.0
# 用于启动JEV客户端服务并修复常见问题

Write-Output "===== JEV Manager v2.0 启动 ====="

# 设置日志目录
$logDir = "d:\PDF转网页\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = "$logDir\jev_manager_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

function Write-Log {
    param(
        [string]$message,
        [string]$level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$level] $message"
    Write-Output $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

Write-Log "JEV Manager v2.0 开始运行"

# 1. 检查并修复编码问题
Write-Log "开始编码检查和修复"

function Fix-Encoding {
    param(
        [string]$filePath
    )
    
    try {
        if (-not (Test-Path $filePath)) {
            Write-Log "文件不存在: $filePath" "WARNING"
            return
        }
        
        # 读取文件内容
        $content = Get-Content -Path $filePath -Raw
        
        # 修复meta charset标签（HTML文件）
        if ($filePath -match '\.html$') {
            $content = $content -replace '<meta\s+charset=["\'']?[^"\'>\s]+["\'']?\s*>', '<meta charset="UTF-8">'
            if (-not ($content -match '<meta\s+charset=["\'']UTF-8["\'']')) {
                $content = $content -replace '(<head[^>]*>)', '$1\n    <meta charset="UTF-8">'
            }
        }
        
        # 移除BOM和控制字符
        $content = $content -replace '\p{Cc}', '' -replace '\p{Cf}', ''
        
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Log "已修复文件编码: $filePath"
    }
    catch {
        Write-Log "修复文件编码失败: $filePath - $_" "ERROR"
    }
}

# 修复关键文件编码
$keyFiles = @(
    "d:\PDF转网页\main.js",
    "d:\PDF转网页\ui\client_portal.html",
    "d:\PDF转网页\ui\sentinel_dashboard.html",
    "d:\PDF转网页\ui\cognition_panel.html",
    "d:\PDF转网页\config\settings.json"
)

foreach ($file in $keyFiles) {
    Fix-Encoding $file
}

# 2. 检查并启动8080端口服务
Write-Log "检查8080端口状态"
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

if ($port8080) {
    Write-Log "8080端口已被占用，尝试终止现有进程" "WARNING"
    $process = Get-Process -Id $port8080.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Log "终止进程: $($process.ProcessName) (PID: $($process.Id))"
        Stop-Process -Id $process.Id -Force
    }
}

# 3. 启动JEV服务
Write-Log "启动JEV客户端服务"
try {
    # 检查server.js是否存在
    if (Test-Path "d:\PDF转网页\server.js") {
        Write-Log "使用node.js启动服务"
        $serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "d:\PDF转网页" -PassThru
        Write-Log "服务已启动，PID: $($serverProcess.Id)"
    } else {
        # 如果没有server.js，尝试启动Python服务
        Write-Log "使用Python启动简易HTTP服务"
        $pythonProcess = Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "8080" -WorkingDirectory "d:\PDF转网页" -PassThru
        Write-Log "Python HTTP服务已启动，PID: $($pythonProcess.Id)"
    }
    
    # 等待服务启动
    Start-Sleep -Seconds 3
    
    # 验证服务是否启动成功
    $portCheck = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Log "服务启动成功，8080端口已监听" "SUCCESS"
    } else {
        Write-Log "服务启动失败，8080端口未监听" "ERROR"
    }
} catch {
    Write-Log "启动服务时出错: $_" "ERROR"
}

# 4. 更新系统状态
Write-Log "更新系统状态"
try {
    $status = @{
        worker = "starting"
        kv = "checking"
        bridge = "initializing"
        sentinel = "active"
        durable_objects = "syncing"
        autonomy_score = 0.75
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    }
    $status | ConvertTo-Json -Depth 3 | Out-File "$logDir\system_status.json" -Force
    Write-Log "系统状态已更新"
} catch {
    Write-Log "更新系统状态失败: $_" "ERROR"
}

Write-Log "JEV Manager v2.0 运行完成"
Write-Output "===== JEV Manager 运行完成，请访问 http://localhost:8080 ====="
