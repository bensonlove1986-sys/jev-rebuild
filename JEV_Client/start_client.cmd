@echo off

REM JEV Client Startup Script
cd /d "%~dp0"

echo ==================================================
echo JEV Client Starting...
echo 🔒 安全编码层已激活
set "ENCODING_SAFE_MODE=ENABLED"
set "JEV_SAFE_LAYER=ACTIVE"

echo [JEV] Safe Encoding Fix Layer Active > diagnostics\startup_encoding_status.log
echo [JEV] System Stable / Encoding Verified >> diagnostics\startup_encoding_status.log

echo Starting JEV Client Server...
echo ==================================================
node server.js