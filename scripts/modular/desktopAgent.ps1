<#
.SYNOPSIS
    JEV 桌面执行监控器 WPF版
.DESCRIPTION
    现代化的PowerShell + WPF桌面应用，用于监控和控制JEV Desktop Agent的运行状态
.AUTHOR
    JEV Team
.VERSION
    1.0.0
#>

# 加载必要的程序集
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 定义全局变量
$Global:AppState = @{
    RunningStatus = "等待中"  # 运行状态：运行中/已暂停/等待中
    ListenPort = 1818        # 监听端口
    CurrentTask = "无任务"    # 当前任务
    StartupTime = Get-Date   # 启动时间
    AgentConnected = $false  # Agent连接状态
    LogEntries = New-Object System.Collections.ArrayList # 日志条目
    CPUHistory = New-Object System.Collections.Generic.List[double] # CPU使用率数据
    MemoryHistory = New-Object System.Collections.Generic.List[double] # 内存使用率数据
    PauseFlagPath = "C:\JEV\PAUSE.flag" # 暂停标志文件路径
    LogDir = "C:\JEV\logs"  # 日志目录
    WindowSettingsPath = "C:\JEV\window_settings.json" # 窗口设置保存路径
    MaxLogFileSizeMB = 10  # 最大日志文件大小（MB）
    MaxLogHistoryDays = 7  # 保留日志历史天数
    MaxLogEntries = 20     # 最大日志条目数
    LogFileBase = "agent_" # 日志文件基础名称
    
    # 数据可视化相关状态
    MaxDataPoints = 30  # 限制数据点数量，避免图表过于密集
    LastRefreshTime = [DateTime]::Now
}

# 创建必要的目录
if (-not (Test-Path $AppState.LogDir)) {
    New-Item -Path $AppState.LogDir -ItemType Directory -Force | Out-Null
}
if (-not (Test-Path "C:\JEV")) {
    New-Item -Path "C:\JEV" -ItemType Directory -Force | Out-Null
}

# 生成XAML界面
$XAML = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="JEV 桌面执行监控器"
    Width="900"
    Height="600"
    WindowStartupLocation="Manual"
    Background="#1E1E1E"
    Foreground="#FFFFFF">
    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="Background" Value="#2D2D30"/>
            <Setter Property="Foreground" Value="#FFFFFF"/>
            <Setter Property="Padding" Value="12,6"/>
            <Setter Property="Margin" Value="5"/>
            <Setter Property="Width" Value="100"/>
            <Setter Property="FontFamily" Value="微软雅黑"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="CornerRadius" Value="6"/>
            <Style.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Background" Value="#3E3E42"/>
                </Trigger>
                <Trigger Property="IsEnabled" Value="False">
                    <Setter Property="Background" Value="#1A1A1A"/>
                    <Setter Property="Foreground" Value="#666666"/>
                </Trigger>
            </Style.Triggers>
        </Style>
        <Style TargetType="Label">
            <Setter Property="FontFamily" Value="微软雅黑"/>
            <Setter Property="Foreground" Value="#FFFFFF"/>
        </Style>
        <Style TargetType="TextBlock">
            <Setter Property="FontFamily" Value="微软雅黑"/>
            <Setter Property="Foreground" Value="#FFFFFF"/>
        </Style>
    </Window.Resources>
    
    <Grid>
        <!-- 系统状态区 -->
        <Border BorderBrush="#3E3E42" BorderThickness="1" Margin="10,10,10,0" VerticalAlignment="Top" CornerRadius="6">
            <StackPanel Margin="15">
                <TextBlock FontSize="16" FontWeight="Bold" Margin="0,0,0,10">系统状态</TextBlock>
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="1*"/>
                        <ColumnDefinition Width="1*"/>
                        <ColumnDefinition Width="1*"/>
                        <ColumnDefinition Width="1*"/>
                    </Grid.ColumnDefinitions>
                    
                    <!-- 运行状态 -->
                    <StackPanel Grid.Column="0">
                        <Label FontSize="12" Foreground="#CCCCCC">运行状态</Label>
                        <TextBlock x:Name="RunningStatusText" FontSize="14">🔴 等待中</TextBlock>
                    </StackPanel>
                    
                    <!-- 监听端口 -->
                    <StackPanel Grid.Column="1">
                        <Label FontSize="12" Foreground="#CCCCCC">监听端口</Label>
                        <TextBlock x:Name="ListenPortText" FontSize="14">1818</TextBlock>
                    </StackPanel>
                    
                    <!-- 当前任务 -->
                    <StackPanel Grid.Column="2">
                        <Label FontSize="12" Foreground="#CCCCCC">当前任务</Label>
                        <TextBlock x:Name="CurrentTaskText" FontSize="14">无任务</TextBlock>
                    </StackPanel>
                    
                    <!-- 运行时长 -->
                    <StackPanel Grid.Column="3">
                        <Label FontSize="12" Foreground="#CCCCCC">运行时长</Label>
                        <TextBlock x:Name="UptimeText" FontSize="14">00:00:00</TextBlock>
                    </StackPanel>
                </Grid>
            </StackPanel>
        </Border>
        
        <!-- 系统监控区 -->
        <Border BorderBrush="#3E3E42" BorderThickness="1" Margin="10,120,10,220" CornerRadius="6">
            <StackPanel Margin="15">
                <TextBlock FontSize="16" FontWeight="Bold" Margin="0,0,0,10">系统监控</TextBlock>
                
                <!-- CPU和内存图表 -->
                <Grid Height="150">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="1*"/>
                        <ColumnDefinition Width="1*"/>
                    </Grid.ColumnDefinitions>
                    
                    <!-- CPU图表 -->
                    <Border Grid.Column="0" BorderBrush="#3E3E42" BorderThickness="1" Margin="5" CornerRadius="4">
                        <StackPanel>
                            <TextBlock HorizontalAlignment="Center" FontSize="12" Margin="5">CPU 使用率</TextBlock>
                            <Canvas x:Name="CPUChartCanvas" Background="#1E1E1E" Margin="5" Height="100">
                                <Polyline x:Name="CPUUsagePolyline" Stroke="#4CAF50" StrokeThickness="2"/>
                            </Canvas>
                            <TextBlock x:Name="CPUUsageText" HorizontalAlignment="Center" FontSize="12">0%</TextBlock>
                        </StackPanel>
                    </Border>
                    
                    <!-- 内存图表 -->
                    <Border Grid.Column="1" BorderBrush="#3E3E42" BorderThickness="1" Margin="5" CornerRadius="4">
                        <StackPanel>
                            <TextBlock HorizontalAlignment="Center" FontSize="12" Margin="5">内存 使用率</TextBlock>
                            <Canvas x:Name="MemoryChartCanvas" Background="#1E1E1E" Margin="5" Height="100">
                                <Polyline x:Name="MemoryUsagePolyline" Stroke="#2196F3" StrokeThickness="2"/>
                            </Canvas>
                            <TextBlock x:Name="MemoryUsageText" HorizontalAlignment="Center" FontSize="12">0%</TextBlock>
                        </StackPanel>
                    </Border>
                </Grid>
                
                <!-- 磁盘空间 -->
                <StackPanel Margin="5,10,5,0">
                    <TextBlock FontSize="12" Margin="0,0,0,5">磁盘剩余空间</TextBlock>
                    <ProgressBar x:Name="DiskSpaceBar" Height="20" Background="#2D2D30" BorderBrush="#3E3E42" BorderThickness="1">
                        <ProgressBar.Resources>
                            <SolidColorBrush x:Key="{x:Static SystemColors.HighlightBrushKey}" Color="#4CAF50"/>
                            <SolidColorBrush x:Key="{x:Static SystemColors.ControlBrushKey}" Color="#4CAF50"/>
                        </ProgressBar.Resources>
                    </ProgressBar>
                    <TextBlock x:Name="DiskSpaceText" HorizontalAlignment="Center" VerticalAlignment="Center" FontSize="12" Margin="0,-20,0,0">--</TextBlock>
                </StackPanel>
            </StackPanel>
        </Border>
        
        <!-- 日志与操作区 -->
        <Border BorderBrush="#3E3E42" BorderThickness="1" Margin="10,370,10,10" CornerRadius="6">
            <StackPanel Margin="15">
                <TextBlock FontSize="16" FontWeight="Bold" Margin="0,0,0,10">日志与操作</TextBlock>
                
                <!-- 日志区域 -->
                <TextBox x:Name="LogTextBox" Height="100" TextWrapping="Wrap" AcceptsReturn="True" IsReadOnly="True"
                         Background="#1E1E1E" BorderBrush="#3E3E42" BorderThickness="1" FontFamily="微软雅黑" FontSize="12"
                         ScrollViewer.VerticalScrollBarVisibility="Auto" Foreground="#FFFFFF" Margin="0,0,0,10"/>
                
                <!-- 按钮区域 -->
                <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                    <Button x:Name="PauseButton" Content="暂停系统"/>
                    <Button x:Name="ResumeButton" Content="恢复系统"/>
                    <Button x:Name="OpenLogButton" Content="打开日志"/>
                    <Button x:Name="ClearLogsButton" Content="清空日志"/>
                    <Button x:Name="RunTestButton" Content="运行测试"/>
                </StackPanel>
                
                <!-- Agent连接状态 -->
                <TextBlock x:Name="AgentConnectionStatus" HorizontalAlignment="Center" FontSize="12" Margin="5" Foreground="#FFEB3B">
                    Agent 未连接 ⚠️
                </TextBlock>
            </StackPanel>
        </Border>
    </Grid>
</Window>
"@

# 解析XAML
$Reader = [System.Xml.XmlNodeReader]::new($XAML)
$Window = [Windows.Markup.XamlReader]::Load($Reader)

# 获取UI元素引用
$RunningStatusText = $Window.FindName("RunningStatusText")
$ListenPortText = $Window.FindName("ListenPortText")
$CurrentTaskText = $Window.FindName("CurrentTaskText")
$UptimeText = $Window.FindName("UptimeText")
$CPUChartCanvas = $Window.FindName("CPUChartCanvas")
$MemoryChartCanvas = $Window.FindName("MemoryChartCanvas")
$CPUUsagePolyline = $Window.FindName("CPUUsagePolyline")
$MemoryUsagePolyline = $Window.FindName("MemoryUsagePolyline")
$CPUUsageText = $Window.FindName("CPUUsageText")
$MemoryUsageText = $Window.FindName("MemoryUsageText")
$DiskSpaceBar = $Window.FindName("DiskSpaceBar")
$DiskSpaceText = $Window.FindName("DiskSpaceText")
$LogTextBox = $Window.FindName("LogTextBox")
$PauseButton = $Window.FindName("PauseButton")
$ResumeButton = $Window.FindName("ResumeButton")
$OpenLogButton = $Window.FindName("OpenLogButton")
$ClearLogsButton = $Window.FindName("ClearLogsButton")
$RunTestButton = $Window.FindName("RunTestButton")
$AgentConnectionStatus = $Window.FindName("AgentConnectionStatus")

# 获取当前日志文件路径
function Get-CurrentLogFilePath {
    $dateString = Get-Date -Format "yyyyMMdd"
    return Join-Path $Global:AppState.LogDir "agent_$dateString.log"
}

# 检查并执行日志轮换
function Rotate-LogFiles {
    try {
        # 确保日志目录存在
        if (-not (Test-Path $Global:AppState.LogDir)) {
            New-Item -Path $Global:AppState.LogDir -ItemType Directory -Force | Out-Null
        }
        
        # 获取当前日志文件
        $currentLogFile = Get-CurrentLogFilePath
        
        # 检查文件大小是否超过限制
        if (Test-Path $currentLogFile) {
            $fileInfo = Get-Item $currentLogFile
            $fileSizeMB = $fileInfo.Length / 1MB
            
            if ($fileSizeMB -ge $Global:AppState.MaxLogFileSizeMB) {
                # 文件过大，创建新文件（添加序号）
                $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                $newLogFile = Join-Path $Global:AppState.LogDir "agent_$timestamp.log"
                
                # 重命名当前文件
                Rename-Item -Path $currentLogFile -NewName (Split-Path $newLogFile -Leaf)
                
                # 使用临时日志条目记录，避免递归
                $tempLogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 日志轮换: 日志文件大小超过${Global:AppState.MaxLogFileSizeMB}MB，已创建新日志文件"
                $tempLogEntry | Out-File -FilePath $newLogFile -Append -Encoding utf8
                
                # 添加到界面日志
                $Global:AppState.LogEntries.Insert(0, $tempLogEntry)
                if ($Global:AppState.LogEntries.Count -gt $Global:AppState.MaxLogEntries) {
                    $Global:AppState.LogEntries.RemoveAt($Global:AppState.LogEntries.Count - 1)
                }
                Update-LogDisplay
            }
        }
        
        # 清理过期日志文件
        $cutoffDate = (Get-Date).AddDays(-$Global:AppState.MaxLogHistoryDays)
        $logFiles = Get-ChildItem -Path $Global:AppState.LogDir -Filter "agent_*.log" -File
        
        foreach ($file in $logFiles) {
            if ($file.LastWriteTime -lt $cutoffDate) {
                Remove-Item -Path $file.FullName -Force
                # 记录清理操作
                $tempLogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 日志清理: 删除过期日志文件: $($file.Name)"
                $tempLogEntry | Out-File -FilePath $currentLogFile -Append -Encoding utf8
                
                # 添加到界面日志
                $Global:AppState.LogEntries.Insert(0, $tempLogEntry)
                if ($Global:AppState.LogEntries.Count -gt $Global:AppState.MaxLogEntries) {
                    $Global:AppState.LogEntries.RemoveAt($Global:AppState.LogEntries.Count - 1)
                }
                Update-LogDisplay
            }
        }
    } catch {
        Write-Host "日志轮换失败: $_"
    }
}

# 写入应用日志 - 增强版
function Write-AppLog {
    param (
        [string]$Operation,
        [string]$Description,
        [string]$LogLevel = "Info"
    )
    
    try {
        # 创建日志条目
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logEntry = "[$timestamp] $Operation: $Description"
        
        # 添加到内存中的日志列表（异步操作）
        $null = $Global:AppState.LogEntries.Insert(0, $logEntry)
        
        # 限制日志条目数量
        if ($Global:AppState.LogEntries.Count -gt $Global:AppState.MaxLogEntries) {
            $null = $Global:AppState.LogEntries.RemoveAt($Global:AppState.LogEntries.Count - 1)
        }
        
        # 异步更新UI
        $null = $Window.Dispatcher.InvokeAsync({ Update-LogDisplay })
        
        # 写入日志文件
        $logFileName = "$($Global:AppState.LogFileBase)$(Get-Date -Format "yyyyMMdd").log"
        $logFilePath = Join-Path -Path $Global:AppState.LogDir -ChildPath $logFileName
        
        # 确保日志目录存在
        if (-not (Test-Path $Global:AppState.LogDir)) {
            New-Item -Path $Global:AppState.LogDir -ItemType Directory -Force | Out-Null
        }
        
        # 追加日志到文件
        Add-Content -Path $logFilePath -Value $logEntry -Encoding utf8 -ErrorAction Stop
        
        # 检查是否需要日志轮换
        $fileInfo = Get-Item -Path $logFilePath -ErrorAction SilentlyContinue
        if ($fileInfo -and ($fileInfo.Length / 1MB) -gt $Global:AppState.MaxLogFileSizeMB) {
            Rotate-LogFiles
        }
    } catch {
        # 日志写入失败时的处理
        Write-Host "写入日志失败: $_"
        
        # 至少更新UI日志
        try {
            $errorEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 日志系统错误：无法写入日志文件，错误信息已输出到控制台"
            $null = $Global:AppState.LogEntries.Insert(0, $errorEntry)
            if ($Global:AppState.LogEntries.Count -gt $Global:AppState.MaxLogEntries) {
                $null = $Global:AppState.LogEntries.RemoveAt($Global:AppState.LogEntries.Count - 1)
            }
            $null = $Window.Dispatcher.InvokeAsync({ Update-LogDisplay })
        } catch {}
    } finally {
        # 确保日志更新始终执行
        $null = $Window.Dispatcher.InvokeAsync({ Update-LogDisplay })
    }
}

# 修复Rotate-LogFiles函数以确保语法正确
function Rotate-LogFiles {
    try {
        # 确保日志目录存在
        if (-not (Test-Path $Global:AppState.LogDir)) {
            New-Item -Path $Global:AppState.LogDir -ItemType Directory -Force | Out-Null
        }
        
        # 获取当前日志文件
        $currentLogFile = Get-CurrentLogFilePath
        
        # 检查文件大小是否超过限制
        if (Test-Path $currentLogFile) {
            $fileInfo = Get-Item $currentLogFile
            $fileSizeMB = $fileInfo.Length / 1MB
            
            if ($fileSizeMB -ge $Global:AppState.MaxLogFileSizeMB) {
                # 文件过大，创建新文件（添加序号）
                $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                $newLogFile = Join-Path $Global:AppState.LogDir "agent_$timestamp.log"
                
                # 重命名当前文件
                Rename-Item -Path $currentLogFile -NewName (Split-Path $newLogFile -Leaf)
                
                # 使用临时日志条目记录，避免递归
                $tempLogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 日志轮换: 日志文件大小超过${Global:AppState.MaxLogFileSizeMB}MB，已创建新日志文件"
                $tempLogEntry | Out-File -FilePath $newLogFile -Append -Encoding utf8
                
                # 添加到界面日志
                $Global:AppState.LogEntries.Insert(0, $tempLogEntry)
                if ($Global:AppState.LogEntries.Count -gt $Global:AppState.MaxLogEntries) {
                    $Global:AppState.LogEntries.RemoveAt($Global:AppState.LogEntries.Count - 1)
                }
                Update-LogDisplay
            }
        }
        
        # 清理过期日志文件
        $cutoffDate = (Get-Date).AddDays(-$Global:AppState.MaxLogHistoryDays)
        $logFiles = Get-ChildItem -Path $Global:AppState.LogDir -Filter "agent_*.log" -File
        
        foreach ($file in $logFiles) {
            if ($file.LastWriteTime -lt $cutoffDate) {
                Remove-Item -Path $file.FullName -Force
                # 记录清理操作
                $tempLogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 日志清理: 删除过期日志文件: $($file.Name)"
                $tempLogEntry | Out-File -FilePath $currentLogFile -Append -Encoding utf8
                
                # 添加到界面日志
                $Global:AppState.LogEntries.Insert(0, $tempLogEntry)
                if ($Global:AppState.LogEntries.Count -gt $Global:AppState.MaxLogEntries) {
                    $Global:AppState.LogEntries.RemoveAt($Global:AppState.LogEntries.Count - 1)
                }
                Update-LogDisplay
            }
        }
    } catch {
        Write-Host "日志轮换失败: $_"
    }
}

# 更新日志显示和高亮
function Update-LogDisplay {
    try {
        # 使用简单的方法实现日志高亮（基于关键字）
        $logText = ""
        
        foreach ($entry in $Global:AppState.LogEntries) {
            $logText += "$entry`n"
        }
        
        $LogTextBox.Text = $logText.TrimEnd()
        $LogTextBox.ScrollToEnd()
        
        # 增强日志显示的视觉效果
        $LogTextBox.Background = [System.Windows.Media.Brushes]::FromArgb(255, 30, 30, 30)
        $LogTextBox.Foreground = [System.Windows.Media.Brushes]::White
        $LogTextBox.FontFamily = "微软雅黑"
        $LogTextBox.FontSize = 12
    } catch {
        # 错误处理，确保日志显示不会中断应用
        Write-Host "更新日志显示失败: $_"
    }
}

# 更新系统状态显示
function Update-StatusDisplay {
    # 更新运行状态
    switch ($Global:AppState.RunningStatus) {
        "运行中" {
            $RunningStatusText.Text = "🟢 运行中"
            $RunningStatusText.Foreground = [System.Windows.Media.Brushes]::Green
        }
        "已暂停" {
            $RunningStatusText.Text = "🔴 已暂停"
            $RunningStatusText.Foreground = [System.Windows.Media.Brushes]::Red
        }
        default {
            $RunningStatusText.Text = "⚪ 等待中"
            $RunningStatusText.Foreground = [System.Windows.Media.Brushes]::Gray
        }
    }
    
    # 更新监听端口
    $ListenPortText.Text = $Global:AppState.ListenPort
    
    # 更新当前任务
    $CurrentTaskText.Text = $Global:AppState.CurrentTask
    
    # 更新运行时长
    $uptime = (Get-Date) - $Global:AppState.StartupTime
    $UptimeText.Text = "{0:HH:mm:ss}" -f $uptime
    
    # 更新Agent连接状态
    if ($Global:AppState.AgentConnected) {
        $AgentConnectionStatus.Text = "Agent 已连接 ✓"
        $AgentConnectionStatus.Foreground = [System.Windows.Media.Brushes]::Green
    } else {
        $AgentConnectionStatus.Text = "Agent 未连接 ⚠️"
        $AgentConnectionStatus.Foreground = [System.Windows.Media.Brushes]::Yellow
    }
}

# 检测暂停标志文件状态
function Check-PauseFlagStatus {
    if (Test-Path $Global:AppState.PauseFlagPath) {
        if ($Global:AppState.RunningStatus -ne "已暂停") {
            $Global:AppState.RunningStatus = "已暂停"
            Write-AppLog -Operation "状态变更" -Description "检测到暂停标志文件，系统已暂停"
            Update-StatusDisplay
        }
    } else {
        if ($Global:AppState.RunningStatus -ne "运行中" -and $Global:AppState.AgentConnected) {
            $Global:AppState.RunningStatus = "运行中"
            Write-AppLog -Operation "状态变更" -Description "暂停标志文件不存在，系统运行中"
            Update-StatusDisplay
        }
    }
}

# 获取系统状态（从API）
function Get-AgentStatus {
    try {
        $uri = "http://localhost:$($Global:AppState.ListenPort)/status"
        $response = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 2 -ErrorAction Stop
        
        $Global:AppState.AgentConnected = $true
        
        # 更新当前任务
        if ($response.task -and $response.task -ne "") {
            $Global:AppState.CurrentTask = $response.task
        } else {
            $Global:AppState.CurrentTask = "无任务"
        }
        
        # 更新监听端口
        if ($response.port) {
            $Global:AppState.ListenPort = $response.port
        }
        
        # 根据flag文件和API状态更新运行状态
        Check-PauseFlagStatus
        
    } catch {
        $Global:AppState.AgentConnected = $false
        $Global:AppState.RunningStatus = "等待中"
        Write-AppLog -Operation "连接检查" -Description "无法连接到Agent服务"
    }
    
    Update-StatusDisplay
}

# 定期更新运行时长的计时器
function Start-StatusTimer {
    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromSeconds(1)
    $timer.Add_Tick({ Update-StatusDisplay })
    $timer.Start()
    return $timer
}

# 初始化系统状态检测
function Initialize-StatusMonitoring {
    # 启动运行时长计时器
    $Global:StatusTimer = Start-StatusTimer
    
    # 初始状态检查
    Get-AgentStatus
    
    # 定期检查Agent状态的计时器
    $Global:AgentStatusTimer = New-Object System.Windows.Threading.DispatcherTimer
    $Global:AgentStatusTimer.Interval = [TimeSpan]::FromSeconds(5)
    $Global:AgentStatusTimer.Add_Tick({ Get-AgentStatus })
    $Global:AgentStatusTimer.Start()
    
    # 定期检查Pause标志文件的计时器
    $Global:PauseFlagTimer = New-Object System.Windows.Threading.DispatcherTimer
    $Global:PauseFlagTimer.Interval = [TimeSpan]::FromSeconds(2)
    $Global:PauseFlagTimer.Add_Tick({ Check-PauseFlagStatus })
    $Global:PauseFlagTimer.Start()
    
    Write-AppLog -Operation "初始化" -Description "系统状态监控已启动"
}

# 实现第一个任务并标记为完成
$Global:AppState.LogEntries.Clear()
Write-AppLog -Operation "系统启动" -Description "JEV桌面执行监控器已启动"
Update-StatusDisplay

# 获取CPU使用率
function Get-CPUUsage {
    try {
        $cpuCounter = Get-Counter '\Processor(_Total)\% Processor Time'
        $cpuUsage = [math]::Round($cpuCounter.CounterSamples.CookedValue, 1)
        return $cpuUsage
    } catch {
        Write-AppLog -Operation "监控错误" -Description "获取CPU使用率失败: $_"
        return 0
    }
}

# 获取内存使用率
function Get-MemoryUsage {
    try {
        $osInfo = Get-CimInstance Win32_OperatingSystem
        $totalMemory = $osInfo.TotalVisibleMemorySize
        $freeMemory = $osInfo.FreePhysicalMemory
        $usedMemory = $totalMemory - $freeMemory
        $memoryUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 1)
        return $memoryUsage
    } catch {
        Write-AppLog -Operation "监控错误" -Description "获取内存使用率失败: $_"
        return 0
    }
}

# 获取磁盘剩余空间
function Get-DiskSpaceInfo {
    try {
        $diskInfo = Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Name -eq 'C'}
        if ($diskInfo) {
            $totalSize = $diskInfo.Used + $diskInfo.Free
            $freeSpacePercent = [math]::Round(($diskInfo.Free / $totalSize) * 100, 1)
            $freeSpaceGB = [math]::Round($diskInfo.Free / 1GB, 2)
            $totalSizeGB = [math]::Round($totalSize / 1GB, 2)
            
            return @{
                FreeSpacePercent = $freeSpacePercent
                FreeSpaceGB = $freeSpaceGB
                TotalSizeGB = $totalSizeGB
                UsedSpacePercent = 100 - $freeSpacePercent
            }
        }
        return @{
            FreeSpacePercent = 0
            FreeSpaceGB = 0
            TotalSizeGB = 0
            UsedSpacePercent = 0
        }
    } catch {
        Write-AppLog -Operation "监控错误" -Description "获取磁盘空间信息失败: $_"
        return @{
            FreeSpacePercent = 0
            FreeSpaceGB = 0
            TotalSizeGB = 0
            UsedSpacePercent = 0
        }
    }
}

# 更新CPU使用率曲线
function Update-CPUChart {
    param(
        [double]$cpuUsage
    )
    
    # 添加新数据点到历史记录
    $Global:AppState.CPUHistory.Add($cpuUsage)
    
    # 限制数据点数量
    if ($Global:AppState.CPUHistory.Count -gt $Global:AppState.MaxDataPoints) {
        $Global:AppState.CPUHistory.RemoveAt(0)
    }
    
    # 更新文本显示
    $CPUUsageText.Text = "$cpuUsage%"
    
    # 根据CPU使用率改变文本颜色
    if ($cpuUsage -gt 80) {
        $CPUUsageText.Foreground = [System.Windows.Media.Brushes]::Red
    } elseif ($cpuUsage -gt 50) {
        $CPUUsageText.Foreground = [System.Windows.Media.Brushes]::Orange
    } else {
        $CPUUsageText.Foreground = [System.Windows.Media.Brushes]::Green
    }
    
    # 绘制曲线
    $points = New-Object System.Windows.Media.PointCollection
    $canvasWidth = $CPUChartCanvas.ActualWidth
    $canvasHeight = $CPUChartCanvas.ActualHeight
    
    if ($canvasWidth -gt 0 -and $canvasHeight -gt 0) {
        $historyCount = $Global:AppState.CPUHistory.Count
        
        if ($historyCount -gt 0) {
            for ($i = 0; $i -lt $historyCount; $i++) {
                $value = $Global:AppState.CPUHistory[$i]
                $x = ($i * $canvasWidth) / ($historyCount - 1)
                $y = $canvasHeight - ($value * $canvasHeight / 100)
                
                # 确保值在可视范围内
                $y = [math]::Max(10, [math]::Min($canvasHeight - 10, $y))
                
                $points.Add(New-Object System.Windows.Point($x, $y))
            }
        }
        
        # 设置平滑效果
        $CPUUsagePolyline.StrokeLineJoin = [System.Windows.Media.PenLineJoin]::Round
        $CPUUsagePolyline.StrokeStartLineCap = [System.Windows.Media.PenLineCap]::Round
        $CPUUsagePolyline.StrokeEndLineCap = [System.Windows.Media.PenLineCap]::Round
        
        $CPUUsagePolyline.Points = $points
    }
}

# 更新内存使用率曲线
function Update-MemoryChart {
    param(
        [double]$memoryUsage
    )
    
    # 添加新数据点到历史记录
    $Global:AppState.MemoryHistory.Add($memoryUsage)
    
    # 限制数据点数量
    if ($Global:AppState.MemoryHistory.Count -gt $Global:AppState.MaxDataPoints) {
        $Global:AppState.MemoryHistory.RemoveAt(0)
    }
    
    # 更新文本显示
    $MemoryUsageText.Text = "$memoryUsage%"
    
    # 根据内存使用率改变文本颜色
    if ($memoryUsage -gt 80) {
        $MemoryUsageText.Foreground = [System.Windows.Media.Brushes]::Red
    } elseif ($memoryUsage -gt 60) {
        $MemoryUsageText.Foreground = [System.Windows.Media.Brushes]::Orange
    } else {
        $MemoryUsageText.Foreground = [System.Windows.Media.Brushes]::Blue
    }
    
    # 绘制曲线
    $points = New-Object System.Windows.Media.PointCollection
    $canvasWidth = $MemoryChartCanvas.ActualWidth
    $canvasHeight = $MemoryChartCanvas.ActualHeight
    
    if ($canvasWidth -gt 0 -and $canvasHeight -gt 0) {
        $historyCount = $Global:AppState.MemoryHistory.Count
        
        if ($historyCount -gt 0) {
            for ($i = 0; $i -lt $historyCount; $i++) {
                $value = $Global:AppState.MemoryHistory[$i]
                $x = ($i * $canvasWidth) / ($historyCount - 1)
                $y = $canvasHeight - ($value * $canvasHeight / 100)
                
                # 确保值在可视范围内
                $y = [math]::Max(10, [math]::Min($canvasHeight - 10, $y))
                
                $points.Add(New-Object System.Windows.Point($x, $y))
            }
        }
        
        # 设置平滑效果
        $MemoryUsagePolyline.StrokeLineJoin = [System.Windows.Media.PenLineJoin]::Round
        $MemoryUsagePolyline.StrokeStartLineCap = [System.Windows.Media.PenLineCap]::Round
        $MemoryUsagePolyline.StrokeEndLineCap = [System.Windows.Media.PenLineCap]::Round
        
        $MemoryUsagePolyline.Points = $points
    }
}

# 更新磁盘空间显示
function Update-DiskSpaceDisplay {
    $diskInfo = Get-DiskSpaceInfo
    
    # 更新进度条
    $DiskSpaceBar.Value = $diskInfo.UsedSpacePercent
    
    # 更新文本显示
    $DiskSpaceText.Text = "已使用: $($diskInfo.UsedSpacePercent)% ($($diskInfo.FreeSpaceGB)GB / $($diskInfo.TotalSizeGB)GB)"
    
    # 根据使用情况更改进度条颜色
    if ($diskInfo.UsedSpacePercent -gt 90) {
        $DiskSpaceBar.Resources["{x:Static SystemColors.HighlightBrushKey}"] = [System.Windows.Media.Brushes]::Red
        $DiskSpaceBar.Resources["{x:Static SystemColors.ControlBrushKey}"] = [System.Windows.Media.Brushes]::Red
    } elseif ($diskInfo.UsedSpacePercent -gt 75) {
        $DiskSpaceBar.Resources["{x:Static SystemColors.HighlightBrushKey}"] = [System.Windows.Media.Brushes]::Orange
        $DiskSpaceBar.Resources["{x:Static SystemColors.ControlBrushKey}"] = [System.Windows.Media.Brushes]::Orange
    } else {
        $DiskSpaceBar.Resources["{x:Static SystemColors.HighlightBrushKey}"] = [System.Windows.Media.Brushes]::Green
        $DiskSpaceBar.Resources["{x:Static SystemColors.ControlBrushKey}"] = [System.Windows.Media.Brushes]::Green
    }
}

# 更新系统监控数据 - 增强版
function Update-SystemMonitoringData {
    try {
        # 获取系统指标
        $cpuUsage = Get-CPUUsage
        $memoryUsage = Get-MemoryUsage
        
        # 更新图表
        Update-CPUChart -cpuUsage $cpuUsage
        Update-MemoryChart -memoryUsage $memoryUsage
        Update-DiskSpaceDisplay
        
        # 更新刷新状态指示器
        Update-RefreshIndicator
    } catch {
        # 发生错误时更新刷新指示器为红色
        Write-AppLog -Operation "监控错误" -Description "更新系统监控数据失败: $_"
        
        # 更新刷新指示器颜色为红色表示错误
        $refreshIndicator = $Window.FindName("RefreshIndicator")
        if ($refreshIndicator) {
            $refreshIndicator.Foreground = [System.Windows.Media.Brushes]::Red
            $refreshIndicator.Content = "上次刷新: $([DateTime]::Now.ToString('HH:mm:ss')) (错误)"
        }
    }
}

# 添加刷新状态指示器
function Add-RefreshIndicator {
    $mainGrid = $Window.FindName("MainGrid")
    if (-not $mainGrid) { 
        # 如果找不到MainGrid，则尝试获取根Grid
        $mainGrid = $Window.Content
    }
    if (-not $mainGrid) { return }
    
    # 创建刷新状态标签
    $refreshIndicator = New-Object System.Windows.Controls.Label
    $refreshIndicator.Name = "RefreshIndicator"
    $refreshIndicator.Content = "上次刷新: $([DateTime]::Now.ToString('HH:mm:ss'))"
    $refreshIndicator.FontSize = 10
    $refreshIndicator.Foreground = [System.Windows.Media.Brushes]::Gray
    $refreshIndicator.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Right
    $refreshIndicator.VerticalAlignment = [System.Windows.VerticalAlignment]::Top
    $refreshIndicator.Margin = New-Object System.Windows.Thickness(5)
    
    # 将指示器添加到网格中
    $mainGrid.Children.Add($refreshIndicator)
}

# 更新刷新状态
function Update-RefreshIndicator {
    $refreshIndicator = $Window.FindName("RefreshIndicator")
    if ($refreshIndicator) {
        $refreshIndicator.Content = "上次刷新: $([DateTime]::Now.ToString('HH:mm:ss'))"
        
        # 添加闪烁效果表示正在刷新
        $refreshIndicator.Foreground = [System.Windows.Media.Brushes]::Green
        
        # 使用DispatcherTimer来延迟恢复原色，避免阻塞UI
        $delayTimer = New-Object System.Windows.Threading.DispatcherTimer
        $delayTimer.Interval = [TimeSpan]::FromMilliseconds(200)
        $delayTimer.Add_Tick({
            $refreshIndicator.Foreground = [System.Windows.Media.Brushes]::Gray
            $delayTimer.Stop()
        })
        $delayTimer.Start()
    }
    
    # 更新最后刷新时间
    $Global:AppState.LastRefreshTime = [DateTime]::Now
}

# 初始化系统监控
function Initialize-SystemMonitoring {
    # 初始化CPU和内存历史数据
    $Global:AppState.CPUHistory = New-Object System.Collections.Generic.List[double]
    $Global:AppState.MemoryHistory = New-Object System.Collections.Generic.List[double]
    
    # 初始数据填充 - 使用平滑的递增模式
    for ($i = 0; $i -lt 15; $i++) {
        # 生成平滑的初始曲线，而不是全部为0
        $initialCPUValue = [Math]::Min(20, $i * 1.5)
        $initialMemoryValue = [Math]::Min(30, $i * 2)
        
        $Global:AppState.CPUHistory.Add($initialCPUValue)
        $Global:AppState.MemoryHistory.Add($initialMemoryValue)
    }
    
    # 添加刷新状态指示器
    Add-RefreshIndicator
    
    # 创建并启动系统监控计时器
    $Global:SystemMonitorTimer = New-Object System.Windows.Threading.DispatcherTimer
    $Global:SystemMonitorTimer.Interval = [TimeSpan]::FromSeconds(5)
    $Global:SystemMonitorTimer.Add_Tick({ 
        try {
            # 标记刷新开始
            $refreshIndicator = $Window.FindName("RefreshIndicator")
            if ($refreshIndicator) {
                $refreshIndicator.Foreground = [System.Windows.Media.Brushes]::Yellow
            }
            
            # 更新系统数据
            Update-SystemMonitoringData
            
            # 更新刷新状态
            Update-RefreshIndicator
        } catch {
            Write-AppLog -Operation "监控错误" -Description "刷新系统数据失败: $_"
            
            # 恢复刷新指示器颜色为红色表示错误
            $refreshIndicator = $Window.FindName("RefreshIndicator")
            if ($refreshIndicator) {
                $refreshIndicator.Foreground = [System.Windows.Media.Brushes]::Red
            }
        }
    })
    $Global:SystemMonitorTimer.Start()
    
    # 立即执行一次数据更新
    Update-SystemMonitoringData
    Update-RefreshIndicator
    
    Write-AppLog -Operation "初始化" -Description "系统监控已启动，启用自动刷新机制"
}

# 初始化系统状态监控
Initialize-StatusMonitoring

# 暂停系统功能
function Pause-System {
    try {
        # 创建暂停标志文件
        New-Item -Path $Global:AppState.PauseFlagPath -ItemType File -Force | Out-Null
        Write-AppLog -Operation "系统操作" -Description "系统已暂停（创建PAUSE.flag文件）"
        
        # 通过API暂停
        $uri = "http://localhost:$($Global:AppState.ListenPort)/pause"
        Invoke-RestMethod -Uri $uri -Method Post -TimeoutSec 2 -ErrorAction Stop | Out-Null
        Write-AppLog -Operation "API调用" -Description "成功调用暂停API"
    } catch {
        Write-AppLog -Operation "API错误" -Description "调用暂停API失败: $_"
    }
    
    # 手动更新状态
    $Global:AppState.RunningStatus = "已暂停"
    Update-StatusDisplay
}

# 恢复系统功能
function Resume-System {
    try {
        # 删除暂停标志文件
        if (Test-Path $Global:AppState.PauseFlagPath) {
            Remove-Item -Path $Global:AppState.PauseFlagPath -Force
            Write-AppLog -Operation "系统操作" -Description "系统已恢复（删除PAUSE.flag文件）"
        }
        
        # 通过API恢复
        $uri = "http://localhost:$($Global:AppState.ListenPort)/resume"
        Invoke-RestMethod -Uri $uri -Method Post -TimeoutSec 2 -ErrorAction Stop | Out-Null
        Write-AppLog -Operation "API调用" -Description "成功调用恢复API"
    } catch {
        Write-AppLog -Operation "API错误" -Description "调用恢复API失败: $_"
    }
    
    # 手动更新状态
    if ($Global:AppState.AgentConnected) {
        $Global:AppState.RunningStatus = "运行中"
    }
    Update-StatusDisplay
}

# 打开日志文件 - 增强版
function Open-LogFile {
    try {
        $date = Get-Date -Format "yyyyMMdd"
        $logPath = Join-Path $Global:AppState.LogDir "agent_$date.log"
        
        if (Test-Path $logPath) {
            # 尝试使用默认应用打开
            Start-Process -FilePath $logPath -ErrorAction Stop
            Write-AppLog -Operation "操作执行" -Description "已打开今日日志文件"
        } else {
            # 如果日志文件不存在，尝试打开日志目录
            if (Test-Path $Global:AppState.LogDir) {
                Start-Process -FilePath $Global:AppState.LogDir -ErrorAction Stop
                Write-AppLog -Operation "操作执行" -Description "今日日志文件不存在，已打开日志目录: $($Global:AppState.LogDir)"
                [System.Windows.MessageBox]::Show("今日日志文件不存在，已打开日志目录。", "提示", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information)
            } else {
                Write-AppLog -Operation "操作错误" -Description "日志文件和目录均不存在"
                [System.Windows.MessageBox]::Show("日志文件和目录均不存在！", "错误", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Error)
            }
        }
    } catch {
        # 提供更多诊断信息
        Write-AppLog -Operation "操作错误" -Description "打开日志文件失败: $($_.Exception.Message). 请手动检查路径: $logPath"
        
        # 弹出错误消息对话框
        [System.Windows.MessageBox]::Show(
            "无法打开日志文件: $($_.Exception.Message)\n\n日志位置: $logPath", 
            "打开日志失败", 
            [System.Windows.MessageBoxButton]::OK, 
            [System.Windows.MessageBoxImage]::Error
        )
    }
}

# 清空日志 - 增强版
function Clear-Logs {
    try {
        # 显示更详细的确认对话框
        $result = [System.Windows.MessageBox]::Show(
            "确定要清空当前显示的日志吗？\n此操作不会影响已保存的日志文件。", 
            "确认清空日志", 
            [System.Windows.MessageBoxButton]::YesNo, 
            [System.Windows.MessageBoxImage]::Question
        )
        
        if ($result -eq [System.Windows.MessageBoxResult]::Yes) {
            # 清空日志前记录操作
            $clearEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 操作执行：日志已清空"
            
            # 清空日志
            $Global:AppState.LogEntries.Clear()
            
            # 添加清空操作的记录
            $Global:AppState.LogEntries.Add($clearEntry)
            
            # 更新UI
            Update-LogDisplay
            
            # 写入到日志文件
            $logPath = Get-CurrentLogFilePath
            if (Test-Path $logPath) {
                $clearEntry | Out-File -FilePath $logPath -Append -Encoding utf8
            }
        }
    } catch {
        Write-AppLog -Operation "操作错误" -Description "清空日志失败: $_"
        [System.Windows.MessageBox]::Show(
            "清空日志时出错: $($_.Exception.Message)", 
            "操作失败", 
            [System.Windows.MessageBoxButton]::OK, 
            [System.Windows.MessageBoxImage]::Error
        )
    }
}

# 运行测试任务 - 增强版
function Run-TestTask {
    try {
        # 更新当前任务显示
        $Global:AppState.CurrentTask = "测试任务"
        Update-StatusDisplay
        Write-AppLog -Operation "系统操作" -Description "开始运行测试任务"
        
        # 禁用测试按钮，防止重复点击
        $RunTestButton.IsEnabled = $false
        
        # 添加视觉反馈：按钮显示执行中状态
        $originalText = $RunTestButton.Content
        $RunTestButton.Content = "测试中..."
        
        # 通过API执行测试
        $uri = "http://localhost:$($Global:AppState.ListenPort)/execute"
        $body = @{ action = "type"; data = "测试任务运行成功" } | ConvertTo-Json
        $headers = @{ "Content-Type" = "application/json" }
        
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.success) {
            Write-AppLog -Operation "测试任务" -Description "测试任务执行成功"
            [System.Windows.MessageBox]::Show(
                "测试任务执行成功！\n\n响应内容: $($response | ConvertTo-Json -Compress)", 
                "测试成功", 
                [System.Windows.MessageBoxButton]::OK, 
                [System.Windows.MessageBoxImage]::Information
            )
        } else {
            Write-AppLog -Operation "测试任务" -Description "测试任务执行失败: $($response.message)"
            [System.Windows.MessageBox]::Show(
                "测试任务执行失败: $($response.message)", 
                "测试失败", 
                [System.Windows.MessageBoxButton]::OK, 
                [System.Windows.MessageBoxImage]::Warning
            )
        }
    } catch {
        Write-AppLog -Operation "测试任务" -Description "执行测试任务失败: $($_.Exception.Message)"
        
        # 提供更详细的错误信息
        $errorMessage = "执行测试任务失败:\n"
        if ($_.Exception.Message -match "无法连接") {
            $errorMessage += "无法连接到Agent服务，请确认:\n1. Agent是否正在运行\n2. 端口是否正确\n3. 防火墙是否允许连接"
        } else {
            $errorMessage += $_.Exception.Message
        }
        
        [System.Windows.MessageBox]::Show(
            $errorMessage, 
            "测试失败", 
            [System.Windows.MessageBoxButton]::OK, 
            [System.Windows.MessageBoxImage]::Error
        )
    } finally {
        # 恢复原始状态，无论成功失败都要执行
        $Global:AppState.CurrentTask = "无任务"
        $RunTestButton.Content = $originalText
        $RunTestButton.IsEnabled = $true
        Update-StatusDisplay
    }
}

# 绑定按钮事件
function Initialize-ButtonEvents {
    # 暂停系统按钮
    $PauseButton.Add_Click({
        Pause-System
    })
    
    # 恢复系统按钮
    $ResumeButton.Add_Click({
        Resume-System
    })
    
    # 打开日志按钮
    $OpenLogButton.Add_Click({
        Open-LogFile
    })
    
    # 清空日志按钮
    $ClearLogsButton.Add_Click({
        Clear-Logs
    })
    
    # 运行测试按钮
    $RunTestButton.Add_Click({
        Run-TestTask
    })
    
    Write-AppLog -Operation "初始化" -Description "按钮事件已绑定"
}

# 实现日志高亮显示（基于关键字）
function Update-LogWithHighlight {
    # 由于PowerShell中WPF富文本处理较复杂，这里使用简单的方法
    # 实际应用中可以使用RichTextBox和TextRange实现更复杂的高亮
    $logText = ""
    
    foreach ($entry in $Global:AppState.LogEntries) {
        # 这里仅作演示，实际高亮需要更复杂的实现
        $logText += "$entry`n"
    }
    
    $LogTextBox.Text = $logText.TrimEnd()
    $LogTextBox.ScrollToEnd()
}

# 初始化日志与操作区 - 增强版
function Initialize-LogAndOperationArea {
    try {
        # 绑定按钮事件
        Initialize-ButtonEvents
        
        # 设置日志文本框的初始样式
        $LogTextBox.AcceptsReturn = $true
        $LogTextBox.IsReadOnly = $true
        $LogTextBox.VerticalScrollBarVisibility = [System.Windows.Controls.ScrollBarVisibility]::Auto
        $LogTextBox.HorizontalScrollBarVisibility = [System.Windows.Controls.ScrollBarVisibility]::Auto
        $LogTextBox.Background = [System.Windows.Media.Brushes]::FromArgb(255, 30, 30, 30)
        $LogTextBox.Foreground = [System.Windows.Media.Brushes]::White
        $LogTextBox.FontFamily = "微软雅黑"
        $LogTextBox.FontSize = 12
        $LogTextBox.Padding = New-Object System.Windows.Thickness(5)
        
        # 应用按钮悬停效果的增强样式
        $buttonStyle = @"
        <Style xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" TargetType="Button">
            <Setter Property="Background" Value="#2D2D30"/>
            <Setter Property="Foreground" Value="#FFFFFF"/>
            <Setter Property="Padding" Value="12,6"/>
            <Setter Property="Margin" Value="5"/>
            <Setter Property="Width" Value="100"/>
            <Setter Property="FontFamily" Value="微软雅黑"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="CornerRadius" Value="6"/>
            <Setter Property="Effect">
                <Setter.Value>
                    <DropShadowEffect ShadowDepth="0" Color="Transparent"/>
                </Setter.Value>
            </Setter>
            <Style.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Background" Value="#3E3E42"/>
                    <Setter Property="Effect">
                        <Setter.Value>
                            <DropShadowEffect ShadowDepth="2" Color="#000000" Opacity="0.3" BlurRadius="4"/>
                        </Setter.Value>
                    </Setter>
                </Trigger>
                <Trigger Property="IsPressed" Value="True">
                    <Setter Property="Background" Value="#4E4E52"/>
                </Trigger>
                <Trigger Property="IsEnabled" Value="False">
                    <Setter Property="Background" Value="#1A1A1A"/>
                    <Setter Property="Foreground" Value="#666666"/>
                </Trigger>
            </Style.Triggers>
        </Style>
"@
        
        # 应用样式到所有按钮
        $buttonStyleObj = [Windows.Markup.XamlReader]::Parse($buttonStyle)
        $PauseButton.Style = $buttonStyleObj
        $ResumeButton.Style = $buttonStyleObj
        $OpenLogButton.Style = $buttonStyleObj
        $ClearLogsButton.Style = $buttonStyleObj
        $RunTestButton.Style = $buttonStyleObj
        
        # 设置初始日志
        Write-AppLog -Operation "初始化" -Description "日志与操作区已初始化"
    } catch {
        Write-AppLog -Operation "初始化错误" -Description "初始化日志与操作区失败: $_"
    }
}

# 初始化系统监控
Initialize-SystemMonitoring

# 增强的Pause Flag文件监控
function Start-FlagFileWatcher {
    try {
        # 确保JEV目录存在
        $jevDir = Split-Path $Global:AppState.PauseFlagPath -Parent
        if (-not (Test-Path $jevDir)) {
            New-Item -Path $jevDir -ItemType Directory -Force | Out-Null
        }
        
        # 创建文件系统监视器
        $Global:FlagFileWatcher = New-Object System.IO.FileSystemWatcher
        $Global:FlagFileWatcher.Path = $jevDir
        $Global:FlagFileWatcher.Filter = "PAUSE.flag"
        $Global:FlagFileWatcher.IncludeSubdirectories = $false
        $Global:FlagFileWatcher.EnableRaisingEvents = $true
        
        # 注册创建事件
        Register-ObjectEvent -InputObject $Global:FlagFileWatcher -EventName Created -Action {
            Write-AppLog -Operation "安全监控" -Description "检测到PAUSE.flag文件创建，系统将暂停"
            $Global:AppState.RunningStatus = "已暂停"
            Update-StatusDisplay
        } | Out-Null
        
        # 注册删除事件
        Register-ObjectEvent -InputObject $Global:FlagFileWatcher -EventName Deleted -Action {
            Write-AppLog -Operation "安全监控" -Description "检测到PAUSE.flag文件删除，系统将恢复"
            if ($Global:AppState.AgentConnected) {
                $Global:AppState.RunningStatus = "运行中"
            }
            Update-StatusDisplay
        } | Out-Null
        
        Write-AppLog -Operation "安全初始化" -Description "Flag文件监控已启动"
    } catch {
        Write-AppLog -Operation "安全错误" -Description "初始化Flag文件监控失败: $_"
    }
}

# 带重试机制的API调用函数
function Invoke-APIRequestWithRetry {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [string]$Body = $null,
        [hashtable]$Headers = $null,
        [int]$MaxRetries = 3,
        [int]$RetryIntervalSeconds = 1
    )
    
    $retryCount = 0
    $success = $false
    $result = $null
    
    while (-not $success -and $retryCount -lt $MaxRetries) {
        try {
            $params = @{
                Uri = $Uri
                Method = $Method
                TimeoutSec = 2
                ErrorAction = "Stop"
            }
            
            if ($Body) {
                $params.Body = $Body
            }
            
            if ($Headers) {
                $params.Headers = $Headers
            }
            
            $result = Invoke-RestMethod @params
            $success = $true
            
            # 记录成功的API调用
            Write-AppLog -Operation "API调用" -Description "成功: $Method $Uri"
        } catch {
            $retryCount++
            $errorMessage = $_.Exception.Message
            
            if ($retryCount -lt $MaxRetries) {
                Write-AppLog -Operation "API重试" -Description "调用失败 ($retryCount/$MaxRetries): $errorMessage"
                Start-Sleep -Seconds $RetryIntervalSeconds
            } else {
                Write-AppLog -Operation "API错误" -Description "调用失败 (已达最大重试次数): $errorMessage"
            }
        }
    }
    
    return @{
        Success = $success
        Result = $result
    }
}

# 安全状态评估函数
function Test-SystemSecurityStatus {
    $securityStatus = @{
        FlagFileExists = (Test-Path $Global:AppState.PauseFlagPath)
        AgentConnected = $Global:AppState.AgentConnected
        SystemRunning = ($Global:AppState.RunningStatus -eq "运行中")
    }
    
    # 记录安全状态评估
    Write-AppLog -Operation "安全评估" -Description "Flag文件: $($securityStatus.FlagFileExists), Agent连接: $($securityStatus.AgentConnected), 系统状态: $($securityStatus.SystemRunning)"
    
    return $securityStatus
}

# 统一的API通信管理器
function Initialize-CommunicationManager {
    # 覆盖原有的API调用函数，使用带重试机制的版本
    function global:Get-AgentStatus {
        try {
            $uri = "http://localhost:$($Global:AppState.ListenPort)/status"
            $response = Invoke-APIRequestWithRetry -Uri $uri -Method Get -MaxRetries 2
            
            if ($response.Success) {
                $Global:AppState.AgentConnected = $true
                
                # 更新当前任务
                if ($response.Result.task -and $response.Result.task -ne "") {
                    $Global:AppState.CurrentTask = $response.Result.task
                } else {
                    $Global:AppState.CurrentTask = "无任务"
                }
                
                # 更新监听端口
                if ($response.Result.port) {
                    $Global:AppState.ListenPort = $response.Result.port
                }
                
                # 根据flag文件和API状态更新运行状态
                Check-PauseFlagStatus
            } else {
                $Global:AppState.AgentConnected = $false
                $Global:AppState.RunningStatus = "等待中"
            }
        } catch {
            $Global:AppState.AgentConnected = $false
            $Global:AppState.RunningStatus = "等待中"
        }
        
        Update-StatusDisplay
    }
    
    # 覆盖暂停函数
    function global:Pause-System {
        try {
            # 创建暂停标志文件
            New-Item -Path $Global:AppState.PauseFlagPath -ItemType File -Force | Out-Null
            Write-AppLog -Operation "安全操作" -Description "已创建PAUSE.flag文件，系统暂停"
            
            # 通过API暂停（带重试）
            $uri = "http://localhost:$($Global:AppState.ListenPort)/pause"
            $response = Invoke-APIRequestWithRetry -Uri $uri -Method Post -MaxRetries 2
        } catch {
            Write-AppLog -Operation "安全错误" -Description "暂停系统失败: $_"
        }
        
        # 手动更新状态
        $Global:AppState.RunningStatus = "已暂停"
        Update-StatusDisplay
    }
    
    # 覆盖恢复函数
    function global:Resume-System {
        try {
            # 删除暂停标志文件
            if (Test-Path $Global:AppState.PauseFlagPath) {
                Remove-Item -Path $Global:AppState.PauseFlagPath -Force
                Write-AppLog -Operation "安全操作" -Description "已删除PAUSE.flag文件，系统恢复"
            }
            
            # 通过API恢复（带重试）
            $uri = "http://localhost:$($Global:AppState.ListenPort)/resume"
            $response = Invoke-APIRequestWithRetry -Uri $uri -Method Post -MaxRetries 2
        } catch {
            Write-AppLog -Operation "安全错误" -Description "恢复系统失败: $_"
        }
        
        # 手动更新状态
        if ($Global:AppState.AgentConnected) {
            $Global:AppState.RunningStatus = "运行中"
        }
        Update-StatusDisplay
    }
    
    Write-AppLog -Operation "安全初始化" -Description "通信管理器已初始化，启用API重试机制"
}

# 初始化安全联动逻辑
function Initialize-SecurityMechanism {
    # 启动Flag文件监控
    Start-FlagFileWatcher
    
    # 初始化通信管理器
    Initialize-CommunicationManager
    
    # 初始安全状态检查
    Test-SystemSecurityStatus
    
    # 定期安全状态检查
    $Global:SecurityCheckTimer = New-Object System.Windows.Threading.DispatcherTimer
    $Global:SecurityCheckTimer.Interval = [TimeSpan]::FromSeconds(10)
    $Global:SecurityCheckTimer.Add_Tick({ Test-SystemSecurityStatus })
    $Global:SecurityCheckTimer.Start()
    
    Write-AppLog -Operation "安全初始化" -Description "安全联动逻辑已初始化"
}

# 初始化日志与操作区
Initialize-LogAndOperationArea

# 初始化安全联动逻辑
Initialize-SecurityMechanism

# 加载窗口设置
Load-WindowSettings

# 初始化时执行一次日志轮换检查
Rotate-LogFiles

# 保存窗口位置和大小
function Save-WindowSettings {
    try {
        # 确保配置目录存在
        $configDir = Split-Path $Global:AppState.WindowSettingsPath -Parent
        if (-not (Test-Path $configDir)) {
            New-Item -Path $configDir -ItemType Directory -Force | Out-Null
        }
        
        # 保存窗口设置
        $settings = @{
            Left = $Window.Left
            Top = $Window.Top
            Width = $Window.Width
            Height = $Window.Height
            WindowState = $Window.WindowState.ToString()
            LastSaved = [DateTime]::Now.ToString("o")
        }
        
        # 转换为JSON并保存
        $settingsJson = $settings | ConvertTo-Json
        $settingsJson | Set-Content -Path $Global:AppState.WindowSettingsPath -Encoding UTF8
        
        Write-AppLog -Operation "设置保存" -Description "窗口位置和大小已保存"
    } catch {
        Write-AppLog -Operation "设置错误" -Description "保存窗口设置失败: $_"
    }
}

# 加载窗口位置和大小
function Load-WindowSettings {
    try {
        if (Test-Path $Global:AppState.WindowSettingsPath) {
            $settingsJson = Get-Content -Path $Global:AppState.WindowSettingsPath -Encoding UTF8
            $settings = $settingsJson | ConvertFrom-Json
            
            # 验证设置的有效性
            if ($settings.Left -and $settings.Top -and $settings.Width -and $settings.Height) {
                # 检查窗口是否在可见屏幕内
                $screenBounds = [System.Windows.SystemParameters]::PrimaryScreenWidth, [System.Windows.SystemParameters]::PrimaryScreenHeight
                
                # 确保窗口至少部分可见
                if (($settings.Left + 50) -lt $screenBounds[0] -and ($settings.Top + 50) -lt $screenBounds[1] -and 
                    $settings.Left -gt -$settings.Width + 50 -and $settings.Top -gt -$settings.Height + 50) {
                    
                    # 应用窗口位置和大小
                    $Window.Left = $settings.Left
                    $Window.Top = $settings.Top
                    $Window.Width = [Math]::Max(600, $settings.Width)  # 最小宽度限制
                    $Window.Height = [Math]::Max(400, $settings.Height)  # 最小高度限制
                    
                    # 恢复窗口状态
                    if ($settings.WindowState -eq "Maximized") {
                        $Window.WindowState = [System.Windows.WindowState]::Maximized
                    }
                    
                    Write-AppLog -Operation "设置加载" -Description "窗口位置和大小已恢复"
                }
            }
        }
    } catch {
        Write-AppLog -Operation "设置错误" -Description "加载窗口设置失败: $_"
    }
}

# 添加窗口位置变化事件处理
$Window.Add_LocationChanged({ Save-WindowSettings })

# 添加窗口大小变化事件处理
$Window.Add_SizeChanged({
    # 只有在正常状态下才保存大小（非最大化/最小化）
    if ($Window.WindowState -eq [System.Windows.WindowState]::Normal) {
        Save-WindowSettings
    }
})

# 添加窗口状态变化事件处理
$Window.Add_StateChanged({ Save-WindowSettings })

# 添加窗口关闭事件处理
$Window.Add_Closing({
    # 保存最终窗口位置
    Save-WindowSettings
    
    # 清理资源
    if ($Global:FlagFileWatcher) {
        $Global:FlagFileWatcher.Dispose()
    }
    if ($Global:StatusTimer) {
        $Global:StatusTimer.Stop()
    }
    if ($Global:AgentStatusTimer) {
        $Global:AgentStatusTimer.Stop()
    }
    if ($Global:PauseFlagTimer) {
        $Global:PauseFlagTimer.Stop()
    }
    if ($Global:SystemMonitorTimer) {
        $Global:SystemMonitorTimer.Stop()
    }
    if ($Global:SecurityCheckTimer) {
        $Global:SecurityCheckTimer.Stop()
    }
    
    Write-AppLog -Operation "系统关闭" -Description "JEV桌面执行监控器已关闭"
})

# 显示窗口并启动应用
$Window.ShowDialog() | Out-Null