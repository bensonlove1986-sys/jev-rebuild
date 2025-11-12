# JEV 系统自愈PowerShell脚本
# 用于手动触发自愈任务

Write-Host "=== JEV 系统自愈任务 (PowerShell) ===" -ForegroundColor Green
Write-Host "开始时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# 检查Python是否安装
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到Python。请确保Python已安装并添加到环境变量中。" -ForegroundColor Red
    exit 1
}

# 检查自愈脚本是否存在
$selfHealScript = "d:\PDF转网页\jev_self_heal.py"
if (-not (Test-Path $selfHealScript)) {
    Write-Host "错误: 自愈脚本不存在: $selfHealScript" -ForegroundColor Red
    exit 1
}

# 创建logs目录
$logsDir = "d:\PDF转网页\logs"
if (-not (Test-Path $logsDir)) {
    Write-Host "创建logs目录..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# 执行Python自愈脚本
Write-Host "执行自愈脚本..." -ForegroundColor Yellow

try {
    python "$selfHealScript"
    
    # 检查报告文件
    $reportFile = "d:\PDF转网页\jev_autofix_report.json"
    if (Test-Path $reportFile) {
        Write-Host "\n自愈报告摘要:" -ForegroundColor Green
        $report = Get-Content $reportFile -Raw | ConvertFrom-Json
        
        Write-Host "触发修复: $($report.autofix_triggered)" -ForegroundColor Cyan
        Write-Host "修复模块: $($report.modules_repaired -join ', ')`n刷新KV: $($report.kv_refreshed -join ', ')`nWorker重部署: $($report.worker_redeployed)`n最终状态: $($report.final_check)" -ForegroundColor Cyan
        Write-Host "时间戳: $($report.timestamp)" -ForegroundColor Cyan
        
        if ($report.final_check -like "*正常*") {
            Write-Host "\n✅ 自愈任务完成，系统已恢复正常" -ForegroundColor Green
        } else {
            Write-Host "\n⚠️  自愈任务完成，但系统仍存在问题" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "错误: 执行自愈脚本失败 - $_" -ForegroundColor Red
    exit 1
}

Write-Host "\n自愈任务执行结束" -ForegroundColor Green
Write-Host "结束时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
