# JEV桌面代理简化版

Write-Host "===================================="
Write-Host "      JEV 桌面代理 v2.0"
Write-Host "===================================="

# 检查配置文件
if (-not (Test-Path "config.json")) {
    Write-Host "[配置] 创建默认配置文件..."
    @{
        worker_url = "https://jevshop.bensonlove1986.workers.dev"
        execute_endpoint = "/execute"
        modules_endpoint = "/modules"
        last_sync = (Get-Date -Format o)
    } | ConvertTo-Json | Out-File "config.json" -Encoding utf8
    Write-Host "[配置] 配置文件创建完成"
}

# 读取配置
Write-Host "[配置] 加载配置文件..."
$config = Get-Content "config.json" -Raw | ConvertFrom-Json

Write-Host "[服务] 启动成功！"
Write-Host "[服务] Worker URL: $($config.worker_url)"
Write-Host "[服务] 日志目录: D:\PDF转网页\logs"
Write-Host "===================================="
Write-Host "可用命令:"
Write-Host "1. 执行任务 (execute)"
Write-Host "2. 查看模块 (modules)"
Write-Host "3. 退出 (exit)"
Write-Host "===================================="

# 主循环
while ($true) {
    $command = Read-Host "请输入命令"
    
    switch ($command.ToLower()) {
        "execute" {
            $taskName = Read-Host "请输入任务名称"
            Write-Host "[任务] 执行: $taskName"
            
            # 构建请求
            $requestBody = @{
                task = $taskName
                timestamp = (Get-Date -Format o)
            } | ConvertTo-Json
            
            try {
                $response = Invoke-RestMethod -Uri "$($config.worker_url)$($config.execute_endpoint)" `
                                            -Method POST `
                                            -ContentType "application/json" `
                                            -Body $requestBody
                Write-Host "[任务] 执行成功!"
                Write-Host "[响应] $($response | ConvertTo-Json -Depth 3)"
            } catch {
                Write-Host "[错误] 任务执行失败: $($_.Exception.Message)"
            }
        }
        "modules" {
            Write-Host "[模块] 获取可用模块..."
            try {
                $response = Invoke-RestMethod -Uri "$($config.worker_url)$($config.modules_endpoint)" `
                                            -Method GET
                Write-Host "[模块] 可用模块:"
                $response | ForEach-Object { Write-Host "  - $_" }
            } catch {
                Write-Host "[错误] 无法获取模块列表: $($_.Exception.Message)"
            }
        }
        "exit" {
            Write-Host "[退出] 正在关闭服务..."
            break
        }
        default {
            Write-Host "[错误] 未知命令，请重试"
        }
    }
}

Write-Host "[退出] 服务已关闭"
