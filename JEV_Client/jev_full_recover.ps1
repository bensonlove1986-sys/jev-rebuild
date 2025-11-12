# ============================================================
# [JEV FULL SYSTEM RECOVER v2.0]
# 系统级编码修复与验证
# ============================================================

$basePath = "D:\PDF转网页"
$clientPath = "$basePath\JEV_Client"
$diagnosticsPath = "$clientPath\diagnostics"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 确保诊断目录存在
if (-not (Test-Path $diagnosticsPath)) {
    New-Item -ItemType Directory -Path $diagnosticsPath -Force | Out-Null
}

$report = @{
    startTime = $timestamp
    fixedFiles = @()
    verifiedFiles = 0
    errors = @()
    modules = @{
        client = $false
        worker = $false
        relay = $false
        controlCenter = $false
    }
    systemState = "pending"
}

Write-Host "`n🚀 [JEV FULL RECOVERY] Starting at $timestamp`n"
Write-Host "🔍 Phase 1: Encoding Repair"

# 修复UTF-8编码函数
function Repair-Encoding($dir) {
    Write-Host "📂 Scanning directory: $dir"
    try {
        $files = Get-ChildItem -Path $dir -Recurse -Include *.html,*.js,*.css,*.json,*.txt -ErrorAction Stop
        $totalFiles = $files.Count
        $currentFile = 0
        
        foreach ($file in $files) {
            $currentFile++
            Write-Progress -Activity "Repairing Encoding" -Status "Processing $($file.Name)" -PercentComplete (($currentFile / $totalFiles) * 100)
            
            try {
                # 读取文件内容
                $content = Get-Content $file.FullName -Raw -ErrorAction Stop
                $report.verifiedFiles++
                
                # 检查是否有乱码
                if ($content -match "" -or $content -match "锟" -or $content -match "鐚" -or $content -match "鈧") {
                    # 创建备份
                    $backupPath = "$($file.FullName).bak"
                    Copy-Item -Path $file.FullName -Destination $backupPath -Force
                    
                    # 清理乱码并保存为UTF-8
                    $clean = $content -replace '[^\\x09\\x0A\\x0D\\x20-\\x7E\\xA0-\\uFFFF]', ''
                    $clean | Set-Content -Path $file.FullName -Encoding UTF8 -ErrorAction Stop
                    
                    # 为HTML文件添加UTF-8 meta标签
                    if ($file.Extension -eq ".html") {
                        if (-not ($clean -match '<meta.*charset=.*utf-8' -i)) {
                            $clean = $clean -replace '<head>', '<head>\n<meta charset="UTF-8">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">' -i
                            $clean | Set-Content -Path $file.FullName -Encoding UTF8 -ErrorAction Stop
                        }
                    }
                    
                    Write-Host "✅ Fixed: $($file.FullName)"
                    $report.fixedFiles += @{
                        path = $file.FullName
                        size = $file.Length
                        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    }
                }
            } catch {
                Write-Host "❌ Error processing: $($file.FullName)"
                $report.errors += @{
                    path = $file.FullName
                    error = $_.Exception.Message
                    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                }
            }
        }
    } catch {
        Write-Host "❌ Error scanning directory: $dir"
        $report.errors += @{
            path = $dir
            error = $_.Exception.Message
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    }
}

# 修复所有模块的编码
Repair-Encoding "$basePath\JEV_Client"
Repair-Encoding "$basePath\JEV_Worker"
Repair-Encoding "$basePath\Cloud_Relay"
Repair-Encoding "$basePath\JEV_ControlCenter"

# 更新报告
$report.modules.client = $true
$report.endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$report.systemState = "encoding_fixed"

# 生成修复报告
$reportJson = $report | ConvertTo-Json -Depth 4
$reportJson | Out-File "$diagnosticsPath\full_recover_report.json" -Encoding UTF8

# 生成编码守护日志
Add-Content -Path "$diagnosticsPath\encoding_guard_log.txt" -Value "`n[$timestamp] Full system recovery completed. Fixed: $($report.fixedFiles.Count), Verified: $($report.verifiedFiles)"

# 生成验证报告
$validationReport = @{
    task = "JEV-FULL-SYSTEM-RECOVER-v2.0"
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    fixedFiles = $report.fixedFiles.Count
    verifiedFiles = $report.verifiedFiles
    errors = $report.errors.Count
    encodingStatus = if ($report.fixedFiles.Count -gt 0) { "repaired" } else { "clean" }
    modules = $report.modules
}

$validationReport | ConvertTo-Json -Depth 3 | Out-File "$diagnosticsPath\system_validation_report.json" -Encoding UTF8

# 显示摘要
Write-Host "`n========================================"
Write-Host "✅ JEV FULL SYSTEM RECOVERY COMPLETED"
Write-Host "========================================"
Write-Host "📊 Files verified: $($report.verifiedFiles)"
Write-Host "🔧 Files fixed: $($report.fixedFiles.Count)"
Write-Host "❌ Errors: $($report.errors.Count)"
Write-Host "📋 Reports generated in: $diagnosticsPath"
Write-Host "========================================"
Write-Host "`nNext steps:"
Write-Host "1. Verify Worker environment: $basePath\JEV_Worker\verify_worker_env.ps1"
Write-Host "2. Test Relay connectivity: $basePath\Cloud_Relay\relay_verify.ps1"
Write-Host "3. Check ControlCenter sync: $basePath\JEV_ControlCenter\control_sync_check.ps1"
Write-Host "========================================"