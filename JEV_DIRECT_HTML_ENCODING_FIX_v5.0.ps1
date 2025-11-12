# JEV-DIRECT-HTML-ENCODING-FIX-v5.0
# 功能：直接修复HTML文件乱码问题，采用多重编码分析与修复策略

# 配置变量
$baseDir = "D:\PDF转网页"
$uiDir = "$baseDir\ui"
$logDir = "$baseDir\logs"
$targetFiles = @(
    "$uiDir\sentinel_dashboard.html",
    "$uiDir\client_portal.html",
    "$uiDir\handler.html"
)

# 创建日志目录
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 日志函数
function Write-Log {
    param(
        [string]$message,
        [switch]$isError = $false
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    
    if ($isError) {
        Write-Host -ForegroundColor Red $logEntry
    } else {
        Write-Host $logEntry
    }
    
    Add-Content -Path "$logDir\direct_encoding_fix.log" -Value $logEntry
}

Write-Log "开始执行JEV-DIRECT-HTML-ENCODING-FIX-v5.0"

# 高级编码修复函数
function Repair-HTMLFile {
    param(
        [string]$filePath
    )
    
    if (-not (Test-Path $filePath)) {
        Write-Log "文件不存在: $filePath" -isError
        return $false
    }
    
    $fileName = Split-Path $filePath -Leaf
    $backupPath = "$filePath.bak"
    $fixedPath = "$filePath.fixed.html"
    
    Write-Log "修复文件: $fileName"
    
    # 备份原始文件
    try {
        Copy-Item -Path $filePath -Destination $backupPath -Force
        Write-Log "已备份到: $backupPath"
    } catch {
        Write-Log "备份文件失败: $_" -isError
    }
    
    # 读取文件字节
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    Write-Log "文件大小: $($bytes.Length) 字节"
    
    # 方法1: 直接UTF-8解码（基线测试）
    $utf8Result = ""
    try {
        $utf8Result = [System.Text.Encoding]::UTF8.GetString($bytes)
        Write-Log "方法1: UTF-8直接解码完成"
    } catch {
        Write-Log "方法1: UTF-8直接解码失败: $_"
    }
    
    # 方法2: Latin-1 → UTF-8反向映射（修复双层编码）
    $latin1Result = ""
    try {
        $latin1Content = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
        $latin1Bytes = [System.Text.Encoding]::UTF8.GetBytes($latin1Content)
        $latin1Result = [System.Text.Encoding]::UTF8.GetString($latin1Bytes)
        Write-Log "方法2: Latin-1→UTF-8反向映射完成"
    } catch {
        Write-Log "方法2: Latin-1→UTF-8反向映射失败: $_"
    }
    
    # 方法3: Windows-1252 → UTF-8反向映射
    $win1252Result = ""
    try {
        $win1252Content = [System.Text.Encoding]::GetEncoding(1252).GetString($bytes)
        $win1252Bytes = [System.Text.Encoding]::UTF8.GetBytes($win1252Content)
        $win1252Result = [System.Text.Encoding]::UTF8.GetString($win1252Bytes)
        Write-Log "方法3: Windows-1252→UTF-8反向映射完成"
    } catch {
        Write-Log "方法3: Windows-1252→UTF-8反向映射失败: $_"
    }
    
    # 方法4: 双重Latin-1 → UTF-8（修复多次编码）
    $doubleLatin1Result = ""
    try {
        $firstPass = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
        $secondPass = [System.Text.Encoding]::GetEncoding(28591).GetString([System.Text.Encoding]::UTF8.GetBytes($firstPass))
        $doubleLatin1Result = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes($secondPass))
        Write-Log "方法4: 双重Latin-1→UTF-8完成"
    } catch {
        Write-Log "方法4: 双重Latin-1→UTF-8失败: $_"
    }
    
    # 方法5: GBK → UTF-8
    $gbkResult = ""
    try {
        $gbkResult = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
        Write-Log "方法5: GBK→UTF-8解码完成"
    } catch {
        Write-Log "方法5: GBK→UTF-8解码失败: $_"
    }
    
    # 评分各方法结果
    $results = @{
        "UTF-8直接解码" = @{"content" = $utf8Result; "score" = 0}
        "Latin-1→UTF-8" = @{"content" = $latin1Result; "score" = 0}
        "Windows-1252→UTF-8" = @{"content" = $win1252Result; "score" = 0}
        "双重Latin-1→UTF-8" = @{"content" = $doubleLatin1Result; "score" = 0}
        "GBK→UTF-8" = @{"content" = $gbkResult; "score" = 0}
    }
    
    foreach ($method in $results.Keys) {
        $content = $results[$method]["content"]
        $score = 0
        
        # 基础分
        $score += 50
        
        # 中文字符评分
        $chineseChars = ([regex]::Matches($content, '[\u4e00-\u9fa5]')).Count
        $totalChars = $content.Length
        if ($totalChars -gt 0) {
            $chineseRatio = $chineseChars / $totalChars
            $score += [math]::Min(30, $chineseRatio * 100)
        }
        
        # 乱码特征检测（扣分）
        $garbagePatterns = @("Ã¥Â¼Âº", "Ã¥ÂÂ¶", "Ã¥Å½Â", "Ã¤Â»Â¥Ã¤Â¸Â", "Ã¥ÂÂÃ§Â§Â°")
        foreach ($pattern in $garbagePatterns) {
            if ($content -match $pattern) {
                $score -= 15
            }
        }
        
        # HTML结构完整性
        $openTags = ([regex]::Matches($content, '<(?!/)(\w+)')).Count
        $closeTags = ([regex]::Matches($content, '</(\w+)>')).Count
        if ($openTags -gt 0 -and $closeTags -gt 0) {
            $structureRatio = [math]::Min(1, $closeTags / $openTags)
            $score += $structureRatio * 20
        }
        
        # 可打印字符比例
        $printableChars = ([regex]::Matches($content, '[\x20-\x7E\u4e00-\u9fa5<>"\'\`\\]')).Count
        if ($totalChars -gt 0) {
            $printableRatio = $printableChars / $totalChars
            $score += $printableRatio * 20
        }
        
        # 确保分数不为负
        $score = [math]::Max(0, $score)
        $results[$method]["score"] = $score
        Write-Log "$method 得分: $score"
    }
    
    # 选择最佳结果
    $bestMethod = ($results.GetEnumerator() | Sort-Object { $_.Value.score } -Descending | Select-Object -First 1).Key
    $bestContent = $results[$bestMethod]["content"]
    $bestScore = $results[$bestMethod]["score"]
    
    Write-Log "最佳方法: $bestMethod，得分: $bestScore"
    
    # 清理内容
    $cleanContent = Clean-HTMLContent -content $bestContent
    
    # 添加或修复meta标签
    $cleanContent = Ensure-MetaCharset -content $cleanContent
    
    # 保存修复后的文件
    try {
        [System.IO.File]::WriteAllText($fixedPath, $cleanContent, [System.Text.Encoding]::UTF8)
        Write-Log "修复后的文件已保存到: $fixedPath"
        
        # 同时替换原始文件（如果得分高于60）
        if ($bestScore -ge 60) {
            [System.IO.File]::WriteAllText($filePath, $cleanContent, [System.Text.Encoding]::UTF8)
            Write-Log "已直接修复原始文件: $filePath"
        } else {
            Write-Log "得分低于60，仅保存修复版本，未替换原始文件"
        }
        
        return $true
    } catch {
        Write-Log "保存文件失败: $_" -isError
        return $false
    }
}

# HTML内容清理函数
function Clean-HTMLContent {
    param(
        [string]$content
    )
    
    # 去除BOM
    $content = $content -replace "\uFEFF", ""
    
    # 去除控制字符（保留换行和制表符）
    $content = [regex]::Replace($content, '[\x00-\x08\x0B-\x0C\x0E-\x1F]', '')
    
    # 修复HTML实体
    $content = [regex]::Replace($content, '&#(?:x[0-9A-Fa-f]+|[0-9]+);', { param($match) 
        try {
            $value = $match.Value -replace '^&#(?:x|)', '' -replace ';$', ''
            $base = if ($match.Value -like '&#x*') { 16 } else { 10 }
            [char][int]::Parse($value, [System.Globalization.NumberStyles]::AllowHexSpecifier)
        } catch {
            $match.Value
        }
    })
    
    # 修复常见的UTF-8错误序列
    $commonFixes = @{
        "Ã¥Â¼Âº" = "强"
        "Ã¥ÂÂ¶" = "制"
        "Ã¥Å½Â" = "新"
        "Ã¤Â»Â¥Ã¤Â¸Â" = "以下"
        "Ã¥ÂÂÃ§Â§Â°" = "名称"
        "Ã¥Â®ÂÃ¥ÂÂ" = "放假"
        "Ã¥ÂÂÃ¥ÂÂ»" = "参入"
        "Ã¤Â»Â£Ã§ÂÂ†" = "代理"
        "Ã¥ÂÂÃ¥Â®Â¹" = "内容"
        "Ã¦ÂÂÃ¥ÂÂ¡" = "服务"
        "Ã¤Â¸ÂÃ¨Â¡Â¨" = "上表"
        "Ã¥ÂÂÃ¨Â§Â" = "参观"
        "Ã¤Â½Â¿Ã§ÂÂ¨" = "使用"
        "Ã§Â³Â»Ã§Â»Â" = "系统"
        "Ã¥Â®ÂÃ¥ÂÂ¨" = "安全"
        "Ã¤Â¿Â¡Ã¦ÂÂ¯" = "信息"
        "Ã¥Â¤Â§Ã¥Â®Â¶" = "大家"
        "Ã¥ÂÂÃ¦Â¡Â" = "发案"
        "Ã¤Â¸ÂÃ¨Â½Â½" = "下载"
    }
    
    foreach ($key in $commonFixes.Keys) {
        $content = $content -replace $key, $commonFixes[$key]
    }
    
    return $content
}

# 确保meta charset标签存在
function Ensure-MetaCharset {
    param(
        [string]$content
    )
    
    # 如果已有meta charset标签，确保是UTF-8
    if ($content -match '<meta[^>]*charset[^>]*>') {
        $content = [regex]::Replace($content, '<meta[^>]*charset[^>]*>', '<meta charset="UTF-8">')
    } 
    # 如果有head标签但没有meta charset，添加到head中
    elseif ($content -match '<head>') {
        $headPosition = $content.IndexOf('<head>') + 6
        $content = $content.Insert($headPosition, '<meta charset="UTF-8">')
    }
    # 如果有HTML标签但没有head，添加head和meta
    elseif ($content -match '<html>') {
        $htmlPosition = $content.IndexOf('<html>') + 6
        $content = $content.Insert($htmlPosition, '<head><meta charset="UTF-8"></head>')
    }
    # 如果没有HTML标签，添加HTML骨架
    else {
        $content = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body>$content</body></html>"
    }
    
    return $content
}

# 检测并处理可能的JavaScript和CSS块
function Preserve-ScriptBlocks {
    param(
        [string]$content
    )
    
    # 保存script块
    $scriptBlocks = @()
    $i = 0
    while ($content -match '<script[^>]*>([\s\S]*?)<\/script>') {
        $scriptBlock = $matches[0]
        $placeholder = "__SCRIPT_BLOCK_$i__"
        $scriptBlocks += @{"placeholder" = $placeholder; "content" = $scriptBlock}
        $content = $content -replace [regex]::Escape($scriptBlock), $placeholder
        $i++
    }
    
    # 保存style块
    $styleBlocks = @()
    $i = 0
    while ($content -match '<style[^>]*>([\s\S]*?)<\/style>') {
        $styleBlock = $matches[0]
        $placeholder = "__STYLE_BLOCK_$i__"
        $styleBlocks += @{"placeholder" = $placeholder; "content" = $styleBlock}
        $content = $content -replace [regex]::Escape($styleBlock), $placeholder
        $i++
    }
    
    # 处理内容
    # ... (这里可以添加内容处理逻辑)
    
    # 恢复script块
    foreach ($block in $scriptBlocks) {
        $content = $content -replace $block.placeholder, $block.content
    }
    
    # 恢复style块
    foreach ($block in $styleBlocks) {
        $content = $content -replace $block.placeholder, $block.content
    }
    
    return $content
}

# 主处理逻辑
$successCount = 0
$failedCount = 0

foreach ($file in $targetFiles) {
    if (Repair-HTMLFile -filePath $file) {
        $successCount++
    } else {
        $failedCount++
    }
    Write-Log "----------------------------------------"
}

# 扫描ui目录中的其他HTML文件
Write-Log "扫描ui目录中的其他HTML文件..."
try {
    $otherHtmlFiles = Get-ChildItem -Path $uiDir -Filter "*.html" -Recurse -ErrorAction Stop | 
                     Where-Object { $targetFiles -notcontains $_.FullName }
    
    foreach ($file in $otherHtmlFiles) {
        Write-Log "处理额外文件: $($file.Name)"
        if (Repair-HTMLFile -filePath $file.FullName) {
            $successCount++
        } else {
            $failedCount++
        }
        Write-Log "----------------------------------------"
    }
} catch {
    Write-Log "扫描其他HTML文件时出错: $_" -isError
}

# 生成总结报告
$reportPath = "$logDir\direct_encoding_fix_report.txt"
$reportContent = @"
===== JEV-DIRECT-HTML-ENCODING-FIX-v5.0 修复报告 =====
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
成功修复: $successCount 个文件
修复失败: $failedCount 个文件

修复方法:
- UTF-8直接解码
- Latin-1→UTF-8反向映射（修复双层编码）
- Windows-1252→UTF-8反向映射
- 双重Latin-1→UTF-8（修复多次编码）
- GBK→UTF-8解码

验证步骤:
1. 直接打开修复后的文件进行检查
2. 清理浏览器缓存（Ctrl+Shift+Delete）
3. 使用强制刷新（Ctrl+Shift+R）重新加载页面
4. 确认中文文本是否正常显示

注意事项:
- 原始文件已备份为 .bak 文件
- 修复版本同时保存为 .fixed.html 文件
- 得分高于60的文件已直接替换原始文件
"@

try {
    $reportContent | Out-File -FilePath $reportPath -Encoding utf8NoBOM
    Write-Log "修复报告已生成: $reportPath"
} catch {
    Write-Log "生成报告失败: $_" -isError
}

Write-Log "JEV-DIRECT-HTML-ENCODING-FIX-v5.0执行完成"
Write-Log "总结: 成功修复 $successCount 个文件，失败 $failedCount 个文件"
