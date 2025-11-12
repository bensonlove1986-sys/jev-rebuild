# 简化版系统编码修复脚本
Write-Host "开始系统编码修复..."

# 基础路径设置
$basePath = "D:\PDF转网页"
$clientPath = "D:\PDF转网页\JEV_Client"
$diagnosticsPath = "$clientPath\diagnostics"

# 确保诊断目录存在
if (-not (Test-Path $diagnosticsPath)) {
    New-Item -ItemType Directory -Path $diagnosticsPath -Force | Out-Null
    Write-Host "创建诊断目录: $diagnosticsPath"
}

# 记录开始时间
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "开始时间: $timestamp"

# 简单的修复函数
function Fix-Encoding {
    param (
        [string]$filePath
    )
    
    try {
        # 读取文件
        $content = Get-Content $filePath -Raw
        
        # 检查并修复
        if ($content -match "") {
            Write-Host "发现乱码: $filePath"
            # 创建备份
            Copy-Item $filePath "$filePath.bak" -Force
            # 清理并保存
            $clean = $content -replace "[^\x09\x0A\x0D\x20-\x7E\xA0-\uFFFF]", ""
            Set-Content -Path $filePath -Value $clean -Encoding UTF8
            Write-Host "已修复: $filePath"
            return 1
        }
    } catch {
        Write-Host "处理错误: $filePath"
    }
    return 0
}

# 扫描修复JEV_Client目录
Write-Host "\n扫描JEV_Client目录..."
$fixedCount = 0
$totalCount = 0

$files = Get-ChildItem -Path $clientPath -Recurse -Include *.html,*.js,*.css,*.json -ErrorAction SilentlyContinue
$totalCount = $files.Count
Write-Host "找到 $totalCount 个文件"

foreach ($file in $files) {
    $fixedCount += Fix-Encoding $file.FullName
}

# 生成报告
$report = @{
    task = "JEV-SIMPLE-RECOVER"
    timestamp = $timestamp
    totalFiles = $totalCount
    fixedFiles = $fixedCount
    status = if ($fixedCount -gt 0) { "repaired" } else { "clean" }
}

$report | ConvertTo-Json | Out-File "$diagnosticsPath\simple_recover_report.json" -Encoding UTF8

# 写入日志
Add-Content -Path "$diagnosticsPath\encoding_guard_log.txt" -Value "[$timestamp] Simple recover: Fixed $fixedCount/$totalCount files"

# 显示完成信息
Write-Host "\n===================================="
Write-Host "修复完成!"
Write-Host "总计扫描: $totalCount 个文件"
Write-Host "修复数量: $fixedCount 个文件"
Write-Host "报告位置: $diagnosticsPath\simple_recover_report.json"
Write-Host "===================================="