@echo off

REM 替换JEV客户端面板文件的批处理脚本
REM 创建于: %date% %time%

set "SOURCE_DIR=d:\PDF转网页"
set "TARGET_DIR=d:\PDF转网页\JEV_Client\ui"

REM 确保目标目录存在
if not exist "%TARGET_DIR%" (
    echo 目标目录不存在: %TARGET_DIR%
    echo 创建目标目录...
    mkdir "%TARGET_DIR%"
    if errorlevel 1 (
        echo 创建目录失败，请手动创建并复制文件
        pause
        exit /b 1
    )
)

REM 创建备份
set "BACKUP_DIR=%TARGET_DIR%\backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
mkdir "%BACKUP_DIR%"

REM 复制原始文件到备份目录（如果存在）
if exist "%TARGET_DIR%\panel.js" (
    echo 备份原始panel.js文件...
    copy "%TARGET_DIR%\panel.js" "%BACKUP_DIR%\panel.js" > nul
)

if exist "%TARGET_DIR%\panel.html" (
    echo 备份原始panel.html文件...
    copy "%TARGET_DIR%\panel.html" "%BACKUP_DIR%\panel.html" > nul
)

REM 复制新文件到目标目录
echo 复制新的panel.js文件...
copy "%SOURCE_DIR%\new_panel.js" "%TARGET_DIR%\panel.js" > nul

if errorlevel 1 (
    echo 复制panel.js失败
    pause
    exit /b 1
)

echo 复制新的panel.html文件...
copy "%SOURCE_DIR%\new_panel.html" "%TARGET_DIR%\panel.html" > nul

if errorlevel 1 (
    echo 复制panel.html失败
    pause
    exit /b 1
)

echo 文件替换完成！
echo 原始文件已备份至: %BACKUP_DIR%
echo. 
echo 请清除浏览器缓存后再重新打开JEV客户端
echo 按任意键退出...
pause > nul
