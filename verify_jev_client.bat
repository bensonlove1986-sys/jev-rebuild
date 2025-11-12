@echo off

echo JEV Client Verification
========================

REM Check files
echo Checking index.html...
if exist "d:\PDF转网页\JEV_Client\index.html" (
    echo OK - index.html exists
) else (
    echo ERROR - index.html not found
)

echo Checking ui-core.js...
if exist "d:\PDF转网页\JEV_Client\scripts\ui-core.js" (
    echo OK - ui-core.js exists
) else (
    echo ERROR - ui-core.js not found
)

echo Checking ui-style.css...
if exist "d:\PDF转网页\JEV_Client\scripts\ui-style.css" (
    echo OK - ui-style.css exists
) else (
    echo ERROR - ui-style.css not found
)

echo.  
echo Deployment Instructions:
=======================
echo 1. Upload all files in d:\PDF转网页\JEV_Client to Cloudflare Pages

echo 2. Set "jev-client" as project name

echo 3. Set "index.html" as build output

echo 4. After deployment, verify these URLs:

echo    - https://jev-client.pages.dev

echo    - https://jev-client.pages.dev/scripts/ui-core.js

echo    - https://jev-client.pages.dev/scripts/ui-style.css

echo.
echo Frontend files are ready for deployment!

pause