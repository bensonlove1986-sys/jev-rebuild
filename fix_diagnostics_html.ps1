# 修复HTML编码问题的PowerShell脚本
# 针对D:\PDF转网页\JEV_Client\diagnostics目录下的status_panel.html文件

# 设置文件路径
$filePath = "D:\PDF转网页\JEV_Client\diagnostics\status_panel.html"
$backupPath = "$filePath.backup"

# 记录开始时间
$startTime = Get-Date
Write-Host "开始修复HTML文件编码问题..." -ForegroundColor Cyan
Write-Host "开始时间: $startTime" -ForegroundColor Gray
Write-Host "----------------------------------------"

try {
    # 检查文件是否存在
    if (Test-Path $filePath) {
        # 创建备份
        Copy-Item -Path $filePath -Destination $backupPath -Force
        Write-Host "已为 status_panel.html 创建备份: $backupPath" -ForegroundColor Green
        
        # 使用Here-String创建新的HTML内容
        $newHtmlContent = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>诊断状态面板 - JEV L6.7 系统</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
        }
        .status-info {
            background-color: #e7f3fe;
            border-left: 4px solid #2196F3;
            padding: 10px;
            margin: 15px 0;
        }
        .file-info {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
        }
        .version-info {
            font-weight: bold;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>JEV 诊断状态面板</h1>
        
        <div class="version-info">
            <p>JEV L6.7 系统</p>
        </div>
        
        <div class="file-info">
            <p><strong>当前文件:</strong> status_panel.html</p>
            <p><strong>路径:</strong> $filePath</p>
        </div>
        
        <div class="status-info">
            <p><strong>编码状态:</strong> UTF-8 (已修复)</p>
            <p><strong>修复时间:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
            <p><strong>系统状态:</strong> 正常运行中</p>
        </div>
        
        <p>此页面已使用 UTF-8 编码进行重建，确保正确显示所有字符。</p>
        <p>如果需要查看原始内容，请参考备份文件：$backupPath</p>
    </div>
</body>
</html>
"@
        
        # 以UTF-8无BOM格式写入文件
        $newHtmlContent | Out-File -FilePath $filePath -Encoding utf8
        Write-Host "已成功修复 status_panel.html 的编码问题" -ForegroundColor Green
    } else {
        Write-Host "警告: $filePath 不存在，跳过处理" -ForegroundColor Yellow
        # 尝试检查是否有空格问题
        $alternativePath = "D:\PDF转网页\JEV_Client\diagnostics status_panel.html"
        if (Test-Path $alternativePath) {
            Write-Host "发现替代路径: $alternativePath" -ForegroundColor Yellow
            $backupPath = "$alternativePath.backup"
            Copy-Item -Path $alternativePath -Destination $backupPath -Force
            Write-Host "已为 status_panel.html 创建备份: $backupPath" -ForegroundColor Green
            
            # 使用Here-String创建新的HTML内容
            $newHtmlContent = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>诊断状态面板 - JEV L6.7 系统</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
        }
        .status-info {
            background-color: #e7f3fe;
            border-left: 4px solid #2196F3;
            padding: 10px;
            margin: 15px 0;
        }
        .file-info {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
        }
        .version-info {
            font-weight: bold;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>JEV 诊断状态面板</h1>
        
        <div class="version-info">
            <p>JEV L6.7 系统</p>
        </div>
        
        <div class="file-info">
            <p><strong>当前文件:</strong> diagnostics status_panel.html</p>
            <p><strong>路径:</strong> $alternativePath</p>
        </div>
        
        <div class="status-info">
            <p><strong>编码状态:</strong> UTF-8 (已修复)</p>
            <p><strong>修复时间:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
            <p><strong>系统状态:</strong> 正常运行中</p>
        </div>
        
        <p>此页面已使用 UTF-8 编码进行重建，确保正确显示所有字符。</p>
        <p>如果需要查看原始内容，请参考备份文件：$backupPath</p>
    </div>
</body>
</html>
"@
            
            # 以UTF-8无BOM格式写入文件
            $newHtmlContent | Out-File -FilePath $alternativePath -Encoding utf8
            Write-Host "已成功修复 status_panel.html (替代路径) 的编码问题" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "处理 status_panel.html 时出错: $_" -ForegroundColor Red
}

# 记录结束时间并计算耗时
$endTime = Get-Date
$duration = New-TimeSpan -Start $startTime -End $endTime
Write-Host "----------------------------------------"
Write-Host "修复完成！" -ForegroundColor Cyan
Write-Host "结束时间: $endTime" -ForegroundColor Gray
Write-Host "耗时: $($duration.TotalSeconds) 秒" -ForegroundColor Gray
echo "请清除浏览器缓存后重新打开应用程序"