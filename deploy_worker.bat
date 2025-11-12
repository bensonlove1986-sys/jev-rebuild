@echo off

echo Uploading JEV Worker...
echo Project: D:\PDF转网页\
echo File: worker.js
echo.

cd /d D:\PDF转网页
wrangler publish

echo.
echo Press any key to exit...
pause >nul