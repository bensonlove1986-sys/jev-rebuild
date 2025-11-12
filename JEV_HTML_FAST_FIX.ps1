#!/usr/bin/env pwsh
# JEV HTML快速修复工具 - 精简版
# 专注于核心编码修复，避免超时

# 设置日志目录
$logDir = "d:\PDF转网页\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = "$logDir\html_fast_fix_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# 简易日志函数
function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

# 核心修复函数
function Fix-FileEncoding {
    param(
        [string]$filePath
    )
    
    try {
        if (-not (Test-Path $filePath)) {
            Write-Log "文件不存在: $filePath"
            return $false
        }
        
        Write-Log "处理: $filePath"
        
        # 创建备份
        $backup = "$filePath.bak"
        Copy-Item $filePath $backup -Force
        Write-Log "已备份到: $backup"
        
        # 读取并修复内容
        $content = Get-Content -Path $filePath -Raw
        
        # 修复meta charset
        $content = $content -replace '<meta\s+charset=["\'']?[^"\'>\s]+["\'']?\s*>', '<meta charset="UTF-8">'
        if (-not ($content -match '<meta\s+charset=["\'']UTF-8["\'']')) {
            $content = $content -replace '(<head[^>]*>)', '$1\n    <meta charset="UTF-8">'
        }
        
        # 移除BOM和控制字符
        $content = $content -replace '\p{Cc}', '' -replace '\p{Cf}', ''
        
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Log "已修复并保存为UTF-8无BOM: $filePath"
        
        return $true
    }
    catch {
        Write-Log "修复失败: $_"
        return $false
    }
}

# 终止浏览器进程
function Stop-BrowserProcesses {
    Write-Log "清理浏览器进程"
    $browsers = @("chrome", "msedge", "firefox", "opera", "brave", "iexplore")
    foreach ($browser in $browsers) {
        try {
            Get-Process -Name $browser -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Write-Log "已终止: $browser"
        } catch {}
    }
}

# 主函数
Write-Log "JEV HTML快速修复开始"

# 要修复的文件
$files = @(
    "d:\PDF转网页\ui\client_portal.html",
    "d:\PDF转网页\ui\sentinel_dashboard.html",
    "d:\PDF转网页\ui\cognition_panel.html"
)

# 修复文件
foreach ($file in $files) {
    Fix-FileEncoding $file
}

# 清理浏览器进程
Stop-BrowserProcesses

# 生成简单报告
Write-Log "修复完成！请手动操作："
Write-Log "1. 打开浏览器"
Write-Log "2. 访问 http://localhost:8080/ui/client_portal.html"
Write-Log "3. 按 Ctrl+F5 强制刷新"
Write-Log "4. 同样操作检查其他页面"

Write-Log "日志已保存: $logFile"
Write-Host "修复完成，请查看日志: $logFile"
