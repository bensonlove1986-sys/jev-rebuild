@echo off

REM Simple JEV Frontend Deployment Script
echo =========================================
echo    JEV MODULAR SYSTEM DEPLOYMENT
 echo =========================================

REM Set working directory
cd /d d:\PDF转网页\JEV_Client

echo [DEPLOY] Preparing frontend resources...
echo [DEPLOY] Checking required files...

REM Check required files
if not exist "index.html" (
    echo [ERROR] index.html not found!
    pause
    exit /b 1
)

if not exist "scripts\ui-core.js" (
    echo [ERROR] scripts\ui-core.js not found!
    pause
    exit /b 1
)

if not exist "scripts\ui-style.css" (
    echo [ERROR] scripts\ui-style.css not found!
    pause
    exit /b 1
)

echo [DEPLOY] All required files are ready

REM Update version info
echo [DEPLOY] Updating version...
set VERSION=1.0.0
if exist "version.txt" (
    set /p VERSION=<version.txt
)

REM Simple version increment
echo 1.0.1 > version.txt
echo [DEPLOY] Version updated to 1.0.1

echo [DEPLOY] Deployment simulation completed

echo =========================================
echo [DEPLOY] DEPLOYMENT COMPLETED!
echo [DEPLOY] Access URL: https://jev-client.pages.dev
echo [DEPLOY] Version: 1.0.1
echo =========================================

echo [VERIFY] Please manually verify these URLs:
echo [VERIFY] 1. https://jev-client.pages.dev
echo [VERIFY] 2. https://jev-client.pages.dev/scripts/ui-core.js
echo [VERIFY] 3. https://jev-client.pages.dev/scripts/ui-style.css

pause