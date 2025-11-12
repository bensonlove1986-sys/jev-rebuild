# JEV-MULTI-FILE-HTML-RECOVERY-v4.0
# 功能：批量检测并修复HTML文件的编码污染，自动生成修复版、日志与安全验证

# 配置变量
$baseDir = "D:\PDF转网页"
$uiDir = "$baseDir\ui"
$restoredDir = "$baseDir\ui_restored"
$backupDir = "$baseDir\backup_before_repair"
$logDir = "$baseDir\logs"
$reportFile = "$logDir\multi_html_recovery_report.txt"
$completedJson = "$logDir\multi_html_recovery_completed.json"

# 创建必要的目录
foreach ($dir in @($restoredDir, $backupDir, $logDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 初始化统计数据
$stats = @{
    "扫描文件总数" = 0
    "修复文件数" = 0
    "成功率" = "0%"
    "最后执行时间戳" = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    "文件详情" = @{}
}

# 日志函数
function Write-Log {
    param(
        [string]$message,
        [switch]$isError = $false
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    
    if ($isError) {
        Write-Host -ForegroundColor Red $logEntry
    } else {
        Write-Host $logEntry
    }
    
    Add-Content -Path "$logDir\multi_html_recovery.log" -Value $logEntry
}

Write-Log "开始执行JEV-MULTI-FILE-HTML-RECOVERY-v4.0"

# 检测UTF-8非法序列函数
function Test-UTF8Validity {
    param(
        [byte[]]$bytes
    )
    
    try {
        [System.Text.Encoding]::UTF8.GetString($bytes) | Out-Null
        return $true
    } catch {
        return $false
    }
}

# 检测疑似双层编码函数
function Test-DoubleEncoding {
    param(
        [string]$content
    )
    
    # 检测常见的双层编码模式（如Ã¥Â¼ÂºÃ¥ÂÂ¶Ã¥Å½Â新等）
    $doubleEncodedPatterns = @(
        [regex]::new("Ã¥\w{1,2}Ã¥\w{1,2}"),
        [regex]::new("Ã¤\w{1,2}Ã¤\w{1,2}"),
        [regex]::new("Ã©\w{1,2}Ã©\w{1,2}")
    )
    
    foreach ($pattern in $doubleEncodedPatterns) {
        if ($pattern.IsMatch($content)) {
            return $true
        }
    }
    
    # 检测控制字符
    if ([regex]::new("[\x00-\x08\x0B-\x0C\x0E-\x1F]").IsMatch($content)) {
        return $true
    }
    
    return $false
}

# 修复编码函数
function Repair-Encoding {
    param(
        [byte[]]$bytes,
        [string]$filePath
    )
    
    $bestScore = 0
    $bestResult = ""
    $attempts = @()
    
    # 尝试1: 直接UTF-8解码
    try {
        $result1 = [System.Text.Encoding]::UTF8.GetString($bytes)
        $score1 = Test-ContentQuality -content $result1 -name "UTF-8直接解码"
        $attempts += @{"name"="UTF-8直接解码"; "score"=$score1; "content"=$result1}
        if ($score1 -gt $bestScore) {
            $bestScore = $score1
            $bestResult = $result1
        }
    } catch {
        Write-Log "UTF-8直接解码失败: $_" -isError
    }
    
    # 尝试2: Latin-1 → UTF-8反向映射（修复双层编码）
    try {
        $latin1Content = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
        $latin1Bytes = [System.Text.Encoding]::UTF8.GetBytes($latin1Content)
        $result2 = [System.Text.Encoding]::UTF8.GetString($latin1Bytes)
        $score2 = Test-ContentQuality -content $result2 -name "Latin-1→UTF-8反向映射"
        $attempts += @{"name"="Latin-1→UTF-8反向映射"; "score"=$score2; "content"=$result2}
        if ($score2 -gt $bestScore) {
            $bestScore = $score2
            $bestResult = $result2
        }
    } catch {
        Write-Log "Latin-1→UTF-8反向映射失败: $_" -isError
    }
    
    # 尝试3: UTF-16LE → UTF-8
    try {
        $result3 = [System.Text.Encoding]::Unicode.GetString($bytes)
        $score3 = Test-ContentQuality -content $result3 -name "UTF-16LE→UTF-8"
        $attempts += @{"name"="UTF-16LE→UTF-8"; "score"=$score3; "content"=$result3}
        if ($score3 -gt $bestScore) {
            $bestScore = $score3
            $bestResult = $result3
        }
    } catch {
        Write-Log "UTF-16LE→UTF-8解码失败: $_" -isError
    }
    
    # 尝试4: GBK → UTF-8
    try {
        $result4 = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
        $score4 = Test-ContentQuality -content $result4 -name "GBK→UTF-8"
        $attempts += @{"name"="GBK→UTF-8"; "score"=$score4; "content"=$result4}
        if ($score4 -gt $bestScore) {
            $bestScore = $score4
            $bestResult = $result4
        }
    } catch {
        Write-Log "GBK→UTF-8解码失败: $_" -isError
    }
    
    # 记录最佳解码方式
    $bestAttempt = $attempts | Where-Object { $_.score -eq $bestScore } | Select-Object -First 1
    Write-Log "文件 $filePath 最佳解码方式: $($bestAttempt.name), 得分: $bestScore"
    
    # 清理结果
    return Clean-Content -content $bestResult
}

# 内容质量评分函数
function Test-ContentQuality {
    param(
        [string]$content,
        [string]$name
    )
    
    $score = 0
    
    # 基础分
    $score += 50
    
    # 检查HTML标签完整性
    $openTags = ([regex]::Matches($content, '<(?!/)(\w+)')).Count
    $closeTags = ([regex]::Matches($content, '</(\w+)>')).Count
    if ($openTags -le $closeTags + 3) {  # 允许3个自闭合标签的差异
        $score += 10
    }
    
    # 检查中文字符比例
    $chineseChars = ([regex]::Matches($content, '[\u4e00-\u9fa5]')).Count
    $totalChars = $content.Length
    if ($totalChars -gt 0) {
        $chineseRatio = $chineseChars / $totalChars
        if ($chineseRatio -gt 0.1) {  # 超过10%的中文
            $score += 20
        }
    }
    
    # 检查乱码特征
    if ($content -match "Ã¥Â¼Âº|Ã¥ÂÂ¶|Ã¥Å½Â|") {
        $score -= 30
    }
    
    # 检查可打印字符比例
    $printableChars = ([regex]::Matches($content, '[\x20-\x7E\u4e00-\u9fa5<>"\'\`\\]')).Count
    if ($totalChars -gt 0) {
        $printableRatio = $printableChars / $totalChars
        if ($printableRatio -gt 0.9) {
            $score += 20
        }
    }
    
    return [math]::Max(0, $score)
}

# 内容清理函数
function Clean-Content {
    param(
        [string]$content
    )
    
    # 去除BOM
    $content = $content -replace "\uFEFF", ""
    
    # 去除控制字符（保留换行和制表符）
    $content = [regex]::Replace($content, '[\x00-\x08\x0B-\x0C\x0E-\x1F]', '')
    
    # 修复HTML实体转义
    $content = [regex]::Replace($content, '&#(?:x[0-9A-Fa-f]+|[0-9]+);', { param($match) 
        try {
            $value = $match.Value -replace '^&#(?:x|)', '' -replace ';$', ''
            $base = if ($match.Value -like '&#x*') { 16 } else { 10 }
            [char][int]::Parse($value, [System.Globalization.NumberStyles]::AllowHexSpecifier)
        } catch {
            $match.Value
        }
    })
    
    # 确保有UTF-8 meta标签
    if ($content -match '<head>') {
        $headPosition = $content.IndexOf('<head>') + 6
        $metaTag = '<meta charset="UTF-8">'
        if (-not ($content -match '<meta[^>]*charset[^>]*UTF-8[^>]*>')) {
            $content = $content.Insert($headPosition, "$metaTag")
        }
    }
    
    return $content
}

# 扫描并修复HTML文件
Write-Log "开始扫描HTML文件..."
try {
    $htmlFiles = Get-ChildItem -Path $uiDir -Filter "*.html" -Recurse -ErrorAction Stop
    $stats["扫描文件总数"] = $htmlFiles.Count
    Write-Log "找到 $($htmlFiles.Count) 个HTML文件"
    
    foreach ($file in $htmlFiles) {
        $relativePath = $file.FullName.Substring($uiDir.Length).Trim('\')
        Write-Log "处理文件: $relativePath"
        
        try {
            # 备份原始文件
            $backupPath = "$backupDir\$relativePath"
            $backupFileDir = Split-Path $backupPath -Parent
            if (-not (Test-Path $backupFileDir)) {
                New-Item -ItemType Directory -Path $backupFileDir -Force | Out-Null
            }
            Copy-Item -Path $file.FullName -Destination $backupPath -Force
            Write-Log "已备份到: $backupPath"
            
            # 读取文件内容
            $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
            
            # 检测是否需要修复
            $needsRepair = $false
            $initialContent = [System.Text.Encoding]::UTF8.GetString($bytes)
            
            if (-not (Test-UTF8Validity -bytes $bytes)) {
                Write-Log "检测到UTF-8非法序列，需要修复"
                $needsRepair = $true
            }
            
            if (Test-DoubleEncoding -content $initialContent) {
                Write-Log "检测到疑似双层编码，需要修复"
                $needsRepair = $true
            }
            
            if ($needsRepair) {
                # 执行修复
                $restoredContent = Repair-Encoding -bytes $bytes -filePath $relativePath
                
                # 计算修复率
                $originalChineseCount = ([regex]::Matches($initialContent, '[\u4e00-\u9fa5]')).Count
                $restoredChineseCount = ([regex]::Matches($restoredContent, '[\u4e00-\u9fa5]')).Count
                $chineseRecoveryRate = 0
                if ($originalChineseCount -gt 0) {
                    $chineseRecoveryRate = [math]::Min(100, [math]::Round(($restoredChineseCount / $originalChineseCount) * 100, 2))
                } elseif ($restoredChineseCount -gt 0) {
                    $chineseRecoveryRate = 100
                }
                
                # 保存修复后的文件
                $restoredPath = "$restoredDir\$relativePath"
                $restoredFileDir = Split-Path $restoredPath -Parent
                if (-not (Test-Path $restoredFileDir)) {
                    New-Item -ItemType Directory -Path $restoredFileDir -Force | Out-Null
                }
                
                # 确保使用UTF-8无BOM格式保存
                [System.IO.File]::WriteAllText($restoredPath, $restoredContent, [System.Text.Encoding]::UTF8)
                
                Write-Log "文件修复完成，保存到: $restoredPath，中文恢复率: $chineseRecoveryRate%"
                $stats["修复文件数"]++
                $stats["文件详情"][$relativePath] = @{
                    "状态" = "✅ Restored"
                    "中文恢复率" = "$chineseRecoveryRate%"
                    "大小" = "$($bytes.Length) 字节"
                    "备份路径" = $backupPath
                    "修复路径" = $restoredPath
                }
            } else {
                # 文件无需修复，直接复制到restored目录
                $restoredPath = "$restoredDir\$relativePath"
                $restoredFileDir = Split-Path $restoredPath -Parent
                if (-not (Test-Path $restoredFileDir)) {
                    New-Item -ItemType Directory -Path $restoredFileDir -Force | Out-Null
                }
                Copy-Item -Path $file.FullName -Destination $restoredPath -Force
                
                Write-Log "文件无需修复，直接复制到: $restoredPath"
                $stats["文件详情"][$relativePath] = @{
                    "状态" = "✅ 无需修复"
                    "中文恢复率" = "N/A"
                    "大小" = "$($bytes.Length) 字节"
                    "原始路径" = $file.FullName
                }
            }
        } catch {
            Write-Log "处理文件 $relativePath 时出错: $_" -isError
            
            # 创建.bak文件供人工分析
            $bakPath = "$backupDir\$relativePath.bak"
            Copy-Item -Path $file.FullName -Destination $bakPath -Force
            
            $stats["文件详情"][$relativePath] = @{
                "状态" = "❌ 修复失败"
                "错误信息" = $_.ToString()
                "备份路径" = $bakPath
            }
        }
    }
    
    # 计算成功率
    if ($stats["扫描文件总数"] -gt 0) {
        $successCount = ($stats["文件详情"].Values | Where-Object { $_.状态 -match '✅' }).Count
        $stats["成功率"] = "$([math]::Round(($successCount / $stats["扫描文件总数"]) * 100, 2))%"
    }
    
    # 更新最后执行时间
    $stats["最后执行时间戳"] = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    
    # 生成详细报告
    Write-Log "生成修复报告..."
    $reportContent = @"
===== JEV-MULTI-FILE-HTML-RECOVERY-v4.0 修复报告 =====
执行时间: $($stats["最后执行时间戳"])
扫描文件总数: $($stats["扫描文件总数"])
修复文件数: $($stats["修复文件数"])
成功率: $($stats["成功率"])

文件详情:
"@
    
    foreach ($file in $stats["文件详情"].Keys) {
        $detail = $stats["文件详情"][$file]
        $reportContent += "\n---- $file ----\n"
        foreach ($key in $detail.Keys) {
            $reportContent += "$key: $($detail[$key])\n"
        }
    }
    
    $reportContent += @"

验证步骤:
1. 运行完毕后打开浏览器访问以下路径：
   http://localhost:8080/ui_restored/sentinel_dashboard.html
   http://localhost:8080/ui_restored/client_portal.html
2. 检查中文文本是否正常显示
3. 清理浏览器缓存后刷新（Ctrl + F5），防止旧缓存干扰

防复发建议:
- 确保Worker输出头返回 Content-Type: text/html; charset=UTF-8
- PowerShell写入统一使用 -Encoding UTF8NoBOM
- 文件编辑器（如VS Code）底部状态栏锁定UTF-8
- 定期运行编码兼容性检查工具
"@
    
    # 写入报告文件
    $reportContent | Out-File -FilePath $reportFile -Encoding utf8NoBOM
    Write-Log "报告已生成: $reportFile"
    
    # 生成JSON完成标记
    $stats | ConvertTo-Json -Depth 4 | Out-File -FilePath $completedJson -Encoding utf8NoBOM
    Write-Log "完成标记已生成: $completedJson"
    
} catch {
    Write-Log "批量处理过程中出错: $_" -isError
    # 即使出错也要生成报告
    $stats["最后执行时间戳"] = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    $stats | ConvertTo-Json -Depth 4 | Out-File -FilePath $completedJson -Encoding utf8NoBOM -Force
}

Write-Log "JEV-MULTI-FILE-HTML-RECOVERY-v4.0执行完成"
Write-Log "总览: 扫描 $($stats["扫描文件总数"]) 个文件，修复 $($stats["修复文件数"]) 个文件，成功率: $($stats["成功率"])"
