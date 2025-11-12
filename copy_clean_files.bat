@echo off

REM 简单复制干净文件到JEV客户端UI目录
REM 创建于: %date% %time%

set "SOURCE_DIR=d:\PDF转网页"
set "TARGET_DIR=d:\PDF转网页\JEV_Client\ui"

REM 确保目标目录存在
if not exist "%TARGET_DIR%" (
    echo 目标目录不存在: %TARGET_DIR%
    echo 创建目标目录...
    mkdir "%TARGET_DIR%"
)

REM 创建备份目录
set "BACKUP_DIR=%TARGET_DIR%\clean_backup"
mkdir "%BACKUP_DIR%"

REM 复制原始文件到备份（如果存在）
if exist "%TARGET_DIR%\login_portal.html" (
    echo 备份 login_portal.html
    copy "%TARGET_DIR%\login_portal.html" "%BACKUP_DIR%\login_portal.html.bak" > nul
)

if exist "%TARGET_DIR%\visual_learning_panel.html" (
    echo 备份 visual_learning_panel.html
    copy "%TARGET_DIR%\visual_learning_panel.html" "%BACKUP_DIR%\visual_learning_panel.html.bak" > nul
)

REM 复制干净的文件
if exist "%SOURCE_DIR%\clean_login_portal.html" (
    echo 复制干净的 login_portal.html
    copy "%SOURCE_DIR%\clean_login_portal.html" "%TARGET_DIR%\login_portal.html" > nul
    echo login_portal.html 已更新
)

if exist "%SOURCE_DIR%\clean_visual_learning_panel.html" (
    echo 复制干净的 visual_learning_panel.html
    copy "%SOURCE_DIR%\clean_visual_learning_panel.html" "%TARGET_DIR%\visual_learning_panel.html" > nul
    echo visual_learning_panel.html 已更新
)

echo 复制完成！
echo 原始文件已备份至: %BACKUP_DIR%
echo.
echo 请清除浏览器缓存后再重新打开JEV客户端
echo 按任意键退出...
pause > nul
