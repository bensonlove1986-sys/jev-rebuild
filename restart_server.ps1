# 重启JEV Client服务的PowerShell脚本
Write-Host "正在尝试停止现有服务..."
try {
    # 停止现有服务
    taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq JEV-Client-Server" 2>$null
    Write-Host "已尝试停止现有服务"
} catch {
    Write-Host "停止服务时出错: $_"
}

# 等待1秒
Start-Sleep -Seconds 1

Write-Host "正在启动新服务..."
try {
    # 启动新服务
    $psi = New-object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c start \"JEV-Client-Server\" node server.js"
    $psi.WorkingDirectory = "d:\PDF转网页\JEV_Client"
    $psi.UseShellExecute = $true
    $process = [System.Diagnostics.Process]::Start($psi)
    
    Write-Host "服务已启动"
    Write-Host "请等待服务完全启动..."
    Start-Sleep -Seconds 2
    
    Write-Host "✅ 服务重启完成"
} catch {
    Write-Host "启动服务时出错: $_"
}