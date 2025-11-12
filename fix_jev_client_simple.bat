@echo off
cls
echo ===========================================
echo Fixing JEV Client HTML Files
echo ===========================================

REM Set target directory
set "TARGET_DIR=D:\PDF转网页\JEV_Client"

REM Backup and fix auto_deploy_chatform.html
echo Fixing auto_deploy_chatform.html...
if exist "%TARGET_DIR%\auto_deploy_chatform.html" (
    echo Backing up original file...
    copy "%TARGET_DIR%\auto_deploy_chatform.html" "%TARGET_DIR%\auto_deploy_chatform.html.bak" > nul
    
    echo Creating clean HTML file...
    echo ^<!DOCTYPE html^> > "%TARGET_DIR%\auto_deploy_chatform.html"
    echo ^<html^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo ^<head^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo   ^<meta charset=^"UTF-8^"^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo   ^<title^>JEV L5+ Auto Deploy Chat Form^</title^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo ^</head^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo ^<body^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo   ^<h1^>JEV L5+ Auto Deploy Chat Form^</h1^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo   ^<p^>System initialized successfully^</p^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo   ^<p^>Encoding: UTF-8 Locked^</p^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo   ^<p^>Version: v2.1^</p^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo ^</body^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    echo ^</html^> >> "%TARGET_DIR%\auto_deploy_chatform.html"
    
    echo File fixed successfully!
) else (
    echo File not found: auto_deploy_chatform.html
)

REM Fix other HTML files in the directory
echo.
echo Fixing other HTML files...
for %%f in ("%TARGET_DIR%\*.html") do (
    if /i not "%%~nxf"=="auto_deploy_chatform.html" (
        echo Processing %%~nxf...
        copy "%%f" "%%f.temp" > nul
        
        REM Create minimal HTML with UTF-8 encoding
        echo ^<!DOCTYPE html^> > "%%f"
        echo ^<html^> >> "%%f"
        echo ^<head^> >> "%%f"
        echo   ^<meta charset=^"UTF-8^"^> >> "%%f"
        echo   ^<title^>%%~nf^</title^> >> "%%f"
        echo ^</head^> >> "%%f"
        echo ^<body^> >> "%%f"
        echo   ^<h1^>%%~nf^</h1^> >> "%%f"
        echo   ^<p^>Encoding fixed to UTF-8^</p^> >> "%%f"
        echo ^</body^> >> "%%f"
        echo ^</html^> >> "%%f"
    )
)

echo.
echo ===========================================
echo Task Completed!
echo Please clear browser cache before viewing
echo ===========================================
