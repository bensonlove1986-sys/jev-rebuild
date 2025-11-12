@echo off

:: 设置编码为UTF-8
chcp 65001 > nul

:: 清屏
cls

:: 显示启动信息
echo.
echo  JEV L7.6 Client 在线启动器
echo ==================================
echo.

:: 启动Python脚本
python start_jev_online.py

:: 启动完成后打开仪表板
echo.
echo 启动完成，正在打开仪表板...
start http://localhost:8080/ui/online_launcher_dashboard.html

echo.
echo 按任意键退出...
pause > nul