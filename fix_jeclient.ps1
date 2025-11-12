# 修复JEV_Client目录下的HTML文件编码问题

# 设置变量
$backup_dir = "JEV_CLIENT_BACKUP"
$target_dir = "D:\PDF转网页\JEV_Client"
$log_file = "fix_jeclient_log.txt"

# 定义要修复的关键HTML文件
$html_files = @("panel.html", "login_portal.html", "visual_learning_panel.html", "index.html", "main.html", "dashboard.html")

# 创建日志文件
"修复JEV_Client目录下HTML文件编码问题" | Out-File -FilePath $log_file -Encoding utf8
"时间: $(Get-Date)" | Out-File -FilePath $log_file -Append -Encoding utf8
"" | Out-File -FilePath $log_file -Append -Encoding utf8

Write-Host "开始修复JEV_Client目录下的HTML文件编码问题..."
Write-Host "备份将保存在 $backup_dir 目录中"

# 创建备份目录
if (-not (Test-Path $backup_dir)) {
    New-Item -ItemType Directory -Path $backup_dir | Out-Null
}

# 循环处理每个HTML文件
foreach ($file in $html_files) {
    # 查找文件在JEV_Client目录及其子目录中
    $found_files = Get-ChildItem -Path $target_dir -Filter $file -Recurse -ErrorAction SilentlyContinue
    
    foreach ($found_file in $found_files) {
        $file_path = $found_file.FullName
        Write-Host "找到文件: $file_path"
        
        # 创建相对路径用于备份
        $rel_path = $file_path.Replace($target_dir, "").TrimStart('\')
        $backup_path = Join-Path $backup_dir $rel_path
        
        # 创建备份子目录结构
        $backup_parent = Split-Path $backup_path -Parent
        if (-not (Test-Path $backup_parent)) {
            New-Item -ItemType Directory -Path $backup_parent -Force | Out-Null
        }
        
        # 备份文件
        Copy-Item -Path $file_path -Destination $backup_path -Force
        Write-Host "已备份到: $backup_path"
        
        try {
            # 读取文件内容
            $content = [System.IO.File]::ReadAllBytes($file_path)
            $utf8content = [System.Text.Encoding]::UTF8.GetString($content)
            
            # 移除BOM标记
            if ($utf8content.StartsWith([char]0xFEFF)) {
                $utf8content = $utf8content.Substring(1)
            }
            
            # 确保有meta charset标签
            if (-not ($utf8content -match '<meta[^>]*charset=["\'']utf-8["\'']')) {
                if ($utf8content -match '<head>') {
                    $utf8content = $utf8content -replace '<head>', '<head>\r\n    <meta charset="UTF-8">'
                } else {
                    # 如果没有head标签，创建基本结构
                    $utf8content = '<!DOCTYPE html>\r\n<html>\r\n<head>\r\n    <meta charset="UTF-8">\r\n</head>\r\n<body>\r\n    ' + $utf8content + '\r\n</body>\r\n</html>'
                }
            }
            
            # 保存为UTF-8无BOM格式
            [System.IO.File]::WriteAllText($file_path, $utf8content, [System.Text.UTF8Encoding]::new($false))
            
            Write-Host "已修复: $file_path"
            "已修复: $file_path" | Out-File -FilePath $log_file -Append -Encoding utf8
        } catch {
            Write-Host "修复失败: $file_path - $_"
            "修复失败: $file_path - $_" | Out-File -FilePath $log_file -Append -Encoding utf8
        }
    }
}

Write-Host ""
Write-Host "修复完成！"
Write-Host "请清除浏览器缓存后重新打开JEV客户端"
Write-Host "修复日志已保存到 $log_file"
Write-Host "如需恢复原始文件，请从 $backup_dir 目录复制"

"" | Out-File -FilePath $log_file -Append -Encoding utf8
"修复完成！请清除浏览器缓存后重新打开应用程序" | Out-File -FilePath $log_file -Append -Encoding utf8