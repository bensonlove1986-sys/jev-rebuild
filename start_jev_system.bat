@echo off
cls
echo ===================================================
echo            JEV系统一键启动脚本
            
echo 当前时间: %date% %time%
echo ===================================================
echo.
echo [1/3] 启动中继服务器 (Cloud Relay)...
start "JEV Cloud Relay" cmd /k "cd /d d:\PDF转网页\Cloud_Relay && node cloud_relay.js"
echo 中继服务器已启动，请等待初始化完成...
echo.
ping -n 5 127.0.0.1 > nul

echo [2/3] 启动中控端 (Control Center)...
start "JEV Control Center" cmd /k "cd /d d:\PDF转网页\JEV_ControlCenter && node server.js"
echo 中控端已启动，请等待初始化完成...
echo.
ping -n 5 127.0.0.1 > nul

echo [3/3] 启动客户端 (Client)...
start "JEV Client" cmd /k "cd /d d:\PDF转网页\JEV_Client && node start_client.js"
echo 客户端已启动，请等待初始化完成...
echo.
echo ===================================================
echo JEV系统组件启动中，请稍候验证连接状态...
echo 各组件运行在以下地址：
echo - 中继服务器: http://localhost:3000
 echo - 中控端: http://localhost:4000
 echo - 客户端: http://localhost:5000
echo ===================================================
echo 按任意键退出...
pause > nul