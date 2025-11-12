# JEV Cloud Relay v11.0 - Guard & Self-Recovery Script
# 守护与自修复脚本

$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path -Path $ScriptPath -ChildPath "relay_guard_log.txt"
$HealthReportFile = Join-Path -Path $ScriptPath -ChildPath "relay_health_report.json"
$ConfigFile = Join-Path -Path $ScriptPath -ChildPath "relay_config.json"
$MainScript = Join-Path -Path $ScriptPath -ChildPath "cloud_relay.js"

# 配置参数
$CheckInterval = 60  # 检查间隔（秒）
$RestartThreshold = 3  # 失败重启阈值
$TimeoutMinutes = 5  # 启动超时时间（分钟）
$MaxRestartsPerHour = 5  # 每小时最大重启次数

# 全局变量
$RestartCount = 0
$LastRestartTime = Get-Date
$ServiceStatus = "STOPPED"
$NodeProcess = $null

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # 写入日志文件
    Add-Content -Path $LogFile -Value $LogEntry
    
    # 同时输出到控制台
    Write-Host $LogEntry -ForegroundColor $(switch($Level) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        "CRITICAL" { "Red" }
        default { "White" }
    })
}

function Load-Config {
    try {
        if (Test-Path $ConfigFile) {
            $config = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json
            Write-Log "配置加载成功: $($config.relay_version)" "INFO"
            return $config
        } else {
            Write-Log "配置文件不存在，使用默认配置" "WARNING"
            return @{ relay_version = "v11.0" }
        }
    } catch {
        Write-Log "配置加载失败: $_" "ERROR"
        return @{ relay_version = "v11.0" }
    }
}

function Start-RelayService {
    try {
        Write-Log "正在启动 JEV Cloud Relay 服务..." "INFO"
        
        # 检查是否已在运行
        $existingProcess = Get-Process -Name node -ErrorAction SilentlyContinue | 
                          Where-Object { $_.Path -like "*node.exe" -and $_.StartInfo.Arguments -like "*cloud_relay.js*" }
        
        if ($existingProcess) {
            Write-Log "服务已在运行 (PID: $($existingProcess.Id))" "INFO"
            $global:NodeProcess = $existingProcess
            $global:ServiceStatus = "RUNNING"
            return $true
        }
        
        # 启动新进程
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "node"
        $processInfo.Arguments = "$MainScript"
        $processInfo.WorkingDirectory = $ScriptPath
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true
        
        $newProcess = New-Object System.Diagnostics.Process
        $newProcess.StartInfo = $processInfo
        $newProcess.EnableRaisingEvents = $true
        
        # 输出重定向事件处理
        Register-ObjectEvent -InputObject $newProcess -EventName OutputDataReceived -Action {
            param($sender, $EventArgs)
            if (![string]::IsNullOrEmpty($EventArgs.Data)) {
                Write-Log "[RELAY] $($EventArgs.Data)" "INFO"
            }
        }
        
        Register-ObjectEvent -InputObject $newProcess -EventName ErrorDataReceived -Action {
            param($sender, $EventArgs)
            if (![string]::IsNullOrEmpty($EventArgs.Data)) {
                Write-Log "[RELAY-ERROR] $($EventArgs.Data)" "ERROR"
            }
        }
        
        # 进程退出事件处理
        Register-ObjectEvent -InputObject $newProcess -EventName Exited -Action {
            param($sender, $EventArgs)
            Write-Log "服务进程已退出，退出码: $($sender.ExitCode)" "ERROR"
            $global:ServiceStatus = "STOPPED"
        }
        
        $started = $newProcess.Start()
        if ($started) {
            $newProcess.BeginOutputReadLine()
            $newProcess.BeginErrorReadLine()
            $global:NodeProcess = $newProcess
            $global:ServiceStatus = "STARTING"
            
            # 更新重启计数
            $global:RestartCount++
            $global:LastRestartTime = Get-Date
            
            Write-Log "服务启动成功，PID: $($newProcess.Id)" "SUCCESS"
            return $true
        } else {
            Write-Log "服务启动失败" "ERROR"
            return $false
        }
    } catch {
        Write-Log "启动服务时发生错误: $_" "ERROR"
        return $false
    }
}

function Stop-RelayService {
    try {
        Write-Log "正在停止 JEV Cloud Relay 服务..." "INFO"
        
        if ($global:NodeProcess -and !$global:NodeProcess.HasExited) {
            # 先尝试优雅退出
            Write-Log "发送终止信号到进程: $($global:NodeProcess.Id)" "INFO"
            $global:NodeProcess.CloseMainWindow()
            
            # 等待进程退出
            $exited = $global:NodeProcess.WaitForExit(5000)  # 5秒超时
            
            if (!$exited) {
                # 强制终止
                Write-Log "进程未优雅退出，强制终止" "WARNING"
                $global:NodeProcess.Kill()
            }
            
            Write-Log "服务已停止" "SUCCESS"
        } else {
            Write-Log "服务未在运行" "INFO"
        }
        
        $global:ServiceStatus = "STOPPED"
        $global:NodeProcess = $null
        return $true
    } catch {
        Write-Log "停止服务时发生错误: $_" "ERROR"
        return $false
    }
}

function Test-ServiceHealth {
    try {
        # 检查进程是否在运行
        if (!$global:NodeProcess -or $global:NodeProcess.HasExited) {
            Write-Log "服务进程不存在或已退出" "ERROR"
            return $false
        }
        
        # 尝试通过API检查健康状态
        try {
            $healthData = Invoke-RestMethod -Uri "http://localhost:3000/api/relay/ping" -Method Get -TimeoutSec 5
            if ($healthData.status -eq "ok") {
                Write-Log "服务健康检查通过" "INFO"
                return $true
            } else {
                Write-Log "服务健康检查失败: $($healthData.status)" "WARNING"
                return $false
            }
        } catch {
            Write-Log "健康检查API调用失败: $_" "WARNING"
            # 如果API调用失败，检查进程是否仍在运行
            return (!$global:NodeProcess.HasExited)
        }
    } catch {
        Write-Log "健康检查时发生错误: $_" "ERROR"
        return $false
    }
}

function Update-HealthReport {
    try {
        $config = Load-Config
        $report = @{
            timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            version = $config.relay_version
            status = $global:ServiceStatus
            uptime = "00:00:00"
            pid = $global:NodeProcess ? $global:NodeProcess.Id : 0
            restart_count = $RestartCount
            last_restart = $LastRestartTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            guard_status = "ACTIVE"
            check_interval = $CheckInterval
            next_check = (Get-Date).AddSeconds($CheckInterval).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
        $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $HealthReportFile -Encoding utf8
        Write-Log "健康报告已更新" "INFO"
    } catch {
        Write-Log "更新健康报告失败: $_" "ERROR"
    }
}

function Check-RestartThreshold {
    # 检查每小时重启次数是否超过限制
    $now = Get-Date
    $timeDiff = New-TimeSpan -Start $LastRestartTime -End $now
    
    # 如果距离上次重启超过1小时，重置计数
    if ($timeDiff.TotalHours -ge 1) {
        $global:RestartCount = 0
        Write-Log "重启计数已重置（超过1小时无重启）" "INFO"
    }
    
    return $RestartCount -lt $MaxRestartsPerHour
}

function Self-Heal {
    Write-Log "执行自修复流程..." "WARNING"
    
    # 停止现有服务
    Stop-RelayService
    
    # 等待几秒钟
    Start-Sleep -Seconds 3
    
    # 检查重启阈值
    if (!Check-RestartThreshold) {
        Write-Log "达到每小时最大重启次数限制，暂停自动重启" "CRITICAL"
        return $false
    }
    
    # 启动服务
    return Start-RelayService
}

function Monitor-Service {
    Write-Log "开始监控 JEV Cloud Relay 服务..." "SUCCESS"
    
    # 初始启动服务
    if (!$global:NodeProcess -or $global:NodeProcess.HasExited) {
        Start-RelayService
    }
    
    while ($true) {
        try {
            # 更新健康报告
            Update-HealthReport
            
            # 检查服务状态
            if ($global:ServiceStatus -eq "STARTING") {
                # 检查启动超时
                $startTime = Get-Date
                $elapsed = New-TimeSpan -Start $startTime -End (Get-Date)
                
                if ($elapsed.TotalMinutes -gt $TimeoutMinutes) {
                    Write-Log "服务启动超时，执行自修复" "CRITICAL"
                    Self-Heal
                } else {
                    Write-Log "服务正在启动中..." "INFO"
                }
            } elseif ($global:ServiceStatus -eq "RUNNING") {
                # 执行健康检查
                if (!Test-ServiceHealth) {
                    Write-Log "服务不健康，执行自修复" "ERROR"
                    Self-Heal
                }
            } else {
                # 服务已停止，尝试重启
                if (Check-RestartThreshold) {
                    Write-Log "服务已停止，尝试重启" "WARNING"
                    Start-RelayService
                }
            }
            
            # 检查内存使用
            if ($global:NodeProcess -and !$global:NodeProcess.HasExited) {
                $process = Get-Process -Id $global:NodeProcess.Id -ErrorAction SilentlyContinue
                if ($process) {
                    $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
                    Write-Log "服务内存使用: ${memoryMB}MB" "INFO"
                    
                    # 如果内存使用超过1GB，考虑重启
                    if ($memoryMB -gt 1024) {
                        Write-Log "内存使用过高，计划重启" "WARNING"
                        Self-Heal
                    }
                }
            }
            
        } catch {
            Write-Log "监控循环错误: $_" "ERROR"
        }
        
        # 等待下一次检查
        Start-Sleep -Seconds $CheckInterval
    }
}

function Initialize-Environment {
    Write-Log "初始化守护环境..." "INFO"
    
    # 检查Node.js是否安装
    try {
        $nodeVersion = & node -v
        Write-Log "Node.js 版本: $nodeVersion" "INFO"
    } catch {
        Write-Log "Node.js 未安装，请先安装Node.js环境" "CRITICAL"
        exit 1
    }
    
    # 检查主脚本是否存在
    if (!(Test-Path $MainScript)) {
        Write-Log "主脚本不存在: $MainScript" "CRITICAL"
        exit 1
    }
    
    # 创建日志文件目录
    $logDir = Split-Path -Parent $LogFile
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Write-Log "环境初始化完成" "SUCCESS"
}

# 主程序入口
Write-Log "=============================================" "INFO"
Write-Log "JEV Cloud Relay Guard v11.0 启动" "INFO"
Write-Log "守护与自修复系统已激活" "SUCCESS"
Write-Log "=============================================" "INFO"

# 初始化环境
Initialize-Environment

# 启动监控
try {
    Monitor-Service
} catch {
    Write-Log "监控服务崩溃: $_" "CRITICAL"
}
finally {
    Write-Log "守护服务已终止" "ERROR"
}