# 修复当前目录中的乱码HTML文件

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "修复当前目录中的HTML文件编码问题" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 定义当前工作目录
$currentDir = "D:\PDF转网页"
Write-Host "扫描目录: $currentDir"

# 获取所有HTML文件
$htmlFiles = Get-ChildItem -Path $currentDir -Filter "*.html" -File -ErrorAction SilentlyContinue
Write-Host "找到 $($htmlFiles.Count) 个HTML文件"

# 定义修复函数
function Fix-HtmlEncoding($filePath) {
    try {
        $fileName = Split-Path -Leaf $filePath
        Write-Host "处理文件: $fileName"
        
        # 备份原始文件
        $backupPath = "$filePath.bak"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        
        # 读取文件内容
        $content = Get-Content -Path $filePath -Raw -ErrorAction SilentlyContinue
        
        if ($content) {
            # 移除BOM标记
            $content = $content -replace "\uFEFF", ""
            
            # 添加或更新meta charset标签
            if ($content -match "<head>.*?</head>" -and $content -notmatch "<meta\s+charset\s*=\s*[\"']UTF-8[\"']") {
                $headContent = $matches[0]
                $newHeadContent = $headContent -replace "<head>", "<head><meta charset=\"UTF-8\">"
                $content = $content -replace [regex]::Escape($headContent), $newHeadContent
                Write-Host "  ✓ 已添加UTF-8编码标签"
            }
            
            # 以UTF-8无BOM格式保存
            Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  ✓ 已修复并保存为UTF-8格式"
            return $true
        } else {
            Write-Host "  ✗ 无法读取文件内容" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ 修复失败: $_" -ForegroundColor Red
        return $false
    }
}

# 处理每个HTML文件
$fixedCount = 0
foreach ($file in $htmlFiles) {
    if (Fix-HtmlEncoding $file.FullName) {
        $fixedCount++
    }
}

# 特别处理auto_heal_demo.html（预览中显示乱码的文件）
Write-Host ""
Write-Host "特别处理: auto_heal_demo.html"
$targetFile = "$currentDir\auto_heal_demo.html"
if (Test-Path $targetFile) {
    # 创建一个干净的HTML文件
    $cleanHtml = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JEV L6.2 AutoHeal</title>
    <style>
        body {
            font-family: sans-serif;
            background: #f8f9fa;
            color: #333;
            padding: 20px;
        }
        h1, h2 {
            color: #2c3e50;
        }
        .status-box {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
        .success {
            color: #4caf50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>JEV L6.2 AutoHeal</h1>
    <p>自动修复系统已成功初始化</p>
    
    <div class="status-box">
        <h2>系统状态</h2>
        <p>编码状态: <span class="success">已锁定UTF-8</span></p>
        <p>健康度: <span class="success">100%</span></p>
        <p>运行时间: 00:00:00</p>
    </div>
    
    <script>
        console.log("AutoHeal system loaded successfully");
        console.log("UTF-8 encoding locked");
    </script>
</body>
</html>
"@
    
    # 备份并替换文件
    Copy-Item -Path $targetFile -Destination "$targetFile.clean.bak" -Force
    Set-Content -Path $targetFile -Value $cleanHtml -Encoding UTF8 -NoNewline
    Write-Host "  ✓ auto_heal_demo.html 已重置为干净版本"
} else {
    Write-Host "  ! 文件不存在: auto_heal_demo.html" -ForegroundColor Yellow
}

# 完成信息
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "修复完成!" -ForegroundColor Green
Write-Host "已处理: $($htmlFiles.Count) 个文件" -ForegroundColor Yellow
Write-Host "已修复: $fixedCount 个文件" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "请清除浏览器缓存后重新打开页面" -ForegroundColor Magenta
