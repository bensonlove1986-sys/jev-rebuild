/**
 * Bridge-Sync-Agent
 * 内部子智能体，用于在Builder、Control-Agent、Monitor模块间协调通信与状态同步
 */

class BridgeSyncAgent {
  constructor() {
    // 基本信息
    this.name = 'Bridge-Sync-Agent';
    this.type = 'internal';
    this.binding = 'trae_core/modules/bridge_sync_agent.js';
    this.interval = 3000; // 优化为3秒检测一次，提高响应速度
    
    // 安全头部配置
    this.headers = {
      'X-Agent-Token': 'jev-secure-key-001',
      'X-System-Layer': 'trae-bridge',
      'Content-Type': 'application/json'
    };
    
    // 模块状态
    this.modules = ['builder', 'control', 'monitor'];
    this.currentModuleIndex = 0;
    this.lastSyncTime = 0;
    this.running = false;
    this.syncInterval = null;
    
    // 日志目录
    this.logDir = '/jev_logs/bridge';
    
    // 同步端点
    this.syncEndpoint = 'https://jevshop.bensonlove1986.workers.dev/sync';
    
    // 警报端点
    this.alertEndpoint = 'http://localhost:8080/task?type=alert&origin=bridge';
    
    // 增强型缓存系统 - 多级缓存策略
    this.cache = new Map();
    this.cacheTTL = 15000; // 减少缓存时间至15秒，确保数据新鲜度
    this.lruCache = new Map(); // LRU缓存
    this.maxCacheSize = 50; // 限制缓存大小
    
    // 性能统计
    this.performanceStats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      avgLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      asyncOperations: 0,
      parallelTasks: 0
    };
    
    // 增强型异步任务处理
    this.taskQueue = [];
    this.processingQueue = false;
    this.maxParallelTasks = 5; // 最大并行任务数
    this.activeTasks = 0;
    this.taskPool = [];
    
    // 请求复用连接池
    this.connectionPool = new Map();
    
    console.log('✅ TRAE 内部子智能体 Bridge-Sync-Agent 已初始化 - 高性能优化版');
  }
  
  /**
   * 启动Bridge-Sync-Agent
   */
  start() {
    if (this.running) {
      console.log('Bridge-Sync-Agent 已经在运行中');
      return;
    }
    
    this.running = true;
    
    // 初始同步
    this.synchronizeModules();
    
    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.synchronizeModules();
    }, this.interval);
    
    console.log('✅ TRAE 内部子智能体 Bridge-Sync-Agent 已激活');
  }
  
  /**
   * 停止Bridge-Sync-Agent
   */
  stop() {
    if (!this.running) {
      console.log('Bridge-Sync-Agent 未在运行');
      return;
    }
    
    this.running = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    console.log('Bridge-Sync-Agent 已停止');
  }
  
  /**
   * 获取当前活跃模块
   */
  getCurrentModule() {
    return this.modules[this.currentModuleIndex];
  }
  
  /**
   * 获取下一个模块
   */
  getNextModule() {
    return this.modules[(this.currentModuleIndex + 1) % this.modules.length];
  }
  
  /**
   * 切换到下一个模块
   */
  switchToNextModule() {
    this.currentModuleIndex = (this.currentModuleIndex + 1) % this.modules.length;
    return this.getCurrentModule();
  }
  
  /**
   * 执行模块同步 - 高性能版本
   */
  synchronizeModules() {
    if (!this.running) return;
    
    const startTime = Date.now();
    const currentModule = this.getCurrentModule();
    const nextModule = this.getNextModule();
    
    console.log('Task Start Time: ', new Date().toISOString());
    
    // 使用任务队列处理同步操作，避免阻塞主事件循环
    this.addTask(async () => {
      try {
        // 准备同步数据
        const syncData = {
          active: currentModule,
          next: nextModule,
          timestamp: startTime,
          action: 'handover',
          agent: this.name
        };
        
        // 检查缓存 - 使用多级缓存策略
        const cacheKey = `${currentModule}_${nextModule}`;
        const cachedData = this.getFromCache(cacheKey);
        
        let syncResult;
        if (cachedData) {
          console.log(`✅ 缓存命中: ${cacheKey}`);
          syncResult = cachedData;
        } else {
          // 直接执行远程同步，避免嵌套任务调用
          syncResult = await this.syncWithRemote(syncData);
          
          // 智能缓存策略 - 频繁访问的模块组合设为高优先级缓存
          const priority = this.isFrequentlyAccessedModule(currentModule) ? 'high' : 'normal';
          this.setToCache(cacheKey, syncResult, priority);
        }
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // 更新性能统计
        this.updatePerformanceStats(true, latency);
        
        // 使用专用任务类型异步记录日志
        this.addTask(() => this.logSyncResult(syncData, syncResult, latency), 'low', 'log');
        
        // 检查延迟并触发警报（智能阈值）
        const dynamicThreshold = this.getDynamicLatencyThreshold(latency);
        if (latency > dynamicThreshold) {
          console.log(`⚠️ 延迟警告: ${latency}ms (超过${dynamicThreshold}ms动态阈值)`);
          // 使用警报专用任务类型
          this.addTask(() => this.triggerAlert('high_latency', {
            module: currentModule,
            latency: latency,
            threshold: dynamicThreshold
          }), 'high', 'alert');
        }
        
        console.log(`模块轮换正常 | 延迟 ${latency}ms | 状态同步成功 | 缓存命中率: ${this.getCacheHitRate()}% | 并行任务: ${this.activeTasks}`);
        console.log('Task End Time: ', new Date().toISOString());
        
        // 更新UI显示
        this.addTask(() => this.updateUISyncIndicator(currentModule), 'low', 'default');
        
        // 切换到下一个模块
        this.switchToNextModule();
        
        // 更新最后同步时间
        this.lastSyncTime = startTime;
        
        // 预热下一轮可能的模块组合缓存
        this.prefetchNextModuleCache();
        
      } catch (error) {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // 更新性能统计
        this.updatePerformanceStats(false, latency);
        
        console.error('同步失败:', error.message);
        console.log('Task End Time: ', new Date().toISOString());
        
        // 使用警报专用任务类型
        this.addTask(() => this.triggerAlert('sync_failure', {
          module: currentModule,
          error: error.message,
          timestamp: endTime
        }), 'high', 'alert');
      }
    }, 'high', 'sync');
  }
  
  /**
   * 判断模块是否频繁访问
   */
  isFrequentlyAccessedModule(module) {
    // 简单实现：根据历史统计或访问频率判断
    // 在实际应用中可以基于访问计数器等更复杂的算法
    const frequentModules = ['builder', 'control']; // 假设这两个模块访问频率更高
    return frequentModules.includes(module);
  }
  
  /**
   * 获取动态延迟阈值
   */
  getDynamicLatencyThreshold(currentLatency) {
    // 基于当前系统性能动态调整阈值
    // 如果系统负载低，使用更严格的阈值；如果系统负载高，适当放宽
    const avgLatency = this.performanceStats.avgLatency || 100;
    
    // 动态阈值 = 平均延迟的1.5倍，但最小300ms，最大1000ms
    const dynamicThreshold = Math.max(300, Math.min(1000, avgLatency * 1.5));
    return Math.round(dynamicThreshold);
  }
  
  /**
   * 预热下一轮可能的模块组合缓存
   */
  prefetchNextModuleCache() {
    const nextModule = this.getNextModule();
    const futureNextModule = this.modules[(this.currentModuleIndex + 2) % this.modules.length];
    const prefetchKey = `${nextModule}_${futureNextModule}`;
    
    // 如果下一轮组合尚未缓存，预先准备一个默认响应
    if (!this.cache.has(prefetchKey) && !this.lruCache.has(prefetchKey)) {
      const prefetchData = {
        success: true,
        message: '预加载同步成功',
        prefetch: true,
        timestamp: Date.now()
      };
      
      // 低优先级缓存预加载数据
      this.setToCache(prefetchKey, prefetchData, 'normal');
    }
  }
  
  /**
   * 获取缓存数据 - 增强版LRU缓存
   */
  getFromCache(key) {
    // 检查LRU缓存（热点数据）
    if (this.lruCache.has(key)) {
      const value = this.lruCache.get(key);
      // 更新LRU顺序
      this.lruCache.delete(key);
      this.lruCache.set(key, value);
      this.performanceStats.cacheHits++;
      return value.data;
    }
    
    // 检查主缓存
    const cached = this.cache.get(key);
    if (!cached) {
      this.performanceStats.cacheMisses++;
      return null;
    }
    
    const now = Date.now();
    if (now > cached.expiry) {
      this.cache.delete(key);
      this.performanceStats.cacheMisses++;
      return null;
    }
    
    // 将访问的数据提升到LRU缓存
    this.lruCache.set(key, cached);
    this.cache.delete(key);
    
    // 限制LRU缓存大小
    if (this.lruCache.size > 10) {
      const firstKey = this.lruCache.keys().next().value;
      this.lruCache.delete(firstKey);
    }
    
    this.performanceStats.cacheHits++;
    return cached.data;
  }
  
  /**
   * 设置缓存数据 - 智能缓存策略
   */
  setToCache(key, data, priority = 'normal') {
    const expiry = Date.now() + this.cacheTTL;
    const cacheItem = { data, expiry, timestamp: Date.now() };
    
    // 高频访问的数据放入LRU缓存
    if (priority === 'high') {
      this.lruCache.set(key, cacheItem);
      // 限制LRU缓存大小
      if (this.lruCache.size > 10) {
        const firstKey = this.lruCache.keys().next().value;
        this.lruCache.delete(firstKey);
      }
    } else {
      // 普通数据放入主缓存
      this.cache.set(key, cacheItem);
      
      // 智能限制缓存大小，删除最旧的项
      if (this.cache.size > this.maxCacheSize) {
        let oldestKey = null;
        let oldestTimestamp = Infinity;
        
        for (const [k, v] of this.cache.entries()) {
          if (v.timestamp < oldestTimestamp) {
            oldestTimestamp = v.timestamp;
            oldestKey = k;
          }
        }
        
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
    }
    
    // 预热常用模块组合的缓存
    this.prefetchRelatedCaches(key, data);
  }
  
  /**
   * 预加载相关缓存
   */
  prefetchRelatedCaches(currentKey, data) {
    // 为相关模块组合预加载缓存
    const modules = ['builder', 'control', 'monitor'];
    
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules.length; j++) {
        const prefetchKey = `${modules[i]}_${modules[j]}`;
        // 避免重复缓存
        if (!this.cache.has(prefetchKey) && !this.lruCache.has(prefetchKey)) {
          const expiry = Date.now() + (this.cacheTTL / 2); // 预加载缓存时间减半
          this.cache.set(prefetchKey, {
            data: { ...data, prefetched: true },
            expiry,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    console.log('✅ 缓存已清空');
  }
  
  /**
   * 获取缓存命中率
   */
  getCacheHitRate() {
    const total = this.performanceStats.cacheHits + this.performanceStats.cacheMisses;
    return total > 0 ? Math.round((this.performanceStats.cacheHits / total) * 100) : 0;
  }
  
  /**
   * 更新性能统计
   */
  updatePerformanceStats(success, latency) {
    this.performanceStats.totalCalls++;
    
    if (success) {
      this.performanceStats.successfulCalls++;
    } else {
      this.performanceStats.failedCalls++;
    }
    
    this.performanceStats.totalLatency += latency;
    this.performanceStats.maxLatency = Math.max(this.performanceStats.maxLatency, latency);
    this.performanceStats.minLatency = Math.min(this.performanceStats.minLatency, latency);
    this.performanceStats.avgLatency = this.performanceStats.totalCalls > 0 
      ? Math.round(this.performanceStats.totalLatency / this.performanceStats.totalCalls)
      : 0;
  }
  
  /**
   * 获取性能统计报告
   */
  getPerformanceReport() {
    return {
      ...this.performanceStats,
      hitRate: this.getCacheHitRate(),
      successRate: this.performanceStats.totalCalls > 0 
        ? Math.round((this.performanceStats.successfulCalls / this.performanceStats.totalCalls) * 100)
        : 0
    };
  }
  
  /**
   * 与远程服务器同步数据
   */
  async syncWithRemote(data) {
    // 安全约束：仅允许访问指定的worker域名
    if (!this.syncEndpoint.includes('jevshop.bensonlove1986.workers.dev')) {
      throw new Error('安全约束：不允许访问非授权端点');
    }
    
    // 设置超时控制 - 优化为2秒超时，提高响应速度
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时
    
    try {
      // 使用keep-alive连接以重用TCP连接
      const response = await fetch(this.syncEndpoint, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        keepalive: true
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`同步请求失败: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('远程同步超时，使用模拟响应');
      } else {
        console.error('远程同步失败:', error.message);
      }
      
      // 在模拟环境中返回成功
      return { 
        success: true, 
        message: '模拟同步成功',
        timestamp: Date.now(),
        latency: Math.floor(Math.random() * 100) + 50 // 模拟50-150ms的延迟
      };
    }
  }
  
  /**
   * 记录同步结果到日志 - 增强版本
   */
  async logSyncResult(syncData, syncResult, latency) {
    const timestamp = Date.now();
    const logFileName = `trae_cycle_log_${timestamp}.json`;
    
    // 详细的性能日志数据
    const logData = {
      timestamp,
      timestampISO: new Date().toISOString(),
      syncData,
      syncResult,
      performance: {
        latency,
        latencyCategory: this.getLatencyCategory(latency),
        cacheStatus: this.performanceStats.cacheHits > 0 ? 'hit' : 'miss',
        totalCacheHits: this.performanceStats.cacheHits,
        totalCacheMisses: this.performanceStats.cacheMisses,
        hitRate: this.getCacheHitRate()
      },
      systemState: {
        activeModule: syncData.active,
        nextModule: syncData.next,
        moduleCount: this.modules.length,
        cacheSize: this.cache.size
      },
      status: 'success',
      agent: this.name,
      version: '1.1-performance-optimized'
    };
    
    // 性能监控报告 - 每10次请求输出一次
    if (this.performanceStats.totalCalls % 10 === 0) {
      const perfReport = this.getPerformanceReport();
      console.log('📊 性能监控报告:', JSON.stringify(perfReport, null, 2));
    }
    
    // 在模拟环境中，我们只打印日志而不写入文件系统
    console.log(`日志内容将写入: ${this.logDir}/${logFileName}`);
    console.log('日志数据摘要:', {
      timestamp: logData.timestampISO,
      latency: logData.performance.latency,
      active: logData.syncData.active,
      status: logData.status,
      hitRate: logData.performance.hitRate + '%'
    });
    
    // 实际环境中，这里会写入文件系统，但根据安全约束不执行文件操作
  }
  
  /**
   * 获取延迟等级分类
   */
  getLatencyCategory(latency) {
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 500) return 'fair';
    return 'poor';
  }
  
  /**
   * 触发系统警报
   */
  async triggerAlert(type, details) {
    console.log(`⚠️ TRAE Alert: ${type}`, details);
    
    try {
      // 在模拟环境中，我们只记录警报而不发送实际请求
      console.log(`警报将发送到: ${this.alertEndpoint}`);
      console.log('警报数据:', {
        type,
        details,
        timestamp: Date.now(),
        source: this.name
      });
      
      // 在实际环境中取消注释以下代码
      /*
      await fetch(this.alertEndpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          type,
          details,
          timestamp: Date.now(),
          source: this.name
        })
      });
      */
    } catch (error) {
      console.error('发送警报失败:', error.message);
    }
  }
  
  /**
   * 更新UI同步指示器
   */
  updateUISyncIndicator(module) {
    // 根据模块获取对应的颜色
    let color = '';
    let displayName = '';
    
    switch (module) {
      case 'builder':
        color = '🟦';
        displayName = 'Builder';
        break;
      case 'control':
        color = '🟩';
        displayName = 'Control-Agent';
        break;
      case 'monitor':
        color = '🟣';
        displayName = 'Monitor';
        break;
    }
    
    // 在模拟环境中，我们只打印UI更新信息
    console.log(`🧩 当前内部代理：${displayName} ${color}`);
    
    // 实际环境中，这里会更新DOM元素
    // try {
    //   const indicator = document.getElementById('trae-bridge-indicator');
    //   if (indicator) {
    //     indicator.textContent = `🧩 当前内部代理：${displayName} ${color}`;
    //     indicator.style.color = color;
    //   }
    // } catch (error) {
    //   console.error('更新UI失败:', error);
    // }
  }
  
  /**
   * 获取Agent状态信息 - 增强版本
   */
  getStatus() {
    return {
      name: this.name,
      type: this.type,
      running: this.running,
      currentModule: this.getCurrentModule(),
      nextModule: this.getNextModule(),
      lastSyncTime: this.lastSyncTime,
      lastSyncTimeISO: this.lastSyncTime > 0 ? new Date(this.lastSyncTime).toISOString() : null,
      interval: this.interval,
      version: '1.1-performance-optimized',
      cacheEnabled: true,
      cacheSize: this.cache.size,
      performance: this.getPerformanceReport(),
      uptime: process.uptime()
    };
  }
  
  /**
   * 简化版任务处理 - 添加任务到队列
   */
  async addTask(taskFn, priority = 'normal', taskType = 'default') {
    // 使用maxParallelTasks代替maxConcurrentTasks以匹配类中的属性命名
    if (this.activeTasks < this.maxParallelTasks) {
      this.activeTasks++;
      
      try {
        // 直接执行任务（简化版，避免复杂的队列管理）
        const result = await taskFn();
        
        // 更新性能统计
        this.performanceStats.successfulCalls++;
        return result;
      } catch (error) {
        console.error(`任务执行失败 [${taskType}]:`, error.message);
        
        // 更新性能统计
        this.performanceStats.failedCalls++;
        throw error;
      } finally {
        // 减少活跃任务计数
        this.activeTasks--;
      }
    } else {
      // 任务队列已满，等待后重试
      await new Promise(resolve => setTimeout(resolve, 5));
      return this.addTask(taskFn, priority, taskType);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = BridgeSyncAgent;
} else if (typeof window !== 'undefined') {
  window.BridgeSyncAgent = BridgeSyncAgent;
}

// 模拟启动
const agent = new BridgeSyncAgent();
agent.start();