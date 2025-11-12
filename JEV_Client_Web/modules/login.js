// JEV 客服端登录模块
class JEVLogin {
  constructor() {
    this.loginForm = null;
    this.messageElement = null;
  }

  init() {
    this.loginForm = document.getElementById('login-form');
    this.messageElement = document.getElementById('login-message');
    
    if (!this.loginForm) {
      console.error('登录表单不存在');
      return;
    }

    this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
    console.log('JEV 登录模块已初始化');
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      this.showMessage('请输入用户名和密码', 'error');
      return;
    }

    this.showMessage('登录中...', 'info');

    try {
      const response = await fetch('/api/jev/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': 'jev-secure-key-001'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('token', result.token);
        this.showMessage('登录成功，正在跳转...', 'success');
        setTimeout(() => {
          window.location.href = '/ui/client_portal.html';
        }, 1000);
      } else {
        this.showMessage(result.message || '登录失败', 'error');
      }
    } catch (error) {
      console.error('登录错误:', error);
      this.showMessage('网络错误，请重试', 'error');
    }
  }

  showMessage(message, type) {
    if (!this.messageElement) return;
    
    this.messageElement.textContent = message;
    this.messageElement.className = `message ${type}`;
    
    // 自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        this.messageElement.textContent = '';
        this.messageElement.className = 'message';
      }, 3000);
    }
  }
}

// 初始化登录模块
document.addEventListener('DOMContentLoaded', () => {
  const loginModule = new JEVLogin();
  loginModule.init();
});