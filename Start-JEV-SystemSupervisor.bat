@echo off
cls

echo ====================================================
echo 🧠 JEV L7 System Supervisor Startup Script
 echo ====================================================
echo.
echo Initializing JEV L7 System Environment...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js detected
echo.

REM Create necessary directories if they don't exist
if not exist "logs" mkdir logs
if not exist "config" mkdir config

echo 🧩 Starting JEV System Supervisor...
echo ====================================================

node jev_system_supervisor.js

if %errorlevel% eq 0 (
    echo.
    echo 🎉 JEV L7 System initialized successfully!
    echo 📊 Status report available at: logs/system_status.json
    echo 🛡️ Sentinel Layer is now active and monitoring.
    echo.
    echo Type 'exit' to close this window.
) else (
    echo.
    echo ❌ JEV L7 System initialization failed.
    echo Please check the error messages above.
    echo.
    pause
)

cmd /k