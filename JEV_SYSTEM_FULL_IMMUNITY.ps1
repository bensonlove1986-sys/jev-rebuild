#!/usr/bin/env pwsh
# JEV-SYSTEM-FULL-IMMUNITY-v1.0
# 整合系统自检、自修、自启与功能自动化部署能力，形成JEV系统免疫闭环

# 确保diagnostics目录存在
$diagnosticsDir = "D:\PDF转网页\diagnostics"
if (-not (Test-Path -Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
}

# 创建报告文件
$fullImmunityReport = "$diagnosticsDir\system_full_immunity_report.txt"

# 记录开始时间
$startTime = Get-Date

# 初始化报告内容
$reportContent = @"
===================================================
JEV系统免疫闭环执行报告
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
===================================================

"@

Write-Host "[INFO] 开始执行JEV系统免疫闭环..."

# 1️⃣ 执行 JEV_STABLE_MODE_AUTO_VERIFY.ps1
Write-Host "[STEP 1] 执行系统稳定模式验证..."
try {
    $stableVerifyScript = "D:\PDF转网页\JEV_STABLE_MODE_AUTO_VERIFY.ps1"
    if (Test-Path -Path $stableVerifyScript) {
        # 执行稳定模式验证脚本
        $stableVerifyResult = & powershell -ExecutionPolicy Bypass -File $stableVerifyScript 2>&1
        
        # 分析结果
        $portStatus = "未知"
        $fileStatus = "未知"
        $systemMode = "未知"
        $healthScore = 0
        
        if ($stableVerifyResult -match "端口监听状态") {
            $portStatus = ($stableVerifyResult | Where-Object { $_ -match "端口监听状态" }) -replace "^.*端口监听状态[:：]\s*" , ""
        }
        if ($stableVerifyResult -match "UI文件验证状态") {
            $fileStatus = ($stableVerifyResult | Where-Object { $_ -match "UI文件验证状态" }) -replace "^.*UI文件验证状态[:：]\s*" , ""
        }
        if ($stableVerifyResult -match "SYSTEM_MODE") {
            $systemMode = ($stableVerifyResult | Where-Object { $_ -match "SYSTEM_MODE" }) -replace "^.*SYSTEM_MODE[:：]\s*" , ""
        }
        if ($stableVerifyResult -match "系统健康评分") {
            $healthScore = [int](($stableVerifyResult | Where-Object { $_ -match "系统健康评分" }) -replace "^.*系统健康评分[:：]\s*" , "" -replace "[^0-9]" , "")
        }
        
        # 添加到报告
        $reportContent += @"
[1] 系统稳定模式验证结果
- 端口监听状态: $portStatus
- UI文件验证状态: $fileStatus
- 系统模式: $systemMode
- 健康评分: $healthScore/100

"@
        
        Write-Host "[INFO] 稳定模式验证完成，系统模式: $systemMode"
    } else {
        $errorMsg = "错误: JEV_STABLE_MODE_AUTO_VERIFY.ps1 文件不存在"
        Write-Host $errorMsg -ForegroundColor Red
        $reportContent += "$errorMsg\n\n"
    }
} catch {
    $errorMsg = "错误: 执行稳定模式验证时发生异常: $_"
    Write-Host $errorMsg -ForegroundColor Red
    $reportContent += "$errorMsg\n\n"
}

# 2️⃣ 执行 JEV-STABILITY-NEXTSTEP-v1.0
Write-Host "[STEP 2] 执行系统稳定性维护..."
try {
    $stabilityScript = "$diagnosticsDir\JEV_STABILITY_NEXTSTEP.ps1"
    if (Test-Path -Path $stabilityScript) {
        # 执行稳定性维护脚本
        $stabilityResult = & powershell -ExecutionPolicy Bypass -File $stabilityScript 2>&1
        
        # 分析守护层状态
        $daemonStatus = "未知"
        $logCleanupStatus = "未知"
        $pluginValidationStatus = "未知"
        
        if ($stabilityResult -match "守护层状态") {
            $daemonStatus = ($stabilityResult | Where-Object { $_ -match "守护层状态" }) -replace "^.*守护层状态[:：]\s*" , ""
        }
        if ($stabilityResult -match "日志清理") {
            $logCleanupStatus = ($stabilityResult | Where-Object { $_ -match "日志清理" }) -replace "^.*日志清理[:：]\s*" , ""
        }
        if ($stabilityResult -match "插件验证") {
            $pluginValidationStatus = ($stabilityResult | Where-Object { $_ -match "插件验证" }) -replace "^.*插件验证[:：]\s*" , ""
        }
        
        # 检查稳定性报告是否生成
        $nextstepReport = "$diagnosticsDir\stability_nextstep_report.txt"
        $nextstepReportExists = Test-Path -Path $nextstepReport
        
        # 添加到报告
        $reportContent += @"
[2] 系统稳定性维护结果
- 守护层状态: $daemonStatus
- 日志清理状态: $logCleanupStatus
- 插件验证状态: $pluginValidationStatus
- 稳定性报告生成: $(if ($nextstepReportExists) {"✅ 已生成"} else {"❌ 未生成"})

"@
        
        Write-Host "[INFO] 系统稳定性维护完成"
    } else {
        $errorMsg = "错误: JEV_STABILITY_NEXTSTEP.ps1 文件不存在"
        Write-Host $errorMsg -ForegroundColor Red
        $reportContent += "$errorMsg\n\n"
    }
} catch {
    $errorMsg = "错误: 执行系统稳定性维护时发生异常: $_"
    Write-Host $errorMsg -ForegroundColor Red
    $reportContent += "$errorMsg\n\n"
}

# 3️⃣ 执行 JEV_FUNCTION_AUTO_DEPLOY.ps1
Write-Host "[STEP 3] 执行功能自动化部署..."
try {
    $functionDeployScript = "D:\PDF转网页\JEV_FUNCTION_AUTO_DEPLOY.ps1"
    if (Test-Path -Path $functionDeployScript) {
        # 执行功能部署脚本
        $functionDeployResult = & powershell -ExecutionPolicy Bypass -File $functionDeployScript 2>&1
        
        # 分析功能模块加载状态
        $toggleManagerStatus = "未验证"
        $ocrEngineStatus = "未验证"
        $profitCalcStatus = "未验证"
        $piGeneratorStatus = "未验证"
        $pluginLayerStatus = "未知"
        $functionAutomationStatus = "未知"
        
        if ($functionDeployResult -match "toggleManager.js") {
            $toggleManagerStatus = ($functionDeployResult | Where-Object { $_ -match "toggleManager.js" }) -replace "^.*toggleManager.js\s*[:：]\s*" , ""
        }
        if ($functionDeployResult -match "ocr_engine.js") {
            $ocrEngineStatus = ($functionDeployResult | Where-Object { $_ -match "ocr_engine.js" }) -replace "^.*ocr_engine.js\s*[:：]\s*" , ""
        }
        if ($functionDeployResult -match "profit_calc.js") {
            $profitCalcStatus = ($functionDeployResult | Where-Object { $_ -match "profit_calc.js" }) -replace "^.*profit_calc.js\s*[:：]\s*" , ""
        }
        if ($functionDeployResult -match "pi_generator.js") {
            $piGeneratorStatus = ($functionDeployResult | Where-Object { $_ -match "pi_generator.js" }) -replace "^.*pi_generator.js\s*[:：]\s*" , ""
        }
        if ($functionDeployResult -match "PLUGIN_LAYER") {
            $pluginLayerStatus = ($functionDeployResult | Where-Object { $_ -match "PLUGIN_LAYER" }) -replace "^.*PLUGIN_LAYER[:：]\s*" , ""
        }
        if ($functionDeployResult -match "FUNCTION_AUTOMATION") {
            $functionAutomationStatus = ($functionDeployResult | Where-Object { $_ -match "FUNCTION_AUTOMATION" }) -replace "^.*FUNCTION_AUTOMATION[:：]\s*" , ""
        }
        
        # 检查插件激活报告
        $pluginActivationReport = "$diagnosticsDir\plugin_activation_report.txt"
        $pluginActivationReportExists = Test-Path -Path $pluginActivationReport
        
        # 添加到报告
        $reportContent += @"
[3] 功能自动化部署结果
- toggleManager.js: $toggleManagerStatus
- ocr_engine.js: $ocrEngineStatus
- profit_calc.js: $profitCalcStatus
- pi_generator.js: $piGeneratorStatus
- PLUGIN_LAYER状态: $pluginLayerStatus
- FUNCTION_AUTOMATION状态: $functionAutomationStatus
- 插件激活报告生成: $(if ($pluginActivationReportExists) {"✅ 已生成"} else {"❌ 未生成"})

"@
        
        Write-Host "[INFO] 功能自动化部署完成"
    } else {
        $errorMsg = "错误: JEV_FUNCTION_AUTO_DEPLOY.ps1 文件不存在"
        Write-Host $errorMsg -ForegroundColor Red
        $reportContent += "$errorMsg\n\n"
    }
} catch {
    $errorMsg = "错误: 执行功能自动化部署时发生异常: $_"
    Write-Host $errorMsg -ForegroundColor Red
    $reportContent += "$errorMsg\n\n"
}

# 计算执行时间
$endTime = Get-Date
$executionTime = ($endTime - $startTime).TotalSeconds

# 计算系统自愈延迟（模拟值，实际应从日志中提取）
$selfHealDelay = "<从日志分析>"

# 检查日志存档记录
$logArchiveCount = 0
if (Test-Path -Path "$diagnosticsDir\JEV_LOG_AUTOCLEAN.ps1") {
    # 模拟日志清理计数，实际应从日志清理脚本结果中获取
    $logArchiveCount = "<从日志清理报告分析>"
}

# 最终汇总
$reportContent += @"
===================================================
[4] 系统免疫闭环综合评估
- 系统健康评分: $healthScore/100
- 守护层响应状态: $daemonStatus
- 功能层加载情况: $(if ($pluginLayerStatus -eq "ACTIVE") {"✅ 已激活"} else {"❌ 未激活"})
- 系统自愈延迟: $selfHealDelay 秒
- 日志存档记录: $logArchiveCount 个文件
- 自动化执行耗时: $executionTime 秒
===================================================

JEV系统免疫闭环执行完成
"@

# 保存报告
$reportContent | Out-File -FilePath $fullImmunityReport -Encoding utf8
Write-Host "[INFO] 系统免疫报告已生成: $fullImmunityReport"

# 更新system_mode_state.json
$systemStateFile = "D:\PDF转网页\system_mode_state.json"
try {
    if (Test-Path -Path $systemStateFile) {
        $systemState = Get-Content -Path $systemStateFile -Raw | ConvertFrom-Json
    } else {
        $systemState = [PSCustomObject]@{}
    }
    
    # 更新状态
    $systemState | Add-Member -MemberType NoteProperty -Name "IMMUNITY_CYCLE_COMPLETE" -Value $true -Force
    $systemState | Add-Member -MemberType NoteProperty -Name "LAST_IMMUNITY_RUN" -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Force
    $systemState | Add-Member -MemberType NoteProperty -Name "IMMUNITY_EXECUTION_TIME" -Value $executionTime -Force
    
    # 保存更新后的状态
    $systemState | ConvertTo-Json | Out-File -FilePath $systemStateFile -Encoding utf8
    Write-Host "[INFO] 系统状态文件已更新"
} catch {
    Write-Host "[ERROR] 更新系统状态文件时出错: $_" -ForegroundColor Red
}

Write-Host "[SUCCESS] JEV系统免疫闭环执行完成！"
Write-Host "系统健康评分: $healthScore/100"
Write-Host "详细报告: $fullImmunityReport"
