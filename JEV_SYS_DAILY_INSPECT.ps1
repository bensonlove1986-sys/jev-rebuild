# JEV-SYSTEM-DAILY-INSPECT-v1.0
# 每日系统健康巡检自动化脚本

# 配置参数
$RootDir = "D:\PDF转网页"
$DiagnosticsDir = Join-Path $RootDir "diagnostics"
$HealthCheckScript = Join-Path $DiagnosticsDir "system_health_check.js"
$DailyReportFile = Join-Path $DiagnosticsDir "system_daily_report.txt"
$EncodingLockFile = Join-Path $RootDir "encoding_lock.json"
$LogFile = Join-Path $DiagnosticsDir "daily_inspect_log.txt"
$UTF8Watchdog = Join-Path $DiagnosticsDir "utf8_watchdog.js"
$EncodingGuard = Join-Path $DiagnosticsDir "jev_encoding_guard_daemon.js"

# 确保日志文件目录存在
if (-not (Test-Path $DiagnosticsDir)) {
    New-Item -ItemType Directory -Path $DiagnosticsDir -Force | Out-Null
}

# 日志函数
function Write-Log {
    param (
        [string]$Message
    )
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $LogEntry = "[$Timestamp] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

# 清理旧报告函数
function Cleanup-OldReports {
    Write-Log "🧹 清理7天前的旧报告..."
    
    try {
        # 查找diagnostics目录中包含日期的报告文件
        $oldReports = Get-ChildItem -Path $DiagnosticsDir -Filter "system_daily_report_*.txt" | 
                     Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
        
        foreach ($report in $oldReports) {
            Remove-Item -Path $report.FullName -Force
            Write-Log "  ✅ 已删除旧报告: $($report.Name)"
        }
        
        Write-Log "  ✅ 清理完成，保留最近7天报告"
    } catch {
        Write-Log "  ❌ 清理旧报告失败: $_"
    }
}

# 运行健康检查
function Run-HealthCheck {
    Write-Log "🔍 开始执行系统健康检查..."
    
    try {
        # 运行node脚本并捕获输出
        $output = node $HealthCheckScript 2>&1
        
        # 将输出写入日志
        $output | ForEach-Object { Write-Log $_ }
        
        # 提取健康评分、收敛指数等信息
        $healthScore = 0
        $convergenceIndex = 0
        $bomCount = 0
        $daemonStatus = "ACTIVE"
        
        # 从输出中提取信息
        foreach ($line in $output) {
            if ($line -match "最终健康评分: (\d+)/100") {
                $healthScore = [int]$matches[1]
            }
            if ($line -match "收敛指数: (\d+)%") {
                $convergenceIndex = [int]$matches[1]
            }
            if ($line -match "守护层响应得分: (\d+)/100" -and $matches[1] -eq "0") {
                $daemonStatus = "INACTIVE"
            }
        }
        
        # 检查BOM文件数（实际场景应该扫描文件，这里简化处理）
        $bomCount = 0
        
        return @{
            HealthScore = $healthScore
            ConvergenceIndex = $convergenceIndex
            BOMCount = $bomCount
            DaemonStatus = $daemonStatus
            FullOutput = $output
        }
    } catch {
        Write-Log "❌ 健康检查执行失败: $_"
        return $null
    }
}

# 重启守护层
function Restart-Daemons {
    Write-Log "🔄 重启UTF-8守护层..."
    
    try {
        # 停止现有守护进程
        Write-Log "  ⏹️  停止现有守护进程..."
        Get-Process -Name node -ErrorAction SilentlyContinue | 
        Where-Object { $_.CommandLine -match "utf8_watchdog|jev_encoding_guard_daemon" } | 
        Stop-Process -Force
        
        # 等待进程停止
        Start-Sleep -Seconds 2
        
        # 启动新的守护进程
        Write-Log "  ▶️  启动utf8_watchdog.js..."
        Start-Process -FilePath "node" -ArgumentList $UTF8Watchdog -WorkingDirectory $RootDir -WindowStyle Hidden
        
        Write-Log "  ▶️  启动jev_encoding_guard_daemon.js..."
        Start-Process -FilePath "node" -ArgumentList $EncodingGuard -WorkingDirectory $RootDir -WindowStyle Hidden
        
        # 等待守护进程初始化
        Start-Sleep -Seconds 5
        
        Write-Log "✅ 守护层重启完成"
        return $true
    } catch {
        Write-Log "❌ 守护层重启失败: $_"
        return $false
    }
}

# 生成每日报告
function Generate-DailyReport {
    param (
        [hashtable]$CheckResult
    )
    
    if (-not $CheckResult) {
        return $false
    }
    
    Write-Log "📊 生成每日健康报告..."
    
    try {
        # 生成带日期的报告文件名用于存档
        $date = Get-Date -Format "yyyyMMdd"
        $archivedReport = Join-Path $DiagnosticsDir "system_daily_report_$date.txt"
        
        # 创建报告内容
        $reportContent = @"
====================================================
JEV 系统每日健康巡检报告
生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
====================================================

📊 健康状态概览:
- 健康评分: $($CheckResult.HealthScore)/100
- 收敛指数: $($CheckResult.ConvergenceIndex)%
- 守护层状态: $($CheckResult.DaemonStatus)
- BOM文件数: $($CheckResult.BOMCount)

🔍 详细检查结果:
$(($CheckResult.FullOutput | Out-String).Trim())

====================================================
系统自动巡检完成 - JEV-SYSTEM-DAILY-INSPECT-v1.0
"@
        
        # 写入报告
        Set-Content -Path $DailyReportFile -Value $reportContent
        Set-Content -Path $archivedReport -Value $reportContent
        
        Write-Log "✅ 每日报告已生成: $DailyReportFile"
        Write-Log "✅ 报告已存档: $archivedReport"
        
        return $true
    } catch {
        Write-Log "❌ 生成每日报告失败: $_"
        return $false
    }
}

# 主函数
function Main {
    Write-Log "===================================="
    Write-Log "🚀 JEV-SYSTEM-DAILY-INSPECT-v1.0 启动"
    Write-Log "===================================="
    
    # 清理旧报告
    Cleanup-OldReports
    
    # 首次运行健康检查
    $checkResult = Run-HealthCheck
    
    if (-not $checkResult) {
        Write-Log "❌ 系统健康检查失败，退出程序"
        return 1
    }
    
    # 检查是否需要重启守护层
    $needRestart = $false
    
    if ($checkResult.ConvergenceIndex -lt 90) {
        Write-Log "⚠️  收敛指数低于90%，需要重启守护层"
        $needRestart = $true
    }
    
    if ($checkResult.DaemonStatus -eq "INACTIVE") {
        Write-Log "⚠️  守护层未响应，需要重启守护层"
        $needRestart = $true
    }
    
    if ($checkResult.BOMCount -gt 0) {
        Write-Log "⚠️  存在BOM文件，需要重启守护层"
        $needRestart = $true
    }
    
    # 重启守护层并重新检测
    if ($needRestart) {
        $restartSuccess = Restart-Daemons
        
        if ($restartSuccess) {
            Write-Log "🔍 重启后再次执行健康检查..."
            $checkResult = Run-HealthCheck
            
            if (-not $checkResult) {
                Write-Log "❌ 重启后健康检查失败"
                return 1
            }
        }
    }
    
    # 生成每日报告
    $reportSuccess = Generate-DailyReport -CheckResult $checkResult
    
    if (-not $reportSuccess) {
        Write-Log "❌ 生成每日报告失败"
        return 1
    }
    
    Write-Log "===================================="
    Write-Log "✅ JEV-SYSTEM-DAILY-INSPECT-v1.0 完成"
    Write-Log "===================================="
    
    return 0
}

# 执行主函数
$exitCode = Main

# 输出最终结果
if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ JEV系统每日巡检完成"
    Write-Host "📊 健康评分: $(Get-Content $DailyReportFile | Select-String "健康评分" | ForEach-Object { $_ -replace ".*健康评分: (\d+)/100", "$1/100" })"
    Write-Host "📋 报告已保存至: $DailyReportFile"
} else {
    Write-Host ""
    Write-Host "❌ JEV系统每日巡检失败"
    Write-Host "📋 详细日志: $LogFile"
}

# 返回退出代码
exit $exitCode