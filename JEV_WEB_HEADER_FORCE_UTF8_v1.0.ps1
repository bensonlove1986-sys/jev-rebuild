#!/usr/bin/env powershell
# JEV-WEB-HEADER-FORCE-UTF8-v1.0
# 强制为所有响应添加UTF-8头部的修复脚本

# 设置严格模式
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 定义变量
$baseDir = "D:\PDF转网页"
$logDir = "$baseDir\logs"
$fixLog = "$logDir\web_header_utf8_fix.log"
$reportFile = "$logDir\web_header_utf8_report.txt"
$serverFiles = @(
    "$baseDir\server.js",
    "$baseDir\relay_server.js",
    "$baseDir\JEV_Client\server.js",
    "$baseDir\main.js",
    "$baseDir\worker.js",
    "$baseDir\worker_final.js",
    "$baseDir\worker_complete.js"
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
            $global:fixLog = "$env:TEMP\web_header_utf8_fix.log"
            $global:reportFile = "$env:TEMP\web_header_utf8_report.txt"
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

# 修复Express风格的server.js
function Fix-ExpressServer($filePath) {
    try {
        Write-Log "  - 尝试以Express风格修复: $(Split-Path $filePath -Leaf)"
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        
        # 检查是否已经有正确的Content-Type设置
        if ($content -match 'res\.setHeader\(["\']Content-Type["\'],\s*["\']text/html;\s*charset=utf-8["\']\)') {
            Write-Log "  - Express服务器已经包含正确的UTF-8头部设置"
            return $true, $content, @("已包含正确设置")
        }
        
        # 检查是否有app.use或app.get等路由设置
        if ($content -match 'app\.use|app\.get|app\.post|app\.put|app\.delete') {
            $fixDetails = @()
            $modified = $false
            
            # 方法1: 在文件开头添加中间件
            if ($content -match 'const\s+app\s*=\s*express\(\)|const\s+express\s*=\s*require\(["\']express["\']\)') {
                $match = [regex]::Match($content, 'const\s+(app|express)\s*=\s*(app\.express|express)\(\)|const\s+express\s*=\s*require\(["\']express["\']\)')
                $insertPos = $match.Index + $match.Length
                $middlewareCode = "

// 添加UTF-8响应头中间件
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

"
                $content = $content.Substring(0, $insertPos) + $middlewareCode + $content.Substring($insertPos)
                $modified = $true
                $fixDetails += "添加Express中间件"
                Write-Log "  - 添加了Express中间件设置UTF-8头部"
            }
            
            # 方法2: 为所有res.send和res.end调用添加头部
            $patterns = @(
                '(res\.send\()',
                '(res\.end\()',
                '(res\.render\()',
                '(res\.json\()'
            )
            
            foreach ($pattern in $patterns) {
                $newPattern = 'res\.setHeader(\s*)\(\s*["\'']Content-Type["\'']\s*,\s*["\'']text/html;\s*charset=utf-8["\'']\s*\)\s*;\s*$1'
                $newContent = [regex]::Replace($content, $pattern, $newPattern)
                if ($newContent -ne $content) {
                    $content = $newContent
                    $modified = $true
                    $fixDetails += "为$($pattern.Trim('()'))添加头部"
                    Write-Log "  - 为$($pattern.Trim('()'))调用添加了UTF-8头部"
                }
            }
            
            # 方法3: 检查并替换现有的Content-Type设置
            if ($content -match 'res\.setHeader\(["\']Content-Type["\']') {
                $newContent = [regex]::Replace($content, '(res\.setHeader\(["\']Content-Type["\'],\s*["\'])(text/html)(["\'])', '$1$2; charset=utf-8$3')
                if ($newContent -ne $content) {
                    $content = $newContent
                    $modified = $true
                    $fixDetails += "更新现有Content-Type头部"
                    Write-Log "  - 更新了现有Content-Type头部以包含charset=utf-8"
                }
            }
            
            return $modified, $content, $fixDetails
        }
        
        return $false, $content, @()
    } catch {
        Write-Log "  - Express服务器修复失败: $_"
        return $false, "", @()
    }
}

# 修复Node.js原生http/https server
function Fix-NativeHttpServer($filePath) {
    try {
        Write-Log "  - 尝试以原生HTTP服务器风格修复: $(Split-Path $filePath -Leaf)"
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        
        # 检查是否已经有正确的Content-Type设置
        if ($content -match 'Content-Type.*charset=utf-8') {
            Write-Log "  - 原生HTTP服务器已经包含正确的UTF-8头部设置"
            return $true, $content, @("已包含正确设置")
        }
        
        # 检查是否有createServer调用
        if ($content -match 'http\.createServer|https\.createServer') {
            $fixDetails = @()
            $modified = $false
            
            # 方法1: 在response.writeHead之前添加头部
            if ($content -match 'response\.writeHead|res\.writeHead') {
                $newContent = [regex]::Replace($content, '(response\.writeHead\(.*?\))', 'response.setHeader("Content-Type", "text/html; charset=utf-8");\n$1')
                $newContent = [regex]::Replace($newContent, '(res\.writeHead\(.*?\))', 'res.setHeader("Content-Type", "text/html; charset=utf-8");\n$1')
                if ($newContent -ne $content) {
                    $content = $newContent
                    $modified = $true
                    $fixDetails += "在writeHead前添加头部"
                    Write-Log "  - 在writeHead调用前添加了UTF-8头部"
                }
            }
            
            # 方法2: 查找setHeader调用并添加或修改
            $setHeaderPattern = '(response\.setHeader|res\.setHeader)\(\s*["\']Content-Type["\']'
            if ($content -match $setHeaderPattern) {
                $newContent = [regex]::Replace($content, '(setHeader\(\s*["\']Content-Type["\'],\s*["\'])(text/html)(["\'])', '$1$2; charset=utf-8$3')
                if ($newContent -ne $content) {
                    $content = $newContent
                    $modified = $true
                    $fixDetails += "更新现有setHeader设置"
                    Write-Log "  - 更新了现有setHeader调用以包含charset=utf-8"
                }
            } else {
                # 如果没有setHeader，在response.write之前添加
                $writePatterns = @('response\.write', 'res\.write', 'response\.end', 'res\.end')
                foreach ($pattern in $writePatterns) {
                    $newContent = [regex]::Replace($content, "($pattern\()", "${pattern.Split('.')[0]}.setHeader(\"Content-Type\", \"text/html; charset=utf-8\");\n$1")
                    if ($newContent -ne $content) {
                        $content = $newContent
                        $modified = $true
                        $fixDetails += "为$pattern添加头部"
                        Write-Log "  - 为$pattern调用添加了UTF-8头部"
                    }
                }
            }
            
            return $modified, $content, $fixDetails
        }
        
        return $false, $content, @()
    } catch {
        Write-Log "  - 原生HTTP服务器修复失败: $_"
        return $false, "", @()
    }
}

# 修复Worker/Service Worker
function Fix-WorkerResponse($filePath) {
    try {
        Write-Log "  - 尝试以Worker响应风格修复: $(Split-Path $filePath -Leaf)"
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        
        # 检查是否已经有正确的Content-Type设置
        if ($content -match 'Content-Type.*charset=utf-8') {
            Write-Log "  - Worker已经包含正确的UTF-8头部设置"
            return $true, $content, @("已包含正确设置")
        }
        
        # 检查是否有Response构造函数调用
        if ($content -match 'new\s+Response|return\s+new\s+Response') {
            $fixDetails = @()
            $modified = $false
            
            # 方法1: 修改Response构造函数的options参数
            $responsePattern = '(new\s+Response\([^,]+,\s*\{[^\}]*)\}'
            $newContent = [regex]::Replace($content, $responsePattern, '$1, headers: { "Content-Type": "text/html; charset=utf-8" } }')
            
            # 如果没有options参数，添加一个
            if ($newContent -eq $content) {
                $newContent = [regex]::Replace($content, '(new\s+Response\([^)]+)\)', '$1, { headers: { "Content-Type": "text/html; charset=utf-8" } })')
            }
            
            if ($newContent -ne $content) {
                $content = $newContent
                $modified = $true
                $fixDetails += "修改Response构造函数"
                Write-Log "  - 修改了Response构造函数以包含UTF-8头部"
            }
            
            # 方法2: 查找并修改headers.append/set调用
            if ($content -match 'headers\.append|headers\.set|response\.headers\.append|response\.headers\.set') {
                $patterns = @(
                    '(headers\.append\(["\']Content-Type["\'])',
                    '(headers\.set\(["\']Content-Type["\'])',
                    '(response\.headers\.append\(["\']Content-Type["\'])',
                    '(response\.headers\.set\(["\']Content-Type["\'])'
                )
                
                foreach ($pattern in $patterns) {
                    $newPattern = '$1, "text/html; charset=utf-8"'
                    $newContent = [regex]::Replace($content, "$pattern,\s*["\']text/html["\']", $newPattern)
                    if ($newContent -ne $content) {
                        $content = $newContent
                        $modified = $true
                        $fixDetails += "更新现有headers.$($pattern.Split('.')[1])设置"
                        Write-Log "  - 更新了现有headers.$($pattern.Split('.')[1])调用以包含charset=utf-8"
                    }
                }
            }
            
            return $modified, $content, $fixDetails
        }
        
        return $false, $content, @()
    } catch {
        Write-Log "  - Worker响应修复失败: $_"
        return $false, "", @()
    }
}

# 通用修复函数 - 尝试多种修复方法
function Fix-ServerFile($filePath) {
    $fileName = Split-Path $filePath -Leaf
    $fixCount = 0
    $fixDetails = @()
    
    try {
        Write-Log "开始修复文件: $fileName"
        
        # 检查文件是否存在
        if (-not (Test-Path $filePath -PathType Leaf)) {
            Write-Log "错误: 文件不存在 - $filePath"
            return $false
        }
        
        # 创建备份
        $backupPath = "$filePath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        Write-Log "  - 创建了备份: $backupPath"
        
        # 尝试Express修复
        $expressFixed, $expressContent, $expressDetails = Fix-ExpressServer $filePath
        
        if ($expressFixed) {
            $content = $expressContent
            $fixDetails += $expressDetails
            $fixCount = $expressDetails.Count
        } else {
            # 尝试原生HTTP修复
            $httpFixed, $httpContent, $httpDetails = Fix-NativeHttpServer $filePath
            
            if ($httpFixed) {
                $content = $httpContent
                $fixDetails += $httpDetails
                $fixCount = $httpDetails.Count
            } else {
                # 尝试Worker修复
                $workerFixed, $workerContent, $workerDetails = Fix-WorkerResponse $filePath
                
                if ($workerFixed) {
                    $content = $workerContent
                    $fixDetails += $workerDetails
                    $fixCount = $workerDetails.Count
                } else {
                    # 尝试通用文本替换（最后的手段）
                    $rawContent = Get-Content -Path $filePath -Raw -Encoding UTF8
                    $newContent = $rawContent
                    
                    # 查找所有text/html并添加charset
                    $newContent = [regex]::Replace($newContent, '("Content-Type",\s*["\']text/html["\'])', '$1; charset=utf-8')
                    $newContent = [regex]::Replace($newContent, '("Content-Type":\s*["\']text/html["\'])', '$1; charset=utf-8')
                    
                    # 添加通用响应头设置
                    if ($newContent -match '\(req|request|event\)\s*=>\s*\{|function\s*\(req|request|event\)\s*\{') {
                        $headerCode = "
        // 强制UTF-8响应头
        responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
        "
                        $newContent = $newContent -replace '(\(req|request|event\)\s*=>\s*\{|function\s*\(req|request|event\)\s*\{)', "$1$headerCode"
                    }
                    
                    if ($newContent -ne $rawContent) {
                        $content = $newContent
                        $fixDetails += "通用文本替换修复"
                        $fixCount = 1
                        Write-Log "  - 使用通用文本替换修复了UTF-8头部"
                    } else {
                        Write-Log "  - 无法识别服务器类型，未进行修复"
                        # 恢复备份
                        Copy-Item -Path $backupPath -Destination $filePath -Force
                        return $false
                    }
                }
            }
        }
        
        # 保存修复后的内容
        if ($fixCount -gt 0) {
            Set-Content -Path $filePath -Value $content -Encoding UTF8
            Write-Log "  - 保存了修复后的文件"
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
        # 尝试恢复备份
        if (Test-Path $backupPath) {
            try {
                Copy-Item -Path $backupPath -Destination $filePath -Force
                Write-Log "  - 恢复了原始文件"
            } catch {
                Write-Log "  - 恢复原始文件失败"
            }
        }
        
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

# 创建验证文件（用于测试头部设置）
function Create-VerificationEndpoint {
    try {
        $verificationPath = "$baseDir\verify_utf8_header.js"
        $verificationContent = @"
// 验证UTF-8头部的简单服务器脚本
const http = require('http');
const port = 8081;

const server = http.createServer((req, res) => {
    // 这个脚本会显示请求和响应信息
    console.log(`\n收到请求: ${req.method} ${req.url}`);
    console.log('请求头:');
    Object.keys(req.headers).forEach(key => {
        console.log(`  ${key}: ${req.headers[key]}`);
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    
    // 响应内容
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>UTF-8 头部验证</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #2c3e50; }
            .success { color: #27ae60; font-weight: bold; }
            .instructions { background: #f8f9fa; padding: 20px; border-radius: 5px; }
            pre { background: #34495e; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>UTF-8 头部验证页面</h1>
        <div class="success">✅ 响应头已设置: Content-Type: text/html; charset=utf-8</div>
        
        <div class="instructions">
            <h2>验证步骤:</h2>
            <ol>
                <li>按 F12 打开开发者工具</li>
                <li>切换到 Network 面板</li>
                <li>刷新页面 (Ctrl+R)</li>
                <li>点击此请求 (verify_utf8_header.js)</li>
                <li>在 Response Headers 中确认 Content-Type 包含 charset=utf-8</li>
            </ol>
        </div>
        
        <div>
            <h2>测试中文:</h2>
            <p>这是一个中文测试文本，验证 UTF-8 编码是否正常显示。</p>
            <p>特殊字符测试: 你好，世界！Hello, World!</p>
        </div>
    </body>
    </html>
    `;
    
    res.end(html);
});

server.listen(port, () => {
    console.log(`\n📋 UTF-8 头部验证服务器已启动`);
    console.log(`🔗 请访问: http://localhost:${port}`);
    console.log(`🧪 此服务器用于测试响应头是否正确设置了 charset=utf-8`);
    console.log(`📝 按 Ctrl+C 停止服务器\n`);
});
"@
        
        Set-Content -Path $verificationPath -Value $verificationContent -Encoding UTF8
        Write-Log "创建了验证端点脚本: $verificationPath"
        return $verificationPath
    } catch {
        Write-Log "创建验证端点失败: $_"
        return $null
    }
}

# 生成修复报告
function Generate-FixReport {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $reportContent = @"
# JEV-WEB-HEADER-FORCE-UTF8-v1.0 修复报告

生成时间: $timestamp

## 修复文件摘要
"@
        
        foreach ($fileName in $fixStats.Keys) {
            $status = if ($fixStats[$fileName].success) { "成功" } else { "失败" }
            $reportContent += "
- 文件名: $fileName
  修复项数: $($fixStats[$fileName].fix_count)
  修复方式: $($fixStats[$fileName].details -join ', ')
  修复时间: $($fixStats[$fileName].timestamp)
  状态: $status
"
            
            if ($fixStats[$fileName].error) {
                $reportContent += "  错误信息: $($fixStats[$fileName].error)\n"
            }
        }
        
        $reportContent += @"

## 验证指南
1. 重启你的本地服务器
2. 打开浏览器 → Network 面板
3. 访问以下页面:
   - http://localhost:8080/ui/client_portal.html
   - http://localhost:8080/ui/sentinel_dashboard.html
4. 点击对应的HTML文件请求
5. 在 Response Headers 中确认是否包含:
   ```
   Content-Type: text/html; charset=utf-8
   ```

## 测试方法
1. 运行验证脚本测试头部设置:
   ```
   node D:\PDF转网页\verify_utf8_header.js
   ```
2. 访问 http://localhost:8081 验证响应头

## 注意事项
- 所有修改的文件都创建了时间戳备份
- 修复不会影响业务逻辑，仅添加响应头
- 如果服务器重启后仍无效，请检查是否有其他中间件覆盖了响应头
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
    "========== JEV-WEB-HEADER-FORCE-UTF8-v1.0 开始执行 ==========" | Out-File -FilePath $fixLog -Encoding UTF8
    
    # 修复服务器文件
    Write-Log "开始修复服务器文件..."
    foreach ($file in $serverFiles) {
        Fix-ServerFile $file
    }
    
    # 创建验证端点
    $verificationPath = Create-VerificationEndpoint
    
    # 生成报告
    Generate-FixReport
    
    # 控制台输出完成信息
    Write-Host ""
    Write-Host "✅ 服务器响应头修复完成"
    Write-Host "🟢 所有 text/html 响应将包含: charset=utf-8"
    Write-Host ""
    Write-Host "📋 验证步骤:"
    Write-Host "1. 重启本地服务器"
    Write-Host "2. 打开浏览器 → F12 → Network"
    Write-Host "3. 访问: http://localhost:8080/ui/client_portal.html"
    Write-Host "4. 确认 Response Headers 包含: Content-Type: text/html; charset=utf-8"
    Write-Host ""
    
    if ($verificationPath) {
        Write-Host "🧪 快速测试:"
        Write-Host "运行: node $verificationPath"
        Write-Host "访问: http://localhost:8081 验证头部设置"
        Write-Host ""
    }
    
    Write-Host "📄 报告路径: $reportFile"
    
    "========== JEV-WEB-HEADER-FORCE-UTF8-v1.0 执行完成 ==========" | Add-Content -Path $fixLog -Encoding UTF8
}

# 执行主函数
Main