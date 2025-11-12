@echo off
cls
echo =====================================
echo JEV CLIENT RECOVERY CHECK
echo =====================================

rem Create log directory
if not exist "D:\PDF转网页\logs" mkdir "D:\PDF转网页\logs"
set LOG_FILE="D:\PDF转网页\logs\jev_client_recovery.log"

rem Write log header
echo ========== %date% %time% ========== > %LOG_FILE%
echo JEV CLIENT RECOVERY CHECK STARTED... >> %LOG_FILE%

rem 1️⃣ Check if Start-JEV-Client.bat exists
echo [1] Checking Start-JEV-Client.bat...
echo [1] Checking Start-JEV-Client.bat... >> %LOG_FILE%
if exist "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat" (
    echo OK: Start-JEV-Client.bat exists
    echo OK: Start-JEV-Client.bat exists >> %LOG_FILE%
) else (
    echo ERROR: Start-JEV-Client.bat not found
    echo ERROR: Start-JEV-Client.bat not found >> %LOG_FILE%
    echo Creating default startup script...
    echo Creating default startup script... >> %LOG_FILE%
    (echo @echo off
     echo cd /d "D:\PDF转网页\JEV_Client"
     echo node server.js) > "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat"
    echo OK: Created default startup script
    echo OK: Created default startup script >> %LOG_FILE%
)

rem 2️⃣ Check port 8080
echo. 
echo [2] Checking port 8080...
echo [2] Checking port 8080... >> %LOG_FILE%
netstat -ano | findstr "8080" > nul
if %errorlevel% equ 0 (
    echo OK: Port 8080 is listening
    echo OK: Port 8080 is listening >> %LOG_FILE%
    set RESTART_SERVICE=
) else (
    echo ERROR: Port 8080 is not listening
    echo ERROR: Port 8080 is not listening >> %LOG_FILE%
    set RESTART_SERVICE=true
)

rem 3️⃣ Restart service if not running
if defined RESTART_SERVICE (
    echo. 
    echo [3] Restarting JEV Client service...
    echo [3] Restarting JEV Client service... >> %LOG_FILE%
    cd /d "D:\PDF转网页\JEV_Client"
    start "JEV Client" cmd /c "node server.js"
    timeout /t 3 /nobreak > nul
    
    netstat -ano | findstr "8080" > nul
    if %errorlevel% equ 0 (
        echo OK: JEV Client service restarted successfully
        echo OK: JEV Client service restarted successfully >> %LOG_FILE%
    ) else (
        echo ERROR: Failed to restart JEV Client service
        echo ERROR: Failed to restart JEV Client service >> %LOG_FILE%
    )
) else (
    echo. 
    echo [3] JEV Client service does not need restart
    echo [3] JEV Client service does not need restart >> %LOG_FILE%
)

rem 4️⃣ Generate status report
echo. 
echo =====================================
echo JEV CLIENT RECOVERY CHECK COMPLETED

echo [4] Generating status report...
echo [4] Generating status report... >> %LOG_FILE%
echo Check time: %date% %time% >> %LOG_FILE%
netstat -ano | findstr "8080" > nul
if %errorlevel% equ 0 (
    echo OK: Service status: Running
    echo OK: Service status: Running >> %LOG_FILE%
    echo Access URL: http://localhost:8080
    echo Access URL: http://localhost:8080 >> %LOG_FILE%
) else (
    echo ERROR: Service status: Not running
    echo ERROR: Service status: Not running >> %LOG_FILE%
)
echo Log file: %LOG_FILE%
echo ========== CHECK COMPLETED ========== >> %LOG_FILE%

echo =====================================
pause