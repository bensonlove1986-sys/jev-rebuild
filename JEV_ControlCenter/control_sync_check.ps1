# ============================================================
# [JEV CONTROL CENTER SYNC CHECK]
# 检查控制面板配置与同步状态
# ============================================================

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "`n🔍 [JEV CONTROL CENTER SYNC CHECK] Starting at $timestamp`n"

$controlCenterPath = "D:\PDF转网页\JEV_ControlCenter"
$reportPath = "D:\PDF转网页\JEV_Client\diagnostics"

$report = @{
    task = "CONTROL-SYNC-CHECK"
    timestamp = $timestamp
    config = @{
        exists = $false
        readable = $false
        valid = $false
    }
    connectivity = @{
        controlCenter = $false
        apiEndpoint = ""
        statusCode = 0
    }
    permissions = @{
        read = $false
        write = $false
    }
    syncStatus = "pending"
    overallStatus = "pending"
}

# 检查配置文件
function Check-Configuration {
    $configFiles = @(
        "$controlCenterPath\config.json",
        "$controlCenterPath\settings.json",
        "$controlCenterPath\control_config.json"
    )
    
    Write-Host "📋 Checking configuration files..."
    
    foreach ($configFile in $configFiles) {
        if (Test-Path $configFile) {
            $report.config.exists = $true
            Write-Host "✅ Found config file: $configFile"
            
            try {
                $content = Get-Content $configFile -Raw -ErrorAction Stop
                $report.config.readable = $true
                
                # 尝试解析JSON
                try {
                    $json = $content | ConvertFrom-Json -ErrorAction Stop
                    $report.config.valid = $true
                    Write-Host "✅ Valid JSON: $configFile"
                    break
                } catch {
                    Write-Host "⚠️ Invalid JSON in $configFile"
                }
            } catch {
                Write-Host "❌ Cannot read $configFile"
            }
        }
    }
}

# 检查权限
function Check-Permissions {
    Write-Host "`n🔒 Checking directory permissions..."
    
    try {
        # 测试读取权限
        Get-ChildItem $controlCenterPath -ErrorAction Stop | Out-Null
        $report.permissions.read = $true
        Write-Host "✅ Read permission: Granted"
        
        # 测试写入权限（创建临时文件）
        $testFile = "$controlCenterPath\test_permission.txt"
        "test" | Out-File $testFile -Encoding UTF8 -ErrorAction Stop
        Remove-Item $testFile -Force
        $report.permissions.write = $true
        Write-Host "✅ Write permission: Granted"
    } catch {
        Write-Host "❌ Permission error: $($_.Exception.Message)"
    }
}

# 测试控制中心连接
function Test-ControlCenterConnection {
    Write-Host "`n🌐 Testing Control Center connectivity..."
    
    $endpoints = @(
        "http://localhost:8085/control/status",
        "http://localhost:8080/control/status",
        "http://localhost:9000/control/status"
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            Write-Host "  Trying: $endpoint"
            $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 10 -ErrorAction Stop
            $report.connectivity.controlCenter = $true
            $report.connectivity.apiEndpoint = $endpoint
            $report.connectivity.statusCode = $response.StatusCode
            Write-Host "✅ Connected to: $endpoint"
            break
        } catch {
            Write-Host "  ❌ Failed: $endpoint"
        }
    }
}

# 检查同步状态
function Check-SyncStatus {
    Write-Host "`n🔄 Checking synchronization status..."
    
    # 检查是否有正在运行的控制中心进程
    $processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*JEV_ControlCenter*" }
    if ($processes.Count -gt 0) {
        Write-Host "✅ Control Center processes running: $($processes.Count)"
        $report.syncStatus = "syncing"
    } else {
        Write-Host "⚠️ No Control Center processes detected"
    }
    
    # 检查关键目录
    $criticalDirs = @(
        "$controlCenterPath\sync",
        "$controlCenterPath\data",
        "$controlCenterPath\backup"
    )
    
    foreach ($dir in $criticalDirs) {
        if (Test-Path $dir -PathType Container) {
            $fileCount = (Get-ChildItem $dir -ErrorAction SilentlyContinue).Count
            Write-Host "📁 $dir: $fileCount files found"
        }
    }
}

# 执行检查
Check-Configuration
Check-Permissions
Test-ControlCenterConnection
Check-SyncStatus

# 更新整体状态
$report.overallStatus = if ($report.config.valid -and $report.permissions.read -and $report.connectivity.controlCenter) { "synchronized" } else { "needs_attention" }

# 确保报告目录存在
if (-not (Test-Path $reportPath)) {
    New-Item -ItemType Directory -Path $reportPath -Force | Out-Null
}

# 生成报告
$fullReportPath = "$reportPath\control_center_sync_report.json"
$report | ConvertTo-Json -Depth 4 | Out-File $fullReportPath -Encoding UTF8

# 写入主日志
$logEntry = "`n[$timestamp] Control Center Check: $($report.overallStatus) | Config: $($report.config.valid) | Connected: $($report.connectivity.controlCenter) | Permissions: Read=$($report.permissions.read) Write=$($report.permissions.write)"
Add-Content -Path "$reportPath\encoding_guard_log.txt" -Value $logEntry

# 显示摘要
Write-Host "`n========================================"
Write-Host "✅ CONTROL CENTER CHECK COMPLETED"
Write-Host "========================================"
Write-Host "🌐 Overall Status: $($report.overallStatus.ToUpper())"
Write-Host "📋 Configuration: $($report.config.valid)"
Write-Host "🔒 Permissions:"
Write-Host "  - Read: $($report.permissions.read)"
Write-Host "  - Write: $($report.permissions.write)"
Write-Host "🔌 Connectivity: $($report.connectivity.controlCenter)"
Write-Host "  - Endpoint: $($report.connectivity.apiEndpoint)"
Write-Host "🔄 Sync Status: $($report.syncStatus)"
Write-Host "📋 Report: $fullReportPath"
Write-Host "========================================"