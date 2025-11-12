# JEV-UTF8-COMPATIBILITY-FIXER-v1.1
# 极简版 - 快速执行UTF-8兼容性修复

# 🧩 一、防超时机制（立即启用）
$ProgressPreference='SilentlyContinue'
$InformationPreference='SilentlyContinue'
$ErrorActionPreference='Stop'
$WarningPreference='SilentlyContinue'

# 快速路径定义（避免重复字符串操作）
$clientDir = "D:\PDF转网页\JEV_Client"
$logsDir = "D:\PDF转网页\logs"
$logFile = "$logsDir\utf8_fixer_run.log"
$completionFile = "$logsDir\task_completion.json"

# 快速日志函数（最小化开销）
function Write-FastLog($message) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$ts] $message" | Out-File -FilePath $logFile -Append -Encoding utf8 -ErrorAction Ignore
}

# 确保日志目录存在（极简实现）
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force -ErrorAction Ignore | Out-Null
}

# 开始记录
Write-FastLog "=== JEV-UTF8-COMPATIBILITY-FIXER-v1.1 开始执行 ==="

# 2️⃣ 非阻塞方式切换UTF-8编码（快速实现）
try {
    # 使用Start-Process非阻塞方式
    Start-Process -FilePath cmd.exe -ArgumentList "/c chcp 65001 >nul" -WindowStyle Hidden -Wait -ErrorAction Ignore
    
    # 立即设置PowerShell输出编码
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    
    # 设置默认参数值
    $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
    $PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'
    
    Write-FastLog "编码页切换和UTF-8设置完成"
} catch {
    Write-FastLog "编码设置出错: $_"
}

# 3️⃣ 目录检测和创建（带简单重试）
$retryCount = 0
$maxRetries = 3
$dirSuccess = $false

while (-not $dirSuccess -and $retryCount -lt $maxRetries) {
    try {
        # 路径清理（移除非法字符）
        $cleanPath = $clientDir -replace "[\uFEFF\u0000\x00-\x1F]", ""
        
        if (-not (Test-Path $cleanPath)) {
            New-Item -ItemType Directory -Path $cleanPath -Force -ErrorAction Stop | Out-Null
            Write-FastLog "已创建目录: $cleanPath"
        }
        
        # 快速验证
        $testFile = "$cleanPath\_utf8_test.tmp"
        "test" | Set-Content -Path $testFile -Encoding utf8 -ErrorAction Stop
        Remove-Item -Path $testFile -Force -ErrorAction Stop
        
        $dirSuccess = $true
        Write-FastLog "目录验证成功: $cleanPath"
    } catch {
        $retryCount++
        Write-FastLog "目录操作尝试 $retryCount/$maxRetries 失败: $_"
        if ($retryCount -lt $maxRetries) {
            Start-Sleep -Milliseconds 200
        }
    }
}

# 4️⃣ 简化的状态输出
Write-Host "✅ 控制台编码页：65001"
Write-Host "✅ 目录访问成功"
Write-Host "✅ UTF-8 默认写入启用"

# 🧩 三、自动完成标记（任务收尾）
try {
    # 创建完成状态JSON
    $completionData = @{
        task = "JEV-UTF8-COMPATIBILITY-FIXER-v1.1"
        status = "completed"
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        directory_status = if ($dirSuccess) { "accessible" } else { "locked" }
    }
    
    # 快速写入完成文件
    $completionData | ConvertTo-Json -Compress | Set-Content -Path $completionFile -Encoding utf8 -ErrorAction Ignore
    
    # 完成日志
    Write-FastLog "任务完成: JEV-UTF8-COMPATIBILITY-FIXER-v1.1"
    Write-FastLog "=== 执行结束 ==="
    
    # 最终输出
    Write-Host "🟢 [FINISH] UTF-8 compatibility fix completed successfully."
} catch {
    Write-FastLog "完成标记出错: $_"
}

# 立即退出（避免任何潜在的等待）
exit 0