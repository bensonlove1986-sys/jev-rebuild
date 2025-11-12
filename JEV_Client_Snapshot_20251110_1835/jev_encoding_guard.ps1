# ============================================================
# [JEV ENCODING GUARD]
# JEV Client专用编码守护脚本
# ============================================================

$clientPath = "D:\PDF转网页\JEV_Client"
$diagnosticsPath = "$clientPath\diagnostics"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 确保诊断目录存在
if (-not (Test-Path $diagnosticsPath)) {
    New-Item -ItemType Directory -Path $diagnosticsPath -Force | Out-Null
}

$report = @{
    task = "JEV-ENCODING-GUARD"
    timestamp = $timestamp
    scannedFiles = 0
    problematicFiles = @()
    fixedFiles = @()
    status = "pending"
}

Write-Host "`n🔍 [JEV ENCODING GUARD] Starting at $timestamp`n"

# 检查编码函数
function Check-Encoding($file) {
    $report.scannedFiles++
    
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $hasIssues = $false
        
        # 检查乱码
        if ($content -match "" -or $content -match "锟" -or $content -match "鐚" -or $content -match "鈧") {
            $hasIssues = $true
        }
        
        # 对于HTML文件，检查meta标签
        if ($file.Extension -eq ".html" -and (-not ($content -match '<meta.*charset=.*utf-8' -i))) {
            $hasIssues = $true
        }
        
        # 对于JS/CSS文件，检查是否为UTF-8
        if (($file.Extension -eq ".js" -or $file.Extension -eq ".css") -and $content -match "[\x80-\xFF]{1,}") {
            # 检查是否包含非ASCII字符但可能不是正确的UTF-8
            $hasIssues = $true
        }
        
        if ($hasIssues) {
            # 添加到问题文件列表
            $report.problematicFiles += @{
                path = $file.FullName
                extension = $file.Extension
                size = $file.Length
                issues = @()
            }
            
            # 尝试修复
            try {
                # 创建备份
                $backupPath = "$($file.FullName).encoding.bak"
                Copy-Item -Path $file.FullName -Destination $backupPath -Force
                
                # 清理乱码
                $clean = $content -replace '[^\x09\x0A\x0D\x20-\x7E\xA0-\uFFFF]', ''
                
                # 为HTML文件添加meta标签
                if ($file.Extension -eq ".html" -and (-not ($clean -match '<meta.*charset=.*utf-8' -i))) {
                    $clean = $clean -replace '<head>', '<head>\n<meta charset="UTF-8">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">' -i
                }
                
                # 以UTF-8编码保存
                $clean | Set-Content -Path $file.FullName -Encoding UTF8 -ErrorAction Stop
                
                Write-Host "✅ Fixed: $($file.FullName)"
                $report.fixedFiles += $file.FullName
            } catch {
                Write-Host "❌ Failed to fix: $($file.FullName)"
            }
        }
    } catch {
        Write-Host "⚠️ Cannot read: $($file.FullName)"
    }
}

# 扫描关键目录
Write-Host "📂 Scanning UI directory..."
Get-ChildItem -Path "$clientPath\ui" -Recurse -Include *.html,*.js,*.css,*.json -ErrorAction SilentlyContinue | ForEach-Object { Check-Encoding $_ }

Write-Host "📂 Scanning Scripts directory..."
Get-ChildItem -Path "$clientPath\scripts" -Recurse -Include *.html,*.js,*.css,*.json -ErrorAction SilentlyContinue | ForEach-Object { Check-Encoding $_ }

Write-Host "📂 Scanning Modules directory..."
Get-ChildItem -Path "$clientPath\modules" -Recurse -Include *.html,*.js,*.css,*.json -ErrorAction SilentlyContinue | ForEach-Object { Check-Encoding $_ }

# 更新报告
$report.status = if ($report.fixedFiles.Count -gt 0) { "fixed" } elseif ($report.problematicFiles.Count -gt 0) { "issues_found" } else { "clean" }

# 生成报告
$report | ConvertTo-Json -Depth 3 | Out-File "$diagnosticsPath\encoding_guard_report.json" -Encoding UTF8

# 写入日志
$logEntry = "`n[$timestamp] Encoding Guard: $($report.status) | Scanned: $($report.scannedFiles) | Fixed: $($report.fixedFiles.Count) | Issues: $($report.problematicFiles.Count)"
Add-Content -Path "$diagnosticsPath\encoding_guard_log.txt" -Value $logEntry

# 显示摘要
Write-Host "`n========================================"
Write-Host "✅ ENCODING GUARD COMPLETED"
Write-Host "========================================"
Write-Host "📊 Files scanned: $($report.scannedFiles)"
Write-Host "🔧 Files fixed: $($report.fixedFiles.Count)"
Write-Host "⚠️ Issues found: $($report.problematicFiles.Count)"
Write-Host "📋 Report: $diagnosticsPath\encoding_guard_report.json"
Write-Host "📝 Log: $diagnosticsPath\encoding_guard_log.txt"
Write-Host "========================================"