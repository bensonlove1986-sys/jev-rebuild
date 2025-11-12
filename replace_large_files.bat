@echo off

REM 替换超大HTML文件为干净的小文件模板
REM 针对文件大小异常的HTML文件（通常正常HTML文件不应超过100KB）

set "TARGET_DIR=d:\PDF转网页\JEV_Client"
set "BACKUP_DIR=d:\PDF转网页\LARGE_FILES_BACKUP"
set "LOG_FILE=d:\PDF转网页\large_files_replace_log.txt"

REM 创建备份目录
mkdir "%BACKUP_DIR%" 2>nul

REM 清空日志文件
echo =================================== > "%LOG_FILE%"
echo 超大文件替换日志 >> "%LOG_FILE%"
echo 开始时间: %date% %time% >> "%LOG_FILE%"
echo =================================== >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo 开始扫描并替换超大HTML文件...
echo 查找超过100KB的异常大HTML文件...

REM 使用PowerShell查找并替换大文件
echo ^$targetDir = '%TARGET_DIR%'
echo ^$backupDir = '%BACKUP_DIR%'
echo ^$logFile = '%LOG_FILE%'
echo ^$largeFiles = Get-ChildItem -Path ^$targetDir -Filter *.html -Recurse -File | Where-Object { $_.Length -gt 100KB }
echo ^$totalFiles = ^$largeFiles.Count
echo ^$replacedCount = 0

>> temp_large.ps1
echo if (^$totalFiles -eq 0) {
>> temp_large.ps1
echo     Write-Host "没有发现超大HTML文件，无需替换。"
>> temp_large.ps1
echo     exit
>> temp_large.ps1
echo }

>> temp_large.ps1
echo Write-Host "找到 ^$totalFiles 个超大HTML文件需要替换..."
echo "找到 ^$totalFiles 个超大HTML文件需要替换..." >> ^$logFile

>> temp_large.ps1
echo foreach (^$file in ^$largeFiles) {
>> temp_large.ps1
echo     ^$fileSizeMB = [math]::Round((^$file.Length / 1MB), 2)
>> temp_large.ps1
echo     Write-Host "处理: ^$file.FullName (^$fileSizeMB MB)"
>> temp_large.ps1
echo     "处理: ^$file.FullName (^$fileSizeMB MB)" >> ^$logFile
>> temp_large.ps1
echo     
>> temp_large.ps1
echo     try {
>> temp_large.ps1
echo         # 创建相对路径的备份目录
>> temp_large.ps1
echo         ^$relativePath = Resolve-Path -Path ^$file.Directory.FullName -Relative | ForEach-Object { $_ -replace '\\.\\\\', '' }
>> temp_large.ps1
echo         ^$fileBackupDir = Join-Path -Path ^$backupDir -ChildPath ^$relativePath
>> temp_large.ps1
echo         mkdir -Force ^$fileBackupDir | Out-Null
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         # 备份原始文件
>> temp_large.ps1
echo         ^$backupPath = Join-Path -Path ^$fileBackupDir -ChildPath (^$file.Name + '.bak')
>> temp_large.ps1
echo         Copy-Item -Path ^$file.FullName -Destination ^$backupPath -Force
>> temp_large.ps1
echo         "  已备份至: ^$backupPath" >> ^$logFile
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         # 创建干净的HTML模板
>> temp_large.ps1
echo         ^$fileName = [System.IO.Path]::GetFileNameWithoutExtension(^$file.Name)
>> temp_large.ps1
echo         ^$templateContent = @"
>> temp_large.ps1
echo <!DOCTYPE html>
>> temp_large.ps1
echo <html lang="zh-CN">
>> temp_large.ps1
echo <head>
>> temp_large.ps1
echo     <meta charset="UTF-8">
>> temp_large.ps1
echo     <meta name="viewport" content="width=device-width, initial-scale=1.0">
>> temp_large.ps1
echo     <title>JEV - ^$fileName</title>
>> temp_large.ps1
echo     <style>
>> temp_large.ps1
echo         body {
>> temp_large.ps1
echo             font-family: 'Microsoft YaHei', Arial, sans-serif;
>> temp_large.ps1
echo             line-height: 1.6;
>> temp_large.ps1
echo             margin: 0;
>> temp_large.ps1
echo             padding: 20px;
>> temp_large.ps1
echo             background-color: #f5f5f5;
>> temp_large.ps1
echo             color: #333;
>> temp_large.ps1
echo         }
>> temp_large.ps1
echo         .container {
>> temp_large.ps1
echo             max-width: 800px;
>> temp_large.ps1
echo             margin: 0 auto;
>> temp_large.ps1
echo             padding: 30px;
>> temp_large.ps1
echo             background-color: white;
>> temp_large.ps1
echo             border-radius: 8px;
>> temp_large.ps1
echo             box-shadow: 0 2px 10px rgba(0,0,0,0.1);
>> temp_large.ps1
echo         }
>> temp_large.ps1
echo         h1 {
>> temp_large.ps1
echo             color: #2c3e50;
>> temp_large.ps1
echo             border-bottom: 2px solid #3498db;
>> temp_large.ps1
echo             padding-bottom: 10px;
>> temp_large.ps1
echo         }
>> temp_large.ps1
echo         .status-box {
>> temp_large.ps1
echo             padding: 15px;
>> temp_large.ps1
echo             margin: 20px 0;
>> temp_large.ps1
echo             border-radius: 5px;
>> temp_large.ps1
echo             background-color: #e8f5e9;
>> temp_large.ps1
echo             border-left: 4px solid #2ecc71;
>> temp_large.ps1
echo         }
>> temp_large.ps1
echo         .info-box {
>> temp_large.ps1
echo             padding: 15px;
>> temp_large.ps1
echo             margin: 15px 0;
>> temp_large.ps1
echo             background-color: #f8f9fa;
>> temp_large.ps1
echo             border-radius: 5px;
>> temp_large.ps1
echo             border: 1px solid #dee2e6;
>> temp_large.ps1
echo         }
>> temp_large.ps1
echo         code {
>> temp_large.ps1
echo             background-color: #f1f1f1;
>> temp_large.ps1
echo             padding: 2px 5px;
>> temp_large.ps1
echo             border-radius: 3px;
>> temp_large.ps1
echo             font-family: monospace;
>> temp_large.ps1
echo         }
>> temp_large.ps1
echo     </style>
>> temp_large.ps1
echo </head>
>> temp_large.ps1
echo <body>
>> temp_large.ps1
echo     <div class="container">
>> temp_large.ps1
echo         <h1>JEV 页面 - ^$fileName</h1>
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         <div class="status-box">
>> temp_large.ps1
echo             <strong>已修复超大文件</strong>
>> temp_large.ps1
echo             <p>此页面已被替换为干净的模板，原文件因体积异常（超过100KB）被判定为可能损坏。</p>
>> temp_large.ps1
echo         </div>
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         <div class="info-box">
>> temp_large.ps1
echo             <h3>文件信息</h3>
>> temp_large.ps1
echo             <ul>
>> temp_large.ps1
echo                 <li>原始文件路径: <code>^$file.FullName</code></li>
>> temp_large.ps1
echo                 <li>原始文件大小: <code>^$fileSizeMB MB</code></li>
>> temp_large.ps1
echo                 <li>备份位置: <code>^$backupPath</code></li>
>> temp_large.ps1
echo                 <li>修复时间: <code>$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</code></li>
>> temp_large.ps1
echo             </ul>
>> temp_large.ps1
echo         </div>
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         <div class="info-box">
>> temp_large.ps1
echo             <h3>后续操作</h3>
>> temp_large.ps1
echo             <p>请清除浏览器缓存后重新打开JEV客户端。</p>
>> temp_large.ps1
echo             <p>如果需要恢复原始功能，可能需要重新安装JEV客户端。</p>
>> temp_large.ps1
echo         </div>
>> temp_large.ps1
echo     </div>
>> temp_large.ps1
echo </body>
>> temp_large.ps1
echo </html>
>> temp_large.ps1
echo "@
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         # 保存为UTF-8无BOM
>> temp_large.ps1
echo         [System.IO.File]::WriteAllText(^$file.FullName, ^$templateContent, [System.Text.UTF8Encoding]::new($false))
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         ^$newSizeKB = [math]::Round((^$file.Length / 1KB), 2)
>> temp_large.ps1
echo         Write-Host "  [成功] 已替换为新文件 (新大小: ^$newSizeKB KB)" -ForegroundColor Green
>> temp_large.ps1
echo         "  [成功] 已替换为新文件 (新大小: ^$newSizeKB KB)" >> ^$logFile
>> temp_large.ps1
echo         
>> temp_large.ps1
echo         ^$replacedCount++
>> temp_large.ps1
echo         
>> temp_large.ps1
echo     } catch {
>> temp_large.ps1
echo         Write-Host "  [失败] 无法替换文件: \$_.Exception.Message" -ForegroundColor Red
>> temp_large.ps1
echo         "  [失败] 无法替换文件: \$_.Exception.Message" >> ^$logFile
>> temp_large.ps1
echo     }
>> temp_large.ps1
echo }
>> temp_large.ps1
echo 
>> temp_large.ps1
echo # 输出总结
>> temp_large.ps1
echo """ >> ^$logFile
>> temp_large.ps1
echo "===================================" >> ^$logFile
>> temp_large.ps1
echo "替换完成" >> ^$logFile
>> temp_large.ps1
echo "超大文件总数: ^$totalFiles" >> ^$logFile
>> temp_large.ps1
echo "成功替换: ^$replacedCount" >> ^$logFile
>> temp_large.ps1
echo "完成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" >> ^$logFile
>> temp_large.ps1
echo "===================================" >> ^$logFile
>> temp_large.ps1
echo Write-Host """ -ForegroundColor White
>> temp_large.ps1
echo Write-Host "===================================" -ForegroundColor White
>> temp_large.ps1
echo Write-Host "替换完成" -ForegroundColor White
>> temp_large.ps1
echo Write-Host "超大文件总数: ^$totalFiles" -ForegroundColor White
>> temp_large.ps1
echo Write-Host "成功替换: ^$replacedCount" -ForegroundColor Green
>> temp_large.ps1
echo Write-Host "备份目录: ^$backupDir" -ForegroundColor White
>> temp_large.ps1
echo Write-Host "日志文件: ^$logFile" -ForegroundColor White
>> temp_large.ps1
echo Write-Host "===================================" -ForegroundColor White

REM 运行PowerShell脚本
powershell -ExecutionPolicy Bypass -File temp_large.ps1

REM 清理临时文件
del temp_large.ps1 >nul 2>nul

echo.
echo 重要提示：
echo 1. 超大文件已被替换为干净的HTML模板
echo 2. 所有文件都使用正确的UTF-8编码（无BOM）
echo 3. 原始超大文件已备份至：%BACKUP_DIR%
echo.
echo 请务必清除浏览器缓存后重新打开JEV客户端
echo 清除方法：关闭浏览器后重新打开，按 Ctrl+Shift+Delete 选择清除缓存
echo.
echo 按任意键退出...
pause >nul
