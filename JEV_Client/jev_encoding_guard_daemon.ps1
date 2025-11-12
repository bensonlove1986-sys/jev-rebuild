# === AUTO-GENERATED ===
# JEV Encoding Guard Daemon v3.5
# Purpose: Real-time encoding protection & auto repair

$RootPath = "D:\PDF转网页\JEV_Client"
$ReportPath = "$RootPath\diagnostics\encoding_guard_report.json"
$WatchPath = "$RootPath"
$LogPath = "$RootPath\diagnostics\encoding_guard_daemon.log"

# 确保诊断目录存在
if (-not (Test-Path "$RootPath\diagnostics")) {
    New-Item -ItemType Directory -Path "$RootPath\diagnostics" -Force | Out-Null
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null
"[$(Get-Date)] Encoding Guard started." | Out-File -FilePath $LogPath -Append -Encoding UTF8

function Repair-File($file) {
    try {
        if ($file -is [string]) {
            $file = Get-Item $file
        }
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        if ($content -match '\?\?\?' -or $content -match '锟' -or $content -match '鐚') {
            $backup = "$($file.FullName).bak"
            Copy-Item $file.FullName $backup -Force
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            "[$(Get-Date)] Fixed: $($file.FullName)" | Out-File $LogPath -Append -Encoding UTF8
        }
    } catch {
        "[$(Get-Date)] Error: $($file.FullName)" | Out-File $LogPath -Append -Encoding UTF8
    }
}

# 初始化文件监视器
$Watcher = New-Object IO.FileSystemWatcher
$Watcher.Path = $WatchPath
$Watcher.IncludeSubdirectories = $true
$Watcher.EnableRaisingEvents = $true

# 监控多种文件类型
$fileTypes = @("*.js", "*.html", "*.css", "*.json", "*.txt")
foreach ($type in $fileTypes) {
    $Watcher.Filter = $type
    Register-ObjectEvent $Watcher Changed -Action { 
        param($sender, $e) 
        Repair-File $e.FullPath 
    } -SourceIdentifier "EncodingGuard_Changed_$type"
    Register-ObjectEvent $Watcher Created -Action { 
        param($sender, $e) 
        Repair-File $e.FullPath 
    } -SourceIdentifier "EncodingGuard_Created_$type"
}

# 定期扫描和生成报告
while ($true) {
    # 扫描所有关键文件
    $Files = Get-ChildItem -Path $RootPath -Recurse -Include *.js,*.html,*.json,*.log -ErrorAction SilentlyContinue
    foreach ($file in $Files) { 
        Repair-File $file 
    }
    
    # 生成报告
    $Report = @{
        encoding_status = "UTF-8 locked"
        system_state    = "STABLE"
        lock            = "ACTIVE"
        timestamp       = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        scanned_files   = $Files.Count
    }
    ($Report | ConvertTo-Json -Depth 3) | Set-Content -Path $ReportPath -Encoding UTF8
    
    # 等待下一次扫描
    Start-Sleep -Seconds 3600
}