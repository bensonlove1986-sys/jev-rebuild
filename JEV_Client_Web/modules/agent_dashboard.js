// JEV 客服面板模块
class JEVDashboard {
  constructor() {
    this.statusElements = {
      workerStatus: null,
      workerLatency: null,
      traeStatus: null,
      customerCount: null,
      imageRecognition: null,
      pendingTasks: null,
      lastLog: null
    };
    this.updateInterval = null;
  }

  init() {
    this.loadElements();
    this.updateDashboard();
    this.startAutoUpdate();
    console.log('JEV 客服面板模块已初始化');
  }

  loadElements() {
    this.statusElements.workerStatus = document.getElementById('worker-status');
    this.statusElements.workerLatency = document.getElementById('worker-latency');
    this.statusElements.traeStatus = document.getElementById('trae-status');
    this.statusElements.customerCount = document.getElementById('customer-count');
    this.statusElements.imageRecognition = document.getElementById('image-recognition');
    this.statusElements.pendingTasks = document.getElementById('pending-tasks');
    this.statusElements.lastLog = document.getElementById('last-log');
  }

  async updateDashboard() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.redirectToLogin();
        return;
      }

      const response = await fetch('/api/jev/dashboard', {
        headers: {
          'X-Agent-Token': 'jev-secure-key-001',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        this.redirectToLogin();
        return;
      }

      const dashboardData = await response.json();
      
      this.updateStatus(dashboardData);
      this.updateCustomerStats(dashboardData);
      this.updateTaskStats(dashboardData);
      
    } catch (error) {
      console.error('更新面板错误:', error);
      this.setWorkerStatus(false, 'N/A');
    }
  }

  updateStatus(data) {
    const isWorkerConnected = data.worker?.connected || false;
    const latency = data.worker?.latency || 'N/A';
    const traeSyncOk = data.trae?.syncStatus === 'ok';

    this.setWorkerStatus(isWorkerConnected, latency);
    this.setTraeStatus(traeSyncOk);
  }

  updateCustomerStats(data) {
    const customerCount = data.customers?.today || 0;
    const lastLog = data.logs?.recent || '暂无日志';

    this.statusElements.customerCount.textContent = customerCount;
    this.statusElements.lastLog.textContent = lastLog;
  }

  updateTaskStats(data) {
    const imageModel = data.imageRecognition?.model || '未知';
    const pendingTasks = data.tasks?.pending || 0;

    this.statusElements.imageRecognition.textContent = imageModel;
    this.statusElements.pendingTasks.textContent = pendingTasks;
  }

  setWorkerStatus(connected, latency) {
    if (!this.statusElements.workerStatus || !this.statusElements.workerLatency) return;

    const statusIcon = connected ? '🟢' : '🔴';
    const statusText = connected ? 'Connected' : 'Disconnected';
    
    this.statusElements.workerStatus.innerHTML = `${statusIcon} Worker: ${statusText}`;
    this.statusElements.workerLatency.textContent = `(${latency}ms)`;
  }

  setTraeStatus(syncOk) {
    if (!this.statusElements.traeStatus) return;

    const statusIcon = syncOk ? '🟢' : '🟡';
    const statusText = syncOk ? 'Sync OK' : 'Sync Pending';
    
    this.statusElements.traeStatus.innerHTML = `${statusIcon} TRAE: ${statusText}`;
  }

  startAutoUpdate() {
    // 每5秒更新一次面板数据
    this.updateInterval = setInterval(() => {
      this.updateDashboard();
    }, 5000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  redirectToLogin() {
    localStorage.removeItem('token');
    window.location.href = '/ui/login_portal.html';
  }
}

// 初始化客服面板
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new JEVDashboard();
  dashboard.init();
  
  // 页面卸载时清理定时器
  window.addEventListener('beforeunload', () => {
    dashboard.stopAutoUpdate();
  });
});