@echo off
cls
echo JEV CLIENT CHECK
echo ================

rem Create logs directory
mkdir "D:\PDF转网页\logs" 2>nul

rem Set log file
set LOG_FILE=D:\PDF转网页\logs\jev_client_recovery.log

rem Log header
echo %date% %time% > %LOG_FILE%
echo JEV CLIENT CHECK STARTED >> %LOG_FILE%

rem 1. Check if Start-JEV-Client.bat exists
echo 1. Checking Start-JEV-Client.bat...
echo 1. Checking Start-JEV-Client.bat... >> %LOG_FILE%
if exist "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat" (
    echo OK: Start-JEV-Client.bat exists
    echo OK: Start-JEV-Client.bat exists >> %LOG_FILE%
) else (
    echo ERROR: Start-JEV-Client.bat not found
    echo ERROR: Start-JEV-Client.bat not found >> %LOG_FILE%
)

rem 2. Check port 8080
echo. 
echo 2. Checking port 8080...
echo 2. Checking port 8080... >> %LOG_FILE%
netstat -ano | findstr "8080" > nul
if %errorlevel% equ 0 (
    echo OK: Port 8080 is listening
    echo OK: Port 8080 is listening >> %LOG_FILE%
) else (
    echo ERROR: Port 8080 not listening
    echo ERROR: Port 8080 not listening >> %LOG_FILE%
)

rem 3. Restart service if not running
netstat -ano | findstr "8080" > nul
if %errorlevel% neq 0 (
    echo. 
echo 3. Attempting to restart service...
echo 3. Attempting to restart service... >> %LOG_FILE%
    cd /d "D:\PDF转网页\JEV_Client"
    start "JEV Client" cmd /c "node server.js"
    timeout /t 3 /nobreak > nul
    
    netstat -ano | findstr "8080" > nul
    if %errorlevel% equ 0 (
        echo OK: Service restarted
        echo OK: Service restarted >> %LOG_FILE%
    ) else (
        echo ERROR: Service restart failed
        echo ERROR: Service restart failed >> %LOG_FILE%
    )
) else (
    echo. 
echo 3. Service already running
    echo 3. Service already running >> %LOG_FILE%
)

rem 4. Final status report
echo. 
echo 4. Status report saved to:
    echo %LOG_FILE%
echo CHECK COMPLETED
pause