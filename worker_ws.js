// JEV WebSocket Worker 服务器
// 功能：实时向前端仪表盘推送系统状态变化

// 全局常量
const AGENT_TIMEOUT = 10 * 60 * 1000; // Agent超时时间（10分钟）
const PUSH_INTERVAL = 5 * 1000; // 推送间隔（5秒）
const MAX_LOG_ITEMS = 100; // 最大日志数量

// 客户端连接管理器
class ConnectionManager {
  constructor() {
    this.connections = new Set();
    this.lastStatus = null;
  }

  // 添加连接
  addConnection(connection) {
    this.connections.add(connection);
    console.log(`[JEV-WS] 新客户端已连接，当前连接数: ${this.connections.size}`);
    
    // 立即发送最新状态
    if (this.lastStatus) {
      this.sendTo(connection, this.lastStatus);
    }
  }

  // 移除连接
  removeConnection(connection) {
    this.connections.delete(connection);
    console.log(`[JEV-WS] 客户端已断开，当前连接数: ${this.connections.size}`);
  }

  // 发送消息给指定连接
  sendTo(connection, message) {
    try {
      const jsonMessage = JSON.stringify(message);
      connection.send(jsonMessage);
    } catch (error) {
      console.error(`[JEV-WS] 发送消息失败: ${error.message}`);
      this.removeConnection(connection);
    }
  }

  // 广播消息给所有连接
  broadcast(message) {
    this.lastStatus = message;
    console.log(`[JEV-WS] 广播给 ${this.connections.size} 个仪表盘客户端`);
    
    const jsonMessage = JSON.stringify(message);
    
    for (const connection of this.connections) {
      try {
        connection.send(jsonMessage);
      } catch (error) {
        console.error(`[JEV-WS] 广播失败: ${error.message}`);
        this.removeConnection(connection);
      }
    }
  }

  // 获取连接数
  getConnectionCount() {
    return this.connections.size;
  }
}

// 创建连接管理器实例
const connectionManager = new ConnectionManager();

// 全局状态管理器
class StateManager {
  constructor() {
    this.agents = new Map(); // 存储Agent状态
    this.logs = []; // 系统日志
    this.lastHeartbeat = new Date();
    this.r2Usage = '0 B';
    this.aiConnected = false;
    this.statusChecks = 0;
    this.successChecks = 0;
  }

  // 更新Agent状态
  updateAgent(agentId, status) {
    this.agents.set(agentId, {
      id: agentId,
      status: status || 'online',
      lastHeartbeat: new Date(),
      hostname: status?.hostname || `Agent_${agentId}`
    });
    
    this.lastHeartbeat = new Date();
    return this.agents.get(agentId);
  }

  // 检查Agent是否在线
  isAgentOnline(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    const timeDiff = new Date() - agent.lastHeartbeat;
    return timeDiff < AGENT_TIMEOUT;
  }

  // 获取在线Agent数量
  getOnlineAgentCount() {
    let count = 0;
    for (const [id, agent] of this.agents.entries()) {
      if (this.isAgentOnline(id)) {
        count++;
      }
    }
    return count;
  }

  // 获取所有Agent列表
  getAllAgents() {
    const agents = [];
    for (const [id, agent] of this.agents.entries()) {
      const isOnline = this.isAgentOnline(id);
      agents.push({
        agent_id: id,
        hostname: agent.hostname,
        status: isOnline ? 'online' : 'offline',
        last_heartbeat: agent.lastHeartbeat.toISOString()
      });
    }
    return agents;
  }

  // 检查并获取离线Agent
  getOfflineAgents() {
    const offlineAgents = [];
    for (const [id, agent] of this.agents.entries()) {
      if (!this.isAgentOnline(id)) {
        offlineAgents.push(agent);
      }
    }
    return offlineAgents;
  }

  // 添加日志
  addLog(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: message,
      level: level
    };
    
    this.logs.push(logEntry);
    
    // 保持日志数量限制
    if (this.logs.length > MAX_LOG_ITEMS) {
      this.logs = this.logs.slice(-MAX_LOG_ITEMS);
    }
    
    return logEntry;
  }

  // 获取最近日志
  getRecentLogs(limit = 10) {
    return this.logs.slice(-limit).map(log => log.message);
  }

  // 更新AI连接状态
  setAiConnected(isConnected) {
    this.aiConnected = isConnected;
    return isConnected;
  }

  // 更新R2使用情况
  setR2Usage(usage) {
    this.r2Usage = usage;
    return usage;
  }

  // 记录状态检查
  recordStatusCheck(isSuccess) {
    this.statusChecks++;
    if (isSuccess) {
      this.successChecks++;
    }
  }

  // 获取成功率
  getSuccessRate() {
    if (this.statusChecks === 0) return 0;
    return Math.round((this.successChecks / this.statusChecks) * 100);
  }

  // 生成状态报告
  generateStatusReport() {
    const onlineCount = this.getOnlineAgentCount();
    const report = {
      type: 'status',
      timestamp: new Date().toISOString(),
      agents_online: onlineCount,
      agents_total: this.agents.size,
      ai_connected: this.aiConnected,
      r2_usage: this.r2Usage,
      last_heartbeat: this.lastHeartbeat.toISOString(),
      logs: this.getRecentLogs(5),
      success_rate: this.getSuccessRate(),
      connections: connectionManager.getConnectionCount(),
      agents: this.getAllAgents()
    };
    
    return report;
  }
}

// 创建状态管理器实例
const stateManager = new StateManager();

// 模拟Agent数据
function initMockData() {
  // 初始化一些模拟Agent数据
  stateManager.updateAgent('01', { hostname: 'Agent_01' });
  stateManager.updateAgent('02', { hostname: 'Agent_02' });
  stateManager.updateAgent('03', { hostname: 'Agent_03' });
  
  // 添加一些初始日志
  stateManager.addLog('JEV WebSocket Worker 已启动', 'info');
  stateManager.addLog('AI服务响应正常', 'success');
  stateManager.addLog('Agent_01 心跳 OK', 'info');
  
  // 设置初始状态
  stateManager.setAiConnected(true);
  stateManager.setR2Usage('12.4 MB');
  stateManager.recordStatusCheck(true);
  
  console.log('[JEV-WS] 模拟数据初始化完成');
}

// 定期推送状态
async function startPushInterval() {
  // 初始化模拟数据
  initMockData();
  
  // 开始定时推送
  setInterval(async () => {
    try {
      const report = stateManager.generateStatusReport();
      console.log(`[JEV-WS] 推送状态 @ ${report.timestamp}`);
      connectionManager.broadcast(report);
      
      // 检查离线Agent并推送警报
      const offlineAgents = stateManager.getOfflineAgents();
      offlineAgents.forEach(agent => {
        const alertMessage = {
          type: 'alert',
          timestamp: new Date().toISOString(),
          message: `🚨 ${agent.hostname} 掉线！`,
          agent_id: agent.id
        };
        connectionManager.broadcast(alertMessage);
      });
      
    } catch (error) {
      console.error(`[JEV-WS] 推送失败: ${error.message}`);
    }
  }, PUSH_INTERVAL);
  
  console.log(`[JEV-WS] 定时推送已启动，间隔: ${PUSH_INTERVAL}ms`);
}

// 处理WebSocket连接
async function handleWebSocket(request) {
  // 升级HTTP连接为WebSocket
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('需要WebSocket升级', { status: 426 });
  }
  
  // 创建WebSocket对
  const [client, server] = Object.values(new WebSocketPair());
  
  // 配置server端WebSocket
  server.accept();
  
  // 添加到连接管理器
  connectionManager.addConnection(server);
  
  // 发送欢迎消息
  connectionManager.sendTo(server, {
    type: 'welcome',
    message: '已连接到JEV WebSocket服务器',
    timestamp: new Date().toISOString()
  });
  
  // 处理消息接收
  server.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`[JEV-WS] 收到消息:`, data);
      
      // 处理不同类型的消息
      if (data.type === 'ping') {
        connectionManager.sendTo(server, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
      } else if (data.type === 'refresh') {
        const report = stateManager.generateStatusReport();
        connectionManager.sendTo(server, report);
      } else if (data.type === 'register') {
        // 注册客户端信息
        console.log(`[JEV-WS] 客户端注册:`, data.client_info);
      }
      
    } catch (error) {
      console.error(`[JEV-WS] 处理消息失败: ${error.message}`);
    }
  });
  
  // 处理连接关闭
  server.addEventListener('close', () => {
    connectionManager.removeConnection(server);
  });
  
  // 处理错误
  server.addEventListener('error', (error) => {
    console.error(`[JEV-WS] WebSocket错误: ${error.message}`);
    connectionManager.removeConnection(server);
  });
  
  // 返回客户端WebSocket
  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

// 处理状态请求
async function handleStatus(request) {
  // 生成状态报告
  const report = stateManager.generateStatusReport();
  
  // 记录访问
  stateManager.addLog('收到状态查询请求', 'info');
  
  // 返回JSON响应
  return new Response(JSON.stringify(report), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// 处理ping请求
async function handlePing(request) {
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'JEV Worker is running',
    connections: connectionManager.getConnectionCount()
  };
  
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理CORS预检请求
async function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, WebSocket',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

// 主请求处理函数
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 处理OPTIONS请求
  if (method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  // 处理WebSocket连接
  if (path === '/ws' && method === 'GET') {
    return handleWebSocket(request);
  }
  
  // 处理状态查询
  if (path === '/status' && method === 'GET') {
    return handleStatus(request);
  }
  
  // 处理ping请求
  if (path === '/ping' && method === 'GET') {
    return handlePing(request);
  }
  
  // 默认响应
  return new Response('JEV WebSocket Worker', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 启动定时推送
startPushInterval();

// 导出fetch处理函数
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

// 导出Scheduled处理函数（用于定时任务）
addEventListener('scheduled', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 执行定时检查任务
        console.log('[JEV-WS] 执行定时检查');
        
        // 更新模拟数据
        const random = Math.random();
        if (random > 0.7) {
          // 随机更新一个Agent的心跳
          const agentIds = ['01', '02', '03'];
          const randomId = agentIds[Math.floor(Math.random() * agentIds.length)];
          stateManager.updateAgent(randomId, { hostname: `Agent_${randomId}` });
          stateManager.addLog(`Agent_${randomId} 心跳更新`, 'info');
        }
        
        // 记录状态检查
        stateManager.recordStatusCheck(true);
        
      } catch (error) {
        console.error(`[JEV-WS] 定时任务失败: ${error.message}`);
      }
    })()
  );
});