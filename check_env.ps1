Write-Host '=== 中继层端口检测 ==='
$ports = @(8080, 1819)
foreach ($port in $ports) {
    Write-Host "检测端口 ${port}..."
    $result = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($result) {
        Write-Host "  端口 ${port} 开放" -ForegroundColor Green
    } else {
        Write-Host "  端口 ${port} 关闭" -ForegroundColor Red
    }
}

Write-Host ''
Write-Host '=== 时间同步检查 ==='
try {
    w32tm /resync
    Write-Host '时间同步完成'
} catch {
    Write-Host '时间同步命令执行失败'
}

Write-Host ''
Write-Host '=== 目录存在性检查 ==='
$directories = @('ui', 'modules', 'config', 'jev_logs')
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "  目录 ${dir} 存在" -ForegroundColor Green
    } else {
        Write-Host "  目录 ${dir} 不存在" -ForegroundColor Red
    }
}