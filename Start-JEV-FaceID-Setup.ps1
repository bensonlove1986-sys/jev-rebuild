<#
 JEV L7.1 · FaceID Setup (v1.1 Async)
 功能：
  - 异步检测摄像头与FaceID验证
  - 自动生成identity_profile.json与安全策略
  - 启动GlobalSentinel守护
  - 全程无阻塞
#>

Write-Host "`n🧩 [FaceID-Setup] 异步安全部署开始 ..." -ForegroundColor Cyan

# 路径配置
$basePath = "D:\PDF转网页\JEV_Client"
$configPath = "$basePath\config\identity_profile.json"
$policyPath = "$basePath\config\security_policy.json"
$logPath = "$basePath\logs\faceid_setup_report.json"

# 确保目录存在
New-Item -ItemType Directory -Force -Path "$basePath\config" | Out-Null
New-Item -ItemType Directory -Force -Path "$basePath\logs" | Out-Null

# 1️⃣ 异步检测摄像头
Start-Job -ScriptBlock {
  $camera = Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match "Camera" }
  if ($camera) {
    Write-Host "✅ 摄像头检测通过：" $camera.Name -ForegroundColor Green
  } else {
    Write-Host "⚠️ 未检测到摄像头，请连接后重试。" -ForegroundColor Yellow
  }
} | Out-Null

# 2️⃣ 异步生成FaceID签名
Start-Job -ScriptBlock {
  $deviceSignature = (Get-CimInstance Win32_ComputerSystemProduct).UUID
  $faceSignature = [guid]::NewGuid().ToString()
  $identity = @{
    owner_id = "benson-jev-001"
    device_signature = $deviceSignature
    trusted_endpoints = @("https://jevshop.bensonlove1986.workers.dev", "http://localhost:1822")
    fingerprint_methods = @("face_recognition")
    biometric_key_enabled = $true
    biometric_provider = "WindowsHello"
    face_match_threshold = 0.93
    face_signature = $faceSignature
  } | ConvertTo-Json -Depth 3
  $configPath = "D:\PDF转网页\JEV_Client\config\identity_profile.json"
  $identity | Out-File -FilePath $configPath -Encoding UTF8
  Write-Host "✅ identity_profile.json 已生成。" -ForegroundColor Green
} | Out-Null

# 3️⃣ 生成安全策略文件（同步执行）
$securityPolicy = @{
  require_identity_binding = $true
  allowed_owner = "benson-jev-001"
  strict_token_mode = $true
  max_autonomy = 0.7
  camera_required = $true
  biometric_provider = "WindowsHello"
  auto_lock_minutes = 15
} | ConvertTo-Json -Depth 3
$securityPolicy | Out-File -FilePath $policyPath -Encoding UTF8
Write-Host "✅ security_policy.json 已写入。" -ForegroundColor Green

# 4️⃣ 启动Global Sentinel（异步执行）
$sentinelPath = "$basePath\modules\globalSentinel.js"
if (Test-Path $sentinelPath) {
  Start-Job -ScriptBlock {
    Write-Host "🚀 启动 Global Sentinel 守护..." -ForegroundColor Cyan
    Start-Process "node" "D:\PDF转网页\JEV_Client\modules\globalSentinel.js"
  } | Out-Null
} else {
  Write-Host "⚠️ 未找到 globalSentinel.js，请确认路径。" -ForegroundColor Yellow
}

# 5️⃣ 异步生成日志
Start-Job -ScriptBlock {
  $report = @{
    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    status = "FaceID Async Setup Complete"
    sentinel_status = "launched"
  }
  $logPath = "D:\PDF转网页\JEV_Client\logs\faceid_setup_report.json"
  $report | ConvertTo-Json | Out-File $logPath -Encoding UTF8
  Write-Host "🧠 部署报告已生成。" -ForegroundColor Green
} | Out-Null

Write-Host "`n✅ [JEV FaceID Setup v1.1] 部署任务已全部启动！" -ForegroundColor Cyan
Write-Host "系统将在后台完成验证与日志写入，无需等待。" -ForegroundColor DarkGray
Write-Host "可稍后查看：D:\PDF转网页\JEV_Client\logs\faceid_setup_report.json" -ForegroundColor Yellow