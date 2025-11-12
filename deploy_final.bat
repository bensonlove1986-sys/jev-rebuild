@echo off
cls
echo JEV Worker Deployment
echo ====================
echo.
echo Executing: wrangler publish
echo.

wrangler publish

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS!
    echo Test at: https://jevshop.bensonlove1986.workers.dev/kv/test
) else (
    echo.
    echo FAILED!
)

pause