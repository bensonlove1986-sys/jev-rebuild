@echo off

REM JEV Client v7.0 - Startup Script
echo JEV Client v7.0 STARTUP SCRIPT
echo =======================================
echo Preparing environment...

REM Change to script directory
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python first.
    echo Recommend Python 3.7+
    pause
    exit /b 1
)

REM Create necessary directories
if not exist "ui" mkdir "ui"
if not exist "modules" mkdir "modules"
if not exist "config" mkdir "config"

REM Generate module manifest if not exists
if not exist "jev_module_manifest.json" (
    echo Generating module manifest...
    echo {
    echo   "version": "1.0.0",
    echo   "modules": [
    echo     {"id": "core", "path": "modules/core.js"},
    echo     {"id": "auth", "path": "modules/auth.js"},
    echo     {"id": "ui", "path": "modules/ui.js"},
    echo     {"id": "data", "path": "modules/data.js"},
    echo     {"id": "api", "path": "modules/api.js"},
    echo     {"id": "security", "path": "modules/security.js"},
    echo     {"id": "invite", "path": "modules/inviteCodeManager.js"},
    echo     {"id": "monitor", "path": "modules/monitor.js"}
    echo   ]
    echo } > jev_module_manifest.json
    echo Module manifest generated.
)

REM Generate config file if not exists
if not exist "config\settings.json" (
    echo Generating config file...
    echo {
    echo   "owner_id": "benson-jev-001",
    echo   "environment": "local",
    echo   "auto_start_modules": true,
    echo   "enable_security_guard": true,
    echo   "require_invite": true
    echo } > config\settings.json
    echo Config file generated.
)

echo =======================================
echo Starting JEV Client...

REM Open browser
start http://localhost:8080/ui/login_portal.html

REM Start HTTP server
echo Starting local server (http://localhost:8080)
echo Login URL: http://localhost:8080/ui/login_portal.html
echo Do not close this window.

python -m http.server 8080

REM Catch errors
if %errorlevel% neq 0 (
    echo Server startup failed
    pause
    exit /b 1
)

pause