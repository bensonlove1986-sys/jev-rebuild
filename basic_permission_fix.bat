@echo off
REM Basic Permission Fix Batch Script for JEV System

echo =================================================
echo JEV SYSTEM PERMISSION FIX GUIDE
rem =================================================

echo.
echo 1. ADMINISTRATOR PERMISSIONS FIX:
echo ---------------------------------
echo Right-click Command Prompt and select "Run as administrator"
echo Then run the commands below to fix permissions.

echo.
echo 2. FILE SYSTEM PERMISSIONS FIX:
echo -------------------------------
echo Run these commands as administrator:
echo icacls "D:\JEV" /grant Everyone:(OI)(CI)F /T /Q
echo.
echo 3. FIREWALL RULES FIX:
echo ---------------------
echo Run these commands as administrator:
echo netsh advfirewall firewall add rule name="JEV Agent" dir=in action=allow program="D:\JEV\agent\desktopAgent.exe" enable=yes
echo netsh advfirewall firewall add rule name="JEV AI" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
echo netsh advfirewall firewall add rule name="JEV HTTP Servers" dir=in action=allow protocol=TCP localport=52126,5262,1820,1822 enable=yes
echo.
echo 4. NETWORK RESET:
echo ----------------
echo Run these commands as administrator:
echo netsh winsock reset
echo netsh int ip reset
echo ipconfig /flushdns
echo.
echo 5. ANTIVIRUS EXCLUSIONS:
echo ----------------------
echo Add D:\JEV directory to your antivirus exclusions.
echo.
echo 6. APPLICATION COMPATIBILITY FIX:
echo --------------------------------
echo Right-click desktopAgent.exe in D:\JEV\agent\
echo Select Properties - Compatibility - Run this program as administrator

echo.
echo 7. UAC SETTINGS ADJUSTMENT:
echo -------------------------
echo Press Windows + R, type "msconfig" and press Enter
echo Go to Tools tab, select "Change UAC Settings"
echo Move slider to "Never notify" (temporarily for testing)
echo.
echo After making all these changes, please restart your computer.
echo =================================================

pause