# JEV-ONE-CLICK-FULL-REPAIR-v1.0
# 一次性执行JEV系统前端全链路修复流程

Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host "                    JEV ONE-CLICK FULL REPAIR v1.0                   " -ForegroundColor Magenta
Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host "全链路修复流程：HTML修复 → 缓存清理 → 自检验证 → 汇总报告" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Magenta

# 配置变量
$baseDir = "D:\PDF转网页"
$logDir = "$baseDir\logs"
$htmlRepairScript = "$baseDir\JEV_MULTI_FILE_HTML_RECOVERY_v4.0.ps1"
$cacheFlushScript = "$baseDir\JEV_BROWSER_CACHE_FLUSH_AND_RELOAD_v2.0.ps1"
$selfCheckScript = "$baseDir\JEV_SENTINEL_DASHBOARD_SELF_CHECK_v1.0.ps1"
$summaryLog = "$logDir\JEV_full_repair_summary.txt"

# 确保日志目录存在
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "创建日志目录: $logDir" -ForegroundColor Green
}

# 清空之前的汇总日志
if (Test-Path $summaryLog) {
    Remove-Item $summaryLog -Force
}

# 写入日志函数
function Write-Summary {
    param (
        [string]$message,
        [string]$level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$level] $message"
    Add-Content -Path $summaryLog -Value $logEntry
    Write-Host $logEntry
}

# 记录开始时间
$startTime = Get-Date
Write-Summary "全链路修复开始时间: $startTime"

# 阶段1: HTML批量修复
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                       阶段1: HTML批量修复                         " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

if (Test-Path $htmlRepairScript) {
    Write-Summary "开始执行HTML批量修复脚本..."
    try {
        # 执行HTML修复脚本
        & powershell -ExecutionPolicy Bypass -File $htmlRepairScript
        
        # 检查修复报告
        $htmlRepairReport = "$logDir\multi_html_recovery_report.txt"
        if (Test-Path $htmlRepairReport) {
            $htmlReportContent = Get-Content -Path $htmlRepairReport -Raw
            
            # 分析修复结果
            if ($htmlReportContent -match "全 ✅") {
                Write-Summary "HTML批量修复阶段：✅ 成功 - 所有文件已UTF-8化" "SUCCESS"
                $htmlRepairSuccess = $true
            } else {
                Write-Summary "HTML批量修复阶段：❌ 失败 - 请检查详细报告" "ERROR"
                $htmlRepairSuccess = $false
            }
            
            # 统计修复的文件数
            $fixedFilesMatch = [regex]::Match($htmlReportContent, "修复文件总数: (\d+)个")
            if ($fixedFilesMatch.Success) {
                $fixedFilesCount = $fixedFilesMatch.Groups[1].Value
                Write-Summary "修复文件总数: $fixedFilesCount 个"
            }
            
            # 添加报告内容到汇总
            Add-Content -Path $summaryLog -Value "`n----- HTML批量修复报告摘要 ------"
            Add-Content -Path $summaryLog -Value $htmlReportContent
        } else {
            Write-Summary "HTML批量修复阶段：❌ 失败 - 未找到修复报告" "ERROR"
            $htmlRepairSuccess = $false
        }
    } catch {
        Write-Summary "HTML批量修复阶段：❌ 执行失败 - $_" "ERROR"
        $htmlRepairSuccess = $false
    }
} else {
    Write-Summary "HTML批量修复脚本不存在: $htmlRepairScript" "ERROR"
    $htmlRepairSuccess = $false
}

# 如果HTML修复失败，停止后续步骤
if (-not $htmlRepairSuccess) {
    Write-Host "`n❌ HTML批量修复失败，停止全链路修复流程！" -ForegroundColor Red
    Write-Summary "由于HTML批量修复失败，全链路修复流程已停止" "ERROR"
    exit 1
}

# 阶段2: 浏览器缓存清理
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                      阶段2: 浏览器缓存清理                         " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

if (Test-Path $cacheFlushScript) {
    Write-Summary "开始执行浏览器缓存清理脚本..."
    try {
        # 执行缓存清理脚本
        & powershell -ExecutionPolicy Bypass -File $cacheFlushScript
        
        # 检查清理报告
        $cacheFlushReport = "$logDir\cache_flush_report.txt"
        if (Test-Path $cacheFlushReport) {
            $cacheReportContent = Get-Content -Path $cacheFlushReport -Raw
            
            # 分析清理结果
            if ($cacheReportContent -match "循环清理完成") {
                Write-Summary "浏览器缓存清理阶段：✅ 成功 - 缓存已清理完成" "SUCCESS"
                $cacheFlushSuccess = $true
            } else {
                Write-Summary "浏览器缓存清理阶段：❌ 失败 - 请检查详细报告" "ERROR"
                $cacheFlushSuccess = $false
            }
            
            # 添加报告内容到汇总
            Add-Content -Path $summaryLog -Value "`n----- 浏览器缓存清理报告摘要 ------"
            Add-Content -Path $summaryLog -Value $cacheReportContent
        } else {
            Write-Summary "浏览器缓存清理阶段：❌ 失败 - 未找到清理报告" "ERROR"
            $cacheFlushSuccess = $false
        }
    } catch {
        Write-Summary "浏览器缓存清理阶段：❌ 执行失败 - $_" "ERROR"
        $cacheFlushSuccess = $false
    }
} else {
    Write-Summary "浏览器缓存清理脚本不存在: $cacheFlushScript" "ERROR"
    $cacheFlushSuccess = $false
}

# 如果缓存清理失败，停止后续步骤
if (-not $cacheFlushSuccess) {
    Write-Host "`n❌ 浏览器缓存清理失败，停止全链路修复流程！" -ForegroundColor Red
    Write-Summary "由于浏览器缓存清理失败，全链路修复流程已停止" "ERROR"
    exit 1
}

# 阶段3: 自检报告验证
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                       阶段3: 自检报告验证                          " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

if (Test-Path $selfCheckScript) {
    Write-Summary "开始执行自检报告验证脚本..."
    try {
        # 执行自检脚本
        & powershell -ExecutionPolicy Bypass -File $selfCheckScript
        
        # 检查自检报告
        $selfCheckReport = "$logDir\sentinel_selfcheck_report.txt"
        if (Test-Path $selfCheckReport) {
            $selfCheckContent = Get-Content -Path $selfCheckReport -Raw
            
            # 分析自检结果
            if ($selfCheckContent -match "✅ 自检结果: 全绿") {
                Write-Summary "自检报告验证阶段：✅ 成功 - 页面已彻底修复" "SUCCESS"
                $selfCheckSuccess = $true
            } else {
                Write-Summary "自检报告验证阶段：⚠️ 警告 - 页面可能仍有问题" "WARNING"
                $selfCheckSuccess = $false
            }
            
            # 添加报告内容到汇总
            Add-Content -Path $summaryLog -Value "`n----- 自检报告摘要 ------"
            Add-Content -Path $summaryLog -Value $selfCheckContent
        } else {
            Write-Summary "自检报告验证阶段：❌ 失败 - 未找到自检报告" "ERROR"
            $selfCheckSuccess = $false
        }
    } catch {
        Write-Summary "自检报告验证阶段：❌ 执行失败 - $_" "ERROR"
        $selfCheckSuccess = $false
    }
} else {
    Write-Summary "自检脚本不存在: $selfCheckScript" "ERROR"
    $selfCheckSuccess = $false
}

# 生成最终汇总报告
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "                         四、汇总与结论输出                          " -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------" -ForegroundColor Cyan

$endTime = Get-Date
$executionTime = ($endTime - $startTime).TotalSeconds

# 汇总所有阶段结果
$allSuccess = $htmlRepairSuccess -and $cacheFlushSuccess -and $selfCheckSuccess

$conclusion = @"

===================================================================
                    JEV全链路修复最终结论
===================================================================
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
总执行耗时: {0:F2} 秒

各阶段状态:
- HTML批量修复: {1}
- 浏览器缓存清理: {2}
- 自检报告验证: {3}

残留风险评估:
- 缓存冲突: {4}
- 编码残留: {5}
- 结构异常: {6}

最终结论: {7}
===================================================================
"@ -f $executionTime, 
        $(if($htmlRepairSuccess) {"✅ 成功"} else {"❌ 失败"}),
        $(if($cacheFlushSuccess) {"✅ 成功"} else {"❌ 失败"}),
        $(if($selfCheckSuccess) {"✅ 成功"} else {"❌ 失败"}),
        $(if($selfCheckContent -match "缓存冲突") {"⚠️ 存在"} else {"✅ 不存在"}),
        $(if($selfCheckContent -match "残留错位字符") {"⚠️ 存在"} else {"✅ 不存在"}),
        $(if($selfCheckContent -match "HTML.*不完整") {"⚠️ 存在"} else {"✅ 不存在"}),
        $(if($allSuccess) {"🟢 [FINISH] JEV Frontend fully restored. UTF-8 integrity verified."} else {"🔴 修复未完全成功，请检查详细日志"})

Add-Content -Path $summaryLog -Value $conclusion
Write-Host $conclusion

# 输出最终状态
if ($allSuccess) {
    Write-Host "`n🟢 [FINISH] JEV Frontend fully restored. UTF-8 integrity verified." -ForegroundColor Green
    Write-Summary "全链路修复成功完成！" "SUCCESS"
    exit 0
} else {
    Write-Host "`n🔴 修复未完全成功，请检查详细日志文件" -ForegroundColor Red
    Write-Summary "全链路修复未完全成功" "ERROR"
    Write-Host "`n详细报告路径: $summaryLog" -ForegroundColor Yellow
    exit 1
}