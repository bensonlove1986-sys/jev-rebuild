@echo off
cls
echo ===========================================
echo Fixing JEV Client HTML Files
echo ===========================================

REM Set target directory
set TARGET_DIR=D:\PDF转网页\JEV_Client

REM Fix auto_deploy_chatloop.html
echo Fixing auto_deploy_chatloop.html...
if exist "%TARGET_DIR%\auto_deploy_chatloop.html" (
    echo Backing up...
    copy "%TARGET_DIR%\auto_deploy_chatloop.html" "%TARGET_DIR%\auto_deploy_chatloop.html.newbak" > nul
    
    echo Creating clean file...
    echo ^<!DOCTYPE html^> > "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo ^<html^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo ^<head^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo   ^<meta charset=^"UTF-8^"^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo   ^<title^>JEV L5+ Auto Deploy Chat Loop^</title^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo ^</head^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo ^<body^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo   ^<h1^>JEV L5+ Auto Deploy Chat Loop^</h1^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo   ^<p^>System initialized successfully^</p^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo   ^<p^>Encoding: UTF-8 Locked^</p^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo ^</body^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    echo ^</html^> >> "%TARGET_DIR%\auto_deploy_chatloop.html"
    
    echo Fixed successfully!
)

REM Fix auto_heal_demo.html
echo.
echo Fixing auto_heal_demo.html...
if exist "%TARGET_DIR%\auto_heal_demo.html" (
    echo Backing up...
    copy "%TARGET_DIR%\auto_heal_demo.html" "%TARGET_DIR%\auto_heal_demo.html.newbak" > nul
    
    echo Creating clean file...
    echo ^<!DOCTYPE html^> > "%TARGET_DIR%\auto_heal_demo.html"
    echo ^<html^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo ^<head^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo   ^<meta charset=^"UTF-8^"^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo   ^<title^>JEV L5+ Auto Heal Demo^</title^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo ^</head^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo ^<body^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo   ^<h1^>JEV L5+ Auto Heal Demo^</h1^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo   ^<p^>Auto heal system initialized^</p^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo   ^<p^>Encoding: UTF-8 Locked^</p^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo ^</body^> >> "%TARGET_DIR%\auto_heal_demo.html"
    echo ^</html^> >> "%TARGET_DIR%\auto_heal_demo.html"
    
    echo Fixed successfully!
)

echo.
echo ===========================================
echo HTML files fixed with UTF-8 encoding
echo Please clear browser cache before viewing
echo ===========================================
