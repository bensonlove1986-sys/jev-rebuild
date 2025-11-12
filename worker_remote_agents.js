/**
 * JEV Cloudflare Worker 服务
 * 提供远程客服监控接口和状态管理
 */

// 启动时间
const START_TIME = Date.now();
const VERSION = '1.0.0';

// 安全配置
const SECURITY_CONFIG = {
  VALID_TOKEN: 'jev-secure-key-001',
  VALID_LAYER: 'support'
};

// 静态文件映射
const STATIC_FILES = {
  // 客服控制台页面
  '/ui/client_portal.html': {
    type: 'text/html',
    content: '<!DOCTYPE html>' +
      '<html lang="zh-CN">' +
      '<head>' +
      '  <meta charset="UTF-8">' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '  <title>JEV Sentinel - 客服远程控制台</title>' +
      '  <style> :root {' +
      '    --primary-color: #2196F3;' +
      '    --secondary-color: #4CAF50;' +
      '    --accent-color: #FF9800;' +
      '    --error-color: #F44336;' +
      '    --text-primary: #333333;' +
      '    --text-secondary: #666666;' +
      '    --background-light: #f5f7fa;' +
      '    --background-white: #ffffff;' +
      '    --border-color: #e0e0e0;' +
      '    --shadow-light: 0 2px 8px rgba(0, 0, 0, 0.1);' +
      '    --shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.15);' +
      '    --border-radius: 8px;' +
      '    --transition-fast: all 0.2s ease;' +
      '    --transition-medium: all 0.3s ease;' +
      '  }' +
      '  * {' +
      '    margin: 0;' +
      '    padding: 0;' +
      '    box-sizing: border-box;' +
      '  }' +
      '  body {' +
      '    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;' +
      '    background-color: var(--background-light);' +
      '    color: var(--text-primary);' +
      '    line-height: 1.6;' +
      '    min-height: 100vh;' +
      '  }' +
      '  .container {' +
      '    max-width: 1400px;' +
      '    margin: 0 auto;' +
      '    padding: 0 20px;' +
      '  }' +
      '  header {' +
      '    background: linear-gradient(135deg, var(--primary-color), #1976D2);' +
      '    color: white;' +
      '    padding: 15px 0;' +
      '    box-shadow: var(--shadow-light);' +
      '    position: sticky;' +
      '    top: 0;' +
      '    z-index: 1000;' +
      '  }' +
      '  .header-content {' +
      '    display: flex;' +
      '    justify-content: space-between;' +
      '    align-items: center;' +
      '  }' +
      '  .logo {' +
      '    font-size: 24px;' +
      '    font-weight: bold;' +
      '    display: flex;' +
      '    align-items: center;' +
      '    gap: 10px;' +
      '  }' +
      '  .logo-icon {' +
      '    font-size: 28px;' +
      '  }' +
      '  nav ul {' +
      '    display: flex;' +
      '    list-style: none;' +
      '    gap: 25px;' +
      '  }' +
      '  nav a {' +
      '    color: white;' +
      '    text-decoration: none;' +
      '    font-weight: 500;' +
      '    transition: var(--transition-fast);' +
      '    padding: 8px 15px;' +
      '    border-radius: var(--border-radius);' +
      '  }' +
      '  nav a:hover {' +
      '    background-color: rgba(255, 255, 255, 0.2);' +
      '  }' +
      '  nav a.active {' +
      '    background-color: rgba(255, 255, 255, 0.3);' +
      '  }' +
      '  .status-bar {' +
      '    background-color: var(--background-white);' +
      '    padding: 10px 0;' +
      '    margin-bottom: 20px;' +
      '    box-shadow: var(--shadow-light);' +
      '  }' +
      '  .status-content {' +
      '    display: flex;' +
      '    justify-content: space-between;' +
      '    align-items: center;' +
      '    flex-wrap: wrap;' +
      '    gap: 15px;' +
      '  }' +
      '  .status-item {' +
      '    display: flex;' +
      '    align-items: center;' +
      '    gap: 10px;' +
      '    font-size: 14px;' +
      '    color: var(--text-secondary);' +
      '  }' +
      '  .status-label {' +
      '    font-weight: 500;' +
      '  }' +
      '  .status-value {' +
      '    font-weight: bold;' +
      '  }' +
      '  .status-online {' +
      '    color: var(--secondary-color);' +
      '  }' +
      '  .status-offline {' +
      '    color: var(--error-color);' +
      '  }' +
      '  .main-content {' +
      '    display: grid;' +
      '    grid-template-columns: 1fr 2fr 1fr;' +
      '    gap: 20px;' +
      '    margin-bottom: 30px;' +
      '  }' +
      '  .card {' +
      '    background-color: var(--background-white);' +
      '    border-radius: var(--border-radius);' +
      '    box-shadow: var(--shadow-light);' +
      '    padding: 20px;' +
      '    transition: var(--transition-medium);' +
      '  }' +
      '  .card:hover {' +
      '    box-shadow: var(--shadow-medium);' +
      '  }' +
      '  .card-header {' +
      '    display: flex;' +
      '    justify-content: space-between;' +
      '    align-items: center;' +
      '    margin-bottom: 15px;' +
      '    padding-bottom: 10px;' +
      '    border-bottom: 1px solid var(--border-color);' +
      '  }' +
      '  .card-title {' +
      '    font-size: 18px;' +
      '    font-weight: 600;' +
      '    color: var(--text-primary);' +
      '  }' +
      '  .card-actions {' +
      '    display: flex;' +
      '    gap: 10px;' +
      '  }' +
      '  .btn {' +
      '    padding: 8px 16px;' +
      '    border: none;' +
      '    border-radius: var(--border-radius);' +
      '    cursor: pointer;' +
      '    font-weight: 500;' +
      '    transition: var(--transition-fast);' +
      '    font-size: 14px;' +
      '    display: inline-flex;' +
      '    align-items: center;' +
      '    gap: 5px;' +
      '  }' +
      '  .btn-primary {' +
      '    background-color: var(--primary-color);' +
      '    color: white;' +
      '  }' +
      '  .btn-primary:hover {' +
      '    background-color: #1976D2;' +
      '  }' +
      '  .btn-secondary {' +
      '    background-color: #f0f0f0;' +
      '    color: var(--text-primary);' +
      '  }' +
      '  .btn-secondary:hover {' +
      '    background-color: #e0e0e0;' +
      '  }' +
      '  .btn-success {' +
      '    background-color: var(--secondary-color);' +
      '    color: white;' +
      '  }' +
      '  .btn-success:hover {' +
      '    background-color: #45a049;' +
      '  }' +
      '  .btn:disabled {' +
      '    opacity: 0.6;' +
      '    cursor: not-allowed;' +
      '  }' +
      '  /* 图片上传区域样式 */' +
      '  #image-upload-area {' +
      '    border: 2px dashed var(--border-color);' +
      '    border-radius: var(--border-radius);' +
      '    padding: 30px;' +
      '    text-align: center;' +
      '    cursor: pointer;' +
      '    transition: var(--transition-fast);' +
      '    margin-bottom: 15px;' +
      '  }' +
      '  #image-upload-area:hover, #image-upload-area.dragover {' +
      '    border-color: var(--primary-color);' +
      '    background-color: rgba(33, 150, 243, 0.05);' +
      '  }' +
      '  .upload-icon {' +
      '    font-size: 48px;' +
      '    color: var(--text-secondary);' +
      '    margin-bottom: 10px;' +
      '  }' +
      '  .upload-text {' +
      '    font-size: 16px;' +
      '    color: var(--text-secondary);' +
      '  }' +
      '  #image-upload {' +
      '    display: none;' +
      '  }' +
      '  #image-preview {' +
      '    margin-top: 15px;' +
      '    text-align: center;' +
      '  }' +
      '  #recognition-result {' +
      '    margin-top: 20px;' +
      '  }' +
      '  #loading-indicator {' +
      '    display: none;' +
      '    text-align: center;' +
      '    padding: 20px;' +
      '  }' +
      '  .loading-spinner {' +
      '    display: inline-block;' +
      '    width: 40px;' +
      '    height: 40px;' +
      '    border: 3px solid #f3f3f3;' +
      '    border-top: 3px solid var(--primary-color);' +
      '    border-radius: 50%;' +
      '    animation: spin 1s linear infinite;' +
      '  }' +
      '  @keyframes spin {' +
      '    0% { transform: rotate(0deg); }' +
      '    100% { transform: rotate(360deg); }' +
      '  }' +
      '  /* 聊天日志样式 */' +
      '  #chat-log-container {' +
      '    height: 400px;' +
      '    overflow-y: auto;' +
      '    background-color: var(--background-light);' +
      '    border: 1px solid var(--border-color);' +
      '    border-radius: var(--border-radius);' +
      '    padding: 15px;' +
      '    margin-bottom: 15px;' +
      '    display: flex;' +
      '    flex-direction: column;' +
      '    gap: 10px;' +
      '  }' +
      '  .chat-input-container {' +
      '    display: flex;' +
      '    gap: 10px;' +
      '  }' +
      '  #chat-message {' +
      '    flex: 1;' +
      '    padding: 10px 15px;' +
      '    border: 1px solid var(--border-color);' +
      '    border-radius: var(--border-radius);' +
      '    font-size: 14px;' +
      '    resize: none;' +
      '    min-height: 40px;' +
      '    max-height: 100px;' +
      '  }' +
      '  /* 任务表格样式 */' +
      '  .task-table {' +
      '    width: 100%;' +
      '    border-collapse: collapse;' +
      '    margin-top: 20px;' +
      '  }' +
      '  .task-table th, .task-table td {' +
      '    padding: 12px 10px;' +
      '    text-align: left;' +
      '    border-bottom: 1px solid var(--border-color);' +
      '  }' +
      '  .task-table th {' +
      '    background-color: #f8f9fa;' +
      '    font-weight: 600;' +
      '    color: var(--text-primary);' +
      '  }' +
      '  .task-table tr:hover {' +
      '    background-color: #f5f5f5;' +
      '  }' +
      '  .task-status {' +
      '    display: inline-block;' +
      '    padding: 4px 8px;' +
      '    border-radius: 4px;' +
      '    font-size: 12px;' +
      '    font-weight: 500;' +
      '  }' +
      '  .status-pending {' +
      '    background-color: #FFF3CD;' +
      '    color: #856404;' +
      '  }' +
      '  .status-processing {' +
      '    background-color: #D1ECF1;' +
      '    color: #0C5460;' +
      '  }' +
      '  .status-completed {' +
      '    background-color: #D4EDDA;' +
      '    color: #155724;' +
      '  }' +
      '  .status-error {' +
      '    background-color: #F8D7DA;' +
      '    color: #721C24;' +
      '  }' +
      '  /* 用户资料样式 */' +
      '  .profile-info {' +
      '    display: flex;' +
      '    align-items: center;' +
      '    padding: 15px;' +
      '    background-color: var(--background-secondary);' +
      '    border-radius: var(--border-radius);' +
      '    margin-bottom: 20px;' +
      '  }' +
      '  .profile-item {' +
      '    display: flex;' +
      '    justify-content: space-between;' +
      '    align-items: center;' +
      '    width: 100%;' +
      '    padding: 8px 0;' +
      '    border-bottom: 1px solid var(--border-color);' +
      '  }' +
      '  .profile-label {' +
      '    font-weight: 500;' +
      '    color: var(--text-secondary);' +
      '    min-width: 120px;' +
      '  }' +
      '  .profile-value {' +
      '    font-weight: 600;' +
      '    color: var(--text-primary);' +
      '    text-align: right;' +
      '  }' +
      '  .profile-avatar {' +
      '    width: 80px;' +
      '    height: 80px;' +
      '    border-radius: 50%;' +
      '    object-fit: cover;' +
      '    margin-bottom: 15px;' +
      '  }' +
      '  /* 响应式设计 */' +
      '@media (max-width: 1200px) {' +
      '  .main-content {' +
      '    padding: 20px 15px;' +
      '  }' +
      '}' +
        grid-template-columns: 1fr 2fr;
      }
      
      .card:last-child {
        grid-column: span 2;
      }
    }
    
    @media (max-width: 768px) {
      .main-content {
        grid-template-columns: 1fr;
      }
      
      .card:last-child {
        grid-column: span 1;
      }
      
      .status-content {
        justify-content: center;
      }
      
      .logo {
        font-size: 20px;
      }
      
      nav ul {
        gap: 10px;
      }
      
      nav a {
        padding: 5px 10px;
        font-size: 14px;
      }
    }
    
    /* 滚动条样式 */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    
    /* 页脚样式 */
    footer {
      background-color: var(--background-white);
      padding: 20px 0;
      border-top: 1px solid var(--border-color);
      margin-top: 20px;
    }
    
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .footer-text {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .version-info {
      font-size: 12px;
      color: #999;
    }
    
    /* 通知消息样式 */
    .status {
      padding: 12px 20px;
      border-radius: var(--border-radius);
      margin-bottom: 15px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    }
    
    .status.success {
      background-color: rgba(76, 175, 80, 0.1);
      color: var(--secondary-color);
      border-left: 4px solid var(--secondary-color);
    }
    
    .status.error {
      background-color: rgba(244, 67, 54, 0.1);
      color: var(--error-color);
      border-left: 4px solid var(--error-color);
    }
    
    .status.info {
      background-color: rgba(33, 150, 243, 0.1);
      color: var(--primary-color);
      border-left: 4px solid var(--primary-color);
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container header-content">
      <div class="logo">
        <span class="logo-icon">🔍</span>
        <span>JEV Sentinel</span>
      </div>
      <nav>
        <ul>
          <li><a href="#" class="active">控制台</a></li>
          <li><a href="#">任务管理</a></li>
          <li><a href="#">系统设置</a></li>
          <li><a href="#" id="logout-btn">退出登录</a></li>
        </ul>
      </nav>
    </div>
  </header>
  
  <div class="container">
    <div class="status-bar">
      <div class="status-content">
        <div class="status-item">
          <span class="status-label">Worker状态:</span>
          <span class="status-value" id="worker-status">Connected</span>
        </div>
        <div class="status-item">
          <span class="status-label">TRAE同步状态:</span>
          <span class="status-value" id="trae-status">Sync OK</span>
        </div>
        <div class="status-item">
          <span class="status-label">在线客服数量:</span>
          <span class="status-value" id="customer-count">12</span>
        </div>
        <div class="status-item">
          <span class="status-label">识别模型:</span>
          <span class="status-value" id="recognition-model">v4.2.0</span>
        </div>
        <div class="status-item">
          <span class="status-label">待处理任务:</span>
          <span class="status-value" id="pending-tasks">3</span>
        </div>
        <div class="status-item">
          <span class="status-label">最新日志:</span>
          <span class="status-value" id="latest-log">系统正常运行中</span>
        </div>
        <button class="btn btn-secondary" id="refresh-data">
          刷新数据
        </button>
      </div>
    </div>
    
    <div class="main-content">
      <!-- 图片上传与识别卡片 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">图片识别</h3>
        </div>
        <div id="image-upload-area">
          <input type="file" id="image-upload" accept="image/*" />
          <div class="upload-icon">📸</div>
          <div class="upload-text">点击或拖放图片到此处上传</div>
          <small style="color: #999; display: block; margin-top: 10px;">支持 JPG、PNG、GIF 格式，最大 10MB</small>
        </div>
        <div id="image-preview" style="display: none;">
          <!-- 图片预览将在这里显示 -->
        </div>
        <button class="btn btn-primary" id="recognize-button" disabled>
          开始识别
        </button>
        <div id="loading-indicator">
          <div class="loading-spinner"></div>
          <p style="margin-top: 10px; color: #666;">正在识别，请稍候...</p>
        </div>
        <div id="recognition-result">
          <!-- 识别结果将在这里显示 -->
        </div>
      </div>
      
      <!-- 聊天日志卡片 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">聊天日志</h3>
          <div class="card-actions">
            <button class="btn btn-secondary" id="clear-chat">
              清空
            </button>
          </div>
        </div>
        <div id="chat-log-container">
          <!-- 聊天记录将在这里显示 -->
        </div>
        <div class="chat-input-container">
          <textarea id="chat-message" placeholder="输入消息..." rows="2"></textarea>
          <button class="btn btn-success" id="send-message">
            发送
          </button>
        </div>
      </div>
      
      <!-- 任务监控卡片 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">任务监控</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="task-table">
            <thead>
              <tr>
                <th>任务ID</th>
                <th>状态</th>
                <th>客户</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody id="task-table-body">
              <!-- 任务列表将在这里显示 -->
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 客服资料卡片 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">客服资料</h3>
        </div>
        <div class="profile-avatar">CS</div>
        <div class="profile-info">
          <div class="profile-item">
            <span class="profile-label">客服ID</span>
            <span class="profile-value">CS-2024-001</span>
          </div>
          <div class="profile-item">
            <span class="profile-label">姓名</span>
            <span class="profile-value">张小明</span>
          </div>
          <div class="profile-item">
            <span class="profile-label">工号</span>
            <span class="profile-value">K20230601</span>
          </div>
          <div class="profile-item">
            <span class="profile-label">部门</span>
            <span class="profile-value">技术支持</span>
          </div>
          <div class="profile-item">
            <span class="profile-label">在线状态</span>
            <span class="profile-value">在线</span>
          </div>
          <div class="profile-item">
            <span class="profile-label">今日处理任务</span>
            <span class="profile-value">23</span>
          </div>
          <div class="profile-item">
            <span class="profile-label">平均响应时间</span>
            <span class="profile-value">1.5分钟</span>
          </div>
        </div>
      </div>
    </div>
    
    <footer>
      <div class="footer-content">
        <div class="footer-text">© 2024 JEV Sentinel 客服系统 - 安全、高效、智能</div>
        <div class="version-info">版本: v6.0.0 | 上次更新: 2024-01-15</div>
      </div>
    </footer>
  </div>
  
  <!-- 模块脚本 -->
  <script src="/modules/agent_dashboard.js"></script>
  <script src="/modules/image_capture.js"></script>
  <script src="/modules/chat_log.js"></script>
  <script src="/modules/status_sync.js"></script>
  
  <script>
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
      // 验证登录状态
      if (!localStorage.getItem('jev_agent_token')) {
        // 模拟登录，实际应该跳转到登录页面
        localStorage.setItem('jev_agent_token', 'mock-token-' + Date.now());
        console.log('已模拟登录');
      }
      
      // 初始化仪表盘
      if (window.JEVDashboard) {
        const dashboard = new JEVDashboard();
        dashboard.initialize();
      }
      
      // 处理退出登录
      document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('jev_agent_token');
        alert('已退出登录');
        window.location.reload();
      });
      
      // 刷新数据按钮
      document.getElementById('refresh-data').addEventListener('click', function() {
        if (window.refreshJEVStatus) {
          window.refreshJEVStatus();
        }
        if (window.JEVDashboard) {
          const dashboard = new JEVDashboard();
          dashboard.loadTasks();
        }
      });
    });
  </script>
</body>
</html>`
  },
  
  // 仪表盘模块
  '/modules/agent_dashboard.js': {
    type: 'application/javascript',
    content: `class JEVDashboard {
  constructor() {
    this.taskTableBody = document.getElementById('task-table-body');
    this.initialTasks = [
      { id: 'TK-2024-001', status: 'pending', customer: '李女士', time: '10:23:45' },
      { id: 'TK-2024-002', status: 'processing', customer: '王先生', time: '10:30:12' },
      { id: 'TK-2024-003', status: 'completed', customer: '张先生', time: '09:45:33' },
      { id: 'TK-2024-004', status: 'error', customer: '赵女士', time: '11:15:22' },
      { id: 'TK-2024-005', status: 'pending', customer: '陈先生', time: '11:20:01' }
    ];
  }
  
  async initialize() {
    console.log('JEVDashboard 初始化中...');
    
    try {
      // 加载任务数据
      await this.loadTasks();
      
      // 设置定期刷新
      setInterval(() => this.loadTasks(), 60000); // 每分钟刷新一次
      
      console.log('JEVDashboard 初始化完成');
    } catch (error) {
      console.error('JEVDashboard 初始化失败:', error);
      this.showErrorMessage('仪表盘初始化失败，请刷新页面重试');
    }
  }
  
  async loadTasks() {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 使用初始任务数据
      const tasks = this.initialTasks;
      
      // 随机更新一些任务状态，模拟实时性
      const updatedTasks = tasks.map(task => {
        // 20%的概率更新状态
        if (Math.random() < 0.2) {
          const statuses = ['pending', 'processing', 'completed', 'error'];
          return {
            ...task,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            time: new Date().toLocaleTimeString()
          };
        }
        return task;
      });
      
      this.renderTasks(updatedTasks);
    } catch (error) {
      console.error('加载任务失败:', error);
      this.showErrorMessage('加载任务失败');
    }
  }
  
  renderTasks(tasks) {
    if (!this.taskTableBody) return;
    
    // 清空表格
    this.taskTableBody.innerHTML = '';
    
    // 添加任务行
    tasks.forEach(task => {
      const row = document.createElement('tr');
      row.className = task.status;
      
      // 状态样式映射
      const statusClasses = {
        pending: 'status-pending',
        processing: 'status-processing',
        completed: 'status-completed',
        error: 'status-error'
      };
      
      // 状态文本映射
      const statusTexts = {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        error: '处理失败'
      };
      
      row.innerHTML = 
        '<td>\n          <a href="#" class="task-link" data-task-id="' + task.id + '">' + task.id + '</a>\n        </td>\n        <td>\n          <span class="task-status ' + statusClasses[task.status] + '">\n            ' + statusTexts[task.status] + '\n          </span>\n        </td>\n        <td>' + task.customer + '</td>\n        <td>' + task.time + '</td>'
      
      this.taskTableBody.appendChild(row);
    });
    
    // 添加任务点击事件
    this.addTaskClickListeners();
  }
  
  addTaskClickListeners() {
    const taskLinks = document.querySelectorAll('.task-link');
    taskLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = link.getAttribute('data-task-id');
        this.showTaskDetails(taskId);
      });
    });
  }
  
  showTaskDetails(taskId) {
    // 模拟显示任务详情
    console.log('查看任务详情:', taskId);
    
    // 显示任务详情模态框（这里简化为alert）
    alert('任务详情\n任务ID: ' + taskId + '\n状态: 正在查询...\n请稍候查看详细信息');
  }
  
  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'status error';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(errorDiv, container.firstChild);
      
      // 3秒后自动移除错误消息
      setTimeout(() => {
        if (container.contains(errorDiv)) {
          container.removeChild(errorDiv);
        }
      }, 3000);
    }
  }
  
  updateTaskStatus(taskId, newStatus) {
    const taskRow = this.taskTableBody.querySelector('[data-task-id="' + taskId + '"]');
    if (taskRow && taskRow.parentElement) {
      const statusCell = taskRow.parentElement.querySelector('.task-status');
      const timeCell = taskRow.parentElement.cells[3];
      
      if (statusCell && timeCell) {
        // 更新状态类
        Object.values({
          pending: 'status-pending',
          processing: 'status-processing',
          completed: 'status-completed',
          error: 'status-error'
        }).forEach(className => {
          statusCell.classList.remove(className);
        });
        
        // 添加新状态类
        const statusClasses = {
          pending: 'status-pending',
          processing: 'status-processing',
          completed: 'status-completed',
          error: 'status-error'
        };
        
        statusCell.classList.add(statusClasses[newStatus]);
        
        // 更新状态文本
        const statusTexts = {
          pending: '待处理',
          processing: '处理中',
          completed: '已完成',
          error: '处理失败'
        };
        
        statusCell.textContent = statusTexts[newStatus];
        
        // 更新时间
        timeCell.textContent = new Date().toLocaleTimeString();
      }
    }
  }
}

// 暴露到全局
window.JEVDashboard = JEVDashboard;`
  },
  
  // 图片上传识别模块
  '/modules/image_capture.js': {
    type: 'application/javascript',
    content: `class ImageCaptureModule {
  constructor() {
    this.uploadArea = document.getElementById('image-upload-area');
    this.uploadInput = document.getElementById('image-upload');
    this.imagePreview = document.getElementById('image-preview');
    this.recognizeButton = document.getElementById('recognize-button');
    this.recognitionResult = document.getElementById('recognition-result');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.currentImage = null;
    
    this.initialize();
  }
  
  initialize() {
    if (this.uploadArea) {
      this.uploadArea.addEventListener('click', () => this.uploadInput.click());
    }
    
    if (this.uploadInput) {
      this.uploadInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
    
    if (this.recognizeButton) {
      this.recognizeButton.addEventListener('click', () => this.recognizeImage());
    }
    
    // 支持拖放功能
    if (this.uploadArea) {
      this.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
      });
      
      this.uploadArea.addEventListener('dragleave', () => {
        this.uploadArea.classList.remove('dragover');
      });
      
      this.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      });
    }
  }
  
  handleFileSelect(event) {
    if (event.target.files && event.target.files[0]) {
      this.handleFile(event.target.files[0]);
    }
  }
  
  handleFile(file) {
    // 检查文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showMessage('请上传有效的图片文件（JPG、PNG、GIF、WebP）', 'error');
      return;
    }
    
    // 检查文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      this.showMessage('图片大小不能超过10MB', 'error');
      return;
    }
    
    this.currentImage = file;
    this.previewImage(file);
    
    if (this.recognizeButton) {
      this.recognizeButton.disabled = false;
    }
  }
  
  previewImage(file) {
    if (!this.imagePreview) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '300px';
      img.style.borderRadius = '8px';
      
      this.imagePreview.innerHTML = '';
      this.imagePreview.appendChild(img);
      
      const fileName = document.createElement('p');
      fileName.textContent = '文件名: ' + file.name;
      fileName.style.fontSize = '14px';
      fileName.style.color = '#666';
      fileName.style.marginTop = '10px';
      
      this.imagePreview.appendChild(fileName);
      this.imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
  
  async recognizeImage() {
    if (!this.currentImage) {
      this.showMessage('请先选择图片', 'error');
      return;
    }
    
    // 显示加载状态
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
    if (this.recognizeButton) {
      this.recognizeButton.disabled = true;
    }
    if (this.recognitionResult) {
      this.recognitionResult.innerHTML = '';
    }
    
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟识别结果
      const mockResults = this.generateMockRecognitionResult();
      
      this.displayRecognitionResult(mockResults);
      this.showMessage('图片识别完成', 'success');
      
    } catch (error) {
      console.error('识别错误:', error);
      this.showMessage('图片识别失败，请重试', 'error');
    } finally {
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'none';
      }
      if (this.recognizeButton) {
        this.recognizeButton.disabled = false;
      }
    }
  }
  
  generateMockRecognitionResult() {
    const templates = [
      {
        title: '识别结果',
        items: [
          { label: '产品类型', value: '电子元件 - 电阻' },
          { label: '规格型号', value: '10KΩ ±5%' },
          { label: '数量', value: '1个' },
          { label: '状态', value: '良品' }
        ],
        confidence: 98.5
      },
      {
        title: '识别结果',
        items: [
          { label: '产品类型', value: 'PCB板' },
          { label: '规格型号', value: 'JEV-BASE-v3.2' },
          { label: '数量', value: '1块' },
          { label: '状态', value: '有轻微划痕' }
        ],
        confidence: 96.2
      },
      {
        title: '识别结果',
        items: [
          { label: '产品类型', value: '连接器' },
          { label: '规格型号', value: 'USB-C 母座' },
          { label: '数量', value: '2个' },
          { label: '状态', value: '良品' }
        ],
        confidence: 99.0
      }
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  displayRecognitionResult(result) {
    if (!this.recognitionResult) return;
    
    let itemsHTML = '';
    if (result.items) {
      result.items.forEach(item => {
        itemsHTML += '<div style="display: flex; justify-content: space-between; margin-bottom: 5px; padding: 5px 0; border-bottom: 1px solid #eee;">' +
                    '<span style="color: #666; font-size: 14px;">' + item.label + ':</span>' +
                    '<span style="font-weight: 500; font-size: 14px;">' + item.value + '</span>' +
                    '</div>';
      });
    }
    
    const resultHTML = '<div style="padding: 15px; background: rgba(76, 175, 80, 0.05); border-radius: 8px; margin-top: 15px;">' +
                      '<h4 style="margin-bottom: 10px; color: #333;">' + result.title + '</h4>' +
                      '<div style="margin-bottom: 10px;">' + itemsHTML + '</div>' +
                      '<div style="font-size: 12px; color: #666;">' +
                      '置信度: ' + result.confidence + '%' +
                      '</div>' +
                      '</div>';
    
    this.recognitionResult.innerHTML = resultHTML;
  }
  
  showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = \`status \${type}\`;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
      if (container.contains(messageDiv)) {
        container.removeChild(messageDiv);
      }
    }, 3000);
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ImageCaptureModule();
  });
} else {
  new ImageCaptureModule();
}`
  },
  
  // 聊天日志模块
  '/modules/chat_log.js': {
    type: 'application/javascript',
    content: `class ChatLogModule {
  constructor() {
    this.chatContainer = document.getElementById('chat-log-container');
    this.chatInput = document.getElementById('chat-message');
    this.sendButton = document.getElementById('send-message');
    this.clearButton = document.getElementById('clear-chat');
    this.chatLog = [];
    this.autoScroll = true;
    
    this.initialize();
  }
  
  initialize() {
    if (this.chatInput && this.sendButton) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      this.sendButton.addEventListener('click', () => this.sendMessage());
    }
    
    if (this.clearButton) {
      this.clearButton.addEventListener('click', () => this.clearChat());
    }
    
    if (this.chatContainer) {
      this.chatContainer.addEventListener('scroll', () => {
        // 检测用户是否手动滚动
        const { scrollTop, scrollHeight, clientHeight } = this.chatContainer;
        this.autoScroll = scrollTop + clientHeight >= scrollHeight - 10;
      });
    }
    
    // 加载历史聊天记录
    this.loadChatHistory();
    
    // 模拟定期收到新消息
    this.startMessageSimulation();
  }
  
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;
    
    // 添加用户消息
    this.addMessage('user', message);
    this.chatInput.value = '';
    
    // 模拟回复延迟
    this.sendButton.disabled = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      
      // 根据消息内容生成不同的回复
      const reply = this.generateReply(message);
      this.addMessage('system', reply);
    } finally {
      this.sendButton.disabled = false;
    }
  }
  
  addMessage(sender, content) {
    const timestamp = new Date().toLocaleTimeString();
    const message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp
    };
    
    this.chatLog.push(message);
    this.renderMessage(message);
    
    // 限制日志长度，避免内存占用过大
    if (this.chatLog.length > 100) {
      this.chatLog.shift();
    }
    
    // 自动滚动到底部
    if (this.autoScroll && this.chatContainer) {
      setTimeout(() => {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      }, 100);
    }
  }
  
  renderMessage(message) {
    if (!this.chatContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = \`chat-message \${message.sender}\`;
    messageDiv.style.marginBottom = '15px';
    
    const senderClass = message.sender === 'user' ? 
      'background: #4CAF50; color: white; align-self: flex-end;' : 
      'background: #f1f1f1; color: #333; align-self: flex-start;';
    
    const textAlign = message.sender === 'user' ? 'right' : 'left';
    messageDiv.innerHTML = '<div style="display: flex; flex-direction: column; max-width: 70%;">' +
                          '<div style="' + senderClass + ' padding: 10px 15px; border-radius: 12px; margin-bottom: 5px; word-wrap: break-word;">' +
                          message.content +
                          '</div>' +
                          '<div style="font-size: 11px; color: #999; text-align: ' + textAlign + ';">' +
                          message.timestamp +
                          '</div>' +
                          '</div>';
    
    this.chatContainer.appendChild(messageDiv);
  }
  
  generateReply(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const replies = {
      '你好': '您好！我是JEV客服助手，请问有什么可以帮助您的？',
      '帮助': '我可以为您提供系统使用指南、图片识别、任务管理等服务。请告诉我您需要哪方面的帮助。',
      '图片': '您可以在左侧上传区域上传图片进行识别。支持JPG、PNG、GIF等常见格式。',
      '任务': '您可以在任务监控面板查看当前待处理的任务。点击任务可查看详情。',
      '状态': '系统当前运行正常，所有服务均已就绪。',
      '谢谢': '不客气！如果还有其他问题，随时可以向我咨询。',
      '再见': '再见！祝您工作愉快！'
    };
    
    // 查找匹配的关键词回复
    for (const [keyword, reply] of Object.entries(replies)) {
      if (lowerMessage.includes(keyword)) {
        return reply;
      }
    }
    
    // 默认回复
    const defaultReplies = [
      '请详细描述您的问题，我会尽力为您解答。',
      '感谢您的咨询，请问您具体需要什么帮助？',
      '我不太理解您的意思，请换一种方式表达。',
      '您可以使用系统的图片识别功能来分析产品。'
    ];
    
    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }
  
  clearChat() {
    if (this.chatContainer) {
      this.chatContainer.innerHTML = '';
    }
    this.chatLog = [];
    
    const messageDiv = document.createElement('div');
    messageDiv.style.textAlign = 'center';
    messageDiv.style.color = '#999';
    messageDiv.style.padding = '20px';
    messageDiv.textContent = '聊天记录已清空';
    
    if (this.chatContainer) {
      this.chatContainer.appendChild(messageDiv);
    }
  }
  
  loadChatHistory() {
    // 模拟加载历史记录
    const historyMessages = [
      {
        sender: 'system',
        content: '欢迎使用JEV客服系统！我是您的助手，可以帮助您处理客户请求。',
        timestamp: '09:00:00'
      }
    ];
    
    historyMessages.forEach(msg => {
      this.chatLog.push(msg);
      this.renderMessage(msg);
    });
  }
  
  startMessageSimulation() {
    // 每30-60秒模拟收到一条系统消息
    const simulateMessage = () => {
      const messages = [
        '系统提示：新的任务已分配，请及时处理。',
        '通知：数据库同步已完成。',
        '系统更新：v6.0.1版本补丁已发布。',
        '提醒：请记得定期保存工作内容。',
        '状态更新：图片识别服务运行正常。'
      ];
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      this.addMessage('system', randomMessage);
      
      // 设置下一次消息的时间（30-60秒）
      const nextDelay = 30000 + Math.random() * 30000;
      setTimeout(simulateMessage, nextDelay);
    };
    
    // 10秒后开始模拟
    setTimeout(simulateMessage, 10000);
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ChatLogModule();
  });
} else {
  new ChatLogModule();
}`
  },
  
  // 状态同步模块
  '/modules/status_sync.js': {
    type: 'application/javascript',
    content: `class StatusSyncModule {
  constructor() {
    this.statusElements = {
      workerStatus: document.getElementById('worker-status'),
      traeStatus: document.getElementById('trae-status'),
      customerCount: document.getElementById('customer-count'),
      recognitionModel: document.getElementById('recognition-model'),
      pendingTasks: document.getElementById('pending-tasks'),
      latestLog: document.getElementById('latest-log')
    };
    
    this.connectionStatus = {
      worker: 'disconnected',
      trae: 'disconnected'
    };
    
    this.statusHistory = [];
    this.isMonitoring = false;
    this.monitorInterval = null;
    
    this.initialize();
  }
  
  initialize() {
    // 设置初始状态
    this.updateStatusDisplay();
    
    // 开始状态监控
    this.startMonitoring();
    
    // 设置定期同步
    setInterval(() => this.syncStatus(), 5000); // 每5秒同步一次
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 模拟实时状态变化
    this.monitorInterval = setInterval(() => {
      this.simulateStatusChanges();
      this.updateStatusDisplay();
    }, 2000);
    
    console.log('状态监控已启动');
  }
  
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    console.log('状态监控已停止');
  }
  
  async syncStatus() {
    try {
      // 模拟API调用
      const response = await fetch('/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.processSyncData(data.data);
        }
      }
    } catch (error) {
      console.error('状态同步失败:', error);
      this.connectionStatus.worker = 'error';
    }
  }
  
  processSyncData(data) {
    if (data) {
      this.connectionStatus.worker = data.connected ? 'connected' : 'disconnected';
      this.connectionStatus.trae = data.connected ? 'connected' : 'disconnected';
      
      // 更新状态历史
      this.addToStatusHistory({
        timestamp: new Date().toISOString(),
        worker: this.connectionStatus.worker,
        trae: this.connectionStatus.trae,
        uptime: '12:34:56'
      });
      
      this.updateStatusDisplay();
    }
  }
  
  simulateStatusChanges() {
    // 模拟状态变化
    const random = Math.random();
    
    // 95%的概率保持连接状态
    if (random > 0.05) return;
    
    // 随机改变某个状态
    if (random > 0.025) {
      this.connectionStatus.worker = this.connectionStatus.worker === 'connected' ? 'disconnected' : 'connected';
    } else {
      this.connectionStatus.trae = this.connectionStatus.trae === 'connected' ? 'disconnected' : 'connected';
    }
  }
  
  updateStatusDisplay() {
    // 更新Worker状态
    if (this.statusElements.workerStatus) {
      let statusText, statusColor;
      switch (this.connectionStatus.worker) {
        case 'connected':
          const latency = Math.floor(Math.random() * 100) + 20;
          statusText = \`Connected (\${latency}ms)\`;
          statusColor = '#4CAF50';
          break;
        case 'disconnected':
          statusText = 'Disconnected';
          statusColor = '#F44336';
          break;
        case 'error':
          statusText = 'Error';
          statusColor = '#FF9800';
          break;
      }
      
      this.statusElements.workerStatus.textContent = statusText;
      this.statusElements.workerStatus.style.color = statusColor;
    }
    
    // 更新TRAE状态
    if (this.statusElements.traeStatus) {
      let statusText, statusColor;
      switch (this.connectionStatus.trae) {
        case 'connected':
          statusText = 'Sync OK';
          statusColor = '#4CAF50';
          break;
        case 'disconnected':
          statusText = 'Sync Failed';
          statusColor = '#F44336';
          break;
      }
      
      this.statusElements.traeStatus.textContent = statusText;
      this.statusElements.traeStatus.style.color = statusColor;
    }
    
    // 模拟客户数量变化
    if (this.statusElements.customerCount) {
      const currentCount = parseInt(this.statusElements.customerCount.textContent) || Math.floor(Math.random() * 20) + 5;
      // 20%的概率更新客户数量
      if (Math.random() < 0.2) {
        const newCount = Math.max(0, currentCount + (Math.random() > 0.5 ? 1 : -1));
        this.statusElements.customerCount.textContent = newCount;
      }
    }
    
    // 更新最新日志
    if (this.statusElements.latestLog) {
      const logs = [
        '系统正常运行中',
        '图片识别服务就绪',
        'TRAE同步完成',
        '数据库连接正常',
        '新用户登录: agent_456',
        '任务 TK-2024-005 已完成',
        '图片识别请求已处理',
        '系统资源使用正常'
      ];
      
      // 10%的概率更新日志
      if (Math.random() < 0.1) {
        this.statusElements.latestLog.textContent = logs[Math.floor(Math.random() * logs.length)];
      }
    }
  }
  
  addToStatusHistory(status) {
    this.statusHistory.push(status);
    
    // 限制历史记录长度
    if (this.statusHistory.length > 100) {
      this.statusHistory.shift();
    }
  }
  
  getStatusSummary() {
    const recentStatus = this.statusHistory.slice(-10);
    
    const summary = {
      totalSamples: recentStatus.length,
      workerUp: recentStatus.filter(s => s.worker === 'connected').length,
      traeUp: recentStatus.filter(s => s.trae === 'connected').length,
      workerUptimePercentage: recentStatus.length > 0 ? 
        Math.round((recentStatus.filter(s => s.worker === 'connected').length / recentStatus.length) * 100) : 0,
      traeUptimePercentage: recentStatus.length > 0 ? 
        Math.round((recentStatus.filter(s => s.trae === 'connected').length / recentStatus.length) * 100) : 0
    };
    
    return summary;
  }
  
  triggerManualSync() {
    this.syncStatus().then(() => {
      console.log('手动同步完成');
    }).catch(error => {
      console.error('手动同步失败:', error);
    });
  }
}

// 页面加载完成后初始化
let statusModule;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    statusModule = new StatusSyncModule();
    // 暴露到全局，便于其他模块调用
    window.jevStatusModule = statusModule;
  });
} else {
  statusModule = new StatusSyncModule();
  window.jevStatusModule = statusModule;
}

// 提供刷新状态的全局方法
window.refreshJEVStatus = function() {
  if (statusModule) {
    statusModule.triggerManualSync();
    return true;
  }
  return false;
};`
  }
}

// 模拟客服数据（当状态层数据不可用时）
const MOCK_AGENTS = [
  { id: 'A001', region: 'IN', status: 'online', ping: 210 },
  { id: 'A002', region: 'BD', status: 'online', ping: 260 },
  { id: 'A003', region: 'PK', status: 'offline', ping: null },
  { id: 'A004', region: 'BD', status: 'online', ping: 230 },
  { id: 'A005', region: 'IN', status: 'online', ping: 180 }
];

// 安全验证函数
function validateSecurityHeaders(headers) {
  const token = headers.get('X-Agent-Token');
  const layer = headers.get('X-System-Layer');
  
  return {
    isValid: token === SECURITY_CONFIG.VALID_TOKEN && 
              layer === SECURITY_CONFIG.VALID_LAYER,
    token: token,
    layer: layer
  };
}

// 生成随机延迟（150-350ms）
function generateRandomPing() {
  return Math.floor(Math.random() * 200) + 150;
}

// 模拟从状态层获取数据
async function getAgentsFromStateLayer() {
  try {
    // 模拟从 Durable Object 或 KV 获取数据
    // 在实际部署时，这里应该调用真实的 KV 或 DO API
    
    // 模拟状态层延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    // 生成带随机延迟的在线客服数据
    return MOCK_AGENTS.map(agent => ({
      ...agent,
      ping: agent.status === 'online' ? generateRandomPing() : null
    }));
  } catch (error) {
    console.error('获取状态层数据失败:', error);
    return null;
  }
}

// 计算平均延迟
function calculateAverageLatency(agents) {
  const onlineAgents = agents.filter(agent => agent.status === 'online' && agent.ping !== null);
  if (onlineAgents.length === 0) return 0;
  
  const totalPing = onlineAgents.reduce((sum, agent) => sum + agent.ping, 0);
  return Math.round(totalPing / onlineAgents.length);
}

// 统计在线人数
function countOnlineAgents(agents) {
  return agents.filter(agent => agent.status === 'online').length;
}

// 脱敏处理（隐藏 Token）
function sanitizeHeaders(headers) {
  const sanitized = {};
  headers.forEach((value, key) => {
    sanitized[key] = key === 'X-Agent-Token' ? '***' : value;
  });
  return sanitized;
}

// 保存日志
async function saveLog(request, responseData, validationResult) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = `/jev_logs/remote_support/agent_online_${timestamp}.json`;
    
    const logData = {
      timestamp: Date.now(),
      request: {
        method: request.method,
        url: request.url,
        headers: sanitizeHeaders(request.headers)
      },
      response: responseData,
      validation: {
        token_valid: validationResult.isValid,
        provided_token: validationResult.token ? '***' : null,
        provided_layer: validationResult.layer
      },
      performance: {
        request_processing_time: Date.now() - START_TIME
      }
    };
    
    // 在本地环境，我们只能打印日志
    // 在实际部署时，这里应该写入到 KV 或其他存储
    console.log(`[LOG] ${logPath}`, JSON.stringify(logData, null, 2));
    
    // 尝试写入到本地文件系统（仅开发环境）
    try {
      // 注意：在实际 Cloudflare Worker 中，这部分代码不可用
      // 这里仅用于开发测试
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        const fs = require('fs');
        const path = require('path');
        const logDir = path.join(__dirname, 'jev_logs', 'remote_support');
        
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const localLogPath = path.join(__dirname, logPath);
        fs.writeFileSync(localLogPath, JSON.stringify(logData, null, 2));
        console.log(`日志已保存到: ${localLogPath}`);
      }
    } catch (fsError) {
      console.error('写入本地日志失败:', fsError);
    }
    
  } catch (error) {
    console.error('保存日志失败:', error);
  }
}

// 创建标准响应
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'X-JEV-Version': VERSION
    }
  });
}

// 处理 /ping 接口
function handlePing(request) {
  return createResponse({
    success: true,
    timestamp: Date.now(),
    status: 'online',
    version: VERSION
  });
}

// 处理 /status 接口
function handleStatus(request) {
  const uptime = Date.now() - START_TIME;
  
  return createResponse({
    success: true,
    version: VERSION,
    uptime_ms: uptime,
    uptime_human: `${(uptime / 1000 / 60).toFixed(2)} 分钟`,
    status: 'online',
    timestamp: Date.now()
  });
}

// 处理 /remote_agents 接口
async function handleRemoteAgents(request) {
  // 验证安全头
  const validationResult = validateSecurityHeaders(request.headers);
  
  if (!validationResult.isValid) {
    // 验证失败，延迟响应 300ms
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const response = {
      success: false,
      error: 'Unauthorized',
      timestamp: Date.now()
    };
    
    // 保存日志
    await saveLog(request, response, validationResult);
    
    return createResponse(response, 401);
  }
  
  // 从状态层获取客服数据
  let agents = await getAgentsFromStateLayer();
  
  // 如果状态层数据不可用，使用模拟数据
  if (!agents || agents.length === 0) {
    agents = MOCK_AGENTS.map(agent => ({
      ...agent,
      ping: agent.status === 'online' ? generateRandomPing() : null
    }));
  }
  
  // 计算统计数据
  const avgLatency = calculateAverageLatency(agents);
  const onlineCount = countOnlineAgents(agents);
  const totalCount = agents.length;
  
  // 构建响应
  const responseData = {
    success: true,
    timestamp: Date.now(),
    agents,
    avg_latency: avgLatency,
    online_count: onlineCount,
    total_count: totalCount
  };
  
  // 保存日志
  await saveLog(request, responseData, validationResult);
  
  return createResponse(responseData);
}

// CORS 处理
function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Agent-Token, X-System-Layer, Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  return null;
}

// 主请求处理器
async function handleRequest(request) {
  try {
    // 处理 CORS
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;
    
    // 解析请求 URL
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 检查是否是静态文件请求
    if (STATIC_FILES[path]) {
      const file = STATIC_FILES[path];
      return new Response(file.content, {
        headers: {
          'Content-Type': file.type,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
          'X-JEV-Version': VERSION
        }
      });
    }
    
    // 路由请求
    switch (path) {
      case '/ping':
        return handlePing(request);
      case '/status':
        return handleStatus(request);
      case '/remote_agents':
        return await handleRemoteAgents(request);
      default:
        return createResponse({
          success: false,
          error: 'Not Found',
          available_endpoints: ['/ping', '/status', '/remote_agents', '/ui/client_portal.html', '/modules/agent_dashboard.js', '/modules/image_capture.js', '/modules/chat_log.js', '/modules/status_sync.js']
        }, 404);
    }
  } catch (error) {
    console.error('处理请求失败:', error);
    return createResponse({
      success: false,
      error: 'Internal Server Error'
    }, 500);
  }
}

// 导出 Worker 入口
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 开发环境导出（仅用于测试）
if (typeof module !== 'undefined') {
  module.exports = {
    handleRequest,
    validateSecurityHeaders,
    calculateAverageLatency,
    countOnlineAgents
  };
}