# Cloudflare Worker 三条铁律验证脚本
# PowerShell 版本

$workerCoreDir = "D:\PDF转网页\JEV-Rebuild\worker-core"
$ciDir = Join-Path $workerCoreDir "ci"

Write-Host "🔍 开始验证 Cloudflare Worker 三条铁律..."
Write-Host "=" * 50

# 铁律一：入口唯一律
Write-Host "
1️⃣ 验证入口唯一律："

# 检查 wrangler.toml 中的 main 设置
$wranglerToml = Join-Path $workerCoreDir "wrangler.toml"
$mainEntry = Get-Content $wranglerToml | Select-String -Pattern "^main\s*=" -CaseSensitive | ForEach-Object { $_.Line -replace '^main\s*=\s*"|"', '' }

if ($mainEntry -eq "index.js") {
    Write-Host "✅ wrangler.toml main 设置正确：$mainEntry"
} else {
    Write-Host "❌ 错误：wrangler.toml 中 main 必须为 index.js，当前为 $mainEntry"
    exit 1
}

# 检查 export default 的数量（排除 node_modules）
$jsFiles = Get-ChildItem -Path $workerCoreDir -Recurse -Filter "*.js" | Where-Object { $_.FullName -notlike "*node_modules*" }
$exportDefaultCount = 0

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "export default") {
        $exportDefaultCount++
        Write-Host "📋 发现 export default 在：$($file.Name)"
    }
}

if ($exportDefaultCount -eq 1) {
    Write-Host "✅ export default 数量正确：$exportDefaultCount"
} else {
    Write-Host "❌ 错误：worker-core 目录中 export default 的数量必须为 1，当前为 $exportDefaultCount"
    exit 1
}

# 铁律二：数据先行律
Write-Host "
2️⃣ 验证数据先行律："

# 检查 Profile Key 格式是否统一
$profileKeyViolations = @()

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $matches = [regex]::Matches($content, 'profile:([^\}]+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    
    foreach ($match in $matches) {
        $fullMatch = $match.Value
        if ($fullMatch -notlike "*profile:\${customerId}*" -and $fullMatch -notlike "*profile:\${customer_id}*") {
            $profileKeyViolations += "$($file.Name): $fullMatch"
        }
    }
}

if ($profileKeyViolations.Count -eq 0) {
    Write-Host "✅ Profile Key 格式统一：profile:${customerId}"
} else {
    Write-Host "❌ 错误：Profile Key 格式必须为 profile:${customerId}，发现违规："
    $profileKeyViolations | ForEach-Object { Write-Host "   $_" }
    exit 1
}

# 检查是否有在 pull 时补 profile 的逻辑
$pullAutoCreate = @()

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "pull.*auto_heal|pull.*auto_create|pull.*fallback|pull.*put.*profile" -or 
        $content -match "auto_heal.*pull|auto_create.*pull|fallback.*pull|put.*profile.*pull") {
        $pullAutoCreate += $file.Name
    }
}

if ($pullAutoCreate.Count -eq 0) {
    Write-Host "✅ 没有在 pull 时补 profile 的逻辑"
} else {
    Write-Host "❌ 错误：禁止在 pull 时补 profile，发现违规文件："
    $pullAutoCreate | ForEach-Object { Write-Host "   $_" }
    exit 1
}

# 铁律三：上线证据律
Write-Host "
3️⃣ 验证上线证据律："

# 检查是否包含 BUILD ID 生成和日志
$buildIdCheck = $false
$routeHitCheck = $false
$dataWriteCheck = $false
$healthCheck = $false

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match "BUILD_ID|WORKER_BUILD") {
        $buildIdCheck = $true
    }
    
    if ($content -match "FETCH_ENTRY|ROUTE_HIT") {
        $routeHitCheck = $true
    }
    
    if ($content -match "PROFILE_WRITE|INBOX_WRITE_MSG|MESSAGE_WRITE") {
        $dataWriteCheck = $true
    }
    
    if ($file.Name -eq "health.js" -and $content -match "build_id|BUILD_ID") {
        $healthCheck = $true
    }
}

if ($buildIdCheck) {
    Write-Host "✅ 包含 BUILD ID 生成和日志"
} else {
    Write-Host "❌ 错误：必须包含 BUILD ID 生成和日志输出"
    exit 1
}

if ($routeHitCheck) {
    Write-Host "✅ 包含 ROUTE HIT 日志"
} else {
    Write-Host "❌ 错误：必须包含 ROUTE HIT 日志"
    exit 1
}

if ($dataWriteCheck) {
    Write-Host "✅ 包含数据写入日志"
} else {
    Write-Host "❌ 错误：必须包含数据写入日志"
    exit 1
}

if ($healthCheck) {
    Write-Host "✅ 健康检查端点返回 BUILD ID"
} else {
    Write-Host "❌ 错误：健康检查端点必须返回 BUILD ID"
    exit 1
}

Write-Host "
" + "=" * 50
Write-Host "🎉 所有三条铁律验证通过！"
Write-Host "✅ Cloudflare Worker 永不翻车系统已就绪！"
Write-Host "=" * 50
