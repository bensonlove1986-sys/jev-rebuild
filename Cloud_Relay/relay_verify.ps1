# ============================================================
# [JEV RELAY VERIFICATION]
# 验证Cloud Relay与Worker通讯状态
# ============================================================

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "`n🔍 [JEV RELAY VERIFICATION] Starting at $timestamp`n"

$report = @{
    task = "RELAY-VERIFY"
    timestamp = $timestamp
    connectivity = @{
        relayToWorker = $false
        statusCode = 0
        responseTime = 0
    }
    headers = @{
        aligned = $false
        charsetUtf8 = $false
        contentType = ""
    }
    stability = @{
        tests = 3
        successful = 0
        failureRate = 0
    }
    overallStatus = "pending"
}

# 测试中继到Worker的连接
function Test-RelayConnection {
    $relayUrl = "http://localhost:8000/relay/health"
    Write-Host "📡 Testing Relay to Worker connection: $relayUrl"
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $relayUrl -TimeoutSec 15 -ErrorAction Stop
        $stopwatch.Stop()
        
        $report.connectivity.responseTime = $stopwatch.ElapsedMilliseconds
        $report.connectivity.statusCode = $response.StatusCode
        
        # 检查状态码
        if ($response.StatusCode -eq 200) {
            $report.connectivity.relayToWorker = $true
            Write-Host "✅ Relay connection successful: 200 OK ($($report.connectivity.responseTime) ms)"
        } else {
            Write-Host "❌ Relay connection failed: Status $($response.StatusCode)"
        }
        
        # 检查HTTP头
        $contentType = $response.Headers['Content-Type']
        $report.headers.contentType = $contentType
        
        if ($contentType -match 'charset=utf-8') {
            $report.headers.charsetUtf8 = $true
            Write-Host "✅ Charset UTF-8 found in Content-Type: $contentType"
        } else {
            Write-Host "⚠️ Charset UTF-8 not found in Content-Type: $contentType"
        }
        
        # 尝试其他常见的中继端口
        if (-not $report.connectivity.relayToWorker) {
            $alternativeUrls = @(
                "http://localhost:8080/relay/health",
                "http://localhost:9000/relay/health"
            )
            
            foreach ($altUrl in $alternativeUrls) {
                Write-Host "🔄 Trying alternative relay endpoint: $altUrl"
                try {
                    $altResponse = Invoke-WebRequest -Uri $altUrl -TimeoutSec 10 -ErrorAction Stop
                    if ($altResponse.StatusCode -eq 200) {
                        $report.connectivity.relayToWorker = $true
                        $report.connectivity.statusCode = 200
                        Write-Host "✅ Alternative relay connection successful: $altUrl"
                        break
                    }
                } catch {
                    Write-Host "❌ Alternative endpoint failed: $altUrl"
                }
            }
        }
        
        return $report.connectivity.relayToWorker
    } catch {
        Write-Host "❌ Connection failed: $($_.Exception.Message)"
        $report.connectivity.error = $_.Exception.Message
        return $false
    }
}

# 测试稳定性
function Test-Stability {
    Write-Host "`n📊 Testing connection stability (3 attempts)..."
    
    for ($i = 1; $i -le $report.stability.tests; $i++) {
        Write-Host "  Attempt $i/$($report.stability.tests)..."
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/relay/ping" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $report.stability.successful++
                Write-Host "    ✅ Success"
            }
        } catch {
            Write-Host "    ❌ Failed"
        }
        Start-Sleep -Milliseconds 500
    }
    
    # 计算失败率
    $report.stability.failureRate = ((3 - $report.stability.successful) / 3) * 100
    Write-Host "`n📈 Stability results:"
    Write-Host "  - Successful: $($report.stability.successful)/3"
    Write-Host "  - Failure rate: $($report.stability.failureRate)%"
}

# 执行验证
$connectionSuccess = Test-RelayConnection
Test-Stability

# 更新整体状态
$report.headers.aligned = $report.headers.charsetUtf8
$report.overallStatus = if ($connectionSuccess -and $report.headers.aligned -and $report.stability.failureRate -lt 50) { "stable" } else { "unstable" }

# 生成报告
$reportPath = "D:\PDF转网页\JEV_Client\diagnostics\relay_verification_report.json"
$report | ConvertTo-Json -Depth 4 | Out-File $reportPath -Encoding UTF8

# 写入主日志
$logEntry = "`n[$timestamp] Relay Verification: $($report.overallStatus) | Connected: $($report.connectivity.relayToWorker) | Headers: $($report.headers.aligned) | Stability: $($report.stability.successful)/3"
Add-Content -Path "D:\PDF转网页\JEV_Client\diagnostics\encoding_guard_log.txt" -Value $logEntry

# 显示摘要
Write-Host "`n========================================"
Write-Host "✅ RELAY VERIFICATION COMPLETED"
Write-Host "========================================"
Write-Host "🌐 Overall Status: $($report.overallStatus.ToUpper())"
Write-Host "🔄 Connectivity: $($report.connectivity.relayToWorker)"
Write-Host "📋 Headers:"
Write-Host "  - UTF-8 Charset: $($report.headers.charsetUtf8)"
Write-Host "  - Content-Type: $($report.headers.contentType)"
Write-Host "📊 Stability: $($report.stability.successful)/3 tests passed"
Write-Host "📋 Report: $reportPath"
Write-Host "========================================"