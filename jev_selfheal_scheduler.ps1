# JEV 系统自愈定时任务脚本
# 功能：设置每6小时自动执行自愈任务

Write-Host "=== JEV 自愈定时任务设置工具 ===" -ForegroundColor Green
Write-Host "当前时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# 自愈脚本路径
$selfHealScriptPath = "d:\PDF转网页\jev_selfheal_ps.ps1"

# 检查自愈脚本是否存在
if (-not (Test-Path $selfHealScriptPath)) {
    Write-Host "错误: 未找到自愈脚本: $selfHealScriptPath" -ForegroundColor Red
    exit 1
}

# 任务名称
$taskName = "JEV_SelfHeal_ScheduledTask"

# 设置任务描述
$taskDescription = "JEV系统自动自愈任务 - 每6小时执行一次"

# 创建任务操作
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File \"$selfHealScriptPath\""

# 创建触发器（每6小时执行一次，立即启动）
$trigger = @(
    $(New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 6)),
    $(New-ScheduledTaskTrigger -Daily -At (Get-Date -Hour 0 -Minute 0))
)

# 设置任务主体（使用当前用户，不需要登录也执行）
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest

# 设置任务设置
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# 检查任务是否已存在
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "更新现有定时任务: $taskName" -ForegroundColor Yellow
    # 删除现有任务
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 创建新任务
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $taskDescription -ErrorAction Stop
    Write-Host "✅ 定时任务创建成功!" -ForegroundColor Green
    Write-Host "任务名称: $taskName" -ForegroundColor Cyan
    Write-Host "执行间隔: 每6小时" -ForegroundColor Cyan
    Write-Host "执行脚本: $selfHealScriptPath" -ForegroundColor Cyan
    Write-Host "任务描述: $taskDescription" -ForegroundColor Cyan
    
    # 立即运行一次任务
    Write-Host "\n立即执行第一次自愈任务..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    Write-Host "✅ 自愈任务已启动" -ForegroundColor Green
    
    # 显示任务状态
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    Write-Host "\n任务信息:" -ForegroundColor Yellow
    Write-Host "下次运行时间: $($taskInfo.NextRunTime)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ 创建定时任务失败: $_" -ForegroundColor Red
    Write-Host "请以管理员权限运行此脚本!" -ForegroundColor Red
    exit 1
}

Write-Host "\n=== 操作完成 ===" -ForegroundColor Green
Write-Host "要查看或修改任务，请使用 '任务计划程序' 或运行命令 'Get-ScheduledTask -TaskName $taskName | Format-List'" -ForegroundColor Yellow
