# 简单编码修复脚本
echo "开始修复关键文件编码..."

# 定义文件路径
$panelJsPath = "d:\PDF转网页\JEV_Client\ui\panel.js"
$panelHtmlPath = "d:\PDF转网页\JEV_Client\ui\panel.html"
$backupJsPath = "d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.js"
$backupHtmlPath = "d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.html"

# 检查并从备份恢复panel.js
if (Test-Path $backupJsPath) {
    echo "从备份恢复 panel.js..."
    Copy-Item -Path $backupJsPath -Destination $panelJsPath -Force
    echo "已恢复 panel.js"
}

# 检查并从备份恢复panel.html
if (Test-Path $backupHtmlPath) {
    echo "从备份恢复 panel.html..."
    Copy-Item -Path $backupHtmlPath -Destination $panelHtmlPath -Force
    echo "已恢复 panel.html"
}

# 修复panel.js编码
if (Test-Path $panelJsPath) {
    try {
        echo "修复 panel.js 编码..."
        $content = Get-Content -Path $panelJsPath -Raw
        # 移除BOM
        if ($content.Length -gt 0 -and $content[0] -eq [char]0xFEFF) {
            $content = $content.Substring(1)
        }
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($panelJsPath, $content, [System.Text.UTF8Encoding]::new($false))
        echo "panel.js 编码修复完成"
    } catch {
        echo "修复 panel.js 时出错: $_"
    }
}

# 修复panel.html编码
if (Test-Path $panelHtmlPath) {
    try {
        echo "修复 panel.html 编码..."
        $content = Get-Content -Path $panelHtmlPath -Raw
        # 移除BOM
        if ($content.Length -gt 0 -and $content[0] -eq [char]0xFEFF) {
            $content = $content.Substring(1)
        }
        # 确保有meta charset标签
        if (-not ($content -match '<meta\s+charset=["\']UTF-8["\']\s*>')) {
            if ($content -match '<head[^>]*>') {
                $content = $content -replace '<head[^>]*>', '$&\n    <meta charset="UTF-8">'
            }
        }
        # 保存为UTF-8无BOM
        [System.IO.File]::WriteAllText($panelHtmlPath, $content, [System.Text.UTF8Encoding]::new($false))
        echo "panel.html 编码修复完成"
    } catch {
        echo "修复 panel.html 时出错: $_"
    }
}

echo ""
echo "编码修复完成！"
echo "请清除浏览器缓存后重新打开应用程序"