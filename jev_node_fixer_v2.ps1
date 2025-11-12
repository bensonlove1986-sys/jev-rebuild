# JEV-NODE-PATH-FIXER-v2.0
# 检测和修复Node.js环境变量及批处理文件权限

Write-Host "[Step 1] 检查Node.js环境..."
try {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $nodePath) {
        Write-Host "警告: 未检测到Node.js"
        $defaultPath = "C:\Program Files\nodejs\node.exe"
        if (Test-Path $defaultPath) {
            Write-Host "找到: Node.js安装在默认路径"
            [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs", "Machine")
            Write-Host "修复: 已添加Node.js到环境变量"
        } else {
            Write-Host "错误: 未找到Node.js安装"
            exit
        }
    } else {
        Write-Host "成功: Node.js路径: $nodePath"
    }
} catch {
    Write-Host "检查Node.js时出错: $_"
}

Write-Host "
[Step 2] 检查脚本路径..."
try {
    $batPath = "D:\PDF转网页\JEV_SAFE_RECOVERY.bat"
    if (Test-Path $batPath) {
        Write-Host "成功: 找到脚本文件: $batPath"
    } else {
        Write-Host "错误: 未找到脚本文件: $batPath"
        exit
    }
} catch {
    Write-Host "检查脚本路径时出错: $_"
}

Write-Host "
[Step 3] 检查执行策略..."
try {
    $policy = Get-ExecutionPolicy -ErrorAction SilentlyContinue
    if ($policy -ne "RemoteSigned" -and $policy -ne "Unrestricted") {
        Write-Host "修复: 设置执行策略为RemoteSigned"
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue
        Write-Host "成功: 执行策略已更新"
    } else {
        Write-Host "成功: 执行策略正常: $policy"
    }
} catch {
    Write-Host "检查执行策略时出错: $_"
}

Write-Host "
[Step 4] 完成检查"
Write-Host "环境检测完成"
Write-Host "System Ready for Recovery"