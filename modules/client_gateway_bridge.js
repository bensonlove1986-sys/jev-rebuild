/**
 * JEV L7.8 Client Gateway Bridge
 * 负责连接 Cloudflare Worker ↔ MultiChannel Gateway
 * 提供客户端认证、消息转发和WebSocket支持
 */

const http = require('http');
const https = require('https');
const url = require('url');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// 配置常量
const CONFIG = {
  PORT: process.env.CLIENT_BRIDGE_PORT || 1822,
  WORKER_URL: process.env.WORKER_URL || 'https://jevshop.bensonlove1986.workers.dev',
  LOCAL_GATEWAY_PORT: process.env.LOCAL_GATEWAY_PORT || 8080,
  JEV_TOKEN_KEY: 'JEV_TOKEN',
  SOCKET_PATH: '/client/socket',
  LOG_PATH: path.join(__dirname, '..', 'logs', 'client_bridge.log')
};

// 确保日志目录存在
const ensureLogDirectory = () => {
  const logDir = path.dirname(CONFIG.LOG_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

// 日志函数
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(`[ClientBridge] ${message}`);
  
  try {
    ensureLogDirectory();
    fs.appendFileSync(CONFIG.LOG_PATH, logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
};

// 客户端会话管理
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.activeSockets = new Map();
    log('Session Manager initialized');
  }

  createSession(userId, token) {
    const session = {
      userId,
      token,
      createdAt: Date.now(),
      lastActive: Date.now(),
      channels: []
    };
    this.sessions.set(token, session);
    log(`Created session for user ${userId}`);
    return session;
  }

  getSession(token) {
    return this.sessions.get(token);
  }

  updateSessionActivity(token) {
    const session = this.getSession(token);
    if (session) {
      session.lastActive = Date.now();
    }
  }

  addSocket(token, socket) {
    this.activeSockets.set(socket, token);
    log(`Socket connected for token ${token.substring(0, 8)}...`);
  }

  removeSocket(socket) {
    const token = this.activeSockets.get(socket);
    if (token) {
      this.activeSockets.delete(socket);
      log(`Socket disconnected for token ${token.substring(0, 8)}...`);
    }
  }

  broadcastToUser(token, message) {
    for (const [socket, userToken] of this.activeSockets.entries()) {
      if (userToken === token && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify(message));
        } catch (err) {
          log(`Failed to send message to socket: ${err.message}`, 'ERROR');
        }
      }
    }
  }
}

// 创建会话管理器实例
const sessionManager = new SessionManager();

// 验证JEV_TOKEN
const validateToken = async (token) => {
  try {
    // 尝试从本地验证
    const session = sessionManager.getSession(token);
    if (session) {
      return { valid: true, userId: session.userId };
    }

    // 尝试从Worker验证
    const response = await fetch(`${CONFIG.WORKER_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.valid) {
        // 创建本地会话
        sessionManager.createSession(data.userId, token);
        return { valid: true, userId: data.userId };
      }
    }

    return { valid: false, error: 'Invalid token' };
  } catch (err) {
    log(`Token validation error: ${err.message}`, 'ERROR');
    return { valid: false, error: err.message };
  }
};

// 转发请求到本地Gateway
const forwardToLocalGateway = async (req, res) => {
  const path = req.url;
  const method = req.method;
  const headers = { ...req.headers };
  
  // 移除主机头，由http.request自动设置
  delete headers.host;
  delete headers.origin;

  log(`Forwarding ${method} ${path} to localhost:${CONFIG.LOCAL_GATEWAY_PORT}`);

  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: CONFIG.LOCAL_GATEWAY_PORT,
      path: path,
      method: method,
      headers: headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // 复制响应头
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      
      // 复制响应体
      proxyRes.on('data', (chunk) => {
        res.write(chunk);
      });
      
      proxyRes.on('end', () => {
        res.end();
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      log(`Error forwarding to local gateway: ${err.message}`, 'ERROR');
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Bad Gateway',
        message: 'Unable to connect to local gateway'
      }));
      resolve();
    });

    // 复制请求体
    req.on('data', (chunk) => {
      proxyReq.write(chunk);
    });

    req.on('end', () => {
      proxyReq.end();
    });
  });
};

// 处理登录请求
const handleLogin = async (req, res) => {
  try {
    // 读取请求体
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const loginData = JSON.parse(body);
    
    // 转发到Worker登录
    const response = await fetch(`${CONFIG.WORKER_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();
    
    // 如果登录成功，创建本地会话
    if (data.success && data.token) {
      sessionManager.createSession(data.userId || loginData.email, data.token);
      log(`User ${loginData.email} logged in successfully`);
    }

    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err) {
    log(`Login error: ${err.message}`, 'ERROR');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    }));
  }
};

// 处理注册请求
const handleRegister = async (req, res) => {
  try {
    // 读取请求体
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const registerData = JSON.parse(body);
    
    // 转发到Worker注册
    const response = await fetch(`${CONFIG.WORKER_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });

    const data = await response.json();
    
    // 记录注册日志
    if (data.success) {
      log(`New user registered: ${registerData.email}`);
    }

    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err) {
    log(`Registration error: ${err.message}`, 'ERROR');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    }));
  }
};

// 处理邀请码生成
const handleGenerateInvite = async (req, res) => {
  try {
    // 验证请求中的token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }));
      return;
    }

    const token = authHeader.split(' ')[1];
    const validation = await validateToken(token);
    
    if (!validation.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invalid token'
      }));
      return;
    }

    // 生成邀请码
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const inviteCode = `JEV-${new Date().getFullYear()}-${random}`;
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    const inviteData = {
      invite_code: inviteCode,
      expires: expires.toISOString().split('T')[0],
      status: 'active',
      created_by: validation.userId,
      created_at: new Date().toISOString()
    };

    // 保存邀请码（简化版本，实际应该保存到数据库）
    const inviteFilePath = path.join(__dirname, '..', 'data', 'invite_codes.json');
    let inviteCodes = [];
    
    try {
      if (fs.existsSync(inviteFilePath)) {
        const data = fs.readFileSync(inviteFilePath, 'utf8');
        inviteCodes = JSON.parse(data);
      }
      
      inviteCodes.push(inviteData);
      fs.writeFileSync(inviteFilePath, JSON.stringify(inviteCodes, null, 2));
    } catch (err) {
      log(`Failed to save invite code: ${err.message}`, 'ERROR');
    }

    log(`Generated invite code: ${inviteCode} by ${validation.userId}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: inviteData
    }));
  } catch (err) {
    log(`Generate invite error: ${err.message}`, 'ERROR');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    }));
  }
};

// 处理邀请码验证
const handleValidateInvite = async (req, res) => {
  try {
    // 读取请求体
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    const { invite_code } = JSON.parse(body);
    
    // 读取邀请码文件
    const inviteFilePath = path.join(__dirname, '..', 'data', 'invite_codes.json');
    let inviteCodes = [];
    
    try {
      if (fs.existsSync(inviteFilePath)) {
        const data = fs.readFileSync(inviteFilePath, 'utf8');
        inviteCodes = JSON.parse(data);
      }
    } catch (err) {
      log(`Failed to read invite codes: ${err.message}`, 'ERROR');
    }

    const invite = inviteCodes.find(code => 
      code.invite_code === invite_code && code.status === 'active'
    );

    if (!invite) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invite code not found or expired'
      }));
      return;
    }

    // 检查是否过期
    const now = new Date();
    const expiryDate = new Date(invite.expires);
    
    if (now > expiryDate) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invite code has expired'
      }));
      return;
    }

    log(`Validated invite code: ${invite_code}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: invite
    }));
  } catch (err) {
    log(`Validate invite error: ${err.message}`, 'ERROR');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    }));
  }
};

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  log(`${req.method} ${pathname}`);

  // 处理客户端认证相关路由
  if (pathname === '/client/login' && req.method === 'POST') {
    return handleLogin(req, res);
  }

  if (pathname === '/client/register' && req.method === 'POST') {
    return handleRegister(req, res);
  }

  // 处理邀请码相关路由
  if (pathname === '/client/invite/generate' && req.method === 'POST') {
    return handleGenerateInvite(req, res);
  }

  if (pathname === '/client/invite/validate' && req.method === 'POST') {
    return handleValidateInvite(req, res);
  }

  // 对于其他客户端路由，需要验证token
  if (pathname.startsWith('/client/')) {
    // 从请求头或查询参数获取token
    let token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      token = parsedUrl.query.token;
    }
    
    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Token required'
      }));
      return;
    }

    const validation = await validateToken(token);
    
    if (!validation.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: validation.error
      }));
      return;
    }

    // 更新会话活动状态
    sessionManager.updateSessionActivity(token);
  }

  // 转发到本地Gateway
  await forwardToLocalGateway(req, res);
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server, path: CONFIG.SOCKET_PATH });

wss.on('connection', (ws, req) => {
  // 从URL获取token
  const parsedUrl = url.parse(req.url, true);
  const token = parsedUrl.query.token;

  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }

  // 验证token
  validateToken(token).then(validation => {
    if (!validation.valid) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // 添加到活动socket列表
    sessionManager.addSocket(token, ws);

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Client Gateway Bridge',
      userId: validation.userId,
      timestamp: new Date().toISOString()
    }));

    // 监听消息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        log(`Received message from ${validation.userId}: ${data.type}`);

        // 处理不同类型的消息
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
          
          case 'send_message':
            // 转发消息到本地Gateway
            forwardMessageToGateway(token, data);
            break;
          
          default:
            log(`Unknown message type: ${data.type}`);
        }
      } catch (err) {
        log(`Error processing message: ${err.message}`, 'ERROR');
      }
    });

    // 监听关闭事件
    ws.on('close', () => {
      sessionManager.removeSocket(ws);
    });

    // 监听错误事件
    ws.on('error', (err) => {
      log(`WebSocket error: ${err.message}`, 'ERROR');
      sessionManager.removeSocket(ws);
    });

  }).catch(err => {
    log(`WebSocket authentication error: ${err.message}`, 'ERROR');
    ws.close(1011, 'Authentication error');
  });
});

// 转发消息到本地Gateway
const forwardMessageToGateway = async (token, message) => {
  try {
    const session = sessionManager.getSession(token);
    if (!session) {
      log('Session not found for message forwarding');
      return;
    }

    const response = await fetch(`http://localhost:${CONFIG.LOCAL_GATEWAY_PORT}/gateway/process_message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(message)
    });

    const data = await response.json();
    
    // 将响应发送回客户端
    sessionManager.broadcastToUser(token, {
      type: 'message_response',
      data: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    log(`Error forwarding message to gateway: ${err.message}`, 'ERROR');
    
    // 发送错误响应
    sessionManager.broadcastToUser(token, {
      type: 'error',
      error: 'Failed to process message',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

// 启动服务器
server.listen(CONFIG.PORT, () => {
  log(`Client Gateway Bridge started on port ${CONFIG.PORT}`);
  log(`WebSocket endpoint: ws://localhost:${CONFIG.PORT}${CONFIG.SOCKET_PATH}`);
  log(`Forwarding to local gateway: http://localhost:${CONFIG.LOCAL_GATEWAY_PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  server.close(() => {
    log('Server stopped');
    process.exit(0);
  });
});

// 导出模块（用于测试）
module.exports = {
  server,
  sessionManager,
  validateToken
};