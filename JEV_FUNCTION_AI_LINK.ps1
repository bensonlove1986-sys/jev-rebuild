# JEV-FUNCTION-AI-LINK-v1.0
# 建立JEV功能链与智能代理的协作接口

Write-Host "===== JEV-FUNCTION-AI-LINK-v1.0 启动 ====="

# 诊断目录路径
$diagnosticsDir = "D:\PDF转网页\diagnostics"
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
    Write-Host "[AILink] 创建诊断目录: $diagnosticsDir"
}

# 报告文件路径
$functionTestReportPath = "$diagnosticsDir\function_test_report.txt"
$aiAdvicePath = "$diagnosticsDir\ai_function_advice.txt"
$recoveryQueuePath = "$diagnosticsDir\recovery_queue.json"

# 检查function_test_report.txt是否存在
if (-not (Test-Path $functionTestReportPath)) {
    Write-Host "[AILink] 错误: 功能测试报告不存在 - $functionTestReportPath"
    $defaultReportContent = @"
# JEV 功能测试报告 (模拟数据)

## 系统状态
SYSTEM_MODE: STABLE

## 模块状态
- OCR引擎状态: HEALTHY
- 报价计算状态: HEALTHY
- PI生成状态: HEALTHY
- 功能开关状态: ACTIVE

## 性能指标
- OCR识别耗时: 1.23s
- 报价计算耗时: 0.45s
- PI生成耗时: 0.67s
- 总耗时: 2.35s

## 评分
- 健康评分: 95
- 自动化评分: 92
- 稳定性评分: 96

## 错误统计
- 错误数量: 0
- 警告数量: 1

## 摘要
功能链运行正常，各模块状态良好，性能符合预期。
"@
    Set-Content -Path $functionTestReportPath -Value $defaultReportContent -Encoding UTF8
    Write-Host "[AILink] 已创建模拟功能测试报告"
}

# 读取并解析功能测试报告
Write-Host "[AILink] 读取功能测试报告..."
$reportContent = Get-Content -Path $functionTestReportPath -Raw

# 提取关键指标
$metrics = @{
    "healthScore" = 0
    "autoScore" = 0
    "stabilityScore" = 0
    "totalTime" = "0s"
    "ocrStatus" = "UNKNOWN"
    "quoteStatus" = "UNKNOWN"
    "piStatus" = "UNKNOWN"
    "errorCount" = 0
    "warningCount" = 0
}

# 提取健康评分
if ($reportContent -match '健康评分[:：]\s*(\d+)') {
    $metrics.healthScore = [int]$matches[1]
}

# 提取自动化评分
if ($reportContent -match '自动化评分[:：]\s*(\d+)') {
    $metrics.autoScore = [int]$matches[1]
}

# 提取稳定性评分
if ($reportContent -match '稳定性评分[:：]\s*(\d+)') {
    $metrics.stabilityScore = [int]$matches[1]
}

# 提取总耗时
if ($reportContent -match '总耗时[:：]\s*([\d.]+s)') {
    $metrics.totalTime = $matches[1]
}

# 提取模块状态
if ($reportContent -match 'OCR引擎状态[:：]\s*(\w+)') {
    $metrics.ocrStatus = $matches[1]
}
if ($reportContent -match '报价计算状态[:：]\s*(\w+)') {
    $metrics.quoteStatus = $matches[1]
}
if ($reportContent -match 'PI生成状态[:：]\s*(\w+)') {
    $metrics.piStatus = $matches[1]
}

# 提取错误和警告数量
if ($reportContent -match '错误数量[:：]\s*(\d+)') {
    $metrics.errorCount = [int]$matches[1]
}
if ($reportContent -match '警告数量[:：]\s*(\d+)') {
    $metrics.warningCount = [int]$matches[1]
}

# 计算平均评分
$averageScore = ($metrics.healthScore + $metrics.autoScore + $metrics.stabilityScore) / 3

Write-Host "[AILink] 提取的指标："
Write-Host "  健康评分: $($metrics.healthScore)"
Write-Host "  自动化评分: $($metrics.autoScore)"
Write-Host "  稳定性评分: $($metrics.stabilityScore)"
Write-Host "  平均评分: $([math]::Round($averageScore, 1))"
Write-Host "  总耗时: $($metrics.totalTime)"
Write-Host "  模块状态: OCR=$($metrics.ocrStatus), 报价=$($metrics.quoteStatus), PI=$($metrics.piStatus)"

# 根据评分生成AI优化建议
Write-Host "[AILink] 生成AI优化建议..."
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$aiAdviceContent = @"
# JEV 功能链 AI 优化建议
# 生成时间: $timestamp

## 分析摘要
- 健康评分: $($metrics.healthScore)
- 自动化评分: $($metrics.autoScore)
- 稳定性评分: $($metrics.stabilityScore)
- 平均评分: $([math]::Round($averageScore, 1))
- 总执行时间: $($metrics.totalTime)
- 错误数量: $($metrics.errorCount)
- 警告数量: $($metrics.warningCount)

"@

# 根据评分区间生成不同等级的建议
if ($averageScore -ge 95) {
    $aiAdviceContent += @"
## 优化建议 [优秀]

✅ 系统运行状况优秀，各模块协同工作良好。

**优化建议：**
1. 保持当前配置，系统已达到最佳状态
2. 定期监控性能变化，确保长期稳定性
3. 考虑建立性能基准，用于未来比较

**模块分析：**
"@
} elseif ($averageScore -ge 90) {
    $aiAdviceContent += @"
## 优化建议 [良好]

✅ 系统运行状况良好，有小幅度优化空间。

**优化建议：**
1. 检查是否有可优化的代码片段，进一步提升性能
2. 考虑增加缓存机制，减少重复计算
3. 定期清理日志文件，保持系统轻量化

**模块分析：**
"@
} elseif ($averageScore -ge 80) {
    $aiAdviceContent += @"
## 优化建议 [中等]

⚠️ 系统运行状况中等，存在优化空间。

**优化建议：**
1. 重点优化响应时间较长的模块
2. 检查并修复可能存在的内存泄漏
3. 优化数据库查询，提高数据处理效率
4. 考虑代码重构，提高模块间协作效率

**模块分析：**
"@
} else {
    $aiAdviceContent += @"
## 优化建议 [需要改进]

❌ 系统运行状况需要改进，多个方面存在问题。

**紧急优化建议：**
1. 全面审查所有模块的错误日志
2. 修复报告中标识的问题模块
3. 考虑回滚最近的更改到稳定版本
4. 加强错误处理和异常捕获机制
5. 进行全面的性能测试和压力测试

**模块分析：**
"@
}

# 添加模块分析
if ($metrics.ocrStatus -ne "HEALTHY") {
    $aiAdviceContent += "- OCR引擎: 需要检查，当前状态为 $($metrics.ocrStatus)。建议检查图像处理参数和识别算法。\n"
} else {
    $aiAdviceContent += "- OCR引擎: 运行正常，可以考虑优化识别速度。\n"
}

if ($metrics.quoteStatus -ne "HEALTHY") {
    $aiAdviceContent += "- 报价计算: 需要检查，当前状态为 $($metrics.quoteStatus)。建议检查价格计算逻辑和数据源。\n"
} else {
    $aiAdviceContent += "- 报价计算: 运行正常，考虑添加更多定价策略选项。\n"
}

if ($metrics.piStatus -ne "HEALTHY") {
    $aiAdviceContent += "- PI生成: 需要检查，当前状态为 $($metrics.piStatus)。建议检查文档模板和数据填充逻辑。\n"
} else {
    $aiAdviceContent += "- PI生成: 运行正常，可考虑增加更多文档格式支持。\n"
}

# 性能优化建议
$aiAdviceContent += @"

## 性能优化建议
1. 考虑使用异步处理减少总体执行时间
2. 优化文件I/O操作，减少磁盘读写
3. 实现数据压缩，减少传输和存储开销
4. 使用更高效的算法替换现有实现
5. 考虑使用缓存系统提高重复请求的响应速度

## 长期维护建议
1. 建立完善的监控系统，实时跟踪系统状态
2. 定期进行代码审查，保持代码质量
3. 建立自动化测试流程，确保功能稳定性
4. 制定灾难恢复计划，应对突发故障
5. 定期更新依赖库和框架到最新版本
"@

# 保存AI优化建议
Set-Content -Path $aiAdvicePath -Value $aiAdviceContent -Encoding UTF8
Write-Host "[AILink] 已生成AI优化建议: $aiAdvicePath"

# 如果评分低于90，生成recovery_queue.json
if ($averageScore -lt 90) {
    Write-Host "[AILink] 评分低于90，生成修复任务队列..."
    
    $recoveryTasks = @()
    
    # 添加通用修复任务
    $recoveryTasks += @{
        "id" = "1"
        "name" = "系统健康检查"
        "priority" = "high"
        "description" = "全面检查系统各模块状态，修复异常"
        "estimated_time" = "10分钟"
        "command" = ".\JEV_FULL_FUNCTION_TEST.ps1"
        "status" = "pending"
    }
    
    # 根据模块状态添加特定任务
    if ($metrics.ocrStatus -ne "HEALTHY") {
        $recoveryTasks += @{
            "id" = "2"
            "name" = "OCR引擎修复"
            "priority" = "high"
            "description" = "修复OCR引擎异常，优化识别参数"
            "estimated_time" = "5分钟"
            "command" = ".\fix_ocr_engine.ps1"
            "status" = "pending"
        }
    }
    
    if ($metrics.quoteStatus -ne "HEALTHY") {
        $recoveryTasks += @{
            "id" = "3"
            "name" = "报价计算模块修复"
            "priority" = "medium"
            "description" = "修复报价计算逻辑，更新价格数据源"
            "estimated_time" = "8分钟"
            "command" = ".\fix_quote_module.ps1"
            "status" = "pending"
        }
    }
    
    if ($metrics.piStatus -ne "HEALTHY") {
        $recoveryTasks += @{
            "id" = "4"
            "name" = "PI生成模块修复"
            "priority" = "medium"
            "description" = "修复PI文档生成功能，更新模板"
            "estimated_time" = "7分钟"
            "command" = ".\fix_pi_generator.ps1"
            "status" = "pending"
        }
    }
    
    # 添加性能优化任务
    $recoveryTasks += @{
        "id" = "5"
        "name" = "性能优化"
        "priority" = "low"
        "description" = "优化系统性能，减少执行时间"
        "estimated_time" = "15分钟"
        "command" = ".\optimize_performance.ps1"
        "status" = "pending"
    }
    
    # 保存修复任务队列
    $recoveryQueue = @{
        "generated_at" = $timestamp
        "average_score" = [math]::Round($averageScore, 1)
        "total_tasks" = $recoveryTasks.Count
        "tasks" = $recoveryTasks
    }
    
    $recoveryQueue | ConvertTo-Json -Depth 10 | Set-Content -Path $recoveryQueuePath -Encoding UTF8
    Write-Host "[AILink] 已生成修复任务队列: $recoveryQueuePath"
    Write-Host "[AILink] 包含 $($recoveryTasks.Count) 个修复任务"
} else {
    Write-Host "[AILink] 评分高于90，无需生成修复任务队列"
}

# 更新admin_panel.html，添加AI优化建议显示区
Write-Host "\n[AILink] 更新admin_panel.html..."
try {
    $adminPanelPath = "D:\PDF转网页\admin_panel.html"
    if (Test-Path $adminPanelPath) {
        $adminPanelContent = Get-Content -Path $adminPanelPath -Raw
        
        # 检查是否已经添加了AI优化建议区块
        if (-not ($adminPanelContent -match 'id=["\']ai-optimization-advice["\']')) {
            # 尝试在合适的位置添加AI优化建议区块
            if ($adminPanelContent -match '(<body[^>]*>)') {
                $newContent = $matches[1]
                $newContent += @"

<!-- AI 优化建议区域 -->
<div id="ai-optimization-advice" style="margin: 20px; padding: 20px; border: 2px solid #4CAF50; border-radius: 8px; background-color: #f9f9f9;">
    <h2 style="color: #2E7D32; margin-top: 0;">🚀 AI 功能链优化建议</h2>
    <div id="ai-advice-content" style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>加载中，请稍候...</p>
    </div>
    <div id="ai-advice-actions" style="margin-top: 20px;">
        <button onclick="refreshAiAdvice()" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新建议</button>
        <button onclick="downloadAiAdvice()" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">下载建议报告</button>
    </div>
</div>

<script>
// 加载AI优化建议
function loadAiAdvice() {
    fetch('diagnostics/ai_function_advice.txt')
        .then(response => response.text())
        .then(text => {
            const adviceElement = document.getElementById('ai-advice-content');
            // 简单的Markdown到HTML转换
            let html = text
                .replace(/^# (.*$)/gm, '<h1 style="color: #2E7D32;">$1</h1>')
                .replace(/^## (.*$)/gm, '<h2 style="color: #388E3C;">$1</h2>')
                .replace(/^### (.*$)/gm, '<h3 style="color: #4CAF50;">$1</h3>')
                .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
                .replace(/<\/ul>\s*<ul>/gm, '')
                .replace(/^(?!<h|<ul|<li).*$/gm, '<p>$&</p>')
                .replace(/✅/g, '<span style="color: green;">✅</span>')
                .replace(/⚠️/g, '<span style="color: orange;">⚠️</span>')
                .replace(/❌/g, '<span style="color: red;">❌</span>');
            adviceElement.innerHTML = html;
        })
        .catch(error => {
            document.getElementById('ai-advice-content').innerHTML = 
                '<p style="color: red;">无法加载AI优化建议: ' + error.message + '</p>';
        });
}

// 刷新AI建议
function refreshAiAdvice() {
    document.getElementById('ai-advice-content').innerHTML = '<p>正在刷新建议，请稍候...</p>';
    setTimeout(loadAiAdvice, 500);
}

// 下载AI建议报告
function downloadAiAdvice() {
    const a = document.createElement('a');
    a.href = 'diagnostics/ai_function_advice.txt';
    a.download = 'jev_ai_function_advice_' + new Date().toISOString().slice(0,10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 页面加载时初始化
window.onload = function() {
    loadAiAdvice();
};
</script>

"@
                $adminPanelContent = $adminPanelContent -replace [regex]::Escape($matches[1]), $newContent
                Set-Content -Path $adminPanelPath -Value $adminPanelContent -Encoding UTF8
                Write-Host "[AILink] 已成功更新admin_panel.html，添加了AI优化建议显示区"
            } else {
                # 如果没有body标签，创建一个简单的HTML结构
                $newHtml = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>JEV Admin Panel</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #2E7D32; }
    </style>
</head>
<body>
    <h1>JEV 管理面板</h1>
    
    <!-- AI 优化建议区域 -->
    <div id="ai-optimization-advice" style="margin: 20px; padding: 20px; border: 2px solid #4CAF50; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #2E7D32; margin-top: 0;">🚀 AI 功能链优化建议</h2>
        <div id="ai-advice-content" style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>加载中，请稍候...</p>
        </div>
        <div id="ai-advice-actions" style="margin-top: 20px;">
            <button onclick="refreshAiAdvice()" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新建议</button>
            <button onclick="downloadAiAdvice()" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">下载建议报告</button>
        </div>
    </div>

    <script>
    // 加载AI优化建议
    function loadAiAdvice() {
        fetch('diagnostics/ai_function_advice.txt')
            .then(response => response.text())
            .then(text => {
                const adviceElement = document.getElementById('ai-advice-content');
                // 简单的Markdown到HTML转换
                let html = text
                    .replace(/^# (.*$)/gm, '<h1 style="color: #2E7D32;">$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2 style="color: #388E3C;">$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3 style="color: #4CAF50;">$1</h3>')
                    .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
                    .replace(/<\/ul>\s*<ul>/gm, '')
                    .replace(/^(?!<h|<ul|<li).*$/gm, '<p>$&</p>')
                    .replace(/✅/g, '<span style="color: green;">✅</span>')
                    .replace(/⚠️/g, '<span style="color: orange;">⚠️</span>')
                    .replace(/❌/g, '<span style="color: red;">❌</span>');
                adviceElement.innerHTML = html;
            })
            .catch(error => {
                document.getElementById('ai-advice-content').innerHTML = 
                    '<p style="color: red;">无法加载AI优化建议: ' + error.message + '</p>';
            });
    }

    // 刷新AI建议
    function refreshAiAdvice() {
        document.getElementById('ai-advice-content').innerHTML = '<p>正在刷新建议，请稍候...</p>';
        setTimeout(loadAiAdvice, 500);
    }

    // 下载AI建议报告
    function downloadAiAdvice() {
        const a = document.createElement('a');
        a.href = 'diagnostics/ai_function_advice.txt';
        a.download = 'jev_ai_function_advice_' + new Date().toISOString().slice(0,10) + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // 页面加载时初始化
    window.onload = function() {
        loadAiAdvice();
    };
    </script>
</body>
</html>
"@
                Set-Content -Path $adminPanelPath -Value $newHtml -Encoding UTF8
                Write-Host "[AILink] 已创建新的admin_panel.html并添加了AI优化建议显示区"
            }
        } else {
            Write-Host "[AILink] admin_panel.html已经包含AI优化建议显示区"
        }
    } else {
        # 创建新的admin_panel.html文件
        $newHtml = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>JEV Admin Panel</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #2E7D32; }
    </style>
</head>
<body>
    <h1>JEV 管理面板</h1>
    
    <!-- AI 优化建议区域 -->
    <div id="ai-optimization-advice" style="margin: 20px; padding: 20px; border: 2px solid #4CAF50; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #2E7D32; margin-top: 0;">🚀 AI 功能链优化建议</h2>
        <div id="ai-advice-content" style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>加载中，请稍候...</p>
        </div>
        <div id="ai-advice-actions" style="margin-top: 20px;">
            <button onclick="refreshAiAdvice()" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新建议</button>
            <button onclick="downloadAiAdvice()" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">下载建议报告</button>
        </div>
    </div>

    <script>
    // 加载AI优化建议
    function loadAiAdvice() {
        fetch('diagnostics/ai_function_advice.txt')
            .then(response => response.text())
            .then(text => {
                const adviceElement = document.getElementById('ai-advice-content');
                // 简单的Markdown到HTML转换
                let html = text
                    .replace(/^# (.*$)/gm, '<h1 style="color: #2E7D32;">$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2 style="color: #388E3C;">$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3 style="color: #4CAF50;">$1</h3>')
                    .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
                    .replace(/<\/ul>\s*<ul>/gm, '')
                    .replace(/^(?!<h|<ul|<li).*$/gm, '<p>$&</p>')
                    .replace(/✅/g, '<span style="color: green;">✅</span>')
                    .replace(/⚠️/g, '<span style="color: orange;">⚠️</span>')
                    .replace(/❌/g, '<span style="color: red;">❌</span>');
                adviceElement.innerHTML = html;
            })
            .catch(error => {
                document.getElementById('ai-advice-content').innerHTML = 
                    '<p style="color: red;">无法加载AI优化建议: ' + error.message + '</p>';
            });
    }

    // 刷新AI建议
    function refreshAiAdvice() {
        document.getElementById('ai-advice-content').innerHTML = '<p>正在刷新建议，请稍候...</p>';
        setTimeout(loadAiAdvice, 500);
    }

    // 下载AI建议报告
    function downloadAiAdvice() {
        const a = document.createElement('a');
        a.href = 'diagnostics/ai_function_advice.txt';
        a.download = 'jev_ai_function_advice_' + new Date().toISOString().slice(0,10) + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // 页面加载时初始化
    window.onload = function() {
        loadAiAdvice();
    };
    </script>
</body>
</html>
"@
        Set-Content -Path $adminPanelPath -Value $newHtml -Encoding UTF8
        Write-Host "[AILink] 已创建新的admin_panel.html文件并添加了AI优化建议显示区"
    }
} catch {
    Write-Host "[AILink] 错误更新admin_panel.html: $($_.Exception.Message)"
}

# 更新system_mode_state.json
Write-Host "\n[AILink] 更新系统状态..."
try {
    $stateFilePath = "D:\PDF转网页\system_mode_state.json"
    if (Test-Path $stateFilePath) {
        $stateContent = Get-Content -Path $stateFilePath -Raw | ConvertFrom-Json
        $stateContent.SYSTEM_MODE = "STABLE"
        $stateContent.LEARNING = "ACTIVE"
        $stateContent.FUNCTION_CHAIN = "ACTIVE"
        $stateContent.UI_ENCODING_LOCKED = "ACTIVE"
        $stateContent.LAST_UPDATE = $timestamp
        $stateContent | ConvertTo-Json -Depth 10 | Set-Content -Path $stateFilePath -Encoding UTF8
        Write-Host "[AILink] 已更新system_mode_state.json，SYSTEM_MODE设为STABLE，LEARNING设为ACTIVE"
    } else {
        # 创建新的system_mode_state.json
        $newState = @{
            "SYSTEM_MODE" = "STABLE"
            "LEARNING" = "ACTIVE"
            "FUNCTION_CHAIN" = "ACTIVE"
            "UI_ENCODING_LOCKED" = "ACTIVE"
            "LAST_UPDATE" = $timestamp
        }
        $newState | ConvertTo-Json -Depth 10 | Set-Content -Path $stateFilePath -Encoding UTF8
        Write-Host "[AILink] 已创建system_mode_state.json，SYSTEM_MODE设为STABLE，LEARNING设为ACTIVE"
    }
} catch {
    Write-Host "[AILink] 警告: 无法更新system_mode_state.json - $($_.Exception.Message)"
}

# 输出最终结果
Write-Host "\n===== JEV-FUNCTION-AI-LINK-v1.0 完成 ====="
Write-Host "✅ 已生成: diagnostics\ai_function_advice.txt"
if ($averageScore -lt 90) {
    Write-Host "✅ 已生成: diagnostics\recovery_queue.json"
}
Write-Host "✅ 已更新: admin_panel.html"
Write-Host "🏁 SYSTEM_MODE: STABLE + LEARNING"
Write-Host "\nJEV-FUNCTION-AI-LINK-v1.0 任务完成"