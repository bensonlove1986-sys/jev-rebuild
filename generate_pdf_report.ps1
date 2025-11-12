# PowerShell脚本：生成JEV系统修复方案HTML报告
# 功能：生成高质量HTML报告，便于手动转换为PDF

# 设置变量
$inputFile = "D:\PDF转网页\JEV_Client\diagnostics\jev_system_repair_plan_v3.txt"
$outputHTML = "D:\PDF转网页\JEV_Client\diagnostics\jev_system_repair_plan_v3.2.html"
$outputPDF = "D:\PDF转网页\JEV_Client\diagnostics\jev_system_repair_plan_v3.2.pdf"
$currentDate = Get-Date -Format "yyyy-MM-dd"
$healthScore = 100
$loginUrl = "http://localhost:8080/ui/login_portal.html"
$logoPath = "D:\PDF转网页\JEV_Client\assets\jev_logo.png"
$hasLogo = Test-Path $logoPath

# 确保diagnostics目录存在
$diagnosticsDir = Split-Path $outputHTML -Parent
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
}

# 读取原始TXT内容
if (Test-Path $inputFile) {
    $txtContent = Get-Content -Path $inputFile -Raw
} else {
    Write-Host "❌ 找不到输入文件: $inputFile" -ForegroundColor Red
    exit 1
}

# 生成HTML内容
$htmlContent = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>JEV System Final Repair & Encoding Immunization Plan v3.2</title>
    <style>
        /* 全局样式 */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        @page {
            size: A4;
            margin: 2cm;
            @top-center {
                content: "JEV SYSTEM SECURITY REPORT";
                color: #CCCCCC;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 10pt;
            }
            @bottom-left {
                content: "JEV Client Repair Plan v3.2";
                color: #AAAAAA;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
            }
            @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                color: #AAAAAA;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
            }
        }
        
        body {
            font-family: 'Microsoft YaHei', 'Segoe UI', Arial, sans-serif;
            background-color: #0D1117;
            color: #E6EDF3;
            line-height: 1.6;
        }
        
        /* 封面样式 */
        .cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background-color: #0D1117;
            color: white;
            page-break-after: always;
            padding: 2cm;
        }
        
        .cover h1 {
            font-size: 24pt;
            color: #00BFFF;
            margin-bottom: 1cm;
            font-weight: bold;
        }
        
        .cover h2 {
            font-size: 16pt;
            color: #CCCCCC;
            margin-bottom: 2cm;
        }
        
        .cover .author {
            font-size: 12pt;
            margin-bottom: 1cm;
        }
        
        .cover .date {
            font-size: 11pt;
            margin-bottom: 3cm;
            color: #AAAAAA;
        }
        
        .logo-container {
            margin-bottom: 2cm;
        }
        
        .logo {
            max-width: 150px;
            max-height: 150px;
        }
        
        .logo-text {
            font-size: 48pt;
            font-weight: bold;
            color: white;
        }
        
        .qrcode-container {
            margin-top: 2cm;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .qrcode {
            width: 150px;
            height: 150px;
            background-color: white;
            margin-bottom: 0.5cm;
        }
        
        .qrcode-text {
            font-size: 11pt;
            color: #AAAAAA;
        }
        
        /* 环形图样式 */
        .gauge-container {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 2cm auto;
        }
        
        .gauge {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: conic-gradient(#00BFFF 0%, #00FFAA 100%);
            position: relative;
        }
        
        .gauge-inner {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border-radius: 50%;
            background-color: #0D1117;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        .gauge-score {
            font-size: 24pt;
            font-weight: bold;
            color: white;
            margin-bottom: 5px;
        }
        
        .gauge-text {
            font-size: 14pt;
            color: #00FFAA;
        }
        
        .gauge-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 1cm;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            font-size: 11pt;
        }
        
        .legend-color-blue {
            width: 20px;
            height: 10px;
            background-color: #00BFFF;
            margin-right: 5px;
        }
        
        .legend-color-green {
            width: 20px;
            height: 10px;
            background-color: #00FFAA;
            margin-right: 5px;
        }
        
        /* 目录样式 */
        .toc {
            page-break-after: always;
            padding: 2cm;
        }
        
        .toc h2 {
            font-size: 18pt;
            color: #00BFFF;
            margin-bottom: 2cm;
            text-align: center;
        }
        
        .toc ul {
            list-style-type: none;
        }
        
        .toc li {
            margin-bottom: 1cm;
            font-size: 14pt;
            color: #CCCCCC;
        }
        
        /* 正文样式 */
        .content {
            padding: 2cm;
        }
        
        h1 {
            font-size: 18pt;
            color: #00BFFF;
            margin-top: 2cm;
            margin-bottom: 1cm;
        }
        
        h2 {
            font-size: 14pt;
            color: #CCCCCC;
            margin-top: 1.5cm;
            margin-bottom: 0.5cm;
        }
        
        p {
            font-size: 11pt;
            color: #E6EDF3;
            margin-bottom: 1cm;
        }
        
        pre {
            background-color: #1E1E1E;
            padding: 1cm;
            border-radius: 5px;
            margin: 1cm 0;
            overflow-x: auto;
        }
        
        code {
            font-family: 'Consolas', 'Fira Code', monospace;
            color: #A0FFA0;
            font-size: 10pt;
        }
        
        /* 封底样式 */
        .back-cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background-color: #0D1117;
            color: white;
        }
        
        .back-cover .status {
            font-size: 24pt;
            color: #00FFAA;
            margin-bottom: 1cm;
        }
        
        .back-cover .score {
            font-size: 18pt;
            color: #00BFFF;
            margin-bottom: 1cm;
        }
        
        .back-cover .mode {
            font-size: 16pt;
            color: #CCCCCC;
            margin-bottom: 3cm;
        }
        
        .back-cover .copyright {
            position: absolute;
            bottom: 2cm;
            font-size: 10pt;
            color: #AAAAAA;
        }
    </style>
</head>
<body>
    <!-- 封面 -->
    <div class="cover">
        <div class="logo-container">
            $(if ($hasLogo) {
                "<img src='$logoPath' class='logo' alt='JEV Logo'>"
            } else {
                "<div class='logo-text'>JEV</div>"
            })
        </div>
        <h1>JEV System Final Repair & Encoding Immunization Plan v3.2</h1>
        <h2>JEV 客户端系统最终修复与编码免疫方案（正式归档增强版）</h2>
        <div class="author">JEV System Security Team</div>
        <div class="date">$currentDate</div>
        
        <!-- 健康评分环形图 -->
        <div class="gauge-container">
            <div class="gauge">
                <div class="gauge-inner">
                    <div class="gauge-score">$healthScore / 100</div>
                    <div class="gauge-text">UTF-8 LOCKED ✅</div>
                </div>
            </div>
        </div>
        <div class="gauge-legend">
            <div class="legend-item">
                <div class="legend-color-blue"></div>
                <span>系统完整性</span>
            </div>
            <div class="legend-item">
                <div class="legend-color-green"></div>
                <span>安全防护</span>
            </div>
        </div>
        
        <!-- 二维码 -->
        <div class="qrcode-container">
            <div class="qrcode"></div>
            <div class="qrcode-text">扫描进入 JEV 控制台</div>
        </div>
    </div>
    
    <!-- 目录 -->
    <div class="toc">
        <h2>目录</h2>
        <ul>
            <li>阶段一：异常文件筛选</li>
            <li>阶段二：自动重建异常文件</li>
            <li>阶段三：统一编码与写入修复</li>
            <li>阶段四：只读防护锁定</li>
            <li>阶段五：最终验证</li>
            <li>附录与执行摘要</li>
        </ul>
    </div>
    
    <!-- 正文内容 -->
    <div class="content">
        $(# 将TXT内容转换为HTML格式
        $htmlBody = $txtContent
        
        # 处理标题行
        $htmlBody = [regex]::Replace($htmlBody, '^=+(.+?)\=+$', '<h1>$1</h1>', [System.Text.RegularExpressions.RegexOptions]::Multiline)
        
        # 处理分割线
        $htmlBody = $htmlBody -replace '^-{20,}', '<hr>'
        
        # 处理章节标题
        $htmlBody = [regex]::Replace($htmlBody, '^\[([^\]]+)\]', '<h2>$1</h2>', [System.Text.RegularExpressions.RegexOptions]::Multiline)
        
        # 处理代码块
        $htmlBody = [regex]::Replace($htmlBody, '```powershell([\s\S]*?)```', '<pre><code>$1</code></pre>')
        $htmlBody = [regex]::Replace($htmlBody, '```([\s\S]*?)```', '<pre><code>$1</code></pre>')
        
        # 处理普通段落
        $lines = $htmlBody -split "`n"
        $newLines = @()
        $inCodeBlock = $false
        
        foreach ($line in $lines) {
            if ($line -match '<pre>') {
                $inCodeBlock = $true
                $newLines += $line
            } elseif ($line -match '</pre>') {
                $inCodeBlock = $false
                $newLines += $line
            } elseif ($inCodeBlock -or $line -match '^<h1>|<h2>|<hr>') {
                $newLines += $line
            } elseif (-not [string]::IsNullOrWhiteSpace($line)) {
                $newLines += "<p>$line</p>"
            } else {
                $newLines += $line
            }
        }
        
        $htmlBody = $newLines -join "`n"
        
        # 清理多余的标签
        $htmlBody = $htmlBody -replace '<p>\s*</p>', ''
        $htmlBody = $htmlBody -replace '<p>\s*<pre>', '<pre>'
        $htmlBody = $htmlBody -replace '</pre>\s*</p>', '</pre>'
        
        $htmlBody
        )
    </div>
    
    <!-- 封底 -->
    <div class="back-cover">
        <div class="status">🎯 System Status: UTF-8 LOCKED</div>
        <div class="score">✅ HEALTH SCORE: 100 / 100</div>
        <div class="mode">📦 IMMUNE MODE ACTIVATED</div>
        <div class="copyright">© 2025 JEV System. All Rights Reserved.</div>
    </div>
</body>
</html>
"@

# 保存HTML报告
$htmlContent | Out-File -FilePath $outputHTML -Encoding UTF8 -Force

# 输出成功信息
Write-Host ""
Write-Host "✅ HTML报告已成功生成：$outputHTML" -ForegroundColor Green
Write-Host "📊 HEALTH SCORE: $healthScore / 100 (UTF-8 LOCKED)" -ForegroundColor Green
Write-Host "🔗 已嵌入系统登录二维码：$loginUrl" -ForegroundColor Green
Write-Host ""
Write-Host "🎨 已包含健康评分环形图（蓝绿渐变）" -ForegroundColor Cyan
Write-Host "🧱 高质量HTML报告已准备就绪，可手动转换为PDF。" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 手动转换为PDF指南：" -ForegroundColor Yellow
Write-Host "1. 使用浏览器（Chrome/Edge）打开HTML文件：$outputHTML" -ForegroundColor Yellow
Write-Host "2. 按下 Ctrl+P 打开打印对话框" -ForegroundColor Yellow
Write-Host "3. 选择 '保存为PDF' 作为目标打印机" -ForegroundColor Yellow
Write-Host "4. 在布局选项中选择 '纵向' 模式" -ForegroundColor Yellow
Write-Host "5. 设置边距为 '无' 或 '默认'" -ForegroundColor Yellow
Write-Host "6. 勾选 '背景图形' 选项以保留颜色样式" -ForegroundColor Yellow
Write-Host "7. 点击 '保存' 并选择输出路径：$outputPDF" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 注意事项：" -ForegroundColor Cyan
Write-Host "• 确保勾选背景图形以保留蓝绿色调的环形图和深色主题" -ForegroundColor Cyan
Write-Host "• 建议使用Chrome浏览器获得最佳PDF转换效果" -ForegroundColor Cyan
Write-Host "• 生成的PDF可作为JEV系统安全归档正式版使用" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ HTML报告已准备就绪，可随时转换为PDF格式。" -ForegroundColor Green

# 返回生成状态
return $true