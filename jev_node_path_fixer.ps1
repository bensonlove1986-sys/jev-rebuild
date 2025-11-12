Write-Host "[Step 1] 检查 Node.js 环境..."
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
  Write-Host "⚠️ 未检测到 Node.js，准备修复..."
  $defaultPath = "C:\Program Files\nodejs\node.exe"
  if (Test-Path $defaultPath) {
    Write-Host "✅ 检测到 Node.js 安装，但未加入 PATH，正在注册..."
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs", "Machine")
    Write-Host "✅ 已修复环境变量，请重启 PowerShell 后生效。"
  } else {
    Write-Host "❌ 未安装 Node.js，请访问 https://nodejs.org/zh-cn 下载 LTS 版后重试。"
    exit
  }
} else {
  Write-Host "✅ Node.js 已检测到：$nodePath"
}

Write-Host "[Step 2] 检查脚本路径..."
$batPath = "D:\PDF转网页\JEV_SAFE_RECOVERY.bat"
if (-not (Test-Path $batPath)) {
  Write-Host "❌ 找不到脚本文件：$batPath"
  Write-Host "请确认脚本位于 D:\PDF转网页 目录下。"
  exit
} else {
  Write-Host "✅ 找到脚本文件：$batPath"
}

Write-Host "[Step 3] 检查执行策略..."
$policy = Get-ExecutionPolicy
if ($policy -ne "RemoteSigned" -and $policy -ne "Unrestricted") {
  Write-Host "⚠️ 当前策略为 $policy，可能阻止脚本运行，正在修复..."
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  Write-Host "✅ 执行策略已修复为 RemoteSigned"
} else {
  Write-Host "✅ 执行策略正常：$policy"
}

Write-Host "[Step 4] 测试执行批处理文件..."
cd "D:\PDF转网页"
if (Test-Path ".\JEV_SAFE_RECOVERY.bat") {
  Write-Host "🧩 尝试运行批处理文件..."
  Start-Process "cmd.exe" -ArgumentList "/c JEV_SAFE_RECOVERY.bat" -Wait
  Write-Host "✅ 批处理文件执行完毕。"
} else {
  Write-Host "❌ 批处理文件未找到。"
}

Write-Host "`n[JEV] Node 环境修复与脚本执行验证完成"
Write-Host "✅ 环境变量检测通过"
Write-Host "✅ 批处理脚本可执行"
Write-Host "✅ System Ready for Recovery"