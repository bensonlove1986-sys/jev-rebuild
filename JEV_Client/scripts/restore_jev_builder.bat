@echo off

echo Killing processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM builder.exe >nul 2>&1
taskkill /F /IM trae.exe >nul 2>&1

echo Cleaning directories...
rmdir /S /Q "D:\PDF转网页\JEV_Client\.builder_cache" >nul 2>&1
rmdir /S /Q "D:\PDF转网页\JEV_Client\.tmp" >nul 2>&1
rmdir /S /Q "D:\PDF转网页\JEV_Client\node_modules" >nul 2>&1
rmdir /S /Q "D:\PDF转网页\JEV_Client\logs" >nul 2>&1

echo Creating directories...
mkdir "D:\PDF转网页\JEV_Client\scripts" >nul 2>&1
mkdir "D:\PDF转网页\JEV_Client\scripts\lib" >nul 2>&1
mkdir "D:\PDF转网页\JEV_Client\scripts\modules" >nul 2>&1
mkdir "D:\PDF转网页\JEV_Client\backup" >nul 2>&1
mkdir "D:\PDF转网页\JEV_Client\scripts\dev" >nul 2>&1

echo Recovery done!
pause