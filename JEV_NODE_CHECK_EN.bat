@echo off
cls
echo ================================
echo JEV-NODE-PATH-FIXER-v2.0
 echo ================================

rem Step 1: Check if Node.js exists
echo Step 1: Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Node.js not detected
    echo Checking default installation path...
    if exist "C:\Program Files\nodejs\node.exe" (
        echo FOUND: Node.js installed at default path
        echo Please manually add C:\Program Files\nodejs to PATH
        echo Restart command prompt after adding
    ) else (
        echo ERROR: Node.js not found
        echo Please download from https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i
    echo OK: Node.js path: %NODE_PATH%
)

echo.

rem Step 2: Check script path
echo Step 2: Checking script path...
if exist "%~dp0JEV_SAFE_RECOVERY.bat" (
    echo OK: Script file found
) else (
    echo ERROR: JEV_SAFE_RECOVERY.bat not found
    pause
    exit /b 1
)

echo.

rem Step 3: Display summary
echo Step 3: System check complete
 echo System Ready for Recovery
echo ================================
pause