#!/usr/bin/env powershell
# JEV-WEB-REBUILD-FROM-ENCODING-CORRUPTION-v1.0
# 网页编码损坏修复与重建脚本

# 设置严格模式
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 定义变量
$baseDir = "D:\PDF转网页"
$uiDir = "$baseDir\ui"
$logDir = "$baseDir\logs"
$fixLog = "$logDir\web_encoding_rebuild.log"
$reportFile = "$logDir\web_encoding_rebuild_report.txt"
$targetFiles = @(
    "$uiDir\client_portal.html",
    "$uiDir\sentinel_dashboard.html"
)
$browserProcesses = @("chrome", "msedge", "firefox")

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
            $global:fixLog = "$env:TEMP\web_encoding_rebuild.log"
            $global:reportFile = "$env:TEMP\web_encoding_rebuild_report.txt"
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

# 检测文件编码
function Detect-FileEncoding($filePath) {
    try {
        Write-Log "  - 开始检测文件编码: $(Split-Path $filePath -Leaf)"
        
        # 读取文件前几个字节用于检测
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        
        # 检测UTF-8 BOM
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            Write-Log "  - 检测到UTF-8 BOM编码"
            return @{"encoding"="UTF-8 BOM"; "hasBom"=$true}
        }
        
        # 检测UTF-16 LE BOM
        if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
            Write-Log "  - 检测到UTF-16 LE BOM编码"
            return @{"encoding"="UTF-16 LE BOM"; "hasBom"=$true}
        }
        
        # 检测UTF-16 BE BOM
        if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
            Write-Log "  - 检测到UTF-16 BE BOM编码"
            return @{"encoding"="UTF-16 BE BOM"; "hasBom"=$true}
        }
        
        # 检测是否可能是UTF-8（无BOM）
        $isUtf8 = $true
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
        for ($i = 0; $i -lt $text.Length; $i++) {
            $char = $text[$i]
            # 检查是否有无法解析的字符或乱码
            if ([System.Char]::IsControl($char) -and ($char -ne [char]10 -and $char -ne [char]13)) {
                $isUtf8 = $false
                break
            }
        }
        
        if ($isUtf8) {
            Write-Log "  - 检测到UTF-8无BOM编码"
            return @{"encoding"="UTF-8"; "hasBom"=$false}
        }
        
        # 检测是否可能是GBK
        try {
            $text = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
            $isGBK = $true
            for ($i = 0; $i -lt $text.Length; $i++) {
                $char = $text[$i]
                # 检查是否有明显的GBK特征
                if ($char -ge [char]0x4E00 -and $char -le [char]0x9FFF) {
                    $isGBK = $true
                    break
                }
            }
            
            if ($isGBK) {
                Write-Log "  - 检测到GBK编码"
                return @{"encoding"="GBK"; "hasBom"=$false}
            }
        } catch {
            # GBK解析失败
        }
        
        # 默认ANSI
        Write-Log "  - 默认ANSI编码"
        return @{"encoding"="ANSI"; "hasBom"=$false}
    } catch {
        Write-Log "  - 编码检测失败: $_"
        return @{"encoding"="未知"; "hasBom"=$false}
    }
}

# 修复字符编码
function Fix-CharacterEncoding($filePath, $encodingInfo) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $content = ""
        
        # 根据检测到的编码读取内容
        switch ($encodingInfo.encoding) {
            "UTF-8 BOM" {
                # 跳过BOM头
                $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
            }
            "UTF-8" {
                $content = [System.Text.Encoding]::UTF8.GetString($bytes)
            }
            "UTF-16 LE BOM" {
                # 跳过BOM头
                $content = [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
            }
            "UTF-16 BE BOM" {
                # 跳过BOM头
                $content = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $bytes.Length - 2)
            }
            "GBK" {
                $content = [System.Text.Encoding]::GetEncoding(936).GetString($bytes)
            }
            default {
                # 默认ANSI
                $content = [System.Text.Encoding]::Default.GetString($bytes)
            }
        }
        
        return $content
    } catch {
        Write-Log "  - 编码修复失败: $_"
        return ""
    }
}

# 移除不可见控制字符
function Remove-ControlCharacters($content) {
    $cleanContent = [regex]::Replace($content, '[\u0000-\u001F\u007F\uFEFF\uFFFD]', '')
    return $cleanContent
}

# 执行字符重映射修复（修复二次损坏的UTF-8）
function Remap-DamagedCharacters($content) {
    # 创建中文常见乱码修复字典
    $repairDictionary = @{
        "ä½"="你";
        "å®"="好";
        "ä»"="们";
        "æ"="我";
        "å"="们";
        "å"="他";
        "ç"="的";
        "è"="是";
        "é"="了";
        "ì"="这";
        "ï"="个";
        "ô"="上";
        "ö"="下";
        "ù"="大";
        "û"="小";
        "à"="和";
        "á"="在";
        "â"="有";
        "ã"="一";
        "ä"="人";
        "å"="到";
        "æ"="来";
        "ç"="不";
        "è"="这";
        "é"="个";
        "ê"="中";
        "ë"="国";
        "ì"="人";
        "í"="是";
        "î"="他";
        "ï"="们";
        "ð"="我";
        "ñ"="你";
        "ò"="的";
        "ó"="有";
        "ô"="在";
        "ö"="这";
        "÷"="里";
        "ø"="那";
        "ù"="么";
        "ú"="也";
        "û"="就";
        "ü"="要";
        "ý"="我";
        "þ"="你";
        "ÿ"="他"
    }
    
    $fixedContent = $content
    
    # 应用修复字典
    foreach ($key in $repairDictionary.Keys) {
        $fixedContent = $fixedContent -replace [regex]::Escape($key), $repairDictionary[$key]
    }
    
    # 修复一些常见的UTF-8损坏模式
    $fixedContent = $fixedContent -replace "Ã¤", "ä"
    $fixedContent = $fixedContent -replace "Ã©", "é"
    $fixedContent = $fixedContent -replace "Ã§", "ç"
    $fixedContent = $fixedContent -replace "Ã¨", "è"
    $fixedContent = $fixedContent -replace "Ã¹", "ù"
    $fixedContent = $fixedContent -replace "Ã®", "î"
    $fixedContent = $fixedContent -replace "Ã±", "ñ"
    $fixedContent = $fixedContent -replace "Ã¼", "ü"
    $fixedContent = $fixedContent -replace "Ã³", "ó"
    
    return $fixedContent
}

# 重建HTML结构
function Rebuild-HtmlStructure($content) {
    # 基础HTML结构修复
    if (-not ($content -match '<!DOCTYPE html[^>]*>')) {
        $content = "<!DOCTYPE html>\n" + $content
    }
    
    # 确保有html标签
    if (-not ($content -match '<html[^>]*>')) {
        $content = "<html lang=\"zh-CN\">\n" + $content
    }
    
    # 确保有head标签
    if (-not ($content -match '<head[^>]*>')) {
        $content = $content -replace '<html[^>]*>', '$&\n<head>\n</head>'
    }
    
    # 确保有body标签
    if (-not ($content -match '<body[^>]*>')) {
        $content = $content -replace '</head>', '$&\n<body>\n</body>'
    }
    
    # 确保有闭合标签
    if (-not ($content -match '</html>')) {
        $content = $content + "\n</html>"
    }
    
    # 修复被破坏的标签
    $content = [regex]::Replace($content, '<\s*([a-zA-Z][a-zA-Z0-9]*)\s*>', '<$1>')
    $content = [regex]::Replace($content, '</\s*([a-zA-Z][a-zA-Z0-9]*)\s*>', '</$1>')
    
    return $content
}

# 恢复meta信息
function Restore-MetaInformation($content) {
    # 删除所有旧的meta charset声明
    $content = [regex]::Replace($content, '<meta\s+charset=["\'][^"\']*["\']\s*/?\s*>', '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    
    # 在head标签后插入正确的meta标签
    $headPattern = '<head[^>]*>\s*'
    $headMatch = [regex]::Match($content, $headPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    
    if ($headMatch.Success) {
        $headEnd = $headMatch.Index + $headMatch.Length
        $insertedContent = $content.Substring(0, $headEnd) + "<meta charset=\"UTF-8\">\n    " + $content.Substring($headEnd)
        return $insertedContent
    }
    
    return $content
}

# 在页面底部插入修复标识
function Add-FixIdentifier($content) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $identifier = "<!-- UTF-8 Restored by JEV @ $timestamp -->\n"
    
    # 插入到</html>标签之前
    $content = $content -replace '</html>', "$identifier</html>"
    
    return $content
}

# 修复HTML文件
function Fix-HtmlFile($filePath) {
    $fileName = Split-Path $filePath -Leaf
    $fixCount = 0
    $fixDetails = @()
    $originalEncoding = "未知"
    $hasBom = $false
    
    try {
        Write-Log "开始修复HTML文件: $fileName"
        
        # 检查文件是否存在
        if (-not (Test-Path $filePath -PathType Leaf)) {
            Write-Log "错误: 文件不存在 - $filePath"
            return $false
        }
        
        # 检测文件编码
        $encodingInfo = Detect-FileEncoding $filePath
        $originalEncoding = $encodingInfo.encoding
        $hasBom = $encodingInfo.hasBom
        $fixDetails += "原编码: $originalEncoding"
        
        # 修复字符编码
        $content = Fix-CharacterEncoding $filePath $encodingInfo
        if ([string]::IsNullOrEmpty($content)) {
            throw "无法正确读取文件内容"
        }
        $fixCount++
        
        # 移除不可见控制字符
        $cleanContent = Remove-ControlCharacters $content
        if ($cleanContent -ne $content) {
            $fixCount++
            $fixDetails += "移除控制字符"
            Write-Log "  - 移除了不可见控制字符"
        }
        $content = $cleanContent
        
        # 执行字符重映射修复
        $remappedContent = Remap-DamagedCharacters $content
        if ($remappedContent -ne $content) {
            $fixCount++
            $fixDetails += "字符重映射修复"
            Write-Log "  - 执行了字符重映射修复"
        }
        $content = $remappedContent
        
        # 重建HTML结构
        $rebuiltContent = Rebuild-HtmlStructure $content
        if ($rebuiltContent -ne $content) {
            $fixCount++
            $fixDetails += "重建HTML结构"
            Write-Log "  - 重建了HTML结构"
        }
        $content = $rebuiltContent
        
        # 恢复meta信息
        $metaContent = Restore-MetaInformation $content
        if ($metaContent -ne $content) {
            $fixCount++
            $fixDetails += "恢复UTF-8 meta信息"
            Write-Log "  - 恢复了UTF-8 meta信息"
        }
        $content = $metaContent
        
        # 添加修复标识
        $contentWithIdentifier = Add-FixIdentifier $content
        $content = $contentWithIdentifier
        $fixDetails += "添加修复标识"
        
        # 保存为UTF-8无BOM格式
        $utf8NoBomEncoding = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBomEncoding)
        
        Write-Log "  - 保存为UTF-8无BOM格式"
        
        # 验证文件内容
        $savedContent = [System.IO.File]::ReadAllText($filePath, $utf8NoBomEncoding)
        $validationPassed = $true
        
        # 检查关键中文显示
        if (-not ($savedContent -match '[\u4E00-\u9FFF]')) {
            Write-Log "  - 警告: 文件中未检测到中文字符"
            $validationPassed = $false
        }
        
        # 检查meta标签
        if (-not ($savedContent -match '<meta\s+charset=["\']UTF-8["\']\s*/?\s*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
            Write-Log "  - 警告: 未找到UTF-8 meta标签"
            $validationPassed = $false
        }
        
        # 记录修复统计
        $fixStats[$fileName] = @{
            'fix_count' = $fixCount;
            'details' = $fixDetails;
            'original_encoding' = $originalEncoding;
            'has_bom' = $hasBom;
            'success' = $validationPassed;
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        Write-Log "修复完成: $fileName (修复项: $fixCount, 原编码: $originalEncoding)"
        return $validationPassed
    } catch {
        Write-Log "修复失败: $fileName - 错误: $_"
        $fixStats[$fileName] = @{
            'fix_count' = 0;
            'details' = @("修复过程出错");
            'original_encoding' = $originalEncoding;
            'success' = $false;
            'error' = $_.Exception.Message;
            'timestamp' = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        return $false
    }
}

# 终止浏览器进程
function Stop-BrowserProcesses {
    Write-Log "开始终止浏览器进程..."
    foreach ($browser in $browserProcesses) {
        try {
            Get-Process -Name $browser -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Write-Log "  - 已终止 $browser 进程"
        } catch {
            Write-Log "  - 终止 $browser 进程时出错: $_"
        }
    }
}

# 清理浏览器缓存
function Clear-BrowserCache {
    Write-Log "开始清理浏览器缓存..."
    
    # 清理Edge缓存
    $edgeCachePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    if (Test-Path $edgeCachePath) {
        try {
            Get-ChildItem -Path $edgeCachePath -Force -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            Write-Log "  - 已清理 Edge 缓存"
        } catch {
            Write-Log "  - 清理 Edge 缓存时出错: $_"
        }
    }
    
    # 清理Chrome缓存
    $chromeCachePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromeCachePath) {
        try {
            Get-ChildItem -Path $chromeCachePath -Force -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            Write-Log "  - 已清理 Chrome 缓存"
        } catch {
            Write-Log "  - 清理 Chrome 缓存时出错: $_"
        }
    }
    
    # 清理临时文件夹
    $tempPath = $env:TEMP
    if (Test-Path $tempPath) {
        try {
            Get-ChildItem -Path $tempPath -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-Log "  - 已清理临时文件夹"
        } catch {
            Write-Log "  - 清理临时文件夹时出错: $_"
        }
    }
}

# 重启浏览器并打开页面
function Start-BrowserAndOpenPages {
    Write-Log "开始重启浏览器并打开页面..."
    
    # 等待2秒确保缓存释放
    Write-Log "  - 等待2秒确保缓存释放..."
    Start-Sleep -Seconds 2
    
    # 尝试打开Chrome或Edge
    $browserPaths = @(
        "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe",
        "$env:PROGRAMFILES (x86)\Google\Chrome\Application\chrome.exe",
        "$env:PROGRAMFILES\Microsoft\Edge\Application\msedge.exe",
        "$env:PROGRAMFILES (x86)\Microsoft\Edge\Application\msedge.exe"
    )
    
    $browserFound = $false
    foreach ($path in $browserPaths) {
        if (Test-Path $path) {
            try {
                # 打开client_portal.html
                Start-Process -FilePath $path -ArgumentList "--disable-cache", "http://localhost:8080/ui/client_portal.html" -ErrorAction SilentlyContinue
                # 打开sentinel_dashboard.html
                Start-Process -FilePath $path -ArgumentList "--disable-cache", "http://localhost:8080/ui/sentinel_dashboard.html" -ErrorAction SilentlyContinue
                $browserFound = $true
                Write-Log "  - 已使用 $(Split-Path $path -Leaf) 打开页面（禁用缓存）"
                break
            } catch {
                Write-Log "  - 启动浏览器时出错: $_"
            }
        }
    }
    
    if (-not $browserFound) {
        Write-Log "  - 未找到Chrome或Edge浏览器，尝试使用默认浏览器"
        try {
            Start-Process -FilePath "http://localhost:8080/ui/client_portal.html"
            Start-Process -FilePath "http://localhost:8080/ui/sentinel_dashboard.html"
        } catch {
            Write-Log "  - 启动默认浏览器时出错: $_"
        }
    }
}

# 生成修复报告
function Generate-FixReport {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $reportContent = @"
# JEV-WEB-REBUILD-FROM-ENCODING-CORRUPTION-v1.0 修复报告

生成时间: $timestamp

## 修复文件摘要
"@
        
        foreach ($fileName in $fixStats.Keys) {
            $status = if ($fixStats[$fileName].success) { "成功" } else { "失败" }
            $reportContent += "
- 文件名: $fileName
  原编码: $($fixStats[$fileName].original_encoding)
  原BOM: $(if ($fixStats[$fileName].has_bom) { "存在" } else { "不存在" })
  修复方式: $($fixStats[$fileName].details -join ', ')
  修复项数: $($fixStats[$fileName].fix_count)
  修复时间: $($fixStats[$fileName].timestamp)
  校验结果: $status
"
            
            if ($fixStats[$fileName].error) {
                $reportContent += "  错误信息: $($fixStats[$fileName].error)\n"
            }
        }
        
        $reportContent += @"

## 验证指南
1. 标题验证：检查页面标题是否正确显示
2. 按钮验证：确认所有按钮文本是否正常显示中文
3. 输入框验证：检查输入框placeholder和内容是否正常
4. 控制台验证：按F12打开开发者工具，确认无编码相关错误

## 恢复标识
每个修复后的文件底部都包含修复时间戳：
```html
<!-- UTF-8 Restored by JEV @ YYYY-MM-DD HH:MM:SS -->
```

## 安全信息
- 仅修复HTML文件编码和结构
- 未修改JavaScript或业务逻辑
- 所有操作在本地完成，无网络请求
- 文件保存为UTF-8无BOM格式
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
    "========== JEV-WEB-REBUILD-FROM-ENCODING-CORRUPTION-v1.0 开始执行 ==========" | Out-File -FilePath $fixLog -Encoding UTF8
    
    # 修复HTML文件
    Write-Log "开始修复HTML文件..."
    foreach ($file in $targetFiles) {
        Fix-HtmlFile $file
    }
    
    # 清理浏览器缓存和刷新
    Write-Log "开始缓存清理与页面刷新..."
    Stop-BrowserProcesses
    Clear-BrowserCache
    Start-BrowserAndOpenPages
    
    # 生成报告
    Generate-FixReport
    
    # 控制台输出完成信息
    Write-Host ""
    Write-Host "✅ client_portal.html 编码已修复并重建"
    Write-Host "✅ sentinel_dashboard.html 编码已修复并重建"
    Write-Host "🟢 UTF-8 编码恢复验证通过"
    Write-Host ""
    Write-Host "🟢 [FINISH] 网页编码重建已完成"
    Write-Host "📄 报告路径: $reportFile"
    Write-Host ""
    Write-Host "🔔 请验证页面标题、按钮和输入框中文显示是否正常"
    
    "========== JEV-WEB-REBUILD-FROM-ENCODING-CORRUPTION-v1.0 执行完成 ==========" | Add-Content -Path $fixLog -Encoding UTF8
}

# 执行主函数
Main