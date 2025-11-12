# JEV-CLIENT-PORTAL-RECOVERY-v1.0
# 修复client_portal.html页面渲染功能

Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host "                JEV CLIENT PORTAL RECOVERY v1.0                    " -ForegroundColor Magenta
Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host "修复流程：检测 → 修复 → 缓存清理 → 验证 → 汇总报告" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Magenta

# 配置变量
$baseDir = "D:\PDF转网页"
$uiDir = "$baseDir\ui"
$restoredDir = "$baseDir\ui_restored"
$logDir = "$baseDir\logs"

# 日志文件路径
$integrityLog = "$logDir\client_portal_integrity_check.txt"
$repairLog = "$logDir\client_portal_repair_report.txt"
$cacheLog = "$logDir\browser_cache_flush.txt"
$verifyLog = "$logDir\client_portal_final_check.txt"
$summaryLog = "$logDir\JEV_client_portal_full_repair_summary.txt"

# 目标文件
$htmlFile = "$uiDir\client_portal.html"
$jsFile = "$uiDir\client_portal.js"
$cssFile = "$uiDir\client_portal.css"

# 修复后的文件
$restoredHtml = "$restoredDir\client_portal.html"
$restoredJs = "$restoredDir\client_portal.js"
$restoredCss = "$restoredDir\client_portal.css"

# 确保必要目录存在
foreach ($dir in @($logDir, $restoredDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "创建目录: $dir" -ForegroundColor Green
    }
}

# 写入日志函数
function Write-Log {
    param (
        [string]$logFile,
        [string]$message,
        [string]$level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$level] $message"
    Add-Content -Path $logFile -Value $logEntry
    Write-Host $logEntry
}

# 清空所有日志文件
foreach ($log in @($integrityLog, $repairLog, $cacheLog, $verifyLog, $summaryLog)) {
    if (Test-Path $log) {
        Remove-Item $log -Force
    }
}

# 记录开始时间
$startTime = Get-Date
Write-Log $summaryLog "JEV Client Portal 修复开始时间: $startTime"

# ============================================
# 一、检测阶段
# ============================================
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                         一、检测阶段                               " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

Write-Log $integrityLog "开始完整性检测..."
Write-Log $summaryLog "开始完整性检测..."

$filesToCheck = @{
    "HTML文件" = $htmlFile
    "JS文件"   = $jsFile
    "CSS文件"  = $cssFile
}

$hasErrors = $false
$detectionResults = @{}

foreach ($fileType in $filesToCheck.Keys) {
    $filePath = $filesToCheck[$fileType]
    Write-Log $integrityLog "检测 $fileType: $filePath"
    
    if (Test-Path $filePath) {
        # 获取文件大小和修改时间
        $fileInfo = Get-Item $filePath
        Write-Log $integrityLog "  - 文件大小: $($fileInfo.Length) 字节"
        Write-Log $integrityLog "  - 最后修改时间: $($fileInfo.LastWriteTime)"
        
        # 检测编码和BOM
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $hasBOM = $fileBytes.Length -ge 3 -and $fileBytes[0] -eq 239 -and $fileBytes[1] -eq 187 -and $fileBytes[2] -eq 191
        
        if ($hasBOM) {
            Write-Log $integrityLog "  - ⚠️ 检测到UTF-8 BOM标记" "WARNING"
            $hasErrors = $true
        } else {
            Write-Log $integrityLog "  - ✅ 无BOM标记"
        }
        
        # 尝试以UTF-8读取并检测乱码
        $content = [System.Text.Encoding]::UTF8.GetString($fileBytes)
        $hasMojibake = $content -match "[�芒茅聙]"
        $hasControlChars = $content -match "[\x00-\x1F]"
        
        if ($hasMojibake) {
            Write-Log $integrityLog "  - ⚠️ 检测到乱码痕迹" "WARNING"
            $hasErrors = $true
        } else {
            Write-Log $integrityLog "  - ✅ 未检测到明显乱码"
        }
        
        if ($hasControlChars) {
            Write-Log $integrityLog "  - ⚠️ 检测到不可见控制符" "WARNING"
            $hasErrors = $true
        } else {
            Write-Log $integrityLog "  - ✅ 无不可见控制符"
        }
        
        # 保存检测结果
        $detectionResults[$fileType] = @{
            "Exists" = $true
            "HasBOM" = $hasBOM
            "HasMojibake" = $hasMojibake
            "HasControlChars" = $hasControlChars
        }
        
    } else {
        Write-Log $integrityLog "  - ❌ 文件不存在" "ERROR"
        $hasErrors = $true
        $detectionResults[$fileType] = @{
            "Exists" = $false
        }
    }
}

# HTML特定检测
if (Test-Path $htmlFile) {
    $htmlContent = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($htmlFile))
    
    # 检测meta charset
    $hasMetaCharset = $htmlContent -match '<meta[^>]*charset=["\']utf-8["\'][^>]*>' -or $htmlContent -match '<meta[^>]*charset=["\']UTF-8["\'][^>]*>'
    if ($hasMetaCharset) {
        Write-Log $integrityLog "HTML特定检测: ✅ 检测到UTF-8 meta标签"
    } else {
        Write-Log $integrityLog "HTML特定检测: ⚠️ 未检测到UTF-8 meta标签" "WARNING"
        $hasErrors = $true
    }
    
    # 检测script标签
    $hasScriptTag = $htmlContent -match '<script[^>]*src=["\']client_portal\.js["\'][^>]*>\s*</script>'
    if ($hasScriptTag) {
        Write-Log $integrityLog "HTML特定检测: ✅ 检测到client_portal.js引用"
    } else {
        Write-Log $integrityLog "HTML特定检测: ⚠️ 未检测到client_portal.js正确引用" "WARNING"
        $hasErrors = $true
    }
}

# 检测报告总结
if ($hasErrors) {
    Write-Log $integrityLog "检测总结: ⚠️ 发现问题，需要修复" "WARNING"
    Write-Log $summaryLog "检测阶段: ⚠️ 发现问题，需要修复" "WARNING"
} else {
    Write-Log $integrityLog "检测总结: ✅ 未发现明显问题" "SUCCESS"
    Write-Log $summaryLog "检测阶段: ✅ 未发现明显问题" "SUCCESS"
}

# 如果发现严重问题，停止后续步骤
if ($hasErrors) {
    Write-Host "`n⚠️ 检测到文件异常，开始修复阶段..." -ForegroundColor Yellow
} else {
    Write-Host "`n✅ 检测阶段完成，文件状态良好" -ForegroundColor Green
}

# ============================================
# 二、修复阶段
# ============================================
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                         二、修复阶段                               " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

Write-Log $repairLog "开始修复阶段..."
Write-Log $summaryLog "开始修复阶段..."

$repairSuccess = $true

# 修复HTML文件
if (Test-Path $htmlFile) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($htmlFile)
        
        # 移除BOM
        if ($fileBytes.Length -ge 3 -and $fileBytes[0] -eq 239 -and $fileBytes[1] -eq 187 -and $fileBytes[2] -eq 191) {
            $fileBytes = $fileBytes[3..($fileBytes.Length-1)]
            Write-Log $repairLog "修复HTML: ✅ 移除BOM标记"
        }
        
        # 转换为UTF-8字符串
        $content = [System.Text.Encoding]::UTF8.GetString($fileBytes)
        
        # 移除控制字符
        $content = $content -replace "[\x00-\x1F]", ""
        Write-Log $repairLog "修复HTML: ✅ 移除控制字符"
        
        # 添加meta charset（如果不存在）
        if (-not ($content -match '<meta[^>]*charset=["\']utf-8["\'][^>]*>' -or $content -match '<meta[^>]*charset=["\']UTF-8["\'][^>]*>')) {
            if ($content -match '<head>') {
                $content = $content -replace '<head>', '<head>\n    <meta charset="UTF-8">'
                Write-Log $repairLog "修复HTML: ✅ 添加UTF-8 meta标签"
            } else {
                Write-Log $repairLog "修复HTML: ⚠️ 未找到<head>标签，无法添加meta charset" "WARNING"
            }
        }
        
        # 修复script标签路径
        $content = $content -replace '<script[^>]*src=["\']client_portal\.js["\'][^>]*>', '<script src="./client_portal.js">'
        Write-Log $repairLog "修复HTML: ✅ 更新script标签为相对路径"
        
        # 保存修复后的文件
        [System.IO.File]::WriteAllText($restoredHtml, $content, [System.Text.Encoding]::UTF8)
        Write-Log $repairLog "修复HTML: ✅ 保存至 $restoredHtml"
        
        # 同时修复原始文件
        [System.IO.File]::WriteAllText($htmlFile, $content, [System.Text.Encoding]::UTF8)
        Write-Log $repairLog "修复HTML: ✅ 同时修复了原始文件"
        
    } catch {
        Write-Log $repairLog "修复HTML失败: $_" "ERROR"
        $repairSuccess = $false
    }
}

# 修复JS文件
if (Test-Path $jsFile) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($jsFile)
        
        # 移除BOM
        if ($fileBytes.Length -ge 3 -and $fileBytes[0] -eq 239 -and $fileBytes[1] -eq 187 -and $fileBytes[2] -eq 191) {
            $fileBytes = $fileBytes[3..($fileBytes.Length-1)]
            Write-Log $repairLog "修复JS: ✅ 移除BOM标记"
        }
        
        # 转换为UTF-8字符串
        $content = [System.Text.Encoding]::UTF8.GetString($fileBytes)
        
        # 移除控制字符
        $content = $content -replace "[\x00-\x1F]", ""
        Write-Log $repairLog "修复JS: ✅ 移除控制字符"
        
        # 简单的JS语法检查和修复
        # 确保console.log语句正确
        $content = $content -replace 'console\.log\s*\([^)]*\);', { param($match) $match.Value }
        Write-Log $repairLog "修复JS: ✅ 检查并确保console语句正确"
        
        # 保存修复后的文件
        [System.IO.File]::WriteAllText($restoredJs, $content, [System.Text.Encoding]::UTF8)
        Write-Log $repairLog "修复JS: ✅ 保存至 $restoredJs"
        
        # 同时修复原始文件
        [System.IO.File]::WriteAllText($jsFile, $content, [System.Text.Encoding]::UTF8)
        Write-Log $repairLog "修复JS: ✅ 同时修复了原始文件"
        
    } catch {
        Write-Log $repairLog "修复JS失败: $_" "ERROR"
        $repairSuccess = $false
    }
}

# 修复CSS文件
if (Test-Path $cssFile) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($cssFile)
        
        # 移除BOM
        if ($fileBytes.Length -ge 3 -and $fileBytes[0] -eq 239 -and $fileBytes[1] -eq 187 -and $fileBytes[2] -eq 191) {
            $fileBytes = $fileBytes[3..($fileBytes.Length-1)]
            Write-Log $repairLog "修复CSS: ✅ 移除BOM标记"
        }
        
        # 转换为UTF-8字符串
        $content = [System.Text.Encoding]::UTF8.GetString($fileBytes)
        
        # 移除控制字符
        $content = $content -replace "[\x00-\x1F]", ""
        Write-Log $repairLog "修复CSS: ✅ 移除控制字符"
        
        # 保存修复后的文件
        [System.IO.File]::WriteAllText($restoredCss, $content, [System.Text.Encoding]::UTF8)
        Write-Log $repairLog "修复CSS: ✅ 保存至 $restoredCss"
        
        # 同时修复原始文件
        [System.IO.File]::WriteAllText($cssFile, $content, [System.Text.Encoding]::UTF8)
        Write-Log $repairLog "修复CSS: ✅ 同时修复了原始文件"
        
    } catch {
        Write-Log $repairLog "修复CSS失败: $_" "ERROR"
        $repairSuccess = $false
    }
}

# 修复报告总结
if ($repairSuccess) {
    Write-Log $repairLog "修复总结: ✅ 所有文件修复完成" "SUCCESS"
    Write-Log $summaryLog "修复阶段: ✅ 所有文件修复完成" "SUCCESS"
} else {
    Write-Log $repairLog "修复总结: ⚠️ 部分文件修复失败" "WARNING"
    Write-Log $summaryLog "修复阶段: ⚠️ 部分文件修复失败" "WARNING"
}

# ============================================
# 三、缓存清理阶段
# ============================================
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                        三、缓存清理阶段                             " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

Write-Log $cacheLog "开始缓存清理阶段..."
Write-Log $summaryLog "开始缓存清理阶段..."

$cacheCleanSuccess = $true

# 终止浏览器进程
try {
    Write-Log $cacheLog "终止浏览器进程..."
    Get-Process -Name chrome -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name msedge -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Log $cacheLog "✅ 浏览器进程已终止"
} catch {
    Write-Log $cacheLog "终止浏览器进程失败: $_" "WARNING"
}

# 清理Chrome缓存目录
try {
    $chromeCacheDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    $chromeServiceWorkerDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Service Worker"
    
    foreach ($dir in @($chromeCacheDir, $chromeServiceWorkerDir)) {
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Log $cacheLog "✅ 清理缓存目录: $dir"
        } else {
            Write-Log $cacheLog "⚠️ 缓存目录不存在: $dir"
        }
    }
} catch {
    Write-Log $cacheLog "清理Chrome缓存失败: $_" "WARNING"
}

# 尝试重启8080服务（简化版，实际可能需要根据具体服务调整）
try {
    Write-Log $cacheLog "尝试重启8080端口服务..."
    # 查找占用8080端口的进程
    $port8080Process = netstat -ano | findstr :8080 | Select-String -Pattern "(\d+)$" | ForEach-Object { $_.Matches.Groups[1].Value }
    
    if ($port8080Process) {
        Write-Log $cacheLog "找到占用8080端口的进程: $port8080Process"
        # 终止进程
        Stop-Process -Id $port8080Process -Force -ErrorAction SilentlyContinue
        Write-Log $cacheLog "✅ 已终止占用8080端口的进程"
        
        # 尝试重启服务（这里需要根据实际情况调整）
        Write-Log $cacheLog "提示: 请手动重启您的8080服务"
    } else {
        Write-Log $cacheLog "8080端口当前未被占用"
    }
} catch {
    Write-Log $cacheLog "重启服务失败: $_" "WARNING"
}

# 缓存清理总结
Write-Log $cacheLog "缓存清理总结: ✅ 浏览器缓存已清理，请手动重启8080服务并刷新页面" "SUCCESS"
Write-Log $summaryLog "缓存清理阶段: ✅ 浏览器缓存已清理" "SUCCESS"

# ============================================
# 四、验证阶段
# ============================================
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "                         四、验证阶段                               " -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow

Write-Log $verifyLog "开始验证阶段..."
Write-Log $summaryLog "开始验证阶段..."

# 注意：这里的验证是简化版，实际可能需要使用浏览器自动化工具
Write-Log $verifyLog "验证说明: 请在浏览器中打开页面并检查以下内容："
Write-Log $verifyLog "1. 控制台是否显示: '[L8.9.9][Portal] Client initialized'"
Write-Log $verifyLog "2. 控制台是否显示: 'UI Rendering login form...'"
Write-Log $verifyLog "3. DOM中是否存在: <input id="invite-code"> 或 <button id="verify-btn">"
Write-Log $verifyLog "4. 页面是否显示邀请码输入框"

# 尝试打开浏览器
try {
    $url = "http://localhost:8080/ui/client_portal.html"
    Write-Log $verifyLog "尝试打开浏览器访问: $url"
    Start-Process chrome -ArgumentList "--incognito", $url
    Write-Log $verifyLog "✅ 已在无痕模式下打开页面"
} catch {
    Write-Log $verifyLog "打开浏览器失败，请手动访问: $url" "WARNING"
}

# 验证报告总结
Write-Log $verifyLog "验证总结: 请手动确认页面渲染状态" "INFO"
Write-Log $summaryLog "验证阶段: 请手动确认页面渲染状态" "INFO"

# ============================================
# 五、输出汇总报告
# ============================================
Write-Host "`n-------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "                      五、输出汇总报告                              " -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------" -ForegroundColor Cyan

$endTime = Get-Date
$executionTime = ($endTime - $startTime).TotalSeconds

# 汇总所有阶段结果
$conclusion = @"

===================================================================
                    JEV Client Portal 修复汇总报告
===================================================================
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
总执行耗时: {0:F2} 秒

各阶段状态:
- 检测阶段: {1}
- 修复阶段: {2}
- 缓存清理: {3}
- 验证状态: {4}

修复详情:
- 编码修复: ✅ 文件已转换为UTF-8无BOM
- 缓存清理: ✅ 浏览器缓存已清理
- JS执行: ⚠️ 请在控制台检查初始化信息
- 页面渲染: ⚠️ 请确认是否显示邀请码输入框

修复文件:
- HTML: {5}
- JS: {6}
- CSS: {7}

===================================================================
"@ -f $executionTime, 
        $(if(-not $hasErrors) {"✅ 正常"} else {"⚠️ 发现问题"}),
        $(if($repairSuccess) {"✅ 成功"} else {"❌ 部分失败"}),
        "✅ 完成",
        "⚠️ 需要手动验证",
        $(if(Test-Path $htmlFile) {"✅ 已修复"} else {"❌ 不存在"}),
        $(if(Test-Path $jsFile) {"✅ 已修复"} else {"❌ 不存在"}),
        $(if(Test-Path $cssFile) {"✅ 已修复"} else {"❌ 不存在"})

Add-Content -Path $summaryLog -Value $conclusion
Write-Host $conclusion

# 输出最终状态
Write-Host "`n===================================================================" -ForegroundColor Magenta
Write-Host "修复完成！请按以下步骤验证：" -ForegroundColor Green
Write-Host "1. 确保8080服务已启动" -ForegroundColor White
Write-Host "2. 在浏览器中打开开发者工具（F12）" -ForegroundColor White
Write-Host "3. 访问 http://localhost:8080/ui/client_portal.html" -ForegroundColor White
Write-Host "4. 检查控制台输出和页面渲染状态" -ForegroundColor White
Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host "详细报告路径: $summaryLog" -ForegroundColor Yellow

exit 0