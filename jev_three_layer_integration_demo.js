/**
 * JEV-PluginSync-v1.0 三层通信闭环集成演示
 * 功能：演示如何整合插件层、本地中继和Worker层的完整通信流程
 */

class JEVThreeLayerIntegrationDemo {
  constructor(config = {}) {
    this.config = {
      // 通信配置
      pluginConfig: {
        id: config.pluginId || 'jev-demo-plugin',
        version: config.pluginVersion || '1.0.0',
        mode: config.pluginMode || 'online', // online/offline
        autoSync: config.autoSync !== undefined ? config.autoSync : true,
        syncInterval: config.syncInterval || 60000 // 1分钟
      },
      relayConfig: {
        endpoint: config.relayEndpoint || 'http://localhost:3000',
        reconnectInterval: config.reconnectInterval || 5000,
        maxRetries: config.relayMaxRetries || 3
      },
      workerConfig: {
        endpoint: config.workerEndpoint || 'https://your-worker-endpoint.workers.dev',
        timeout: config.workerTimeout || 10000,
        retryStrategy: config.retryStrategy || {
          maxRetries: 3,
          backoffMs: 1000
        }
      },
      // 安全配置
      securityConfig: {
        enableEncryption: config.enableEncryption !== undefined ? config.enableEncryption : true,
        useJwt: config.useJwt !== undefined ? config.useJwt : true,
        validateCertificates: config.validateCertificates !== undefined ? config.validateCertificates : true
      },
      // 日志和监控配置
      logConfig: {
        level: config.logLevel || 'info',
        enableConsole: config.enableConsole !== undefined ? config.enableConsole : true,
        enableFile: config.enableFile !== undefined ? config.enableFile : true,
        logDir: config.logDir || './jev_logs/communication'
      },
      // 扩展配置
      ...config
    };

    // 核心组件实例
    this.components = {
      monitor: null,
      errorHandler: null,
      testSuite: null,
      relayBridge: null,
      modeManager: null,
      dataManager: null
    };

    // 状态管理
    this.state = {
      initialized: false,
      connected: {
        plugin: false,
        relay: false,
        worker: false
      },
      currentMode: this.config.pluginConfig.mode,
      lastSyncTime: null,
      syncQueue: [],
      activeConnections: 0
    };

    // 事件总线
    this.listeners = new Map();

    // 初始化标识
    this.isInitializing = false;
  }

  /**
   * 初始化集成演示
   */
  async initialize() {
    if (this.isInitializing || this.state.initialized) {
      throw new Error('系统已经初始化或正在初始化中');
    }

    this.isInitializing = true;
    this.logger('开始初始化JEV三层通信集成演示', 'info');

    try {
      // 1. 初始化组件
      await this.initializeComponents();

      // 2. 设置通信监听器
      this.setupCommunicationListeners();

      // 3. 建立初始连接
      await this.establishConnections();

      // 4. 启动监控和维护任务
      this.startMaintenanceTasks();

      // 5. 初始化完成
      this.state.initialized = true;
      this.isInitializing = false;

      this.logger('JEV三层通信集成演示初始化完成', 'info');
      this.triggerEvent('initialized', { timestamp: new Date() });

      return true;
    } catch (error) {
      this.isInitializing = false;
      this.logger(`初始化失败: ${error.message}`, 'error');
      this.triggerEvent('initializationFailed', { error: error.message });
      throw error;
    }
  }

  /**
   * 初始化各个组件
   */
  async initializeComponents() {
    this.logger('初始化核心组件', 'debug');

    // 1. 初始化监控模块
    try {
      if (typeof JEVThreeLayerMonitor !== 'undefined') {
        this.components.monitor = new JEVThreeLayerMonitor({
          relayEndpoint: this.config.relayConfig.endpoint,
          workerEndpoint: this.config.workerConfig.endpoint,
          logLevel: this.config.logConfig.level
        });
        this.logger('监控模块初始化成功', 'info');
      }
    } catch (error) {
      this.logger(`监控模块初始化失败: ${error.message}`, 'warn');
    }

    // 2. 初始化错误处理模块
    try {
      if (typeof JEVThreeLayerErrorHandler !== 'undefined') {
        this.components.errorHandler = new JEVThreeLayerErrorHandler({
          fallbackEnabled: true,
          offlineModeThreshold: 30000
        });
        this.logger('错误处理模块初始化成功', 'info');
      }
    } catch (error) {
      this.logger(`错误处理模块初始化失败: ${error.message}`, 'warn');
    }

    // 3. 初始化测试套件
    try {
      if (typeof JEVThreeLayerTestSuite !== 'undefined') {
        this.components.testSuite = new JEVThreeLayerTestSuite({
          relayEndpoint: this.config.relayConfig.endpoint,
          workerEndpoint: this.config.workerConfig.endpoint
        });
        this.logger('测试套件初始化成功', 'info');
      }
    } catch (error) {
      this.logger(`测试套件初始化失败: ${error.message}`, 'warn');
    }

    // 4. 初始化中继桥接
    this.initializeRelayBridge();

    // 5. 初始化模式管理器
    this.initializeModeManager();

    // 6. 初始化数据管理器
    this.initializeDataManager();
  }

  /**
   * 初始化中继桥接
   */
  initializeRelayBridge() {
    // 模拟中继桥接实现
    this.components.relayBridge = {
      connected: false,
      connect: async () => {
        try {
          // 模拟连接到中继服务
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.components.relayBridge.connected = true;
          this.state.connected.relay = true;
          this.logger('成功连接到本地中继', 'info');
          return true;
        } catch (error) {
          this.logger(`连接本地中继失败: ${error.message}`, 'error');
          throw error;
        }
      },
      disconnect: () => {
        this.components.relayBridge.connected = false;
        this.state.connected.relay = false;
        this.logger('已断开与本地中继的连接', 'info');
      },
      sendMessage: async (message) => {
        if (!this.components.relayBridge.connected) {
          throw new Error('未连接到中继服务');
        }
        // 模拟发送消息到中继
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              messageId: Date.now(),
              timestamp: new Date().toISOString()
            });
          }, 200);
        });
      }
    };
  }

  /**
   * 初始化模式管理器
   */
  initializeModeManager() {
    this.components.modeManager = {
      currentMode: this.state.currentMode,
      switchToOnline: () => {
        this.components.modeManager.currentMode = 'online';
        this.state.currentMode = 'online';
        this.logger('已切换到在线模式', 'info');
        this.triggerEvent('modeChanged', { mode: 'online' });
      },
      switchToOffline: () => {
        this.components.modeManager.currentMode = 'offline';
        this.state.currentMode = 'offline';
        this.logger('已切换到离线模式', 'info');
        this.triggerEvent('modeChanged', { mode: 'offline' });
      },
      getMode: () => this.components.modeManager.currentMode,
      isOnline: () => this.components.modeManager.currentMode === 'online'
    };
  }

  /**
   * 初始化数据管理器
   */
  initializeDataManager() {
    this.components.dataManager = {
      cache: new Map(),
      syncQueue: [],
      cacheData: (key, value, ttl = 3600000) => { // 默认1小时TTL
        this.components.dataManager.cache.set(key, {
          value,
          timestamp: Date.now(),
          ttl
        });
        this.logger(`数据已缓存: ${key}`, 'debug');
      },
      getData: (key) => {
        const item = this.components.dataManager.cache.get(key);
        if (!item) return null;
        
        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl) {
          this.components.dataManager.cache.delete(key);
          return null;
        }
        
        return item.value;
      },
      queueForSync: (data) => {
        const queueItem = {
          id: Date.now(),
          data,
          timestamp: Date.now(),
          synced: false
        };
        this.components.dataManager.syncQueue.push(queueItem);
        this.state.syncQueue.push(queueItem);
        this.logger(`数据已加入同步队列，队列大小: ${this.components.dataManager.syncQueue.length}`, 'debug');
        return queueItem.id;
      },
      getSyncQueue: () => this.components.dataManager.syncQueue
    };
  }

  /**
   * 设置通信监听器
   */
  setupCommunicationListeners() {
    this.logger('设置通信事件监听器', 'debug');

    // 插件层事件
    this.on('pluginMessage', this.handlePluginMessage.bind(this));
    this.on('pluginStatusChange', this.handlePluginStatusChange.bind(this));

    // 中继层事件
    this.on('relayMessage', this.handleRelayMessage.bind(this));
    this.on('relayStatusChange', this.handleRelayStatusChange.bind(this));

    // Worker层事件
    this.on('workerMessage', this.handleWorkerMessage.bind(this));
    this.on('workerStatusChange', this.handleWorkerStatusChange.bind(this));

    // 系统事件
    this.on('modeChanged', this.handleModeChange.bind(this));
    this.on('syncComplete', this.handleSyncComplete.bind(this));
    this.on('error', this.handleSystemError.bind(this));

    // 监控事件（如果可用）
    if (this.components.monitor) {
      this.components.monitor.on('statusUpdate', this.handleMonitorStatusUpdate.bind(this));
      this.components.monitor.on('alert', this.handleMonitorAlert.bind(this));
    }

    // 错误处理事件（如果可用）
    if (this.components.errorHandler) {
      this.components.errorHandler.on('retry', this.handleRetryEvent.bind(this));
      this.components.errorHandler.on('fallback', this.handleFallbackEvent.bind(this));
      this.components.errorHandler.on('circuitOpen', this.handleCircuitOpenEvent.bind(this));
      this.components.errorHandler.on('offlineModeEntered', this.handleOfflineModeEntered.bind(this));
    }
  }

  /**
   * 建立初始连接
   */
  async establishConnections() {
    this.logger('开始建立三层连接', 'info');

    try {
      // 1. 标记插件层为已连接
      this.state.connected.plugin = true;
      this.triggerEvent('pluginStatusChange', { connected: true });

      // 2. 连接到中继层
      await this.components.relayBridge.connect();
      this.triggerEvent('relayStatusChange', { connected: true });

      // 3. 测试Worker连接
      await this.testWorkerConnection();

      this.logger('三层连接建立完成', 'info');
      this.triggerEvent('allConnectionsEstablished', { timestamp: new Date() });
    } catch (error) {
      this.logger(`建立连接失败: ${error.message}`, 'error');
      // 即使部分连接失败，也尝试继续运行（降级模式）
      this.handleConnectionError(error);
    }
  }

  /**
   * 测试Worker连接
   */
  async testWorkerConnection() {
    try {
      const response = await fetch(`${this.config.workerConfig.endpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        this.state.connected.worker = true;
        this.triggerEvent('workerStatusChange', { connected: true });
        this.logger('Worker连接测试成功', 'info');
        return true;
      } else {
        throw new Error(`Worker健康检查失败: ${response.status}`);
      }
    } catch (error) {
      this.logger(`Worker连接测试失败: ${error.message}`, 'warn');
      // 不抛出错误，允许系统在Worker不可用时继续运行（降级模式）
      return false;
    }
  }

  /**
   * 处理连接错误
   */
  handleConnectionError(error) {
    // 根据失败的连接决定降级策略
    if (!this.state.connected.relay && !this.state.connected.worker) {
      this.logger('关键连接全部失败，进入离线模式', 'error');
      this.components.modeManager.switchToOffline();
    } else if (!this.state.connected.worker) {
      this.logger('Worker连接失败，使用中继作为主要通信通道', 'warn');
    } else if (!this.state.connected.relay) {
      this.logger('中继连接失败，尝试直接连接Worker', 'warn');
    }

    // 触发连接错误事件
    this.triggerEvent('connectionError', { error: error.message });
  }

  /**
   * 启动维护任务
   */
  startMaintenanceTasks() {
    // 1. 定期同步任务
    if (this.config.pluginConfig.autoSync) {
      setInterval(() => {
        if (this.components.modeManager.isOnline()) {
          this.performSync().catch(error => {
            this.logger(`自动同步失败: ${error.message}`, 'error');
          });
        }
      }, this.config.pluginConfig.syncInterval);
    }

    // 2. 清理过期缓存
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 300000); // 5分钟

    // 3. 状态检查任务
    setInterval(() => {
      this.performStatusCheck();
    }, 60000); // 1分钟

    this.logger('维护任务已启动', 'info');
  }

  /**
   * 执行数据同步
   */
  async performSync() {
    if (!this.components.modeManager.isOnline()) {
      this.logger('当前为离线模式，跳过同步', 'debug');
      return;
    }

    const queue = this.components.dataManager.getSyncQueue();
    if (queue.length === 0) {
      this.logger('同步队列为空，无需同步', 'debug');
      return;
    }

    this.logger(`开始执行数据同步，队列大小: ${queue.length}`, 'info');

    try {
      // 处理同步队列中的每个项目
      for (const item of queue) {
        if (!item.synced) {
          // 尝试同步数据
          await this.syncItem(item);
        }
      }

      this.state.lastSyncTime = new Date();
      this.logger('数据同步完成', 'info');
      this.triggerEvent('syncComplete', { 
        timestamp: this.state.lastSyncTime,
        syncedItems: queue.filter(item => item.synced).length
      });
    } catch (error) {
      this.logger(`数据同步失败: ${error.message}`, 'error');
      this.triggerEvent('syncError', { error: error.message });
      throw error;
    }
  }

  /**
   * 同步单个项目
   */
  async syncItem(item) {
    try {
      // 根据当前连接状态选择同步路径
      if (this.state.connected.relay) {
        // 通过中继同步
        await this.components.relayBridge.sendMessage(item.data);
      } else if (this.state.connected.worker) {
        // 直接同步到Worker
        await this.sendDirectToWorker(item.data);
      } else {
        throw new Error('没有可用的同步通道');
      }

      item.synced = true;
      item.syncTime = new Date().toISOString();
      this.logger(`数据项同步成功，ID: ${item.id}`, 'debug');
      
      // 从状态队列中移除已同步的项
      const index = this.state.syncQueue.findIndex(i => i.id === item.id);
      if (index > -1) {
        this.state.syncQueue.splice(index, 1);
      }
    } catch (error) {
      this.logger(`同步数据项失败，ID: ${item.id}, 错误: ${error.message}`, 'error');
      // 不抛出错误，继续同步其他项
    }
  }

  /**
   * 直接发送到Worker
   */
  async sendDirectToWorker(data) {
    try {
      const response = await fetch(this.config.workerConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        timeout: this.config.workerConfig.timeout
      });

      if (!response.ok) {
        throw new Error(`Worker请求失败: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (this.components.errorHandler) {
        return this.components.errorHandler.handleError('worker', 'sendDirect', error, { data });
      }
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const cache = this.components.dataManager.cache;
    const keysToDelete = [];

    cache.forEach((item, key) => {
      if (Date.now() - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      this.logger(`清理了 ${keysToDelete.length} 个过期缓存项`, 'debug');
    }
  }

  /**
   * 执行状态检查
   */
  async performStatusCheck() {
    try {
      // 检查中继连接
      if (this.state.connected.relay && !this.components.relayBridge.connected) {
        await this.components.relayBridge.connect();
      }

      // 检查Worker连接
      await this.testWorkerConnection();

      // 触发状态更新事件
      this.triggerEvent('statusCheckComplete', {
        connected: { ...this.state.connected },
        mode: this.state.currentMode,
        syncQueueSize: this.state.syncQueue.length,
        lastSyncTime: this.state.lastSyncTime
      });
    } catch (error) {
      this.logger(`状态检查失败: ${error.message}`, 'error');
    }
  }

  /**
   * 发送三层通信消息
   */
  async sendMessage(message, options = {}) {
    const { 
      priority = 'normal',
      requireConfirmation = false,
      retryOnFailure = true
    } = options;

    this.logger(`发送三层通信消息，类型: ${message.type || 'unknown'}`, 'debug');

    try {
      // 记录消息到日志
      this.logMessage('send', message);

      // 根据模式选择发送策略
      if (!this.components.modeManager.isOnline()) {
        // 离线模式：加入同步队列
        const queueId = this.components.dataManager.queueForSync(message);
        this.logger(`消息已加入离线队列，ID: ${queueId}`, 'info');
        return { success: true, queued: true, queueId };
      }

      // 在线模式：尝试发送
      let result;

      // 优先通过中继发送
      if (this.state.connected.relay) {
        result = await this.components.relayBridge.sendMessage(message);
      } else if (this.state.connected.worker) {
        // 直接发送到Worker
        result = await this.sendDirectToWorker(message);
      } else {
        // 无连接可用：降级到离线模式
        this.components.modeManager.switchToOffline();
        const queueId = this.components.dataManager.queueForSync(message);
        return { success: true, queued: true, queueId, mode: 'offline' };
      }

      // 缓存发送的消息（用于确认和重试）
      if (requireConfirmation) {
        this.components.dataManager.cacheData(`msg_${result.messageId}`, message, 300000); // 5分钟缓存
      }

      this.logger(`消息发送成功，ID: ${result.messageId}`, 'info');
      return { success: true, ...result };
    } catch (error) {
      this.logger(`消息发送失败: ${error.message}`, 'error');

      // 错误处理和重试逻辑
      if (this.components.errorHandler && retryOnFailure) {
        return this.components.errorHandler.handleError('communication', 'sendMessage', error, { message, options });
      }

      // 最后尝试：加入离线队列
      const queueId = this.components.dataManager.queueForSync(message);
      return { 
        success: false, 
        error: error.message,
        queued: true,
        queueId
      };
    }
  }

  /**
   * 处理接收到的消息
   */
  handleReceivedMessage(message, source) {
    this.logger(`从${source}接收到消息，类型: ${message.type || 'unknown'}`, 'debug');
    
    // 记录接收到的消息
    this.logMessage('receive', message, source);

    // 触发消息事件
    this.triggerEvent('messageReceived', { message, source });

    // 处理特定类型的消息
    switch (message.type) {
      case 'ping':
        return this.handlePingMessage(message, source);
      case 'sync_request':
        return this.handleSyncRequest(message, source);
      case 'status_update':
        return this.handleRemoteStatusUpdate(message, source);
      default:
        return this.handleCustomMessage(message, source);
    }
  }

  /**
   * 处理Ping消息
   */
  handlePingMessage(message, source) {
    const pongMessage = {
      type: 'pong',
      originalTimestamp: message.timestamp,
      timestamp: Date.now(),
      source: this.config.pluginConfig.id
    };

    // 立即回复Pong消息
    this.sendMessage(pongMessage, { priority: 'high' });
    return { type: 'pong', sent: true };
  }

  /**
   * 处理同步请求
   */
  handleSyncRequest(message, source) {
    // 执行同步操作
    this.performSync().catch(error => {
      this.logger(`响应同步请求失败: ${error.message}`, 'error');
    });

    return { syncInitiated: true };
  }

  /**
   * 处理远程状态更新
   */
  handleRemoteStatusUpdate(message, source) {
    // 更新本地状态
    if (message.connected) {
      Object.assign(this.state.connected, message.connected);
    }

    // 触发状态更新事件
    this.triggerEvent('remoteStatusUpdate', { message, source });
    return { statusUpdated: true };
  }

  /**
   * 处理自定义消息
   */
  handleCustomMessage(message, source) {
    // 触发特定类型的消息事件
    this.triggerEvent(`message_${message.type}`, { message, source });
    return { processed: true };
  }

  /**
   * 记录消息到日志
   */
  logMessage(direction, message, source = null) {
    const logEntry = {
      direction,
      source: source || 'local',
      messageType: message.type || 'unknown',
      timestamp: new Date().toISOString(),
      messageSize: JSON.stringify(message).length
    };

    this.logger(`消息日志: ${direction.toUpperCase()} ${logEntry.messageType} (${logEntry.source})`, 'debug');
  }

  /**
   * 事件处理函数
   */
  handlePluginMessage({ message }) {
    this.handleReceivedMessage(message, 'plugin');
  }

  handlePluginStatusChange({ connected }) {
    this.state.connected.plugin = connected;
    this.logger(`插件层状态变更: ${connected ? '已连接' : '已断开'}`, 'info');
  }

  handleRelayMessage({ message }) {
    this.handleReceivedMessage(message, 'relay');
  }

  handleRelayStatusChange({ connected }) {
    this.state.connected.relay = connected;
    this.logger(`中继层状态变更: ${connected ? '已连接' : '已断开'}`, 'info');
  }

  handleWorkerMessage({ message }) {
    this.handleReceivedMessage(message, 'worker');
  }

  handleWorkerStatusChange({ connected }) {
    this.state.connected.worker = connected;
    this.logger(`Worker层状态变更: ${connected ? '已连接' : '已断开'}`, 'info');
  }

  handleModeChange({ mode }) {
    this.state.currentMode = mode;
    this.logger(`系统模式已变更为: ${mode}`, 'info');
  }

  handleSyncComplete({ timestamp, syncedItems }) {
    this.state.lastSyncTime = timestamp;
    this.logger(`数据同步完成，同步项数: ${syncedItems}`, 'info');
  }

  handleSystemError({ error, source }) {
    this.logger(`系统错误 (${source || 'unknown'}): ${error}`, 'error');
    // 可以在这里实现错误报告逻辑
  }

  handleMonitorStatusUpdate({ status, metrics, overallHealth }) {
    this.logger(`监控状态更新 - 健康分数: ${overallHealth.score}`, 'debug');
    // 更新本地状态
    Object.assign(this.state.connected, {
      plugin: status.plugin.connected,
      relay: status.relay.connected,
      worker: status.worker.connected
    });
  }

  handleMonitorAlert({ level, message, timestamp }) {
    this.logger(`监控告警 [${level.toUpperCase()}]: ${message}`, 'warn');
    this.triggerEvent('monitorAlert', { level, message, timestamp });
  }

  handleRetryEvent({ layer, operation, retryCount, delay, error }) {
    this.logger(`重试操作: ${layer}.${operation} (第${retryCount}次，延迟${delay}ms)`, 'warn');
  }

  handleFallbackEvent({ layer, operation, error }) {
    this.logger(`触发降级策略: ${layer}.${operation}`, 'warn');
  }

  handleCircuitOpenEvent({ layer }) {
    this.logger(`电路已打开: ${layer}层`, 'error');
    // 考虑切换到离线模式
    if (['relay', 'worker'].includes(layer)) {
      this.evaluateModeChange();
    }
  }

  handleOfflineModeEntered({ timestamp }) {
    this.logger('系统已进入离线模式', 'error');
    this.components.modeManager.switchToOffline();
  }

  /**
   * 评估是否需要切换模式
   */
  evaluateModeChange() {
    const criticalLayers = ['relay', 'worker'];
    const criticalDown = criticalLayers.filter(layer => !this.state.connected[layer]).length;
    
    if (criticalDown === criticalLayers.length) {
      this.components.modeManager.switchToOffline();
    } else if (criticalDown < criticalLayers.length && !this.components.modeManager.isOnline()) {
      // 至少一个关键层恢复，尝试切换回在线模式
      this.components.modeManager.switchToOnline();
    }
  }

  /**
   * 注册事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  triggerEvent(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.logger(`事件监听器执行失败 (${event}): ${error.message}`, 'error');
      }
    });
  }

  /**
   * 日志记录
   */
  logger(message, level = 'info') {
    const levels = ['debug', 'info', 'warn', 'error'];
    const logLevel = this.config.logConfig.level;
    const levelIndex = levels.indexOf(logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= levelIndex && this.config.logConfig.enableConsole) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] JEV-Demo: ${message}`);
    }
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      initialized: this.state.initialized,
      mode: this.state.currentMode,
      connected: { ...this.state.connected },
      lastSyncTime: this.state.lastSyncTime,
      syncQueueSize: this.state.syncQueue.length,
      pluginInfo: {
        id: this.config.pluginConfig.id,
        version: this.config.pluginConfig.version
      }
    };
  }

  /**
   * 运行集成测试
   */
  async runIntegrationTests() {
    if (this.components.testSuite) {
      this.logger('开始运行集成测试套件', 'info');
      const results = await this.components.testSuite.runFullSuite();
      this.logger(`集成测试完成，通过率: ${results.passRate}`, 'info');
      return results;
    } else {
      this.logger('测试套件未初始化，跳过集成测试', 'warn');
      return null;
    }
  }

  /**
   * 关闭系统
   */
  async shutdown() {
    this.logger('开始关闭JEV三层通信系统', 'info');
    
    try {
      // 停止维护任务
      // 注意：在实际实现中，应该跟踪所有定时器并清除它们
      
      // 断开连接
      if (this.state.connected.relay && this.components.relayBridge) {
        this.components.relayBridge.disconnect();
      }
      
      // 停止监控
      if (this.components.monitor) {
        // 假设监控模块有stop方法
        if (typeof this.components.monitor.stopMonitoring === 'function') {
          this.components.monitor.stopMonitoring();
        }
      }
      
      // 保存状态
      this.saveState();
      
      this.state.initialized = false;
      this.logger('JEV三层通信系统已关闭', 'info');
      return true;
    } catch (error) {
      this.logger(`关闭系统时出错: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 保存状态
   */
  saveState() {
    try {
      const stateToSave = {
        mode: this.state.currentMode,
        lastSyncTime: this.state.lastSyncTime,
        timestamp: new Date().toISOString()
      };
      
      // 在浏览器环境中使用localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jev_demo_state', JSON.stringify(stateToSave));
      }
    } catch (error) {
      this.logger(`保存状态失败: ${error.message}`, 'error');
    }
  }

  /**
   * 加载状态
   */
  loadState() {
    try {
      // 在浏览器环境中从localStorage加载
      if (typeof localStorage !== 'undefined') {
        const savedState = localStorage.getItem('jev_demo_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          // 恢复相关状态
          if (parsedState.mode) {
            this.state.currentMode = parsedState.mode;
          }
          if (parsedState.lastSyncTime) {
            this.state.lastSyncTime = new Date(parsedState.lastSyncTime);
          }
        }
      }
    } catch (error) {
      this.logger(`加载状态失败: ${error.message}`, 'warn');
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = JEVThreeLayerIntegrationDemo;
} else if (typeof window !== 'undefined') {
  window.JEVThreeLayerIntegrationDemo = JEVThreeLayerIntegrationDemo;
}

// 浏览器环境的简单使用示例
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // 如果页面中有启动按钮
    const startButton = document.getElementById('start-jev-demo');
    if (startButton) {
      startButton.addEventListener('click', async () => {
        console.log('开始JEV三层通信集成演示...');
        
        const demo = new JEVThreeLayerIntegrationDemo();
        
        // 注册事件监听器
        demo.on('initialized', () => {
          console.log('JEV系统已初始化');
          document.getElementById('jev-status').textContent = '已初始化';
        });
        
        demo.on('statusCheckComplete', (status) => {
          document.getElementById('jev-mode').textContent = status.mode;
          document.getElementById('jev-relay').textContent = status.connected.relay ? '已连接' : '未连接';
          document.getElementById('jev-worker').textContent = status.connected.worker ? '已连接' : '未连接';
        });
        
        try {
          await demo.initialize();
        } catch (error) {
          console.error('JEV系统初始化失败:', error);
          document.getElementById('jev-status').textContent = '初始化失败';
        }
      });
    }
  });
}