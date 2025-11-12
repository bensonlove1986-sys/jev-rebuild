#!/usr/bin/env pwsh

# JEV系统编码健康检查脚本
# 验证所有UI文件和API处理是否正确支持UTF-8编码

Write-Host "===== JEV系统编码健康检查开始 =====" -ForegroundColor Green

# 1. 检查HTML文件的UTF-8编码标签
Write-Host "
1. 检查HTML文件的UTF-8编码标签..." -ForegroundColor Cyan

$htmlDirectories = @(
    "d:\PDF转网页\JEV_Client\ui",
    "d:\PDF转网页\JEV_Client_Web\ui"
)

$allHtmlFilesHaveCharset = $true

foreach ($dir in $htmlDirectories) {
    if (Test-Path $dir) {
        Write-Host "\n检查目录: $dir" -ForegroundColor Yellow
        $htmlFiles = Get-ChildItem -Path $dir -Filter "*.html" -Recurse
        
        foreach ($file in $htmlFiles) {
            $hasCharset = Select-String -Path $file.FullName -Pattern '<meta charset="UTF-8">' -Quiet
            
            if ($hasCharset) {
                Write-Host "✓ $($file.Name) - 包含UTF-8编码标签" -ForegroundColor Green
            } else {
                Write-Host "✗ $($file.Name) - 缺少UTF-8编码标签" -ForegroundColor Red
                $allHtmlFilesHaveCharset = $false
            }
            
            # 检查是否有BOM标记
            $content = Get-Content -Path $file.FullName -Raw
            $hasBOM = [System.Text.Encoding]::UTF8.GetPreamble() -join "" -eq $content.Substring(0, 3) -join ""
            
            if ($hasBOM) {
                Write-Host "  ⚠️ $($file.Name) - 包含BOM标记" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "目录不存在: $dir" -ForegroundColor Yellow
    }
}

# 2. 检查JavaScript文件的编码处理
Write-Host "\n2. 检查JavaScript文件的编码处理..." -ForegroundColor Cyan

$jsFiles = @(
    "d:\PDF转网页\JEV_Client\ui\scripts\main.js"
)

foreach ($file in $jsFiles) {
    if (Test-Path $file) {
        $content = Get-Content -Path $file -Raw
        
        $hasUtf8Header = $content -match 'charset=UTF-8'
        $hasTextDecoder = $content -match 'TextDecoder\(["'']utf-8["'']\)'
        $hasSafeHtml = $content -match 'sanitizeHTML|setElementContent'
        
        Write-Host "\n检查文件: $([System.IO.Path]::GetFileName($file))" -ForegroundColor Yellow
        
        if ($hasUtf8Header) {
            Write-Host "✓ 包含UTF-8编码头声明" -ForegroundColor Green
        } else {
            Write-Host "✗ 缺少UTF-8编码头声明" -ForegroundColor Red
        }
        
        if ($hasTextDecoder) {
            Write-Host "✓ 使用TextDecoder处理二进制数据" -ForegroundColor Green
        } else {
            Write-Host "✗ 未使用TextDecoder处理二进制数据" -ForegroundColor Red
        }
        
        if ($hasSafeHtml) {
            Write-Host "✓ 包含HTML安全处理函数" -ForegroundColor Green
        } else {
            Write-Host "✗ 缺少HTML安全处理函数" -ForegroundColor Red
        }
    } else {
        Write-Host "文件不存在: $file" -ForegroundColor Yellow
    }
}

# 3. 检查API相关代码
Write-Host "\n3. 检查API相关代码的编码处理..." -ForegroundColor Cyan

$apiFiles = @(
    "d:\PDF转网页\JEV_Client\ui\scripts\main.js"
)

foreach ($file in $apiFiles) {
    if (Test-Path $file) {
        $content = Get-Content -Path $file -Raw
        
        $hasApiCall = $content -match 'const apiCall'
        $hasContentType = $content -match 'Content-Type.*charset=UTF-8'
        $hasAcceptHeader = $content -match 'Accept.*charset=UTF-8'
        
        Write-Host "\n检查API文件: $([System.IO.Path]::GetFileName($file))" -ForegroundColor Yellow
        
        if ($hasApiCall) {
            Write-Host "✓ 包含API调用函数" -ForegroundColor Green
            
            if ($hasContentType) {
                Write-Host "  ✓ 设置了正确的Content-Type编码" -ForegroundColor Green
            } else {
                Write-Host "  ✗ 未设置正确的Content-Type编码" -ForegroundColor Red
            }
            
            if ($hasAcceptHeader) {
                Write-Host "  ✓ 设置了正确的Accept编码头" -ForegroundColor Green
            } else {
                Write-Host "  ✗ 未设置正确的Accept编码头" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ 未找到API调用函数" -ForegroundColor Red
        }
    }
}

# 4. 检查client_dashboard.html的安全渲染
Write-Host "\n4. 检查client_dashboard.html的安全渲染..." -ForegroundColor Cyan

$dashboardFile = "d:\PDF转网页\JEV_Client_Web\ui\client_dashboard.html"
if (Test-Path $dashboardFile) {
    $content = Get-Content -Path $dashboardFile -Raw
    
    $usesTextContent = $content -match 'textContent'
    $avoidsInnerHTML = -not ($content -match 'messageEl\.innerHTML')
    
    Write-Host "检查文件: client_dashboard.html" -ForegroundColor Yellow
    
    if ($usesTextContent) {
        Write-Host "✓ 使用textContent安全设置内容" -ForegroundColor Green
    } else {
        Write-Host "✗ 未使用textContent安全设置内容" -ForegroundColor Red
    }
    
    if ($avoidsInnerHTML) {
        Write-Host "✓ 避免不安全的innerHTML操作" -ForegroundColor Green
    } else {
        Write-Host "✗ 可能存在不安全的innerHTML操作" -ForegroundColor Red
    }
} else {
    Write-Host "文件不存在: $dashboardFile" -ForegroundColor Yellow
}

# 5. 总结报告
Write-Host "\n===== 编码健康检查报告 =====" -ForegroundColor Green

if ($allHtmlFilesHaveCharset) {
    Write-Host "✓ 所有HTML文件都包含UTF-8编码标签" -ForegroundColor Green
} else {
    Write-Host "✗ 部分HTML文件缺少UTF-8编码标签，需要修复" -ForegroundColor Red
}

Write-Host "\n重要提示：" -ForegroundColor Yellow
Write-Host "1. 请清除浏览器缓存后重新打开应用程序，确保新的编码设置生效" -ForegroundColor Yellow
Write-Host "2. 所有新创建的HTML页面必须在<head>标签中包含<meta charset=\"UTF-8\">" -ForegroundColor Yellow
Write-Host "3. API响应必须包含正确的Content-Type: application/json; charset=UTF-8头" -ForegroundColor Yellow
Write-Host "4. 使用textContent而非innerHTML来设置动态内容，防止XSS攻击" -ForegroundColor Yellow

Write-Host "\n===== 编码健康检查完成 =====" -ForegroundColor Green
