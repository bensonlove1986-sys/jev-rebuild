@echo off

echo =======================================================
echo         JEV Auto Manager
 echo =======================================================
echo 
echo Features:
echo 1. Auto scan and sync all files in JEV_Client directory
 echo 2. Auto upload updates to Cloudflare Pages when changes detected
 echo 3. Auto update version when core modules changed
 echo 4. Auto refresh cache for UI changes
 echo 5. Provide module status reports
 echo 6. Support one-click redeployment, UI update, AI module sync
 echo 
echo =======================================================
echo.
echo Starting auto manager...

powershell -ExecutionPolicy Bypass -File "d:\PDF转网页\jev_auto_manager.ps1"

pause