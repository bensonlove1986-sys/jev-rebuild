# ============================================================
# [JEV UTF-8 AUTO GUARD v1.0]
# 自动检测与修复乱码文件（每日定时执行）
# ============================================================
$basePath = "D:\PDF转网页"
$logPath = "$basePath\diagnostics\utf8_guard_log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$report = @()

# 确保诊断目录存在
if (-not (Test-Path "$basePath\diagnostics")) {
    New-Item -ItemType Directory -Path "$basePath\diagnostics" -Force | Out-Null
}

Write-Host "`n[JEV UTF8 GUARD] Starting check at $timestamp`n"

# 递归扫描函数
function Scan-And-Fix($dir) {
    try {
        Get-ChildItem -Path $dir -Recurse -Include *.html,*.js,*.css,*.json,*.txt -ErrorAction Stop | ForEach-Object {
            try {
                $content = Get-Content $_.FullName -Raw -ErrorAction Stop
                if ($content -match "�") {
                    Write-Host "⚠️ Detected corrupted file: $($_.FullName)"
                    # 清理乱码字符，保留有效UTF-8字符
                    $clean = $content -replace '[^\x09\x0A\x0D\x20-\x7E\xA0-\uFFFF]', ''
                    # 备份原文件
                    $backupPath = "$($_.FullName).bak"
                    Copy-Item -Path $_.FullName -Destination $backupPath -Force
                    # 写入修复后的内容
                    $clean | Set-Content -Path $_.FullName -Encoding UTF8 -ErrorAction Stop
                    Write-Host "✅ Fixed and backed up: $($_.FullName)"
                    # 添加到报告
                    $report += @{
                        file = $_.FullName
                        fixed = $true
                        time = $timestamp
                    }
                }
            } catch {
                Write-Host "❌ Error reading file: $($_.FullName) - $($_.Exception.Message)"
            }
        }
    } catch {
        Write-Host "❌ Error scanning directory: $dir - $($_.Exception.Message)"
    }
}

# 执行扫描与修复
Scan-And-Fix $basePath

# 输出结果
$summary = @{
    task = "[JEV-UTF8-GUARD-AUTO-v1.0]"
    time = $timestamp
    repaired = $report.Count
    encoding = "UTF-8"
    status = if ($report.Count -gt 0) { "repaired" } else { "clean" }
    details = $report
}

# 生成JSON报告
$summaryJson = $summary | ConvertTo-Json -Depth 3
$summaryJson | Out-File "$basePath\diagnostics\utf8_guard_report.json" -Encoding UTF8

# 写入日志
$logEntry = "`n[$timestamp] UTF8 Check: $($summary.status) | Fixed: $($report.Count)"
Add-Content -Path $logPath -Value $logEntry -ErrorAction SilentlyContinue

# 输出执行结果
Write-Host "`n✅ UTF-8 Guard task completed."
Write-Host "📊 Fixed files: $($report.Count)"
Write-Host "📋 Report generated: $basePath\diagnostics\utf8_guard_report.json"
Write-Host "📝 Log updated: $logPath"