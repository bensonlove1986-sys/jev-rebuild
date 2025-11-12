@echo off
setlocal enabledelayedexpansion

echo 开始部署Cloudflare Worker环境变量...

REM 1. 更新.env文件
echo 更新.env文件...
( 
echo DAOJIE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjNTc2ZUYlUxbG1BUHBrRzlpQjZDIiwidmVyc2lvbiI6MSwiaWF0IjoxNzYxMzcwNzQwMDA0LCJzdWIiOiJBbmtGd2NkdHF1dlFaM2RZZnBTQyJ9.WbtH9jNfXkdlw3JB6Z0wmV6DTUFpscS4Hb0GqbBJZMk
echo ADMIN_TOKEN=JEV_ADMIN_2025_SECURE_X9LpZk
echo MODE=production
echo ALLOW_ORIGIN=https://jev-client.pages.dev
echo JEV_API_KEY=JEV_2025_AI_SYS_A92jskL0xY
) > .env

echo .env文件已更新

REM 2. 直接执行wrangler publish命令
echo 执行部署...
npx wrangler publish --force

REM 3. 等待部署完成
echo 等待部署完成...
ping -n 5 127.0.0.1 > nul

REM 4. 执行健康检查
echo 执行健康检查...
curl -s https://jevshop.bensonlove1986.workers.dev/kv/test

echo 部署流程完成！