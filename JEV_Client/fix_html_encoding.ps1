$files = Get-ChildItem -Recurse -Include *.html | Where-Object { $_.FullName -notlike '*node_modules*' -and $_.FullName -notlike '*backup*' }
$fixedFiles = 0
$checkedFiles = 0

foreach ($file in $files) {
    $checkedFiles++
    Write-Host "检查文件: $($file.FullName)"
    
    try {
        # 读取文件内容
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        
        # 检查是否已包含meta charset标签（不区分大小写）
        if ($content -match '<meta\s+charset=["\']utf-8["\']\s*\/?>' -or $content -match '<meta\s+charset=["\']UTF-8["\']\s*\/?>') {
            Write-Host "  ✓ 已包含UTF-8编码声明"
        } else {
            # 查找head标签位置
            if ($content -match '<head[^>]*>') {
                $headTag = $matches[0]
                $headTagEnd = $content.IndexOf($headTag) + $headTag.Length
                
                # 在head标签后插入meta charset标签
                $newContent = $content.Substring(0, $headTagEnd) + "`n    <meta charset=\"UTF-8\">" + $content.Substring($headTagEnd)
                
                # 保存文件
                Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
                Write-Host "  ✅ 添加了UTF-8编码声明"
                $fixedFiles++
            } else {
                Write-Host "  ⚠️  未找到<head>标签，跳过修复"
            }
        }
    } catch {
        Write-Host "  ❌ 处理文件时出错: $_"
    }
}

Write-Host "`n===== 修复完成 ====="
Write-Host "检查的文件数: $checkedFiles"
Write-Host "修复的文件数: $fixedFiles"