// JEV L8.9.6 - 邀请码管理系统前端逻辑

// 全局配置
const CONFIG = {
  // 默认配置
  defaultApiUrl: 'http://localhost:8787',
  defaultAdminToken: 'jev-admin-token-2025',
  // 本地存储键名
  storageKeys: {
    apiUrl: 'jev_invite_api_url',
    adminToken: 'jev_invite_admin_token'
  }
};

// API 错误处理
class ApiError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// 初始化
async function initialize() {
  // 加载存储的配置
  loadConfig();
  
  // 注册事件监听器
  registerEventListeners();
  
  // 测试默认连接
  await testConnection(true);
}

// 加载配置
function loadConfig() {
  const savedApiUrl = localStorage.getItem(CONFIG.storageKeys.apiUrl);
  const savedToken = localStorage.getItem(CONFIG.storageKeys.adminToken);
  
  if (savedApiUrl) {
    document.getElementById('api-url').value = savedApiUrl;
  }
  
  if (savedToken) {
    document.getElementById('admin-token').value = savedToken;
  }
}

// 保存配置
function saveConfig() {
  const apiUrl = document.getElementById('api-url').value.trim();
  const adminToken = document.getElementById('admin-token').value.trim();
  
  localStorage.setItem(CONFIG.storageKeys.apiUrl, apiUrl);
  localStorage.setItem(CONFIG.storageKeys.adminToken, adminToken);
  
  showMessage('success', '配置已保存');
}

// 测试连接
async function testConnection(silent = false) {
  try {
    const result = await callApi('/api/invite/health');
    updateConnectionStatus(true);
    if (!silent) {
      showMessage('success', '连接成功');
    }
    return true;
  } catch (error) {
    updateConnectionStatus(false);
    if (!silent) {
      showMessage('error', `连接失败: ${error.message}`);
    }
    return false;
  }
}

// 更新连接状态指示器
function updateConnectionStatus(connected) {
  const statusElement = document.getElementById('connection-status');
  const icon = statusElement.querySelector('i');
  const text = statusElement.textContent.trim();
  
  if (connected) {
    icon.className = 'fa fa-circle text-success';
    statusElement.innerHTML = '<i class="fa fa-circle text-success"></i> 已连接';
  } else {
    icon.className = 'fa fa-circle text-danger';
    statusElement.innerHTML = '<i class="fa fa-circle text-danger"></i> 未连接';
  }
}

// API 调用函数
async function callApi(endpoint, method = 'GET', data = null, requiresAuth = true) {
  const apiUrl = document.getElementById('api-url').value.trim();
  const adminToken = document.getElementById('admin-token').value.trim();
  
  const url = `${apiUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (requiresAuth) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      throw new ApiError('响应数据格式错误', response.status);
    }
    
    if (!response.ok) {
      throw new ApiError(
        responseData.error || 'API 请求失败',
        response.status,
        responseData.details
      );
    }
    
    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || '网络请求失败', 0);
  }
}

// 显示消息
function showMessage(type, message) {
  const messageArea = document.getElementById('message-area');
  
  messageArea.className = `alert alert-${type}`;
  messageArea.innerHTML = `<i class="fa fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
  messageArea.style.display = 'block';
  
  // 自动隐藏
  setTimeout(() => {
    messageArea.style.display = 'none';
  }, 5000);
}

// 生成单个邀请码
async function generateSingleCode() {
  try {
    // 显示加载状态
    document.getElementById('single-loading').style.display = 'block';
    document.getElementById('single-result').style.display = 'none';
    document.getElementById('single-result-code').style.display = 'none';
    
    // 获取表单数据
    const usesAllowed = parseInt(document.getElementById('single-uses-allowed').value);
    const expiresSelect = document.getElementById('single-expires').value;
    let expiresAt = null;
    
    if (expiresSelect === 'custom') {
      const customDate = document.getElementById('single-expires-date').value;
      if (customDate) {
        expiresAt = new Date(customDate).toISOString();
      }
    } else if (expiresSelect) {
      const days = parseInt(expiresSelect);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }
    
    const role = document.getElementById('single-role').value;
    const note = document.getElementById('single-note').value.trim();
    
    // 调用API
    const data = {
      usesAllowed,
      expiresAt,
      role,
      note
    };
    
    const result = await callApi('/api/invite/create', 'POST', data);
    
    // 显示结果
    document.getElementById('single-code-display').textContent = result.code;
    document.getElementById('single-created-at').textContent = formatDateTime(result.createdAt);
    document.getElementById('single-uses-remaining').textContent = result.usesRemaining > 0 ? `${result.usesRemaining} 次` : '无限次';
    document.getElementById('single-expires-at').textContent = result.expiresAt ? formatDateTime(result.expiresAt) : '永不过期';
    document.getElementById('single-role-display').textContent = getRoleLabel(result.role);
    document.getElementById('single-note-display').textContent = result.note || '无';
    
    // 切换显示
    document.getElementById('single-result').style.display = 'none';
    document.getElementById('single-result-code').style.display = 'block';
    
    showMessage('success', '邀请码生成成功');
  } catch (error) {
    document.getElementById('single-result').className = 'alert alert-error';
    document.getElementById('single-result').innerHTML = `<i class="fa fa-exclamation-circle"></i> 生成失败: ${error.message}`;
    document.getElementById('single-result').style.display = 'block';
    showMessage('error', `生成失败: ${error.message}`);
  } finally {
    document.getElementById('single-loading').style.display = 'none';
  }
}

// 批量生成邀请码
async function generateBatchCodes() {
  try {
    // 显示加载状态
    document.getElementById('batch-loading').style.display = 'block';
    document.getElementById('batch-result').style.display = 'none';
    document.getElementById('batch-results-list').style.display = 'none';
    document.getElementById('batch-results-summary').style.display = 'none';
    
    // 获取表单数据
    let count = document.getElementById('batch-count').value;
    if (count === 'custom') {
      count = parseInt(document.getElementById('batch-count-input').value);
      // 验证数量
      if (isNaN(count) || count < 1 || count > 500) {
        throw new Error('数量必须在1-500之间');
      }
    } else {
      count = parseInt(count);
    }
    
    const usesAllowed = parseInt(document.getElementById('batch-uses-allowed').value);
    const expiresSelect = document.getElementById('batch-expires').value;
    let expiresAt = null;
    
    if (expiresSelect === 'custom') {
      const customDate = document.getElementById('batch-expires-date').value;
      if (customDate) {
        expiresAt = new Date(customDate).toISOString();
      }
    } else if (expiresSelect) {
      const days = parseInt(expiresSelect);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }
    
    const role = document.getElementById('batch-role').value;
    const note = document.getElementById('batch-note').value.trim();
    
    // 调用API
    const data = {
      count,
      usesAllowed,
      expiresAt,
      role,
      note
    };
    
    const result = await callApi('/api/invite/batch-create', 'POST', data);
    
    // 显示结果
    renderBatchResults(result.codes);
    
    // 更新统计信息
    document.getElementById('batch-total-count').textContent = result.codes.length;
    document.getElementById('batch-active-count').textContent = result.codes.filter(code => code.status === 'valid').length;
    
    // 切换显示
    document.getElementById('batch-results-list').style.display = 'block';
    document.getElementById('batch-results-summary').style.display = 'block';
    
    showMessage('success', `成功生成 ${result.codes.length} 个邀请码`);
  } catch (error) {
    document.getElementById('batch-result').className = 'alert alert-error';
    document.getElementById('batch-result').innerHTML = `<i class="fa fa-exclamation-circle"></i> 批量生成失败: ${error.message}`;
    document.getElementById('batch-result').style.display = 'block';
    showMessage('error', `批量生成失败: ${error.message}`);
  } finally {
    document.getElementById('batch-loading').style.display = 'none';
  }
}

// 渲染批量生成结果
function renderBatchResults(codes) {
  const container = document.getElementById('batch-codes-list');
  container.innerHTML = '';
  
  codes.forEach(code => {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    const codeElement = document.createElement('div');
    codeElement.className = 'result-code';
    codeElement.textContent = code.code;
    
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-outline-secondary btn-sm';
    copyButton.innerHTML = '<i class="fa fa-copy"></i>';
    copyButton.title = '复制';
    copyButton.onclick = () => copyToClipboard(code.code);
    
    item.appendChild(codeElement);
    item.appendChild(copyButton);
    container.appendChild(item);
  });
}

// 获取邀请码列表
async function getInviteCodesList(page = 1) {
  try {
    // 显示加载状态
    document.getElementById('list-loading').style.display = 'block';
    document.getElementById('invite-codes-table').style.display = 'none';
    document.getElementById('no-results').style.display = 'none';
    
    // 获取筛选条件
    const status = document.getElementById('list-status').value;
    const role = document.getElementById('list-role').value;
    const limit = parseInt(document.getElementById('list-limit').value);
    
    // 构建查询参数
    const params = new URLSearchParams({
      page,
      limit
    });
    
    if (status) params.append('status', status);
    if (role) params.append('role', role);
    
    // 调用API
    const result = await callApi(`/api/invite/list?${params.toString()}`);
    
    // 渲染列表
    if (result.codes && result.codes.length > 0) {
      renderInviteCodesList(result.codes);
      renderPagination(page, Math.ceil(result.total / limit));
      document.getElementById('invite-codes-table').style.display = 'block';
    } else {
      document.getElementById('no-results').style.display = 'block';
    }
  } catch (error) {
    showMessage('error', `加载列表失败: ${error.message}`);
    document.getElementById('no-results').style.display = 'block';
  } finally {
    document.getElementById('list-loading').style.display = 'none';
  }
}

// 渲染邀请码列表
function renderInviteCodesList(codes) {
  const tbody = document.getElementById('invite-codes-list');
  tbody.innerHTML = '';
  
  codes.forEach(code => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <span>${code.code}</span>
          <button class="btn btn-outline-secondary btn-sm ml-2" onclick="copyToClipboard('${code.code}')" title="复制">
            <i class="fa fa-copy"></i>
          </button>
        </div>
      </td>
      <td>
        <span class="status-indicator status-${code.status === 'valid' ? 'active' : code.status === 'expired' ? 'expired' : 'revoked'}"></span>
        ${getStatusLabel(code.status)}
      </td>
      <td>${formatDateTime(code.createdAt)}</td>
      <td>${code.expiresAt ? formatDateTime(code.expiresAt) : '永不过期'}</td>
      <td>${code.usesRemaining > 0 ? `${code.usesRemaining} 次` : '无限次'}</td>
      <td>${getRoleLabel(code.role)}</td>
      <td>${code.note || '-'}</td>
      <td>
        ${code.status === 'valid' ? `
        <button class="btn btn-danger btn-sm" onclick="revokeSingleCode('${code.code}')" title="撤销">
          <i class="fa fa-ban"></i>
        </button>
        ` : '-'}
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// 渲染分页
function renderPagination(currentPage, totalPages) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // 上一页
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `
    <a class="page-link" href="#" aria-label="Previous">
      <span aria-hidden="true">&laquo;</span>
    </a>
  `;
  prevLi.querySelector('a').onclick = (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      getInviteCodesList(currentPage - 1);
    }
  };
  pagination.appendChild(prevLi);
  
  // 页码
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.querySelector('a').onclick = (e) => {
      e.preventDefault();
      getInviteCodesList(i);
    };
    pagination.appendChild(li);
  }
  
  // 下一页
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `
    <a class="page-link" href="#" aria-label="Next">
      <span aria-hidden="true">&raquo;</span>
    </a>
  `;
  nextLi.querySelector('a').onclick = (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      getInviteCodesList(currentPage + 1);
    }
  };
  pagination.appendChild(nextLi);
}

// 撤销邀请码
async function revokeSingleCode(code) {
  if (!confirm(`确定要撤销邀请码 ${code} 吗？`)) return;
  
  try {
    const reason = prompt('请输入撤销原因（可选）：');
    
    const data = {
      code,
      reason: reason || '管理员手动撤销'
    };
    
    await callApi('/api/invite/revoke', 'POST', data);
    
    showMessage('success', `邀请码 ${code} 已撤销`);
    // 刷新列表
    if (document.getElementById('list-tab').classList.contains('active')) {
      getInviteCodesList();
    }
  } catch (error) {
    showMessage('error', `撤销失败: ${error.message}`);
  }
}

// 执行撤销操作
async function executeRevoke() {
  try {
    // 显示加载状态
    document.getElementById('revoke-loading').style.display = 'block';
    document.getElementById('revoke-result').style.display = 'none';
    document.getElementById('revoke-preview').style.display = 'none';
    
    // 获取撤销模式
    const singleCode = document.getElementById('revoke-code').value.trim();
    let mode = null;
    
    if (singleCode) {
      mode = 'single';
    } else {
      if (document.getElementById('revoke-expired').checked) {
        mode = 'expired';
      } else if (document.getElementById('revoke-unused').checked) {
        mode = 'unused';
      } else if (document.getElementById('revoke-all').checked) {
        if (!confirm('确定要撤销所有邀请码吗？此操作不可撤销！')) {
          return;
        }
        mode = 'all';
      }
    }
    
    if (!mode) {
      throw new Error('请选择撤销模式或输入邀请码');
    }
    
    const reason = document.getElementById('revoke-reason').value.trim() || '批量撤销';
    
    // 调用API
    const data = {
      code: mode === 'single' ? singleCode : undefined,
      mode: mode !== 'single' ? mode : undefined,
      reason
    };
    
    const result = await callApi('/api/invite/revoke', 'POST', data);
    
    // 显示结果
    if (mode === 'single') {
      document.getElementById('revoke-result').className = 'alert alert-success';
      document.getElementById('revoke-result').innerHTML = `<i class="fa fa-check-circle"></i> 邀请码 ${singleCode} 已成功撤销`;
      document.getElementById('revoke-code').value = '';
    } else {
      document.getElementById('revoke-result').className = 'alert alert-success';
      document.getElementById('revoke-result').innerHTML = `<i class="fa fa-check-circle"></i> 成功撤销 ${result.count} 个邀请码`;
    }
    
    document.getElementById('revoke-result').style.display = 'block';
    
    showMessage('success', '撤销操作完成');
    
    // 如果在列表页，刷新列表
    if (document.getElementById('list-tab').classList.contains('active')) {
      getInviteCodesList();
    }
  } catch (error) {
    document.getElementById('revoke-result').className = 'alert alert-error';
    document.getElementById('revoke-result').innerHTML = `<i class="fa fa-exclamation-circle"></i> 撤销失败: ${error.message}`;
    document.getElementById('revoke-result').style.display = 'block';
    showMessage('error', `撤销失败: ${error.message}`);
  } finally {
    document.getElementById('revoke-loading').style.display = 'none';
  }
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      showMessage('success', '已复制到剪贴板');
    })
    .catch(() => {
      showMessage('error', '复制失败');
    });
}

// 复制所有批量生成的邀请码
function copyAllBatchCodes() {
  const codes = [];
  const items = document.querySelectorAll('#batch-codes-list .result-code');
  items.forEach(item => codes.push(item.textContent));
  
  const text = codes.join('\n');
  copyToClipboard(text);
}

// 导出CSV
function exportCSV() {
  const codes = [];
  const items = document.querySelectorAll('#batch-codes-list .result-code');
  items.forEach(item => codes.push(item.textContent));
  
  // 添加表头
  const csv = ['"邀请码"'];
  codes.forEach(code => csv.push(`"${code}"`));
  
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `invite_codes_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 导出全部CSV
async function exportAllCSV() {
  try {
    const result = await callApi('/api/invite/export-csv');
    
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `all_invite_codes_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('success', 'CSV 导出成功');
  } catch (error) {
    showMessage('error', `导出失败: ${error.message}`);
  }
}

// 格式化日期时间
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 获取状态标签
function getStatusLabel(status) {
  switch (status) {
    case 'valid': return '有效';
    case 'expired': return '已过期';
    case 'revoked': return '已撤销';
    default: return '未知';
  }
}

// 获取角色标签
function getRoleLabel(role) {
  switch (role) {
    case 'user': return '普通用户';
    case 'agent': return '代理';
    case 'admin': return '管理员';
    default: return '未知';
  }
}

// 注册事件监听器
function registerEventListeners() {
  // 连接设置
  document.getElementById('test-connection').addEventListener('click', testConnection);
  document.getElementById('save-config').addEventListener('click', saveConfig);
  
  // 单码生成
  document.getElementById('generate-single').addEventListener('click', generateSingleCode);
  document.getElementById('copy-single-code').addEventListener('click', () => {
    const code = document.getElementById('single-code-display').textContent;
    copyToClipboard(code);
  });
  
  // 单码生成 - 自定义日期
  document.getElementById('single-expires').addEventListener('change', function() {
    document.getElementById('single-custom-date').style.display = this.value === 'custom' ? 'block' : 'none';
  });
  
  // 批量生成
  document.getElementById('generate-batch').addEventListener('click', generateBatchCodes);
  document.getElementById('copy-all-codes').addEventListener('click', copyAllBatchCodes);
  document.getElementById('export-csv').addEventListener('click', exportCSV);
  
  // 批量生成 - 自定义数量
  document.getElementById('batch-count').addEventListener('change', function() {
    document.getElementById('batch-custom-count').style.display = this.value === 'custom' ? 'block' : 'none';
  });
  
  // 批量生成 - 自定义日期
  document.getElementById('batch-expires').addEventListener('change', function() {
    document.getElementById('batch-custom-date').style.display = this.value === 'custom' ? 'block' : 'none';
  });
  
  // 邀请码列表
  document.getElementById('refresh-list').addEventListener('click', () => getInviteCodesList(1));
  document.getElementById('export-all-csv').addEventListener('click', exportAllCSV);
  document.getElementById('list-status').addEventListener('change', () => getInviteCodesList(1));
  document.getElementById('list-role').addEventListener('change', () => getInviteCodesList(1));
  document.getElementById('list-limit').addEventListener('change', () => getInviteCodesList(1));
  
  // 撤销邀请码
  document.getElementById('revoke-submit').addEventListener('click', executeRevoke);
  
  // 选项卡切换
  document.querySelectorAll('#management-tabs a').forEach(tab => {
    tab.addEventListener('click', function(e) {
      // 当切换到列表选项卡时，自动加载数据
      if (this.id === 'list-tab' && !this.classList.contains('active')) {
        setTimeout(() => getInviteCodesList(1), 100);
      }
    });
  });
  
  // 自动填充当前日期时间为默认值
  const now = new Date();
  const formattedNow = now.toISOString().slice(0, 16);
  document.getElementById('single-expires-date').value = formattedNow;
  document.getElementById('batch-expires-date').value = formattedNow;
}

// 当文档加载完成时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 暴露一些全局函数以便在HTML中直接调用
window.copyToClipboard = copyToClipboard;
window.revokeSingleCode = revokeSingleCode;