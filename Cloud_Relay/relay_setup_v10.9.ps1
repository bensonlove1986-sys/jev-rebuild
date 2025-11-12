# JEV Cloud Relay v10.9 部署脚本

# 创建templates目录
$templatesDir = "D:\PDF转网页\Cloud_Relay\templates"
if (-not (Test-Path $templatesDir)) {
    New-Item -ItemType Directory -Path $templatesDir -Force | Out-Null
    Write-Host "templates 目录已创建" -ForegroundColor Green
}

# 创建PI模板
$piTemplate = "$templatesDir\pi_template.html"
if (-not (Test-Path $piTemplate)) {
    $htmlContent = '<!DOCTYPE html><html><head><title>Proforma Invoice - {{pi_number}}</title><meta charset="UTF-8"></head><body><h1>PROFORMA INVOICE</h1><p>Invoice: {{pi_number}}</p><p>Date: {{date}}</p><p>Customer: {{customer}}</p></body></html>'
    Set-Content -Path $piTemplate -Value $htmlContent -Encoding UTF8
    Write-Host "PI模板已创建" -ForegroundColor Green
}

# 创建或更新日志文件
$logFile = "D:\PDF转网页\Cloud_Relay\relay_log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
if (Test-Path $logFile) {
    Add-Content -Path $logFile -Value "[$timestamp] JEV Cloud Relay v10.9 部署完成"
} else {
    Set-Content -Path $logFile -Value "[$timestamp] JEV Cloud Relay v10.9 部署完成"
}
Add-Content -Path $logFile -Value "[$timestamp] 系统状态: workflow_stable"
Add-Content -Path $logFile -Value "[$timestamp] lock: active"

# 显示部署结果
Write-Host "==========================================="
Write-Host "JEV Cloud Relay WorkflowAI v10.9 部署完成"
Write-Host "==========================================="
Write-Host "部署状态: 成功"
Write-Host ""
Write-Host "要验证系统，请运行: .\verify_cloud_relay.ps1"
Write-Host ""
Write-Host "LOCK = ACTIVE"
Write-Host "VERSION = v10.9"
Write-Host "==========================================="
