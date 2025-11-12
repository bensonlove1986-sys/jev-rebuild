// JEV L7.8 Client Core - 核心通信模块
// 负责连接Client Gateway Bridge和WebSocket，处理多通道消息推送与接收

class JEVClientCore {
  constructor() {
    // 配置信息
    this.config = {
      // 简化gatewayUrl配置，直接使用相对路径
      gatewayUrl: '/client',
      apiBaseUrl: 'https://jevshop.bensonlove1986.workers.dev',
      socketPath: '/client/socket',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000
    };
    
    // 状态管理
    this.state = {
      token: localStorage.getItem('JEV_TOKEN') || null,
      user: this.parseUserInfo(),
      connected: false,
      reconnectAttempts: 0,
      activeConversations: [],
      currentConversationId: null,
      messageQueue: [],
      channels: {
        daojie: { active: false, name: 'DAOJIE' },
        facebook: { active: false, name: 'Facebook' },
        whatsapp: { active: false, name: 'WhatsApp' }
      }
    };
    
    // WebSocket实例
    this.socket = null;
    
    // 定时器引用
    this.pingTimer = null;
    this.reconnectTimer = null;
    
    // 事件监听器存储
    this.eventListeners = {
      'message': [],
      'notification': [],
      'statusChange': [],
      'error': [],
      'connectionChange': [],
      'conversationUpdate': []
    };
    
    // 初始化
    this.init();
  }

  // 初始化方法
  init() {
    // 如果有token，尝试连接
    if (this.state.token) {
      this.connect();
    }
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.token && !this.state.connected) {
        this.connect();
      }
    });
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
      if (this.state.token && !this.state.connected) {
        this.connect();
      }
    });
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  // 解析用户信息
  parseUserInfo() {
    try {
      const userInfo = localStorage.getItem('JEV_USER');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('Error parsing user info:', error);
      return null;
    }
  }

  // 连接到服务器
  connect() {
    // 如果没有token，不进行连接
    if (!this.state.token) {
      console.error('Cannot connect without token');
      return;
    }

    // 如果已经连接，断开现有连接
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close();
    }

    try {
      // 构建WebSocket URL - 使用环境变量中的API基础URL
      const wsProtocol = this.config.apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:';
      const apiDomain = this.config.apiBaseUrl.replace('http:', '').replace('https:', '').replace('//', '');
      const wsUrl = `${wsProtocol}//${apiDomain}${this.config.socketPath}?token=${this.state.token}`;
      
      console.log('WebSocket Connection URL:', wsUrl);

      // 创建WebSocket连接
      this.socket = new WebSocket(wsUrl);

      // 设置事件处理
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.emit('error', { type: 'socket_init_error', message: 'Failed to initialize WebSocket: ' + error.message });
    }
  }

  // 断开连接
  disconnect() {
    // 清除定时器
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 关闭WebSocket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // 更新状态
    this.setState({ connected: false });
    this.emit('connectionChange', false);
  }

  // 处理WebSocket连接打开
  handleSocketOpen() {
    console.log('WebSocket connected');
    
    // 更新状态
    this.setState({ 
      connected: true, 
      reconnectAttempts: 0 
    });
    
    // 开始心跳
    this.startPing();
    
    // 发送队列中的消息
    this.flushMessageQueue();
    
    // 获取活跃会话
    this.fetchActiveConversations();
    
    // 获取渠道状态
    this.fetchChannelStatus();
    
    // 触发连接事件
    this.emit('connectionChange', true);
  }

  // 处理WebSocket消息
  handleSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // 根据消息类型处理
      switch (data.type) {
        case 'message':
          this.handleIncomingMessage(data.payload);
          break;
        
        case 'notification':
          this.handleNotification(data.payload);
          break;
        
        case 'status_change':
          this.handleStatusChange(data.payload);
          break;
        
        case 'pong':
          // 心跳响应
          break;
        
        case 'error':
          this.handleError(data.payload);
          break;
        
        case 'conversation_update':
          this.handleConversationUpdate(data.payload);
          break;
        
        case 'channel_status':
          this.updateChannelStatus(data.payload);
          break;
        
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.emit('error', { type: 'parse_error', message: 'Failed to parse message' });
    }
  }

  // 处理WebSocket连接关闭
  handleSocketClose(event) {
    console.log('WebSocket disconnected', event);
    
    // 清除心跳
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    // 更新状态
    this.setState({ connected: false });
    this.emit('connectionChange', false);
    
    // 尝试重连
    this.attemptReconnect();
  }

  // 处理WebSocket错误
  handleSocketError(error) {
    console.error('WebSocket error:', error);
    this.emit('error', { type: 'socket_error', message: error.message });
  }

  // 处理接收到的消息
  handleIncomingMessage(message) {
    console.log('Received message:', message);
    
    // 更新会话列表
    this.updateConversationWithMessage(message);
    
    // 触发消息事件
    this.emit('message', message);
  }

  // 处理通知
  handleNotification(notification) {
    console.log('Received notification:', notification);
    
    // 触发通知事件
    this.emit('notification', notification);
  }

  // 处理状态变化
  handleStatusChange(status) {
    console.log('Status changed:', status);
    
    // 更新状态
    this.setState(status);
    
    // 触发状态变化事件
    this.emit('statusChange', status);
  }

  // 处理错误
  handleError(error) {
    console.error('Error from server:', error);
    
    // 特殊错误处理
    if (error.code === 'TOKEN_EXPIRED' || error.code === 'UNAUTHORIZED') {
      // 清除token
      this.logout();
      return;
    }
    
    // 触发错误事件
    this.emit('error', error);
  }

  // 处理会话更新
  handleConversationUpdate(update) {
    console.log('Conversation updated:', update);
    
    // 更新会话列表
    this.updateConversations(update);
    
    // 触发会话更新事件
    this.emit('conversationUpdate', update);
  }

  // 开始心跳
  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.pingInterval);
  }

  // 尝试重连
  attemptReconnect() {
    // 检查重连次数
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('error', { type: 'reconnect_failed', message: 'Failed to reconnect' });
      return;
    }
    
    // 延迟重连
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.state.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
      this.setState({ reconnectAttempts: this.state.reconnectAttempts + 1 });
      this.connect();
    }, this.config.reconnectInterval);
  }

  // 发送消息
  sendMessage(conversationId, content, options = {}) {
    const message = {
      type: 'send_message',
      payload: {
        conversation_id: conversationId,
        content,
        ...options,
        timestamp: new Date().toISOString()
      }
    };
    
    // 如果已连接，直接发送
    if (this.state.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return Promise.resolve({ success: true });
    } else {
      // 否则加入队列
      this.state.messageQueue.push(message);
      return Promise.resolve({ success: true, queued: true });
    }
  }

  // 发送队列中的消息
  flushMessageQueue() {
    if (!this.state.connected) return;
    
    while (this.state.messageQueue.length > 0) {
      const message = this.state.messageQueue.shift();
      this.socket.send(JSON.stringify(message));
    }
  }

  // 设置状态
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  // 登录
  async login(email, password) {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/login`;
      console.log('Login API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        // 保存token和用户信息
        this.state.token = data.token;
        this.state.user = data.user || { email };
        localStorage.setItem('JEV_TOKEN', data.token);
        localStorage.setItem('JEV_USER', JSON.stringify(this.state.user));
        
        // 连接WebSocket
        this.connect();
        
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error: ' + error.message, error };
    }
  }

  // 注册
  async register(userData) {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/register`;
      console.log('Register API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Network error: ' + error.message, error };
    }
  }

  // 登出
  logout() {
    // 清除本地存储
    localStorage.removeItem('JEV_TOKEN');
    localStorage.removeItem('JEV_USER');
    
    // 重置状态
    this.setState({
      token: null,
      user: null,
      activeConversations: [],
      currentConversationId: null,
      messageQueue: []
    });
    
    // 断开连接
    this.disconnect();
    
    // 跳转到登录页
    window.location.href = '/ui/client_portal.html';
  }

  // 获取活跃会话
  async fetchActiveConversations() {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/conversations`;
      console.log('Fetch Conversations API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.state.token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.setState({ activeConversations: data.conversations });
        this.emit('conversationUpdate', data.conversations);
        return data.conversations;
      } else {
        throw new Error(data.message || 'Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      this.emit('error', { type: 'fetch_error', message: 'Failed to fetch conversations' });
      return [];
    }
  }

  // 获取会话详情
  async getConversationDetail(conversationId) {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/conversations/${conversationId}`;
      console.log('Get Conversation Detail API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.state.token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.conversation;
      } else {
        throw new Error(data.message || 'Failed to fetch conversation');
      }
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
      this.emit('error', { type: 'fetch_error', message: 'Failed to fetch conversation detail' });
      return null;
    }
  }

  // 获取渠道状态
  async fetchChannelStatus() {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/channels/status`;
      console.log('Fetch Channel Status API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.state.token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.updateChannelStatus(data.channels);
        return data.channels;
      } else {
        throw new Error(data.message || 'Failed to fetch channel status');
      }
    } catch (error) {
      console.error('Error fetching channel status:', error);
      return null;
    }
  }

  // 更新渠道状态
  updateChannelStatus(channelStatus) {
    Object.keys(channelStatus).forEach(channel => {
      if (this.state.channels[channel]) {
        this.state.channels[channel].active = channelStatus[channel].active;
      }
    });
    
    this.emit('statusChange', { channels: this.state.channels });
  }

  // 更新会话列表
  updateConversations(conversations) {
    if (Array.isArray(conversations)) {
      this.setState({ activeConversations: conversations });
    }
  }

  // 使用新消息更新会话
  updateConversationWithMessage(message) {
    const { conversation_id } = message;
    
    // 查找会话
    const conversationIndex = this.state.activeConversations.findIndex(
      conv => conv.id === conversation_id
    );
    
    if (conversationIndex !== -1) {
      // 更新现有会话
      const conversation = this.state.activeConversations[conversationIndex];
      conversation.lastMessage = message.content;
      conversation.lastMessageTime = message.timestamp;
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      
      // 将更新的会话移到列表顶部
      const [updatedConversation] = this.state.activeConversations.splice(conversationIndex, 1);
      this.state.activeConversations.unshift(updatedConversation);
    } else {
      // 如果是新会话，创建会话对象
      // 注意：实际项目中应该从服务器获取完整会话信息
      const newConversation = {
        id: conversation_id,
        customerName: message.sender_name || '未知用户',
        channel: message.channel || 'unknown',
        channelName: this.getChannelName(message.channel),
        lastMessage: message.content,
        lastMessageTime: message.timestamp,
        unreadCount: 1,
        startTime: message.timestamp
      };
      
      // 添加到会话列表顶部
      this.state.activeConversations.unshift(newConversation);
    }
  }

  // 获取渠道名称
  getChannelName(channelKey) {
    if (this.state.channels[channelKey]) {
      return this.state.channels[channelKey].name;
    }
    return channelKey?.toUpperCase() || '未知';
  }

  // 标记会话已读
  async markConversationAsRead(conversationId) {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/conversations/${conversationId}/read`;
      console.log('Mark Conversation Read API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.state.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        const conversation = this.state.activeConversations.find(
          conv => conv.id === conversationId
        );
        if (conversation) {
          conversation.unreadCount = 0;
        }
        
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return { success: false, message: 'Network error: ' + error.message };
    }
  }

  // 验证邀请码
  async validateInviteCode(inviteCode) {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/invite/validate`;
      console.log('Validate Invite Code API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invite_code: inviteCode })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating invite code:', error);
      return { success: false, message: 'Network error: ' + error.message };
    }
  }

  // 生成邀请码（管理员功能）
  async generateInviteCode(options = {}) {
    try {
      // 构建完整的API URL
      const apiUrl = `${this.config.apiBaseUrl}${this.config.gatewayUrl}/invite/generate`;
      console.log('Generate Invite Code API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating invite code:', error);
      return { success: false, message: 'Network error: ' + error.message };
    }
  }

  // 事件监听器
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
    
    // 返回取消监听函数
    return () => {
      this.off(event, callback);
    };
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // 获取当前状态
  getState() {
    return { ...this.state };
  }

  // 是否已连接
  isConnected() {
    return this.state.connected;
  }

  // 获取当前用户
  getCurrentUser() {
    return this.state.user;
  }

  // 获取活跃会话列表
  getActiveConversations() {
    return [...this.state.activeConversations];
  }

  // 获取渠道状态
  getChannelStatus() {
    return { ...this.state.channels };
  }
}

// 创建全局实例
const jevClient = new JEVClientCore();

// 导出（支持模块化使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jevClient;
} else if (typeof window !== 'undefined') {
  window.jevClient = jevClient;
}

export default jevClient;