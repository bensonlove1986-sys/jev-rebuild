@echo off

REM 重启JEV Client服务脚本
REM 由encoding fix工具自动生成

echo 正在停止可能的旧服务...
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq JEV-Client-Server" 2>nul

REM 等待服务停止
ping 127.0.0.1 -n 2 >nul

echo 重启JEV Client服务...
start "JEV-Client-Server" cmd /k "cd /d "D:\\PDF转网页\\JEV_Client" && node server.js"

echo 服务已启动，请等待3秒验证...
ping 127.0.0.1 -n 4 >nul

echo 验证登录页面...
curl -s -o NUL -w "%%{http_code}" http://localhost:8080/ui/login_portal.html

echo.
echo 服务重启完成！
pause