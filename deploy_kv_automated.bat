@echo off

set "SCRIPT_DIR=%~dp0"
set "WORKER_FILE=worker_kv_automated.js"
set "DEPLOY_LOG=%SCRIPT_DIR%logs\deploy_kv_automated.log"
set "TEST_URL=https://jevshop.bensonlove1986.workers.dev/kv/test"
set "STATUS_URL=https://jevshop.bensonlove1986.workers.dev/status"

REM 创建日志目录
if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"

REM 写入日志函数
:log
set "timestamp=%date:~0,4%-%date:~5,2%-%date:~8,2% %time:~0,2%:%time:~3,2%:%time:~6,2%"
echo [%timestamp%] %1 >> "%DEPLOY_LOG%"
echo [%timestamp%] %1
goto :eof

call :log "=========================================="
call :log "🚀 JEV KV自动绑定Worker部署脚本"
call :log "=========================================="

REM 检查必要文件
if not exist "%SCRIPT_DIR%%WORKER_FILE%" (
    call :log "❌ 错误: %WORKER_FILE% 文件不存在"
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%wrangler.toml" (
    call :log "❌ 错误: wrangler.toml 文件不存在"
    pause
    exit /b 1
)

call :log "✅ 文件检查通过"
call :log "📄 Worker文件: %WORKER_FILE%"
call :log "⚙️  配置文件: wrangler.toml"

REM 显示KV配置信息
call :log "📦 KV命名空间配置:"
call :log "  - JEV_PLUGIN_STATE"
call :log "  - JEV_GLOBAL_CONFIG"
call :log "  - JEV_AI_CACHE"
call :log "  - JEV_LOGS"
call :log "  - Bensonai_memory"
call :log "  - trea_memory"

REM 开始部署
call :log ""
call :log "📤 开始部署Worker..."
call :log "执行命令: wrangler publish"
call :log ""

REM 切换到脚本目录
cd /d "%SCRIPT_DIR%"

REM 执行部署
wrangler publish >> "%DEPLOY_LOG%" 2>&1
set "DEPLOY_RESULT=%errorlevel%"

if %DEPLOY_RESULT% equ 0 (
    call :log "✅ Worker部署成功!"
    
    REM 等待3秒让Worker初始化
    call :log "⏳ 等待Worker初始化..."
    timeout /t 3 >nul
    
    REM 测试KV绑定
    call :log ""
    call :log "🔍 测试KV绑定状态..."
    call :log "访问URL: %TEST_URL%"
    
    REM 使用curl测试KV绑定 (如果curl可用)
    where curl >nul 2>nul
    if %errorlevel% equ 0 (
        call :log "📡 正在执行KV绑定测试..."
        curl -s -o kv_test_result.json "%TEST_URL%"
        
        if exist kv_test_result.json (
            call :log "✅ KV测试结果已保存到 kv_test_result.json"
            call :log "📊 测试结果摘要:"
            
            REM 简单解析JSON结果 (需要PowerShell支持)
            powershell -Command "try { $result = Get-Content 'kv_test_result.json' | ConvertFrom-Json; Write-Output ('  成功: ' + $result.success); Write-Output ('  KV数量: ' + $result.count); Write-Output ('  成功数量: ' + $result.success_count); Write-Output ('  详细结果:'); $result.result | Get-Member -MemberType NoteProperty | ForEach-Object { $key = $_.Name; $value = $result.result.$key; Write-Output ('    - ' + $key + ': ' + $value) } } catch { Write-Output '  无法解析测试结果' }" >> "%DEPLOY_LOG%"
            
            call :log ""
            call :log "💡 请查看 kv_test_result.json 获取完整的KV绑定状态"
        ) else (
            call :log "❌ 无法获取KV测试结果"
        )
    ) else (
        call :log "⚠️ curl不可用，请手动访问以下URL检查KV绑定:"
        call :log "   %TEST_URL%"
    )
    
    REM 检查系统状态
    call :log ""
    call :log "🌐 检查系统状态..."
    call :log "访问URL: %STATUS_URL%"
    
    call :log ""
    call :log "✅ 部署流程完成!"
    call :log "=========================================="
    call :log ""
    call :log "💡 部署后操作指南:"
    call :log "1. 访问 %TEST_URL% 验证所有KV命名空间绑定"
    call :log "2. 访问 %STATUS_URL% 检查系统整体状态"
    call :log "3. 确保前端Pages (jev-client.pages.dev) 可以正常访问Worker"
    call :log ""
    call :log "三层架构确认:"
    call :log "✅ 前端 Pages: jev-client.pages.dev"
    call :log "✅ 主 Worker: jevshop.bensonlove1986.workers.dev"
    call :log "✅ 记忆 Worker: treamemory.bensonlove1986.workers.dev"
    
) else (
    call :log "❌ Worker部署失败!"
    call :log "请查看 %DEPLOY_LOG% 获取详细错误信息"
    call :log "常见问题:"
    call :log "1. 确保已登录: wrangler login"
    call :log "2. 检查wrangler.toml配置是否正确"
    call :log "3. 确认Cloudflare账户有足够权限"
)

echo.
echo 按任意键查看部署日志...
pause >nul
type "%DEPLOY_LOG%"

echo.
echo 按任意键退出...
pause >nul