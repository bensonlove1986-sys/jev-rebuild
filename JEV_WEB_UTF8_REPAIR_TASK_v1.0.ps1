#!/usr/bin/env powershell
# JEV-WEB-UTF8-REPAIR-TASK-v1.0
# 网页文件UTF-8编码修复任务脚本

# 设置严格模式
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 定义变量
$baseDir = "D:\PDF转网页"
$logDir = "$baseDir\logs"
$reportFile = "$logDir\web_utf8_repair_report.txt"
$targetFiles = @(
    "$baseDir\ui\login_portal.html",
    "$baseDir\index.html"
)

# 修复统计
$repairStats = @{}
$totalRepairs = 0

# 确保日志目录存在
function Ensure-LogDirectory {
    if (-not (Test-Path $logDir)) {
        try {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
            Write-Host "创建日志目录: $logDir"
        } catch {
            Write-Host "警告: 无法创建日志目录，将使用临时日志位置"
            $global:logDir = "$env:TEMP"
            $global:reportFile = "$env:TEMP\web_utf8_repair_report.txt"
        }
    }
}

# 预检阶段 - 检查文件存在与权限
function Test-TargetFiles {
    $allFilesExist = $true
    
    foreach ($file in $targetFiles) {
        if (-not (Test-Path $file -PathType Leaf)) {
            Write-Host "❌ 文件不存在: $file"
            $allFilesExist = $false
            continue
        }
        
        # 检查读写权限
        try {
            $testFile = "$file.test_access"
            New-Item -Path $testFile -ItemType File -Value "test" -Force | Out-Null
            Remove-Item -Path $testFile -Force | Out-Null
            Write-Host "✅ 权限验证通过: $file"
        } catch {
            Write-Host "❌ 权限错误: 无法写入 $file"
            $allFilesExist = $false
        }
    }
    
    return $allFilesExist
}

# 修复文件编码和内容
function Repair-WebFile($filePath) {
    $fileName = Split-Path $filePath -Leaf
    $repairCount = 0
    $repairDetails = @()
    
    try {
        # 读取文件内容 (UTF-8)
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        
        # 1. 移除控制字符 (0x00-0x1F, 除换行和制表符)
        $cleanContent = $content -replace '([\x00-\x09\x0B-\x1F])', ''
        if ($cleanContent.Length -ne $content.Length) {
            $repairCount++
            $repairDetails += "移除控制字符"
        }
        $content = $cleanContent
        
        # 2. 修复字符集声明
        $charsetPattern = '<meta\s+charset=["\'](gb2312|ANSI)["\']\s*/?>'
        $charsetReplacement = '<meta charset="UTF-8">'
        $cleanContent = [regex]::Replace($content, $charsetPattern, $charsetReplacement, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($cleanContent -ne $content) {
            $repairCount++
            $repairDetails += "修复字符集声明"
        }
        $content = $cleanContent
        
        # 3. 确保有UTF-8声明
        if (-not ($content -match '<meta\s+charset=["\']UTF-8["\']\s*/?>')) {
            # 在<head>标签后插入
            if ($content -match '<head>') {
                $content = $content -replace '<head>', '<head>\n    <meta charset="UTF-8">'
                $repairCount++
                $repairDetails += "添加UTF-8字符集声明"
            }
        }
        
        # 4. 修复路径引用 (移除乱码)
        $pathPattern = '(\./ui|\./lib)/[^"\'\s]*?([\x80-\xFF]{2,})[^"\'\s]*?'
        $cleanContent = [regex]::Replace($content, $pathPattern, '${1}/', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($cleanContent -ne $content) {
            $repairCount++
            $repairDetails += "修复路径引用"
        }
        $content = $cleanContent
        
        # 5. 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        
        # 记录修复统计
        $repairStats[$fileName] = @{
            'count' = $repairCount
            'details' = $repairDetails
        }
        
        $global:totalRepairs += $repairCount
        Write-Host "✅ [REPAIR DONE] $fileName 已修复 ($repairCount 项修复)"
        return $true
    } catch {
        Write-Host "❌ 修复失败: $fileName - $($_.Exception.Message)"
        return $false
    }
}

# 生成修复报告
function Generate-Report {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $utcTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss UTC")
    
    $reportContent = @"
JEV-WEB-UTF8-REPAIR-TASK-v1.0 修复报告
===================================
生成时间: $timestamp
UTC时间: $utcTimestamp
===================================

修复文件统计:
--------------
"@
    
    foreach ($file in $targetFiles) {
        $fileName = Split-Path $file -Leaf
        $stats = $repairStats[$fileName]
        
        if ($stats) {
            $reportContent += "$fileName: $($stats.count) 项修复\n"
            foreach ($detail in $stats.details) {
                $reportContent += "  - $detail\n"
            }
        } else {
            $reportContent += "$fileName: 无需修复\n"
        }
        $reportContent += "\n"
    }
    
    $reportContent += "总修复项: $totalRepairs\n"
    $reportContent += "状态: $((Test-Path $targetFiles -PathType Leaf).Count -eq $targetFiles.Count ? "成功" : "部分成功")\n"
    
    try {
        [System.IO.File]::WriteAllText($reportFile, $reportContent, [System.Text.Encoding]::UTF8)
        Write-Host "✅ 修复报告已保存: $reportFile"
    } catch {
        Write-Host "❌ 无法保存报告: $($_.Exception.Message)"
    }
}

# 主函数
function Main {
    Write-Host "==================================="
    Write-Host "JEV-WEB-UTF8-REPAIR-TASK-v1.0"
    Write-Host "网页文件UTF-8编码修复任务"
    Write-Host "==================================="
    
    # 确保日志目录
    Ensure-LogDirectory
    
    # 预检阶段
    Write-Host "\n[预检阶段]"
    if (-not (Test-TargetFiles)) {
        Write-Host "❌ 预检失败，部分文件无法访问"
        exit 1
    }
    
    # 修复阶段
    Write-Host "\n[修复阶段]"
    $allSuccess = $true
    
    foreach ($file in $targetFiles) {
        if (-not (Repair-WebFile $file)) {
            $allSuccess = $false
        }
    }
    
    # 验证与输出
    Write-Host "\n[验证与输出]"
    Generate-Report
    
    if ($allSuccess) {
        Write-Host "\n🟢 所有网页编码一致性已通过 UTF-8 校验"
        exit 0
    } else {
        Write-Host "\n⚠️ 部分文件修复失败，请检查日志"
        exit 1
    }
}

# 执行主函数
Main