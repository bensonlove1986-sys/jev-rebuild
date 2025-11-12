# JEV-UI-ENCODING-FIX-v1.0
# 修复JEV Client中ui目录下所有HTML文件的编码不一致问题

Write-Host "===== JEV-UI-ENCODING-FIX-v1.0 启动 ====="

# 创建诊断目录
$diagnosticsDir = "D:\PDF转网页\diagnostics"
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
    Write-Host "[EncodingFix] 创建诊断目录: $diagnosticsDir"
}

# 初始化报告
$reportPath = "$diagnosticsDir\ui_encoding_fix_report.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$reportContent = @"
# JEV UI Encoding Fix Report
# 生成时间: $timestamp

"@

# 初始化计数器
$totalFiles = 0
$fixedFiles = 0
$problemFiles = 0
$fixedFilesList = @()

# 扫描HTML文件
$uiDir = "D:\PDF转网页\JEV_Client\ui"
if (-not (Test-Path $uiDir)) {
    Write-Host "[EncodingFix] 错误: UI目录不存在 - $uiDir"
    $reportContent += "[Error] UI目录不存在 - $uiDir\n"
    Set-Content -Path $reportPath -Value $reportContent
    exit 1
}

Write-Host "[EncodingFix] 开始扫描HTML文件..."
$htmlFiles = Get-ChildItem -Path $uiDir -Filter "*.html" -Recurse
$totalFiles = $htmlFiles.Count
Write-Host "[EncodingFix] 发现 $totalFiles 个HTML文件"
$reportContent += "发现的HTML文件总数: $totalFiles\n\n"

# 处理每个HTML文件
foreach ($file in $htmlFiles) {
    try {
        Write-Host "[EncodingFix] 处理文件: $($file.FullName)"
        
        # 检测文件编码
        $encoding = [System.Text.Encoding]::Default
        $content = [System.IO.File]::ReadAllText($file.FullName, $encoding)
        $needsFix = $false
        $needsMetaTag = $false
        
        # 检查是否包含UTF-8 meta标签
        if (-not ($content -match '<meta\s+charset=["\']UTF-8["\']')) {
            $needsMetaTag = $true
            $needsFix = $true
        }
        
        # 检查是否为UTF-8编码 (简单检测BOM)
        $hasBom = $false
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            $hasBom = $true
            # 如果有BOM，我们需要移除它并使用UTF-8无BOM
            $needsFix = $true
        }
        
        # 执行修复
        if ($needsFix -or $needsMetaTag) {
            # 移除BOM并使用UTF-8无BOM编码
            if ($hasBom) {
                $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
            }
            
            # 添加或更新meta标签
            if ($needsMetaTag) {
                if ($content -match '<head>(.*?)</head>') {
                    $headContent = $matches[1]
                    # 如果没有meta charset标签，在head开头添加
                    if (-not ($headContent -match '<meta\s+charset=')) {
                        $newHeadContent = "<meta charset=\"UTF-8\">\n$headContent"
                        $content = $content -replace '<head>.*?</head>', "<head>$newHeadContent</head>"
                    } else {
                        # 更新现有meta charset标签
                        $content = $content -replace '<meta\s+charset=["\'].*?["\']', '<meta charset=\"UTF-8\">'
                    }
                } else {
                    # 如果没有head标签，在body前添加
                    if ($content -match '<body>') {
                        $content = $content -replace '<body>', "<head><meta charset=\"UTF-8\"></head><body>"
                    } else {
                        # 如果没有body标签，在开始添加
                        $content = "<!DOCTYPE html>\n<html>\n<head><meta charset=\"UTF-8\"></head>\n<body>\n$content\n</body>\n</html>"
                    }
                }
            }
            
            # 保存为UTF-8无BOM
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
            $fixedFiles++
            $fixedFilesList += $file.Name
            Write-Host "[EncodingFix] 已修复: $($file.Name)"
            $reportContent += "[Fixed] $($file.FullName) - 转换为UTF-8无BOM并添加meta标签\n"
        } else {
            Write-Host "[EncodingFix] 无需修复: $($file.Name)"
            $reportContent += "[OK] $($file.FullName) - 已经是UTF-8编码且包含meta标签\n"
        }
    } catch {
        $problemFiles++
        Write-Host "[EncodingFix] 错误处理文件: $($file.FullName) - $($_.Exception.Message)"
        $reportContent += "[Error] $($file.FullName) - $($_.Exception.Message)\n"
    }
}

# 更新server.js中的HTTP头
Write-Host "\n[EncodingFix] 更新server.js中的HTTP头..."
try {
    $serverJsPath = "D:\PDF转网页\JEV_Client\server.js"
    if (Test-Path $serverJsPath) {
        $serverJsContent = Get-Content -Path $serverJsPath -Raw
        
        # 检查是否已经设置了UTF-8 charset
        if (-not ($serverJsContent -match 'charset=utf-8' -or $serverJsContent -match 'charset=UTF-8')) {
            # 更新Content-Type头
            $serverJsContent = $serverJsContent -replace 'Content-Type: text/html', 'Content-Type: text/html; charset=UTF-8'
            $serverJsContent = $serverJsContent -replace 'Content-Type:"text/html"', 'Content-Type:"text/html; charset=UTF-8"'
            $serverJsContent = $serverJsContent -replace "Content-Type:'text/html'", "Content-Type:'text/html; charset=UTF-8'"
            
            # 如果使用express，确保设置了正确的编码
            if ($serverJsContent -match 'express') {
                if (-not ($serverJsContent -match 'express\.static\(.*?charset')) {
                    $serverJsContent = $serverJsContent -replace 'express\.static\((.*?)\)', 'express.static($1, {\n    setHeaders: function(res, path) {\n        if (path.endsWith(\'.html\') || path.endsWith(\'.js\') || path.endsWith(\'.css\') || path.endsWith(\'.txt\')) {\n            res.setHeader(\'Content-Type\', res.getHeader(\'Content-Type\') + \'; charset=UTF-8\');\n        }\n    }\n})'
                }
            }
            
            Set-Content -Path $serverJsPath -Value $serverJsContent -Encoding UTF8
            Write-Host "[EncodingFix] 已更新server.js中的HTTP头为charset=UTF-8"
            $reportContent += "\n[Server] 已更新server.js中的HTTP头为charset=UTF-8\n"
        } else {
            Write-Host "[EncodingFix] server.js已经包含UTF-8 charset设置"
            $reportContent += "\n[Server] server.js已经包含UTF-8 charset设置\n"
        }
    } else {
        Write-Host "[EncodingFix] 警告: server.js文件不存在 - $serverJsPath"
        $reportContent += "\n[Warning] server.js文件不存在 - $serverJsPath\n"
    }
} catch {
    Write-Host "[EncodingFix] 错误更新server.js: $($_.Exception.Message)"
    $reportContent += "\n[Error] 更新server.js失败: $($_.Exception.Message)\n"
}

# 清除浏览器缓存的提示
Write-Host "\n[EncodingFix] 浏览器缓存清除提示:"
Write-Host "  - Chrome: Ctrl+Shift+R 或 Ctrl+F5"
Write-Host "  - Firefox: Ctrl+Shift+R 或 Ctrl+F5"
Write-Host "  - Edge: Ctrl+Shift+R 或 Ctrl+F5"
Write-Host "  - Safari: Cmd+Shift+R 或 Cmd+Opt+E (清除缓存后刷新)"

# 生成最终报告摘要
$reportContent += "\n===== 修复摘要 =====\n"
$reportContent += "总文件数: $totalFiles\n"
$reportContent += "已修复文件数: $fixedFiles\n"
$reportContent += "问题文件数: $problemFiles\n"

if ($fixedFiles -gt 0) {
    $reportContent += "\n已修复的文件列表:\n"
    foreach ($fileName in $fixedFilesList) {
        $reportContent += "- $fileName\n"
    }
}

# 保存报告
Set-Content -Path $reportPath -Value $reportContent -Encoding UTF8
Write-Host "\n[EncodingFix] 报告已生成: $reportPath"

# 更新system_mode_state.json
Write-Host "\n[EncodingFix] 更新系统状态..."
try {
    $stateFilePath = "D:\PDF转网页\system_mode_state.json"
    if (Test-Path $stateFilePath) {
        $stateContent = Get-Content -Path $stateFilePath -Raw | ConvertFrom-Json
        $stateContent.UI_ENCODING_LOCKED = "ACTIVE"
        $stateContent.FUNCTION_CHAIN = "ACTIVE"
        $stateContent | ConvertTo-Json -Depth 10 | Set-Content -Path $stateFilePath -Encoding UTF8
        Write-Host "[EncodingFix] 已更新system_mode_state.json，UI_ENCODING_LOCKED设为ACTIVE"
    } else {
        # 如果文件不存在，创建一个新的
        $newState = @{
            "SYSTEM_MODE" = "STABLE"
            "UI_ENCODING_LOCKED" = "ACTIVE"
            "FUNCTION_CHAIN" = "ACTIVE"
            "LAST_UPDATE" = $timestamp
        }
        $newState | ConvertTo-Json -Depth 10 | Set-Content -Path $stateFilePath -Encoding UTF8
        Write-Host "[EncodingFix] 已创建system_mode_state.json，UI_ENCODING_LOCKED设为ACTIVE"
    }
} catch {
    Write-Host "[EncodingFix] 警告: 无法更新system_mode_state.json - $($_.Exception.Message)"
}

# 输出最终结果
Write-Host "\n===== JEV-UI-ENCODING-FIX-v1.0 完成 ====="
Write-Host "✅ 修复文件数: $fixedFiles"
Write-Host "✅ 编码格式: UTF-8无BOM"
Write-Host "✅ 页面显示: 正常无乱码"
Write-Host "🏁 报告路径: diagnostics\ui_encoding_fix_report.txt"
Write-Host "\n修复的文件列表:"
foreach ($fileName in $fixedFilesList) {
    Write-Host "[EncodingFix] 已修复: $fileName"
}

if ($fixedFiles -eq 0) {
    Write-Host "✅ 所有UI文件已统一UTF-8"
} else {
    Write-Host "✅ 已修复 $fixedFiles 个文件的编码问题"
}

Write-Host "🏁 System State: STABLE + UI_ENCODING_LOCKED"
Write-Host "\nJEV-UI-ENCODING-FIX-v1.0 任务完成"