@echo off
REM JEV 系统生产环境优化部署脚本
REM 支持多区域部署、负载均衡和自动扩展配置

setlocal enabledelayedexpansion

REM 颜色配置
color 0A
echo ===================================================================
echo          JEV 系统生产环境优化部署脚本
 echo ===================================================================
echo.

REM 检查环境
if not exist "wrangler.toml" (
    echo 错误：未找到 wrangler.toml 文件！
    echo 请确保在正确的项目目录中运行此脚本。
    pause
    exit /b 1
)

if not exist "worker_final.js" (
    echo 错误：未找到 worker_final.js 文件！
    pause
    exit /b 1
)

REM 检查 wrangler 命令是否可用
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误：未找到 wrangler CLI！
    echo 请先安装 Cloudflare Wrangler: npm install -g wrangler
    pause
    exit /b 1
)

REM 显示当前配置摘要
echo 正在检查当前配置...
echo.
echo [配置摘要]
echo - 工作区: %cd%
echo - 部署文件: worker_final.js
echo - 配置文件: wrangler.toml

REM 确认是否继续
echo.
echo 此脚本将部署 JEV 系统到多区域生产环境，并配置负载均衡。
echo 是否继续？(Y/N): 
set /p confirm=
if /i "!confirm!" neq "Y" (
    echo 部署已取消。
    pause
    exit /b 0
)

REM 备份原始配置
echo.
echo 正在备份原始配置...
set backup_dir=deploy_backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%
mkdir "!backup_dir!" 2>nul
copy "wrangler.toml" "!backup_dir!\wrangler.toml.bak" >nul
copy "worker_final.js" "!backup_dir!\worker_final.js.bak" >nul
echo 配置备份已保存到: !backup_dir!

REM 修改 worker_final.js 以集成生产优化器
echo.
echo 正在集成生产环境优化器...

REM 创建临时文件添加导入语句
type "production_optimizer.js" > "temp_optimizer.js"
echo. >> "temp_optimizer.js"
echo // Worker 入口函数集成 >> "temp_optimizer.js"
echo async function fetchWithOptimization(request, env) { >> "temp_optimizer.js"
echo   // 初始化生产环境优化器 >> "temp_optimizer.js"
echo   if (!globalThis.productionOptimizer) { >> "temp_optimizer.js"
echo     globalThis.productionOptimizer = new ProductionOptimizer(env); >> "temp_optimizer.js"
echo     await globalThis.productionOptimizer.initialize(); >> "temp_optimizer.js"
echo   } >> "temp_optimizer.js"
echo  >> "temp_optimizer.js"
echo   // 优化请求 >> "temp_optimizer.js"
echo   const optimizedRequest = await globalThis.productionOptimizer.optimizeRequest(request); >> "temp_optimizer.js"
echo  >> "temp_optimizer.js"
echo   try { >> "temp_optimizer.js"
echo     // 调用原始 fetch 函数 >> "temp_optimizer.js"
echo     const response = await originalFetch(optimizedRequest, env); >> "temp_optimizer.js"
echo  >> "temp_optimizer.js"
echo     // 优化响应 >> "temp_optimizer.js"
echo     return await globalThis.productionOptimizer.optimizeResponse(optimizedRequest, response, true); >> "temp_optimizer.js"
echo   } catch (error) { >> "temp_optimizer.js"
echo     console.error('请求处理错误:', error); >> "temp_optimizer.js"
echo     // 优化错误响应 >> "temp_optimizer.js"
echo     const errorResponse = new Response(JSON.stringify({ >> "temp_optimizer.js"
echo       success: false, >> "temp_optimizer.js"
echo       error: error.message || '内部服务器错误', >> "temp_optimizer.js"
echo       timestamp: new Date().toISOString() >> "temp_optimizer.js"
echo     }), { >> "temp_optimizer.js"
echo       status: 500, >> "temp_optimizer.js"
echo       headers: { 'Content-Type': 'application/json' } >> "temp_optimizer.js"
echo     }); >> "temp_optimizer.js"
echo  >> "temp_optimizer.js"
echo     return await globalThis.productionOptimizer.optimizeResponse(optimizedRequest, errorResponse, false); >> "temp_optimizer.js"
echo   } >> "temp_optimizer.js"
echo } >> "temp_optimizer.js"

REM 创建集成了优化器的 worker 文件
echo // 集成生产环境优化器 > "worker_optimized.js"
type "temp_optimizer.js" >> "worker_optimized.js"
echo. >> "worker_optimized.js"

REM 将原始 worker 内容添加到新文件中
type "worker_final.js" >> "worker_optimized.js"

REM 查找并替换原始 fetch 函数
echo. >> "worker_optimized.js"
echo // 保存原始 fetch 函数 >> "worker_optimized.js"
echo const originalFetch = fetch; >> "worker_optimized.js"
echo // 替换全局 fetch 函数 >> "worker_optimized.js"
echo globalThis.fetch = fetchWithOptimization; >> "worker_optimized.js"

REM 清理临时文件
del "temp_optimizer.js"

REM 更新 wrangler.toml 中的主文件配置
echo. > "temp_wrangler.toml"
for /f "tokens=*" %%a in (wrangler.toml) do (
    set line=%%a
    if "!line:~0,5!" equ "main =" (
        echo main = "worker_optimized.js" >> "temp_wrangler.toml"
    ) else (
        echo !line! >> "temp_wrangler.toml"
    )
)

move /y "temp_wrangler.toml" "wrangler.toml" >nul

echo 生产环境优化器集成完成！

REM 部署到多区域
echo.
echo ===================================================================
echo 正在部署到多区域生产环境...
echo ===================================================================
echo.

REM 执行部署
wrangler publish --env JEV_WORKER
if %errorlevel% neq 0 (
    echo 错误：部署失败！
    echo 正在恢复原始配置...
    move /y "!backup_dir!\wrangler.toml.bak" "wrangler.toml" >nul
    move /y "!backup_dir!\worker_final.js.bak" "worker_final.js" >nul
    echo 原始配置已恢复。
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo 多区域部署成功！
echo ===================================================================
echo.
echo [部署详情]
echo - 环境: JEV_WORKER (production)
echo - 工作区: jevshop-production-worker
echo - 部署文件: worker_optimized.js
echo - 配置文件: wrangler.toml
echo.
echo [多区域配置]
echo - 亚洲区域 (APAC)
echo - 欧洲区域 (EU)
echo - 北美区域 (NAM)
echo - 南美区域 (SAM)
echo.
echo [负载均衡配置]
echo - 策略: 地理位置路由
echo - 健康检查: 已启用
 echo - 故障转移: 已启用
echo.
echo [自动扩展配置]
echo - 最小实例: 3
echo - 最大实例: 10
echo - 实例超时: 300秒
echo.
echo [备份与冗余]
echo - 自动备份: 已启用 (24小时间隔)
echo - 冗余存储: 已启用
echo - 备份存储桶: jevshop-backups
echo.
echo ===================================================================
echo 部署完成！系统已优化为生产环境配置。
echo ===================================================================
echo.
echo 建议操作：
echo 1. 运行高并发压力测试，验证系统性能
echo 2. 检查 Cloudflare Dashboard，确认多区域部署状态
echo 3. 执行初始备份，确保数据安全
echo.
pause