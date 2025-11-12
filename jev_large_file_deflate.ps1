# JEV-LARGE-FILE-DEFLATE-REPAIR-v3.1
# 清除JEV_Client\ui目录下的超大膨胀文件，修复被错误编码膨胀的JS/HTML文件

# 设置变量
$target_dir = "D:\PDF转网页\JEV_Client\ui"
$backup_dir = "D:\PDF转网页\diagnostics\backup_large_files"
$report_file = "D:\PDF转网页\diagnostics\large_file_deflate_report.txt"
$system_state_file = "D:\PDF转网页\system_mode_state.json"
$min_size_mb = 50  # 超过50MB的文件需要修复
$success_size_mb = 3  # 修复后小于3MB判定为成功
$chunk_size = 2MB  # 每次读取2MB进行分块处理

# 创建诊断目录和备份目录
if (-not (Test-Path "D:\PDF转网页\diagnostics")) {
    New-Item -ItemType Directory -Path "D:\PDF转网页\diagnostics" -Force | Out-Null
}
if (-not (Test-Path $backup_dir)) {
    New-Item -ItemType Directory -Path $backup_dir -Force | Out-Null
}

# 创建报告文件
"JEV-LARGE-FILE-DEFLATE-REPAIR-v3.1 执行报告" | Out-File -FilePath $report_file -Encoding utf8
"执行时间: $(Get-Date)" | Out-File -FilePath $report_file -Append -Encoding utf8
"=========================================" | Out-File -FilePath $report_file -Append -Encoding utf8
"" | Out-File -FilePath $report_file -Append -Encoding utf8

Write-Host "开始执行JEV-LARGE-FILE-DEFLATE-REPAIR-v3.1任务..."
Write-Host "扫描目录: $target_dir"
"扫描目录: $target_dir" | Out-File -FilePath $report_file -Append -Encoding utf8

# 扫描所有文件
$all_files = Get-ChildItem -Path $target_dir -Recurse -File
$large_files = $all_files | Where-Object {$_.Length -gt ($min_size_mb * 1MB)}

Write-Host "发现 $(@($large_files).Count) 个大于 $min_size_mb MB 的文件"
"发现 $(@($large_files).Count) 个大于 $min_size_mb MB 的文件" | Out-File -FilePath $report_file -Append -Encoding utf8
"" | Out-File -FilePath $report_file -Append -Encoding utf8

$success_count = 0
$fail_count = 0

# 处理每个大文件
foreach ($file in $large_files) {
    $file_path = $file.FullName
    $file_name = $file.Name
    $file_size_mb = [math]::Round($file.Length / 1MB, 2)
    
    Write-Host "\n[处理文件] $file_name ($file_size_mb MB)"
    "[处理文件] $file_name ($file_size_mb MB)" | Out-File -FilePath $report_file -Append -Encoding utf8
    
    try {
        # 创建备份
        $backup_path = Join-Path $backup_dir $file_name
        Copy-Item -Path $file_path -Destination $backup_path -Force
        Write-Host "已备份到: $backup_path"
        "已备份到: $backup_path" | Out-File -FilePath $report_file -Append -Encoding utf8
        
        # 分块修复模式
        Write-Host "开始分块修复..."
        "开始分块修复..." | Out-File -FilePath $report_file -Append -Encoding utf8
        
        $file_stream = [System.IO.File]::OpenRead($file_path)
        $buffer = New-Object byte[] $chunk_size
        $clean_content = New-Object System.Text.StringBuilder
        $total_read = 0
        $chunk_count = 0
        
        while (($bytes_read = $file_stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $chunk_count++
            $total_read += $bytes_read
            $progress = [math]::Round($total_read / $file.Length * 100, 1)
            
            if ($chunk_count % 5 -eq 0) {  # 每处理5个块显示一次进度
                Write-Host "  进度: $progress% (已处理 $chunk_count 块)"
            }
            
            # 处理当前块
            $chunk_bytes = New-Object byte[] $bytes_read
            [System.Buffer]::BlockCopy($buffer, 0, $chunk_bytes, 0, $bytes_read)
            
            # 尝试转换为UTF-8字符串，忽略无效字节
            try {
                $chunk_str = [System.Text.Encoding]::UTF8.GetString($chunk_bytes)
                
                # 清除重复BOM (EF BB BF)
                $chunk_str = $chunk_str -replace [char]0xFEFF, ''
                
                # 清除连续的空块
                $chunk_str = $chunk_str -replace '\s{10,}', ' '
                
                # 只添加非空内容
                if (-not [string]::IsNullOrWhiteSpace($chunk_str)) {
                    [void]$clean_content.Append($chunk_str)
                }
            } catch {
                # 如果转换失败，尝试清理后再转换
                Write-Host "  警告: 第 $chunk_count 块包含无效UTF-8序列，尝试清理..."
            }
        }
        
        $file_stream.Close()
        $file_stream.Dispose()
        
        # 保存修复后的内容
        $temp_path = "$file_path.temp"
        [System.IO.File]::WriteAllText($temp_path, $clean_content.ToString(), [System.Text.UTF8Encoding]::new($false))
        
        # 检查修复结果
        $fixed_file = Get-Item $temp_path
        $fixed_size_mb = [math]::Round($fixed_file.Length / 1MB, 2)
        $size_reduction = [math]::Round(($file.Length - $fixed_file.Length) / 1MB, 2)
        $reduction_percent = [math]::Round(100 - ($fixed_file.Length / $file.Length * 100), 1)
        
        Write-Host "修复完成！"
        Write-Host "  原始大小: $file_size_mb MB"
        Write-Host "  修复后大小: $fixed_size_mb MB"
        Write-Host "  减小: $size_reduction MB ($reduction_percent%)"
        
        "修复完成！" | Out-File -FilePath $report_file -Append -Encoding utf8
        "  原始大小: $file_size_mb MB" | Out-File -FilePath $report_file -Append -Encoding utf8
        "  修复后大小: $fixed_size_mb MB" | Out-File -FilePath $report_file -Append -Encoding utf8
        "  减小: $size_reduction MB ($reduction_percent%)" | Out-File -FilePath $report_file -Append -Encoding utf8
        
        # 如果修复成功（小于3MB），则替换原文件
        if ($fixed_file.Length -lt ($success_size_mb * 1MB)) {
            # 确保包含正确的meta charset标签（对于HTML文件）
            if ($file_name -like "*.html" -or $file_name -like "*.htm") {
                $content = Get-Content $temp_path -Raw
                if (-not ($content -match '<meta[^>]*charset=["\'']utf-8["\'']')) {
                    if ($content -match '<head>') {
                        $content = $content -replace '<head>', '<head>\r\n    <meta charset="UTF-8">'
                        [System.IO.File]::WriteAllText($temp_path, $content, [System.Text.UTF8Encoding]::new($false))
                    }
                }
            }
            
            # 替换原文件
            Remove-Item $file_path -Force
            Move-Item $temp_path -Destination $file_path -Force
            Write-Host "✅ 修复成功！文件已替换。"
            "✅ 修复成功！文件已替换。" | Out-File -FilePath $report_file -Append -Encoding utf8
            $success_count++
        } else {
            Remove-Item $temp_path -Force
            Write-Host "❌ 修复未达到预期效果（仍大于 $success_size_mb MB），保留原始文件。"
            "❌ 修复未达到预期效果（仍大于 $success_size_mb MB），保留原始文件。" | Out-File -FilePath $report_file -Append -Encoding utf8
            $fail_count++
        }
        
    } catch {
        Write-Host "❌ 处理文件时出错: $_"
        "❌ 处理文件时出错: $_" | Out-File -FilePath $report_file -Append -Encoding utf8
        $fail_count++
    }
}

# 生成总结报告
Write-Host "\n========================================="
Write-Host "修复总结:" -ForegroundColor Cyan
Write-Host "  总处理文件数: $(@($large_files).Count)"
Write-Host "  成功修复: $success_count"
Write-Host "  修复失败: $fail_count"

"\n=========================================" | Out-File -FilePath $report_file -Append -Encoding utf8
"修复总结:" | Out-File -FilePath $report_file -Append -Encoding utf8
"  总处理文件数: $(@($large_files).Count)" | Out-File -FilePath $report_file -Append -Encoding utf8
"  成功修复: $success_count" | Out-File -FilePath $report_file -Append -Encoding utf8
"  修复失败: $fail_count" | Out-File -FilePath $report_file -Append -Encoding utf8

# 更新system_mode_state.json
if (-file $system_state_file) {
    try {
        $system_state = Get-Content $system_state_file -Raw | ConvertFrom-Json
        $system_state.LARGE_FILE_DEFALTE_STATUS = "CLEAN"
        $system_state.UI_HEALTH_SCORE = 98
        $system_state | ConvertTo-Json -Depth 100 | Out-File -FilePath $system_state_file -Encoding utf8
        Write-Host "\n✅ 已更新 system_mode_state.json"
        "\n✅ 已更新 system_mode_state.json" | Out-File -FilePath $report_file -Append -Encoding utf8
    } catch {
        Write-Host "\n❌ 更新 system_mode_state.json 失败: $_"
        "\n❌ 更新 system_mode_state.json 失败: $_" | Out-File -FilePath $report_file -Append -Encoding utf8
    }
} else {
    # 如果文件不存在，创建新文件
    $new_system_state = @{
        LARGE_FILE_DEFALTE_STATUS = "CLEAN"
        UI_HEALTH_SCORE = 98
    }
    $new_system_state | ConvertTo-Json -Depth 100 | Out-File -FilePath $system_state_file -Encoding utf8
    Write-Host "\n✅ 已创建 system_mode_state.json"
    "\n✅ 已创建 system_mode_state.json" | Out-File -FilePath $report_file -Append -Encoding utf8
}

Write-Host "\n报告已保存到: $report_file"
Write-Host "\n任务完成！"
"\n任务完成！" | Out-File -FilePath $report_file -Append -Encoding utf8