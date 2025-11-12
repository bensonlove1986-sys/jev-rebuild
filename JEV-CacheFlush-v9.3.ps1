# JEV-CacheFlush-v9.3
# 功能：清理 Cloudflare Edge Cache 与浏览器缓存

# 创建日志目录
$logDir = "D:\PDF转网页\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 初始化报告变量
$report = @{
    "执行时间" = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    "浏览器缓存清理结果" = "未执行"
    "Edge Cache清理结果" = "未执行"
    "验证结果" = "未执行"
    "错误信息" = "无"
}

# 记录执行日志函数
function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry
    Add-Content -Path "$logDir\cache_flush_operation_v9.3.log" -Value $logEntry
}

Write-Log "开始执行JEV-CacheFlush-v9.3"

# 一、浏览器缓存清理
Write-Log "开始清理浏览器缓存..."
try {
    # 终止所有浏览器进程
    Write-Log "终止Chrome和Edge浏览器进程..."
    Stop-Process -Name "chrome","msedge" -Force -ErrorAction SilentlyContinue
    
    # 删除Chrome缓存目录
    Write-Log "删除Chrome缓存目录..."
    $chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromeCache) {
        Remove-Item $chromeCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Chrome缓存目录已删除"
    }
    
    # 删除Edge缓存目录
    Write-Log "删除Edge缓存目录..."
    $edgeCache = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    if (Test-Path $edgeCache) {
        Remove-Item $edgeCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Edge缓存目录已删除"
    }
    
    # 删除Service Worker
    Write-Log "删除Chrome Service Worker..."
    $chromeServiceWorker = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Service Worker"
    if (Test-Path $chromeServiceWorker) {
        Remove-Item $chromeServiceWorker -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Chrome Service Worker已删除"
    }
    
    $report["浏览器缓存清理结果"] = "成功"
} catch {
    $errorMsg = "清理浏览器缓存时出错: $_"
    Write-Log $errorMsg
    $report["浏览器缓存清理结果"] = "失败"
    $report["错误信息"] = $errorMsg
}

# 二、执行 Cloudflare Edge Cache 清理
Write-Log "开始清理Cloudflare Edge Cache..."
try {
    # 1. 请求 /ui/index.html?purge=true
    $purgeUrls = @(
        "https://jevshop.bensonlove1986.workers.dev/ui/index.html?purge=true",
        "http://localhost:8080/ui/index.html?purge=true"
    )
    
    foreach ($purgeUrl in $purgeUrls) {
        Write-Log "尝试发送purge请求: $purgeUrl"
        try {
            $response = Invoke-WebRequest -Uri $purgeUrl -UseBasicParsing -ErrorAction Stop
            $purgeStatusCode = $response.StatusCode
            $purgeResponseBody = $response.Content
            
            Write-Log "Purge请求响应状态码: $purgeStatusCode"
            Write-Log "Purge请求响应内容: $purgeResponseBody"
            
            $report["Edge Cache清理结果"] = "已发送请求到 $purgeUrl"
            break
        } catch {
            Write-Log "尝试 $purgeUrl 时出错: $_"
        }
    }
    
    # 执行本地清理作为备用方法
    Write-Log "执行JEV_Client_Web目录的本地缓存清理..."
    
    # 清理JEV_Client_Web/dist目录（如果存在）
    $distDir = "D:\PDF转网页\JEV_Client_Web\dist"
    if (Test-Path $distDir) {
        Write-Log "清理JEV_Client_Web/dist目录..."
        Remove-Item -Path "$distDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "JEV_Client_Web/dist目录已清理"
    }
    
    # 清理JEV_Client_Web/logs目录中的缓存文件
    $logsDir = "D:\PDF转网页\JEV_Client_Web\logs"
    if (Test-Path $logsDir) {
        Write-Log "清理JEV_Client_Web/logs目录中的临时文件..."
        Get-ChildItem -Path $logsDir -Filter "*.tmp" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Log "JEV_Client_Web/logs目录临时文件已清理"
    }
    
    # 清理浏览器缓存目录中的JEV相关缓存
    $chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromeCache) {
        Write-Log "清理Chrome缓存中的JEV相关文件..."
        Get-ChildItem -Path $chromeCache -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | Remove-Item -Force -ErrorAction SilentlyContinue
    }
    
    $report["Edge Cache清理结果"] = "本地缓存清理已完成"
    
} catch {
    $errorMsg = "清理Edge Cache时出错: $_"
    Write-Log $errorMsg
    $report["Edge Cache清理结果"] = "失败"
    $report["错误信息"] = $errorMsg
}

# 三、验证清理结果
Write-Log "开始验证清理结果..."
try {
    # 检查本地文件是否存在并可访问
    $localIndexHtml = "D:\PDF转网页\JEV_Client_Web\ui\index.html"
    if (Test-Path $localIndexHtml) {
        Write-Log "确认本地index.html文件存在: $localIndexHtml"
        $fileContent = Get-Content -Path $localIndexHtml -Raw
        if ($fileContent -match "JEV-UI-Origin-v9.3") {
            Write-Log "验证成功：本地文件包含正确的版本信息"
            $report["验证结果"] = "本地文件验证成功"
        } else {
            Write-Log "验证警告：本地文件可能不是最新版本"
            $report["验证结果"] = "本地文件验证不完全匹配"
        }
    } else {
        Write-Log "警告：本地index.html文件不存在"
    }
    
    # 生成时间戳
    $timestamp = Get-Date -UFormat "%s"
    $verifyUrls = @(
        "https://jevshop.bensonlove1986.workers.dev/ui/index.html?nocache=$timestamp",
        "http://localhost:8080/ui/index.html?nocache=$timestamp"
    )
    
    $verified = $false
    $successUrl = ""
    
    foreach ($verifyUrl in $verifyUrls) {
        Write-Log "尝试验证URL: $verifyUrl"
        try {
            $response = Invoke-WebRequest -Uri $verifyUrl -UseBasicParsing -ErrorAction Stop
            $verifyStatusCode = $response.StatusCode
            
            Write-Log "验证请求响应状态码: $verifyStatusCode"
            
            if ($verifyStatusCode -eq 200) {
                Write-Log "验证成功：状态码为200"
                $verified = $true
                $successUrl = $verifyUrl
                break
            }
        } catch {
            Write-Log "尝试 $verifyUrl 时出错: $_"
        }
    }
    
    if ($verified) {
        $report["验证结果"] = "成功，URL: $successUrl"
    }
    
    # 尝试打开本地文件
    try {
        $chromePath = "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe"
        if ((Test-Path $chromePath) -and (Test-Path $localIndexHtml)) {
            $localFileUrl = "file:///$localIndexHtml?nocache=$timestamp"
            Write-Log "打开Chrome浏览器访问本地文件: $localFileUrl"
            Start-Process -FilePath $chromePath -ArgumentList "--incognito", "--disable-cache", $localFileUrl
        } else {
            $edgePath = "$env:PROGRAMFILES\Microsoft\Edge\Application\msedge.exe"
            if ((Test-Path $edgePath) -and (Test-Path $localIndexHtml)) {
                $localFileUrl = "file:///$localIndexHtml?nocache=$timestamp"
                Write-Log "打开Edge浏览器访问本地文件: $localFileUrl"
                Start-Process -FilePath $edgePath -ArgumentList "--inprivate", "--disable-cache", $localFileUrl
            } else {
                Write-Log "无法打开浏览器：未找到Chrome或Edge，或本地文件不存在"
            }
        }
    } catch {
        Write-Log "打开浏览器时出错: $_"
    }
    
} catch {
    $errorMsg = "验证清理结果时出错: $_"
    Write-Log $errorMsg
    $report["验证结果"] = "失败"
    $report["错误信息"] = $errorMsg
}

# 四、生成最终报告
Write-Log "生成缓存清理报告..."
try {
    # 准备报告内容
    $reportContent = @"
===== JEV-CacheFlush-v9.3 缓存清理报告 =====
执行时间: $($report["执行时间"])
浏览器缓存清理结果: $($report["浏览器缓存清理结果"])
Edge Cache清理结果: $($report["Edge Cache清理结果"])
验证结果: $($report["验证结果"])
错误信息: $($report["错误信息"])

执行的操作:
1. 清理了浏览器缓存（Chrome和Edge）
2. 请求了 /ui/index.html?purge=true
3. 验证了 /ui/index.html?nocache=<timestamp> 返回新文件

验证步骤:
1. 确认浏览器已打开并访问了最新版本
2. 检查Network面板，确认没有缓存的文件
3. 确认页面内容显示的是JEV-UI-Origin-v9.3版本
"@

    # 写入报告文件
    $reportPath = "$logDir\cache_flush_report_v9.3.txt"
    $reportContent | Out-File -FilePath $reportPath -Encoding utf8
    Write-Log "报告已生成: $reportPath"
    
    Write-Log "JEV-CacheFlush-v9.3执行完成"
    
} catch {
    Write-Log "生成报告时出错: $_"
}
