// JEV 状态同步模块
class JEVStatusSync {
  constructor() {
    this.heartbeatInterval = null;
    this.lastHeartbeatTime = 0;
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  init() {
    this.startHeartbeat();
    this.setupNetworkListeners();
    console.log('JEV 状态同步模块已初始化');
  }

  startHeartbeat() {
    // 每10秒发送一次心跳
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 10000);

    // 立即发送第一次心跳
    this.sendHeartbeat();
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async sendHeartbeat() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.stopHeartbeat();
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/api/jev/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': 'jev-secure-key-001',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timestamp: startTime,
          action: 'heartbeat'
        })
      });

      if (response.status === 401) {
        this.redirectToLogin();
        return;
      }

      const latency = Date.now() - startTime;
      const result = await response.json();

      if (result.success) {
        this.handleSuccessfulHeartbeat(latency);
      } else {
        this.handleFailedHeartbeat();
      }
    } catch (error) {
      console.error('心跳发送错误:', error);
      this.handleFailedHeartbeat();
    }
  }

  handleSuccessfulHeartbeat(latency) {
    this.lastHeartbeatTime = Date.now();
    
    // 重置重连尝试
    if (!this.isConnected) {
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.updateWorkerStatus(true, latency);
      this.notifyReconnected();
    } else {
      // 更新延迟显示
      this.updateLatencyDisplay(latency);
    }
  }

  handleFailedHeartbeat() {
    this.reconnectAttempts++;
    
    // 连续失败多次才标记为断开连接
    if (this.reconnectAttempts >= this.maxReconnectAttempts && this.isConnected) {
      this.isConnected = false;
      this.updateWorkerStatus(false, 'N/A');
      this.notifyDisconnected();
    }
  }

  updateWorkerStatus(connected, latency) {
    const statusElement = document.getElementById('worker-status');
    const latencyElement = document.getElementById('worker-latency');
    
    if (statusElement) {
      const statusIcon = connected ? '🟢' : '🔴';
      const statusText = connected ? 'Connected' : 'Disconnected';
      statusElement.innerHTML = `${statusIcon} Worker: ${statusText}`;
    }
    
    if (latencyElement) {
      latencyElement.textContent = connected ? `(${latency}ms)` : '';
    }
  }

  updateLatencyDisplay(latency) {
    const latencyElement = document.getElementById('worker-latency');
    if (latencyElement) {
      latencyElement.textContent = `(${latency}ms)`;
    }
  }

  notifyReconnected() {
    this.showStatusNotification('Worker 连接已恢复', 'success');
  }

  notifyDisconnected() {
    this.showStatusNotification('Worker 连接已断开，正在尝试重连...', 'error');
  }

  showStatusNotification(message, type) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `status-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: fadeIn 0.3s ease;
    `;

    // 设置背景颜色
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // 5秒后移除通知
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }

  setupNetworkListeners() {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      console.log('网络已连接');
      this.reconnectAttempts = 0;
      this.sendHeartbeat();
    });

    window.addEventListener('offline', () => {
      console.log('网络已断开');
      this.isConnected = false;
      this.updateWorkerStatus(false, 'N/A');
      this.showStatusNotification('网络连接已断开', 'error');
    });

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      this.stopHeartbeat();
    });
  }

  redirectToLogin() {
    localStorage.removeItem('token');
    window.location.href = '/ui/login_portal.html';
  }

  // 获取当前连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      lastHeartbeatTime: this.lastHeartbeatTime,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// 初始化状态同步模块
document.addEventListener('DOMContentLoaded', () => {
  const statusSync = new JEVStatusSync();
  statusSync.init();
  
  // 全局暴露状态同步实例，供其他模块使用
  window.JEVStatusSync = statusSync;
});