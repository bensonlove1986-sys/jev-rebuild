# JEV-QUICK-HTML-FIX-v1.0
# 功能：快速修复HTML文件中的常见乱码问题

# 配置变量
$baseDir = "D:\PDF转网页"
$uiDir = "$baseDir\ui"
$logDir = "$baseDir\logs"
$targetFiles = @(
    "$uiDir\sentinel_dashboard.html",
    "$uiDir\client_portal.html",
    "$uiDir\handler.html"
)

# 创建日志目录
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 日志函数
function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry
    Add-Content -Path "$logDir\quick_fix.log" -Value $logEntry
}

Write-Log "开始执行JEV-QUICK-HTML-FIX-v1.0"

# 快速修复函数
function Quick-FixFile {
    param(
        [string]$filePath
    )
    
    if (-not (Test-Path $filePath)) {
        Write-Log "文件不存在: $filePath"
        return
    }
    
    $fileName = Split-Path $filePath -Leaf
    $fixedPath = "$filePath.fixed"
    
    Write-Log "修复文件: $fileName"
    
    try {
        # 方法1: Latin-1 → UTF-8反向映射（最常用的双层编码修复）
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $latin1Content = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
        
        # 保存修复后的文件
        [System.IO.File]::WriteAllText($fixedPath, $latin1Content, [System.Text.Encoding]::UTF8)
        Write-Log "修复版本已保存到: $fixedPath"
        
        # 同时修复原始文件
        [System.IO.File]::WriteAllText($filePath, $latin1Content, [System.Text.Encoding]::UTF8)
        Write-Log "已修复原始文件: $filePath"
        
    } catch {
        Write-Log "修复失败: $_"
    }
}

# 执行修复
foreach ($file in $targetFiles) {
    Quick-FixFile -filePath $file
}

# 生成简单的修复报告
$reportPath = "$logDir\quick_fix_report.txt"
$reportContent = @"
===== 快速HTML修复报告 =====
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
已尝试修复以下文件:
$($targetFiles -join "\n")

使用方法: Latin-1 → UTF-8反向映射
修复版本保存在: 原文件名.fixed

验证步骤:
1. 打开浏览器
2. 清理缓存 (Ctrl+Shift+Delete)
3. 强制刷新 (Ctrl+Shift+R)
4. 访问修复后的页面
"@

try {
    $reportContent | Out-File -FilePath $reportPath -Encoding utf8NoBOM
    Write-Log "修复报告已生成"
} catch {
    Write-Log "生成报告失败"
}

Write-Log "JEV-QUICK-HTML-FIX-v1.0执行完成"
