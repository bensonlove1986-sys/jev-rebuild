# JEV-CLIENT-LOGIN-INVITE-GENERATOR-v1.1
# 生成JEV Client登录邀请码脚本

$ErrorActionPreference = "Stop"

# 定义变量
$clientDir = "D:\PDF转网页\JEV_Client"
$inviteCodePath = "$clientDir\invite_code.txt"

# 1️⃣ 检查文件夹是否存在，不存在则创建
function EnsureDirectoryExists() {
    if (-not (Test-Path $clientDir)) {
        Write-Host "创建目录: $clientDir"
        New-Item -ItemType Directory -Path $clientDir -Force | Out-Null
    }
}

# 2️⃣ 检查是否已有未过期邀请码
function CheckExistingInviteCode() {
    if (Test-Path $inviteCodePath) {
        try {
            $existingData = Get-Content -Path $inviteCodePath -Raw | ConvertFrom-Json
            
            # 验证JSON结构
            if ($existingData -and $existingData.invite_code -and $existingData.expire_at -and $existingData.status) {
                # 检查状态和过期时间
                if ($existingData.status -eq "active") {
                    $expireDate = [DateTime]::Parse($existingData.expire_at)
                    $now = [DateTime]::UtcNow
                    
                    if ($now -lt $expireDate) {
                        Write-Host "发现未过期邀请码，直接复用。"
                        return $existingData
                    } else {
                        Write-Host "现有邀请码已过期，生成新邀请码。"
                        return $null
                    }
                } else {
                    Write-Host "现有邀请码状态不为active，生成新邀请码。"
                    return $null
                }
            } else {
                Write-Host "现有邀请码文件格式不正确，生成新邀请码。"
                return $null
            }
        } catch {
            Write-Host "解析现有邀请码文件失败，生成新邀请码。"
            return $null
        }
    }
    return $null
}

# 生成随机码
function GenerateRandomCode() {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $randomCode = ''
    $random = New-Object System.Random
    
    for ($i = 0; $i -lt 6; $i++) {
        $randomCode += $chars[$random.Next($chars.Length)]
    }
    
    return $randomCode
}

# 3️⃣ 生成新邀请码
function GenerateNewInviteCode() {
    $today = Get-Date -Format "yyyyMMdd"
    $randomCode = GenerateRandomCode()
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
    
    return $inviteData
}

# 4️⃣ 保存邀请码到文件
function SaveInviteCode($inviteData) {
    $jsonContent = $inviteData | ConvertTo-Json -Depth 10
    # 保存为UTF-8格式
    Set-Content -Path $inviteCodePath -Value $jsonContent -Encoding UTF8
    Write-Host "邀请码已保存到: $inviteCodePath"
}

# 5️⃣ 格式化输出结果
function FormatOutput($inviteData) {
    Write-Host "✅ 已生成邀请码：$($inviteData.invite_code)"
    Write-Host "📅 有效期至：$($inviteData.expire_at)"
    Write-Host "📁 保存位置：$inviteCodePath"
    Write-Host ""
    Write-Host "6️⃣ 脚本执行完毕后可直接在浏览器输入该邀请码登录："
    Write-Host "http://localhost:8080/ui/login_portal.html"
}

# 主函数
function Main() {
    Write-Host "JEV-CLIENT-LOGIN-INVITE-GENERATOR-v1.1 开始执行..."
    
    # 1️⃣ 确保目录存在
    EnsureDirectoryExists
    
    # 2️⃣ 检查现有邀请码
    $existingInvite = CheckExistingInviteCode
    
    if ($existingInvite) {
        # 使用现有未过期邀请码
        FormatOutput $existingInvite
    } else {
        # 3️⃣ 生成新邀请码
        $newInvite = GenerateNewInviteCode
        # 4️⃣ 保存邀请码
        SaveInviteCode $newInvite
        # 5️⃣ 输出结果
        FormatOutput $newInvite
    }
    
    Write-Host ""
    Write-Host "JEV-CLIENT-LOGIN-INVITE-GENERATOR-v1.1 任务完成"
}

# 执行主函数
Main
