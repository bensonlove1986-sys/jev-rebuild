# ==========================================
# JEV Multi-Layer Scan Scheduler v3.5
# ==========================================
$BasePath = "D:\PDF转网页"

# 创建计划任务函数
function Register-JEVTask($Name, $Script, $Minutes, $Description) {
    $Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "$BasePath\$Script"
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration ([TimeSpan]::MaxValue)
    
    try {
        Register-ScheduledTask -TaskName $Name -Action $Action -Trigger $Trigger -Description $Description -Force
        Write-Host "[JEV] $Name 每$Minutes分钟启动 ✅"
        return $true
    } catch {
        Write-Host "[JEV] 错误: 无法注册任务 $Name - $_"
        return $false
    }
}

# 检查Node.js是否安装
function Test-NodeInstalled {
    try {
        Get-Command node -ErrorAction Stop | Out-Null
        return $true
    } catch {
        Write-Host "[JEV] 错误: 未找到Node.js，请先安装Node.js"
        return $false
    }
}

# 安装必要的npm包
function Install-NpmPackages {
    Write-Host "[JEV] 安装必要的npm包..."
    try {
        # 创建package.json如果不存在
        if (-not (Test-Path "$BasePath\package.json")) {
            Set-Location -Path $BasePath
            npm init -y | Out-Null
        }
        
        # 安装依赖
        npm install chokidar iconv-lite --save | Out-Null
        Write-Host "[JEV] npm包安装完成 ✅"
        return $true
    } catch {
        Write-Host "[JEV] 警告: npm包安装失败，脚本可能无法正常运行 - $_"
        return $false
    }
}

# 验证脚本文件是否存在
function Test-ScriptFiles {
    $scripts = @(
        "utf8_watchdog.js",
        "global_encoding_repair.js",
        "diagnostics\JEV-SYSTEM-HEALTH-DIAGNOSTIC.js",
        "dashboard_encoding_repair.js"
    )
    
    $allExists = $true
    foreach ($script in $scripts) {
        if (-not (Test-Path "$BasePath\$script")) {
            Write-Host "[JEV] 错误: 找不到脚本文件 $script"
            $allExists = $false
        }
    }
    return $allExists
}

# 显示执行说明
function Show-ExecutionInstructions {
    Write-Host ""
    Write-Host "🔑 执行说明:"
    Write-Host "1. 确保已以管理员身份运行PowerShell"
    Write-Host "2. 已自动设置执行策略: Bypass"
    Write-Host "3. 正在注册计划任务..."
    Write-Host ""
}

# 主函数
function Start-JEVSchedulerSetup {
    Write-Host "==========================================="
    Write-Host "JEV Multi-Layer Scan Scheduler v3.5"
    Write-Host "==========================================="
    
    # 显示执行说明
    Show-ExecutionInstructions
    
    # 检查Node.js
    if (-not (Test-NodeInstalled)) {
        return
    }
    
    # 检查脚本文件
    if (-not (Test-ScriptFiles)) {
        Write-Host "[JEV] 错误: 必要的脚本文件缺失，设置失败"
        return
    }
    
    # 安装依赖包
    Install-NpmPackages
    
    Write-Host "[JEV] 注册扫描计划任务中..."
    Write-Host ""
    
    # Layer 1: Watchdog 每5分钟执行
    $task1Success = Register-JEVTask "JEV_UTF8_Watchdog" "utf8_watchdog.js" 5 "实时编码监测"
    
    # Layer 2: Global Repair 每60分钟执行
    $task2Success = Register-JEVTask "JEV_Global_Repair" "global_encoding_repair.js" 60 "全量编码修复"
    
    # Layer 3: Health Diagnostic 每日23:00执行
    try {
        $DailyTrigger = New-ScheduledTaskTrigger -Daily -At "23:00"
        $DailyAction = New-ScheduledTaskAction -Execute "node.exe" -Argument "$BasePath\diagnostics\JEV-SYSTEM-HEALTH-DIAGNOSTIC.js"
        Register-ScheduledTask -TaskName "JEV_Health_Evaluation" -Action $DailyAction -Trigger $DailyTrigger -Description "每日健康评估" -Force
        Write-Host "[JEV] JEV_Health_Evaluation 每日23:00启动 ✅"
        $task3Success = $true
    } catch {
        Write-Host "[JEV] 错误: 无法注册每日健康评估任务 - $_"
        $task3Success = $false
    }
    
    # 检查是否所有任务都注册成功
    if ($task1Success -and $task2Success -and $task3Success) {
        Write-Host ""
        Write-Host "==========================================="
        Write-Host "[JEV] 所有扫描任务注册完成 ✅"
        Write-Host "==========================================="
        Write-Host ""
        Write-Host "📊 任务状态:"
        Write-Host "- JEV_UTF8_Watchdog: 每5分钟执行 (实时监测)"
        Write-Host "- JEV_Global_Repair: 每60分钟执行 (全量扫描)"
        Write-Host "- JEV_Health_Evaluation: 每日23:00执行 (健康评估)"
        Write-Host ""
        Write-Host "🔍 日志位置: D:\PDF转网页\diagnostics\"
        Write-Host "- watchdog_repair_log.txt: 实时修复日志"
        Write-Host "- global_encoding_fix_report.json: 每小时扫描报告"
        Write-Host "- JEV_SYSTEM_HEALTH_REPORT.json: 健康评估报告"
        Write-Host "- utf8_health_chart.json: 仪表板数据"
        Write-Host ""
        Write-Host "✅ JEV-MULTI-LAYER-SCAN-SCHEDULER v3.5 已成功配置"
    } else {
        Write-Host ""
        Write-Host "❌ 部分任务注册失败，请检查错误信息"
        Write-Host "建议: 以管理员身份重新运行脚本"
    }
}

# 执行主函数
Start-JEVSchedulerSetup