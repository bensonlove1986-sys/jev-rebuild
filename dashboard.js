// JEV Worker 监控仪表盘 JavaScript
// 功能：定期获取Worker状态，渲染仪表盘内容

// 配置常量
const WORKER_BASE_URL = 'https://jevshop.bensonlove1986.workers.dev';
const REFRESH_INTERVAL = 5000; // 5秒刷新一次
const MAX_HISTORY = 10; // 最多保留10次历史数据

// 全局状态
let uptimeHistory = []; // 存储历史正常率数据
let refreshTimer = null;
let isDarkMode = true;

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('JEV Dashboard 初始化中...');
    
    // 初始化图表
    initCharts();
    
    // 首次加载数据
    loadAllData();
    
    // 设置定时刷新
    startAutoRefresh();
    
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
                labels: Array(MAX_HISTORY).fill(''),
                datasets: [{
                    label: '正常率',
                    data: Array(MAX_HISTORY).fill(0),
                    borderColor: '#00B42A',
                    backgroundColor: 'rgba(0, 180, 42, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#86909C'
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
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#272E3B',
                        titleColor: '#F2F3F5',
                        bodyColor: '#F2F3F5',
                        borderColor: '#303846',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                }
            }
        }
    );
}

// 绑定事件监听器
function bindEventListeners() {
    // 手动刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadAllData();
    });
    
    // 导出报告按钮
    document.getElementById('export-btn').addEventListener('click', exportReport);
    
    // 主题切换按钮
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// 开始自动刷新
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        loadAllData();
    }, REFRESH_INTERVAL);
}

// 加载所有数据
async function loadAllData() {
    try {
        // 并行加载所有数据
        await Promise.all([
            loadStatus(),
            loadAgents(),
            loadLogs(),
            loadR2Reports()
        ]);
        
        // 更新图表
        updateCharts();
    } catch (error) {
        console.error('加载数据失败:', error);
        showToast('加载数据时发生错误', 'error');
    }
}

// 加载 Worker 状态
async function loadStatus() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/status`);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新顶部状态条
        const statusElement = document.getElementById('worker-status');
        statusElement.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-success status-indicator mr-2"></span>
            <span>✅ Worker 正常运行 | 最近检测：${formatDateTime(data.last_heartbeat)} | R2: ${formatBytes(data.r2_usage)}</span>
        `;
        
        // 更新统计卡片
        document.getElementById('agent-count').textContent = data.agents_online || 0;
        document.getElementById('r2-usage').textContent = formatBytes(data.r2_usage || 0);
        document.getElementById('last-check').textContent = formatDateTime(data.last_heartbeat) || '暂无';
        
        // 记录正常率数据
        addUptimeData(data.agents_online > 0 ? 100 : 0);
        
        console.log('Worker 状态加载成功:', data);
    } catch (error) {
        console.error('加载 Worker 状态失败:', error);
        updateStatusWithError();
        throw error;
    }
}

// 加载 Agent 列表
async function loadAgents() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/agents`);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        const agentList = data.agents || [];
        
        // 更新 Agent 列表
        const agentListElement = document.getElementById('agent-list');
        agentListElement.innerHTML = '';
        
        if (agentList.length === 0) {
            agentListElement.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-gray-400">暂无在线 Agent</td>
                </tr>
            `;
        } else {
            agentList.forEach(agent => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700 hover:bg-dark-800';
                
                // 判断状态颜色
                const isOnline = agent.status === 'online' || agent.last_heartbeat;
                const statusColor = isOnline ? 'text-success' : 'text-warning';
                const statusText = isOnline ? '在线' : '离线';
                
                row.innerHTML = `
                    <td class="py-3 px-4 font-medium">${agent.agent_id || '未知'}</td>
                    <td class="py-3 px-4">${agent.hostname || '未知'}</td>
                    <td class="py-3 px-4">${agent.version || '未知'}</td>
                    <td class="py-3 px-4">
                        <span class="inline-block px-2 py-1 rounded-full bg-dark-800 ${statusColor}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-gray-400">
                        ${agent.last_heartbeat ? formatDateTime(agent.last_heartbeat) : '暂无'}
                    </td>
                `;
                
                agentListElement.appendChild(row);
            });
        }
        
        // 更新数量显示
        document.getElementById('agent-list-count').textContent = `共 ${agentList.length} 个 Agent`;
        
        console.log('Agent 列表加载成功:', agentList.length, '个 Agent');
    } catch (error) {
        console.error('加载 Agent 列表失败:', error);
        document.getElementById('agent-list').innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-danger">加载失败</td>
            </tr>
        `;
    }
}

// 加载日志
async function loadLogs() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/log?source=control_panel`);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        const logs = data.logs || [];
        
        // 更新日志列表
        const logListElement = document.getElementById('log-list');
        logListElement.innerHTML = '';
        
        if (logs.length === 0) {
            logListElement.innerHTML = '<div class="p-3 bg-dark-800 rounded-lg text-gray-400">暂无日志</div>';
        } else {
            logs.forEach(log => {
                const logItem = document.createElement('div');
                
                // 根据日志级别设置样式
                let logLevel = 'info';
                let textColor = 'text-gray-300';
                let bgColor = 'bg-dark-800';
                
                if (log.includes('ERROR') || log.includes('错误') || log.includes('failed')) {
                    logLevel = 'error';
                    textColor = 'text-danger';
                    bgColor = 'bg-danger/10';
                } else if (log.includes('WARNING') || log.includes('警告')) {
                    logLevel = 'warn';
                    textColor = 'text-warning';
                    bgColor = 'bg-warning/10';
                }
                
                logItem.className = `${bgColor} rounded-lg p-2 ${textColor} overflow-hidden`;
                logItem.textContent = log;
                logListElement.appendChild(logItem);
            });
        }
        
        // 更新数量显示
        document.getElementById('log-count').textContent = `共 ${logs.length} 条日志`;
        
        // 滚动到底部
        logListElement.scrollTop = logListElement.scrollHeight;
        
        console.log('日志加载成功:', logs.length, '条日志');
    } catch (error) {
        console.error('加载日志失败:', error);
        document.getElementById('log-list').innerHTML = '<div class="p-3 bg-dark-800 rounded-lg text-danger">加载失败</div>';
    }
}

// 加载 R2 报告
async function loadR2Reports() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/r2/list?prefix=verify_logs/`);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        const reports = data.files || [];
        
        // 按时间排序，获取最新的10个报告
        const sortedReports = reports
            .filter(file => file.name.endsWith('.json'))
            .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded))
            .slice(0, 10);
        
        // 更新报告列表
        const reportListElement = document.getElementById('report-list');
        reportListElement.innerHTML = '';
        
        if (sortedReports.length === 0) {
            reportListElement.innerHTML = '<div class="p-3 bg-dark-800 rounded-lg text-gray-400">暂无检测报告</div>';
        } else {
            for (const report of sortedReports) {
                try {
                    // 获取报告内容
                    const reportResponse = await fetch(`${WORKER_BASE_URL}/r2/read?file=${encodeURIComponent(report.name)}`);
                    if (!reportResponse.ok) {
                        throw new Error(`获取报告内容失败: ${reportResponse.status}`);
                    }
                    
                    const reportContent = await reportResponse.json();
                    
                    // 创建报告项
                    const reportItem = document.createElement('div');
                    const isSuccess = reportContent.overall_status === 'normal';
                    const statusColor = isSuccess ? 'text-success' : 'text-danger';
                    const statusText = isSuccess ? '正常' : '异常';
                    const statusIcon = isSuccess ? '✅' : '❌';
                    
                    reportItem.className = 'bg-dark-800 rounded-lg p-3 hover:bg-dark-700 cursor-pointer';
                    reportItem.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-medium">${formatDateTime(report.uploaded)}</span>
                            <span class="inline-flex items-center px-2 py-1 rounded-full ${statusColor} text-sm">
                                ${statusIcon} ${statusText}
                            </span>
                        </div>
                        <div class="text-sm text-gray-400">
                            检测接口: ${reportContent.results?.length || 0} 个
                        </div>
                    `;
                    
                    // 添加点击事件
                    reportItem.addEventListener('click', () => {
                        showReportDetail(reportContent);
                    });
                    
                    reportListElement.appendChild(reportItem);
                } catch (err) {
                    console.error('解析报告失败:', err);
                }
            }
        }
        
        // 更新数量显示
        document.getElementById('report-count').textContent = `共 ${sortedReports.length} 个报告`;
        
        console.log('R2 报告加载成功:', sortedReports.length, '个报告');
    } catch (error) {
        console.error('加载 R2 报告失败:', error);
        document.getElementById('report-list').innerHTML = '<div class="p-3 bg-dark-800 rounded-lg text-danger">加载失败</div>';
    }
}

// 更新图表
function updateCharts() {
    // 更新正常率折线图
    if (window.uptimeChart && uptimeHistory.length > 0) {
        const labels = uptimeHistory.map((_, index) => `第${index + 1}次`);
        const data = uptimeHistory.map(item => item.successRate);
        
        window.uptimeChart.data.labels = labels;
        window.uptimeChart.data.datasets[0].data = data;
        window.uptimeChart.update();
    }
    
    // 更新成功率环图
    if (window.successRateChart && uptimeHistory.length > 0) {
        const successCount = uptimeHistory.filter(item => item.successRate === 100).length;
        const failCount = uptimeHistory.length - successCount;
        
        window.successRateChart.data.datasets[0].data = [successCount, failCount];
        window.successRateChart.update();
    }
}

// 添加正常率数据
function addUptimeData(successRate) {
    uptimeHistory.push({
        timestamp: new Date(),
        successRate: successRate
    });
    
    // 保持历史数据不超过最大限制
    if (uptimeHistory.length > MAX_HISTORY) {
        uptimeHistory = uptimeHistory.slice(-MAX_HISTORY);
    }
}

// 导出报告
function exportReport() {
    const report = {
        generated_at: new Date().toISOString(),
        uptime_history: uptimeHistory,
        system_info: {
            worker_url: WORKER_BASE_URL,
            refresh_interval: REFRESH_INTERVAL
        }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jev_report_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    a.click();
    
    // 清理
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
    
    showToast('报告已导出', 'success');
}

// 切换主题
function toggleTheme() {
    isDarkMode = !isDarkMode;
    const body = document.body;
    
    if (isDarkMode) {
        body.classList.add('bg-dark-900');
        body.classList.remove('bg-gray-100');
        body.classList.add('text-gray-200');
        body.classList.remove('text-gray-800');
    } else {
        body.classList.remove('bg-dark-900');
        body.classList.add('bg-gray-100');
        body.classList.remove('text-gray-200');
        body.classList.add('text-gray-800');
    }
    
    // 更新图表主题
    updateChartTheme();
}

// 更新图表主题
function updateChartTheme() {
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#86909C' : '#4B5563';
    const tooltipBg = isDarkMode ? '#272E3B' : '#FFFFFF';
    const tooltipBorder = isDarkMode ? '#303846' : '#E5E7EB';
    const tooltipText = isDarkMode ? '#F2F3F5' : '#1F2937';
    
    // 更新折线图
    if (window.uptimeChart) {
        window.uptimeChart.options.scales.x.grid.color = gridColor;
        window.uptimeChart.options.scales.y.grid.color = gridColor;
        window.uptimeChart.options.scales.x.ticks.color = textColor;
        window.uptimeChart.options.scales.y.ticks.color = textColor;
        window.uptimeChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        window.uptimeChart.options.plugins.tooltip.borderColor = tooltipBorder;
        window.uptimeChart.options.plugins.tooltip.titleColor = tooltipText;
        window.uptimeChart.options.plugins.tooltip.bodyColor = tooltipText;
        window.uptimeChart.update();
    }
    
    // 更新环图
    if (window.successRateChart) {
        window.successRateChart.options.plugins.legend.labels.color = textColor;
        window.successRateChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        window.successRateChart.options.plugins.tooltip.borderColor = tooltipBorder;
        window.successRateChart.options.plugins.tooltip.titleColor = tooltipText;
        window.successRateChart.options.plugins.tooltip.bodyColor = tooltipText;
        window.successRateChart.update();
    }
}

// 显示报告详情
function showReportDetail(report) {
    // 在实际应用中，可以实现一个模态框来显示详细报告
    console.log('显示报告详情:', report);
    showToast('点击了报告项', 'info');
}

// 显示错误状态
function updateStatusWithError() {
    const statusElement = document.getElementById('worker-status');
    statusElement.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-danger status-indicator mr-2"></span>
        <span>❌ Worker 连接失败</span>
    `;
    
    // 记录失败数据
    addUptimeData(0);
}

// 显示提示信息
function showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    
    // 设置样式
    let bgColor = 'bg-primary';
    if (type === 'success') bgColor = 'bg-success';
    if (type === 'error') bgColor = 'bg-danger';
    if (type === 'warning') bgColor = 'bg-warning';
    
    toast.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg fixed top-4 right-4 z-50 transform transition-all duration-300 translate-y-0 opacity-0`;
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示Toast
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-0');
        toast.classList.add('opacity-100', 'translate-y-2');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-2');
        toast.classList.add('opacity-0', 'translate-y-0');
        
        // 移除元素
        setTimeout(() => {
            document.body.removeChild(toast);
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
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 页面关闭时清理定时器
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});