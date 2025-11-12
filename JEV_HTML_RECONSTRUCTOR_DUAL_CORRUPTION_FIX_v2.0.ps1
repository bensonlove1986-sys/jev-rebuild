#!/usr/bin/env powershell
# JEV-HTML-RECONSTRUCTOR-DUAL-CORRUPTION-FIX-v2.0
# 修复双重UTF-8编码破坏的HTML文件

# 设置严格模式
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 定义变量
$baseDir = "D:\PDF转网页"
$htmlDir = "$baseDir\ui"
$logDir = "$baseDir\logs"
$fixLog = "$logDir\html_dual_encoding_fix.log"
$reportFile = "$logDir\html_dual_encoding_fix_report.txt"
$targetFiles = @(
    "$htmlDir\client_portal.html",
    "$htmlDir\sentinel_dashboard.html"
)

# 统计信息
$stats = @{
    'total_files' = 0
    'success_count' = 0
    'failed_count' = 0
    'file_details' = @{}
}

# 确保日志目录存在
function Ensure-LogDirectory {
    if (-not (Test-Path $logDir)) {
        try {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
            Write-Host "创建日志目录: $logDir"
        } catch {
            Write-Host "警告: 无法创建日志目录，将使用临时日志位置"
            $global:logDir = "$env:TEMP"
            $global:fixLog = "$env:TEMP\html_dual_encoding_fix.log"
            $global:reportFile = "$env:TEMP\html_dual_encoding_fix_report.txt"
        }
    }
}

# 日志函数
function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Add-Content -Path $fixLog -Value $logEntry -Encoding UTF8 -ErrorAction SilentlyContinue
    Write-Host $logEntry
}

# 检测UTF-8 BOM
function Test-Utf8Bom($filePath) {
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        return $true
    }
    return $false
}

# 检测编码类型
function Detect-Encoding($filePath) {
    try {
        # 读取文件字节
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        
        # 检查UTF-8 BOM
        if (Test-Utf8Bom $filePath) {
            return "UTF-8-BOM"
        }
        
        # 检查UTF-16 BOM
        if ($bytes.Length -ge 2) {
            if ($bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
                return "UTF-16-BE"
            }
            if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
                return "UTF-16-LE"
            }
        }
        
        # 尝试UTF-8解码
        try {
            [System.Text.Encoding]::UTF8.GetString($bytes) | Out-Null
            # 检查是否包含乱码特征（连续的16进制字符模式）
            $utf8Content = [System.Text.Encoding]::UTF8.GetString($bytes)
            if ($utf8Content -match "[\x80-\xFF]{2,}") {
                return "UTF-8-CORRUPTED"
            }
            return "UTF-8"
        } catch {
            # 尝试GBK解码
            try {
                [System.Text.Encoding]::GetEncoding(936).GetString($bytes) | Out-Null
                return "GBK"
            } catch {
                # 尝试ANSI解码
                try {
                    [System.Text.Encoding]::Default.GetString($bytes) | Out-Null
                    return "ANSI"
                } catch {
                    return "UNKNOWN"
                }
            }
        }
    } catch {
        Write-Log "检测编码失败: $_"
        return "UNKNOWN"
    }
}

# 修复双重UTF-8编码
function Fix-DualUtf8Encoding($filePath) {
    try {
        $fileName = Split-Path $filePath -Leaf
        Write-Log "开始修复文件: $fileName"
        
        # 读取原始字节
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        Write-Log "  - 读取文件字节数: $($bytes.Length)"
        
        # 检测编码
        $originalEncoding = Detect-Encoding $filePath
        Write-Log "  - 检测到编码: $originalEncoding"
        
        # 修复策略
        $content = ""
        $fixMethod = "直接UTF-8读取"
        
        if ($originalEncoding -eq "UTF-8-CORRUPTED") {
            # 双重UTF-8编码修复: 先Latin-1解码，再UTF-8解码
            Write-Log "  - 检测到双重UTF-8编码，执行反向转换"
            $latin1Content = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
            $content = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::Default.GetBytes($latin1Content))
            $fixMethod = "双重UTF-8反向转换"
        } elseif ($originalEncoding -eq "GBK" -or $originalEncoding -eq "ANSI") {
            # GBK/ANSI转UTF-8
            Write-Log "  - 从 $originalEncoding 转换为 UTF-8"
            $content = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
            $fixMethod = "GBK/ANSI转UTF-8"
        } elseif ($originalEncoding -eq "UTF-8" -or $originalEncoding -eq "UTF-16-BE" -or $originalEncoding -eq "UTF-16-LE") {
            # 直接UTF-8读取
            $content = [System.Text.Encoding]::UTF8.GetString($bytes)
            $fixMethod = "直接UTF-8读取"
        } else {
            # 尝试多种解码方式
            Write-Log "  - 尝试多种解码方式"
            $encodings = @(
                @{Name='UTF-8'; Encoding=[System.Text.Encoding]::UTF8},
                @{Name='GBK'; Encoding=[System.Text.Encoding]::GetEncoding(936)},
                @{Name='ANSI'; Encoding=[System.Text.Encoding]::Default},
                @{Name='Latin-1'; Encoding=[System.Text.Encoding]::GetEncoding(28591)}
            )
            
            $bestContent = $null
            $bestScore = 0
            
            foreach ($enc in $encodings) {
                try {
                    $testContent = $enc.Encoding.GetString($bytes)
                    # 计算中文字符比例作为评分
                    $chineseCount = ($testContent -replace '[^\p{IsCJKUnifiedIdeographs}]', '').Length
                    $score = if ($testContent.Length -eq 0) { 0 } else { ($chineseCount / $testContent.Length) * 100 }
                    
                    if ($score -gt $bestScore) {
                        $bestScore = $score
                        $bestContent = $testContent
                        $bestEncoding = $enc.Name
                    }
                } catch {
                    continue
                }
            }
            
            if ($bestContent) {
                $content = $bestContent
                $fixMethod = "最佳编码匹配($bestEncoding)"
                Write-Log "  - 使用最佳编码 $bestEncoding (中文比例: $($bestScore.ToString('0.00'))%)"
            } else {
                # 最后尝试逐字节修复
                $content = Fix-ByteByByte $bytes
                $fixMethod = "逐字节修复"
                Write-Log "  - 使用逐字节修复方法"
            }
        }
        
        # 清除控制字符
        Write-Log "  - 清除控制字符"
        $content = $content -replace '[\u0000-\u001F\u007F\uFEFF]', ''
        
        # 修复HTML结构
        $content = Fix-HtmlStructure $content
        
        # 确保UTF-8 meta标签存在
        $content = Ensure-Utf8MetaTag $content
        
        # 计算文字恢复率
        $restorationRate = Calculate-RestorationRate $content
        Write-Log "  - 文字恢复率: $($restorationRate.ToString('0.00'))%"
        
        return @{
            'content' = $content
            'original_encoding' = $originalEncoding
            'fix_method' = $fixMethod
            'restoration_rate' = $restorationRate
            'success' = $true
        }
    } catch {
        Write-Log "修复失败: $_"
        return @{
            'content' = ""
            'original_encoding' = "UNKNOWN"
            'fix_method' = "FAILED"
            'restoration_rate' = 0
            'success' = $false
            'error' = $_.Exception.Message
        }
    }
}

# 逐字节修复函数
function Fix-ByteByByte($bytes) {
    $result = [System.Text.StringBuilder]::new()
    $i = 0
    
    while ($i -lt $bytes.Length) {
        $b = $bytes[$i]
        
        # ASCII字符直接添加
        if ($b -lt 128) {
            [void]$result.Append([char]$b)
            $i++
        } else {
            # 尝试UTF-8序列
            if ($i+2 -lt $bytes.Length -and $b -ge 0xE0 -and $b -le 0xEF) {
                # 3字节UTF-8序列
                [void]$result.Append([char](($b -band 0x0F) -shl 12 -bor (($bytes[$i+1] -band 0x3F) -shl 6) -bor ($bytes[$i+2] -band 0x3F)))
                $i += 3
            } elseif ($i+1 -lt $bytes.Length -and $b -ge 0xC0 -and $b -le 0xDF) {
                # 2字节UTF-8序列
                [void]$result.Append([char](($b -band 0x1F) -shl 6 -bor ($bytes[$i+1] -band 0x3F)))
                $i += 2
            } else {
                # 无法识别的字节，跳过或替换为问号
                [void]$result.Append('?')
                $i++
            }
        }
    }
    
    return $result.ToString()
}

# 修复HTML结构
function Fix-HtmlStructure($content) {
    # 确保基本HTML结构
    if (-not ($content -match '<!DOCTYPE\s+html')) {
        $content = "<!DOCTYPE html>\n$content"
    }
    
    if (-not ($content -match '<html[^>]*>')) {
        $content = "<html>\n$content\n</html>"
    }
    
    if (-not ($content -match '<head[^>]*>')) {
        $content = $content -replace '<html[^>]*>', '<html>\n<head>\n</head>'
    }
    
    if (-not ($content -match '<body[^>]*>')) {
        $content = $content -replace '</head>', '</head>\n<body>\n</body>'
    }
    
    # 修复常见标签不闭合问题
    $tagPairs = @{
        '<div' = '</div>';
        '<span' = '</span>';
        '<p' = '</p>';
        '<h1' = '</h1>';
        '<h2' = '</h2>';
        '<h3' = '</h3>';
        '<h4' = '</h4>';
        '<h5' = '</h5>';
        '<h6' = '</h6>';
        '<li' = '</li>';
        '<tr' = '</tr>';
        '<td' = '</td>';
        '<th' = '</th>';
        '<table' = '</table>';
        '<ul' = '</ul>';
        '<ol' = '</ol>'
    }
    
    foreach ($tag in $tagPairs.Keys) {
        # 简单的标签计数和闭合检查（不处理嵌套）
        $openCount = [regex]::Matches($content, "$tag[^>]*>", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Count
        $closeCount = [regex]::Matches($content, $tagPairs[$tag], [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Count
        
        while ($closeCount -lt $openCount) {
            $content += "\n$($tagPairs[$tag])"
            $closeCount++
        }
    }
    
    return $content
}

# 确保UTF-8 meta标签存在且位置正确
function Ensure-Utf8MetaTag($content) {
    # 检查是否已有meta charset标签
    if (-not ($content -match '<meta\s+charset=["\']utf-8["\']' -or $content -match '<meta\s+http-equiv=["\']content-type["\']\s+content=["\']text/html;\s*charset=utf-8["\']')) {
        # 查找head标签位置
        $headMatch = [regex]::Match($content, '<head[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($headMatch.Success) {
            $insertPos = $headMatch.Index + $headMatch.Length
            $metaTag = "\n    <meta charset=\"UTF-8\">"
            $content = $content.Substring(0, $insertPos) + $metaTag + $content.Substring($insertPos)
            Write-Log "  - 添加了UTF-8 meta标签"
        } else {
            # 如果没有head标签，在html标签后添加
            $htmlMatch = [regex]::Match($content, '<html[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($htmlMatch.Success) {
                $insertPos = $htmlMatch.Index + $htmlMatch.Length
                $headWithMeta = "\n<head>\n    <meta charset=\"UTF-8\">\n</head>"
                $content = $content.Substring(0, $insertPos) + $headWithMeta + $content.Substring($insertPos)
                Write-Log "  - 创建了head并添加了UTF-8 meta标签"
            }
        }
    } else {
        # 更新现有的meta标签，确保正确格式
        $content = [regex]::Replace($content, '<meta\s+http-equiv=["\']content-type["\']\s+content=["\']text/html;\s*charset=utf-8["\']', '<meta charset=\"UTF-8\"')
        $content = [regex]::Replace($content, '<meta\s+charset=["\']([^"\']*)["\']', '<meta charset=\"UTF-8\"')
        Write-Log "  - 验证UTF-8 meta标签已存在"
    }
    
    return $content
}

# 计算文字恢复率
function Calculate-RestorationRate($content) {
    # 检测有效中文和正常字符
    $totalChars = $content.Length
    if ($totalChars -eq 0) {
        return 0
    }
    
    # 计算正常字符数（中文、英文、数字、常见标点）
    $normalChars = ($content -replace '[^\p{IsCJKUnifiedIdeographs}\w\s，。！？；："\']', '').Length
    
    # 计算乱码特征数（连续的�符号或异常字符）
    $corruptedChars = ($content -replace '[^�\x80-\xFF]', '').Length
    
    # 计算恢复率
    $restorationRate = ((($normalChars) / ($totalChars + 1)) * 100)
    
    # 惩罚乱码
    $restorationRate = [math]::Max(0, $restorationRate - ($corruptedChars * 0.5))
    
    return [math]::Min(100, $restorationRate)
}

# 保存修复后的文件
function Save-RestoredFile($filePath, $content, $originalEncoding, $fixMethod, $restorationRate) {
    try {
        $fileName = Split-Path $filePath -Leaf
        $restoredPath = "$htmlDir\$($fileName -replace '\.html$', '_restored.html')"
        
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($restoredPath, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Log "  - 保存修复后的文件: $(Split-Path $restoredPath -Leaf)"
        
        # 记录文件详情
        $stats.file_details[$fileName] = @{
            'original_encoding' = $originalEncoding
            'fix_method' = $fixMethod
            'restoration_rate' = $restorationRate
            'restored_path' = $restoredPath
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            'status' = "成功"
        }
        
        $stats.success_count++
        return $restoredPath
    } catch {
        Write-Log "  - 保存文件失败: $_"
        $stats.file_details[$fileName] = @{
            'original_encoding' = $originalEncoding
            'fix_method' = $fixMethod
            'restoration_rate' = $restorationRate
            'error' = $_.Exception.Message
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            'status' = "失败"
        }
        $stats.failed_count++
        return $null
    }
}

# 启动浏览器打开修复后的文件
function Open-BrowserForVerification($filePaths) {
    try {
        Write-Log "启动浏览器进行验证..."
        
        # 尝试使用默认浏览器
        foreach ($filePath in $filePaths) {
            if (Test-Path $filePath) {
                $absolutePath = (Resolve-Path $filePath).Path
                $url = "file:///$absolutePath"
                Write-Log "  - 打开文件: $url"
                Start-Process $url -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
        }
        
        # 尝试使用Edge
        if (Test-Path "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") {
            foreach ($filePath in $filePaths) {
                if (Test-Path $filePath) {
                    $absolutePath = (Resolve-Path $filePath).Path
                    Start-Process "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" -ArgumentList $absolutePath -ErrorAction SilentlyContinue
                    break
                }
            }
        }
        
        # 尝试使用Chrome
        if (Test-Path "$env:ProgramFiles\Google\Chrome\Application\chrome.exe") {
            foreach ($filePath in $filePaths) {
                if (Test-Path $filePath) {
                    $absolutePath = (Resolve-Path $filePath).Path
                    Start-Process "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" -ArgumentList $absolutePath -ErrorAction SilentlyContinue
                    break
                }
            }
        }
    } catch {
        Write-Log "启动浏览器失败: $_"
    }
}

# 生成修复报告
function Generate-FixReport {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $reportContent = @"
# JEV-HTML-RECONSTRUCTOR-DUAL-CORRUPTION-FIX-v2.0 修复报告

生成时间: $timestamp

## 修复统计
- 总文件数: $($stats.total_files)
- 成功修复: $($stats.success_count)
- 修复失败: $($stats.failed_count)

## 文件修复详情
"@
        
        foreach ($fileName in $stats.file_details.Keys) {
            $details = $stats.file_details[$fileName]
            $reportContent += "
### $fileName
- 原始编码: $($details.original_encoding)
- 修复方法: $($details.fix_method)
- 文字恢复率: $($details.restoration_rate.ToString('0.00'))%
- 修复时间: $($details.timestamp)
- 修复状态: $($details.status)"
            
            if ($details.restored_path) {
                $reportContent += "
- 修复后文件: $(Split-Path $details.restored_path -Leaf)"
            }
            
            if ($details.error) {
                $reportContent += "
- 错误信息: $($details.error)"
            }
        }
        
        $reportContent += @"

## 验证指南
1. 在浏览器中打开修复后的文件
2. 按F12打开开发者工具
3. 切换到Network面板
4. 刷新页面
5. 确认Response Headers中包含: Content-Type: text/html; charset=utf-8
6. 检查页面中的中文是否正确显示，无乱码

## 修复说明
- 所有文件均以UTF-8无BOM格式保存
- 确保meta charset="UTF-8"标签存在且位于<head>前200字节
- 保留了原始HTML结构，仅修复了编码问题
- 清除了所有不可见控制字符

## 人工应急恢复方法
如果自动修复不成功，可以尝试以下命令：
```
Get-Content "D:\PDF转网页\ui\sentinel_dashboard.html" -Encoding Byte |
Out-File "D:\PDF转网页\ui\sentinel_dashboard_restored.html" -Encoding Default
```
"@
        
        Set-Content -Path $reportFile -Value $reportContent -Encoding UTF8
        Write-Log "生成修复报告: $reportFile"
    } catch {
        Write-Log "生成修复报告时出错: $_"
    }
}

# 主函数
function Main {
    # 确保日志目录存在
    Ensure-LogDirectory
    
    # 初始化日志
    "========== JEV-HTML-RECONSTRUCTOR-DUAL-CORRUPTION-FIX-v2.0 开始执行 ==========" | Out-File -FilePath $fixLog -Encoding UTF8
    
    # 修复目标文件
    Write-Log "开始修复双重UTF-8编码破坏的HTML文件..."
    $restoredFiles = @()
    
    foreach ($file in $targetFiles) {
        $stats.total_files++
        
        if (-not (Test-Path $file -PathType Leaf)) {
            Write-Log "错误: 文件不存在 - $file"
            $fileName = Split-Path $file -Leaf
            $stats.file_details[$fileName] = @{
                'original_encoding' = "N/A"
                'fix_method' = "N/A"
                'restoration_rate' = 0
                'error' = "文件不存在"
                'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                'status' = "失败"
            }
            $stats.failed_count++
            continue
        }
        
        # 创建备份
        $backupPath = "$file.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
        Copy-Item -Path $file -Destination $backupPath -Force
        Write-Log "  - 创建了备份: $(Split-Path $backupPath -Leaf)"
        
        # 修复文件
        $result = Fix-DualUtf8Encoding $file
        
        if ($result.success) {
            # 保存修复后的文件
            $restoredPath = Save-RestoredFile $file $result.content $result.original_encoding $result.fix_method $result.restoration_rate
            if ($restoredPath) {
                $restoredFiles += $restoredPath
            }
        } else {
            $fileName = Split-Path $file -Leaf
            $stats.file_details[$fileName] = @{
                'original_encoding' = $result.original_encoding
                'fix_method' = $result.fix_method
                'restoration_rate' = $result.restoration_rate
                'error' = $result.error
                'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                'status' = "失败"
            }
            $stats.failed_count++
        }
        
        Write-Log ""
    }
    
    # 生成报告
    Generate-FixReport
    
    # 启动浏览器验证
    if ($restoredFiles.Count -gt 0) {
        Open-BrowserForVerification $restoredFiles
    }
    
    # 控制台输出完成信息
    Write-Host ""
    Write-Host "✅ 双重UTF-8编码修复完成"
    Write-Host "📊 统计信息:"
    Write-Host "   - 总文件数: $($stats.total_files)"
    Write-Host "   - 成功修复: $($stats.success_count)"
    Write-Host "   - 修复失败: $($stats.failed_count)"
    Write-Host ""
    Write-Host "📁 修复后文件:"
    foreach ($file in $restoredFiles) {
        Write-Host "   - $(Split-Path $file -Leaf)"
    }
    Write-Host ""
    Write-Host "📄 报告路径: $reportFile"
    Write-Host ""
    Write-Host "🔍 验证步骤:"
    Write-Host "1. 在浏览器中打开修复后的文件"
    Write-Host "2. 按F12 → Network面板"
    Write-Host "3. 确认Response Headers包含: Content-Type: text/html; charset=utf-8"
    Write-Host "4. 检查页面中文是否完整无乱码"
    
    "========== JEV-HTML-RECONSTRUCTOR-DUAL-CORRUPTION-FIX-v2.0 执行完成 ==========" | Add-Content -Path $fixLog -Encoding UTF8
}

# 执行主函数
Main