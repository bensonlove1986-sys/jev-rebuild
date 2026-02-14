# 验证脚本：世界一致性检查
# 用于验证修复后的世界一致性和客户数据可见性

# 设置 API 基础 URL
$ApiBase = "https://api.jevtools.org"

# 创建结果目录
$DocsDir = "$PSScriptRoot/../docs"
if (-not (Test-Path $DocsDir)) {
    New-Item -ItemType Directory -Path $DocsDir | Out-Null
}

# 结果对象
$Results = @{
    diag_world = $null
    inbound_response = $null
    customers_response = $null
    assertions = @{
        diag_world_success = $false
        inbound_success = $false
        customers_contains_proof = $false
        customer_fields_valid = $false
        overall_pass = $false
    }
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

Write-Host "=== 开始验证世界一致性 ==="
Write-Host "API 基础 URL: $ApiBase"
Write-Host ""

Try {
    # 1. GET /api/diag/world
    Write-Host "1. 调用 /api/diag/world..."
    $DiagWorldResponse = Invoke-RestMethod -Uri "$ApiBase/api/diag/world" -Method Get -ContentType "application/json"
    $Results.diag_world = $DiagWorldResponse
    $Results.assertions.diag_world_success = $true
    Write-Host "   ✓ 成功获取世界诊断信息"
    Write-Host "   Script Version ID: $($DiagWorldResponse.scriptVersion.id)"
    Write-Host "   KV Binding Present: $($DiagWorldResponse.kv_binding_present)"
    Write-Host ""

    # 2. POST /api/inbound/daojie
    Write-Host "2. 调用 /api/inbound/daojie..."
    $InboundBody = @{
        customer_id = "REAL_PROOF_001"
        customer_name = "测试客户 001"
        phone = "+8613800138000"
        company = "测试公司"
        email = "test@example.com"
        message = "这是一条测试消息"
        timestamp = [int64]((Get-Date).ToUniversalTime() - [DateTime]::UnixEpoch).TotalMilliseconds
    }
    $InboundResponse = Invoke-RestMethod -Uri "$ApiBase/api/inbound/daojie" -Method Post -Body ($InboundBody | ConvertTo-Json) -ContentType "application/json"
    $Results.inbound_response = $InboundResponse
    $Results.assertions.inbound_success = $true
    Write-Host "   ✓ 成功发送入站消息"
    Write-Host "   Response: $($InboundResponse | ConvertTo-Json -Compress)"
    Write-Host ""

    # 3. GET /api/inbox/customers
    Write-Host "3. 调用 /api/inbox/customers..."
    # 等待 1 秒，确保数据已写入
    Start-Sleep -Seconds 1
    $CustomersResponse = Invoke-RestMethod -Uri "$ApiBase/api/inbox/customers" -Method Get -ContentType "application/json"
    $Results.customers_response = $CustomersResponse
    Write-Host "   ✓ 成功获取客户列表"
    Write-Host "   客户数量: $($CustomersResponse.customers.Length)"
    Write-Host ""

    # 4. 断言验证
    Write-Host "4. 验证断言..."
    
    # 断言 1: 客户列表包含 REAL_PROOF_001
    $ProofCustomer = $CustomersResponse.customers | Where-Object { $_.customer_id -eq "REAL_PROOF_001" }
    if ($ProofCustomer) {
        $Results.assertions.customers_contains_proof = $true
        Write-Host "   ✓ 客户列表包含 REAL_PROOF_001"
        
        # 断言 2: 客户字段有效
        if (-not [string]::IsNullOrEmpty($ProofCustomer.display_name) -and `
            -not [string]::IsNullOrEmpty($ProofCustomer.phone) -and `
            -not [string]::IsNullOrEmpty($ProofCustomer.company)) {
            $Results.assertions.customer_fields_valid = $true
            Write-Host "   ✓ 客户字段有效"
            Write-Host "      display_name: $($ProofCustomer.display_name)"
            Write-Host "      phone: $($ProofCustomer.phone)"
            Write-Host "      company: $($ProofCustomer.company)"
        } else {
            Write-Host "   ✗ 客户字段无效"
            Write-Host "      display_name: '$($ProofCustomer.display_name)'"
            Write-Host "      phone: '$($ProofCustomer.phone)'"
            Write-Host "      company: '$($ProofCustomer.company)'"
        }
    } else {
        Write-Host "   ✗ 客户列表不包含 REAL_PROOF_001"
        Write-Host "   所有客户 ID: $($CustomersResponse.customers.customer_id -join ", ")"
    }

    Write-Host ""

} Catch {
    Write-Host "✗ 发生错误: $_" -ForegroundColor Red
    Write-Host "错误详情: $($_.Exception.Message)" -ForegroundColor Red
}

# 计算整体结果
$Results.assertions.overall_pass = `
    $Results.assertions.diag_world_success -and `
    $Results.assertions.inbound_success -and `
    $Results.assertions.customers_contains_proof -and `
    $Results.assertions.customer_fields_valid

# 输出结果
Write-Host "=== 验证结果 ==="
Write-Host "世界诊断: $(if ($Results.assertions.diag_world_success) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "入站消息: $(if ($Results.assertions.inbound_success) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "客户存在: $(if ($Results.assertions.customers_contains_proof) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "字段有效: $(if ($Results.assertions.customer_fields_valid) { '✓ PASS' } else { '✗ FAIL' })"
Write-Host "整体结果: $(if ($Results.assertions.overall_pass) { '✓ PASS' } else { '✗ FAIL' })" -ForegroundColor $(if ($Results.assertions.overall_pass) { 'Green' } else { 'Red' })
Write-Host ""

# 保存结果到文件
$OutputFile = "$DocsDir/DIAG_WORLD_PROOF.json"
$Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host "结果已保存到: $OutputFile"
Write-Host ""