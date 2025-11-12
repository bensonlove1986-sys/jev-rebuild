# 简化版 Node.js 环境检测与修复脚本
Write-Host "Step 1: 检查 Node.js 环境..."
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
  Write-Host "Warning: 未检测到 Node.js"
  $defaultPath = "C:\Program Files\nodejs\node.exe"
  if (Test-Path $defaultPath) {
    Write-Host "Found: Node.js 安装在默认路径"
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs", "Machine")
    Write-Host "Fixed: 已添加 Node.js 到环境变量"
  } else {
    Write-Host "Error: 未找到 Node.js 安装"
    exit
  }
} else {
  Write-Host "OK: Node.js 路径: $nodePath"
}

Write-Host "\nStep 2: 检查脚本路径..."
$batPath = "D:\PDF转网页\JEV_SAFE_RECOVERY.bat"
if (Test-Path $batPath) {
  Write-Host "OK: 找到脚本: $batPath"
} else {
  Write-Host "Error: 未找到脚本文件"
  exit
}

Write-Host "\nStep 3: 检查执行策略..."
$policy = Get-ExecutionPolicy
if ($policy -ne "RemoteSigned" -and $policy -ne "Unrestricted") {
  Write-Host "Fixing: 设置执行策略为 RemoteSigned"
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  Write-Host "OK: 执行策略已更新"
} else {
  Write-Host "OK: 执行策略正常: $policy"
}

Write-Host "\nStep 4: 完成环境检查"
Write-Host "Environment check completed successfully"
Write-Host "System Ready for Recovery"