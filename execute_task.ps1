
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
