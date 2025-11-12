#!/usr/bin/env pwsh
# JEV HTML编码修复工具 v1.0
# 修复client_portal.html和sentinel_dashboard.html的编码问题

# 设置日志目录和文件
$logDir = "d:\PDF转网页\logs"
$logFile = "$logDir\html_encoding_fix_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

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

# 检测并修复文件编码
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
        
        # 备份原始文件
        $backupPath = "$filePath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        Write-Log "已创建备份: $backupPath"
        
        # 读取文件内容（忽略BOM）
        $content = Get-Content -Path $filePath -Raw -Encoding Byte | ForEach-Object { [System.Text.Encoding]::UTF8.GetString($_) }
        
        # 检测并移除BOM
        if ($content.StartsWith([char]0xFEFF)) {
            $content = $content.Substring(1)
            Write-Log "已移除UTF-8 BOM"
        }
        
        # 修复meta charset标签（确保是UTF-8）
        $content = $content -replace '<meta\s+charset=["\'']?[^"\'>\s]+["\'']?\s*>', '<meta charset="UTF-8">'
        Write-Log "已修复meta charset标签"
        
        # 移除控制字符（除了换行和制表符）
        $content = [Regex]::Replace($content, '[\x00-\x08\x0B\x0C\x0E-\x1F]', '')
        Write-Log "已移除控制字符"
        
        # 保存为UTF-8无BOM格式
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        Write-Log "文件已保存为UTF-8无BOM格式"
        
        # 验证修复结果
        $fileInfo = Get-Content -Path $filePath -Raw -Encoding Byte
        $hasBOM = $fileInfo[0] -eq 0xEF -and $fileInfo[1] -eq 0xBB -and $fileInfo[2] -eq 0xBF
        
        if (-not $hasBOM) {
            Write-Log "修复成功，文件现在是UTF-8无BOM格式"
            return $true
        } else {
            Write-Log "修复失败，文件仍然包含BOM" "ERROR"
            return $false
        }
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

# 清理浏览器缓存
function Clear-BrowserCache {
    Write-Log "开始清理浏览器缓存"
    
    try {
        # 终止常见的浏览器进程
        $browsers = @("chrome", "msedge", "firefox", "opera", "brave")
        foreach ($browser in $browsers) {
            Get-Process -Name $browser -ErrorAction SilentlyContinue | Stop-Process -Force
            Write-Log "已终止 $browser 进程"
        }
        
        # 清理临时文件夹中的浏览器缓存
        $tempDirs = @(
            "$env:TEMP\*",
            "$env:LOCALAPPDATA\Temp\*"
        )
        foreach ($tempDir in $tempDirs) {
            Get-ChildItem -Path $tempDir -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        }
        Write-Log "已清理临时文件夹"
        
        # 提示用户清理完成
        Write-Log "浏览器缓存清理完成，请在重新打开浏览器时使用 Ctrl+F5 强制刷新页面"
        return $true
    }
    catch {
        Write-Log "清理浏览器缓存时出错: $_" "ERROR"
        return $false
    }
}

# 主函数
function Main {
    Write-Log "===== JEV HTML编码修复工具 v1.0 开始运行 ====="
    
    # 要修复的文件列表
    $filesToRepair = @(
        "d:\PDF转网页\ui\client_portal.html",
        "d:\PDF转网页\ui\sentinel_dashboard.html"
    )
    
    $allSuccess = $true
    
    # 修复每个文件
    foreach ($file in $filesToRepair) {
        $result = Repair-FileEncoding -filePath $file
        if (-not $result) {
            $allSuccess = $false
            Write-Log "检测到异常编码，停止后续修复" "CRITICAL"
            break
        }
    }
    
    # 如果所有文件修复成功，清理浏览器缓存
    if ($allSuccess) {
        Clear-BrowserCache
        
        # 生成汇总报告
        $summary = @"
===== JEV HTML编码修复报告 =====
修复时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
修复状态: 成功
修复文件:
$($filesToRepair -join "
")
操作详情:
- 移除了可能的BOM字符
- 修复了meta charset标签为UTF-8
- 移除了控制字符
- 保存为UTF-8无BOM格式
- 清理了浏览器缓存

后续步骤:
1. 使用 Ctrl+F5 强制刷新浏览器页面
2. 检查页面是否正常显示
3. 查看控制台是否有任何错误
"@
        
        Write-Log $summary "SUCCESS"
        Add-Content -Path "$logDir\html_encoding_fix_summary.txt" -Value $summary
        Write-Host "`n修复完成！请查看日志文件获取详细信息: $logFile"
    } else {
        Write-Log "修复过程中出现错误，请检查日志文件获取详细信息" "ERROR"
    }
    
    Write-Log "===== JEV HTML编码修复工具 v1.0 运行结束 ====="
}

# 执行主函数
Main
