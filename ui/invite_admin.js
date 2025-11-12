// JEV L8.9.6 - 邀请码管理系统脚本文件

// 全局配置
const API_CONFIG = {
  baseUrl: '/invites',
  healthEndpoint: '/health',
  timeout: 10000 // 10秒超时
};

// 全局状态
let currentPage = 1;
const itemsPerPage = 20;
let allInviteData = [];
let searchKeyword = '';
let filterRole = 'all';

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 检查本地存储中的管理员令牌
  const storedToken = localStorage.getItem('ADMIN_TOKEN');
  if (storedToken) {
    document.getElementById('adminToken').value = storedToken;
    await initializeApp();
  } else {
    // 显示登录模态框
    showLoginModal();
  }
  
  // 注册事件监听器
  setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
  // 安全地添加事件监听器，检查元素是否存在
  function safeAddEventListener(elementId, event, callback) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(event, callback);
    }
  }
  
  // 登录按钮
  safeAddEventListener('loginButton', 'click', handleLogin);
  
  // 生成邀请码按钮
  safeAddEventListener('generateButton', 'click', generateInvites);
  
  // 导出CSV按钮
  safeAddEventListener('exportCsvButton', 'click', exportToCSV);
  
  // 搜索按钮
  safeAddEventListener('searchButton', 'click', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchKeyword = searchInput.value.trim();
      currentPage = 1;
      renderPagedList();
    }
  });
  
  // 搜索框回车事件
  safeAddEventListener('searchInput', 'keypress', (e) => {
    if (e.key === 'Enter') {
      const searchButton = document.getElementById('searchButton');
      if (searchButton) searchButton.click();
    }
  });
  
  // 角色筛选
  safeAddEventListener('roleFilter', 'change', () => {
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
      filterRole = roleFilter.value;
      currentPage = 1;
      renderPagedList();
    }
  });
  
  // 清空搜索按钮
  safeAddEventListener('clearSearchButton', 'click', () => {
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = 'all';
    searchKeyword = '';
    filterRole = 'all';
    currentPage = 1;
    renderPagedList();
  });
  
  // 分页控制
  safeAddEventListener('prevPageButton', 'click', goToPrevPage);
  safeAddEventListener('nextPageButton', 'click', goToNextPage);
  
  // 退出登录按钮
  safeAddEventListener('logoutButton', 'click', handleLogout);
  
  // 刷新按钮
  safeAddEventListener('refreshButton', 'click', async () => {
    try {
      await loadList();
      await loadAuditLogs();
      showMessage('刷新成功', 'success');
    } catch (error) {
      console.error('刷新失败:', error);
    }
  });
}

// 初始化应用
async function initializeApp() {
  try {
    // 显示加载状态
    setLoading(true);
    
    // 测试连接
    await testConnection();
    
    // 加载数据
    await Promise.all([
      loadList(),
      loadAuditLogs()
    ]);
    
    // 隐藏登录模态框
    document.getElementById('loginModal').style.display = 'none';
    
    // 更新连接状态
    updateConnectionStatus(true);
    
  } catch (error) {
    console.error('初始化失败:', error);
    updateConnectionStatus(false);
    showMessage('初始化失败: ' + error.message, 'error');
  } finally {
    setLoading(false);
  }
}

// 测试连接
async function testConnection() {
  try {
    const response = await callApi('/invite/health', 'GET');
    if (response.status !== 200) {
      throw new Error('连接失败，服务器响应: ' + response.status);
    }
    const data = await response.json();
    if (!data.ok) {
      throw new Error('连接测试失败: ' + data.message);
    }
    return true;
  } catch (error) {
    console.error('连接测试失败:', error);
    throw new Error('无法连接到服务器，请检查API地址和网络连接');
  }
}

// API调用函数
async function callApi(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('ADMIN_TOKEN');
  if (!token) {
    showLoginModal();
    throw new Error('未登录，请重新登录');
  }
  
  const url = endpoint.startsWith('/') ? endpoint : `${API_CONFIG.baseUrl}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    signal: AbortSignal.timeout(API_CONFIG.timeout)
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (response.status === 401) {
      localStorage.removeItem('ADMIN_TOKEN');
      showLoginModal();
      throw new Error('身份验证失败，请重新登录');
    }
    
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
}

// 处理登录
async function handleLogin() {
  try {
    const token = document.getElementById('adminToken').value.trim();
    if (!token) {
      showMessage('请输入管理员令牌', 'error');
      return;
    }
    
    // 保存令牌并测试连接
    localStorage.setItem('ADMIN_TOKEN', token);
    await initializeApp();
    
    showMessage('登录成功', 'success');
  } catch (error) {
    showMessage('登录失败: ' + error.message, 'error');
  }
}

// 处理登出
function handleLogout() {
  localStorage.removeItem('ADMIN_TOKEN');
  showLoginModal();
  showMessage('已退出登录', 'info');
}

// 生成邀请码
async function generateInvites() {
  try {
    setLoading(true);
    
    const data = {
      role: document.getElementById('role').value,
      count: Number(document.getElementById('count').value),
      uses: Number(document.getElementById('uses').value),
      daysValid: Number(document.getElementById('days').value),
      note: document.getElementById('note').value,
      prefix: document.getElementById('prefix').value
    };
    
    // 验证输入
    if (!data.role || data.count <= 0 || data.uses <= 0) {
      showMessage('请填写必填字段且数值必须大于0', 'error');
      return;
    }
    
    const response = await callApi('/generate', 'POST', data);
    const result = await response.json();
    
    if (result.invites && Array.isArray(result.invites)) {
      // 将新生成的邀请码添加到列表中
      allInviteData = [...result.invites, ...allInviteData];
      
      // 重新渲染列表
      currentPage = 1;
      renderPagedList();
      
      showMessage(`✅ 已成功生成 ${result.invites.length} 个邀请码`, 'success');
    } else {
      showMessage('生成失败: ' + (result.message || '未知错误'), 'error');
    }
  } catch (error) {
    showMessage('生成邀请码失败: ' + error.message, 'error');
  } finally {
    setLoading(false);
  }
}

// 撤销邀请码
async function revoke(code) {
  try {
    if (!confirm(`确定要撤销邀请码 ${code} 吗？`)) {
      return;
    }
    
    setLoading(true);
    
    await callApi('/revoke', 'POST', { code });
    
    // 更新本地数据
    allInviteData = allInviteData.map(invite => 
      invite.code === code ? { ...invite, revoked: true } : invite
    );
    
    renderPagedList();
    showMessage(`已成功撤销邀请码 ${code}`, 'success');
  } catch (error) {
    showMessage('撤销失败: ' + error.message, 'error');
  } finally {
    setLoading(false);
  }
}

// 加载邀请码列表
async function loadList() {
  try {
    setLoading(true);
    
    const response = await callApi('/list', 'GET');
    const result = await response.json();
    
    if (result.items && Array.isArray(result.items)) {
      allInviteData = result.items;
      currentPage = 1;
      renderPagedList();
    } else {
      showMessage('加载列表失败: ' + (result.message || '未知错误'), 'error');
    }
  } catch (error) {
    showMessage('加载列表失败: ' + error.message, 'error');
  } finally {
    setLoading(false);
  }
}

// 加载审计日志
async function loadAuditLogs() {
  try {
    const response = await callApi('/audit', 'GET');
    const result = await response.json();
    
    if (result.logs && Array.isArray(result.logs)) {
      renderAuditLogs(result.logs);
    }
  } catch (error) {
    console.error('加载审计日志失败:', error);
    // 审计日志加载失败不阻止主流程
  }
}

// 渲染分页列表
function renderPagedList() {
  // 过滤数据
  let filteredList = [...allInviteData];
  
  if (searchKeyword) {
    filteredList = filteredList.filter(invite => 
      invite.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      invite.role.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }
  
  if (filterRole !== 'all') {
    filteredList = filteredList.filter(invite => invite.role === filterRole);
  }
  
  // 计算分页
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pagedItems = filteredList.slice(startIndex, endIndex);
  
  // 更新分页信息
  updatePaginationInfo(currentPage, totalPages, totalItems);
  
  // 渲染列表
  const container = document.getElementById('inviteList');
  container.innerHTML = '';
  
  if (pagedItems.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-search"></i>
        <p>没有找到匹配的邀请码</p>
        <small>尝试调整搜索条件或筛选器</small>
      </div>
    `;
    return;
  }
  
  // 创建表格
  const table = document.createElement('table');
  table.className = 'invite-table';
  
  // 表头
  table.innerHTML = `
    <thead>
      <tr>
        <th>邀请码</th>
        <th>角色</th>
        <th>使用次数</th>
        <th>有效期至</th>
        <th>备注</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  // 填充表格内容
  const tbody = table.querySelector('tbody');
  pagedItems.forEach(item => {
    const row = document.createElement('tr');
    row.className = item.revoked ? 'revoked' : '';
    
    const expiresText = item.expires_at 
      ? new Date(item.expires_at).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';
    
    const statusText = item.revoked 
      ? '<span class="badge bg-danger">已撤销</span>'
      : (item.uses_remaining === 0 
        ? '<span class="badge bg-warning">已用完</span>' 
        : '<span class="badge bg-success">有效</span>');
    
    row.innerHTML = `
      <td>
        <div class="invite-code">
          <span class="code-text">${item.code}</span>
          <button class="copy-btn" title="复制邀请码" onclick="copyToClipboard('${item.code}')">
            <i class="far fa-copy"></i>
          </button>
        </div>
      </td>
      <td>${item.role}</td>
      <td>${item.uses_remaining}/${item.uses_allowed}</td>
      <td>${expiresText}</td>
      <td>${item.note || '-'}</td>
      <td>${statusText}</td>
      <td>
        ${item.revoked 
          ? '<span class="text-muted">已撤销</span>' 
          : `<button class="btn btn-danger btn-sm" onclick="revoke('${item.code}')">
               <i class="fas fa-times"></i> 撤销
             </button>`
        }
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  container.appendChild(table);
}

// 渲染审计日志
function renderAuditLogs(logs) {
  const container = document.getElementById('auditList');
  container.innerHTML = '';
  
  if (logs.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-history"></i>
        <p>暂无审计记录</p>
      </div>
    `;
    return;
  }
  
  const auditList = document.createElement('div');
  auditList.className = 'audit-list';
  
  logs.forEach(log => {
    const formattedTime = new Date(log.timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const item = document.createElement('div');
    item.className = 'audit-item';
    item.innerHTML = `
      <div class="audit-info">
        <span class="audit-code">${log.code}</span>
        ${log.used_by ? `| used_by: ${log.used_by}` : ''}
      </div>
      <div class="audit-time">${formattedTime}</div>
    `;
    
    auditList.appendChild(item);
  });
  
  container.appendChild(auditList);
}

// 更新分页信息
function updatePaginationInfo(currentPage, totalPages, totalItems) {
  const infoElement = document.getElementById('paginationInfo');
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  infoElement.textContent = `显示 ${startItem} - ${endItem} 共 ${totalItems} 个项目`;
  
  // 更新分页按钮状态
  document.getElementById('prevPageButton').disabled = currentPage === 1;
  document.getElementById('nextPageButton').disabled = currentPage >= totalPages;
}

// 上一页
function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderPagedList();
  }
}

// 下一页
function goToNextPage() {
  const totalPages = Math.ceil(allInviteData.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderPagedList();
  }
}

// 导出CSV
function exportToCSV() {
  if (allInviteData.length === 0) {
    showMessage('没有数据可导出', 'info');
    return;
  }
  
  // 过滤数据
  let filteredList = [...allInviteData];
  
  if (searchKeyword) {
    filteredList = filteredList.filter(invite => 
      invite.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      invite.role.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }
  
  if (filterRole !== 'all') {
    filteredList = filteredList.filter(invite => invite.role === filterRole);
  }
  
  // 准备CSV内容
  const headers = ['code', 'role', 'uses_remaining', 'uses_allowed', 'expires_at', 'revoked', 'note'];
  const csvContent = [
    headers.join(','), // 表头
    ...filteredList.map(invite => 
      headers.map(header => {
        let value = invite[header] || '';
        if (typeof value === 'boolean') {
          value = value ? 'true' : 'false';
        }
        // 处理包含逗号、引号或换行的值
        if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
          value = `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `invite_export_${timestamp}.csv`;
  
  // 创建并下载文件
  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showMessage(`已导出 ${filteredList.length} 条记录到 ${filename}`, 'success');
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showMessage('已复制到剪贴板', 'success');
  }).catch(() => {
    showMessage('复制失败，请手动复制', 'error');
  });
}

// 显示登录模态框
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}

// 更新连接状态
function updateConnectionStatus(isConnected) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  statusDot.className = `status-dot ${isConnected ? 'connected' : 'disconnected'}`;
  statusText.textContent = isConnected ? '已连接' : '连接断开';
}

// 显示消息提示
function showMessage(message, type = 'info') {
  const messageContainer = document.createElement('div');
  messageContainer.className = 'message-container';
  messageContainer.innerHTML = `
    <div class="message-content message-${type}">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(messageContainer);
  
  // 3秒后自动消失
  setTimeout(() => {
    messageContainer.style.opacity = '0';
    messageContainer.style.transform = 'translateX(100%)';
    messageContainer.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      document.body.removeChild(messageContainer);
    }, 300);
  }, 3000);
}

// 设置加载状态
function setLoading(isLoading) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  loadingIndicator.style.display = isLoading ? 'flex' : 'none';
  
  // 禁用/启用按钮
  const buttons = document.querySelectorAll('button:not(.modal-close)');
  buttons.forEach(button => {
    button.disabled = isLoading;
  });
}

// 将函数暴露到全局作用域，以便在HTML中直接调用
window.revoke = revoke;
window.copyToClipboard = copyToClipboard;