Write-Host "" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "        🚀 JEV Client v7.0 - PowerShell启动器" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Cyan

# 设置工作目录和核心文件路径
$basePath = "D:\PDF转网页\JEV_Client"
$serverFile = Join-Path $basePath "server.js"
$pythonServer = Join-Path $basePath "start_web_server.py"
$loginPage = Join-Path $basePath "ui\login_portal.html"
$port = 8080

# 切换到工作目录
Write-Host "🔍 正在定位工作目录..." -ForegroundColor Cyan
Set-Location -Path $basePath -ErrorAction Stop
Write-Host "✅ 工作目录: $(Get-Location)" -ForegroundColor Green

# 环境检测函数
function Test-Environment {
    Write-Host "" -ForegroundColor Cyan
    Write-Host "📊 正在检测运行环境..." -ForegroundColor Cyan
    
    # 检测Node.js
    $nodeAvailable = $false
    try {
        $nodeVersion = (node --version)
        $nodeAvailable = $true
        Write-Host "- ✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "- ⚠️ Node.js未安装或不可用" -ForegroundColor Yellow
    }
    
    # 检测Python
    $pythonAvailable = $false
    try {
        $pythonVersion = (python --version)
        $pythonAvailable = $true
        Write-Host "- ✅ Python: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "- ⚠️ Python未安装或不可用" -ForegroundColor Yellow
    }
    
    return @{
        NodeAvailable = $nodeAvailable
        PythonAvailable = $pythonAvailable
    }
}

# 文件检查函数
function Test-CoreFiles {
    Write-Host "" -ForegroundColor Cyan
    Write-Host "📁 正在检查核心文件..." -ForegroundColor Cyan
    
    # 检查server.js
    $serverExists = Test-Path -Path $serverFile
    if ($serverExists) {
        Write-Host "- ✅ 找到 server.js" -ForegroundColor Green
    } else {
        Write-Host "- ⚠️ 未找到 server.js，将使用Python服务器" -ForegroundColor Yellow
    }
    
    # 检查登录页面
    $loginExists = Test-Path -Path $loginPage
    if (-not $loginExists) {
        Write-Host "- ❌ 错误: 找不到登录页面 $loginPage" -ForegroundColor Red
        Write-Host "  ℹ️ 请确认JEV Client是否完整安装" -ForegroundColor Yellow
        return $false
    } else {
        Write-Host "- ✅ 找到登录页面" -ForegroundColor Green
    }
    
    return $true
}

# 创建Python服务器脚本
function New-PythonServerScript {
    if (-not (Test-Path -Path $pythonServer)) {
        Write-Host "" -ForegroundColor Cyan
        Write-Host "📝 创建Python服务器脚本..." -ForegroundColor Cyan
        
        $pythonContent = @"
import http.server
import socketserver
import webbrowser
import threading
import time
import os

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class JEVHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 支持访问根目录下的文件
        if self.path == '/':
            self.path = '/ui/login_portal.html'
        return super().do_GET()
    
    def log_message(self, format, *args):
        # 禁用默认日志
        pass

with socketserver.TCPServer(("", PORT), JEVHTTPHandler) as httpd:
    print(f"\n=== JEV Client Server ===")
    print(f"服务器运行地址: http://localhost:{PORT}")
    print(f"登录页面: http://localhost:{PORT}/ui/login_portal.html")
    print(f"按 Ctrl+C 停止服务器")
    print("========================\n")
    
    # 延迟后在默认浏览器中打开登录页面
    def open_browser():
        time.sleep(1)
        webbrowser.open(f'http://localhost:{PORT}/ui/login_portal.html')
    
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
"@
        
        $pythonContent | Out-File -FilePath $pythonServer -Encoding utf8
        Write-Host "- ✅ Python服务器脚本已创建" -ForegroundColor Green
    }
}

# 停止已有端口的函数
function Stop-ExistingServer {
    param([int]$Port)
    
    Write-Host "" -ForegroundColor Cyan
    Write-Host "🛑 检查并停止端口 $Port 上的现有进程..." -ForegroundColor Cyan
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                     Select-Object -ExpandProperty OwningProcess | 
                     ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }
        
        if ($processes) {
            foreach ($process in $processes) {
                Write-Host "- 停止进程: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            }
            Write-Host "- ✅ 端口 $Port 已释放" -ForegroundColor Green
        } else {
            Write-Host "- ℹ️ 端口 $Port 当前未被占用" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "- ⚠️ 检查端口时发生错误: $_" -ForegroundColor Yellow
    }
}

# 启动服务器函数
function Start-JEVServer {
    param(
        [bool]$NodeAvailable,
        [bool]$PythonAvailable,
        [bool]$ServerExists
    )
    
    Write-Host "" -ForegroundColor Cyan
    Write-Host "🚀 正在启动JEV Client服务器..." -ForegroundColor Cyan
    
    # 停止可能存在的服务
    Stop-ExistingServer -Port $port
    
    # 优先使用Node.js
    if ($NodeAvailable -and $ServerExists) {
        Write-Host "🟢 正在使用Node.js启动server.js..." -ForegroundColor Green
        Start-Process -FilePath "cmd.exe" -ArgumentList "/k node \"$serverFile\"" -WindowStyle Normal -WorkingDirectory $basePath
    } 
    # 回退到Python
    elseif ($PythonAvailable) {
        Write-Host "🟡 Node.js不可用，正在使用Python启动服务器..." -ForegroundColor Yellow
        Start-Process -FilePath "cmd.exe" -ArgumentList "/k python \"$pythonServer\"" -WindowStyle Normal -WorkingDirectory $basePath
    } 
    else {
        Write-Host "❌ 错误: Node.js和Python都不可用" -ForegroundColor Red
        Write-Host "ℹ️ 请至少安装Node.js或Python 3.6+" -ForegroundColor Yellow
        return $false
    }
    
    return $true
}

# 检查服务器状态函数
function Test-ServerStatus {
    param([int]$Port, [int]$TimeoutSeconds = 5)
    
    Write-Host "" -ForegroundColor Cyan
    Write-Host "🔍 正在检查服务器状态..." -ForegroundColor Cyan
    
    $startTime = Get-Date
    $endTime = $startTime.AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $endTime) {
        try {
            $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
            if ($connection) {
                Write-Host "✅ 服务器已在端口 $Port 启动" -ForegroundColor Green
                return $true
            }
        } catch {
            # 忽略连接错误
        }
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "⚠️ 无法确认服务器状态，请手动检查" -ForegroundColor Yellow
    return $false
}

# 主函数
function Main {
    try {
        # 1. 检测环境
        $envResult = Test-Environment
        
        # 2. 检查核心文件
        $filesValid = Test-CoreFiles
        if (-not $filesValid) {
            Write-Host "" -ForegroundColor Red
            Read-Host "按Enter键退出..."
            exit 1
        }
        
        # 3. 创建Python服务器脚本（如果需要）
        New-PythonServerScript
        
        # 4. 启动服务器
        $startSuccess = Start-JEVServer `
            -NodeAvailable $envResult.NodeAvailable `
            -PythonAvailable $envResult.PythonAvailable `
            -ServerExists (Test-Path $serverFile)
        
        if (-not $startSuccess) {
            Write-Host "" -ForegroundColor Red
            Read-Host "按Enter键退出..."
            exit 1
        }
        
        # 5. 等待并检查服务器状态
        Start-Sleep -Seconds 3
        Test-ServerStatus -Port $port
        
        # 6. 打开登录页面
        Write-Host "" -ForegroundColor Cyan
        Write-Host "🌐 正在打开登录页面..." -ForegroundColor Cyan
        Start-Process "http://localhost:$port/ui/login_portal.html"
        
        # 7. 显示完成信息
        Write-Host "" -ForegroundColor Cyan
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "✅ JEV Client 启动完成！" -ForegroundColor Green
        Write-Host "📍 登录地址: http://localhost:$port/ui/login_portal.html" -ForegroundColor Green
        Write-Host "🎯 邀请码: JEV-CLIENT-LOGIN" -ForegroundColor Green
        Write-Host "💡 提示: 如需停止服务，请关闭命令提示符窗口" -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        
        # 显示使用说明
        Write-Host "" -ForegroundColor Cyan
        Write-Host "📝 使用说明:" -ForegroundColor Cyan
        Write-Host "1. 使用以下两种方式启动JEV Client:" -ForegroundColor Cyan
        Write-Host "   - 方式一（推荐）：双击 Start-JEV-Client.bat" -ForegroundColor Cyan
        Write-Host "   - 方式二：右键 Start-JEV-Client.ps1 → 以管理员身份运行" -ForegroundColor Cyan
        Write-Host "2. 输入邀请码 JEV-CLIENT-LOGIN 进行登录" -ForegroundColor Cyan
        Write-Host "" -ForegroundColor Cyan
        
    } catch {
        Write-Host "" -ForegroundColor Red
        Write-Host "❌ 启动过程中发生错误: $_" -ForegroundColor Red
        Write-Host "ℹ️ 请检查错误信息并尝试重新启动" -ForegroundColor Yellow
        Write-Host "" -ForegroundColor Cyan
    }
    
    # 保持窗口打开
    Read-Host "按Enter键关闭此窗口（服务将在后台继续运行）..."
}

# 执行主函数
Main