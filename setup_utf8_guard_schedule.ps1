# ============================================================
# [JEV UTF-8 AUTO GUARD SCHEDULE SETUP]
# 设置每日自动执行的计划任务
# ============================================================

$basePath = "D:\PDF转网页"
$scriptPath = "$basePath\utf8_auto_guard.ps1"

Write-Host "🔧 Setting up JEV UTF-8 Guard scheduled task..."

# 检查脚本是否存在
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Error: utf8_auto_guard.ps1 not found at $scriptPath"
    exit 1
}

# 创建计划任务
try {
    # 定义任务操作
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File $scriptPath"
    
    # 定义触发器（每日凌晨1点）
    $trigger = New-ScheduledTaskTrigger -Daily -At 1am
    
    # 定义任务设置
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # 注册任务
    Register-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -TaskName "JEV_UTF8_GUARD" -Description "Daily UTF-8 encoding guard for JEV System" -Force
    
    Write-Host "✅ Scheduled task 'JEV_UTF8_GUARD' created successfully!"
    Write-Host "📅 Will run daily at 1:00 AM"
    Write-Host "📁 Script path: $scriptPath"
    Write-Host "🔍 You can view and manage this task in Task Scheduler"
    
    # 提供立即运行的选项
    Write-Host "`n🔄 Do you want to run the UTF-8 Guard script now? (Y/N)"
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "`n🚀 Running UTF-8 Guard script now..."
        Start-Process -FilePath "PowerShell.exe" -ArgumentList "-ExecutionPolicy Bypass -File $scriptPath" -Wait
    }
    
} catch {
    Write-Host "❌ Error creating scheduled task: $($_.Exception.Message)"
    Write-Host "💡 Please make sure you are running PowerShell as Administrator"
}