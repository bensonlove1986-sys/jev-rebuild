@echo off
setlocal enabledelayedexpansion

REM 创建备份目录
set "backup_dir=JEV_CLIENT_BACKUP"
mkdir "%backup_dir%" 2>nul

REM 定义关键HTML文件列表
set "html_files=panel.html login_portal.html visual_learning_panel.html index.html main.html dashboard.html"

REM 创建修复日志文件
echo 修复JEV_Client目录下HTML文件编码问题 > fix_jeclient_log.txt
echo 时间: %date% %time% >> fix_jeclient_log.txt
echo. >> fix_jeclient_log.txt

echo 开始修复JEV_Client目录下的HTML文件编码问题...
echo 备份将保存在 %backup_dir% 目录中

REM 循环处理每个HTML文件
for %%f in (%html_files%) do (
    REM 查找文件在JEV_Client目录及其子目录中
    for /r "D:\PDF转网页\JEV_Client" %%p in ("%%f") do (
        if exist "%%p" (
            echo 找到文件: %%p
            
            REM 创建备份
            set "rel_path=%%p"
            set "rel_path=!rel_path:D:\PDF转网页\JEV_Client=!"
            set "rel_path=!rel_path:~1!"
            
            REM 创建备份子目录结构
            if not "!rel_path!"=="%%f" (
                set "backup_subdir=%backup_dir%\!rel_path:%%f=!"
                mkdir "!backup_subdir!" 2>nul
                copy "%%p" "!backup_subdir!\%%f" >nul
            ) else (
                copy "%%p" "%backup_dir%\%%f" >nul
            )
            
            echo 已备份到: %backup_dir%\!rel_path!
            
            REM 使用PowerShell修复文件编码
            powershell -Command "
                $content = Get-Content '%%p' -Raw -Encoding Byte
                $utf8content = [System.Text.Encoding]::UTF8.GetString($content)
                
                REM 移除BOM标记
                if ($utf8content.StartsWith([char]0xFEFF)) {
                    $utf8content = $utf8content.Substring(1)
                }
                
                REM 确保有meta charset标签
                if (-not ($utf8content -match '<meta[^>]*charset=["\'']utf-8["\'']')) {
                    if ($utf8content -match '<head>') {
                        $utf8content = $utf8content -replace '<head>', '<head>\r\n    <meta charset="UTF-8">'
                    } else {
                        $utf8content = '<!DOCTYPE html>\r\n<html>\r\n<head>\r\n    <meta charset="UTF-8">\r\n</head>\r\n<body>\r\n    ' + $utf8content + '\r\n</body>\r\n</html>'
                    }
                }
                
                REM 保存为UTF-8无BOM格式
                [System.IO.File]::WriteAllText('%%p', $utf8content, [System.Text.UTF8Encoding]::new($false))
            "
            
            echo 已修复: %%p
            echo 已修复: %%p >> fix_jeclient_log.txt
        )
    )
)

echo.
echo 修复完成！
echo 请清除浏览器缓存后重新打开JEV客户端
echo 修复日志已保存到 fix_jeclient_log.txt
echo 如需恢复原始文件，请从 %backup_dir% 目录复制

echo. >> fix_jeclient_log.txt
echo 修复完成！请清除浏览器缓存后重新打开应用程序 >> fix_jeclient_log.txt

pause