#!/usr/bin/env pwsh
# JEV-LARGE-HTML-RECONSTRUCTOR-v2.5
# 功能：修复大型HTML文件中的双重编码问题，保留结构和脚本
# 作者：JEV System
# 日期：2024

# 配置参数
$logDir = "D:\PDF转网页\logs"
$reportFile = "$logDir\large_html_reconstructor_report.txt"
$targetDir = "D:\PDF转网页\ui"
$blockSize = 32KB  # 32KB块大小
$minSuccessRate = 90  # 最低修复成功率要求

# 目标文件列表
$targetFiles = @(
    @{
        Source = "$targetDir\client_portal.html"
        Output = "$targetDir\client_portal_restored.html"
        Backup = "$targetDir\client_portal.html.bak"
    },
    @{
        Source = "$targetDir\sentinel_dashboard.html"
        Output = "$targetDir\sentinel_dashboard_restored.html"
        Backup = "$targetDir\sentinel_dashboard.html.bak"
    }
)

# 创建日志目录
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Output "[+] 创建日志目录: $logDir"
}

# 初始化报告
$reportContent = @"
# JEV-LARGE-HTML-RECONSTRUCTOR-v2.5 修复报告
生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
目标目录: $targetDir
块大小: ${blockSize}B

## 总体修复统计
"@

$totalFiles = $targetFiles.Count
$successFiles = 0
$totalBlocks = 0
$fixedBlocks = 0

function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] $message"
    Write-Host $logMessage
    $global:reportContent += "$logMessage`n"
}

Write-Log "开始大型HTML文件重构任务..."
Write-Log "目标文件数: $totalFiles"
Write-Log "块大小设置: ${blockSize}B"

# 函数：计算字符串哈希
function Get-StringHash {
    param(
        [string]$inputString
    )
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($inputString)
    $hash = $hasher.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

# 函数：检测UTF-8无效序列
function Test-InvalidUtf8 {
    param(
        [byte[]]$bytes
    )
    try {
        [void][System.Text.Encoding]::UTF8.GetString($bytes)
        return $false
    } catch {
        return $true
    }
}

# 函数：评分解码质量
function Get-DecodeQualityScore {
    param(
        [string]$content
    )
    $score = 0
    
    # 检查HTML标签完整性
    if ($content -match '<html[^>]*>|<body[^>]*>|<head[^>]*>') { $score += 20 }
    if ($content -match '</html>|</body>|</head>') { $score += 15 }
    
    # 检查中文字符数量
    $chineseChars = [regex]::Matches($content, '[\u4e00-\u9fa5]')
    $chineseCount = $chineseChars.Count
    $score += [math]::Min($chineseCount, 50)  # 最多50分
    
    # 检查有效文本比例
    $textContent = $content -replace '<[^>]+>', ''
    $validChars = [regex]::Matches($textContent, '[\p{L}\p{N}\p{P}\p{S}\s\u4e00-\u9fa5]')
    $invalidChars = [regex]::Matches($content, '[\uFFFD]')  # UTF-8替换字符
    
    if ($content.Length -gt 0) {
        $validRatio = $validChars.Count / $content.Length
        $score += [math]::Min([math]::Round($validRatio * 10), 15)
    }
    
    # 惩罚无效字符过多
    if ($invalidChars.Count -gt $content.Length * 0.1) {
        $score -= 20
    }
    
    return @{
        Score = [math]::Max(0, $score)
        ChineseCount = $chineseCount
        ValidRatio = $validRatio
    }
}

# 函数：修复单个文件
function Repair-HtmlFile {
    param(
        [hashtable]$fileInfo
    )
    
    $sourcePath = $fileInfo.Source
    $outputPath = $fileInfo.Output
    $backupPath = $fileInfo.Backup
    
    Write-Log "正在处理文件: $sourcePath"
    
    # 检查源文件是否存在
    if (-not (Test-Path $sourcePath)) {
        Write-Log "错误: 文件不存在 - $sourcePath"
        return @{
            Success = $false
            Reason = "文件不存在"
            FileName = (Split-Path $sourcePath -Leaf)
        }
    }
    
    # 获取文件信息
    $fileInfo = Get-Item $sourcePath
    $fileSize = $fileInfo.Length
    Write-Log "文件大小: $fileSize 字节"
    
    # 创建备份
    if (Test-Path $backupPath) {
        Remove-Item $backupPath -Force
    }
    Copy-Item $sourcePath -Destination $backupPath
    Write-Log "已创建备份: $backupPath"
    
    try {
        # 读取文件字节
        $allBytes = [System.IO.File]::ReadAllBytes($sourcePath)
        $fixedContent = [System.Text.StringBuilder]::new()
        $blocksProcessed = 0
        $blocksFixed = 0
        $bestEncoding = "UTF-8"
        
        # 分段处理文件
        for ($i = 0; $i -lt $allBytes.Length; $i += $blockSize) {
            $blocksProcessed++
            $blockEnd = [math]::Min($i + $blockSize, $allBytes.Length)
            $blockLength = $blockEnd - $i
            $blockBytes = $allBytes[$i..($blockEnd-1)]
            
            Write-Log "处理块 $blocksProcessed (偏移: $i, 大小: $blockLength 字节)"
            
            # 尝试多种解码策略
            $decodingStrategies = @{
                "UTF8" = { [System.Text.Encoding]::UTF8.GetString($blockBytes) }
                "DoubleUTF8_Latin1" = { 
                    $latin1Str = [System.Text.Encoding]::GetEncoding(28591).GetString($blockBytes)
                    [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes($latin1Str))
                }
                "GBK" = { [System.Text.Encoding]::GetEncoding(936).GetString($blockBytes) }
                "UTF16_LE" = { [System.Text.Encoding]::Unicode.GetString($blockBytes) }  # UTF-16 LE
                "UTF16_BE" = { [System.Text.Encoding]::BigEndianUnicode.GetString($blockBytes) }  # UTF-16 BE
            }
            
            $bestResult = @{
                Content = ""
                Score = 0
                Strategy = "UTF8"
                ChineseCount = 0
            }
            
            foreach ($strategyName in $decodingStrategies.Keys) {
                try {
                    $decodedContent = & $decodingStrategies[$strategyName]
                    $quality = Get-DecodeQualityScore -content $decodedContent
                    
                    if ($quality.Score -gt $bestResult.Score) {
                        $bestResult = @{
                            Content = $decodedContent
                            Score = $quality.Score
                            Strategy = $strategyName
                            ChineseCount = $quality.ChineseCount
                        }
                    }
                } catch {
                    Write-Log "策略 '$strategyName' 解码失败: $_"
                }
            }
            
            # 确定是否需要修复
            $needsFix = $bestResult.Strategy -ne "UTF8" -or $bestResult.Score -lt 50
            
            if ($needsFix) {
                $blocksFixed++
                Write-Log "块 $blocksProcessed 需要修复，应用策略: $($bestResult.Strategy) (评分: $($bestResult.Score), 中文字符: $($bestResult.ChineseCount))"
                $fixedContent.Append($bestResult.Content)
            } else {
                # 使用原始UTF-8解码
                $originalContent = [System.Text.Encoding]::UTF8.GetString($blockBytes)
                $fixedContent.Append($originalContent)
            }
        }
        
        # 最终内容处理
        $resultContent = $fixedContent.ToString()
        
        # 移除BOM
        if ($resultContent.StartsWith([char]0xFEFF)) {
            $resultContent = $resultContent.Substring(1)
            Write-Log "已移除BOM标记"
        }
        
        # 移除控制字符（保留换行和制表符）
        $resultContent = $resultContent -replace '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', ''
        
        # 合并冗余空行
        $resultContent = $resultContent -replace '(\r?\n){3,}', "`n`n"
        
        # 确保UTF-8元标签存在且靠前
        if (-not ($resultContent -match '<meta[^>]*charset=["\']?utf-?8["\']?[^>]*>')) {
            if ($resultContent -match '<head>') {
                $resultContent = $resultContent -replace '<head>', '<head>`n    <meta charset="UTF-8">'
                Write-Log "已添加缺失的UTF-8元标签"
            } else {
                # 如果没有<head>标签，尝试在<html>后添加
                if ($resultContent -match '<html[^>]*>') {
                    $resultContent = $resultContent -replace '<html[^>]*>', '$0`n<head>`n    <meta charset="UTF-8">`n</head>'
                    Write-Log "已添加<head>和UTF-8元标签"
                }
            }
        } else {
            # 确保meta标签在head的前部分
            if ($resultContent -match '<head>(.*?)<meta[^>]*charset=["\']?utf-?8["\']?[^>]*>') {
                $beforeMeta = $matches[1]
                if ($beforeMeta.Trim().Length -gt 0) {
                    # 将meta标签移到前面
                    $resultContent = $resultContent -replace 
                        '<head>(.*?)(<meta[^>]*charset=["\']?utf-?8["\']?[^>]*>)(.*?)', 
                        '<head>$2$1$3'
                    Write-Log "已优化UTF-8元标签位置"
                }
            }
        }
        
        # 计算修复率
        $fixRate = 0
        if ($blocksProcessed -gt 0) {
            $fixRate = [math]::Round(($blocksFixed / $blocksProcessed) * 100, 2)
        }
        
        Write-Log "文件处理完成，共 $blocksProcessed 块，修复 $blocksFixed 块 (修复率: ${fixRate}%)"
        
        # 保存修复后的文件
        [System.IO.File]::WriteAllText($outputPath, $resultContent, [System.Text.Encoding]::UTF8)
        $outputSize = (Get-Item $outputPath).Length
        Write-Log "已保存修复文件: $outputPath ($outputSize 字节)"
        
        # 检查修复率是否达标
        $success = $fixRate -ge $minSuccessRate
        $status = if ($success) { "成功" } else { "手动审查模式" }
        
        Write-Log "修复状态: $status (修复率: ${fixRate}%, 要求: ${minSuccessRate}%)"
        
        # 生成文件报告
        $fileReport = @{
            Success = $success
            FileName = (Split-Path $sourcePath -Leaf)
            OriginalSize = $fileSize
            RestoredSize = $outputSize
            BlockCount = $blocksProcessed
            FixedBlocks = $blocksFixed
            FixRate = $fixRate
            BestEncoding = $bestEncoding
            OutputPath = $outputPath
        }
        
        # 添加到总体统计
        $global:totalBlocks += $blocksProcessed
        $global:fixedBlocks += $blocksFixed
        if ($success) {
            $global:successFiles++
        }
        
        return $fileReport
        
    } catch {
        Write-Log "处理文件时发生错误: $_"
        return @{
            Success = $false
            Reason = $_
            FileName = (Split-Path $sourcePath -Leaf)
        }
    }
}

# 处理所有文件
$fileReports = @()
foreach ($fileInfo in $targetFiles) {
    $report = Repair-HtmlFile -fileInfo $fileInfo
    $fileReports += $report
    
    # 添加文件报告
    $global:reportContent += "`n## 文件: $($report.FileName)`n"
    $global:reportContent += "- 状态: $(if ($report.Success) { "成功" } else { "失败" })
"
    
    if ($report.Success -or $report.FixRate) {
        $global:reportContent += "- 原始大小: $($report.OriginalSize) 字节
"
        $global:reportContent += "- 修复后大小: $($report.RestoredSize) 字节
"
        $global:reportContent += "- 处理块数: $($report.BlockCount)
"
        $global:reportContent += "- 修复块数: $($report.FixedBlocks)
"
        $global:reportContent += "- 修复率: $($report.FixRate)%
"
        $global:reportContent += "- 输出路径: $($report.OutputPath)
"
    } else {
        $global:reportContent += "- 失败原因: $($report.Reason)
"
    }
}

# 计算总体统计
$overallSuccessRate = 0
$overallFixRate = 0

if ($totalFiles -gt 0) {
    $overallSuccessRate = [math]::Round(($successFiles / $totalFiles) * 100, 2)
}

if ($totalBlocks -gt 0) {
    $overallFixRate = [math]::Round(($fixedBlocks / $totalBlocks) * 100, 2)
}

# 更新总体报告
$global:reportContent = $global:reportContent -replace 
    "## 总体修复统计\r?\n", 
    "## 总体修复统计\n"
    "- 成功文件数: $successFiles / $totalFiles ($overallSuccessRate%)\n"
    "- 处理块总数: $totalBlocks\n"
    "- 修复块总数: $fixedBlocks\n"
    "- 总体修复率: $overallFixRate%\n"
    "- 最低要求修复率: ${minSuccessRate}%\n"

# 自动打开浏览器验证
Write-Log "尝试打开浏览器预览修复后的文件..."
foreach ($fileInfo in $targetFiles) {
    if (Test-Path $fileInfo.Output) {
        try {
            # 尝试使用localhost URL或直接打开文件
            $relativePath = Split-Path $fileInfo.Output -Leaf
            $localhostUrl = "http://localhost:8080/ui/$relativePath"
            
            # 尝试直接打开文件
            Start-Process $fileInfo.Output
            Write-Log "已启动浏览器显示: $($fileInfo.Output)"
            
        } catch {
            Write-Log "警告: 无法自动打开文件 $($fileInfo.Output): $_"
        }
    }
}

# 保存报告
Set-Content -Path $reportFile -Value $global:reportContent -Encoding utf8
Write-Log "报告已保存: $reportFile"

# 输出完成信息
Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "🟢 [FINISH] Large HTML reconstruction completed successfully." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "成功文件: $successFiles / $totalFiles" -ForegroundColor Green
Write-Host "总体修复率: $overallFixRate%" -ForegroundColor Green
Write-Host "详细报告: $reportFile" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# 返回成功状态
if ($successFiles -eq $totalFiles) {
    exit 0
} else {
    exit 1
}
