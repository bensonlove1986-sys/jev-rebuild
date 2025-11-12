# JEV-GARBAGE-DIRECTORY-CLEANUP-v2.0
# 垃圾目录清理自动化脚本

# 配置参数
$RootDir = "D:\PDF转网页"
$DiagnosticsDir = Join-Path $RootDir "diagnostics"
$BackupDir = Join-Path $RootDir "backup_garbage"
$ReportFile = Join-Path $DiagnosticsDir "garbage_clean_report.txt"
$LogFile = Join-Path $DiagnosticsDir "garbage_clean_log.txt"
$ProtectedDir = Join-Path $RootDir "JEV_Client"

# 确保目录存在
if (-not (Test-Path $DiagnosticsDir)) {
    New-Item -ItemType Directory -Path $DiagnosticsDir -Force | Out-Null
}
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# 结果跟踪变量
$deletedDirs = @()
$backedUpDirs = @()
$totalSize = 0
$totalDeletedSize = 0
$totalBackupSize = 0

# 日志函数
function Write-Log {
    param (
        [string]$Message
    )
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $LogEntry = "[$Timestamp] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

# 获取目录大小
function Get-DirectorySize {
    param (
        [string]$Path
    )
    try {
        $size = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum
        return if ($size -eq $null) { 0 } else { $size }
    } catch {
        Write-Log "  ⚠️ 获取目录大小失败 ($Path): $_"
        return 0
    }
}

# 备份目录
function Backup-Directory {
    param (
        [string]$SourceDir
    )
    try {
        $dirName = Split-Path -Leaf $SourceDir
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupName = "${dirName}_backup_$timestamp"
        $backupPath = Join-Path $BackupDir $backupName
        
        Write-Log "  📁 备份目录到: $backupPath"
        Copy-Item -Path $SourceDir -Destination $backupPath -Recurse -Force
        
        $size = Get-DirectorySize $SourceDir
        $global:totalBackupSize += $size
        
        return $backupPath
    } catch {
        Write-Log "  ❌ 备份失败 ($SourceDir): $_"
        return $null
    }
}

# 删除目录
function Remove-TargetDirectory {
    param (
        [string]$DirPath
    )
    try {
        Write-Log "  ✅ 删除目录: $DirPath"
        Remove-Item -Path $DirPath -Recurse -Force
        
        $size = Get-DirectorySize $DirPath
        $global:totalDeletedSize += $size
        
        return $true
    } catch {
        Write-Log "  ❌ 删除失败 ($DirPath): $_"
        return $false
    }
}

# 生成清理报告
function Generate-CleanupReport {
    try {
        $reportContent = @"
====================================================
JEV 垃圾目录清理报告
生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
====================================================

🔍 清理统计:
- 扫描路径: $RootDir
- 识别的垃圾目录数: $($deletedDirs.Count + $backedUpDirs.Count)
- 直接删除的目录数: $($deletedDirs.Count)
- 备份后删除的目录数: $($backedUpDirs.Count)
- 释放空间: $([math]::Round($totalDeletedSize / 1MB, 2)) MB
- 备份空间: $([math]::Round($totalBackupSize / 1MB, 2)) MB

✅ 直接删除的目录列表:
$($deletedDirs -join "
")

⚠️ 备份后删除的目录列表:
$($backedUpDirs -join "
")

🔒 受保护目录:
- $ProtectedDir

====================================================
清理完成 - JEV-GARBAGE-DIRECTORY-CLEANUP-v2.0
"@
        
        Set-Content -Path $ReportFile -Value $reportContent
        Write-Log "✅ 清理报告已生成: $ReportFile"
        return $true
    } catch {
        Write-Log "❌ 生成报告失败: $_"
        return $false
    }
}

# 查找并清理垃圾目录
function Find-And-CleanGarbageDirs {
    param (
        [string]$SearchPath
    )
    Write-Log "🔍 开始扫描目录: $SearchPath"
    
    try {
        # 获取所有子目录
        $allDirs = Get-ChildItem -Path $SearchPath -Directory -ErrorAction SilentlyContinue
        
        foreach ($dir in $allDirs) {
            # 跳过受保护目录
            if ($dir.FullName -eq $ProtectedDir) {
                Write-Log "🔒 跳过受保护目录: $ProtectedDir"
                continue
            }
            
            # 检查目录名是否包含乱码字符
            if ($dir.Name -match "杢" -or $dir.Name -match "攺" -or $dir.Name -match "攺攺") {
                Write-Log "🔍 发现垃圾目录: $($dir.FullName)"
                
                # 获取目录大小
                $dirSize = Get-DirectorySize $dir.FullName
                $sizeInMB = [math]::Round($dirSize / 1MB, 2)
                Write-Log "  📊 目录大小: $sizeInMB MB"
                
                $global:totalSize += $dirSize
                
                # 根据大小决定操作
                if ($dirSize -lt 5MB) {
                    # 小于5MB，直接删除
                    if (Remove-TargetDirectory -DirPath $dir.FullName) {
                        $deletedDirs += "- $($dir.FullName) (${sizeInMB} MB)"
                    }
                } else {
                    # 大于等于5MB，先备份再删除
                    $backupPath = Backup-Directory -SourceDir $dir.FullName
                    if ($backupPath -ne $null) {
                        if (Remove-TargetDirectory -DirPath $dir.FullName) {
                            $backedUpDirs += "- $($dir.FullName) (${sizeInMB} MB) -> 备份到: $backupPath"
                        }
                    }
                }
            }
            
            # 递归扫描子目录
            Find-And-CleanGarbageDirs -SearchPath $dir.FullName
        }
    } catch {
        Write-Log "❌ 扫描目录失败 ($SearchPath): $_"
    }
}

# 验证系统状态
function Verify-SystemStatus {
    try {
        Write-Log "🧠 验证系统状态..."
        
        # 运行健康检查脚本
        $healthCheckScript = Join-Path $DiagnosticsDir "system_health_check.js"
        if (Test-Path $healthCheckScript) {
            $output = node "$healthCheckScript" 2>&1
            
            # 将输出写入日志
            $output | ForEach-Object { Write-Log $_ }
            
            # 提取健康评分
            $healthScore = 0
            $systemState = "UNKNOWN"
            
            foreach ($line in $output) {
                if ($line -match "最终健康评分: (\d+)/100") {
                    $healthScore = [int]$matches[1]
                }
                if ($line -match "系统状态: ✅ (\w+)") {
                    $systemState = $matches[1]
                }
            }
            
            Write-Log "✅ 系统健康评分: $healthScore/100"
            Write-Log "✅ 系统状态: $systemState"
            
            return @{
                HealthScore = $healthScore
                SystemState = $systemState
            }
        } else {
            Write-Log "❌ 找不到系统健康检查脚本: $healthCheckScript"
            return @{
                HealthScore = 0
                SystemState = "UNKNOWN"
            }
        }
    } catch {
        Write-Log "❌ 系统状态验证失败: $_"
        return @{
            HealthScore = 0
            SystemState = "UNKNOWN"
        }
    }
}

# 主函数
function Main {
    # 清空日志文件
    Set-Content -Path $LogFile -Value "" -Force
    
    Write-Log "===================================="
    Write-Log "🚀 JEV-GARBAGE-DIRECTORY-CLEANUP-v2.0 启动"
    Write-Log "===================================="
    
    # 查找并清理垃圾目录
    Find-And-CleanGarbageDirs -SearchPath $RootDir
    
    # 生成清理报告
    Generate-CleanupReport
    
    # 验证系统状态
    $systemStatus = Verify-SystemStatus
    
    Write-Log "===================================="
    Write-Log "✅ JEV-GARBAGE-DIRECTORY-CLEANUP-v2.0 完成"
    Write-Log "===================================="
    
    # 输出结果摘要
    Write-Host ""
    Write-Host "✅ 删除的目录列表:"
    $deletedDirs | ForEach-Object { Write-Host $_ }
    
    Write-Host ""
    Write-Host "⚠️ 备份的目录列表:"
    $backedUpDirs | ForEach-Object { Write-Host $_ }
    
    Write-Host ""
    Write-Host "📄 报告保存路径: $ReportFile"
    Write-Host "🏁 系统最终健康评分: $($systemStatus.HealthScore)/100 ($($systemStatus.SystemState))"
    
    return 0
}

# 执行主函数
Main