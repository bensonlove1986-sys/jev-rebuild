// JEV Worker 实时监控仪表盘 - WebSocket版
// 功能：通过WebSocket实时接收Worker状态更新

// 配置常量
const WORKER_BASE_URL = 'https://jevshop.bensonlove1986.workers.dev';
const WEBSOCKET_URL = WORKER_BASE_URL.replace('https://', 'wss://') + '/ws';
const MAX_HISTORY = 20; // 最多保留20次历史数据

// 全局状态
let uptimeHistory = [];
let socket = null;
let reconnectTimer = null;
let isConnected = false;
let lastAgentCount = 0;
let successStreak = 0;
let totalChecks = 0;
let successChecks = 0;

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('JEV WebSocket Dashboard 初始化中...');
    
    // 初始化图表
    initCharts();
    
    // 连接WebSocket
    connectWebSocket();
    
    // 绑定事件监听器
    bindEventListeners();
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
                    label: '正常率',
                    data: [],
                    borderColor: '#00B42A',
                    backgroundColor: 'rgba(0, 180, 42, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#00B42A',
                    pointBorderColor: '#00B42A'
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
                        backgroundColor: '#272E3B',
                        titleColor: '#F2F3F5',
                        bodyColor: '#F2F3F5',
                        borderColor: '#303846',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `正常率: ${context.raw}%`;
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
                            color: '#86909C',
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
                            color: '#86909C',
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
                    backgroundColor: ['#00B42A', '#F53F3F'],
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
                            color: '#86909C',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#272E3B',
                        titleColor: '#F2F3F5',
                        bodyColor: '#F2F3F5',
                        borderColor: '#303846',
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
        if (socket) {
            socket.close();
        }
        
        // 创建新连接
        console.log('正在连接 WebSocket:', WEBSOCKET_URL);
        updateConnectionStatus('connecting');
        
        socket = new WebSocket(WEBSOCKET_URL);
        
        // 连接打开
        socket.onopen = function(event) {
            console.log('WebSocket 连接成功');
            isConnected = true;
            updateConnectionStatus('connected');
            showToast('WebSocket 连接成功！', 'success');
            
            // 清除重连定时器
            if (reconnectTimer) {
                clearInterval(reconnectTimer);
                reconnectTimer = null;
            }
        };
        
        // 接收消息
        socket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('收到 WebSocket 消息:', data);
                
                // 根据消息类型处理
                if (data.type === 'status_update') {
                    handleStatusUpdate(data.payload);
                } else if (data.type === 'agent_update') {
                    handleAgentUpdate(data.payload);
                } else if (data.type === 'log_entry') {
                    handleLogEntry(data.payload);
                } else if (data.type === 'heartbeat') {
                    handleHeartbeat(data.payload);
                }
            } catch (error) {
                console.error('解析 WebSocket 消息失败:', error);
            }
        };
        
        // 连接关闭
        socket.onclose = function(event) {
            console.log('WebSocket 连接关闭:', event);
            isConnected = false;
            updateConnectionStatus('disconnected');
            showToast('WebSocket 连接断开，尝试重连...', 'warning');
            
            // 尝试重连
            startReconnect();
        };
        
        // 连接错误
        socket.onerror = function(error) {
            console.error('WebSocket 错误:', error);
            isConnected = false;
            updateConnectionStatus('error');
        };
        
    } catch (error) {
        console.error('创建 WebSocket 连接失败:', error);
        updateConnectionStatus('error');
        showToast('WebSocket 连接失败！', 'error');
        
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

// 处理状态更新
function handleStatusUpdate(data) {
    // 更新顶部状态条
    const statusElement = document.getElementById('worker-status');
    const isOnline = data.status === 'online';
    const statusColor = isOnline ? 'bg-success' : 'bg-danger';
    const statusText = isOnline ? '✅ Worker 正常运行' : '❌ Worker 异常';
    
    statusElement.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full ${statusColor} status-indicator mr-2"></span>
        <span>${statusText} | 最近检测：${formatDateTime(data.last_heartbeat)} | R2: ${formatBytes(data.r2_usage)}</span>
    `;
    
    // 更新统计卡片
    document.getElementById('agent-count').textContent = data.agents_online || 0;
    document.getElementById('r2-usage').textContent = formatBytes(data.r2_usage || 0);
    document.getElementById('last-check').textContent = formatDateTime(data.last_heartbeat) || '暂无';
    
    // 更新延迟
    document.getElementById('latency').textContent = `${data.latency || '--'} ms`;
    
    // 更新Agent数量变化
    if (lastAgentCount > 0) {
        const change = (data.agents_online || 0) - lastAgentCount;
        const changeElement = document.getElementById('agent-change');
        if (change > 0) {
            changeElement.className = 'text-primary';
            changeElement.textContent = `+${change}`;
        } else if (change < 0) {
            changeElement.className = 'text-danger';
            changeElement.textContent = `${change}`;
        } else {
            changeElement.className = 'text-gray-400';
            changeElement.textContent = '0';
        }
    }
    lastAgentCount = data.agents_online || 0;
    
    // 更新R2进度
    const r2Total = 1024 * 1024 * 1024; // 假设总容量为1GB
    const r2Percentage = Math.min(100, Math.round((data.r2_usage / r2Total) * 100));
    document.getElementById('r2-progress').style.width = `${r2Percentage}%`;
    document.getElementById('r2-percentage').textContent = `${r2Percentage}%`;
    
    // 更新成功率
    updateSuccessRate(isOnline);
    
    // 记录正常率数据
    addUptimeData(isOnline ? 100 : 0);
    
    // 更新图表
    updateCharts();
}

// 处理Agent更新
function handleAgentUpdate(data) {
    const agentList = data.agents || [];
    
    // 更新 Agent 列表
    const agentListElement = document.getElementById('agent-list');
    agentListElement.innerHTML = '';
    
    if (agentList.length === 0) {
        agentListElement.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-gray-400">暂无在线 Agent</td>
            </tr>
        `;
    } else {
        agentList.forEach(agent => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-700 hover:bg-dark-800 fade-in';
            
            // 判断状态颜色
            const isOnline = agent.status === 'online' || agent.last_heartbeat;
            const statusColor = isOnline ? 'text-success' : 'text-warning';
            const statusText = isOnline ? '在线' : '离线';
            
            row.innerHTML = `
                <td class="py-2 px-1 font-medium">${agent.agent_id || '未知'}</td>
                <td class="py-2 px-1">${agent.hostname || '未知'}</td>
                <td class="py-2 px-1">
                    <span class="inline-block px-2 py-0.5 rounded-full bg-dark-800 ${statusColor} text-xs">
                        ${statusText}
                    </span>
                </td>
                <td class="py-2 px-1 text-gray-400 text-xs">
                    ${agent.last_heartbeat ? formatDateTime(agent.last_heartbeat) : '暂无'}
                </td>
            `;
            
            agentListElement.appendChild(row);
        });
    }
    
    // 更新数量显示
    document.getElementById('agent-list-count').textContent = `共 ${agentList.length} 个 Agent`;
    
    console.log('Agent 列表更新成功:', agentList.length, '个 Agent');
}

// 处理日志条目
function handleLogEntry(data) {
    const logListElement = document.getElementById('report-list');
    
    // 创建日志项
    const logItem = document.createElement('div');
    
    // 根据日志级别设置样式
    let logLevel = 'info';
    let textColor = 'text-gray-300';
    let bgColor = 'bg-dark-800';
    let icon = '📝';
    
    if (data.level === 'error' || data.message.includes('ERROR') || data.message.includes('错误')) {
        logLevel = 'error';
        textColor = 'text-danger';
        bgColor = 'bg-danger/10';
        icon = '❌';
    } else if (data.level === 'warn' || data.message.includes('WARNING') || data.message.includes('警告')) {
        logLevel = 'warn';
        textColor = 'text-warning';
        bgColor = 'bg-warning/10';
        icon = '⚠️';
    } else if (data.level === 'success' || data.message.includes('success') || data.message.includes('成功')) {
        logLevel = 'success';
        textColor = 'text-success';
        bgColor = 'bg-success/10';
        icon = '✅';
    }
    
    logItem.className = `${bgColor} rounded-lg p-3 ${textColor} overflow-hidden fade-in card-hover`;
    logItem.innerHTML = `
        <div class="flex items-start">
            <span class="inline-block mr-2 text-lg mt-0.5">${icon}</span>
            <div class="flex-1">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-medium">${formatDateTime(data.timestamp)}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded-full bg-dark-800">${logLevel}</span>
                </div>
                <div class="text-sm">${data.message}</div>
                ${data.details ? `<div class="text-xs mt-1 text-gray-400">${data.details}</div>` : ''}
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
    
    // 如果是错误日志，显示Toast
    if (logLevel === 'error') {
        showToast(data.message, 'error');
    }
}

// 处理心跳
function handleHeartbeat(data) {
    // 更新最后心跳时间
    document.getElementById('last-check').textContent = formatDateTime(new Date());
    document.getElementById('latency').textContent = `${data.latency || '--'} ms`;
    
    // 更新连接状态指示器（短暂闪烁）
    const wsStatus = document.getElementById('ws-status');
    wsStatus.classList.remove('bg-warning/20', 'text-warning');
    wsStatus.classList.add('bg-success/20', 'text-success');
    
    setTimeout(() => {
        if (isConnected) {
            wsStatus.classList.remove('bg-success/20', 'text-success');
            wsStatus.classList.add('bg-primary/20', 'text-primary');
        }
    }, 500);
}

// 更新连接状态
function updateConnectionStatus(status) {
    const wsStatus = document.getElementById('ws-status');
    
    switch (status) {
        case 'connecting':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-warning/20 text-warning';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-warning mr-2"></span>连接中...';
            break;
        case 'connected':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-primary/20 text-primary';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>已连接';
            break;
        case 'disconnected':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-danger/20 text-danger';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-danger mr-2"></span>已断开';
            break;
        case 'error':
            wsStatus.className = 'flex items-center text-sm px-3 py-1 rounded-full bg-danger/20 text-danger';
            wsStatus.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-danger mr-2"></span>连接错误';
            break;
    }
}

// 更新成功率
function updateSuccessRate(isSuccess) {
    totalChecks++;
    if (isSuccess) {
        successChecks++;
        successStreak++;
    } else {
        successStreak = 0;
    }
    
    const successRate = Math.round((successChecks / totalChecks) * 100);
    
    document.getElementById('success-rate').textContent = successRate;
    document.getElementById('success-count').textContent = totalChecks;
    document.getElementById('success-streak').textContent = successStreak;
    
    // 更新图表计数
    document.getElementById('chart-success-rate').textContent = successChecks;
    document.getElementById('chart-total').textContent = totalChecks;
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
    
    // 定期轮询数据
    setInterval(() => {
        fetch(`${WORKER_BASE_URL}/status`)
            .then(response => response.json())
            .then(data => {
                handleStatusUpdate(data);
            })
            .catch(error => {
                console.error('轮询失败:', error);
            });
    }, 5000);
}

// 绑定事件监听器
function bindEventListeners() {
    // 手动刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (isConnected) {
            // 发送刷新请求
            socket.send(JSON.stringify({ type: 'refresh' }));
            showToast('已请求刷新数据', 'info');
        } else {
            // 重新连接
            connectWebSocket();
        }
    });
    
    // 导出报告按钮
    document.getElementById('export-btn').addEventListener('click', exportReport);
    
    // 主题切换按钮
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// 导出报告
function exportReport() {
    const report = {
        generated_at: new Date().toISOString(),
        uptime_history: uptimeHistory,
        system_stats: {
            total_checks: totalChecks,
            success_checks: successChecks,
            success_rate: totalChecks > 0 ? Math.round((successChecks / totalChecks) * 100) : 0,
            last_heartbeat: document.getElementById('last-check').textContent
        },
        connection_status: isConnected ? 'WebSocket' : 'Polling'
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jev_websocket_report_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    a.click();
    
    // 清理
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
    
    showToast('实时报告已导出', 'success');
}

// 切换主题（简化版）
function toggleTheme() {
    showToast('主题切换功能暂不可用', 'info');
}

// 显示Toast提示
function showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    const container = document.getElementById('toast-container');
    
    // 设置样式
    let bgColor = 'bg-info/90';
    let borderColor = 'border-l-4 border-info';
    let icon = '📝';
    
    if (type === 'success') {
        bgColor = 'bg-success/90';
        borderColor = 'border-l-4 border-success';
        icon = '✅';
    } else if (type === 'error') {
        bgColor = 'bg-danger/90';
        borderColor = 'border-l-4 border-danger';
        icon = '❌';
    } else if (type === 'warning') {
        bgColor = 'bg-warning/90';
        borderColor = 'border-l-4 border-warning';
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

// 格式化字节数
function formatBytes(bytes, decimals = 1) {
    if (bytes === 0 || !bytes) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 页面关闭时清理
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.close();
    }
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
    }
});

// 初始化时显示欢迎消息
showToast('JEV WebSocket 仪表盘已启动', 'info');