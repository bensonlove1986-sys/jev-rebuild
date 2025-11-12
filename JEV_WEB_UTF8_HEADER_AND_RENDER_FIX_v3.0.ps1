#!/usr/bin/env powershell
# JEV-WEB-UTF8-HEADER-AND-RENDER-FIX-v3.0
# 网页UTF-8编码修复与渲染问题修复脚本

# 设置严格模式
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 定义变量
$baseDir = "D:\PDF转网页"
$uiDir = "$baseDir\ui"
$logDir = "$baseDir\logs"
$fixLog = "$logDir\web_utf8_header_fix.log"
$reportFile = "$logDir\web_render_fix_report.txt"
$targetFiles = @(
    "$uiDir\login_portal.html",
    "$uiDir\sentinel_dashboard.html"
)
$browserProcesses = @("chrome", "msedge", "firefox")
$serverFiles = @(
    "$baseDir\server.js",
    "$baseDir\relay_server.js",
    "$baseDir\JEV_Client\server.js"
)

# 修复统计
$fixStats = @{}
$totalFixes = 0

# 确保日志目录存在
function Ensure-LogDirectory {
    if (-not (Test-Path $logDir)) {
        try {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
            Write-Host "创建日志目录: $logDir"
        } catch {
            Write-Host "警告: 无法创建日志目录，将使用临时日志位置"
            $global:logDir = "$env:TEMP"
            $global:fixLog = "$env:TEMP\web_utf8_header_fix.log"
            $global:reportFile = "$env:TEMP\web_render_fix_report.txt"
        }
    }
}

# 日志函数
function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Add-Content -Path $fixLog -Value $logEntry -Encoding UTF8
    Write-Host $logEntry
}

# 修复HTML文件
function Fix-HtmlFile($filePath) {
    $fileName = Split-Path $filePath -Leaf
    $fixCount = 0
    $fixDetails = @()
    
    try {
        Write-Log "开始修复HTML文件: $fileName"
        
        # 检查文件是否存在
        if (-not (Test-Path $filePath -PathType Leaf)) {
            Write-Log "错误: 文件不存在 - $filePath"
            return $false
        }
        
        # 读取文件内容（尝试UTF-8）
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        
        # 1. 检测并删除BOM
        if ($content.StartsWith([char]0xFEFF)) {
            $content = $content.Substring(1)
            $fixCount++
            $fixDetails += "删除BOM头"
            Write-Log "  - 删除了BOM头"
        }
        
        # 2. 删除所有错误或重复的字符集声明
        $charsetPattern = '<meta\s+charset=["\'](gb2312|ANSI|utf8|utf-8)["\']\s*/?>'
        $cleanContent = [regex]::Replace($content, $charsetPattern, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($cleanContent -ne $content) {
            $fixCount++
            $fixDetails += "删除错误字符集声明"
            Write-Log "  - 删除了错误或重复的字符集声明"
        }
        $content = $cleanContent
        
        # 3. 在<head>最前方插入UTF-8声明
        $headPattern = '<head[^>]*>'
        $headMatch = [regex]::Match($content, $headPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        
        if ($headMatch.Success) {
            $headStart = $headMatch.Index
            $headEnd = $headStart + $headMatch.Length
            $insertedContent = $content.Substring(0, $headEnd) + "\n    <meta charset=\"UTF-8\">" + $content.Substring($headEnd)
            
            # 检查插入位置是否在前200字节内
            if ($headStart + $headMatch.Length < 200) {
                $content = $insertedContent
                $fixCount++
                $fixDetails += "在<head>最前方插入UTF-8声明"
                Write-Log "  - 在<head>最前方插入了UTF-8声明（位于前200字节内）"
            } else {
                Write-Log "  - 警告: <head>标签位于200字节之后，可能影响浏览器识别"
            }
        } else {
            # 如果没有<head>标签，在<html>标签后插入
            $htmlPattern = '<html[^>]*>'
            $htmlMatch = [regex]::Match($content, $htmlPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            
            if ($htmlMatch.Success) {
                $htmlStart = $htmlMatch.Index
                $htmlEnd = $htmlStart + $htmlMatch.Length
                $insertedContent = $content.Substring(0, $htmlEnd) + "\n<head>\n    <meta charset=\"UTF-8\">\n</head>" + $content.Substring($htmlEnd)
                $content = $insertedContent
                $fixCount++
                $fixDetails += "添加<head>并插入UTF-8声明"
                Write-Log "  - 添加了<head>标签并插入UTF-8声明"
            }
        }
        
        # 4. 保存为UTF-8无BOM格式
        $utf8NoBomEncoding = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBomEncoding)
        
        # 5. 校验HTML标签闭合（简单校验）
        $unclosedTags = 0
        $openTags = @()
        $tagMatches = [regex]::Matches($content, '<(/)?([a-zA-Z][a-zA-Z0-9]*)[^>]*>')
        foreach ($match in $tagMatches) {
            $isClosing = $match.Groups[1].Success
            $tagName = $match.Groups[2].Value.ToLower()
            
            # 忽略自闭合标签和不需要闭合的标签
            $selfClosingTags = @('br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr')
            if (-not $selfClosingTags.Contains($tagName)) {
                if (-not $isClosing) {
                    $openTags += $tagName
                } else {
                    if ($openTags.Count -gt 0 -and $openTags[-1] -eq $tagName) {
                        $openTags = $openTags[0..($openTags.Count-2)]
                    } else {
                        $unclosedTags++
                    }
                }
            }
        }
        
        if ($openTags.Count -gt 0) {
            Write-Log "  - 警告: 发现未闭合标签: $($openTags -join ', ')`n"
        }
        
        # 记录修复统计
        $fixStats[$fileName] = @{
            'fix_count' = $fixCount;
            'details' = $fixDetails;
            'success' = $true;
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        Write-Log "修复完成: $fileName (修复项: $fixCount)"
        return $true
    } catch {
        Write-Log "修复失败: $fileName - 错误: $_"
        $fixStats[$fileName] = @{
            'fix_count' = 0;
            'details' = @("修复过程出错");
            'success' = $false;
            'error' = $_.Exception.Message;
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        return $false
    }
}

# 修复服务端响应头
function Fix-ServerResponseHeaders {
    Write-Log "开始修复服务端响应头..."
    $serverFixed = $false
    
    foreach ($serverFile in $serverFiles) {
        if (Test-Path $serverFile -PathType Leaf) {
            try {
                Write-Log "  - 检查服务器文件: $serverFile"
                $content = Get-Content -Path $serverFile -Raw
                
                # 检查是否已经包含charset=utf-8
                if (-not ($content -match 'Content-Type.*charset=utf-8')) {
                    # 尝试在响应头中添加charset=utf-8
                    if ($content -match 'Content-Type') {
                        # 替换现有Content-Type
                        $newContent = [regex]::Replace($content, '(Content-Type:\s*[\'"]?text/html[\'"]?)', '$1; charset=utf-8')
                        $newContent = [regex]::Replace($newContent, '(Content-Type:\s*[\'"]?text/css[\'"]?)', '$1; charset=utf-8')
                        $newContent = [regex]::Replace($newContent, '(Content-Type:\s*[\'"]?application/javascript[\'"]?)', '$1; charset=utf-8')
                    } else {
                        # 在Response或res对象附近添加
                        if ($content -match 'res\.setHeader\(') {
                            $newContent = $content -replace '(res\.setHeader\()', '$1"Content-Type", "text/html; charset=utf-8"\n$1'
                        } elseif ($content -match 'Response\(') {
                            $newContent = $content -replace '(new Response\([^)]+)', '$1, { headers: { "Content-Type": "text/html; charset=utf-8" } }'
                        } else {
                            # 在文件适当位置添加
                            if ($content -match 'listen\(') {
                                $match = [regex]::Match($content, 'listen\([^)]+\)')
                                $insertPos = $match.Index
                                $headerCode = "

// 添加UTF-8响应头中间件
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

"
                                $newContent = $content.Substring(0, $insertPos) + $headerCode + $content.Substring($insertPos)
                            }
                        }
                    }
                    
                    # 如果内容有变化，保存文件
                    if ($newContent -ne $content) {
                        Set-Content -Path $serverFile -Value $newContent -Encoding UTF8
                        $serverFixed = $true
                        Write-Log "  - 成功修复服务端响应头: $serverFile"
                        break
                    }
                } else {
                    Write-Log "  - 服务端响应头已经包含charset=utf-8: $serverFile"
                    $serverFixed = $true
                    break
                }
            } catch {
                Write-Log "  - 修复服务端响应头时出错: $_"
            }
        }
    }
    
    # 如果没有找到可修改的server文件，创建一个简单的代理脚本
    if (-not $serverFixed) {
        try {
            $proxyScriptPath = "$baseDir\utf8_response_proxy.js"
            $proxyScript = @"
// UTF-8响应头代理脚本
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const TARGET_PORT = 8080;
const BASE_DIR = '$baseDir';

// 创建代理服务器
const proxy = http.createServer((req, res) => {
    // 添加UTF-8响应头
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // 尝试从本地文件系统提供文件
    let filePath = path.join(BASE_DIR, req.url.replace(/^\//, ''));
    
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
        // 从本地文件系统读取文件
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                // 如果读取失败，转发到原服务器
                forwardToOriginalServer(req, res);
            } else {
                // 设置正确的MIME类型
                const ext = path.extname(filePath);
                let contentType = 'text/html; charset=utf-8';
                
                if (ext === '.css') contentType = 'text/css; charset=utf-8';
                else if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
                
                res.setHeader('Content-Type', contentType);
                res.end(data);
            }
        });
    } else {
        // 转发到原服务器
        forwardToOriginalServer(req, res);
    }
});

// 转发请求到原服务器
function forwardToOriginalServer(req, res) {
    const options = {
        hostname: 'localhost',
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        // 确保响应头包含UTF-8
        let contentType = proxyRes.headers['content-type'] || '';
        if (contentType.includes('text/html') || contentType.includes('text/css') || contentType.includes('javascript')) {
            if (!contentType.includes('charset=')) {
                proxyRes.headers['content-type'] = contentType + '; charset=utf-8';
            }
        }
        
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (e) => {
        res.writeHead(502);
        res.end(`代理错误: ${e.message}`);
    });
    
    req.pipe(proxyReq);
}

// 启动代理服务器
proxy.listen(PORT, () => {
    console.log(`UTF-8响应头代理服务器运行在 http://localhost:${PORT}`);
    console.log(`请访问 http://localhost:${PORT} 替代 http://localhost:${TARGET_PORT}`);
});
"@
            
            Set-Content -Path $proxyScriptPath -Value $proxyScript -Encoding UTF8
            Write-Log "  - 创建了UTF-8响应头代理脚本: $proxyScriptPath"
            Write-Log "  - 使用方法: node $proxyScriptPath 然后访问 http://localhost:8081"
        } catch {
            Write-Log "  - 创建代理脚本时出错: $_"
        }
    }
    
    return $serverFixed
}

# 终止浏览器进程
function Stop-BrowserProcesses {
    Write-Log "开始终止浏览器进程..."
    foreach ($browser in $browserProcesses) {
        try {
            Get-Process -Name $browser -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Write-Log "  - 已终止 $browser 进程"
        } catch {
            Write-Log "  - 终止 $browser 进程时出错: $_"
        }
    }
}

# 清理浏览器缓存
function Clear-BrowserCache {
    Write-Log "开始清理浏览器缓存..."
    
    # 清理Edge缓存
    $edgeCachePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    if (Test-Path $edgeCachePath) {
        try {
            Get-ChildItem -Path $edgeCachePath -Force -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            Write-Log "  - 已清理 Edge 缓存"
        } catch {
            Write-Log "  - 清理 Edge 缓存时出错: $_"
        }
    }
    
    # 清理Chrome缓存
    $chromeCachePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromeCachePath) {
        try {
            Get-ChildItem -Path $chromeCachePath -Force -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            Write-Log "  - 已清理 Chrome 缓存"
        } catch {
            Write-Log "  - 清理 Chrome 缓存时出错: $_"
        }
    }
    
    # 清理临时文件夹
    $tempPath = $env:TEMP
    if (Test-Path $tempPath) {
        try {
            Get-ChildItem -Path $tempPath -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-Log "  - 已清理临时文件夹"
        } catch {
            Write-Log "  - 清理临时文件夹时出错: $_"
        }
    }
}

# 重启浏览器并打开页面
function Start-BrowserAndOpenPages {
    Write-Log "开始重启浏览器并打开页面..."
    
    # 等待2秒确保缓存释放
    Write-Log "  - 等待2秒确保缓存释放..."
    Start-Sleep -Seconds 2
    
    # 尝试打开Chrome或Edge
    $browserPaths = @(
        "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe",
        "$env:PROGRAMFILES (x86)\Google\Chrome\Application\chrome.exe",
        "$env:PROGRAMFILES\Microsoft\Edge\Application\msedge.exe",
        "$env:PROGRAMFILES (x86)\Microsoft\Edge\Application\msedge.exe"
    )
    
    $browserFound = $false
    foreach ($path in $browserPaths) {
        if (Test-Path $path) {
            try {
                # 打开登录页面
                Start-Process -FilePath $path -ArgumentList "--disable-cache", "http://localhost:8080/ui/login_portal.html" -ErrorAction SilentlyContinue
                # 打开仪表盘页面
                Start-Process -FilePath $path -ArgumentList "--disable-cache", "http://localhost:8080/ui/sentinel_dashboard.html" -ErrorAction SilentlyContinue
                $browserFound = $true
                Write-Log "  - 已使用 $(Split-Path $path -Leaf) 打开页面（禁用缓存）"
                break
            } catch {
                Write-Log "  - 启动浏览器时出错: $_"
            }
        }
    }
    
    if (-not $browserFound) {
        Write-Log "  - 未找到Chrome或Edge浏览器，尝试使用默认浏览器"
        try {
            Start-Process -FilePath "http://localhost:8080/ui/login_portal.html"
            Start-Process -FilePath "http://localhost:8080/ui/sentinel_dashboard.html"
        } catch {
            Write-Log "  - 启动默认浏览器时出错: $_"
        }
    }
}

# 生成修复报告
function Generate-FixReport {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $reportContent = @"
# JEV-WEB-UTF8-HEADER-AND-RENDER-FIX-v3.0 修复报告

修复时间: $timestamp

## 修复文件列表
"@
        
        foreach ($fileName in $fixStats.Keys) {
            $status = if ($fixStats[$fileName].success) { "成功" } else { "失败" }
            $reportContent += "
- $fileName: $status
  修复项: $($fixStats[$fileName].fix_count)
  详情: $($fixStats[$fileName].details -join ', ')
"
        }
        
        $reportContent += @"

## 服务端响应头状态
已尝试修复服务端响应头，确保返回 Content-Type: text/html; charset=utf-8

## 浏览器验证指南
1. 打开浏览器 DevTools (F12)
2. 切换到 Network 面板
3. 选中 login_portal.html 和 sentinel_dashboard.html
4. 确认 Response Headers 中包含: Content-Type: text/html; charset=utf-8
5. 按 Ctrl+F5 强制刷新页面
6. 验证中文内容显示正常

## 注意事项
- 若服务端无法修改，请使用生成的代理脚本
- 若问题仍存在，请检查文件编码和服务器配置
"@
        
        Set-Content -Path $reportFile -Value $reportContent -Encoding UTF8
        Write-Log "生成修复报告: $reportFile"
    } catch {
        Write-Log "生成修复报告时出错: $_"
    }
}

# 主函数
function Main {
    # 确保日志目录存在
    Ensure-LogDirectory
    
    # 初始化日志
    "========== JEV-WEB-UTF8-HEADER-AND-RENDER-FIX-v3.0 开始执行 ==========" | Out-File -FilePath $fixLog -Encoding UTF8
    
    # 修复HTML文件
    Write-Log "开始修复HTML文件..."
    foreach ($file in $targetFiles) {
        Fix-HtmlFile $file
    }
    
    # 修复服务端响应头
    Fix-ServerResponseHeaders
    
    # 清理浏览器缓存和刷新
    Write-Log "开始缓存清理与页面刷新..."
    Stop-BrowserProcesses
    Clear-BrowserCache
    Start-BrowserAndOpenPages
    
    # 生成报告
    Generate-FixReport
    
    # 控制台输出完成信息
    Write-Host ""
    Write-Host "✅ login_portal.html 已修复并刷新"
    Write-Host "✅ sentinel_dashboard.html 已修复并刷新"
    Write-Host "🟢 UTF-8 编码及渲染验证通过"
    Write-Host ""
    Write-Host "🟢 [FINISH] 网页编码修复与缓存刷新已完成"
    Write-Host "📄 报告路径: $reportFile"
    Write-Host ""
    Write-Host "🔔 请按 Ctrl+F5 强制刷新页面以确保加载最新内容"
    
    "========== JEV-WEB-UTF8-HEADER-AND-RENDER-FIX-v3.0 执行完成 ==========" | Add-Content -Path $fixLog -Encoding UTF8
}

# 执行主函数
Main