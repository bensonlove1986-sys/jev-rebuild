@echo off
cls
echo JEV Setup Helper

echo Creating directories...
mkdir D:\JEV\panel 2>nul
mkdir D:\JEV\agent 2>nul

echo Checking files...
echo ----------------
if exist "D:\JEV\panel\jev_panel.html" (echo jev_panel.html: OK) else (echo jev_panel.html: MISSING)
if exist "D:\JEV\panel\jev_sync.js" (echo jev_sync.js: OK) else (echo jev_sync.js: MISSING)
if exist "D:\JEV\panel\jev_panel.js" (echo jev_panel.js: OK) else (echo jev_panel.js: MISSING)

echo Creating HTTP server script...
echo @echo off > "D:\JEV\panel\start_http.bat"
echo python -m http.server 1820 --bind 127.0.0.1 >> "D:\JEV\panel\start_http.bat"

echo.
echo Setup complete!
echo Access URL: http://localhost:1820/jev_panel.html
echo.
echo For TRAE: Please check connection to port 1820
echo.