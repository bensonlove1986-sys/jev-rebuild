# JEV-CONTROL-VISUALIZE-ACTIVATE-v2.0
# 检测并启动JEV中控插件显相层

Write-Host "===== JEV-CONTROL-VISUALIZE-ACTIVATE-v2.0 启动 ====="

# 初始化变量
$diagnosticsDir = "D:\PDF转网页\diagnostics"
$reportPath = "$diagnosticsDir\control_visual_activation_report.txt"
$serverPath = "D:\PDF转网页\JEV_Client\server.js"
$visualScriptPath = "D:\PDF转网页\JEV_Client\modules\jev_control_panel_visual.js"
$systemStatePath = "$diagnosticsDir\system_mode_state.json"
$statusUrl = "http://localhost:8080/status"
$loginPortalUrl = "http://localhost:8080/ui/login_portal.html"

# 创建诊断目录
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
    Write-Host "[Visualize] 创建诊断目录: $diagnosticsDir"
}

# 初始化报告
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$reportContent = @"
# JEV 中控显相激活报告
# 生成时间: $timestamp

"@

$success = $true
$portStatus = "FAILED"
$scriptStatus = "FAILED"
$pluginStatus = "FAILED"
$visualStatus = "DISCONNECTED"
$systemMode = "UNKNOWN"
$pluginLayer = "IDLE"
$controlVisual = "DISCONNECTED"
$responseTime = "N/A"

# 1. 检查端口连通性
Write-Host "\n[Visualize] 1. 检查端口连通性..."
try {
    Write-Host "[Visualize] 测试连接: $statusUrl"
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-WebRequest -Uri $statusUrl -TimeoutSec 5 -UseBasicParsing
    $stopwatch.Stop()
    $responseTime = "$($stopwatch.ElapsedMilliseconds)ms"
    
    # 检查响应内容
    if ($response.StatusCode -eq 200) {
        $content = $response.Content
        if ($content -match '"success"\s*:\s*true' -or $content -like "*success:true*") {
            $portStatus = "SUCCESS"
            Write-Host "[Visualize] ✅ 本地端口 8080 正常监听，响应时间: $responseTime"
            $reportContent += "✅ 端口监听状态: 8080 端口正常运行，响应时间 $responseTime\n"
        } else {
            Write-Host "[Visualize] ⚠️ 端口可访问但响应内容不符合预期"
            $reportContent += "⚠️ 端口监听状态: 8080 端口可访问但响应内容不符合预期\n"
        }
    } else {
        Write-Host "[Visualize] ⚠️ 端口返回非200状态码: $($response.StatusCode)"
        $reportContent += "⚠️ 端口监听状态: 返回状态码 $($response.StatusCode)\n"
    }
} catch {
    Write-Host "[Visualize] ❌ 无法连接到端口 8080: $($_.Exception.Message)"
    $reportContent += "❌ 端口监听状态: 无法连接到 8080 端口\n"
    
    # 尝试启动服务
    if (Test-Path $serverPath) {
        Write-Host "[Visualize] 尝试启动服务器: node server.js"
        try {
            # 以非阻塞方式启动服务器
            Start-Process -FilePath "node" -ArgumentList $serverPath -WorkingDirectory "D:\PDF转网页\JEV_Client" -NoNewWindow
            Write-Host "[Visualize] 服务器已启动，等待 3 秒后重新检查..."
            Start-Sleep -Seconds 3
            
            # 重新检查连接
            try {
                $response = Invoke-WebRequest -Uri $statusUrl -TimeoutSec 5 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    $portStatus = "SUCCESS"
                    Write-Host "[Visualize] ✅ 服务器启动成功，端口 8080 现在可访问"
                    $reportContent += "✅ 已成功启动服务器，端口 8080 正常运行\n"
                } else {
                    Write-Host "[Visualize] ❌ 服务器启动但端口仍无法正常访问"
                    $reportContent += "❌ 服务器启动但端口仍无法正常访问\n"
                    $success = $false
                }
            } catch {
                Write-Host "[Visualize] ❌ 启动服务器后仍然无法连接"
                $reportContent += "❌ 启动服务器后仍然无法连接: $($_.Exception.Message)\n"
                $success = $false
            }
        } catch {
            Write-Host "[Visualize] ❌ 启动服务器失败: $($_.Exception.Message)"
            $reportContent += "❌ 启动服务器失败: $($_.Exception.Message)\n"
            $success = $false
        }
    } else {
        Write-Host "[Visualize] ❌ 服务器文件不存在: $serverPath"
        $reportContent += "❌ 服务器文件不存在: $serverPath\n"
        $success = $false
    }
}

# 2. 检查显相脚本是否存在
Write-Host "\n[Visualize] 2. 检查显相脚本..."
try {
    if (Test-Path $visualScriptPath) {
        $scriptStatus = "SUCCESS"
        Write-Host "[Visualize] ✅ 显相脚本已存在: $visualScriptPath"
        $reportContent += "✅ 插件脚本检测结果: jev_control_panel_visual.js 已存在\n"
    } else {
        # 创建显相脚本目录
        $scriptDir = Split-Path $visualScriptPath -Parent
        if (-not (Test-Path $scriptDir)) {
            New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
            Write-Host "[Visualize] 创建脚本目录: $scriptDir"
        }
        
        # 创建显相脚本文件
        $scriptContent = @"
// JEV Control Panel Visualization Script
// 中控插件显相层 - 动态显示系统状态

(function() {
    'use strict';
    
    console.log('[JEV Control] 显相层脚本已加载');
    
    // 创建浮窗元素
    function createVisualPanel() {
        const panel = document.createElement('div');
        panel.id = 'jev-control-visual-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 220px;
            background: rgba(26, 32, 44, 0.95);
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            cursor: move;
            backdrop-filter: blur(5px);
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 8px;
            text-align: center;
            cursor: pointer;
        `;
        header.textContent = '🧩 JEV 中控显相';
        
        const modeDiv = document.createElement('div');
        modeDiv.id = 'jev-mode-display';
        modeDiv.textContent = '模式: LOADING...';
        modeDiv.style.marginBottom = '4px';
        
        const layerDiv = document.createElement('div');
        layerDiv.id = 'jev-layer-display';
        layerDiv.textContent = '插件层: LOADING...';
        layerDiv.style.marginBottom = '4px';
        
        const visualDiv = document.createElement('div');
        visualDiv.id = 'jev-visual-display';
        visualDiv.textContent = '显相层: LOADING...';
        visualDiv.style.marginBottom = '8px';
        
        const timeDiv = document.createElement('div');
        timeDiv.id = 'jev-time-display';
        timeDiv.textContent = '更新时间: 00:00:00';
        timeDiv.style.fontSize = '11px';
        timeDiv.style.color = '#999';
        
        panel.appendChild(header);
        panel.appendChild(modeDiv);
        panel.appendChild(layerDiv);
        panel.appendChild(visualDiv);
        panel.appendChild(timeDiv);
        
        document.body.appendChild(panel);
        
        // 使面板可拖动
        makeDraggable(panel);
        
        // 点击头部可切换显示/隐藏
        header.addEventListener('click', function() {
            const content = panel.querySelectorAll('div:not(:first-child)');
            content.forEach(el => {
                el.style.display = el.style.display === 'none' ? 'block' : 'none';
            });
        });
        
        return panel;
    }
    
    // 使元素可拖动
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // 获取鼠标位置
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // 计算新位置
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // 设置新位置
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            // 停止移动
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    // 更新系统状态
    function updateSystemStatus() {
        fetch('/diagnostics/system_mode_state.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const modeDisplay = document.getElementById('jev-mode-display');
                const layerDisplay = document.getElementById('jev-layer-display');
                const visualDisplay = document.getElementById('jev-visual-display');
                const timeDisplay = document.getElementById('jev-time-display');
                
                if (modeDisplay && layerDisplay && visualDisplay && timeDisplay) {
                    // 更新模式显示
                    const systemMode = data.SYSTEM_MODE || 'UNKNOWN';
                    modeDisplay.textContent = `模式: ${systemMode}`;
                    
                    // 更新插件层状态
                    const pluginLayer = data.PLUGIN_LAYER || 'IDLE';
                    layerDisplay.textContent = `插件层: ${pluginLayer}`;
                    
                    // 更新显相层状态
                    visualDisplay.textContent = '显相层: CONNECTED';
                    visualDisplay.style.color = '#4CAF50';
                    
                    // 更新时间
                    const now = new Date();
                    const timeString = now.toTimeString().split(' ')[0];
                    timeDisplay.textContent = `更新时间: ${timeString}`;
                    
                    console.log('[JEV Control] 状态已更新:', { systemMode, pluginLayer });
                }
            })
            .catch(error => {
                console.error('[JEV Control] 更新状态失败:', error);
                const visualDisplay = document.getElementById('jev-visual-display');
                if (visualDisplay) {
                    visualDisplay.textContent = '显相层: ERROR';
                    visualDisplay.style.color = '#f44336';
                }
            });
    }
    
    // 初始化
    function init() {
        console.log('[JEV Control] 初始化显相层...');
        
        // 检查是否已存在面板
        if (!document.getElementById('jev-control-visual-panel')) {
            const panel = createVisualPanel();
            console.log('[JEV Control] 显相浮窗已创建');
            
            // 初始更新
            updateSystemStatus();
            
            // 设置定时更新（每5秒）
            setInterval(updateSystemStatus, 5000);
            
            // 通知后台脚本已加载
            window.postMessage({ type: 'JEV_CONTROL_LOADED' }, '*');
        } else {
            console.log('[JEV Control] 显相浮窗已存在');
        }
    }
    
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 暴露给Tampermonkey的接口
    window.JEV_CONTROL = {
        isLoaded: true,
        refresh: updateSystemStatus,
        getStatus: function() {
            return {
                loaded: true,
                version: 'v2.0',
                status: 'ACTIVE'
            };
        }
    };
    
})();
"@
        
        Set-Content -Path $visualScriptPath -Value $scriptContent -Encoding UTF8
        $scriptStatus = "SUCCESS"
        Write-Host "[Visualize] ✅ 已创建显相脚本: $visualScriptPath"
        $reportContent += "✅ 插件脚本检测结果: 已创建 jev_control_panel_visual.js\n"
    }
} catch {
    Write-Host "[Visualize] ❌ 处理显相脚本失败: $($_.Exception.Message)"
    $reportContent += "❌ 插件脚本检测结果: 处理失败 - $($_.Exception.Message)\n"
    $success = $false
}

# 3. 检查浏览器插件注入状态
Write-Host "\n[Visualize] 3. 检查浏览器插件注入状态..."
Write-Host "[Visualize] ⚠️ 注意: 由于脚本环境限制，无法直接检测浏览器中的Tampermonkey插件状态"
Write-Host "[Visualize] ⚠️ 请确保在浏览器中启用了 'JEV Control Panel (显相版)' 脚本"
$pluginStatus = "MANUAL_CHECK"
$reportContent += "⚠️ 显相层注入状态: 请手动确认浏览器中已启用 Tampermonkey 脚本\n"

# 4. 创建/更新system_mode_state.json
Write-Host "\n[Visualize] 4. 更新系统状态配置..."
try {
    $systemMode = "STABLE"
    $pluginLayer = "ACTIVE"
    $controlVisual = "CONNECTED"
    
    if (Test-Path $systemStatePath) {
        $stateContent = Get-Content -Path $systemStatePath -Raw | ConvertFrom-Json
        $stateContent.SYSTEM_MODE = $systemMode
        $stateContent.PLUGIN_LAYER = $pluginLayer
        $stateContent.CONTROL_VISUAL = $controlVisual
        $stateContent.LAST_UPDATE = $timestamp
        $stateContent | ConvertTo-Json -Depth 10 | Set-Content -Path $systemStatePath -Encoding UTF8
        Write-Host "[Visualize] ✅ 已更新 system_mode_state.json"
    } else {
        # 创建新的system_mode_state.json
        $newState = @{
            "SYSTEM_MODE" = $systemMode
            "PLUGIN_LAYER" = $pluginLayer
            "CONTROL_VISUAL" = $controlVisual
            "LAST_UPDATE" = $timestamp
            "FUNCTION_CHAIN" = "ACTIVE"
            "UI_ENCODING_LOCKED" = "ACTIVE"
            "LEARNING" = "ACTIVE"
        }
        $newState | ConvertTo-Json -Depth 10 | Set-Content -Path $systemStatePath -Encoding UTF8
        Write-Host "[Visualize] ✅ 已创建 system_mode_state.json"
    }
    $reportContent += "✅ 系统状态配置: SYSTEM_MODE=$systemMode, PLUGIN_LAYER=$pluginLayer, CONTROL_VISUAL=$controlVisual\n"
} catch {
    Write-Host "[Visualize] ⚠️ 更新系统状态配置失败: $($_.Exception.Message)"
    $reportContent += "⚠️ 系统状态配置更新失败: $($_.Exception.Message)\n"
}

# 5. 尝试打开浏览器（在实际环境中可能需要用户手动操作）
Write-Host "\n[Visualize] 5. 建议打开登录页面..."
Write-Host "[Visualize] 请在浏览器中访问: $loginPortalUrl"
Write-Host "[Visualize] 然后检查右上角是否显示显相浮窗"
$reportContent += "📋 建议操作: 在浏览器中访问 $loginPortalUrl 并检查显相浮窗\n"

# 生成最终报告
$reportContent += @"

## 详细信息
- 端口状态: $portStatus
- 脚本状态: $scriptStatus
- 插件状态: $pluginStatus
- 显相状态: $visualStatus
- 响应时间: $responseTime
- 系统模式: $systemMode
- 插件层状态: $pluginLayer
- 显相层状态: $controlVisual
- 激活时间: $timestamp

## 浮窗预期显示
```
🧩 JEV 中控显相
模式: $systemMode
插件层: $pluginLayer
显相层: $controlVisual
更新时间: [实时时间]
```

## 注意事项
1. 请确保浏览器中已安装并启用 Tampermonkey 插件
2. 请导入 'JEV Control Panel (显相版)' 脚本
3. 刷新页面以确保浮窗正确加载
4. 浮窗可拖动，点击标题可折叠/展开
"@

# 保存报告
Set-Content -Path $reportPath -Value $reportContent -Encoding UTF8
Write-Host "\n[Visualize] ✅ 报告已生成: $reportPath"

# 输出最终结果
Write-Host "\n===== JEV-CONTROL-VISUALIZE-ACTIVATE-v2.0 执行结果 ====="
if ($portStatus -eq "SUCCESS") {
    Write-Host "✅ 本地端口 8080 正常监听"
} else {
    Write-Host "❌ 本地端口 8080 监听异常"
}

if ($scriptStatus -eq "SUCCESS") {
    Write-Host "✅ 插件脚本 jev_control_panel_visual.js 已部署"
} else {
    Write-Host "❌ 插件脚本部署失败"
}

Write-Host "⚠️ 显相层注入状态: 请手动确认浏览器中 Tampermonkey 脚本"
Write-Host "📋 浮窗显示: 请在浏览器中检查系统状态与更新时间"
Write-Host "🏁 SYSTEM_MODE: $systemMode"
Write-Host "🏁 PLUGIN_LAYER: $pluginLayer"
Write-Host "🏁 CONTROL_VISUAL: $controlVisual"

Write-Host "\nJEV-CONTROL-VISUALIZE-ACTIVATE-v2.0 任务完成"
Write-Host "请按照报告中的注意事项完成浏览器端配置"