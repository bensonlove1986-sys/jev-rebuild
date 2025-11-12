// JEV WebSocket 实时仪表盘 - 前端逻辑
// 功能：通过WebSocket实时接收并显示Worker状态更新

// 配置常量
const WEBSOCKET_URL = 'wss://jevshop.bensonlove1986.workers.dev/ws';
const MAX_HISTORY = 10; // 最多保留10次历史数据

// 全局状态
let ws = null;
let reconnectTimer = null;
let isConnected = false;
let isPaused = false;
let uptimeHistory = [];
let lastAgentCount = 0;
let successStreak = 0;
let totalChecks = 0;
let successChecks = 0;
let lastUpdateTime = new Date();

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('JEV WebSocket Dashboard 初始化中...');
    
    // 初始化图表
    initCharts();
    
    // 连接WebSocket
    connectWebSocket();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 更新最后更新时间
    updateLastUpdated();
});

// 初始化图表
function initCharts() {
    // 正常率折线图
    window.uptimeChart = new Chart(
        document.getElementById('chart-uptime'),
        {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '成功率',
                    data: [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: '#10B981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#F8FAFC',
                        bodyColor: '#F8FAFC',
                        borderColor: '#334155',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `成功率: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94A3B8',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94A3B8',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 500
                }
            }
        }
    );
    
    // 成功率环图
    window.successRateChart = new Chart(
        document.getElementById('chart-success-rate'),
        {
            type: 'doughnut',
            data: {
                labels: ['成功', '失败'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94A3B8',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#F8FAFC',
                        bodyColor: '#F8FAFC',
                        borderColor: '#334155',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        }
    );
}

// 连接WebSocket
function connectWebSocket() {
    try {
        // 关闭现有连接
        if (ws) {
            ws.close();
        }
        
        // 创建新连接
        console.log('正在连接 WebSocket:', WEBSOCKET_URL);
        updateConnectionStatus('connecting');
        updateWorkerStatus('connecting');
        
        ws = new WebSocket(WEBSOCKET_URL);
        
        // 连接打开
        ws.onopen = function(event) {
            console.log('WebSocket 连接成功');
            isConnected = true;
            updateConnectionStatus('connected');
            updateWorkerStatus('connected');
            showToast('WebSocket 连接成功！', 'success');
            
            // 清除重连定时器
            if (reconnectTimer) {
                clearInterval(reconnectTimer);
                reconnectTimer = null;
            }
            
            // 发送注册消息
            ws.send(JSON.stringify({
                type: 'register',
                client_info: {
                    browser: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }
            }));
        };
        
        // 接收消息
        ws.onmessage = function(event) {
            if (isPaused) {
                console.log('接收已暂停，忽略消息:', event.data);
                return;
            }
            
            try {
                const data = JSON.parse(event.data);
                console.log('收到 WebSocket 消息:', data);
                
                // 更新最后更新时间
                lastUpdateTime = new Date();
                updateLastUpdated();
                
                // 根据消息类型处理
                if (data.type === 'status') {
                    handleStatusMessage(data);
                } else if (data.type === 'alert') {
                    handleAlertMessage(data);
                } else if (data.type === 'welcome') {
                    handleWelcomeMessage(data);
                } else if (data.type === 'pong') {
                    handlePongMessage(data);
                }
            } catch (error) {
                console.error('解析 WebSocket 消息失败:', error);
                addLogEntry('解析WebSocket消息失败', 'error');
            }
        };
        
        // 连接关闭
        ws.onclose = function(event) {
            console.log('WebSocket 连接关闭:', event);
            isConnected = false;
            updateConnectionStatus('disconnected');
            updateWorkerStatus('disconnected');
            showToast('WebSocket 连接断开，尝试重连...', 'warning');
            
            // 尝试重连
            startReconnect();
        };
        
        // 连接错误
        ws.onerror = function(error) {
            console.error('WebSocket 错误:', error);
            isConnected = false;
            updateConnectionStatus('error');
            updateWorkerStatus('error');
            addLogEntry('WebSocket连接错误', 'error');
        };
        
    } catch (error) {
        console.error('创建 WebSocket 连接失败:', error);
        updateConnectionStatus('error');
        updateWorkerStatus('error');
        showToast('WebSocket 连接失败！', 'error');
        
        // 添加错误日志
        addLogEntry('创建WebSocket连接失败', 'error');
        
        // 尝试降级到轮询模式
        startPolling();
    }
}

// 开始重连
function startReconnect() {
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
    }
    
    // 每5秒尝试重连一次
    reconnectTimer = setInterval(() => {
        console.log('尝试重新连接 WebSocket...');
        connectWebSocket();
    }, 5000);
}

// 处理状态消息
function handleStatusMessage(data) {
    // 更新顶部状态栏
    const isOnline = data.agents_online !== undefined;
    updateWorkerStatus(isOnline ? 'online' : 'offline', data);
    
    // 更新统计卡片
    document.getElementById('agent-count').textContent = data.agents_online || 0;
    document.getElementById('agent-total').textContent = data.agents_total || 0;
    document.getElementById('r2-usage').textContent = data.r2_usage || '0 B';
    document.getElementById('last-check').textContent = formatDateTime(data.timestamp) || '--';
    document.getElementById('success-rate').textContent = data.success_rate || 0;
    document.getElementById('success-count').textContent = data.status_checks || 0;
    
    // 更新连续成功次数
    if (data.success_rate === 100) {
        successStreak++;
    } else {
        successStreak = 0;
    }
    document.getElementById('success-streak').textContent = successStreak;
    
    // 更新Agent数量变化
    if (lastAgentCount > 0) {
        const change = (data.agents_online || 0) - lastAgentCount;
        const changeElement = document.getElementById('agent-change');
        if (change > 0) {
            changeElement.className = 'text-green-400';
            changeElement.textContent = `+${change}`;
        } else if (change < 0) {
            changeElement.className = 'text-red-400';
            changeElement.textContent = `${change}`;
        } else {
            changeElement.className = 'text-dark-text-secondary';
            changeElement.textContent = '0';
        }
    }
    lastAgentCount = data.agents_online || 0;
    
    // 更新R2进度
    const r2Total = 1024 * 1024 * 1024; // 假设总容量为1GB
    const r2UsageBytes = parseBytes(data.r2_usage || '0 B');
    const r2Percentage = Math.min(100, Math.round((r2UsageBytes / r2Total) * 100));
    document.getElementById('r2-progress').style.width = `${r2Percentage}%`;
    document.getElementById('r2-percentage').textContent = `${r2Percentage}%`;
    
    // 更新图表计数
    document.getElementById('chart-success-rate').textContent = data.success_checks || 0;
    document.getElementById('chart-total').textContent = data.status_checks || 0;
    
    // 更新统计数据
    totalChecks = data.status_checks || 0;
    successChecks = data.success_checks || 0;
    
    // 记录正常率数据
    addUptimeData(data.success_rate || 0);
    
    // 更新图表
    updateCharts();
    
    // 更新Agent列表
    if (data.agents && Array.isArray(data.agents)) {
        updateAgentList(data.agents);
    }
    
    // 添加日志
    if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach(log => {
            addLogEntry(log, 'info');
        });
    }
}

// 处理警报消息
function handleAlertMessage(data) {
    console.warn('收到警报:', data.message);
    
    // 显示警报
    showAlert(data);
    
    // 添加日志
    addLogEntry(data.message, 'error');
    
    // 闪烁警报容器
    const alertContainer = document.getElementById('alert-container');
    alertContainer.classList.add('alert-flash');
    setTimeout(() => {
        alertContainer.classList.remove('alert-flash');
    }, 1500);
}

// 处理欢迎消息
function handleWelcomeMessage(data) {
    console.log('收到欢迎消息:', data.message);
    addLogEntry(data.message, 'info');
}

// 处理pong消息
function handlePongMessage(data) {
    // 计算延迟
    const now = new Date();
    const timestamp = new Date(data.timestamp);
    const latency = now - timestamp;
    document.getElementById('latency').textContent = `${latency} ms`;
}

// 更新连接状态
function updateConnectionStatus(status) {
    const wsStatus = document.getElementById('ws-status');
    
    switch (status) {
        case 'connecting':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>连接中...';
            break;
        case 'connected':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-blue-500/20 text-blue-400';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>已连接';
            break;
        case 'disconnected':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-red-500/20 text-red-400';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-red-400 mr-2"></span>已断开';
            break;
        case 'error':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-red-500/20 text-red-400';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-red-400 mr-2"></span>连接错误';
            break;
    }
}

// 更新Worker状态
function updateWorkerStatus(status, data = {}) {
    const statusElement = document.getElementById('worker-status');
    
    switch (status) {
        case 'connecting':
            statusElement.innerHTML = `
                <span class="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>
                <span>正在连接 Worker...</span>
            `;
            break;
        case 'connected':
            const statusText = data.ai_connected ? '✅ Worker 正常运行' : '⚠️ Worker 运行中';
            statusElement.innerHTML = `
                <span class="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                <span>${statusText} | ${data.agents_online || 0} 个 Agent 在线 | 上次心跳: ${formatDateTime(data.timestamp) || '--'}</span>
            `;
            break;
        case 'online':
            statusElement.innerHTML = `
                <span class="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                <span>✅ Worker 在线 | ${data.agents_online || 0} 个 Agent 在线 | 上次心跳: ${formatDateTime(data.timestamp) || '--'}</span>
            `;
            break;
        case 'offline':
            statusElement.innerHTML = `
                <span class="inline-block w-2 h-2 rounded-full bg-red-400 mr-2"></span>
                <span>❌ Worker 离线 | 请检查服务器状态</span>
            `;
            break;
        case 'error':
            statusElement.innerHTML = `
                <span class="inline-block w-2 h-2 rounded-full bg-red-400 mr-2"></span>
                <span>❌ 连接错误 | 请检查网络连接</span>
            `;
            break;
    }
}

// 更新Agent列表
function updateAgentList(agents) {
    const agentListElement = document.getElementById('agent-list');
    agentListElement.innerHTML = '';
    
    if (agents.length === 0) {
        agentListElement.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-dark-text-secondary">暂无 Agent</td>
            </tr>
        `;
    } else {
        agents.forEach(agent => {
            const row = document.createElement('tr');
            row.className = 'border-b border-dark-border hover:bg-dark-border/30 fade-in';
            
            // 判断状态颜色
            const isOnline = agent.status === 'online';
            const statusColor = isOnline ? 'text-green-400' : 'text-yellow-400';
            const statusText = isOnline ? '在线' : '离线';
            
            row.innerHTML = `
                <td class="py-2 px-1 font-medium">${agent.agent_id || '未知'}</td>
                <td class="py-2 px-1">${agent.hostname || '未知'}</td>
                <td class="py-2 px-1">
                    <span class="inline-block px-2 py-0.5 rounded-full bg-dark-border ${statusColor} text-xs">
                        ${statusText}
                    </span>
                </td>
                <td class="py-2 px-1 text-dark-text-secondary text-xs">
                    ${agent.last_heartbeat ? formatDateTime(agent.last_heartbeat) : '暂无'}
                </td>
            `;
            
            agentListElement.appendChild(row);
        });
    }
    
    // 更新数量显示
    document.getElementById('agent-list-count').textContent = `共 ${agents.length} 个 Agent`;
    
    console.log('Agent 列表更新成功:', agents.length, '个 Agent');
}

// 添加日志条目
function addLogEntry(message, level = 'info') {
    const logListElement = document.getElementById('report-list');
    
    // 创建日志项
    const logItem = document.createElement('div');
    
    // 根据日志级别设置样式
    let textColor = 'text-white';
    let bgColor = 'bg-dark-border/30';
    let icon = '📝';
    
    if (level === 'error' || message.includes('ERROR') || message.includes('错误') || message.includes('🚨')) {
        textColor = 'text-red-300';
        bgColor = 'bg-red-500/10';
        icon = '❌';
    } else if (level === 'warn' || message.includes('WARNING') || message.includes('警告') || message.includes('⚠️')) {
        textColor = 'text-yellow-300';
        bgColor = 'bg-yellow-500/10';
        icon = '⚠️';
    } else if (level === 'success' || message.includes('success') || message.includes('成功') || message.includes('✅')) {
        textColor = 'text-green-300';
        bgColor = 'bg-green-500/10';
        icon = '✅';
    }
    
    logItem.className = `${bgColor} rounded-lg p-3 ${textColor} overflow-hidden fade-in`;
    logItem.innerHTML = `
        <div class="flex items-start">
            <span class="inline-block mr-2 text-lg mt-0.5">${icon}</span>
            <div class="flex-1">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-medium">${formatDateTime(new Date())}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded-full bg-dark-border">${level}</span>
                </div>
                <div class="text-sm break-words">${message}</div>
            </div>
        </div>
    `;
    
    // 添加到列表顶部
    logListElement.insertBefore(logItem, logListElement.firstChild);
    
    // 限制列表长度
    const maxLogs = 20;
    while (logListElement.children.length > maxLogs) {
        logListElement.removeChild(logListElement.lastChild);
    }
    
    // 更新数量显示
    document.getElementById('report-count').textContent = `实时更新 · 最近 ${logListElement.children.length} 条`;
    
    // 自动滚动到底部（顶部）
    logListElement.scrollTop = 0;
}

// 显示警报
function showAlert(data) {
    const alertContainer = document.getElementById('alert-container');
    
    // 创建警报元素
    const alert = document.createElement('div');
    alert.className = 'card p-4 bg-red-500/10 border-l-4 border-red-500 fade-in slide-in';
    alert.innerHTML = `
        <div class="flex items-start">
            <span class="text-red-400 text-xl mr-3">🚨</span>
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <h4 class="font-medium text-red-300">系统警报</h4>
                    <span class="text-xs text-dark-text-secondary">${formatDateTime(data.timestamp)}</span>
                </div>
                <p class="mt-1 text-white">${data.message}</p>
                ${data.agent_id ? `<p class="text-xs text-dark-text-secondary mt-1">Agent ID: ${data.agent_id}</p>` : ''}
            </div>
        </div>
    `;
    
    // 添加到容器
    alertContainer.appendChild(alert);
    
    // 30秒后自动移除
    setTimeout(() => {
        alert.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
            if (alertContainer.contains(alert)) {
                alertContainer.removeChild(alert);
            }
        }, 300);
    }, 30000);
    
    // 播放提示音
    playNotificationSound('error');
}

// 添加正常率数据
function addUptimeData(successRate) {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    uptimeHistory.push({
        timestamp: timestamp,
        successRate: successRate
    });
    
    // 保持历史数据不超过最大限制
    if (uptimeHistory.length > MAX_HISTORY) {
        uptimeHistory = uptimeHistory.slice(-MAX_HISTORY);
    }
}

// 更新图表
function updateCharts() {
    // 更新正常率折线图
    if (window.uptimeChart && uptimeHistory.length > 0) {
        const labels = uptimeHistory.map(item => item.timestamp);
        const data = uptimeHistory.map(item => item.successRate);
        
        window.uptimeChart.data.labels = labels;
        window.uptimeChart.data.datasets[0].data = data;
        window.uptimeChart.update('active');
    }
    
    // 更新成功率环图
    if (window.successRateChart) {
        window.successRateChart.data.datasets[0].data = [successChecks, totalChecks - successChecks];
        window.successRateChart.update('active');
    }
}

// 开始轮询（降级方案）
function startPolling() {
    console.log('降级到轮询模式');
    showToast('WebSocket连接失败，已切换到轮询模式', 'warning');
    addLogEntry('WebSocket连接失败，已切换到轮询模式', 'warn');
    
    // 定期轮询数据
    setInterval(() => {
        fetch('https://jevshop.bensonlove1986.workers.dev/status')
            .then(response => response.json())
            .then(data => {
                handleStatusMessage(data);
            })
            .catch(error => {
                console.error('轮询失败:', error);
                addLogEntry('轮询状态失败', 'error');
            });
    }, 5000);
}

// 绑定事件监听器
function bindEventListeners() {
    // 暂停/恢复按钮
    const pauseBtn = document.getElementById('pause-btn');
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        
        if (isPaused) {
            pauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                恢复接收
            `;
            showToast('已暂停接收消息', 'info');
        } else {
            pauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                暂停接收
            `;
            showToast('已恢复接收消息', 'info');
            // 立即请求刷新
            if (isConnected) {
                ws.send(JSON.stringify({ type: 'refresh' }));
            }
        }
    });
    
    // 手动刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (isConnected) {
            // 发送刷新请求
            ws.send(JSON.stringify({ type: 'refresh' }));
            showToast('已请求刷新数据', 'info');
        } else {
            // 重新连接
            connectWebSocket();
            showToast('正在重新连接...', 'info');
        }
    });
    
    // 导出数据按钮
    document.getElementById('export-btn').addEventListener('click', exportData);
}

// 导出数据
function exportData() {
    const exportData = {
        generated_at: new Date().toISOString(),
        uptime_history: uptimeHistory,
        system_status: {
            agents_online: parseInt(document.getElementById('agent-count').textContent) || 0,
            agents_total: parseInt(document.getElementById('agent-total').textContent) || 0,
            success_rate: parseInt(document.getElementById('success-rate').textContent) || 0,
            total_checks: totalChecks,
            success_checks: successChecks,
            last_update: lastUpdateTime.toISOString(),
            connection_status: isConnected ? 'WebSocket' : 'Disconnected',
            ws_url: WEBSOCKET_URL
        },
        r2_usage: document.getElementById('r2-usage').textContent
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jev_ws_dashboard_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    a.click();
    
    // 清理
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
    
    showToast('数据已导出', 'success');
    addLogEntry('仪表盘数据已导出', 'success');
}

// 显示Toast提示
function showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    const container = document.getElementById('toast-container');
    
    // 设置样式
    let bgColor = 'bg-blue-500/90';
    let borderColor = 'border-l-4 border-blue-500';
    let icon = '📝';
    
    if (type === 'success') {
        bgColor = 'bg-green-500/90';
        borderColor = 'border-l-4 border-green-500';
        icon = '✅';
    } else if (type === 'error') {
        bgColor = 'bg-red-500/90';
        borderColor = 'border-l-4 border-red-500';
        icon = '❌';
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-500/90';
        borderColor = 'border-l-4 border-yellow-500';
        icon = '⚠️';
    }
    
    toast.className = `${bgColor} ${borderColor} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-[-20px] opacity-0 max-w-sm flex items-center`;
    toast.innerHTML = `
        <span class="mr-3 text-lg">${icon}</span>
        <span>${message}</span>
    `;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 显示Toast
    setTimeout(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        
        // 移除元素
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// 播放通知音（简化版）
function playNotificationSound(type) {
    // 这里可以添加实际的音频播放代码
    console.log(`播放${type}通知音`);
}

// 更新最后更新时间
function updateLastUpdated() {
    document.getElementById('last-updated').textContent = formatDateTime(lastUpdateTime);
}

// 格式化日期时间
function formatDateTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 解析字节字符串
function parseBytes(bytesString) {
    if (!bytesString) return 0;
    
    const parts = bytesString.trim().split(' ');
    if (parts.length !== 2) return 0;
    
    const value = parseFloat(parts[0]);
    const unit = parts[1].toUpperCase();
    
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };
    
    return value * (units[unit] || 1);
}

// 页面关闭时清理
window.addEventListener('beforeunload', () => {
    if (ws) {
        ws.close();
    }
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
    }
});

// 初始化时显示欢迎消息
showToast('JEV WebSocket 仪表盘已启动', 'info');