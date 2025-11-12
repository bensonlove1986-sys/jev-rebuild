/**
 * JEV L6.9 · Durable Bridge 模块
 * 实现 Worker、Durable Objects、插件三方的数据实时同步
 */

class DurableSyncBridge {
  constructor() {
    this.bridgeId = 'DurableSyncBridge';
    this.syncUrl = '/bridge/sync';
    this.masterKey = process.env?.JEV_MASTER_KEY || 'default_jev_master_key';
    this.syncInterval = 15000; // 15秒同步一次
    this.healthCheckInterval = 60000; // 60秒健康检查
    this.pendingSyncQueue = this._loadQueueFromStorage();
    this.syncStats = {
      total: 0,
      success: 0,
      failed: 0,
      latencies: [],
      lastSync: null
    };
    
    // 初始化事件监听器
    this._initEventListeners();
    
    // 启动定期任务
    this._startPeriodicTasks();
    
    // 输出初始化日志
    console.log('[L6.9][DurableBridge] 初始化完成');
    console.log('✅ Worker-Durable 双向通道已建立');
    console.log('✅ 实时同步功能激活');
    console.log('✅ 离线缓存同步机制已启用');
  }

  /**
   * 初始化事件监听器
   * @private
   */
  _initEventListeners() {
    // 监听网络状态变化
    window.addEventListener('online', this._handleNetworkChange.bind(this));
    window.addEventListener('offline', this._handleNetworkChange.bind(this));
    
    // 监听其他模块的同步请求
    window.addEventListener('jev-durable-sync-request', (e) => {
      const { sessionId, memory } = e.detail;
      this.sync(sessionId, memory);
    });
  }

  /**
   * 启动定期任务
   * @private
   */
  _startPeriodicTasks() {
    // 定期健康检查
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // 尝试同步队列中的数据
    setInterval(() => {
      if (navigator.onLine && this.pendingSyncQueue.length > 0) {
        this._processPendingQueue();
      }
    }, this.syncInterval);
  }

  /**
   * 从本地存储加载同步队列
   * @private
   * @returns {Array}
   */
  _loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem('jev_durable_sync_queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[DurableBridge] 加载同步队列失败:', error);
      return [];
    }
  }

  /**
   * 保存同步队列到本地存储
   * @private
   */
  _saveQueueToStorage() {
    try {
      localStorage.setItem('jev_durable_sync_queue', JSON.stringify(this.pendingSyncQueue));
    } catch (error) {
      console.error('[DurableBridge] 保存同步队列失败:', error);
    }
  }

  /**
   * 处理网络状态变化
   * @private
   */
  _handleNetworkChange() {
    if (navigator.onLine) {
      console.log('[DurableBridge] 网络已恢复，开始同步离线数据...');
      this._processPendingQueue();
    } else {
      console.log('[DurableBridge] 网络已断开，启用离线模式');
    }
  }

  /**
   * 处理待同步队列
   * @private
   */
  async _processPendingQueue() {
    const queueLength = this.pendingSyncQueue.length;
    if (queueLength === 0) return;
    
    let syncedCount = 0;
    const failedItems = [];
    
    // 逐个处理队列中的项目
    for (const item of this.pendingSyncQueue) {
      try {
        const success = await this._syncToServer(item.sessionId, item.memory);
        if (success) {
          syncedCount++;
        } else {
          failedItems.push(item);
        }
      } catch (error) {
        console.error(`[DurableBridge] 同步队列项目失败: ${item.sessionId}`, error);
        failedItems.push(item);
      }
    }
    
    // 更新队列
    this.pendingSyncQueue = failedItems;
    this._saveQueueToStorage();
    
    if (syncedCount > 0) {
      console.log(`[DurableBridge] Synced ${syncedCount} queued updates after reconnect.`);
      
      // 更新离线重放统计
      this._updateReport({ offline_replays: syncedCount });
    }
  }

  /**
   * 核心同步方法
   * @param {string} sessionId - 会话ID
   * @param {Object} memory - 要同步的记忆数据
   * @returns {Promise<Object>} 同步结果
   */
  async sync(sessionId, memory) {
    if (!sessionId || !memory) {
      throw new Error('sessionId 和 memory 是必需的');
    }

    // 检查是否在线
    if (!navigator.onLine) {
      console.log(`[DurableBridge] 离线状态，将 ${sessionId} 加入同步队列`);
      this.pendingSyncQueue.push({ sessionId, memory });
      this._saveQueueToStorage();
      return { status: 'queued', message: '离线，数据已加入队列' };
    }

    // 直接同步到服务器
    try {
      const success = await this._syncToServer(sessionId, memory);
      return success ? { 
        status: 'ok', 
        syncedAt: new Date().toISOString() 
      } : { 
        status: 'failed', 
        message: '同步失败' 
      };
    } catch (error) {
      // 同步失败，加入队列
      this.pendingSyncQueue.push({ sessionId, memory });
      this._saveQueueToStorage();
      console.error(`[DurableBridge] 同步失败，已加入队列: ${sessionId}`, error);
      return { status: 'queued', message: '同步失败，数据已加入队列' };
    }
  }

  /**
   * 向服务器发送同步请求
   * @private
   * @param {string} sessionId - 会话ID
   * @param {Object} memory - 记忆数据
   * @returns {Promise<boolean>} 是否成功
   */
  async _syncToServer(sessionId, memory) {
    const startTime = performance.now();
    this.syncStats.total++;
    
    try {
      const response = await fetch(this.syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JEV-Token': this.masterKey,
          'X-Bridge-ID': this.bridgeId
        },
        body: JSON.stringify({
          sessionId,
          memory
        })
      });
      
      const latency = performance.now() - startTime;
      this.syncStats.latencies.push(latency);
      
      if (response.ok) {
        const data = await response.json();
        this.syncStats.success++;
        this.syncStats.lastSync = new Date().toISOString();
        
        // 触发更新事件
        this._triggerUpdateEvent(sessionId, memory);
        
        return true;
      } else {
        this.syncStats.failed++;
        console.error(`[DurableBridge] 服务器响应错误: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.syncStats.failed++;
      console.error('[DurableBridge] 同步请求异常:', error);
      return false;
    }
  }

  /**
   * 触发更新事件
   * @private
   * @param {string} sessionId - 会话ID
   * @param {Object} data - 更新数据
   */
  _triggerUpdateEvent(sessionId, data) {
    window.dispatchEvent(new CustomEvent('jev-durable-update', {
      detail: {
        sessionId,
        data
      }
    }));
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const report = this.generateReport();
    this._saveReportToFile(report);
    
    console.log('[DurableBridge] 健康检查:', {
      successRate: `${report.success_rate}%`,
      avgLatency: `${report.avg_latency_ms}ms`,
      pendingCache: report.pending_cache
    });
  }

  /**
   * 生成同步报告
   * @returns {Object} 报告数据
   */
  generateReport() {
    const totalAttempts = this.syncStats.total || 1;
    const avgLatency = this.syncStats.latencies.length > 0
      ? Math.round(this.syncStats.latencies.reduce((a, b) => a + b, 0) / this.syncStats.latencies.length)
      : 0;

    return {
      synced_sessions: this.syncStats.success,
      avg_latency_ms: avgLatency,
      success_rate: Math.round((this.syncStats.success / totalAttempts) * 100 * 10) / 10,
      offline_replays: this.syncStats.offline_replays || 0,
      pending_cache: this.pendingSyncQueue.length,
      last_sync: this.syncStats.lastSync,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 更新报告数据
   * @private
   * @param {Object} updates - 更新字段
   */
  _updateReport(updates) {
    if (updates.offline_replays) {
      this.syncStats.offline_replays = (this.syncStats.offline_replays || 0) + updates.offline_replays;
    }
  }

  /**
   * 保存报告到文件
   * @private
   * @param {Object} report - 报告数据
   */
  _saveReportToFile(report) {
    // 在浏览器环境中，我们无法直接写入文件系统
    // 这里模拟保存操作，实际部署时需要通过API保存到服务器
    console.log('[DurableBridge] 保存报告:', report);
    
    // 可以考虑通过API发送报告到服务器
    if (navigator.onLine) {
      fetch('/bridge/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JEV-Token': this.masterKey,
          'X-Bridge-ID': this.bridgeId
        },
        body: JSON.stringify(report)
      }).catch(err => {
        console.error('[DurableBridge] 保存报告失败:', err);
      });
    }
  }

  /**
   * 获取当前同步状态
   * @returns {Object} 同步状态
   */
  getSyncStatus() {
    return {
      isOnline: navigator.onLine,
      pendingItems: this.pendingSyncQueue.length,
      successRate: this.syncStats.total > 0
        ? (this.syncStats.success / this.syncStats.total * 100).toFixed(1)
        : 0,
      lastSync: this.syncStats.lastSync
    };
  }

  /**
   * 清除离线缓存
   */
  clearOfflineCache() {
    this.pendingSyncQueue = [];
    this._saveQueueToStorage();
    console.log('[DurableBridge] 离线缓存已清除');
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DurableSyncBridge;
} else if (typeof window !== 'undefined') {
  window.DurableSyncBridge = DurableSyncBridge;
  // 自动初始化
  window.jevDurableBridge = new DurableSyncBridge();
}

// 导出默认实例
export default DurableSyncBridge;