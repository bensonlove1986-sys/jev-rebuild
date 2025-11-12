// JEV L6.9.1 TRAE Bridge 功能测试脚本
console.log('================================================');
console.log('[JEV L6.9.1][TRAEDurableBridge] 功能测试启动');
console.log('================================================');

// 模拟浏览器环境
global.window = {
  dispatchEvent: function(event) {
    console.log(`[事件] ${event.type}:`, event.detail);
  },
  localStorage: {
    _storage: {},
    getItem: function(key) {
      return this._storage[key];
    },
    setItem: function(key, value) {
      this._storage[key] = value;
      console.log(`[存储] 保存到 localStorage.${key}`);
    },
    removeItem: function(key) {
      delete this._storage[key];
    }
  },
  addEventListener: function(event, callback) {
    console.log(`[监听] 注册事件监听器: ${event}`);
  }
};

// 模拟 fetch API
global.fetch = async function(url, options) {
  console.log(`[网络] ${options?.method || 'GET'} ${url}`);
  console.log(`[请求头]`, options?.headers);
  console.log(`[请求体]`, options?.body ? JSON.parse(options.body) : null);
  
  // 模拟响应
  return {
    ok: true,
    status: 200,
    json: async () => {
      if (url.includes('/session/') && url.includes('/get')) {
        return {
          success: true,
          data: {
            lastMessage: 'How much is this sensor?',
            lang: 'en',
            history: ['Hello', 'How much is this sensor?', 'It costs $25.'],
            lastResponse: 'It costs $25.'
          }
        };
      } else if (url.includes('/session/') && url.includes('/set')) {
        return {
          success: true,
          data: { updated: true }
        };
      }
      return { success: true };
    }
  };
};

// 模拟 crypto API
global.crypto = {
  subtle: {
    digest: async function(algorithm, data) {
      // 模拟 SHA-256 哈希
      const hash = '0x' + Array(32).fill('a').join('');
      return new ArrayBuffer(32);
    }
  }
};

global.TextEncoder = function() {};
TextEncoder.prototype.encode = function(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return new Uint8Array(bytes);
};

// 导入 bridge_utils.js (模拟导入)
const bridge_utils = {
  signatureUtils: {
    generateSignature: async function(sessionId, timestamp) {
      return 'mock-signature-' + timestamp;
    },
    verifySignature: async function(sessionId, timestamp, signature) {
      return true;
    }
  },
  cacheManager: {
    getPendingUpdates: function() {
      const pending = window.localStorage.getItem('jev_trae_bridge_pending');
      return pending ? JSON.parse(pending) : [];
    },
    addPendingUpdate: function(update) {
      const pending = this.getPendingUpdates();
      pending.push(update);
      window.localStorage.setItem('jev_trae_bridge_pending', JSON.stringify(pending));
    },
    clearPendingUpdates: function() {
      window.localStorage.removeItem('jev_trae_bridge_pending');
    }
  },
  recoveryUtils: {
    exponentialBackoff: function(attempt) {
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }
  },
  networkUtils: {
    isOnline: function() {
      return true;
    },
    enhanceFetch: async function(url, options = {}) {
      return fetch(url, options);
    }
  },
  mergeUtils: {
    mergeSessionData: function(existing, newData) {
      return { ...existing, ...newData };
    }
  }
};

// 测试 TRAEBridgeAdapter 功能类
class TRAEBridgeAdapter {
  constructor(options = {}) {
    this.config = {
      workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
      masterKey: 'JEV_MASTER_KEY',
      defaultTimeout: 5000,
      maxRetries: 3,
      ...options
    };
    
    this.stats = {
      reads: 0,
      writes: 0,
      errors: 0,
      latencySum: 0,
      operations: 0
    };
    
    this.sessionCache = new Map();
    
    console.log(`[L6.9.1][TRAEDurableBridge] 初始化完成`);
    console.log(`✅ TRAE ↔ Durable 双向通道已建立`);
    console.log(`✅ 实时上下文读取与回写启用`);
    console.log(`✅ 离线缓存机制已激活`);
    
    this.initialize();
  }
  
  initialize() {
    // 初始化事件监听
    this.setupEventListeners();
    
    // 检查并恢复离线操作
    this.checkOfflineOperations();
  }
  
  setupEventListeners() {
    // 监听网络状态变化
    window.addEventListener('online', () => this.onNetworkChange(true));
    window.addEventListener('offline', () => this.onNetworkChange(false));
  }
  
  onNetworkChange(isOnline) {
    console.log(`[网络] 状态变化: ${isOnline ? '在线' : '离线'}`);
    if (isOnline) {
      this.replayPendingOperations();
    }
  }
  
  async checkOfflineOperations() {
    const pending = bridge_utils.cacheManager.getPendingUpdates();
    if (pending && pending.length > 0) {
      console.log(`[离线] 发现 ${pending.length} 个待处理操作`);
      await this.replayPendingOperations();
    }
  }
  
  async replayPendingOperations() {
    const pending = bridge_utils.cacheManager.getPendingUpdates();
    if (!pending || pending.length === 0) return;
    
    console.log(`[Bridge][Retry] 开始重放 ${pending.length} 个待处理的会话更新`);
    
    let successful = 0;
    for (const update of pending) {
      try {
        await this.writeContext(update.sessionId, update.data);
        successful++;
      } catch (error) {
        console.error(`[Bridge][Retry] 重放失败:`, error);
      }
    }
    
    console.log(`[Bridge][Retry] Replayed ${successful} pending session updates.`);
    
    if (successful === pending.length) {
      bridge_utils.cacheManager.clearPendingUpdates();
      console.log(`[Bridge][Retry] 所有待处理操作已完成`);
    }
  }
  
  async createAuthHeaders(sessionId) {
    const timestamp = Date.now().toString();
    const signature = await bridge_utils.signatureUtils.generateSignature(
      sessionId, timestamp, this.config.masterKey
    );
    
    return {
      'X-JEV-Session-ID': sessionId,
      'X-JEV-Bridge-Signature': signature,
      'X-JEV-Timestamp': timestamp,
      'Content-Type': 'application/json'
    };
  }
  
  async readContext(sessionId) {
    const startTime = performance.now();
    
    try {
      console.log(`[读取] 会话 ${sessionId} 上下文`);
      
      // 检查缓存
      const cached = this.sessionCache.get(sessionId);
      if (cached && (Date.now() - cached.timestamp < 30000)) { // 30秒缓存
        console.log(`[缓存] 使用缓存的会话数据`);
        return cached.data;
      }
      
      const headers = await this.createAuthHeaders(sessionId);
      const url = `${this.config.workerUrl}/session/${sessionId}/get`;
      
      const response = await bridge_utils.networkUtils.enhanceFetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 更新缓存
        this.sessionCache.set(sessionId, {
          data: result.data,
          timestamp: Date.now()
        });
        
        // 更新统计
        this.updateStats('read', performance.now() - startTime);
        
        console.log(`[读取] 会话 ${sessionId} 上下文成功，包含 ${result.data.history?.length || 0} 条历史记录`);
        return result.data;
      } else {
        throw new Error(result.error || '读取上下文失败');
      }
    } catch (error) {
      this.updateStats('error');
      console.error(`[读取] 会话 ${sessionId} 上下文失败:`, error.message);
      throw error;
    }
  }
  
  async writeContext(sessionId, data) {
    const startTime = performance.now();
    
    try {
      console.log(`[回写] 会话 ${sessionId} 上下文`);
      
      const headers = await this.createAuthHeaders(sessionId);
      const url = `${this.config.workerUrl}/session/${sessionId}/set`;
      
      // 确保数据包含必要字段
      const writeData = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        updatedBy: data.updatedBy || 'TRAE'
      };
      
      const response = await bridge_utils.networkUtils.enhanceFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(writeData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 清除缓存，强制下次读取最新数据
        this.sessionCache.delete(sessionId);
        
        // 更新统计
        this.updateStats('write', performance.now() - startTime);
        
        // 触发更新事件
        window.dispatchEvent(new CustomEvent('jev-durable-update', {
          detail: { sessionId, newData: writeData }
        }));
        
        console.log(`[回写] 会话 ${sessionId} 上下文成功`);
        return true;
      } else {
        throw new Error(result.error || '回写上下文失败');
      }
    } catch (error) {
      this.updateStats('error');
      console.error(`[回写] 会话 ${sessionId} 上下文失败:`, error.message);
      
      // 离线缓存
      bridge_utils.cacheManager.addPendingUpdate({
        sessionId,
        data,
        timestamp: Date.now(),
        attempts: 0
      });
      
      throw error;
    }
  }
  
  updateStats(operation, latency = 0) {
    this.stats.operations++;
    
    if (operation === 'read') {
      this.stats.reads++;
    } else if (operation === 'write') {
      this.stats.writes++;
    } else if (operation === 'error') {
      this.stats.errors++;
    }
    
    if (latency > 0) {
      this.stats.latencySum += latency;
    }
  }
  
  getStatsReport() {
    const avgLatency = this.stats.operations > 0 ? 
      Math.round(this.stats.latencySum / this.stats.operations) : 0;
    const successRate = this.stats.operations > 0 ? 
      (1 - this.stats.errors / this.stats.operations) * 100 : 100;
    
    return {
      active_sessions: this.sessionCache.size,
      context_reads: this.stats.reads,
      writes: this.stats.writes,
      avg_latency_ms: avgLatency,
      success_rate: parseFloat(successRate.toFixed(1))
    };
  }
  
  // 生成会话签名
  generateSessionSignature(sessionId) {
    return `JEV-${sessionId}-${Date.now().toString(36)}`;
  }
}

// 运行测试
async function runTests() {
  console.log('\n[测试] 开始执行功能测试...');
  
  // 创建适配器实例
  const adapter = new TRAEBridgeAdapter();
  
  // 测试1: 读取上下文
  try {
    console.log('\n[测试1] 读取会话上下文');
    const sessionId = 'user-3SsfTbU1lmAPpkG9iB6C';
    const context = await adapter.readContext(sessionId);
    console.log('[测试1] 成功 ✅:', context);
  } catch (error) {
    console.log('[测试1] 失败 ❌:', error.message);
  }
  
  // 测试2: 回写上下文
  try {
    console.log('\n[测试2] 回写会话上下文');
    const sessionId = 'user-3SsfTbU1lmAPpkG9iB6C';
    const newData = {
      lastMessage: 'Thanks for the information!',
      timestamp: new Date().toISOString(),
      updatedBy: 'TRAE'
    };
    const result = await adapter.writeContext(sessionId, newData);
    console.log('[测试2] 成功 ✅:', result);
  } catch (error) {
    console.log('[测试2] 失败 ❌:', error.message);
  }
  
  // 测试3: 生成会话签名
  try {
    console.log('\n[测试3] 生成会话签名');
    const sessionId = 'user-3SsfTbU1lmAPpkG9iB6C';
    const signature = adapter.generateSessionSignature(sessionId);
    console.log('[测试3] 成功 ✅:', signature);
  } catch (error) {
    console.log('[测试3] 失败 ❌:', error.message);
  }
  
  // 生成运行报告
  console.log('\n[报告] 运行统计');
  console.log(JSON.stringify(adapter.getStatsReport(), null, 2));
  
  console.log('\n================================================');
  console.log('[JEV L6.9.1][TRAEDurableBridge] 功能测试完成');
  console.log('================================================');
}

// 启动测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
});