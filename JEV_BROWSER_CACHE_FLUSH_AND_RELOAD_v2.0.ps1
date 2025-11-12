# JEV-BROWSER-CACHE-FLUSH-AND-RELOAD-v2.0
# 功能：清理浏览器缓存与本地服务临时文件，停止重复加载循环，重新载入修复版页面

# 创建日志目录
$logDir = "D:\PDF转网页\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 初始化报告变量
$report = @{
    "执行时间" = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    "删除目录总数" = 0
    "浏览器重启状态" = "未知"
    "循环加载消除结果" = "未验证"
}

# 记录执行日志函数
function Write-Log {
    param(
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry
    Add-Content -Path "$logDir\cache_flush_operation.log" -Value $logEntry
}

Write-Log "开始执行JEV-BROWSER-CACHE-FLUSH-AND-RELOAD-v2.0"

# 一、浏览器缓存清理
Write-Log "开始清理浏览器缓存..."

# 1. 终止所有浏览器进程
Write-Log "终止Chrome和Edge浏览器进程..."
try {
    Stop-Process -Name "chrome","msedge" -Force -ErrorAction SilentlyContinue
    Write-Log "浏览器进程已终止"
} catch {
    Write-Log "终止浏览器进程时出错: $_"
}

# 2. 删除Chrome缓存目录
Write-Log "删除Chrome缓存目录..."
try {
    $chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromeCache) {
        Remove-Item $chromeCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Chrome缓存目录已删除"
        $report["删除目录总数"]++
    } else {
        Write-Log "Chrome缓存目录不存在"
    }
} catch {
    Write-Log "删除Chrome缓存时出错: $_"
}

# 3. 删除Edge缓存目录
Write-Log "删除Edge缓存目录..."
try {
    $edgeCache = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    if (Test-Path $edgeCache) {
        Remove-Item $edgeCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Edge缓存目录已删除"
        $report["删除目录总数"]++
    } else {
        Write-Log "Edge缓存目录不存在"
    }
} catch {
    Write-Log "删除Edge缓存时出错: $_"
}

# 4. 删除Chrome Service Worker
Write-Log "删除Chrome Service Worker..."
try {
    $chromeServiceWorker = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Service Worker"
    if (Test-Path $chromeServiceWorker) {
        Remove-Item $chromeServiceWorker -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Chrome Service Worker已删除"
        $report["删除目录总数"]++
    } else {
        Write-Log "Chrome Service Worker不存在"
    }
} catch {
    Write-Log "删除Chrome Service Worker时出错: $_"
}

# 5. 删除Chrome JS Code Cache
Write-Log "删除Chrome JS Code Cache..."
try {
    $chromeJsCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache\js"
    if (Test-Path $chromeJsCache) {
        Remove-Item $chromeJsCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Chrome JS Code Cache已删除"
        $report["删除目录总数"]++
    } else {
        Write-Log "Chrome JS Code Cache不存在"
    }
} catch {
    Write-Log "删除Chrome JS Code Cache时出错: $_"
}

# 二、本地服务缓存清理
Write-Log "开始清理本地服务缓存..."

# 1. 删除__pycache__目录
Write-Log "删除Python缓存目录..."
try {
    $pyCache = "D:\PDF转网页\__pycache__"
    if (Test-Path $pyCache) {
        Remove-Item $pyCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Python缓存目录已删除"
        $report["删除目录总数"]++
    } else {
        Write-Log "Python缓存目录不存在"
    }
} catch {
    Write-Log "删除Python缓存时出错: $_"
}

# 2. 删除UI缓存目录
Write-Log "删除UI缓存目录..."
try {
    $uiCache = "D:\PDF转网页\ui\__cache__"
    if (Test-Path $uiCache) {
        Remove-Item $uiCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "UI缓存目录已删除"
        $report["删除目录总数"]++
    } else {
        Write-Log "UI缓存目录不存在"
    }
} catch {
    Write-Log "删除UI缓存时出错: $_"
}

# 3. 重启本地服务端口
try {
    Write-Log "尝试重启JEV客户端服务..."
    # 检查服务是否存在
    $service = Get-Service -Name "jev_client" -ErrorAction SilentlyContinue
    if ($service) {
        Write-Log "停止jev_client服务..."
        Stop-Service -Name "jev_client" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Log "启动jev_client服务..."
        Start-Service -Name "jev_client" -ErrorAction SilentlyContinue
        Write-Log "jev_client服务已重启"
    } else {
        Write-Log "jev_client服务不存在，跳过服务重启步骤"
    }
} catch {
    Write-Log "重启服务时出错: $_"
}

# 三、浏览器刷新与验证
Write-Log "开始浏览器刷新与验证..."

# 生成时间戳参数
$timestamp = Get-Date -UFormat "%s"
$url = "http://localhost:8080/ui/sentinel_dashboard.html?ver=$timestamp"

# 尝试打开Chrome浏览器（如果存在）
try {
    $chromePath = "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe"
    if (Test-Path $chromePath) {
        Write-Log "打开Chrome浏览器访问: $url"
        Start-Process -FilePath $chromePath -ArgumentList "--incognito", "--disable-cache", $url
        $report["浏览器重启状态"] = "Chrome已启动"
    } else {
        # 尝试打开Edge浏览器
        $edgePath = "$env:PROGRAMFILES\Microsoft\Edge\Application\msedge.exe"
        if (Test-Path $edgePath) {
            Write-Log "打开Edge浏览器访问: $url"
            Start-Process -FilePath $edgePath -ArgumentList "--inprivate", "--disable-cache", $url
            $report["浏览器重启状态"] = "Edge已启动"
        } else {
            Write-Log "未找到Chrome或Edge浏览器"
            $report["浏览器重启状态"] = "未找到浏览器"
        }
    }
} catch {
    Write-Log "打开浏览器时出错: $_"
    $report["浏览器重启状态"] = "打开失败"
}

# 四、生成报告
Write-Log "生成清理报告..."
try {
    # 准备报告内容
    $reportContent = @"
===== JEV浏览器缓存清理与重载报告 =====
执行时间: $($report["执行时间"])
删除目录总数: $($report["删除目录总数"])
浏览器重启状态: $($report["浏览器重启状态"])
循环加载消除结果: 请手动验证
访问URL: $url

验证步骤:
1. 确认浏览器已打开并访问了指定URL
2. 在浏览器中按Ctrl+Shift+R强制刷新
3. 检查Network面板，确认页面只加载一次
4. 确认handler.html不再反复出现
5. 确认网络请求数少于10
6. 确认页面刷新速度恢复正常
7. 确认中文内容显示正常
"@

    # 写入报告文件
    $reportPath = "$logDir\cache_flush_report.txt"
    $reportContent | Out-File -FilePath $reportPath -Encoding utf8NoBOM
    Write-Log "报告已生成: $reportPath"

    # 添加完成标记到报告
    $report["循环加载消除结果"] = "待手动验证"
    Write-Log "清理操作已完成，请按照报告中的验证步骤进行确认"
} catch {
    Write-Log "生成报告时出错: $_"
}

Write-Log "JEV-BROWSER-CACHE-FLUSH-AND-RELOAD-v2.0执行完成"
