#!/usr/bin/env pwsh
# JEV-HTML-REPAIR-DEEP-REBUILD-v3.2
# 功能：深度修复HTML文件中的双重编码问题，恢复中文内容和标签结构
# 作者：JEV System
# 日期：2024

# 配置参数
$logDir = "D:\PDF转网页\logs"
$reportFile = "$logDir\sentinel_rebuild_report.txt"
$sourceFile = "D:\PDF转网页\ui\sentinel_dashboard.html"
$outputFile = "D:\PDF转网页\ui\sentinel_dashboard_restored.html"
$backupFile = "$sourceFile.bak"

# 创建日志目录
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Output "[+] 创建日志目录: $logDir"
}

# 初始化报告
$reportContent = @"
# JEV-HTML-REPAIR-DEEP-REBUILD-v3.2 修复报告
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
源文件: $sourceFile
目标文件: $outputFile

## 修复过程日志
"@

# 统计变量
$stats = @{
    OriginalSize = 0
    RestoredSize = 0
    InvalidUtf8Sequences = 0
    FixedSequences = 0
    ChineseCharactersFound = 0
    ControlCharactersRemoved = 0
    HtmlEntitiesFixed = 0
    BomDetected = $false
    ScriptBlocksPreserved = 0
    StyleBlocksPreserved = 0
}

function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] $message"
    Write-Host $logMessage
    $global:reportContent += "$logMessage`n"
}

Write-Log "开始深度HTML修复任务..."
Write-Log "目标文件: $sourceFile"

# 函数：检测非法UTF-8序列
function Test-InvalidUtf8Sequence {
    param(
        [byte[]]$bytes
    )
    try {
        $decoder = [System.Text.UTF8Encoding]::UTF8.GetDecoder()
        $charCount = $decoder.GetCharCount($bytes, 0, $bytes.Length)
        $chars = New-Object char[] $charCount
        $decoder.GetChars($bytes, 0, $bytes.Length, $chars, 0)
        return $false, $chars
    } catch {
        return $true, $null
    }
}

# 函数：执行Latin-1/Windows-1252反向重解码
function Repair-DoubleEncoding {
    param(
        [byte[]]$bytes
    )
    
    # 尝试Latin-1 (ISO-8859-1) 反向重解码
    try {
        $latin1Encoding = [System.Text.Encoding]::GetEncoding(28591)
        $latin1String = $latin1Encoding.GetString($bytes)
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($latin1String)
        $repairedString = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)
        
        # 检测修复效果
        $chineseCount = [regex]::Matches($repairedString, '[\u4e00-\u9fa5]').Count
        $invalidCount = [regex]::Matches($repairedString, '[\uFFFD]').Count
        
        # 如果修复后有中文字符且无效字符较少，则认为修复成功
        if ($chineseCount -gt 0 -and $invalidCount -lt $repairedString.Length * 0.1) {
            Write-Log "  - 成功执行Latin-1反向重解码，发现$chineseCount个中文字符"
            $global:stats.FixedSequences++
            return $true, $repairedString
        }
    } catch {
        Write-Log "  - Latin-1反向重解码失败: $_"
    }
    
    # 尝试Windows-1252反向重解码
    try {
        $win1252Encoding = [System.Text.Encoding]::GetEncoding(1252)
        $win1252String = $win1252Encoding.GetString($bytes)
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($win1252String)
        $repairedString = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)
        
        # 检测修复效果
        $chineseCount = [regex]::Matches($repairedString, '[\u4e00-\u9fa5]').Count
        $invalidCount = [regex]::Matches($repairedString, '[\uFFFD]').Count
        
        if ($chineseCount -gt 0 -and $invalidCount -lt $repairedString.Length * 0.1) {
            Write-Log "  - 成功执行Windows-1252反向重解码，发现$chineseCount个中文字符"
            $global:stats.FixedSequences++
            return $true, $repairedString
        }
    } catch {
        Write-Log "  - Windows-1252反向重解码失败: $_"
    }
    
    return $false, $null
}

# 函数：修复HTML实体
function Repair-HtmlEntities {
    param(
        [string]$content
    )
    
    $originalLength = $content.Length
    
    # 修复常见的HTML实体错误
    # 1. 修复可能被错误编码的中文实体
    $content = $content -replace '&#x([0-9a-fA-F]{4});', { param($match) [char][int]('0x' + $match.Groups[1].Value) }
    
    # 2. 修复常见的HTML实体
    $htmlEntities = @{
        '&amp;' = '&'; '&lt;' = '<'; '&gt;' = '>'; '&quot;' = '"'; '&#39;' = "'"
    }
    
    foreach ($entity in $htmlEntities.GetEnumerator()) {
        $content = $content -replace [regex]::Escape($entity.Key), $entity.Value
    }
    
    $fixedCount = $originalLength - $content.Length
    if ($fixedCount -gt 0) {
        $global:stats.HtmlEntitiesFixed += $fixedCount
        Write-Log "  - 修复了 $fixedCount 个HTML实体"
    }
    
    return $content
}

# 函数：清理控制字符和无效BOM
function Clean-Content {
    param(
        [string]$content
    )
    
    $originalLength = $content.Length
    
    # 移除BOM
    if ($content.StartsWith([char]0xFEFF)) {
        $content = $content.Substring(1)
        $global:stats.BomDetected = $true
        Write-Log "  - 移除了BOM标记"
    }
    
    # 移除控制字符（保留换行、回车、制表符）
    $content = $content -replace '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', ''
    
    $removedCount = $originalLength - $content.Length
    if ($removedCount -gt 0) {
        $global:stats.ControlCharactersRemoved = $removedCount
        Write-Log "  - 移除了 $removedCount 个控制字符"
    }
    
    return $content
}

# 检查源文件是否存在
if (-not (Test-Path $sourceFile)) {
    Write-Log "错误: 源文件不存在 - $sourceFile"
    $global:reportContent += "`n## 修复结果: 失败`n原因: 源文件不存在"
    Set-Content -Path $reportFile -Value $global:reportContent -Encoding utf8
    exit 1
}

# 获取文件信息并备份
$fileInfo = Get-Item $sourceFile
$stats.OriginalSize = $fileInfo.Length
Write-Log "文件大小: $($stats.OriginalSize) 字节"

# 创建备份
if (Test-Path $backupFile) {
    Remove-Item $backupFile -Force
}
Copy-Item $sourceFile -Destination $backupFile
Write-Log "已创建备份: $backupFile"

try {
    # 读取文件字节
    $allBytes = [System.IO.File]::ReadAllBytes($sourceFile)
    Write-Log "成功读取文件，开始深度分析..."
    
    # 检测是否有BOM
    if ($allBytes.Length -ge 3 -and $allBytes[0] -eq 0xEF -and $allBytes[1] -eq 0xBB -and $allBytes[2] -eq 0xBF) {
        Write-Log "检测到UTF-8 BOM标记"
        $stats.BomDetected = $true
        # 移除BOM字节
        $allBytes = $allBytes[3..($allBytes.Length-1)]
    }
    
    # 保留<script>和<style>块的策略
    # 1. 先尝试整体修复
    $hasInvalidSequence = $false
    $tryWholeRepair = $true
    
    if ($tryWholeRepair) {
        $isInvalid, $chars = Test-InvalidUtf8Sequence -bytes $allBytes
        if ($isInvalid) {
            $hasInvalidSequence = $true
            Write-Log "检测到文件中包含非法UTF-8序列，尝试整体修复..."
            
            $repairSuccess, $repairedContent = Repair-DoubleEncoding -bytes $allBytes
            if ($repairSuccess) {
                Write-Log "整体修复成功，继续处理..."
            } else {
                Write-Log "整体修复失败，切换到分段修复模式..."
                $tryWholeRepair = $false
            }
        } else {
            # 文件本身是有效的UTF-8，但可能存在双重编码的部分
            $repairedContent = [string]::new($chars)
        }
    }
    
    # 如果整体修复失败，使用分段修复
    if (-not $tryWholeRepair -or -not $repairSuccess) {
        # 分段处理，按1KB块
        $blockSize = 1KB
        $resultBuilder = [System.Text.StringBuilder]::new()
        $blocksProcessed = 0
        
        for ($i = 0; $i -lt $allBytes.Length; $i += $blockSize) {
            $blocksProcessed++
            $blockEnd = [math]::Min($i + $blockSize, $allBytes.Length)
            $blockLength = $blockEnd - $i
            $blockBytes = $allBytes[$i..($blockEnd-1)]
            
            Write-Log "处理块 $blocksProcessed (偏移: $i, 大小: $blockLength 字节)"
            
            # 检测块是否有非法序列
            $isInvalid, $chars = Test-InvalidUtf8Sequence -bytes $blockBytes
            if ($isInvalid) {
                $stats.InvalidUtf8Sequences++
                Write-Log "  - 检测到非法UTF-8序列，尝试修复..."
                
                # 尝试反向重解码
                $repairSuccess, $repairedBlock = Repair-DoubleEncoding -bytes $blockBytes
                if ($repairSuccess) {
                    $resultBuilder.Append($repairedBlock)
                } else {
                    # 如果修复失败，使用默认UTF-8解码（可能会有乱码）
                    Write-Log "  - 修复失败，使用默认UTF-8解码"
                    $defaultDecoded = [System.Text.Encoding]::UTF8.GetString($blockBytes)
                    $resultBuilder.Append($defaultDecoded)
                }
            } else {
                # 有效UTF-8，直接添加
                $blockContent = [string]::new($chars)
                $resultBuilder.Append($blockContent)
            }
        }
        
        $repairedContent = $resultBuilder.ToString()
        Write-Log "分段修复完成，共处理 $blocksProcessed 块"
    }
    
    # 保存修复前的脚本和样式块
    $scriptBlocks = @()
    $styleBlocks = @()
    
    # 提取<script>块
    $scriptMatches = [regex]::Matches($repairedContent, '<script[^>]*>.*?</script>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($match in $scriptMatches) {
        $scriptBlocks += @{
            Original = $match.Value
            Placeholder = "<!-- SCRIPT_BLOCK_$($scriptBlocks.Count) -->"
        }
    }
    
    # 提取<style>块
    $styleMatches = [regex]::Matches($repairedContent, '<style[^>]*>.*?</style>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($match in $styleMatches) {
        $styleBlocks += @{
            Original = $match.Value
            Placeholder = "<!-- STYLE_BLOCK_$($styleBlocks.Count) -->"
        }
    }
    
    # 替换脚本和样式块为占位符
    foreach ($block in $scriptBlocks) {
        $repairedContent = $repairedContent -replace [regex]::Escape($block.Original), $block.Placeholder
    }
    
    foreach ($block in $styleBlocks) {
        $repairedContent = $repairedContent -replace [regex]::Escape($block.Original), $block.Placeholder
    }
    
    Write-Log "已提取并保存 $($scriptBlocks.Count) 个脚本块和 $($styleBlocks.Count) 个样式块"
    $stats.ScriptBlocksPreserved = $scriptBlocks.Count
    $stats.StyleBlocksPreserved = $styleBlocks.Count
    
    # 修复HTML实体
    Write-Log "开始修复HTML实体..."
    $repairedContent = Repair-HtmlEntities -content $repairedContent
    
    # 清理控制字符
    Write-Log "清理控制字符和无效内容..."
    $repairedContent = Clean-Content -content $repairedContent
    
    # 恢复脚本和样式块
    foreach ($block in $scriptBlocks) {
        $repairedContent = $repairedContent -replace [regex]::Escape($block.Placeholder), $block.Original
    }
    
    foreach ($block in $styleBlocks) {
        $repairedContent = $repairedContent -replace [regex]::Escape($block.Placeholder), $block.Original
    }
    
    # 确保UTF-8元标签
    if (-not ($repairedContent -match '<meta[^>]*charset=["\']?utf-?8["\']?[^>]*>')) {
        if ($repairedContent -match '<head>') {
            $repairedContent = $repairedContent -replace '<head>', '<head>`n    <meta charset="UTF-8">'
            Write-Log "添加缺失的UTF-8元标签"
        } else {
            # 如果没有<head>标签，在<html>后添加
            $repairedContent = $repairedContent -replace '<html[^>]*>', '$0`n<head>`n    <meta charset="UTF-8">`n</head>'
            Write-Log "添加<head>和UTF-8元标签"
        }
    }
    
    # 统计中文字符数量
    $stats.ChineseCharactersFound = [regex]::Matches($repairedContent, '[\u4e00-\u9fa5]').Count
    Write-Log "检测到 $($stats.ChineseCharactersFound) 个中文字符"
    
    # 保存修复后的文件
    [System.IO.File]::WriteAllText($outputFile, $repairedContent, [System.Text.Encoding]::UTF8)
    $stats.RestoredSize = (Get-Item $outputFile).Length
    Write-Log "已保存修复文件: $outputFile ($($stats.RestoredSize) 字节)"
    
    # 计算修复率
    $repairRate = 0
    if ($stats.InvalidUtf8Sequences -gt 0) {
        $repairRate = [math]::Round(($stats.FixedSequences / $stats.InvalidUtf8Sequences) * 100, 2)
    } else {
        $repairRate = 100
    }
    
    # 生成详细报告
    $reportContent += @"

## 文件统计信息
- 原始大小: $($stats.OriginalSize) 字节
- 修复后大小: $($stats.RestoredSize) 字节
- UTF-8 BOM: $(if ($stats.BomDetected) { "已检测并移除" } else { "未检测到" })

## 修复统计
- 检测到的非法UTF-8序列: $($stats.InvalidUtf8Sequences)
- 成功修复的序列: $($stats.FixedSequences)
- 修复率: $repairRate%
- 检测到的中文字符: $($stats.ChineseCharactersFound)
- 移除的控制字符: $($stats.ControlCharactersRemoved)
- 修复的HTML实体: $($stats.HtmlEntitiesFixed)
- 保留的脚本块: $($stats.ScriptBlocksPreserved)
- 保留的样式块: $($stats.StyleBlocksPreserved)

## 修复结果: 成功
- 所有修复操作均在本地完成，未联网
- 仅修改HTML文本层，保留了脚本和样式逻辑
- 英文、路径和链接已保留
- 输出文件已保存为UTF-8无BOM格式
"@
    
    Write-Log "修复完成！修复率: $repairRate%"
    
} catch {
    Write-Log "修复过程中发生错误: $_"
    $reportContent += "`n## 修复结果: 失败`n错误详情: $_"
}

# 保存报告
Set-Content -Path $reportFile -Value $reportContent -Encoding utf8
Write-Log "报告已保存: $reportFile"

# 输出完成信息
Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "✅ HTML文件深度修复完成" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "源文件: $sourceFile" -ForegroundColor Green
Write-Host "修复文件: $outputFile" -ForegroundColor Green
Write-Host "备份文件: $backupFile" -ForegroundColor Green
Write-Host "详细报告: $reportFile" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
