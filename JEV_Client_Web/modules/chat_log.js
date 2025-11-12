// JEV 聊天日志模块
class JEVChatLog {
  constructor() {
    this.logContainer = null;
    this.messageInput = null;
    this.sendButton = null;
    this.responseModeToggle = null;
    this.currentMode = 'human'; // 'human' 或 'ai'
    this.loadingIndicator = null;
  }

  init() {
    this.loadElements();
    this.setupEventListeners();
    this.loadRecentLogs();
    console.log('JEV 聊天日志模块已初始化');
  }

  loadElements() {
    this.logContainer = document.getElementById('chat-log-container');
    this.messageInput = document.getElementById('chat-message');
    this.sendButton = document.getElementById('send-message');
    this.responseModeToggle = document.getElementById('response-mode-toggle');
    this.loadingIndicator = document.getElementById('loading-indicator');
  }

  setupEventListeners() {
    if (this.sendButton) {
      this.sendButton.addEventListener('click', this.handleSendMessage.bind(this));
    }
    
    if (this.messageInput) {
      this.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSendMessage();
        }
      });
    }
    
    if (this.responseModeToggle) {
      this.responseModeToggle.addEventListener('change', this.handleModeToggle.bind(this));
    }
  }

  handleModeToggle() {
    this.currentMode = this.responseModeToggle.checked ? 'ai' : 'human';
    const modeText = this.responseModeToggle.nextElementSibling;
    modeText.textContent = this.currentMode === 'ai' ? 'AI 回复' : '人工回复';
    
    this.showNotification(`${this.currentMode === 'ai' ? '已切换至 AI 辅助回复模式' : '已切换至人工回复模式'}`);
  }

  async loadRecentLogs() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.redirectToLogin();
        return;
      }

      const response = await fetch('/api/jev/logs/recent', {
        headers: {
          'X-Agent-Token': 'jev-secure-key-001',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        this.redirectToLogin();
        return;
      }

      const logs = await response.json();
      this.displayLogs(logs);
    } catch (error) {
      console.error('加载日志错误:', error);
      this.addLogEntry('系统', '加载日志失败，请稍后重试', 'error');
    }
  }

  displayLogs(logs) {
    if (!logs || !Array.isArray(logs)) {
      this.addLogEntry('系统', '暂无聊天记录', 'system');
      return;
    }

    this.logContainer.innerHTML = '';
    logs.forEach(log => {
      this.addLogEntry(
        log.sender || '未知',
        log.message || '',
        log.type || 'message',
        new Date(log.timestamp)
      );
    });

    this.scrollToBottom();
  }

  async handleSendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    // 清空输入框并禁用按钮
    this.messageInput.value = '';
    this.sendButton.disabled = true;

    // 添加用户消息到日志
    this.addLogEntry('我', message, 'user');

    // 根据当前模式发送消息
    if (this.currentMode === 'ai') {
      this.sendAIMessage(message);
    } else {
      this.sendHumanMessage(message);
    }
  }

  async sendHumanMessage(message) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/jev/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': 'jev-secure-key-001',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          mode: 'human'
        })
      });

      if (response.ok) {
        this.showNotification('消息发送成功');
      } else {
        this.addLogEntry('系统', '消息发送失败', 'error');
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      this.addLogEntry('系统', '网络错误，请重试', 'error');
    } finally {
      this.sendButton.disabled = false;
    }
  }

  async sendAIMessage(message) {
    this.showLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/jev/chat/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': 'jev-secure-key-001',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message
        })
      });

      if (response.status === 401) {
        this.redirectToLogin();
        return;
      }

      const result = await response.json();

      if (result.success && result.response) {
        this.addLogEntry('AI', result.response, 'ai');
      } else {
        this.addLogEntry('系统', result.message || 'AI 回复失败', 'error');
      }
    } catch (error) {
      console.error('AI 回复错误:', error);
      this.addLogEntry('系统', 'AI 服务暂时不可用', 'error');
    } finally {
      this.showLoading(false);
      this.sendButton.disabled = false;
    }
  }

  addLogEntry(sender, message, type, timestamp = new Date()) {
    if (!this.logContainer) return;

    const formattedTime = timestamp.toLocaleTimeString('zh-CN');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    logEntry.innerHTML = `
      <div class="log-header">
        <span class="sender">${sender}</span>
        <span class="timestamp">${formattedTime}</span>
      </div>
      <div class="log-content">${this.escapeHtml(message)}</div>
    `;

    this.logContainer.appendChild(logEntry);
    this.scrollToBottom();
    
    // 添加样式
    this.addLogStyles();
  }

  scrollToBottom() {
    if (this.logContainer) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  showLoading(show) {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = show ? 'block' : 'none';
    }
  }

  showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'chat-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // 3秒后移除通知
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease';
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  addLogStyles() {
    if (document.getElementById('log-styles')) return;

    const style = document.createElement('style');
    style.id = 'log-styles';
    style.textContent = `
      .log-entry {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 8px;
        max-width: 85%;
      }
      .log-entry.user {
        background: #e3f2fd;
        margin-left: auto;
      }
      .log-entry.ai {
        background: #e8f5e9;
      }
      .log-entry.message {
        background: #f5f5f5;
      }
      .log-entry.error {
        background: #ffebee;
        color: #d32f2f;
      }
      .log-entry.system {
        background: #fff3e0;
        text-align: center;
        max-width: 100%;
      }
      .log-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 12px;
      }
      .sender {
        font-weight: 600;
      }
      .timestamp {
        color: #666;
      }
      .log-content {
        font-size: 14px;
        line-height: 1.4;
      }
      .chat-notification {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
    `;
    document.head.appendChild(style);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  redirectToLogin() {
    localStorage.removeItem('token');
    window.location.href = '/ui/login_portal.html';
  }
}

// 初始化聊天日志模块
document.addEventListener('DOMContentLoaded', () => {
  const chatLog = new JEVChatLog();
  chatLog.init();
});