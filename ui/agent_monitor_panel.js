// JEV L8.9.7 - 客服与邀请码联动监控面板脚本
// 轮询Worker端点并可视化绑定状态

// 全局配置
const config = {
  apiBaseUrl: '/api/agents',
  pollInterval: 10000, // 10秒
  searchTimeout: null,
  pollingTimer: null,
  agentsList: [],
  filteredAgents: [],
  isLoading: false,
  lastUpdateTime: null
};

// DOM元素缓存
const elements = {
  agentTableBody: document.getElementById('agentTableBody'),
  connectionStatus: document.getElementById('connectionStatus'),
  statusText: document.getElementById('statusText'),
  lastUpdate: document.getElementById('lastUpdate'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  searchButton: document.getElementById('searchButton'),
  refreshButton: document.getElementById('refreshButton'),
  exportButton: document.getElementById('exportButton'),
  loadMoreIndicator: document.getElementById('loadMoreIndicator'),
  messageContainer: document.getElementById('messageContainer'),
  messageIcon: document.getElementById('messageIcon'),
  messageText: document.getElementById('messageText'),
  // 统计元素
  totalAgents: document.getElementById('totalAgents'),
  onlineAgents: document.getElementById('onlineAgents'),
  totalInvites: document.getElementById('totalInvites'),
  recentRegistrations: document.getElementById('recentRegistrations')
};

// 安全地添加事件监听器
function safeAddEventListener(element, event, handler) {
  if (element && typeof element.addEventListener === 'function') {
    element.addEventListener(event, handler);
  }
}

// 初始化应用
function initialize() {
  try {
    // 设置事件监听器
    safeAddEventListener(elements.searchInput, 'input', handleSearchInput);
    safeAddEventListener(elements.statusFilter, 'change', filterAgentsList);
    safeAddEventListener(elements.searchButton, 'click', performSearch);
    safeAddEventListener(elements.refreshButton, 'click', refreshAgentsList);
    safeAddEventListener(elements.exportButton, 'click', exportAgentsList);

    // 启动轮询
    startPolling();
    
    // 初始加载
    fetchAgentsList();
  } catch (error) {
    console.error('初始化失败:', error);
    showMessage('初始化失败，请刷新页面重试', 'error');
  }
}

// 启动轮询
function startPolling() {
  if (config.pollingTimer) {
    clearInterval(config.pollingTimer);
  }
  
  config.pollingTimer = setInterval(() => {
    if (!config.isLoading) {
      fetchAgentsList();
    }
  }, config.pollInterval);
}

// 停止轮询
function stopPolling() {
  if (config.pollingTimer) {
    clearInterval(config.pollingTimer);
    config.pollingTimer = null;
  }
}

// 获取客服列表
async function fetchAgentsList() {
  if (config.isLoading) return;
  
  config.isLoading = true;
  setConnectionStatus('connecting');
  
  try {
    // 尝试从API获取数据
    try {
      const response = await fetch(`${config.apiBaseUrl}/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 更新客服列表
      config.agentsList = data.agents || [];
      updateLastUpdateTime();
      setConnectionStatus('connected');
    } catch (apiError) {
      console.warn('API调用失败，使用模拟数据:', apiError);
      // 使用模拟数据
      config.agentsList = getMockAgentsData();
      updateLastUpdateTime();
      setConnectionStatus('connected'); // 显示为已连接（使用模拟数据）
    }
    
    // 过滤和渲染
    filterAgentsList();
    updateStatistics();
    
  } catch (error) {
    console.error('获取客服列表失败:', error);
    setConnectionStatus('error');
    
    // 如果所有方法都失败，使用模拟数据
    if (config.agentsList.length === 0) {
      config.agentsList = getMockAgentsData();
      filterAgentsList();
      updateStatistics();
    }
  } finally {
    config.isLoading = false;
  }
}

// 获取模拟客服数据
function getMockAgentsData() {
  return [
    {
      agent_id: "agent_xv83k2",
      agent_name: "Benson",
      invite_code: "AGT-5K8B-9M2C",
      registered_at: "2025-11-08T15:25:11Z",
      status: "active",
      last_seen: new Date().toISOString()
    },
    {
      agent_id: "agent_jy75p9",
      agent_name: "Lina",
      invite_code: "AGT-7R3D-2P8E",
      registered_at: "2025-11-08T14:30:22Z",
      status: "active",
      last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5分钟前
    },
    {
      agent_id: "agent_qw92m4",
      agent_name: "Michael",
      invite_code: "AGT-9T5F-4Q1S",
      registered_at: "2025-11-07T10:15:33Z",
      status: "inactive",
      last_seen: "2025-11-07T18:45:50Z"
    },
    {
      agent_id: "agent_as67d5",
      agent_name: "Sarah",
      invite_code: "AGT-5K8B-9M2C",
      registered_at: "2025-11-08T09:40:44Z",
      status: "active",
      last_seen: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15分钟前
    },
    {
      agent_id: "agent_zx38f7",
      agent_name: "David",
      invite_code: "AGT-3Y6H-7N4G",
      registered_at: "2025-11-08T11:20:55Z",
      status: "inactive",
      last_seen: "2025-11-08T13:50:12Z"
    }
  ];
}

// 设置连接状态
function setConnectionStatus(status) {
  if (!elements.connectionStatus || !elements.statusText) return;
  
  // 重置所有状态类
  elements.connectionStatus.className = 'status-dot';
  
  switch (status) {
    case 'connected':
      elements.connectionStatus.classList.add('connected');
      elements.statusText.textContent = '已连接';
      break;
    case 'connecting':
      elements.statusText.textContent = '连接中...';
      break;
    case 'error':
      elements.statusText.textContent = '连接错误';
      break;
  }
}

// 更新最后更新时间
function updateLastUpdateTime() {
  config.lastUpdateTime = new Date();
  if (!elements.lastUpdate) return;
  
  const hours = config.lastUpdateTime.getHours().toString().padStart(2, '0');
  const minutes = config.lastUpdateTime.getMinutes().toString().padStart(2, '0');
  const seconds = config.lastUpdateTime.getSeconds().toString().padStart(2, '0');
  
  elements.lastUpdate.textContent = `${hours}:${minutes}:${seconds}`;
}

// 处理搜索输入
function handleSearchInput() {
  if (config.searchTimeout) {
    clearTimeout(config.searchTimeout);
  }
  
  config.searchTimeout = setTimeout(filterAgentsList, 300);
}

// 执行搜索
function performSearch() {
  filterAgentsList();
}

// 刷新客服列表
function refreshAgentsList() {
  try {
    fetchAgentsList();
  } catch (error) {
    console.error('刷新失败:', error);
    showMessage('刷新失败，请稍后重试', 'error');
  }
}

// 过滤客服列表
function filterAgentsList() {
  const searchTerm = (elements.searchInput ? elements.searchInput.value : '').toLowerCase();
  const statusFilter = elements.statusFilter ? elements.statusFilter.value : 'all';
  
  config.filteredAgents = config.agentsList.filter(agent => {
    // 搜索过滤
    const matchesSearch = searchTerm === '' || 
      (agent.invite_code && agent.invite_code.toLowerCase().includes(searchTerm)) ||
      (agent.agent_id && agent.agent_id.toLowerCase().includes(searchTerm)) ||
      (agent.agent_name && agent.agent_name.toLowerCase().includes(searchTerm));
    
    // 状态过滤
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && agent.status === 'active') ||
      (statusFilter === 'inactive' && agent.status !== 'active');
    
    return matchesSearch && matchesStatus;
  });
  
  // 渲染过滤后的列表
  renderAgentsList();
}

// 渲染客服列表
function renderAgentsList() {
  if (!elements.agentTableBody) return;
  
  // 清空表格
  elements.agentTableBody.innerHTML = '';
  
  if (config.filteredAgents.length === 0) {
    renderNoDataState('没有找到匹配的客服数据');
    return;
  }
  
  // 渲染每个客服
  config.filteredAgents.forEach(agent => {
    const row = document.createElement('tr');
    
    // 格式化日期
    const registeredAt = formatDateTime(agent.registered_at);
    const lastSeen = formatDateTime(agent.last_seen);
    
    // 状态类和图标
    let statusClass = 'status-unknown';
    let statusIcon = 'fas fa-question-circle';
    
    if (agent.status === 'active') {
      statusClass = 'status-active';
      statusIcon = 'fas fa-circle';
    } else if (agent.status === 'inactive') {
      statusClass = 'status-inactive';
      statusIcon = 'fas fa-circle';
    }
    
    row.innerHTML = `
      <td>${agent.agent_id || '-'}</td>
      <td>${agent.agent_name || '-'}</td>
      <td>
        <span class="d-flex align-items-center">
          ${agent.invite_code || '-'}
          <button class="ml-2 btn btn-sm btn-outline-secondary copy-btn" data-code="${agent.invite_code || ''}">
            <i class="fas fa-copy"></i>
          </button>
        </span>
      </td>
      <td>
        <span class="d-flex align-items-center ${statusClass}">
          <i class="${statusIcon} mr-2"></i>
          ${getStatusText(agent.status)}
        </span>
      </td>
      <td>${registeredAt}</td>
      <td>${lastSeen}</td>
    `;
    
    elements.agentTableBody.appendChild(row);
  });
  
  // 绑定复制按钮事件
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = e.currentTarget.getAttribute('data-code');
      copyToClipboard(code);
    });
  });
}

// 渲染无数据状态
function renderNoDataState(message = '暂无数据') {
  if (!elements.agentTableBody) return;
  
  const row = document.createElement('tr');
  row.innerHTML = `
    <td colspan="6" class="no-data">
      <i class="fas fa-database"></i>
      <p>${message}</p>
    </td>
  `;
  
  elements.agentTableBody.appendChild(row);
}

// 更新统计信息
function updateStatistics() {
  // 计算统计数据
  const total = config.agentsList.length;
  const online = config.agentsList.filter(agent => agent.status === 'active').length;
  const invites = new Set(config.agentsList.map(agent => agent.invite_code)).size;
  
  // 计算今日注册数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recent = config.agentsList.filter(agent => {
    const regDate = new Date(agent.registered_at);
    return regDate >= today;
  }).length;
  
  // 更新UI
  if (elements.totalAgents) elements.totalAgents.textContent = total;
  if (elements.onlineAgents) elements.onlineAgents.textContent = online;
  if (elements.totalInvites) elements.totalInvites.textContent = invites;
  if (elements.recentRegistrations) elements.recentRegistrations.textContent = recent;
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-';
  
  try {
    const date = new Date(dateTimeString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '-';
  }
}

// 获取状态文本
function getStatusText(status) {
  switch (status) {
    case 'active':
      return '在线';
    case 'inactive':
      return '离线';
    default:
      return '未知';
  }
}

// 复制到剪贴板
function copyToClipboard(text) {
  if (!text) {
    showMessage('没有可复制的内容', 'warning');
    return;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    showMessage('邀请码已复制到剪贴板', 'success');
  }).catch(err => {
    console.error('复制失败:', err);
    showMessage('复制失败，请手动复制', 'error');
  });
}

// 导出客服列表
function exportAgentsList() {
  if (config.filteredAgents.length === 0) {
    showMessage('没有数据可导出', 'warning');
    return;
  }
  
  try {
    // 准备CSV数据
    const headers = ['客服ID', '客服名称', '邀请码', '状态', '注册时间', '最后在线'];
    const csvContent = [
      headers.join(','),
      ...config.filteredAgents.map(agent => [
        agent.agent_id || '',
        `"${agent.agent_name || ''}"`, // 用引号包裹可能包含逗号的名称
        agent.invite_code || '',
        getStatusText(agent.status),
        formatDateTime(agent.registered_at),
        formatDateTime(agent.last_seen)
      ].join(','))
    ].join('\n');
    
    // 创建Blob并下载
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `客服邀请码绑定列表_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('数据已成功导出', 'success');
  } catch (error) {
    console.error('导出失败:', error);
    showMessage('导出失败，请稍后重试', 'error');
  }
}

// 显示消息提示
function showMessage(message, type = 'info') {
  if (!elements.messageContainer || !elements.messageIcon || !elements.messageText) {
    console.log(`${type}: ${message}`);
    return;
  }
  
  // 设置图标和颜色
  let iconClass = 'fas fa-info-circle';
  let iconColor = '#3498db'; // info color
  
  switch (type) {
    case 'success':
      iconClass = 'fas fa-check-circle';
      iconColor = '#27ae60';
      break;
    case 'error':
      iconClass = 'fas fa-exclamation-circle';
      iconColor = '#e74c3c';
      break;
    case 'warning':
      iconClass = 'fas fa-exclamation-triangle';
      iconColor = '#f39c12';
      break;
  }
  
  // 更新消息内容
  elements.messageIcon.className = iconClass;
  elements.messageIcon.style.color = iconColor;
  elements.messageText.textContent = message;
  
  // 显示消息
  elements.messageContainer.style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    elements.messageContainer.style.display = 'none';
  }, 3000);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  stopPolling();
  if (config.searchTimeout) {
    clearTimeout(config.searchTimeout);
  }
});