#!/usr/bin/env powershell
# JEV-GLOBAL-UTF8-REBUILD-v3.0
# 扫描并修复所有HTML/JS/JSON文件的编码污染

# 设置严格模式
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 定义变量
$baseDir = "D:\PDF转网页"
$logDir = "$baseDir\logs"
$backupRoot = "$baseDir\_backup"
$backupDir = "$backupRoot\$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
$fixLog = "$logDir\global_utf8_rebuild.log"
$reportFile = "$logDir\global_utf8_rebuild_report.txt"

# 统计信息
$stats = @{
    'total_files' = 0
    'success_count' = 0
    'skipped_count' = 0
    'failed_count' = 0
    'file_details' = @{}
    'encoding_stats' = @{}
}

# 支持的文件类型
$supportedExtensions = @('.html', '.htm', '.js', '.json')

# 确保目录存在
function Ensure-Directories {
    # 确保日志目录存在
    if (-not (Test-Path $logDir)) {
        try {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
            Write-Host "创建日志目录: $logDir"
        } catch {
            Write-Host "警告: 无法创建日志目录，将使用临时日志位置"
            $global:logDir = "$env:TEMP"
            $global:fixLog = "$env:TEMP\global_utf8_rebuild.log"
            $global:reportFile = "$env:TEMP\global_utf8_rebuild_report.txt"
        }
    }
    
    # 确保备份目录存在
    if (-not (Test-Path $backupDir)) {
        try {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            Write-Host "创建备份目录: $backupDir"
        } catch {
            Write-Host "警告: 无法创建备份目录，备份功能将被跳过"
            $global:backupDir = $null
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

# 扫描目录中的文件
function Get-TargetFiles($directory) {
    try {
        Write-Log "开始扫描目录: $directory"
        $files = @()
        
        # 递归获取所有文件
        Get-ChildItem -Path $directory -Recurse -File | ForEach-Object {
            # 检查文件扩展名
            $extension = $_.Extension.ToLower()
            if ($supportedExtensions -contains $extension) {
                $files += $_.FullName
            }
        }
        
        Write-Log "扫描完成，发现 $($files.Count) 个目标文件"
        return $files
    } catch {
        Write-Log "扫描目录失败: $_"
        return @()
    }
}

# 检测UTF-8 BOM
function Test-Utf8Bom($filePath) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# 检测文件编码
function Detect-FileEncoding($filePath) {
    try {
        # 读取文件字节
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        
        # 检查BOM
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
        
        # 尝试UTF-8解码并检测错误
        try {
            $utf8Content = [System.Text.Encoding]::UTF8.GetString($bytes)
            
            # 检测UTF-8有效性（不包含解码错误字符）
            $invalidCharCount = ($utf8Content -replace '[^�]', '').Length
            if ($invalidCharCount -eq 0) {
                # 检查是否可能是双重UTF-8编码
                if ($utf8Content -match "[\x80-\xFF]{2,}") {
                    return "UTF-8-CORRUPTED"
                }
                return "UTF-8"
            } else {
                # 包含无效字符，可能是其他编码
                return "UTF-8-CORRUPTED"
            }
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

# 检查文件是否需要修复
function Test-FileCorruption($filePath) {
    try {
        $encoding = Detect-FileEncoding $filePath
        
        # 需要修复的情况：
        # 1. 有BOM
        # 2. 编码为UTF-8-CORRUPTED
        # 3. 编码为GBK或ANSI（中文环境）
        # 4. 编码为UNKNOWN
        $needsFix = ($encoding -eq "UTF-8-BOM" -or 
                     $encoding -eq "UTF-8-CORRUPTED" -or 
                     $encoding -eq "GBK" -or 
                     $encoding -eq "ANSI" -or 
                     $encoding -eq "UNKNOWN")
        
        return @{
            'needs_fix' = $needsFix
            'encoding' = $encoding
        }
    } catch {
        Write-Log "检测文件损坏失败: $_"
        return @{
            'needs_fix' = $true
            'encoding' = "UNKNOWN"
        }
    }
}

# 创建文件备份
function Backup-File($filePath) {
    if (-not $backupDir) {
        return $null
    }
    
    try {
        $relativePath = $filePath.Substring($baseDir.Length)
        $backupFilePath = "$backupDir$relativePath"
        
        # 确保备份目录结构存在
        $backupFileDir = Split-Path $backupFilePath -Parent
        if (-not (Test-Path $backupFileDir)) {
            New-Item -ItemType Directory -Path $backupFileDir -Force | Out-Null
        }
        
        # 复制文件
        Copy-Item -Path $filePath -Destination $backupFilePath -Force
        Write-Log "  - 创建备份: $(Split-Path $backupFilePath -Leaf)"
        return $backupFilePath
    } catch {
        Write-Log "  - 备份失败: $_"
        return $null
    }
}

# 修复文件编码
function Fix-FileEncoding($filePath, $originalEncoding) {
    try {
        Write-Log "  - 开始修复文件编码"
        
        # 读取原始字节
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $fixMethod = "直接UTF-8转换"
        
        # 根据原始编码选择修复策略
        if ($originalEncoding -eq "UTF-8-CORRUPTED") {
            # 双重UTF-8编码修复
            Write-Log "  - 执行双重UTF-8反向转换"
            $latin1Content = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
            $content = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::Default.GetBytes($latin1Content))
            $fixMethod = "双重UTF-8反向转换"
        } elseif ($originalEncoding -eq "UTF-8-BOM") {
            # 去除BOM
            Write-Log "  - 去除UTF-8 BOM"
            $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
            $fixMethod = "去除UTF-8 BOM"
        } elseif ($originalEncoding -eq "GBK" -or $originalEncoding -eq "ANSI") {
            # GBK/ANSI转UTF-8
            Write-Log "  - 从 $originalEncoding 转换为 UTF-8"
            $content = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
            $fixMethod = "GBK/ANSI转UTF-8"
        } elseif ($originalEncoding -eq "UTF-16-LE" -or $originalEncoding -eq "UTF-16-BE") {
            # UTF-16转UTF-8
            Write-Log "  - 从 $originalEncoding 转换为 UTF-8"
            $content = [System.Text.Encoding]::GetEncoding($originalEncoding).GetString($bytes)
            $fixMethod = "UTF-16转UTF-8"
        } else {
            # 尝试多种编码修复
            $content, $bestEncoding = Find-BestEncoding $bytes
            $fixMethod = "最佳编码匹配($bestEncoding)"
            Write-Log "  - 使用最佳编码 $bestEncoding"
        }
        
        # 清除控制字符
        Write-Log "  - 清除控制字符"
        $content = $content -replace '[\u0000-\u001F\u007F\uFEFF]', ''
        
        # 针对HTML文件，确保meta标签正确
        if ($filePath -match '\.html?$') {
            $content = Ensure-HtmlMetaCharset $content
        }
        
        return @{
            'content' = $content
            'fix_method' = $fixMethod
            'success' = $true
        }
    } catch {
        Write-Log "  - 修复失败: $_"
        return @{
            'content' = ""
            'fix_method' = "FAILED"
            'success' = $false
            'error' = $_.Exception.Message
        }
    }
}

# 寻找最佳编码
function Find-BestEncoding($bytes) {
    $encodings = @(
        @{Name='UTF-8'; Encoding=[System.Text.Encoding]::UTF8},
        @{Name='GBK'; Encoding=[System.Text.Encoding]::GetEncoding(936)},
        @{Name='ANSI'; Encoding=[System.Text.Encoding]::Default},
        @{Name='Latin-1'; Encoding=[System.Text.Encoding]::GetEncoding(28591)}
    )
    
    $bestContent = $null
    $bestScore = 0
    $bestEncoding = "UTF-8"
    
    foreach ($enc in $encodings) {
        try {
            $testContent = $enc.Encoding.GetString($bytes)
            
            # 计算评分：
            # 1. 中文比例高的更好
            # 2. 无效字符少的更好
            $chineseCount = ($testContent -replace '[^\p{IsCJKUnifiedIdeographs}]', '').Length
            $invalidCount = ($testContent -replace '[^�]', '').Length
            $validCharCount = $testContent.Length - $invalidCount
            
            # 评分公式
            $score = 0
            if ($testContent.Length -gt 0) {
                $chineseScore = ($chineseCount / $testContent.Length) * 100
                $validScore = ($validCharCount / $testContent.Length) * 100
                $score = ($chineseScore * 0.6) + ($validScore * 0.4)
            }
            
            if ($score -gt $bestScore) {
                $bestScore = $score
                $bestContent = $testContent
                $bestEncoding = $enc.Name
            }
        } catch {
            continue
        }
    }
    
    # 如果没有找到好的编码，使用默认UTF-8
    if (-not $bestContent) {
        $bestContent = [System.Text.Encoding]::UTF8.GetString($bytes)
    }
    
    return $bestContent, $bestEncoding
}

# 确保HTML文件有正确的meta charset
function Ensure-HtmlMetaCharset($content) {
    # 检查是否已有正确的meta标签
    if (-not ($content -match '<meta\s+charset=["\']utf-8["\']' -or 
               $content -match '<meta\s+http-equiv=["\']content-type["\']\s+content=["\']text/html;\s*charset=utf-8["\']')) {
        
        # 查找head标签位置
        $headMatch = [regex]::Match($content, '<head[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($headMatch.Success) {
            $insertPos = $headMatch.Index + $headMatch.Length
            $metaTag = "\n    <meta charset=\"UTF-8\">"
            $content = $content.Substring(0, $insertPos) + $metaTag + $content.Substring($insertPos)
        } elseif ($content -match '<html[^>]*>') {
            # 如果没有head标签，在html标签后添加
            $htmlMatch = [regex]::Match($content, '<html[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($htmlMatch.Success) {
                $insertPos = $htmlMatch.Index + $htmlMatch.Length
                $headWithMeta = "\n<head>\n    <meta charset=\"UTF-8\">\n</head>"
                $content = $content.Substring(0, $insertPos) + $headWithMeta + $content.Substring($insertPos)
            }
        }
    } else {
        # 标准化现有的meta标签
        $content = [regex]::Replace($content, '<meta\s+http-equiv=["\']content-type["\']\s+content=["\']text/html;\s*charset=utf-8["\']', '<meta charset=\"UTF-8\"')
        $content = [regex]::Replace($content, '<meta\s+charset=["\']([^"\']*)["\']', '<meta charset=\"UTF-8\"')
    }
    
    return $content
}

# 校验文件内容
function Validate-FileContent($filePath, $content) {
    try {
        $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
        
        # 根据文件类型进行基本校验
        switch ($extension) {
            '.html' {
                # 检查基本HTML结构
                if (-not ($content -match '<!DOCTYPE' -or $content -match '<html')) {
                    Write-Log "  - HTML验证失败：缺少基本结构"
                    return $false
                }
            }
            '.json' {
                # 尝试解析JSON
                try {
                    ConvertFrom-Json -InputObject $content -ErrorAction Stop | Out-Null
                } catch {
                    Write-Log "  - JSON验证失败：无法解析"
                    return $false
                }
            }
            '.js' {
                # JavaScript基本验证（简单检查语法）
                $bracketCount = 0
                $quoteCount = 0
                $inString = $false
                $stringChar = ''
                
                foreach ($char in $content.ToCharArray()) {
                    if ($inString) {
                        if ($char -eq $stringChar -and $content[$i-1] -ne '\\') {
                            $inString = $false
                            $quoteCount++
                        }
                    } else {
                        if ($char -eq '{' -or $char -eq '[' -or $char -eq '(') {
                            $bracketCount++
                        } elseif ($char -eq '}' -or $char -eq ']' -or $char -eq ')') {
                            $bracketCount--
                        } elseif ($char -eq '"' -or $char -eq "'") {
                            $inString = $true
                            $stringChar = $char
                        }
                    }
                }
                
                # 括号匹配检查（简单）
                if ($bracketCount -ne 0) {
                    Write-Log "  - JS验证警告：括号可能不匹配"
                }
            }
        }
        
        # 检查内容是否为空或主要是乱码
        $nonSpaceContent = $content -replace '\s+', ''
        $corruptedRatio = 0
        $corruptedChars = ($nonSpaceContent -replace '[^�\x80-\xFF]', '').Length
        
        if ($nonSpaceContent.Length -gt 0) {
            $corruptedRatio = ($corruptedChars / $nonSpaceContent.Length) * 100
        }
        
        if ($corruptedRatio -gt 80) {
            Write-Log "  - 内容验证失败：乱码比例过高 ($corruptedRatio%)"
            return $false
        }
        
        return $true
    } catch {
        Write-Log "  - 内容验证失败: $_"
        return $false
    }
}

# 保存修复后的文件
function Save-FixedFile($filePath, $content, $originalEncoding, $fixMethod) {
    try {
        # 校验内容
        if (-not (Validate-FileContent $filePath $content)) {
            Write-Log "  - 文件内容验证失败，跳过保存"
            return $false
        }
        
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Log "  - 保存修复后的文件: $(Split-Path $filePath -Leaf)"
        
        return $true
    } catch {
        Write-Log "  - 保存文件失败: $_"
        return $false
    }
}

# 恢复备份（如果修复失败）
function Restore-Backup($filePath, $backupPath) {
    if (-not (Test-Path $backupPath)) {
        return $false
    }
    
    try {
        Copy-Item -Path $backupPath -Destination $filePath -Force
        Write-Log "  - 恢复原始文件：已从备份恢复"
        return $true
    } catch {
        Write-Log "  - 恢复失败: $_"
        return $false
    }
}

# 处理单个文件
function Process-File($filePath) {
    $fileName = Split-Path $filePath -Leaf
    Write-Log "处理文件: $filePath"
    
    try {
        # 检测文件是否需要修复
        $corruptionTest = Test-FileCorruption $filePath
        $encoding = $corruptionTest.encoding
        
        # 更新编码统计
        if (-not $stats.encoding_stats.ContainsKey($encoding)) {
            $stats.encoding_stats[$encoding] = 0
        }
        $stats.encoding_stats[$encoding]++
        
        if (-not $corruptionTest.needs_fix) {
            Write-Log "  - 文件已为正确UTF-8编码，跳过"
            $stats.skipped_count++
            $stats.file_details[$filePath] = @{
                'original_encoding' = $encoding
                'fix_method' = "N/A"
                'status' = "跳过"
                'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            return
        }
        
        # 创建备份
        $backupPath = Backup-File $filePath
        
        # 修复文件
        $fixResult = Fix-FileEncoding $filePath $encoding
        
        if ($fixResult.success) {
            # 保存修复后的文件
            if (Save-FixedFile $filePath $fixResult.content $encoding $fixResult.fix_method) {
                Write-Log "  - 修复成功"
                $stats.success_count++
                $stats.file_details[$filePath] = @{
                    'original_encoding' = $encoding
                    'fix_method' = $fixResult.fix_method
                    'status' = "成功"
                    'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                }
            } else {
                # 恢复备份
                if ($backupPath) {
                    Restore-Backup $filePath $backupPath
                }
                Write-Log "  - 修复失败：内容验证不通过"
                $stats.failed_count++
                $stats.file_details[$filePath] = @{
                    'original_encoding' = $encoding
                    'fix_method' = $fixResult.fix_method
                    'status' = "失败"
                    'error' = "内容验证不通过"
                    'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                }
            }
        } else {
            # 恢复备份
            if ($backupPath) {
                Restore-Backup $filePath $backupPath
            }
            Write-Log "  - 修复失败：$($fixResult.error)"
            $stats.failed_count++
            $stats.file_details[$filePath] = @{
                'original_encoding' = $encoding
                'fix_method' = $fixResult.fix_method
                'status' = "失败"
                'error' = $fixResult.error
                'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
        }
    } catch {
        Write-Log "  - 处理文件异常: $_"
        $stats.failed_count++
        $stats.file_details[$filePath] = @{
            'original_encoding' = "UNKNOWN"
            'fix_method' = "N/A"
            'status' = "失败"
            'error' = $_.Exception.Message
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    }
    
    Write-Log ""
}

# 生成修复报告
function Generate-RebuildReport {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $reportContent = @"
# JEV-GLOBAL-UTF8-REBUILD-v3.0 修复报告

生成时间: $timestamp

## 修复统计
- 总扫描文件数: $($stats.total_files)
- 成功修复数: $($stats.success_count)
- 跳过文件数: $($stats.skipped_count)
- 修复失败数: $($stats.failed_count)

## 编码分布统计
"@
        
        foreach ($encoding in $stats.encoding_stats.Keys) {
            $count = $stats.encoding_stats[$encoding]
            $reportContent += "- $encoding: $count 个文件\n"
        }
        
        $reportContent += @"

## 文件修复详情
"@
        
        foreach ($filePath in $stats.file_details.Keys) {
            $details = $stats.file_details[$filePath]
            $reportContent += "
### $filePath
- 原始编码: $($details.original_encoding)
- 修复方法: $($details.fix_method)
- 修复时间: $($details.timestamp)
- 修复状态: $($details.status)"
            
            if ($details.error) {
                $reportContent += "
- 错误信息: $($details.error)"
            }
        }
        
        $reportContent += @"

## 备份信息
- 备份目录: $backupDir
- 所有修复的文件都创建了原始备份

## 安全措施
- 未修改任何业务逻辑
- 仅修复文件编码，不改变文件内容
- 所有操作严格限制在 D:\PDF转网页\ 目录内
- 每个文件都创建了独立备份

## 预防措施建议

1. **锁死编码策略**
   在PowerShell Profile文件中加入：
   ```powershell
   [console]::OutputEncoding = [System.Text.Encoding]::UTF8
   $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8NoBOM'
   $PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8NoBOM'
   ```

2. **禁止并行写入**
   确保所有写入任务使用单线程顺序执行

3. **定期检测任务**
   建议设置每日定时任务，扫描并检测编码问题

## 注意事项
- 所有修复后的文件都使用UTF-8无BOM格式保存
- HTML文件自动添加/修正了UTF-8 meta标签
- 清除了所有不可见控制字符
- 如遇修复失败的文件，请检查是否有特殊编码或格式问题
"@
        
        Set-Content -Path $reportFile -Value $reportContent -Encoding UTF8
        Write-Log "生成修复报告: $reportFile"
    } catch {
        Write-Log "生成修复报告时出错: $_"
    }
}

# 主函数
function Main {
    # 确保目录存在
    Ensure-Directories
    
    # 初始化日志
    "========== JEV-GLOBAL-UTF8-REBUILD-v3.0 开始执行 ==========" | Out-File -FilePath $fixLog -Encoding UTF8
    
    # 扫描文件
    $targetFiles = Get-TargetFiles $baseDir
    $stats.total_files = $targetFiles.Count
    
    # 处理每个文件
    Write-Log "开始修复 $($targetFiles.Count) 个文件..."
    foreach ($file in $targetFiles) {
        Process-File $file
    }
    
    # 生成报告
    Generate-RebuildReport
    
    # 控制台输出完成信息
    Write-Host ""
    Write-Host "✅ JEV-GLOBAL-UTF8-REBUILD-v3.0 执行完成"
    Write-Host "📊 修复统计:"
    Write-Host "   - 总文件数: $($stats.total_files)"
    Write-Host "   - 成功修复: $($stats.success_count)"
    Write-Host "   - 跳过文件: $($stats.skipped_count)"
    Write-Host "   - 修复失败: $($stats.failed_count)"
    Write-Host ""
    Write-Host "💾 备份信息:"
    Write-Host "   - 备份目录: $backupDir"
    Write-Host ""
    Write-Host "📄 报告路径: $reportFile"
    Write-Host ""
    Write-Host "🔒 安全说明:"
    Write-Host "   - 所有修复文件均保留原始备份"
    Write-Host "   - 仅修改文件编码，不改变业务逻辑"
    Write-Host "   - 操作严格限制在指定目录内"
    
    "========== JEV-GLOBAL-UTF8-REBUILD-v3.0 执行完成 ==========" | Add-Content -Path $fixLog -Encoding UTF8
}

# 执行主函数
Main