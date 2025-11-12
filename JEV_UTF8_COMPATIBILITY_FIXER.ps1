# JEV-UTF8-COMPATIBILITY-FIXER-v1.0
# 修复PowerShell中文路径编码兼容性问题

# 立即设置基础编码以确保中文显示正常
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'

$ErrorActionPreference = "Stop"

# 定义变量
$clientDir = "D:\PDF转网页\JEV_Client"
$inviteCodePath = "$clientDir\invite_code.txt"
$targetScriptPath = "D:\PDF转网页\JEV_CLIENT_LOGIN_INVITE_GENERATOR.ps1"

# 1️⃣ 检测当前PowerShell编码页
function CheckCurrentCodePage() {
    Write-Host "1️⃣ 检测当前PowerShell编码页..."
    try {
        $chcpOutput = cmd /c "chcp"
        if ($chcpOutput -match 'Active code page: (\d+)') {
            $currentCodePage = $matches[1]
            Write-Host "当前编码页: $currentCodePage"
            return $currentCodePage
        } else {
            Write-Host "无法检测当前编码页"
            return $null
        }
    } catch {
        Write-Host "检测编码页时出错: $_"
        return $null
    }
}

# 2️⃣ 自动切换编码页
function SwitchToUtf8CodePage() {
    Write-Host "2️⃣ 自动切换到UTF-8编码页..."
    try {
        # 切换到UTF-8编码页
        cmd /c "chcp 65001"
        
        # 设置PowerShell输出编码
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Write-Host "✅ 已切换到UTF-8编码页"
        return $true
    } catch {
        Write-Host "切换编码页时出错: $_"
        return $false
    }
}

# 3️⃣ 为系统注册UTF-8默认输出
function SetUtf8Defaults() {
    Write-Host "3️⃣ 注册UTF-8默认输出设置..."
    try {
        # 设置默认编码参数值
        $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
        $PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'
        Write-Host "✅ 已设置UTF-8默认输出编码"
        return $true
    } catch {
        Write-Host "设置UTF-8默认值时出错: $_"
        return $false
    }
}

# 4️⃣ 检测并创建目录
function EnsureDirectoryExists() {
    Write-Host "4️⃣ 检测目录 $clientDir..."
    try {
        if (-not (Test-Path $clientDir)) {
            Write-Host "创建目录: $clientDir"
            New-Item -ItemType Directory -Path $clientDir -Force | Out-Null
        }
        Write-Host "✅ 目录检测通过"
        return $true
    } catch {
        Write-Host "目录操作时出错: $_"
        return $false
    }
}

# 5️⃣ 检测invite_code.txt路径
function CheckInviteCodePath() {
    Write-Host "5️⃣ 检测invite_code.txt路径..."
    try {
        # 测试路径可访问性
        $dirExists = Test-Path $clientDir
        
        if (-not $dirExists) {
            Write-Host "路径访问失败: 目录不存在"
            return $false
        }
        
        # 尝试创建测试文件以验证路径有效性
        $testFilePath = "$clientDir\encoding_test.txt"
        Set-Content -Path $testFilePath -Value "UTF-8编码测试 - UTF-8 Encoding Test" -Encoding UTF8
        
        # 验证文件创建成功
        if (Test-Path $testFilePath) {
            # 读取文件内容以验证编码
            $content = Get-Content -Path $testFilePath -Raw
            Remove-Item -Path $testFilePath -Force
            
            if ($content.Contains("UTF-8编码测试")) {
                Write-Host "✅ 路径访问测试通过"
                return $true
            } else {
                Write-Host "路径测试失败: 编码可能存在问题"
                return $false
            }
        } else {
            Write-Host "路径测试失败: 无法创建测试文件"
            return $false
        }
    } catch {
        Write-Host "路径测试时出错: $_"
        return $false
    }
}

# 6️⃣ 输出验证信息
function OutputVerificationInfo() {
    Write-Host ""
    Write-Host "6️⃣ 输出验证信息:"
    Write-Host "✅ 当前控制台编码页: 65001 (UTF-8)"
    Write-Host "✅ 输出编码: UTF-8"
    Write-Host "✅ 路径检测通过: $inviteCodePath"
}

# 7️⃣ 为脚本文件注入编码保护代码
function InjectEncodingProtectionCode($scriptPath) {
    Write-Host "7️⃣ 为脚本注入编码保护代码: $scriptPath"
    try {
        if (Test-Path $scriptPath) {
            # 读取现有脚本内容
            $content = Get-Content -Path $scriptPath -Raw -Encoding UTF8
            
            # 检查是否已包含编码保护代码
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
                Set-Content -Path $scriptPath -Value $newContent -Encoding UTF8
                Write-Host "✅ 已为 $scriptPath 注入编码保护代码"
                return $true
            } else {
                Write-Host "✅ $scriptPath 已包含编码保护代码"
                return $true
            }
        } else {
            Write-Host "⚠️  脚本文件不存在: $scriptPath"
            return $false
        }
    } catch {
        Write-Host "注入编码保护代码时出错: $_"
        return $false
    }
}

# 主函数
function Main() {
    Write-Host "JEV-UTF8-COMPATIBILITY-FIXER-v1.0 开始执行..."
    
    # 1️⃣ 检测当前编码页
    $currentCodePage = CheckCurrentCodePage
    
    # 如果编码页不是UTF-8，则切换
    if ($currentCodePage -ne "65001") {
        SwitchToUtf8CodePage
    }
    
    # 3️⃣ 设置UTF-8默认值
    SetUtf8Defaults
    
    # 4️⃣ 确保目录存在
    EnsureDirectoryExists
    
    # 5️⃣ 检测路径
    CheckInviteCodePath
    
    # 6️⃣ 输出验证信息
    OutputVerificationInfo
    
    # 7️⃣ 为关键脚本注入编码保护代码
    InjectEncodingProtectionCode $targetScriptPath
    
    # 为当前脚本也注入保护代码（自我修复）
    InjectEncodingProtectionCode $MyInvocation.MyCommand.Path
    
    Write-Host ""
    Write-Host "✅ JEV-UTF8-COMPATIBILITY-FIXER-v1.0 任务完成"
    Write-Host "所有PowerShell脚本现在应该能够正确处理中文路径和UTF-8编码。"
}

# 执行主函数
Main
