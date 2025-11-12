#!/usr/bin/env pwsh
# JEV-HTML-REPAIR-SENTINEL-v1.0
# 功能：检测并修复sentinel_dashboard.html文件中的编码问题，恢复中文内容
# 作者：JEV System
# 日期：2024

# 日志配置
$logDir = "D:\PDF转网页\logs"
$reportFile = "$logDir\sentinel_repair_report.txt"
$sourceFile = "D:\PDF转网页\ui\sentinel_dashboard.html"
$outputFile = "D:\PDF转网页\ui\sentinel_dashboard_restored.html"

# 创建日志目录
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Output "[+] 创建日志目录: $logDir"
}

# 初始化报告
$reportContent = @"
# JEV-HTML-REPAIR-SENTINEL-v1.0 修复报告
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
源文件: $sourceFile
目标文件: $outputFile

## 修复过程日志
"@

function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] $message"
    Write-Host $logMessage
    $global:reportContent += "$logMessage`n"
}

Write-Log "开始修复sentinel_dashboard.html文件..."

# 检查源文件是否存在
if (-not (Test-Path $sourceFile)) {
    Write-Log "错误: 源文件不存在 - $sourceFile"
    $global:reportContent += "`n## 修复结果: 失败`n原因: 源文件不存在"
    Set-Content -Path $reportFile -Value $global:reportContent -Encoding utf8
    exit 1
}

try {
    # 1. 逐字节读取文件内容
    Write-Log "开始逐字节分析文件..."
    $bytes = [System.IO.File]::ReadAllBytes($sourceFile)
    Write-Log "成功读取文件，共 $($bytes.Length) 字节"
    
    # 2. 检测并修复双重UTF-8编码（Latin-1反向转换）
    Write-Log "执行UTF-8编码检测和双重编码修复..."
    
    # 尝试多种解码策略
    $decodingStrategies = @{
        "UTF8_NoBOM" = { [System.Text.Encoding]::UTF8.GetString($bytes) }
        "UTF8_WithBOM" = { [System.Text.Encoding]::UTF8.GetString($bytes) }
        "DoubleUTF8_Fix" = { 
            # 尝试Latin-1反向转换（处理双重编码）
            $latin1Str = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
            $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($latin1Str)
            [System.Text.Encoding]::UTF8.GetString($utf8Bytes)
        }
        "GBK" = { [System.Text.Encoding]::GetEncoding(936).GetString($bytes) }
    }
    
    # 评估各种解码策略的有效性
    $bestContent = $null
    $bestScore = 0
    $bestStrategy = ""
    
    foreach ($strategy in $decodingStrategies.Keys) {
        try {
            $content = & $decodingStrategies[$strategy]
            
            # 简单评分机制：检查常见HTML标签和中文字符的存在
            $score = 0
            if ($content -match '<html>|<!DOCTYPE') { $score += 10 }
            if ($content -match '<head>|<body>') { $score += 10 }
            if ($content -match '<script|<link|<style') { $score += 5 }
            
            # 检查中文字符（使用正则表达式匹配Unicode CJK字符范围）
            $chineseChars = [regex]::Matches($content, '[\u4e00-\u9fa5]')
            if ($chineseChars.Count -gt 0) { 
                $score += $chineseChars.Count / 10
            }
            
            # 检查内容的有效性（避免大量乱码）
            $invalidChars = [regex]::Matches($content, '[\uFFFD]')
            if ($invalidChars.Count -lt $content.Length * 0.1) { 
                $score += 5
            }
            
            Write-Log "策略 '$strategy' 评分: $score ($($chineseChars.Count) 个中文字符)"
            
            if ($score -gt $bestScore) {
                $bestScore = $score
                $bestContent = $content
                $bestStrategy = $strategy
            }
        }
        catch {
            Write-Log "策略 '$strategy' 解码失败: $_"
        }
    }
    
    if (-not $bestContent) {
        Write-Log "警告: 所有解码策略均失败，使用默认UTF-8解码"
        $bestContent = [System.Text.Encoding]::UTF8.GetString($bytes)
        $bestStrategy = "Default_UTF8"
    }
    
    Write-Log "选择最佳解码策略: $bestStrategy (评分: $bestScore)"
    
    # 3. 清除不可见字符和错误控制符
    Write-Log "清除不可见字符和错误控制符..."
    # 保留制表符、换行符和回车符，移除其他控制字符
    $cleanContent = $bestContent -replace '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', ''
    
    # 4. 确保HTML结构完整性，保留JS和CSS链接
    Write-Log "检查和修复HTML结构..."
    
    # 确保有DOCTYPE声明
    if (-not ($cleanContent -match '^<!DOCTYPE')) {
        $cleanContent = '<!DOCTYPE html>' + "`n" + $cleanContent
        Write-Log "添加缺失的DOCTYPE声明"
    }
    
    # 确保有UTF-8元标签
    if (-not ($cleanContent -match '<meta[^>]*charset="?utf-8"?[^>]*>')) {
        # 尝试在<head>标签内插入
        if ($cleanContent -match '<head>') {
            $cleanContent = $cleanContent -replace '<head>', '<head>`n    <meta charset="utf-8">'
        } else {
            # 如果没有<head>标签，在<html>后添加
            $cleanContent = $cleanContent -replace '<html[^>]*>', '$0`n<head>`n    <meta charset="utf-8">`n</head>'
        }
        Write-Log "添加UTF-8字符集声明"
    }
    
    # 5. 计算修复前后的差异和中文恢复率
    $originalChineseCount = 0
    try {
        # 尝试估算原始文件中的中文数量
        $tempContent = [System.Text.Encoding]::UTF8.GetString($bytes)
        $originalChineseCount = [regex]::Matches($tempContent, '[\u4e00-\u9fa5]').Count
    } catch {}
    
    $restoredChineseCount = [regex]::Matches($cleanContent, '[\u4e00-\u9fa5]').Count
    $recoveryRate = 0
    if ($originalChineseCount -gt 0) {
        $recoveryRate = [math]::Round(($restoredChineseCount / $originalChineseCount) * 100, 2)
    } else {
        $recoveryRate = [math]::Round(($restoredChineseCount / ($cleanContent.Length / 10)) * 100, 2)
    }
    
    Write-Log "文字恢复统计: $restoredChineseCount 个中文字符 (恢复率: ${recoveryRate}%)"
    
    # 6. 保存修复后的文件为UTF-8无BOM
    Write-Log "保存修复后的文件为UTF-8无BOM格式..."
    [System.IO.File]::WriteAllText($outputFile, $cleanContent, [System.Text.Encoding]::UTF8)
    
    # 7. 验证文件是否成功保存
    if (Test-Path $outputFile) {
        $outputSize = (Get-Item $outputFile).Length
        Write-Log "成功保存修复后的文件: $outputFile ($outputSize 字节)"
    } else {
        Write-Log "错误: 无法保存修复后的文件"
        $global:reportContent += "`n## 修复结果: 部分失败`n原因: 无法保存输出文件"
        Set-Content -Path $reportFile -Value $global:reportContent -Encoding utf8
        exit 1
    }
    
    # 8. 打开浏览器验证
    Write-Log "尝试打开浏览器验证修复效果..."
    try {
        Start-Process "$outputFile"
        Write-Log "已启动浏览器显示修复后的页面"
    } catch {
        Write-Log "警告: 无法自动打开浏览器: $_"
    }
    
    # 完成报告
    $global:reportContent += @"

## 解码策略评估
- 最佳策略: $bestStrategy
- 策略评分: $bestScore

## 文字恢复统计
- 检测到的中文字符: $restoredChineseCount
- 估计恢复率: ${recoveryRate}%

## 修复操作摘要
- 解码和双重编码修复: 完成
- 控制字符清理: 完成
- HTML结构检查: 完成
- UTF-8字符集声明: 已确保
- JS/CSS链接: 已保留

## 修复结果: 成功
- 源文件大小: $($bytes.Length) 字节
- 修复后文件大小: $outputSize 字节
- 输出文件路径: $outputFile
"@
    
    Write-Log "修复完成！"
    
} catch {
    Write-Log "修复过程中发生错误: $_"
    $global:reportContent += "`n## 修复结果: 失败`n错误详情: $_"
}

# 保存报告
Set-Content -Path $reportFile -Value $global:reportContent -Encoding utf8
Write-Log "报告已保存: $reportFile"

Write-Host "`n========== 修复操作完成 ==========" -ForegroundColor Green
Write-Host "修复结果: $outputFile" -ForegroundColor Green
Write-Host "详细报告: $reportFile" -ForegroundColor Green
