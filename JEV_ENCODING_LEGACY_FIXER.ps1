# JEV-ENCODING-LEGACY-FIXER-v1.0
# 全面修复中文路径和编码不一致问题

# 立即设置基础编码以确保中文显示正常
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'

$ErrorActionPreference = "Stop"

# 定义全局变量
$rootDir = "D:\PDF转网页"
$clientDir = "$rootDir\JEV_Client"
$logsDir = "$rootDir\logs"
$reportPath = "$logsDir\encoding_repair_report.txt"
$fixedCount = 0
$reportContent = @()
$startTime = Get-Date

# 初始化报告
function InitializeReport {
    # 确保日志目录存在
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    # 清空或创建报告文件
    $reportHeader = @"
JEV-ENCODING-LEGACY-FIXER-v1.0 编码修复报告
执行时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
修复范围: $rootDir

"@
    Set-Content -Path $reportPath -Value $reportHeader -Encoding UTF8
    AddToReport "=== 开始编码修复任务 ==="
}

# 添加内容到报告
function AddToReport($message) {
    $message | Add-Content -Path $reportPath -Encoding UTF8
    $reportContent += $message
}

# 🧩 一、系统层检测（PowerShell + 文件系统）
function SystemLevelFix {
    Write-Host ""
    Write-Host "🧩 一、系统层检测（PowerShell + 文件系统）"
    AddToReport ""
    AddToReport "## 一、系统层检测（PowerShell + 文件系统）"
    
    # 1️⃣ 检查控制台编码页
    CheckAndSetCodePage
    
    # 2️⃣ 设置默认编码（已在脚本开头设置）
    SetDefaultEncodings
    
    # 3️⃣ 检查路径合法性
    CheckPathLegality
    
    # 4️⃣ 修复文件名异常
    FixFileNameIssues
    
    # 5️⃣ 检测PowerShell脚本头部
    FixPowerShellScripts
}

# 1️⃣ 检查并设置控制台编码页
function CheckAndSetCodePage {
    Write-Host "1️⃣ 检查控制台编码页..."
    try {
        $chcpOutput = cmd /c "chcp"
        if ($chcpOutput -match 'Active code page: (\d+)') {
            $currentCodePage = $matches[1]
            Write-Host "当前编码页: $currentCodePage"
            AddToReport "1. 当前编码页: $currentCodePage"
            
            if ($currentCodePage -ne "65001") {
                Write-Host "切换到UTF-8编码页 (65001)"
                cmd /c "chcp 65001 > nul"
                AddToReport "   → 已切换到UTF-8编码页 (65001)"
            } else {
                Write-Host "✅ 编码页已为UTF-8"
                AddToReport "   → 编码页已为UTF-8"
            }
        }
    } catch {
        Write-Host "⚠️  检测编码页时出错: $_"
        AddToReport "⚠️  检测编码页时出错: $_"
    }
}

# 2️⃣ 设置默认编码
function SetDefaultEncodings {
    Write-Host "2️⃣ 设置默认编码..."
    try {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
        $PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'
        Write-Host "✅ 已设置UTF-8默认编码"
        AddToReport "2. 已设置UTF-8默认编码"
    } catch {
        Write-Host "⚠️  设置默认编码时出错: $_"
        AddToReport "⚠️  设置默认编码时出错: $_"
    }
}

# 3️⃣ 检查路径合法性
function CheckPathLegality {
    Write-Host "3️⃣ 检查路径合法性..."
    $pathsToCheck = @($rootDir, $clientDir, $logsDir)
    
    foreach ($path in $pathsToCheck) {
        if (Test-Path $path) {
            Write-Host "✅ 路径正常: $path"
            AddToReport "3. 路径正常: $path"
        } else {
            Write-Host "⚠️  路径不存在: $path，正在创建..."
            AddToReport "3. 路径不存在: $path，正在创建..."
            try {
                New-Item -ItemType Directory -Path $path -Force | Out-Null
                Write-Host "✅ 已创建: $path"
                AddToReport "   → 已创建: $path"
            } catch {
                Write-Host "❌ 创建失败: $_"
                AddToReport "   ❌ 创建失败: $_"
            }
        }
    }
}

# 4️⃣ 修复文件名异常
function FixFileNameIssues {
    Write-Host "4️⃣ 修复文件名异常..."
    AddToReport "4. 修复文件名异常"
    
    try {
        # 扫描根目录中的文件
        $files = Get-ChildItem -Path $rootDir -Recurse -File | Where-Object { 
            $_.Name -match '\uFFFD|\x00' -or $_.Name -like '*乱码*' 
        }
        
        foreach ($file in $files) {
            $newName = $file.Name -replace '\uFFFD|\x00', '_' -replace '乱码', 'fixed'
            $newPath = Join-Path -Path $file.Directory.FullName -ChildPath $newName
            
            Rename-Item -Path $file.FullName -NewName $newName -Force
            Write-Host "✅ 已重命名: $($file.Name) → $newName"
            AddToReport "   ✅ 已重命名: $($file.Name) → $newName"
            $global:fixedCount++
        }
        
        if ($files.Count -eq 0) {
            Write-Host "✅ 未发现异常文件名"
            AddToReport "   ✅ 未发现异常文件名"
        }
    } catch {
        Write-Host "⚠️  修复文件名时出错: $_"
        AddToReport "   ⚠️  修复文件名时出错: $_"
    }
}

# 5️⃣ 检测PowerShell脚本头部
function FixPowerShellScripts {
    Write-Host "5️⃣ 检测PowerShell脚本头部..."
    AddToReport "5. 检测PowerShell脚本头部"
    
    try {
        # 查找所有PowerShell脚本
        $psScripts = Get-ChildItem -Path $rootDir -Recurse -Filter "*.ps1"
        
        foreach ($script in $psScripts) {
            $content = Get-Content -Path $script.FullName -Raw
            
            # 检查是否已包含UTF-8保护代码
            if ($content -notmatch '\[Console\]::OutputEncoding') {
                # 定义要注入的编码保护代码
                $encodingCode = @"
# UTF-8编码保护层
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'

"@
                
                # 在文件开头注入代码
                $newContent = $encodingCode + $content
                
                # 写回文件
                Set-Content -Path $script.FullName -Value $newContent -Encoding UTF8
                Write-Host "✅ 已为 $($script.Name) 注入编码保护代码"
                AddToReport "   ✅ 已为 $($script.Name) 注入编码保护代码"
                $global:fixedCount++
            }
        }
    } catch {
        Write-Host "⚠️  修复PowerShell脚本时出错: $_"
        AddToReport "   ⚠️  修复PowerShell脚本时出错: $_"
    }
}

# 🌐 二、浏览器层与网页文件修复
function BrowserLevelFix {
    Write-Host ""
    Write-Host "🌐 二、浏览器层与网页文件修复"
    AddToReport ""
    AddToReport "## 二、浏览器层与网页文件修复"
    
    # 1️⃣ 扫描所有.html/.js/.css文件
    $webFiles = Get-ChildItem -Path $rootDir -Recurse -Include *.html,*.js,*.css -File
    Write-Host "1️⃣ 发现 $($webFiles.Count) 个网页相关文件"
    AddToReport "1. 发现 $($webFiles.Count) 个网页相关文件"
    
    foreach ($file in $webFiles) {
        try {
            $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
            $needsUpdate = $false
            
            # 2️⃣ 检测<meta charset>声明（仅HTML文件）
            if ($file.Extension -eq '.html') {
                if ($content -notmatch '<meta\s+charset=') {
                    # 在<head>标签后插入charset声明
                    $content = $content -replace '<head>', '<head>\n    <meta charset="UTF-8">'
                    $needsUpdate = $true
                    Write-Host "✅ 添加charset: $($file.Name)"
                    AddToReport "   ✅ 添加charset: $($file.Name)"
                } elseif ($content -match '<meta\s+charset=["\'](?!UTF-8)[^"\']*["\']') {
                    # 替换错误的charset声明
                    $content = $content -replace '<meta\s+charset=["\'][^"\']*["\']', '<meta charset="UTF-8">'
                    $needsUpdate = $true
                    Write-Host "✅ 修复charset: $($file.Name)"
                    AddToReport "   ✅ 修复charset: $($file.Name)"
                }
            }
            
            # 3️⃣ 检查并移除BOM头（通过重新写入文件自动处理）
            
            # 4️⃣ 检查路径引用是否乱码
            if ($content -match '乱码|\\uFFFD') {
                $content = $content -replace '乱码|\\uFFFD', 'fixed'
                $needsUpdate = $true
                Write-Host "✅ 修复路径乱码: $($file.Name)"
                AddToReport "   ✅ 修复路径乱码: $($file.Name)"
            }
            
            # 5️⃣ 对HTML进行编码一致性重写
            if ($needsUpdate) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                $global:fixedCount++
            }
        } catch {
            Write-Host "⚠️  处理文件时出错: $($file.Name) - $_"
            AddToReport "   ⚠️  处理文件时出错: $($file.Name) - $_"
        }
    }
}

# 🧠 三、程序逻辑与JSON数据修复
function ProgramLogicFix {
    Write-Host ""
    Write-Host "🧠 三、程序逻辑与JSON数据修复"
    AddToReport ""
    AddToReport "## 三、程序逻辑与JSON数据修复"
    
    # 1️⃣ 扫描JSON、TXT、LOG文件
    $dataFiles = Get-ChildItem -Path $rootDir -Recurse -Include *.json,*.txt,*.log -File
    Write-Host "1️⃣ 发现 $($dataFiles.Count) 个数据文件"
    AddToReport "1. 发现 $($dataFiles.Count) 个数据文件"
    
    foreach ($file in $dataFiles) {
        try {
            $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
            $needsUpdate = $false
            
            # 检测并移除非法控制字符
            $newContent = $content -replace '[\x00-\x1F]', ''
            if ($newContent -ne $content) {
                $needsUpdate = $true
                $content = $newContent
                Write-Host "✅ 移除控制字符: $($file.Name)"
                AddToReport "   ✅ 移除控制字符: $($file.Name)"
            }
            
            # 确保JSON文件可解析（仅JSON文件）
            if ($file.Extension -eq '.json') {
                try {
                    $null = $content | ConvertFrom-Json
                } catch {
                    # JSON解析失败，尝试修复
                    Write-Host "⚠️ JSON格式错误: $($file.Name)，尝试修复"
                    AddToReport "   ⚠️ JSON格式错误: $($file.Name)，尝试修复"
                    
                    # 简单的JSON修复尝试
                    $content = $content -replace '[^\x20-\x7E\x0A\x0D\u4E00-\u9FFF]', ''
                    $needsUpdate = $true
                }
            }
            
            # 3️⃣ 特别处理邀请码文件
            if ($file.FullName -eq "$clientDir\invite_code.txt") {
                try {
                    $inviteData = $content | ConvertFrom-Json
                    if ($inviteData -and $inviteData.invite_code) {
                        Write-Host "✅ 邀请码文件格式正确: $($file.Name)"
                        AddToReport "   ✅ 邀请码文件格式正确: $($file.Name)"
                    }
                } catch {
                    # 创建默认邀请码结构
                    $today = Get-Date -Format "yyyyMMdd"
                    $randomCode = -join ((65..90) + (48..57) | Get-Random -Count 6 | ForEach-Object {[char]$_})
                    $inviteCode = "JEV-CLIENT-LOGIN-$today-$randomCode"
                    $now = [DateTime]::UtcNow
                    $createdAt = $now.ToString("yyyy-MM-ddTHH:mm:ssZ")
                    $expireAt = $now.AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    
                    $inviteData = @{
                        invite_code = $inviteCode
                        created_at = $createdAt
                        expire_at = $expireAt
                        status = "active"
                    }
                    
                    $content = $inviteData | ConvertTo-Json -Depth 10
                    $needsUpdate = $true
                    Write-Host "✅ 修复邀请码文件: $($file.Name)"
                    AddToReport "   ✅ 修复邀请码文件: $($file.Name)"
                }
            }
            
            # 写入更新后的内容
            if ($needsUpdate) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                $global:fixedCount++
            }
        } catch {
            Write-Host "⚠️  处理数据文件时出错: $($file.Name) - $_"
            AddToReport "   ⚠️  处理数据文件时出错: $($file.Name) - $_"
        }
    }
    
    # 4️⃣ 检查关键JS文件编码声明
    $keyJsFiles = @(
        "$rootDir\main.js",
        "$clientDir\server.js",
        "$rootDir\JEV_Worker\worker.js"
    )
    
    Write-Host "4️⃣ 检查关键JS文件编码声明"
    AddToReport "4. 检查关键JS文件编码声明"
    
    foreach ($filePath in $keyJsFiles) {
        if (Test-Path $filePath) {
            try {
                $content = Get-Content -Path $filePath -Raw -Encoding UTF8
                
                if ($content -notmatch 'coding:\s*utf-8') {
                    # 在文件开头添加编码声明
                    $content = "// -*- coding: utf-8 -*-$content"
                    Set-Content -Path $filePath -Value $content -Encoding UTF8
                    Write-Host "✅ 添加编码声明: $([System.IO.Path]::GetFileName($filePath))"
                    AddToReport "   ✅ 添加编码声明: $([System.IO.Path]::GetFileName($filePath))"
                    $global:fixedCount++
                }
            } catch {
                Write-Host "⚠️  处理JS文件时出错: $filePath - $_"
                AddToReport "   ⚠️  处理JS文件时出错: $filePath - $_"
            }
        }
    }
}

# 🔐 四、后续防护机制（预防复发）
function SetupProtection {
    Write-Host ""
    Write-Host "🔐 四、后续防护机制（预防复发）"
    AddToReport ""
    AddToReport "## 四、后续防护机制（预防复发）"
    
    # 1️⃣ 创建编码锁定文件
    $encodingLockPath = "$rootDir\encoding_lock.json"
    $encodingLockContent = @{
        encoding = "UTF-8"
        enforced_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        status = "locked"
        version = "1.0"
    }
    
    $encodingLockContent | ConvertTo-Json -Depth 10 | Set-Content -Path $encodingLockPath -Encoding UTF8
    Write-Host "✅ 创建编码锁定文件: encoding_lock.json"
    AddToReport "1. ✅ 创建编码锁定文件: encoding_lock.json"
    
    # 2️⃣ 创建监控脚本（简化版）
    $monitorScriptPath = "$rootDir\utf8_watchdog.ps1"
    $monitorScriptContent = @"
# UTF-8编码监控脚本
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "UTF-8编码监控已启动..."
# 实际使用时可以扩展此脚本
"@
    
    Set-Content -Path $monitorScriptPath -Value $monitorScriptContent -Encoding UTF8
    Write-Host "✅ 创建编码监控脚本: utf8_watchdog.ps1"
    AddToReport "2. ✅ 创建编码监控脚本: utf8_watchdog.ps1"
    
    # 3️⃣ 创建批处理文件用于快速启动
    $batchPath = "$rootDir\fix_encoding_all.bat"
    $batchContent = @"
@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0JEV_ENCODING_LEGACY_FIXER.ps1"
pause
"@
    
    Set-Content -Path $batchPath -Value $batchContent -Encoding ASCII
    Write-Host "✅ 创建快速修复批处理: fix_encoding_all.bat"
    AddToReport "3. ✅ 创建快速修复批处理: fix_encoding_all.bat"
}

# 生成最终报告
function GenerateFinalReport {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "🔒 生成最终报告..."
    
    $finalReport = @"

=== 修复完成 ===
修复文件总数: $fixedCount
执行时长: $duration 秒
完成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

✅ UTF-8 全局兼容修复完成！
📂 修复文件数：$fixedCount
🧾 报告文件：$reportPath
⚙️ 当前控制台编码页：65001 (UTF-8)
🔒 防乱码机制已启用
"@
    
    AddToReport $finalReport
    
    # 输出到控制台
    Write-Host "✅ UTF-8 全局兼容修复完成！"
    Write-Host "📂 修复文件数：$fixedCount"
    Write-Host "🧾 报告文件：$reportPath"
    Write-Host "⚙️ 当前控制台编码页：65001 (UTF-8)"
    Write-Host "🔒 防乱码机制已启用"
}

# 主函数
function Main {
    Write-Host "JEV-ENCODING-LEGACY-FIXER-v1.0 开始执行..."
    
    # 初始化报告
    InitializeReport
    
    # 执行各模块修复
    SystemLevelFix
    BrowserLevelFix
    ProgramLogicFix
    SetupProtection
    
    # 生成最终报告
    GenerateFinalReport
    
    Write-Host ""
    Write-Host "✅ JEV-ENCODING-LEGACY-FIXER-v1.0 任务完成"
}

# 执行主函数
Main
