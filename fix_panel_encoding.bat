@echo off
cls
echo JEV 快速编码修复工具
set LOG_FILE=encoding_fix_log.txt

echo 开始修复编码问题... > %LOG_FILE%
echo %date% %time% >> %LOG_FILE%

:: 定义要修复的文件
set PANEL_JS=d:\PDF转网页\JEV_Client\ui\panel.js
set PANEL_HTML=d:\PDF转网页\JEV_Client\ui\panel.html
set BACKUP_JS=d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.js
set BACKUP_HTML=d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.html

:: 从备份恢复panel.js
if exist "%BACKUP_JS%" (
    echo 正在从备份恢复 panel.js...
    copy "%BACKUP_JS%" "%PANEL_JS%" /Y
    echo 已恢复 panel.js >> %LOG_FILE%
) else (
    echo 备份文件不存在: %BACKUP_JS% >> %LOG_FILE%
)

:: 从备份恢复panel.html
if exist "%BACKUP_HTML%" (
    echo 正在从备份恢复 panel.html...
    copy "%BACKUP_HTML%" "%PANEL_HTML%" /Y
    echo 已恢复 panel.html >> %LOG_FILE%
) else (
    echo 备份文件不存在: %BACKUP_HTML% >> %LOG_FILE%
)

:: 使用PowerShell修复编码
powershell -Command "
    # 修复panel.js
    if (Test-Path '%PANEL_JS%') {
        $content = Get-Content -Path '%PANEL_JS%' -Raw
        # 移除BOM
        if ($content[0] -eq [char]0xFEFF) {
            $content = $content.Substring(1)
        }
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText('%PANEL_JS%', $content, [System.Text.UTF8Encoding]::new($false))
        '已修复 panel.js 编码' | Out-Host
    }
    
    # 修复panel.html
    if (Test-Path '%PANEL_HTML%') {
        $content = Get-Content -Path '%PANEL_HTML%' -Raw
        # 移除BOM
        if ($content[0] -eq [char]0xFEFF) {
            $content = $content.Substring(1)
        }
        # 确保有meta charset标签
        if (-not ($content -match '<meta\s+charset=["\']UTF-8["\']\s*>')) {
            if ($content -match '<head[^>]*>') {
                $content = $content -replace '<head[^>]*>', '$&\n    <meta charset="UTF-8">'
            }
        }
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText('%PANEL_HTML%', $content, [System.Text.UTF8Encoding]::new($false))
        '已修复 panel.html 编码' | Out-Host
    }
"

echo 修复完成！
echo 请清除浏览器缓存后重新打开应用程序
echo 修复日志已保存到 %LOG_FILE%
pause