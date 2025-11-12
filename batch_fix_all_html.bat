@echo off

REM 批量修复JEV_Client目录下所有HTML文件的编码
REM 创建于: %date% %time%

set "TARGET_DIR=D:\PDF转网页\JEV_Client"
set "BACKUP_ROOT=D:\PDF转网页\HTML_BACKUP"
set "LOG_FILE=D:\PDF转网页\encoding_fix_log.txt"

REM 创建备份根目录
mkdir "%BACKUP_ROOT%" 2>nul

REM 清空日志文件
echo =================================== > "%LOG_FILE%"
echo HTML文件编码修复日志 >> "%LOG_FILE%"
echo 开始时间: %date% %time% >> "%LOG_FILE%"
echo =================================== >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM 使用PowerShell进行递归处理
echo 开始递归修复所有HTML文件...
echo 正在准备修复脚本...

REM 创建临时PowerShell脚本
echo ^$targetDir = '%TARGET_DIR%'
echo ^$backupRoot = '%BACKUP_ROOT%'
echo ^$logFile = '%LOG_FILE%'
echo ^$htmlFiles = Get-ChildItem -Path ^$targetDir -Filter *.html -Recurse -File
echo ^$totalFiles = ^$htmlFiles.Count
echo ^$fixedCount = 0
echo ^$failedCount = 0
echo. >> "%LOG_FILE%"
echo 找到 ^$totalFiles 个HTML文件需要处理... >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"
echo foreach (^$file in ^$htmlFiles) { >> "temp_fix.ps1"
echo    try { >> "temp_fix.ps1"
echo        # 创建相对路径的备份目录 >> "temp_fix.ps1"
echo        ^$relativePath = Resolve-Path -Path ^$file.Directory.FullName -Relative | ForEach-Object { $_ -replace '\.\\', '' } >> "temp_fix.ps1"
echo        ^$backupDir = Join-Path -Path ^$backupRoot -ChildPath ^$relativePath >> "temp_fix.ps1"
echo        mkdir -Force ^$backupDir | Out-Null >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo        # 备份原始文件 >> "temp_fix.ps1"
echo        ^$backupPath = Join-Path -Path ^$backupDir -ChildPath (^$file.Name + '.bak') >> "temp_fix.ps1"
echo        Copy-Item -Path ^$file.FullName -Destination ^$backupPath -Force >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo        # 简单读取文件内容（忽略编码错误） >> "temp_fix.ps1"
echo        ^$content = Get-Content -Path ^$file.FullName -Raw -Encoding Byte | ForEach-Object { [System.Text.Encoding]::UTF8.GetString($_) } >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo        # 移除BOM >> "temp_fix.ps1"
echo        if (^$content.StartsWith([char]0xFEFF)) { >> "temp_fix.ps1"
echo            ^$content = ^$content.Substring(1) >> "temp_fix.ps1"
echo        } >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo        # 检查并添加meta charset标签 >> "temp_fix.ps1"
echo        if (-not (^$content -match '\<meta[^\>]*charset[^\>]*\>')) { >> "temp_fix.ps1"
echo            # 如果有head标签，在其中添加 >> "temp_fix.ps1"
echo            if (^$content -match '\<head\>') { >> "temp_fix.ps1"
echo                ^$content = ^$content -replace '\<head\>', '\<head\>\n    \<meta charset=\"UTF-8\"\>' >> "temp_fix.ps1"
echo            } else { >> "temp_fix.ps1"
echo                # 如果没有head标签，在html标签后添加 >> "temp_fix.ps1"
echo                if (^$content -match '\<html[^\>]*\>') { >> "temp_fix.ps1"
echo                    ^$content = ^$content -replace '\<html[^\>]*\>', '\$&\n\<head\>\n    \<meta charset=\"UTF-8\"\>\n\</head\>' >> "temp_fix.ps1"
echo                } else { >> "temp_fix.ps1"
echo                    # 如果连html标签都没有，在开头添加 >> "temp_fix.ps1"
echo                    ^$content = '\<meta charset=\"UTF-8\"\>' + ^$content >> "temp_fix.ps1"
echo                } >> "temp_fix.ps1"
echo            } >> "temp_fix.ps1"
echo        } else { >> "temp_fix.ps1"
echo            # 更新现有的charset标签 >> "temp_fix.ps1"
echo            ^$content = ^$content -replace '(\<meta[^\>]*charset=)[\"\']?[^\"\'>\\s]*', '\$1UTF-8' >> "temp_fix.ps1"
echo        } >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo        # 保存为UTF-8无BOM >> "temp_fix.ps1"
echo        [System.IO.File]::WriteAllText(^$file.FullName, ^$content, [System.Text.UTF8Encoding]::new($false)) >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo        ^$fixedCount++ >> "temp_fix.ps1"
echo        \"修复成功: ^$file.FullName\" >> ^$logFile >> "temp_fix.ps1"
echo        Write-Host \"[成功] ^$file.FullName\" -ForegroundColor Green >> "temp_fix.ps1"
echo    } catch { >> "temp_fix.ps1"
echo        ^$failedCount++ >> "temp_fix.ps1"
echo        \"修复失败: ^$file.FullName - \$_.Exception.Message\" >> ^$logFile >> "temp_fix.ps1"
echo        Write-Host \"[失败] ^$file.FullName\" -ForegroundColor Red >> "temp_fix.ps1"
echo    } >> "temp_fix.ps1"
echo} >> "temp_fix.ps1"
echo. >> "temp_fix.ps1"
echo # 输出总结 >> "temp_fix.ps1"
echo \"\"\" >> ^$logFile >> "temp_fix.ps1"
echo \"===================================\" >> ^$logFile >> "temp_fix.ps1"
echo \"修复完成\" >> ^$logFile >> "temp_fix.ps1"
echo \"总文件数: ^$totalFiles\" >> ^$logFile >> "temp_fix.ps1"
echo \"成功修复: ^$fixedCount\" >> ^$logFile >> "temp_fix.ps1"
echo \"修复失败: ^$failedCount\" >> ^$logFile >> "temp_fix.ps1"
echo \"完成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')\" >> ^$logFile >> "temp_fix.ps1"
echo \"===================================\" >> ^$logFile >> "temp_fix.ps1"
echo Write-Host \"\"\" >> "temp_fix.ps1"
echo Write-Host \"===================================\" >> "temp_fix.ps1"
echo Write-Host \"修复完成\" >> "temp_fix.ps1"
echo Write-Host \"总文件数: ^$totalFiles\" >> "temp_fix.ps1"
echo Write-Host \"成功修复: ^$fixedCount\" -ForegroundColor Green >> "temp_fix.ps1"
echo Write-Host \"修复失败: ^$failedCount\" -ForegroundColor Red >> "temp_fix.ps1"
echo Write-Host \"日志文件: ^$logFile\" >> "temp_fix.ps1"
echo Write-Host \"===================================\" >> "temp_fix.ps1"

REM 运行PowerShell脚本
echo 执行修复脚本...
powershell -ExecutionPolicy Bypass -File temp_fix.ps1

REM 清理临时文件
del temp_fix.ps1 >nul 2>nul

echo.
echo 修复完成！详细日志请查看: %LOG_FILE%
echo.
echo 重要提示：请清除浏览器缓存后重新打开JEV客户端
echo 1. 关闭所有浏览器窗口
echo 2. 重新打开浏览器时按 Ctrl+Shift+Delete 清除缓存
echo 3. 重新运行 jev_start.bat
echo.
echo 按任意键退出...
pause >nul
