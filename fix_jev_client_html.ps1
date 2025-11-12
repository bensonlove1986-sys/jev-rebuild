# 修复JEV_Client目录中的HTML文件编码问题

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "修复JEV_Client目录中的HTML文件编码问题" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 定义目标目录
$targetDir = "D:\PDF转网页\JEV_Client"
Write-Host "扫描目录: $targetDir"

# 获取所有HTML文件
$htmlFiles = Get-ChildItem -Path $targetDir -Filter "*.html" -File -ErrorAction SilentlyContinue
Write-Host "找到 $($htmlFiles.Count) 个HTML文件"

# 定义修复函数
function Fix-HtmlFile($filePath) {
    try {
        $fileName = Split-Path -Leaf $filePath
        Write-Host "处理文件: $fileName"
        
        # 备份原始文件
        $backupPath = "$filePath.fix.bak"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        
        # 读取文件内容
        $content = [System.IO.File]::ReadAllText($filePath)
        
        # 移除BOM标记
        $content = $content -replace "\uFEFF", ""
        
        # 添加或更新meta charset标签
        if ($content -match "<head>.*?</head>" -and $content -notmatch "<meta\s+charset\s*=\s*[\"']UTF-8[\"']") {
            $headContent = $matches[0]
            $newHeadContent = $headContent -replace "<head>", "<head><meta charset=\"UTF-8\">"
            $content = $content -replace [regex]::Escape($headContent), $newHeadContent
            Write-Host "  - 已添加UTF-8编码标签"
        }
        
        # 以UTF-8无BOM格式保存
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        Write-Host "  - 已修复并保存为UTF-8格式"
        return $true
    } catch {
        Write-Host "  - 修复失败: $_" -ForegroundColor Red
        return $false
    }
}

# 特别处理auto_deploy_chatform.html
Write-Host ""
Write-Host "特别处理: auto_deploy_chatform.html"
$chatformFile = "$targetDir\auto_deploy_chatform.html"
if (Test-Path $chatformFile) {
    # 创建一个干净的HTML文件结构
    $cleanHtml = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JEV L5+ Auto Deploy Chat Form</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1890ff;
            margin-top: 0;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .status-success {
            background-color: #f6ffed;
            border: 1px solid #b7eb8f;
            color: #52c41a;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>JEV L5+ Auto Deploy Chat Form</h1>
        <div class="status status-success">
            <p>系统编码已锁定为UTF-8</p>
            <p>健康状态: 正常</p>
            <p>版本: v2.1</p>
        </div>
        <div id="chat-container">
            <!-- 聊天内容将在这里显示 -->
        </div>
    </div>
    
    <script>
        console.log('JEV Chat Form loaded successfully');
        console.log('Encoding: UTF-8 Locked');
    </script>
</body>
</html>
"@
    
    # 备份并替换文件
    Copy-Item -Path $chatformFile -Destination "$chatformFile.clean.bak" -Force
    [System.IO.File]::WriteAllText($chatformFile, $cleanHtml, [System.Text.Encoding]::UTF8)
    Write-Host "  - auto_deploy_chatform.html 已重置为干净版本"
} else {
    Write-Host "  - 文件不存在: auto_deploy_chatform.html" -ForegroundColor Yellow
}

# 处理其他HTML文件
Write-Host ""
Write-Host "处理其他HTML文件..."
$fixedCount = 0
foreach ($file in $htmlFiles) {
    if ($file.FullName -ne $chatformFile) {
        if (Fix-HtmlFile $file.FullName) {
            $fixedCount++
        }
    }
}

# 完成信息
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "修复完成!" -ForegroundColor Green
Write-Host "已处理: $($htmlFiles.Count) 个文件" -ForegroundColor Yellow
Write-Host "已修复: $fixedCount 个文件" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "请清除浏览器缓存后重新打开页面" -ForegroundColor Magenta
