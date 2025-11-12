@echo off

rem 清理wrangler缓存
del /q /s .wrangler\state\* 2>nul

rem 部署Worker
echo Deploying Worker...
wrangler deploy