@echo off

rem 清理之前的缓存和旧的部署
echo 清理之前的部署缓存...
rem 清理wrangler缓存目录
rmdir /s /q .wrangler\state 2>nul
mkdir .wrangler\state 2>nul

rem 登录Cloudflare
echo 重新登录Cloudflare...
wrangler login

rem 重新部署Worker
echo 部署更新后的Worker配置...
wrangler deploy

rem 验证部署状态
echo 验证部署状态...
wrangler tail --last 10

rem 显示完成消息
echo 部署脚本执行完成，请检查上面的输出是否有错误。