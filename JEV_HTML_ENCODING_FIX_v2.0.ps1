#!/usr/bin/env pwsh
# JEV HTML编码修复工具 v2.0
# 修复多个HTML文件的编码问题，确保UTF-8无BOM格式

# 设置日志目录和文件
$logDir = "d:\PDF转网页\logs"
$logFile = "$logDir\html_encoding_fix_v2_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# 创建日志目录
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 日志函数
function Write-Log {
    param(
        [string]$message,
        [string]$level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $logEntry = "[$timestamp] [$level] $message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

# 检测文件编码
function Get-FileEncoding {
    param(
        [string]$filePath
    )
    
    try {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        
        # 检测UTF-8 BOM
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            return "UTF-8 BOM"
        }
        
        # 检测UTF-16 LE BOM
        if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
            return "UTF-16 LE BOM"
        }
        
        # 检测UTF-16 BE BOM
        if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
            return "UTF-16 BE BOM"
        }
        
        # 尝试检测是否为UTF-8
        try {
            [System.Text.Encoding]::UTF8.GetString($bytes) | Out-Null
            # 统计非ASCII字符的比例来判断是否为UTF-8
            $content = [System.Text.Encoding]::UTF8.GetString($bytes)
            $nonAsciiCount = 0
            $totalCount = 0
            
            foreach ($char in $content.ToCharArray()) {
                $totalCount++
                if ([int]$char -gt 127) {
                    $nonAsciiCount++
                }
            }
            
            if ($totalCount -gt 0 -and $nonAsciiCount / $totalCount -gt 0.01) {
                return "UTF-8 (可能)"
            }
        } catch {
            # 不是有效的UTF-8
        }
        
        # 默认假设为ANSI
        return "ANSI/未知"
    }
    catch {
        return "检测失败: $_"
    }
}

# 修复文件编码
function Repair-FileEncoding {
    param(
        [string]$filePath
    )
    
    Write-Log "开始处理文件: $filePath"
    
    try {
        # 检测文件是否存在
        if (-not (Test-Path $filePath)) {
            Write-Log "文件不存在: $filePath" "ERROR"
            return $false
        }
        
        # 检测当前编码
        $currentEncoding = Get-FileEncoding -filePath $filePath
        Write-Log "当前文件编码: $currentEncoding"
        
        # 备份原始文件
        $backupPath = "$filePath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        Write-Log "已创建备份: $backupPath"
        
        # 读取文件内容（使用不同的编码尝试读取，确保正确解码）
        $content = $null
        
        # 首先尝试用UTF-8读取（忽略BOM）
        try {
            $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
            Write-Log "使用UTF-8编码读取文件成功"
        } catch {
            # 如果失败，尝试用默认编码读取
            try {
                $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::Default)
                Write-Log "使用系统默认编码读取文件成功"
            } catch {
                Write-Log "读取文件内容失败: $_" "ERROR"
                return $false
            }
        }
        
        # 检测并移除BOM
        if ($content.StartsWith([char]0xFEFF)) {
            $content = $content.Substring(1)
            Write-Log "已移除UTF-8 BOM字符"
        }
        
        # 修复meta charset标签（确保是UTF-8）
        $originalContent = $content
        $content = $content -replace '<meta\s+charset=["\'']?[^"\'>\s]+["\'']?\s*>', '<meta charset="UTF-8">'
        if ($content -ne $originalContent) {
            Write-Log "已修复meta charset标签为UTF-8"
        }
        
        # 如果没有charset标签，尝试在head中添加
        if (-not ($content -match '<meta\s+charset=["\'']UTF-8["\'']\s*>')) {
            $content = $content -replace '(<head[^>]*>)', '$1\n    <meta charset="UTF-8">'
            Write-Log "已添加meta charset=UTF-8标签"
        }
        
        # 移除控制字符（除了换行、回车和制表符）
        $content = [Regex]::Replace($content, '[\x00-\x08\x0B\x0C\x0E-\x1F]', '')
        Write-Log "已移除控制字符"
        
        # 移除明显的乱码模式（简单的乱码字符检测和替换）
        $garbagePatterns = @(
            'Kt\+4%pWۉ.*?',
            'GU-[0-9A-Za-z]+.*?',
            '[^\x00-\x7F]{5,}'  # 连续5个以上的非ASCII字符
        )
        
        foreach ($pattern in $garbagePatterns) {
            $matches = [Regex]::Matches($content, $pattern)
            if ($matches.Count -gt 0) {
                Write-Log "检测到 $($matches.Count) 个可能的乱码模式，尝试清理"
                $content = [Regex]::Replace($content, $pattern, '')
            }
        }
        
        # 保存为UTF-8无BOM格式
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        Write-Log "文件已保存为UTF-8无BOM格式"
        
        # 验证修复结果
        $newEncoding = Get-FileEncoding -filePath $filePath
        Write-Log "修复后文件编码: $newEncoding"
        
        # 检查文件大小是否合理
        $fileSize = (Get-Item $filePath).Length
        $backupSize = (Get-Item $backupPath).Length
        
        if ($fileSize -lt 100 -or $fileSize -gt $backupSize * 2) {
            Write-Log "修复后的文件大小异常，可能修复失败" "WARNING"
            # 恢复备份
            Copy-Item -Path $backupPath -Destination $filePath -Force
            Write-Log "已恢复原始文件"
            return $false
        }
        
        Write-Log "文件修复成功"
        return $true
    }
    catch {
        Write-Log "处理文件时出错: $_" "ERROR"
        # 恢复备份
        if (Test-Path $backupPath) {
            Copy-Item -Path $backupPath -Destination $filePath -Force
            Write-Log "已恢复原始文件从备份"
        }
        return $false
    }
}

# 清理浏览器缓存和进程
function Clear-BrowserCache {
    Write-Log "开始清理浏览器缓存和进程"
    
    try {
        # 定义要终止的浏览器进程列表
        $browserProcesses = @(
            "chrome", "chrome.exe",
            "msedge", "msedge.exe",
            "firefox", "firefox.exe",
            "opera", "opera.exe",
            "brave", "brave.exe",
            "iexplore", "iexplore.exe"
        )
        
        # 终止浏览器进程
        foreach ($process in $browserProcesses) {
            $runningProcesses = Get-Process -Name $process -ErrorAction SilentlyContinue
            if ($runningProcesses) {
                $runningProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
                Write-Log "已终止进程: $process ($($runningProcesses.Count) 个实例)"
            }
        }
        
        # 清理临时文件夹中的浏览器缓存
        $tempDirs = @(
            "$env:TEMP",
            "$env:LOCALAPPDATA\Temp"
        )
        
        foreach ($tempDir in $tempDirs) {
            if (Test-Path $tempDir) {
                try {
                    Get-ChildItem -Path $tempDir -Recurse -ErrorAction SilentlyContinue | 
                    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | 
                    Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                    Write-Log "已清理临时目录: $tempDir"
                } catch {
                    Write-Log "清理临时目录时出错: $_" "WARNING"
                }
            }
        }
        
        # 清理Chrome缓存
        $chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
        if (Test-Path $chromeCache) {
            try {
                Remove-Item -Path "$chromeCache\*" -Force -Recurse -ErrorAction SilentlyContinue
                Write-Log "已清理Chrome缓存"
            } catch {
                Write-Log "清理Chrome缓存时出错: $_" "WARNING"
            }
        }
        
        # 清理Edge缓存
        $edgeCache = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
        if (Test-Path $edgeCache) {
            try {
                Remove-Item -Path "$edgeCache\*" -Force -Recurse -ErrorAction SilentlyContinue
                Write-Log "已清理Edge缓存"
            } catch {
                Write-Log "清理Edge缓存时出错: $_" "WARNING"
            }
        }
        
        Write-Log "浏览器缓存清理完成，请在重新打开浏览器时使用 Ctrl+F5 强制刷新页面"
        return $true
    }
    catch {
        Write-Log "清理浏览器缓存时出错: $_" "ERROR"
        return $false
    }
}

# 验证HTML文件是否包含基本结构
function Test-HtmlValidity {
    param(
        [string]$filePath
    )
    
    try {
        $content = Get-Content -Path $filePath -Raw -ErrorAction Stop
        
        # 检查是否包含基本的HTML结构
        $hasDoctype = $content -match '<!DOCTYPE\s+html[^>]*>'
        $hasHtmlTag = $content -match '<html[^>]*>' -and $content -match '</html>'
        $hasHeadTag = $content -match '<head[^>]*>' -and $content -match '</head>'
        $hasBodyTag = $content -match '<body[^>]*>' -and $content -match '</body>'
        $hasMetaCharset = $content -match '<meta\s+charset=["\'']UTF-8["\'']\s*>'
        
        $isValid = $hasDoctype -and $hasHtmlTag -and $hasHeadTag -and $hasBodyTag
        
        Write-Log "HTML验证结果: 完整结构=$isValid, DOCTYPE=$hasDoctype, meta charset=$hasMetaCharset"
        
        return $isValid
    }
    catch {
        Write-Log "验证HTML文件时出错: $_" "ERROR"
        return $false
    }
}

# 主函数
function Main {
    Write-Log "===== JEV HTML编码修复工具 v2.0 开始运行 ====="
    
    # 要修复的文件列表
    $filesToRepair = @(
        "d:\PDF转网页\ui\client_portal.html",
        "d:\PDF转网页\ui\sentinel_dashboard.html",
        "d:\PDF转网页\ui\cognition_panel.html"
    )
    
    $successFiles = @()
    $failedFiles = @()
    $allSuccess = $true
    
    # 修复每个文件
    foreach ($file in $filesToRepair) {
        Write-Log "\n处理文件: $file"
        
        # 先检测文件是否存在
        if (-not (Test-Path $file)) {
            Write-Log "文件不存在，跳过: $file" "WARNING"
            $failedFiles += $file
            $allSuccess = $false
            continue
        }
        
        # 修复文件编码
        $repairResult = Repair-FileEncoding -filePath $file
        
        if ($repairResult) {
            # 验证修复后的HTML有效性
            $validationResult = Test-HtmlValidity -filePath $file
            if ($validationResult) {
                Write-Log "文件修复并验证成功: $file" "SUCCESS"
                $successFiles += $file
            } else {
                Write-Log "文件验证失败，可能修复不完整: $file" "ERROR"
                $failedFiles += $file
                $allSuccess = $false
                Write-Log "检测到异常编码，停止后续修复" "CRITICAL"
                break
            }
        } else {
            Write-Log "文件修复失败: $file" "ERROR"
            $failedFiles += $file
            $allSuccess = $false
            Write-Log "检测到异常编码，停止后续修复" "CRITICAL"
            break
        }
    }
    
    # 如果所有文件修复成功，清理浏览器缓存
    if ($allSuccess -and $successFiles.Count -gt 0) {
        $cacheResult = Clear-BrowserCache
        
        # 生成汇总报告
        $summary = @"
===== JEV HTML编码修复报告 v2.0 =====
修复时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
修复状态: 成功

成功修复的文件:
$($successFiles -join "
")

修复操作:
1. 检测并移除了可能的BOM字符
2. 修复或添加了meta charset=UTF-8标签
3. 移除了控制字符和潜在的乱码
4. 保存为UTF-8无BOM格式
5. 验证了HTML结构的完整性
6. 清理了浏览器缓存和进程

后续步骤:
1. 打开浏览器，访问以下页面:
   - http://localhost:8080/ui/client_portal.html
   - http://localhost:8080/ui/sentinel_dashboard.html
   - http://localhost:8080/ui/cognition_panel.html
2. 使用 Ctrl+F5 强制刷新每个页面
3. 检查页面是否正常显示，无乱码
4. 查看浏览器控制台是否有错误信息
"@
            
            Write-Log $summary "SUCCESS"
            $summaryPath = "$logDir\html_encoding_fix_summary_v2.txt"
            Add-Content -Path $summaryPath -Value $summary
            Write-Host "`n===== 修复完成 ====="
            Write-Host "成功修复了 $($successFiles.Count) 个文件"
            Write-Host "详细报告已保存至: $summaryPath"
        } else {
            $summary = @"
===== JEV HTML编码修复报告 v2.0 =====
修复时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
修复状态: 部分失败

成功修复的文件:
$($successFiles -join "
")

修复失败的文件:
$($failedFiles -join "
")

错误原因: 检测到异常编码或文件验证失败

建议:
1. 检查日志文件获取详细错误信息: $logFile
2. 尝试手动修复失败的文件
3. 确保文件有正确的HTML结构
"@
            
            Write-Log $summary "ERROR"
            Add-Content -Path "$logDir\html_encoding_fix_summary_v2.txt" -Value $summary
            Write-Host "`n===== 修复失败 ====="
            Write-Host "成功修复: $($successFiles.Count) 个文件"
            Write-Host "修复失败: $($failedFiles.Count) 个文件"
            Write-Host "请查看日志获取详细信息: $logFile"
        }
    
    Write-Log "===== JEV HTML编码修复工具 v2.0 运行结束 ====="
}

# 执行主函数
Main
