// JEV-UI-Alignment-Pro-v3.0 - 核心JavaScript逻辑

/**
 * JEV UI核心类
 * 处理UI交互、主题切换、API调用等基础功能
 */
class JEVUI {
  constructor() {
    this.apiBase = '/';
    this.isDarkMode = true;
    this.isMobile = window.innerWidth <= 768;
    this.sidebarOpen = false;
    this.performanceMetrics = {
      cpu: 0,
      kvCalls: 0,
      latency: 0,
      connections: 0
    };
    
    // 初始化
    this.init();
  }

  /**
   * 初始化UI组件和事件监听
   */
  init() {
    // 检测系统主题偏好
    this.detectThemePreference();
    
    // 初始化事件监听
    this.initEventListeners();
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // 初始化性能监控
    this.initPerformanceMonitor();
    
    console.log('JEV UI 初始化完成');
  }

  /**
   * 检测系统主题偏好
   */
  detectThemePreference() {
    const savedTheme = localStorage.getItem('jevTheme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      this.isDarkMode = prefersDark;
    }
    
    this.applyTheme();
  }

  /**
   * 应用主题
   */
  applyTheme() {
    const theme = this.isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jevTheme', theme);
    
    // 更新主题切换按钮图标
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.innerHTML = this.isDarkMode ? '☀️' : '🌙';
    }
  }

  /**
   * 切换主题
   */
  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    
    // 保存主题偏好
    localStorage.setItem('jevTheme', this.isDarkMode ? 'dark' : 'light');
  }

  /**
   * 初始化事件监听
   */
  initEventListeners() {
    // 主题切换按钮
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    }
    
    // 侧边栏切换按钮
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
    }
    
    // 导航链接点击事件
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // 移除所有活动状态
        navLinks.forEach(item => item.classList.remove('active'));
        // 添加当前活动状态
        e.currentTarget.classList.add('active');
        
        // 在移动端自动关闭侧边栏
        if (this.isMobile) {
          this.closeSidebar();
        }
      });
    });
    
    // 页面加载完成后的动画效果
    document.addEventListener('DOMContentLoaded', () => {
      this.applyPageAnimation();
    });
  }

  /**
   * 切换侧边栏
   */
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
      this.sidebarOpen = !this.sidebarOpen;
      
      if (this.sidebarOpen) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('open');
        if (this.isMobile) {
          mainContent.classList.add('expanded');
        }
      } else {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('open');
        if (this.isMobile) {
          mainContent.classList.remove('expanded');
        }
      }
    }
  }

  /**
   * 关闭侧边栏
   */
  closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
      this.sidebarOpen = false;
      sidebar.classList.add('collapsed');
      sidebar.classList.remove('open');
      if (this.isMobile) {
        mainContent.classList.remove('expanded');
      }
    }
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    const prevIsMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    
    // 如果从桌面切换到移动端，自动关闭侧边栏
    if (!prevIsMobile && this.isMobile) {
      this.closeSidebar();
    }
    
    // 响应式调整
    this.adjustResponsiveLayout();
  }

  /**
   * 调整响应式布局
   */
  adjustResponsiveLayout() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) return;
    
    if (this.isMobile) {
      // 移动端默认隐藏侧边栏
      if (!this.sidebarOpen) {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('open');
        mainContent.classList.remove('expanded');
      }
    } else {
      // 桌面端默认显示侧边栏
      sidebar.classList.remove('collapsed');
      sidebar.classList.add('open');
      mainContent.classList.remove('expanded');
    }
  }

  /**
   * 应用页面加载动画
   */
  applyPageAnimation() {
    const elements = document.querySelectorAll('.card, .monitor-item');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('fade-in');
      }, index * 100);
    });
  }

  /**
   * 初始化性能监控
   */
  initPerformanceMonitor() {
    // 初始加载性能数据
    this.fetchPerformanceMetrics();
    
    // 每10秒刷新一次性能数据
    setInterval(() => {
      this.fetchPerformanceMetrics();
    }, 10000);
  }

  /**
   * 获取性能指标
   */
  async fetchPerformanceMetrics() {
    try {
      const response = await this.apiRequest('/api/metrics', 'GET');
      
      if (response.success) {
        this.performanceMetrics = response.data;
        this.updatePerformanceUI();
      }
    } catch (error) {
      console.error('获取性能指标失败:', error);
      // 使用模拟数据
      this.updatePerformanceUI(true);
    }
  }

  /**
   * 更新性能监控UI
   */
  updatePerformanceUI(useMockData = false) {
    if (useMockData) {
      // 生成模拟数据
      this.performanceMetrics = {
        cpu: Math.floor(Math.random() * 50) + 10,
        kvCalls: Math.floor(Math.random() * 1000) + 500,
        latency: Math.floor(Math.random() * 200) + 50,
        connections: Math.floor(Math.random() * 50) + 10
      };
    }
    
    // 更新UI元素
    const cpuElement = document.getElementById('monitorCpu');
    const kvElement = document.getElementById('monitorKv');
    const latencyElement = document.getElementById('monitorLatency');
    const connectionsElement = document.getElementById('monitorConnections');
    
    if (cpuElement) cpuElement.textContent = `${this.performanceMetrics.cpu}%`;
    if (kvElement) kvElement.textContent = `${this.performanceMetrics.kvCalls}`;
    if (latencyElement) latencyElement.textContent = `${this.performanceMetrics.latency}`;
    if (connectionsElement) connectionsElement.textContent = `${this.performanceMetrics.connections}`;
  }

  /**
   * 通用API请求函数
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.apiBase}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // 添加认证token（如果有）
      const token = localStorage.getItem('jevToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const config = {
        method,
        headers,
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data);
      }
      
      // 显示加载状态
      this.showLoading(true);
      
      const response = await fetch(url, config);
      
      // 隐藏加载状态
      this.showLoading(false);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 记录API调用日志
      this.logApiCall(endpoint, method, response.status);
      
      return result;
    } catch (error) {
      // 隐藏加载状态
      this.showLoading(false);
      
      console.error(`API请求失败 (${endpoint}):`, error);
      this.showNotification('API请求失败', 'error');
      
      throw error;
    }
  }

  /**
   * 显示加载状态
   */
  showLoading(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.textContent = message;
    
    // 设置样式
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? 'var(--text-error)' : type === 'success' ? 'var(--text-success)' : 'var(--primary-color)'};
      color: white;
      border-radius: var(--border-radius-small);
      box-shadow: var(--shadow);
      z-index: 2000;
      max-width: 300px;
      font-size: var(--font-size-sm);
    `;
    
    // 添加到文档
    document.body.appendChild(notification);
    
    // 自动关闭
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'opacity 0.3s, transform 0.3s';
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  /**
   * 记录API调用日志
   */
  logApiCall(endpoint, method, status) {
    const logData = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status,
      userId: localStorage.getItem('jevUserId') || 'guest'
    };
    
    console.log('API Call:', logData);
    
    // 如果有日志记录API，发送日志
    if (this.apiLoggingEnabled) {
      fetch('/api/logs/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      }).catch(err => console.error('日志记录失败:', err));
    }
  }

  /**
   * 处理表单提交
   */
  handleFormSubmit(formId, callback) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      try {
        await callback(data);
      } catch (error) {
        console.error('表单提交错误:', error);
        this.showNotification('提交失败，请重试', 'error');
      }
    });
  }

  /**
   * 上传文件
   */
  async uploadFile(file, endpoint = '/api/upload') {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      this.showLoading(true);
      
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jevToken') || ''}`
        },
        body: formData
      });
      
      this.showLoading(false);
      
      if (!response.ok) {
        throw new Error(`文件上传失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      this.showLoading(false);
      this.showNotification('文件上传失败', 'error');
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(url, filename) {
    try {
      this.showLoading(true);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      this.showLoading(false);
      this.showNotification('文件下载成功', 'success');
    } catch (error) {
      this.showLoading(false);
      this.showNotification('文件下载失败', 'error');
      console.error('下载错误:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 格式化日期时间
   */
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 验证输入
   */
  validateInput(value, type = 'text') {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^1[3-9]\d{9}$/.test(value);
      case 'password':
        return value.length >= 6;
      case 'required':
        return value !== null && value !== undefined && value.trim() !== '';
      default:
        return true;
    }
  }

  /**
   * 设置表单错误
   */
  setFormError(inputId, errorMessage) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let errorElement = document.getElementById(`${inputId}-error`);
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = `${inputId}-error`;
      errorElement.className = 'error-message';
      errorElement.style.cssText = `
        color: var(--text-error);
        font-size: var(--font-size-xs);
        margin-top: var(--spacing-xs);
      `;
      input.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = errorMessage;
    input.classList.add('error');
    
    // 添加错误状态样式
    input.style.borderColor = 'var(--text-error)';
  }

  /**
   * 清除表单错误
   */
  clearFormError(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const errorElement = document.getElementById(`${inputId}-error`);
    if (errorElement) {
      errorElement.remove();
    }
    
    input.classList.remove('error');
    input.style.borderColor = '';
  }

  /**
   * 导出性能报告
   */
  exportPerformanceReport() {
    const timestamp = Date.now();
    const reportData = {
      generatedAt: this.formatDateTime(timestamp),
      performance: this.performanceMetrics,
      systemInfo: {
        browser: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        theme: this.isDarkMode ? 'dark' : 'light'
      }
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `jev_ui_metrics_${timestamp}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showNotification('性能报告已导出', 'success');
  }
}

// 全局实例
const jevUI = new JEVUI();

// 导出供其他模块使用
window.jevUI = jevUI;

export default jevUI;