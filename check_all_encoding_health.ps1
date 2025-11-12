# PowerShell脚本：JEV 全盘文件编码健康检测
# 功能：检测JEV_Client目录下所有指定类型文件的编码健康状态，识别异常文件

# 设置变量
$targetDirectory = "D:\PDF转网页\JEV_Client"
$reportPath = "D:\PDF转网页\JEV_Client\diagnostics\encoding_health_report.txt"
$fileTypes = @("*.html", "*.js", "*.css", "*.json", "*.txt", "*.md", "*.ps1", "*.bat", "*.log", "*.yml", "*.ini", "*.csv")
$startTime = Get-Date
$twoDaysAgo = $startTime.AddDays(-2)

# 统计变量
$totalFiles = 0
$abnormalFiles = @()
$utf8Files = 0
$fileTypeCount = @{}

# 函数：检测文件是否包含乱码符号
function Test-FileForGarbage {
    param (
        [string]$filePath
    )
    
    try {
        # 使用UTF8编码读取文件内容
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8 -ErrorAction Stop
        
        # 检查常见乱码符号
        if ($content -match "�" -or 
            $content -match "\u0000" -or 
            $content -match "ÿþ" -or 
            $content -match "¿½") {
            return $true, "包含乱码符号"
        }
    } catch {
        # 读取错误可能是编码问题
        return $true, "读取错误（可能是编码问题）"
    }
    
    return $false, $null
}

# 函数：检测文件编码
function Test-FileEncoding {
    param (
        [string]$filePath
    )
    
    try {
        # 尝试检测文件编码
        $bytes = Get-Content -Path $filePath -Encoding Byte -TotalCount 3
        
        # 检查BOM
        if ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            return "UTF-8 with BOM", $true
        } elseif ($bytes.Count -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
            return "UTF-16 LE", $false
        } elseif ($bytes.Count -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
            return "UTF-16 BE", $false
        }
        
        # 尝试作为UTF-8读取
        try {
            [void][System.Text.Encoding]::UTF8.GetString($bytes)
            return "UTF-8", $true
        } catch {
            return "未知编码", $false
        }
    } catch {
        return "无法检测", $false
    }
}

# 函数：检测文件名是否包含非法字符
function Test-FileNameForIllegalChars {
    param (
        [string]$filePath
    )
    
    $fileName = Split-Path $filePath -Leaf
    $illegalChars = [System.IO.Path]::GetInvalidFileNameChars()
    
    foreach ($char in $illegalChars) {
        if ($fileName -contains $char) {
            return $true, "文件名包含非法字符"
        }
    }
    
    return $false, $null
}

# 确保diagnostics目录存在
$diagnosticsDir = Split-Path $reportPath -Parent
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
}

# 开始检测
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "[JEV 全盘文件健康检测]" -ForegroundColor Cyan
Write-Host "扫描目录: $targetDirectory" -ForegroundColor Cyan
Write-Host "开始时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 扫描所有指定类型的文件
try {
    # 创建报告内容
    $reportContent = @"
============================================
[JEV 全盘文件健康检测]
扫描目录: $targetDirectory
开始时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
============================================
"@
    
    # 遍历所有文件类型
    foreach ($fileType in $fileTypes) {
        $files = Get-ChildItem -Path $targetDirectory -Filter $fileType -Recurse -ErrorAction SilentlyContinue
        $extension = $fileType.TrimStart('*')
        $fileTypeCount[$extension] = $files.Count
        
        foreach ($file in $files) {
            $totalFiles++
            $abnormalReasons = @()
            
            # 检测文件大小
            $fileSizeKB = [math]::Round(($file.Length / 1KB), 2)
            if ($file.Length -eq 0) {
                $abnormalReasons += "文件大小 0KB"
            } elseif ($file.Length -lt 512) { # 小于0.5KB
                $abnormalReasons += "文件大小异常 ($fileSizeKB KB)"
            }
            
            # 检测乱码符号
            $hasGarbage, $garbageReason = Test-FileForGarbage -filePath $file.FullName
            if ($hasGarbage) {
                $abnormalReasons += $garbageReason
            }
            
            # 检测文件编码
            $encoding, $isUtf8 = Test-FileEncoding -filePath $file.FullName
            if ($isUtf8) {
                $utf8Files++
            } else {
                $abnormalReasons += "非UTF-8编码 ($encoding)"
            }
            
            # 检测最近修改时间
            if ($file.LastWriteTime -ge $twoDaysAgo) {
                $abnormalReasons += "最近2天被修改 ($($file.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')))"
            }
            
            # 检测文件名非法字符
            $hasIllegalChars, $illegalReason = Test-FileNameForIllegalChars -filePath $file.FullName
            if ($hasIllegalChars) {
                $abnormalReasons += $illegalReason
            }
            
            # 如果有异常，添加到异常文件列表
            if ($abnormalReasons.Count -gt 0) {
                $abnormalFiles += @{
                    Path = $file.FullName
                    Reasons = $abnormalReasons -join "; "
                }
            }
        }
    }
    
    # 输出异常文件信息
    if ($abnormalFiles.Count -gt 0) {
        Write-Host "⚠️  发现异常文件:" -ForegroundColor Red
        $reportContent += "⚠️  发现异常文件:\n"
        
        foreach ($abnormal in $abnormalFiles) {
            Write-Host "- 路径: $($abnormal.Path) (原因: $($abnormal.Reasons))" -ForegroundColor Red
            $reportContent += "- 路径: $($abnormal.Path) (原因: $($abnormal.Reasons))\n"
        }
    } else {
        Write-Host "✅ 所有文件健康，系统已完全免疫。" -ForegroundColor Green
        $reportContent += "✅ 所有文件健康，系统已完全免疫。\n"
    }
    
    # 计算耗时
    $endTime = Get-Date
    $duration = New-TimeSpan -Start $startTime -End $endTime
    
    # 输出总结信息
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "✅ 检测结果总结:" -ForegroundColor Cyan
    Write-Host "总文件数: $totalFiles" -ForegroundColor Cyan
    Write-Host "异常文件数: $($abnormalFiles.Count)" -ForegroundColor Cyan
    Write-Host "UTF-8 文件数: $utf8Files" -ForegroundColor Cyan
    Write-Host "检测耗时: $($duration.TotalSeconds.ToString('0.00')) 秒" -ForegroundColor Cyan
    
    # 文件类型分布
    Write-Host "文件类型分布:" -ForegroundColor Cyan
    $reportContent += "============================================\n✅ 检测结果总结:\n"
    $reportContent += "总文件数: $totalFiles\n"
    $reportContent += "异常文件数: $($abnormalFiles.Count)\n"
    $reportContent += "UTF-8 文件数: $utf8Files\n"
    $reportContent += "检测耗时: $($duration.TotalSeconds.ToString('0.00')) 秒\n"
    $reportContent += "文件类型分布:\n"
    
    foreach ($extension in $fileTypeCount.Keys | Sort-Object) {
        $count = $fileTypeCount[$extension]
        if ($count -gt 0) {
            Write-Host "- ${extension}: $count 个" -ForegroundColor Cyan
            $reportContent += "- ${extension}: $count 个\n"
        }
    }
    
    Write-Host "============================================" -ForegroundColor Cyan
    $reportContent += "============================================\n"
    
    # 保存报告文件
    $reportContent | Out-File -FilePath $reportPath -Encoding UTF8 -Force
    Write-Host "报告已保存至: $reportPath" -ForegroundColor Green
    
} catch {
    Write-Host "❌ 检测过程中发生错误: $_" -ForegroundColor Red
    # 保存错误报告
    $errorReport = @"
============================================
[JEV 全盘文件健康检测] - 错误报告
扫描目录: $targetDirectory
开始时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
错误信息: $_
============================================
"@
    $errorReport | Out-File -FilePath $reportPath -Encoding UTF8 -Force
}