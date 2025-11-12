@echo off
cls
echo JEV Worker Deployment
echo ====================
echo.
echo Running: wrangler publish
echo.

REM 直接运行部署命令
wrangler publish

if %errorlevel% equ 0 (
    echo.
    echo DEPLOYMENT SUCCESS!
    echo Test URL: https://jevshop.bensonlove1986.workers.dev/kv/test
) else (
    echo.
    echo DEPLOYMENT FAILED!
)

echo.
echo Press any key to exit...
pause