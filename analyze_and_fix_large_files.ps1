# 分析并修复大型HTML文件的编码问题

# 设置工作目录
$baseDir = "D:\PDF转网页\JEV_Client\ui"
$outputFile = "D:\PDF转网页\file_size_analysis.txt"

# 分析文件大小
Write-Output "开始分析文件大小..." | Out-File -FilePath $outputFile -Encoding UTF8
Write-Output "====================================" | Out-File -FilePath $outputFile -Append -Encoding UTF8

# 获取并排序文件大小（前20个最大的文件）
$largeFiles = Get-ChildItem -Path $baseDir -Recurse -File | 
    Where-Object { $_.Extension -in ".html", ".js", ".css" } | 
    Sort-Object -Property Length -Descending | 
    Select-Object -First 20 FullName, Name, @{Name="SizeKB";Expression={[math]::Round($_.Length/1KB, 2)}}

# 输出分析结果
foreach ($file in $largeFiles) {
    Write-Output "$($file.Name) - $($file.SizeKB) KB - $($file.FullName)" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-Output "====================================" | Out-File -FilePath $outputFile -Append -Encoding UTF8
Write-Output "分析完成，结果保存在: $outputFile" | Out-File -FilePath $outputFile -Append -Encoding UTF8

# 简单的修复函数
function Fix-FileEncoding($filePath) {
    try {
        # 备份文件
        $backupPath = "$filePath.repair_backup"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        
        # 读取文件内容（忽略BOM）
        $content = Get-Content -Path $filePath -Raw
        
        # 对于HTML文件，确保有meta charset标签
        if ($filePath -like "*.html") {
            # 移除BOM和控制字符
            $content = $content -replace "\uFEFF", ""
            $content = $content -replace "[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", ""
            
            # 检查是否有meta charset标签
            if (-not ($content -match "<meta[^>]*charset[^>]*>")) {
                # 在head标签内添加charset
                if ($content -match "<head>.*?</head>") {
                    $content = $content -replace "<head>", "<head>\n    <meta charset=\"UTF-8\">"
                } else {
                    # 如果没有head标签，在html标签后添加
                    $content = $content -replace "<html[^>]*>", "$&\n<head>\n    <meta charset=\"UTF-8\">\n</head>"
                }
            } else {
                # 更新现有的charset标签
                $content = $content -replace "(<meta[^>]*charset=)[\"']?[^\"'>\s]*", "$1UTF-8"
            }
        }
        
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
        
        Write-Output "修复成功: $filePath" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        return $true
    } catch {
        Write-Output "修复失败: $filePath - $_" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        return $false
    }
}

# 修复最大的几个文件
Write-Output "\n开始修复大型文件..." | Out-File -FilePath $outputFile -Append -Encoding UTF8
Write-Output "====================================" | Out-File -FilePath $outputFile -Append -Encoding UTF8

# 优先修复指定的大型文件
$priorityFiles = @(
    "login_portal_backup.html",
    "visual_learning_panel.html",
    "panel.html",
    "client_portal.html",
    "sentinel_dashboard.html"
)

foreach ($fileName in $priorityFiles) {
    $filePath = Join-Path -Path $baseDir -ChildPath $fileName
    if (Test-Path $filePath) {
        Write-Output "修复文件: $fileName" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        Fix-FileEncoding $filePath
    } else {
        Write-Output "文件不存在: $fileName" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    }
}

# 再修复一些最大的JS文件
Write-Output "\n修复大型JS文件..." | Out-File -FilePath $outputFile -Append -Encoding UTF8

$largeJSFiles = $largeFiles | Where-Object { $_.Extension -eq ".js" } | Select-Object -First 5
foreach ($file in $largeJSFiles) {
    Fix-FileEncoding $file.FullName
}

Write-Output "\n修复完成，请查看分析报告: $outputFile" | Out-File -FilePath $outputFile -Append -Encoding UTF8
Write-Output "请清除浏览器缓存后重新打开应用程序"
