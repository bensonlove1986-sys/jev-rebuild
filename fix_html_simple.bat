@echo off
cls
echo ===========================================
echo Fixing HTML File
echo ===========================================

REM Backup original file
if exist auto_heal_demo.html (
    echo Backing up file...
    copy auto_heal_demo.html auto_heal_demo.html.bak
)

REM Create clean HTML file
echo Creating clean HTML file...

echo ^<!DOCTYPE html^> > auto_heal_demo.html
echo ^<html^> >> auto_heal_demo.html
echo ^<head^> >> auto_heal_demo.html
echo   ^<meta charset=^"UTF-8^"^> >> auto_heal_demo.html
echo   ^<title^>JEV L6.2 AutoHeal^</title^> >> auto_heal_demo.html
echo ^</head^> >> auto_heal_demo.html
echo ^<body^> >> auto_heal_demo.html
echo   ^<h1^>JEV L6.2 AutoHeal^</h1^> >> auto_heal_demo.html
echo   ^<p^>System initialized successfully^</p^> >> auto_heal_demo.html
echo   ^<p^>Encoding: UTF-8 Locked^</p^> >> auto_heal_demo.html
echo   ^<p^>Health: 100%%^</p^> >> auto_heal_demo.html
echo   ^<p^>Time: 00:00:00^</p^> >> auto_heal_demo.html
echo ^</body^> >> auto_heal_demo.html
echo ^</html^> >> auto_heal_demo.html

echo ===========================================
echo File fixed successfully!
echo Please clear browser cache and reload page
echo ===========================================
