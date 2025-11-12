# JEV-SENTINEL-DASHBOARD-SELF-CHECK-v1.0
# 全面检查sentinel_dashboard.html文件的完整性、编码一致性与缓存循环情况

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "JEV Sentinel Dashboard Self-Check v1.0" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 配置变量
$targetFile = "D:\PDF转网页\ui\sentinel_dashboard.html"
$logDir = "D:\PDF转网页\logs"
$logFile = "$logDir\sentinel_selfcheck_report.txt"
$localhostUrl = "http://localhost:8080/ui/sentinel_dashboard.html"

# 确保日志目录存在
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 清空之前的日志
if (Test-Path $logFile) {
    Remove-Item $logFile -Force
}

# 写入日志函数
function Write-Log {
    param (
        [string]$message,
        [string]$level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$level] $message"
    Add-Content -Path $logFile -Value $logEntry
    Write-Host $logEntry
}

Write-Log "开始自检流程..."

# 一、文件基本信息检测
Write-Log "===== 文件基本信息检测 ====="
try {
    if (-not (Test-Path $targetFile)) {
        Write-Log "错误：目标文件不存在!" "ERROR"
        exit 1
    }
    
    $fileInfo = Get-Item $targetFile
    $fileSize = $fileInfo.Length
    $lastModified = $fileInfo.LastWriteTime
    $accessTime = $fileInfo.LastAccessTime
    
    Write-Log "文件路径: $targetFile"
    Write-Log "文件大小: $fileSize 字节"
    Write-Log "最后修改时间: $lastModified"
    Write-Log "最后访问时间: $accessTime"
    
    # 检查文件大小异常
    if ($fileSize -gt 100KB) {
        Write-Log "警告：文件大小超过100KB，可能存在缓存冲突风险" "WARNING"
    }
    
    # 检查修改时间是否频繁变化
    $currentTime = Get-Date
    $timeDiff = ($currentTime - $lastModified).TotalMinutes
    if ($timeDiff -lt 5) {
        Write-Log "警告：文件近期有修改（$timeDiff 分钟内），建议监控是否频繁变动" "WARNING"
    }
} catch {
    Write-Log "获取文件信息失败: $_" "ERROR"
}

# 二、编码层检测
Write-Log "===== 编码层检测 ====="
try {
    # 读取文件内容
    $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)
    $content = [System.Text.Encoding]::UTF8.GetString($fileBytes)
    
    # 检查是否包含乱码字符
    $hasMojibake = $content -match "[�芒茅聙]"
    if ($hasMojibake) {
        Write-Log "警告：检测到残留错位字符" "WARNING"
        
        # 尝试识别乱码模式
        if ($content -match "芒") { Write-Log "  - 发现 Latin-1 编码残留特征字符 '芒'" }
        if ($content -match "茅") { Write-Log "  - 发现 Latin-1 编码残留特征字符 '茅'" }
        if ($content -match "聙") { Write-Log "  - 发现 Latin-1 编码残留特征字符 '聙'" }
    } else {
        Write-Log "✅ 未检测到明显的错位字符"
    }
    
    # 检查meta charset标签
    $hasMetaCharset = $content -match '<meta[^>]*charset=["\']utf-8["\'][^>]*>' -or $content -match '<meta[^>]*charset=["\']UTF-8["\'][^>]*>'
    if ($hasMetaCharset) {
        Write-Log "✅ 检测到UTF-8 meta标签"
    } else {
        Write-Log "警告：未检测到UTF-8 meta标签" "WARNING"
    }
    
    # 检查BOM
    $hasBOM = $fileBytes[0] -eq 239 -and $fileBytes[1] -eq 187 -and $fileBytes[2] -eq 191
    if ($hasBOM) {
        Write-Log "警告：文件包含UTF-8 BOM标记" "WARNING"
    } else {
        Write-Log "✅ 文件无BOM标记"
    }
} catch {
    Write-Log "编码检测失败: $_" "ERROR"
}

# 三、结构完整性检测
Write-Log "===== HTML结构完整性检测 ====="
try {
    # 基本标签匹配检查
    $htmlStartCount = ($content | Select-String -Pattern '<html[^>]*>' -AllMatches).Matches.Count
    $htmlEndCount = ($content | Select-String -Pattern '</html>' -AllMatches).Matches.Count
    $bodyStartCount = ($content | Select-String -Pattern '<body[^>]*>' -AllMatches).Matches.Count
    $bodyEndCount = ($content | Select-String -Pattern '</body>' -AllMatches).Matches.Count
    
    if ($htmlStartCount -eq 1 -and $htmlEndCount -eq 1) {
        Write-Log "✅ HTML标签匹配正常"
    } else {
        Write-Log "警告：HTML标签不匹配（开始: $htmlStartCount, 结束: $htmlEndCount）" "WARNING"
    }
    
    if ($bodyStartCount -eq 1 -and $bodyEndCount -eq 1) {
        Write-Log "✅ BODY标签匹配正常"
    } else {
        Write-Log "警告：BODY标签不匹配（开始: $bodyStartCount, 结束: $bodyEndCount）" "WARNING"
    }
} catch {
    Write-Log "HTML结构检测失败: $_" "ERROR"
}

# 四、浏览器响应检测（简化版，使用PowerShell的Invoke-WebRequest）
Write-Log "===== 浏览器响应检测 ====="
try {
    # 生成时间戳
    $timestamp = Get-Date -UFormat %s
    $fullUrl = "$localhostUrl?nocache=$timestamp"
    
    Write-Log "尝试访问: $fullUrl"
    
    # 发送请求并获取响应头
    $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -ErrorAction Stop
    
    # 检查Content-Type
    $contentType = $response.Headers['Content-Type']
    if ($contentType -and $contentType -like '*text/html*' -and $contentType -like '*charset=UTF-8*') {
        Write-Log "✅ Content-Type正确: $contentType"
    } else {
        Write-Log "警告：Content-Type可能不正确: $contentType" "WARNING"
    }
    
    # 检查响应内容中的关键文本
    $responseContent = $response.Content
    $hasDashboardTitle = $responseContent -match 'JEV Global Sentinel Dashboard'
    if ($hasDashboardTitle) {
        Write-Log "✅ 页面标题检测正常"
    } else {
        Write-Log "警告：未检测到预期的页面标题" "WARNING"
    }
    
    # 检查响应内容中的乱码
    $responseHasMojibake = $responseContent -match "[�芒茅聙]"
    if ($responseHasMojibake) {
        Write-Log "警告：响应内容中存在乱码特征" "WARNING"
    } else {
        Write-Log "✅ 响应内容未检测到明显乱码"
    }
    
} catch {
    Write-Log "浏览器响应检测失败（可能服务未启动）: $_" "WARNING"
    Write-Log "建议：请确保localhost:8080服务正在运行" "INFO"
}

# 五、生成总结报告
Write-Log "===== 自检总结 ====="
try {
    $summary = @"

==================================
JEV Sentinel Dashboard 自检报告
==================================
检测时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
文件路径: $targetFile

1. 文件基本状态
   - 大小: $fileSize 字节
   - 最后修改: $lastModified

2. 编码完整性
   - UTF-8 Meta标签: $(if($hasMetaCharset) {"✅ 存在"} else {"❌ 缺失"})
   - BOM标记: $(if($hasBOM) {"⚠️ 存在"} else {"✅ 不存在"})
   - 错位字符: $(if($hasMojibake) {"❌ 检测到"} else {"✅ 未检测到"})

3. HTML结构
   - HTML标签: $(if($htmlStartCount -eq 1 -and $htmlEndCount -eq 1) {"✅ 完整"} else {"❌ 不完整"})
   - BODY标签: $(if($bodyStartCount -eq 1 -and $bodyEndCount -eq 1) {"✅ 完整"} else {"❌ 不完整"})

4. 访问状态
   - 服务响应: $(try { if($response) {"✅ 正常"} else {"❌ 无响应"} } catch {"❌ 未检测"})
   - 页面标题: $(if($hasDashboardTitle) {"✅ 正确"} else {"❌ 异常"})

===== 修复建议 =====
"@
    
    # 添加修复建议
    $suggestions = @()
    if (-not $hasMetaCharset) {
        $suggestions += "1. 在<head>标签内添加: <meta charset=\"UTF-8\">"
    }
    if ($hasBOM) {
        $suggestions += "2. 使用编辑器（如Notepad++）转换为UTF-8无BOM格式"
    }
    if ($hasMojibake) {
        $suggestions += "3. 执行JEV_DIRECT_HTML_ENCODING_FIX_v5.0.ps1进行深度修复"
    }
    if (-not $hasDashboardTitle) {
        $suggestions += "4. 页面标题异常，建议重新生成或检查服务器配置"
    }
    
    if ($suggestions.Count -eq 0) {
        $suggestions += "✅ 未发现明显问题，页面状态良好"
    }
    
    $summary += ($suggestions -join "`n")
    
    # 判断整体状态
    $allGood = (-not $hasMojibake) -and $hasMetaCharset -and (-not $hasBOM) -and 
               ($htmlStartCount -eq 1 -and $htmlEndCount -eq 1) -and 
               ($bodyStartCount -eq 1 -and $bodyEndCount -eq 1) -and $hasDashboardTitle
    
    if ($allGood) {
        $summary += "`n`n✅ 自检结果: 全绿 - 页面已彻底修复"
        Write-Host "✅ 自检结果: 全绿 - 页面已彻底修复" -ForegroundColor Green
    } else {
        $summary += "`n`n⚠️ 自检结果: 存在问题 - 建议执行修复操作"
        Write-Host "⚠️ 自检结果: 存在问题 - 建议执行修复操作" -ForegroundColor Yellow
    }
    
    # 写入完整报告
    Add-Content -Path $logFile -Value $summary
    Write-Log "自检报告已保存至: $logFile"
    
} catch {
    Write-Log "生成总结报告失败: $_" "ERROR"
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "自检完成！" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan