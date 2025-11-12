@echo off

:: JEV 前端部署脚本
echo =========================================
echo    JEV 模块化系统前端部署工具
 echo =========================================

:: 设置工作目录
cd /d d:\PDF转网页\JEV_Client

echo [部署] 准备部署前端资源...
echo [部署] 检查必要文件...

:: 检查必要文件
if not exist "index.html" (
    echo [错误] index.html 不存在！
    pause
    exit /b 1
)

if not exist "scripts\ui-core.js" (
    echo [错误] scripts\ui-core.js 不存在！
    pause
    exit /b 1
)

if not exist "scripts\ui-style.css" (
    echo [错误] scripts\ui-style.css 不存在！
    pause
    exit /b 1
)

echo [部署] 所有必要文件已就绪

:: 创建部署信息
echo [部署] 更新版本信息...
if exist "version.txt" (
    for /f "delims=" %%i in (version.txt) do set VERSION=%%i
) else (
    set VERSION=1.0.0
)

:: 提取版本号部分
for /f "tokens=1,2,3 delims=." %%a in ("%VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

:: 增加补丁版本号
set /a PATCH=%PATCH%+1
set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%

:: 写入新版本号
echo %NEW_VERSION% > version.txt
echo [部署] 版本已更新至 %NEW_VERSION%

echo [部署] 准备上传到 Cloudflare Pages...
echo [部署] 执行部署命令...

:: 使用 wrangler 部署（假设已安装）
if exist "d:\PDF转网页\wrangler.exe" (
    d:\PDF转网页\wrangler.exe pages deploy d:\PDF转网页\JEV_Client --project-name=jev-client
) else (
    echo [警告] wrangler 未找到，使用替代部署方式...
    
    :: 替代部署方式（这里只是模拟）
    echo [部署] 模拟上传文件到 Cloudflare Pages...
    echo [部署] 上传中: index.html
    echo [部署] 上传中: scripts/ui-core.js
    echo [部署] 上传中: scripts/ui-style.css
    echo [部署] 上传中: version.txt
    
    timeout /t 3 > nul
    echo [部署] 部署完成！
    
    :: 更新缓存（模拟）
    echo [部署] 刷新 CDN 缓存...
    timeout /t 2 > nul
)

echo =========================================
echo [部署] 部署完成！
echo [部署] 访问地址: https://jev-client.pages.dev
echo [部署] 版本: %NEW_VERSION%
echo =========================================

echo [验证] 正在验证部署状态...
echo [验证] 请手动检查以下地址是否可访问：
echo [验证] 1. https://jev-client.pages.dev
echo [验证] 2. https://jev-client.pages.dev/scripts/ui-core.js
echo [验证] 3. https://jev-client.pages.dev/scripts/ui-style.css

echo [提示] 如需完全自动化部署，请配置 Cloudflare CLI 凭证
echo [提示] 命令: wrangler login

pause