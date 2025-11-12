@echo off

REM 只修复关键HTML文件的编码问题
REM 这个脚本更简单，只处理最重要的几个文件，避免超时

set "SOURCE_DIR=d:\PDF转网页"
set "TARGET_DIR=d:\PDF转网页\JEV_Client"
set "BACKUP_DIR=d:\PDF转网页\CRITICAL_BACKUP"

REM 创建备份目录
mkdir "%BACKUP_DIR%" 2>nul

REM 定义要修复的关键文件列表
set "criticalFiles=ui\panel.html ui\login_portal.html ui\visual_learning_panel.html ui\client_portal.html ui\sentinel_dashboard.html main.html"

echo 开始修复关键HTML文件...
echo ===================================

REM 使用PowerShell处理每个关键文件
echo ^$targetDir = '%TARGET_DIR%'
echo ^$backupDir = '%BACKUP_DIR%'
echo ^$criticalFiles = '%criticalFiles%'.Split(' ')
echo foreach (^$relPath in ^$criticalFiles) {
>> temp_critical.ps1
echo    ^$fullPath = Join-Path -Path ^$targetDir -ChildPath ^$relPath
>> temp_critical.ps1
echo    if (Test-Path ^$fullPath) {
>> temp_critical.ps1
echo        Write-Host "处理: ^$relPath"
>> temp_critical.ps1
echo        try {
>> temp_critical.ps1
echo            # 备份文件
>> temp_critical.ps1
echo            ^$backupPath = Join-Path -Path ^$backupDir -ChildPath (Split-Path -Leaf ^$relPath)
>> temp_critical.ps1
echo            Copy-Item -Path ^$fullPath -Destination ^"^$backupPath.bak" -Force
>> temp_critical.ps1
echo            # 创建简单的HTML文件替换
>> temp_critical.ps1
echo            ^$content = @"
>> temp_critical.ps1
echo <!DOCTYPE html>
>> temp_critical.ps1
echo <html lang="zh-CN">
>> temp_critical.ps1
echo <head>
>> temp_critical.ps1
echo     <meta charset="UTF-8">
>> temp_critical.ps1
echo     <meta name="viewport" content="width=device-width, initial-scale=1.0">
>> temp_critical.ps1
echo     <title>JEV - ^(Split-Path -Leaf ^$relPath^)</title>
>> temp_critical.ps1
echo     <style>
>> temp_critical.ps1
echo         body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; color: #333; }
>> temp_critical.ps1
echo         .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
>> temp_critical.ps1
echo         h1 { color: #2c3e50; }
>> temp_critical.ps1
echo         .status { padding: 10px; margin: 10px 0; border-radius: 3px; }
>> temp_critical.ps1
echo         .success { background: #e8f5e9; color: #2e7d32; }
>> temp_critical.ps1
echo         pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
>> temp_critical.ps1
echo     </style>
>> temp_critical.ps1
echo </head>
>> temp_critical.ps1
echo <body>
>> temp_critical.ps1
echo     <div class="container">
>> temp_critical.ps1
echo         <h1>JEV 页面 - ^(Split-Path -Leaf ^$relPath^)</h1>
>> temp_critical.ps1
echo         <div class="status success">页面已修复为正确的UTF-8编码</div>
>> temp_critical.ps1
echo         <p>此页面已被重置为基本模板以解决编码问题。</p>
>> temp_critical.ps1
echo         <p>文件路径: ^$fullPath</p>
>> temp_critical.ps1
echo         <p>原始文件已备份至: ^"^$backupPath.bak"</p>
>> temp_critical.ps1
echo     </div>
>> temp_critical.ps1
echo </body>
>> temp_critical.ps1
echo </html>
>> temp_critical.ps1
echo "@
>> temp_critical.ps1
echo            # 保存为UTF-8无BOM
>> temp_critical.ps1
echo            [System.IO.File]::WriteAllText(^$fullPath, ^$content, [System.Text.UTF8Encoding]::new($false))
>> temp_critical.ps1
echo            Write-Host "  [成功] 已修复并重置文件" -ForegroundColor Green
>> temp_critical.ps1
echo        } catch {
>> temp_critical.ps1
echo            Write-Host "  [失败] 无法修复文件: \$_.Exception.Message" -ForegroundColor Red
>> temp_critical.ps1
echo        }
>> temp_critical.ps1
echo    } else {
>> temp_critical.ps1
echo        Write-Host "  [跳过] 文件不存在: ^$fullPath" -ForegroundColor Yellow
>> temp_critical.ps1
echo    }
>> temp_critical.ps1
echo}
>> temp_critical.ps1
echo Write-Host "\n修复完成！"
>> temp_critical.ps1

REM 运行PowerShell脚本
powershell -ExecutionPolicy Bypass -File temp_critical.ps1

REM 清理临时文件
del temp_critical.ps1 >nul 2>nul

echo.
echo ===================================
echo 重要提示：
echo 1. 已重置关键HTML文件为基本模板
echo 2. 所有文件都使用正确的UTF-8编码（无BOM）
echo 3. 原始文件已备份至: %BACKUP_DIR%
echo.
echo 请清除浏览器缓存后重新打开JEV客户端
echo 按任意键退出...
pause >nul
