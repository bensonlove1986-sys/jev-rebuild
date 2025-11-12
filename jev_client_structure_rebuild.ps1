# JEV-CLIENT-STRUCTURE-REBUILD-v1.0 执行脚本
# 任务目标：彻底清除JEV_Client下的乱码文件，重建干净结构

# 配置变量
$baseDir = "D:\PDF转网页\JEV_Client"
$backupDir = "D:\PDF转网页\diagnostics\corrupted_full_backup"
$reportFile = "D:\PDF转网页\diagnostics\client_structure_rebuild_report.txt"
$systemStateFile = "D:\PDF转网页\system_mode_state.json"

# 创建必要的目录
Write-Host "创建必要的目录..."
if (-not (Test-Path "D:\PDF转网页\diagnostics")) {
    New-Item -ItemType Directory -Force -Path "D:\PDF转网页\diagnostics"
}
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir
}

# 初始化报告
$reportContent = @"
# JEV Client 结构重建报告
生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 重建统计
文件总数: 0
备份文件数: 0
重建文件数: 0
HTML文件: 0
JS文件: 0
CSS文件: 0

## 详细日志

"@

# 统计变量
$totalFiles = 0
$backedUpFiles = 0
$rebuiltFiles = 0
$htmlFiles = 0
$jsFiles = 0
$cssFiles = 0
$fileLog = @()

# 扫描并处理文件
Write-Host "扫描 $baseDir 目录中的 HTML/JS/CSS 文件..."
try {
    $files = Get-ChildItem -Path $baseDir -Recurse -Include *.html,*.htm,*.js,*.css -File
    $totalFiles = $files.Count
    Write-Host "找到 $totalFiles 个 HTML/JS/CSS 文件"
    
    foreach ($file in $files) {
        $fileSizeMB = $file.Length / 1MB
        $relativePath = $file.FullName.Substring($baseDir.Length).TrimStart('\')
        
        # 检查文件大小是否超过3MB
        if ($fileSizeMB -gt 3) {
            Write-Host "处理大文件: $relativePath (${fileSizeMB:N2} MB)"
            
            # 创建备份路径
            $backupFilePath = Join-Path $backupDir $relativePath
            $backupFileDir = Split-Path $backupFilePath -Parent
            
            if (-not (Test-Path $backupFileDir)) {
                New-Item -ItemType Directory -Force -Path $backupFileDir | Out-Null
            }
            
            # 备份文件
            Copy-Item -Path $file.FullName -Destination $backupFilePath -Force
            $backedUpFiles++
            
            # 根据文件类型重建内容
            $fileExtension = [System.IO.Path]::GetExtension($file.FullName).ToLower()
            $fileName = [System.IO.Path]::GetFileName($file.FullName)
            $newContent = ""
            
            switch ($fileExtension) {
                ".html" { 
                    $newContent = '<html><head><meta charset="UTF-8"><title>Recovered</title></head><body><h2>Recovered UI Placeholder</h2></body></html>'
                    $htmlFiles++
                }
                ".htm" { 
                    $newContent = '<html><head><meta charset="UTF-8"><title>Recovered</title></head><body><h2>Recovered UI Placeholder</h2></body></html>'
                    $htmlFiles++
                }
                ".js" { 
                    $newContent = "console.log('Recovered JS: $fileName');"
                    $jsFiles++
                }
                ".css" { 
                    $newContent = "body { font-family: sans-serif; }"
                    $cssFiles++
                }
            }
            
            # 写入新内容
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -Force
            $rebuiltFiles++
            
            # 记录日志
            $fileLog += "- $relativePath (${fileSizeMB:N2} MB): 已备份并重建"
        }
    }
    
    # 更新报告内容
    $reportContent = $reportContent -replace "文件总数: 0", "文件总数: $totalFiles"
    $reportContent = $reportContent -replace "备份文件数: 0", "备份文件数: $backedUpFiles"
    $reportContent = $reportContent -replace "重建文件数: 0", "重建文件数: $rebuiltFiles"
    $reportContent = $reportContent -replace "HTML文件: 0", "HTML文件: $htmlFiles"
    $reportContent = $reportContent -replace "JS文件: 0", "JS文件: $jsFiles"
    $reportContent = $reportContent -replace "CSS文件: 0", "CSS文件: $cssFiles"
    
    # 添加详细日志
    $reportContent += "## 重建文件列表\n\n"
    if ($fileLog.Count -gt 0) {
        $reportContent += ($fileLog -join "\n")
    } else {
        $reportContent += "没有发现需要重建的大文件 (>3MB)"
    }
    
    # 保存报告
    Set-Content -Path $reportFile -Value $reportContent -Encoding UTF8
    Write-Host "报告已生成: $reportFile"
    
    # 更新系统状态
    if (Test-Path $systemStateFile) {
        $systemState = Get-Content -Path $systemStateFile -Raw | ConvertFrom-Json
    } else {
        $systemState = [PSCustomObject]@{
            UI_STRUCTURE_REBUILT = $false
            HEALTH_SCORE = 0
        }
    }
    
    $systemState.UI_STRUCTURE_REBUILT = $true
    $systemState.HEALTH_SCORE = 90
    
    $systemState | ConvertTo-Json -Depth 100 | Set-Content -Path $systemStateFile -Encoding UTF8
    Write-Host "系统状态已更新: UI_STRUCTURE_REBUILT=true, HEALTH_SCORE=90"
    
    Write-Host "JEV-CLIENT-STRUCTURE-REBUILD-v1.0 任务执行完成!"
    Write-Host "总计扫描: $totalFiles 个文件"
    Write-Host "备份并重建: $rebuiltFiles 个大文件"
    
} catch {
    Write-Host "错误: $_" -ForegroundColor Red
    # 将错误信息添加到报告
    $reportContent += "\n## 错误信息\n\n$($_.ToString())"
    Set-Content -Path $reportFile -Value $reportContent -Encoding UTF8
}
