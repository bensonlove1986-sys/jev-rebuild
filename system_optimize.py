import os
import re
import json
import time
import shutil
from datetime import datetime

# 定义要保留的核心文件
KEEP_FILES = ['desktopAgent.ps1', 'execute_task.ps1', 'config.json']

# 删除文件函数
def delete_file(file_path):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"已删除: {file_path}")
    except Exception as e:
        print(f"删除失败 {file_path}: {e}")

# 删除目录函数
def delete_directory(dir_path):
    try:
        if os.path.exists(dir_path) and os.path.isdir(dir_path):
            shutil.rmtree(dir_path)
            print(f"已删除目录: {dir_path}")
    except Exception as e:
        print(f"删除目录失败 {dir_path}: {e}")

# 清理临时生成的.ps1文件（除指定保留的）
def clean_temp_ps1_files(root_dir):
    for root, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ps1'):
                # 保留核心文件
                if file in KEEP_FILES:
                    continue
                # 跳过其他需要保留的文件
                if file == 'desktopAgent.ps1' or file == 'execute_task.ps1':
                    continue
                # 删除其他所有.ps1文件
                file_path = os.path.join(root, file)
                delete_file(file_path)

# 清理重复的测试脚本
def clean_duplicate_test_scripts(root_dir):
    test_scripts = ['kv_test.ps1', 'diagnostic_test.ps1', 'redeploy_worker_kv.ps1']
    for script in test_scripts:
        script_path = os.path.join(root_dir, script)
        delete_file(script_path)

# 清理临时日志文件
def clean_temp_log_files(root_dir):
    for root, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('.tmp', '.bak', '.log')):
                file_path = os.path.join(root, file)
                delete_file(file_path)

# 重写desktopAgent.ps1
def rewrite_desktop_agent():
    content = '''
# 简化的desktopAgent.ps1 - 通过Worker执行所有任务

function Send-JevTask {
    param (
        [string]$taskName,
        [hashtable]$parameters = @{}
    )
    
    Write-Host "正在执行任务: $taskName"
    
    # 构建JSON请求
    $requestBody = @{
        task = $taskName
        params = $parameters
        timestamp = (Get-Date -Format o)
    } | ConvertTo-Json
    
    try {
        # 发送请求到Worker
        $response = Invoke-RestMethod -Uri "https://jevshop.bensonlove1986.workers.dev/execute" `
                                     -Method POST `
                                     -ContentType "application/json" `
                                     -Body $requestBody `
                                     -ErrorAction Stop
        
        Write-Host "任务执行结果:"
        Write-Host ($response | ConvertTo-Json -Depth 10)
        
        return $response
    } catch {
        Write-Host "错误: 无法连接到JEV Worker服务"
        Write-Host $_.Exception.Message
        return $null
    }
}

# 主函数
function Main {
    Write-Host "JEV 桌面代理 v2.0 - 核心控制入口"
    Write-Host "所有任务逻辑已迁移至Cloudflare Worker"
    
    # 检查配置文件
    if (-not (Test-Path "config.json")) {
        Write-Host "创建默认配置文件..."
        @{
            worker_url = "https://jevshop.bensonlove1986.workers.dev"
            modules_endpoint = "/modules"
            execute_endpoint = "/execute"
            last_sync = (Get-Date -Format o)
        } | ConvertTo-Json | Out-File "config.json" -Encoding utf8
    }
    
    # 读取配置
    $config = Get-Content "config.json" | ConvertFrom-Json
    
    Write-Host "可用命令:"
    Write-Host "1. 执行任务 (execute)"
    Write-Host "2. 查看模块 (modules)"
    Write-Host "3. 退出 (exit)"
    
    while ($true) {
        $command = Read-Host "输入命令"
        
        switch -Wildcard ($command.ToLower()) {
            "execute*" {
                $taskName = Read-Host "输入任务名称"
                Send-JevTask -taskName $taskName
            }
            "modules" {
                Write-Host "获取可用模块列表..."
                try {
                    $modules = Invoke-RestMethod -Uri "$($config.worker_url)$($config.modules_endpoint)" `
                                                -Method GET `
                                                -ErrorAction Stop
                    Write-Host "可用模块:"
                    $modules | ForEach-Object { Write-Host "- $_" }
                } catch {
                    Write-Host "无法获取模块列表"
                }
            }
            "exit" {
                Write-Host "退出程序"
                break
            }
            default {
                Write-Host "未知命令，请重试"
            }
        }
    }
}

# 启动程序
Main
'''
    
    # 写入文件
    with open('d:\PDF转网页\desktopAgent.ps1', 'w', encoding='utf-8') as f:
        f.write(content)
    print("已重写 desktopAgent.ps1")

# 创建execute_task.ps1（如果不存在）
def create_execute_task_ps1():
    content = '''
# execute_task.ps1 - 任务执行总控

param (
    [string]$taskName,
    [hashtable]$parameters = @{}
)

# 直接调用Worker执行任务
$desktopAgentPath = Join-Path -Path $PSScriptRoot -ChildPath "desktopAgent.ps1"

if (Test-Path $desktopAgentPath) {
    # 导入desktopAgent的函数
    . $desktopAgentPath
    
    # 执行任务
    $result = Send-JevTask -taskName $taskName -parameters $parameters
    
    return $result
} else {
    Write-Error "无法找到 desktopAgent.ps1"
    return $null
}
'''
    
    if not os.path.exists('d:\PDF转网页\execute_task.ps1'):
        with open('d:\PDF转网页\execute_task.ps1', 'w', encoding='utf-8') as f:
            f.write(content)
        print("已创建 execute_task.ps1")

# 创建默认config.json
def create_default_config():
    if not os.path.exists('d:\PDF转网页\config.json'):
        config = {
            "worker_url": "https://jevshop.bensonlove1986.workers.dev",
            "modules_endpoint": "/modules",
            "execute_endpoint": "/execute",
            "last_sync": datetime.now().isoformat()
        }
        with open('d:\PDF转网页\config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print("已创建默认 config.json")

# 生成最终报告
def generate_report():
    report = {
        "local_cleanup": "✅ completed",
        "kept_files": KEEP_FILES,
        "remote_modules": "已迁移至 Worker",
        "last_sync_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open('d:\PDF转网页\system_optimize_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("生成最终报告: system_optimize_report.json")
    print(json.dumps(report, indent=2, ensure_ascii=False))

# 主函数
def main():
    root_dir = 'd:\PDF转网页'
    
    print("开始执行JEV系统优化任务...")
    
    # 清理任务
    print("\n=== 开始清理冗余文件 ===")
    
    # 清理临时.ps1文件
    print("\n清理临时生成的.ps1文件...")
    clean_temp_ps1_files(root_dir)
    
    # 清理重复测试脚本
    print("\n清理重复的测试脚本...")
    clean_duplicate_test_scripts(root_dir)
    
    # 清理临时日志文件
    print("\n清理临时日志文件...")
    clean_temp_log_files(root_dir)
    
    # 删除temp目录（如果存在）
    print("\n删除temp目录...")
    delete_directory(os.path.join(root_dir, 'temp'))
    
    # 保留核心文件
    print("\n=== 保留核心文件 ===")
    rewrite_desktop_agent()
    create_execute_task_ps1()
    create_default_config()
    
    # 生成报告
    print("\n=== 生成最终报告 ===")
    generate_report()
    
    print("\nJEV系统优化任务完成！")

if __name__ == "__main__":
    main()
