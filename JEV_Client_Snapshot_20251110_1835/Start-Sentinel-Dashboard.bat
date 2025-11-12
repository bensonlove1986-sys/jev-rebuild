@echo off

REM JEV L7.2 - Global Sentinel Dashboard 启动脚本

set "dashboard_path=d:\PDF转网页\JEV_Client\ui\sentinel_dashboard.html"
set "dashboard_js_path=d:\PDF转网页\JEV_Client\ui\sentinel_dashboard.js"
set "port=8888"

echo =========================================
echo       🛡️  JEV L7.2 Sentinel Dashboard 🛡️
echo =========================================
echo 

echo 🔍 正在检查必要文件...

if exist "%dashboard_path%" (
    echo ✅ Dashboard HTML 文件存在
) else (
    echo ❌ Dashboard HTML 文件不存在: %dashboard_path%
    pause
    exit /b 1
)

if exist "%dashboard_js_path%" (
    echo ✅ Dashboard JS 模块文件存在
) else (
    echo ⚠️ Dashboard JS 模块文件不存在: %dashboard_js_path%
    echo ℹ️ 将继续启动，但部分功能可能受限
)

echo 
echo 启动方式选择:

echo 1. 使用默认浏览器直接打开

echo 2. 使用本地服务器启动（支持完整功能）

echo 3. 仅测试文件访问权限

echo 

set /p choice=请输入选择 (1/2/3): 

echo 

if "%choice%" == "1" (
    echo 🚀 正在启动浏览器...
    start "JEV Sentinel Dashboard" "%dashboard_path%"
    echo 
    echo ✅ Dashboard 已在默认浏览器中打开
    echo 📍 文件位置: %dashboard_path%
    echo ℹ️ 提示: 直接文件访问可能会限制部分功能（如AJAX请求）
    
) else if "%choice%" == "2" (
    echo 🚀 正在启动本地服务器...
    echo ℹ️ 端口: %port%
    echo ℹ️ 地址: http://localhost:%port%/ui/sentinel_dashboard.html
    
    cd /d "d:\PDF转网页\JEV_Client"
    
    echo 
    echo 尝试使用 Python 启动服务器...
    python -m http.server %port% || (
        echo 
        echo ⚠️ Python 服务器启动失败，尝试使用 Node.js...
        
        node -e "const http = require('http'); const fs = require('fs'); const path = require('path'); const server = http.createServer((req, res) => { const filePath = path.join(__dirname, req.url === '/' ? 'ui/sentinel_dashboard.html' : req.url); fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404); res.end('File not found'); return; } res.writeHead(200); res.end(data); }); }); server.listen(%port%, () => console.log('Server running at http://localhost:%port%/'));" || (
            echo 
            echo ❌ 服务器启动失败
            echo 
            echo 请手动在浏览器中打开以下文件:
            echo %dashboard_path%
            pause
            exit /b 1
        )
    )
    
) else if "%choice%" == "3" (
    echo 🔧 正在测试文件访问权限...
    
    echo HTML 文件大小: %~z1
    dir "%dashboard_path%"
    echo 
    if exist "%dashboard_js_path%" (
        echo JS 文件大小: %~z2
        dir "%dashboard_js_path%"
    )
    
    echo 
    echo ✅ 访问权限测试完成
    echo ℹ️ 您可以复制以下地址到浏览器访问:
    echo file:///%dashboard_path:\=/%
    
) else (
    echo ❌ 无效的选择，默认直接打开
    start "JEV Sentinel Dashboard" "%dashboard_path%"
)

echo 
echo =========================================
echo 🧠 功能说明:

echo ✅ FaceID 验证状态实时监控

echo ✅ 模块完整性验证

echo ✅ 系统安全状态展示

echo ✅ 安全事件日志记录

echo ✅ 支持 window.dispatchEvent('sentinel-update') 事件

echo =========================================

if "%choice%" neq "2" (
    pause
)