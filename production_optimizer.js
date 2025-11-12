// JEV 系统生产环境优化模块
// 提供多区域部署、动态缓存TTL、自动备份和负载均衡支持

/**
 * 增强的全局缓存管理器 - 支持动态TTL调整和多区域部署优化
 */
class EnhancedGlobalCache {
  constructor(env) {
    this.cache = new Map();
    // 从环境变量获取配置或使用默认值
    this.minTtl = parseInt(env.MIN_CACHE_TTL || 60000); // 最小TTL 1分钟
    this.maxTtl = parseInt(env.MAX_CACHE_TTL || 3600000); // 最大TTL 1小时
    this.defaultTtl = 300000; // 默认5分钟
    this.maxItems = parseInt(env.CACHE_MAX_ITEMS || 1000);
    this.dynamicTtlEnabled = env.DYNAMIC_CACHE_TTL === 'true';
    this.env = env;
    
    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      lastDynamicAdjustment: Date.now(),
      regionRequests: {}
    };
    
    // 请求速率监控
    this.requestRates = [];
    this.lastRequestTime = Date.now();
    
    // 启动动态TTL调整器
    if (this.dynamicTtlEnabled) {
      this.startDynamicTtlAdjuster();
    }
  }
  
  /**
   * 获取缓存项
   */
  get(key, region = 'global') {
    const item = this.cache.get(key);
    this.updateRequestStats(region);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }
  
  /**
   * 设置缓存项
   */
  set(key, value, region = 'global', customTtl = null) {
    // 检查缓存是否已满
    if (this.cache.size >= this.maxItems) {
      this.evictOldest();
    }
    
    // 使用动态TTL或自定义TTL
    const ttlToUse = customTtl || this.getCurrentTtl();
    const expiry = Date.now() + ttlToUse;
    
    this.cache.set(key, {
      value,
      expiry,
      region,
      createdAt: Date.now()
    });
    
    this.stats.sets++;
  }
  
  /**
   * 根据当前负载动态获取TTL
   */
  getCurrentTtl() {
    if (!this.dynamicTtlEnabled) {
      return this.defaultTtl;
    }
    
    const currentRate = this.calculateAverageRequestRate();
    const hitRate = this.getHitRate();
    
    // 综合考虑请求速率和命中率
    let adjustedTtl = this.defaultTtl;
    
    // 高负载情况
    if (currentRate > 100) {
      // 高请求率且低命中率，大幅缩短TTL
      if (hitRate < 30) {
        adjustedTtl = Math.max(this.minTtl, this.defaultTtl / 4);
      } else {
        // 高请求率但命中率尚可，适度缩短TTL
        adjustedTtl = Math.max(this.minTtl, this.defaultTtl / 2);
      }
    }
    // 中负载情况
    else if (currentRate > 20) {
      // 保持默认TTL
      adjustedTtl = this.defaultTtl;
    }
    // 低负载情况
    else {
      // 低请求率且高命中率，大幅延长TTL
      if (hitRate > 70) {
        adjustedTtl = Math.min(this.maxTtl, this.defaultTtl * 4);
      } else {
        // 低请求率但命中率一般，适度延长TTL
        adjustedTtl = Math.min(this.maxTtl, this.defaultTtl * 2);
      }
    }
    
    return adjustedTtl;
  }
  
  /**
   * 更新请求统计信息
   */
  updateRequestStats(region) {
    const now = Date.now();
    this.requestRates.push(now);
    
    // 更新区域请求统计
    if (!this.stats.regionRequests[region]) {
      this.stats.regionRequests[region] = 0;
    }
    this.stats.regionRequests[region]++;
    
    // 只保留最近10秒的请求时间戳
    this.requestRates = this.requestRates.filter(time => now - time < 10000);
    
    // 清理过期项目（懒惰删除）
    if (now - this.lastRequestTime > 60000) { // 每分钟清理一次
      this.evictExpired();
      this.lastRequestTime = now;
    }
  }
  
  /**
   * 计算平均请求速率（每秒）
   */
  calculateAverageRequestRate() {
    if (this.requestRates.length < 2) return 0;
    
    const timeWindow = 10000; // 10秒窗口
    const now = Date.now();
    const recentRequests = this.requestRates.filter(time => now - time < timeWindow);
    
    return recentRequests.length / (timeWindow / 1000);
  }
  
  /**
   * 获取命中率百分比
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }
  
  /**
   * 启动动态TTL调整器
   */
  startDynamicTtlAdjuster() {
    // 每5分钟调整一次基础TTL
    setInterval(() => {
      const hitRate = this.getHitRate();
      const currentRate = this.calculateAverageRequestRate();
      
      // 根据命中率和请求速率综合调整默认TTL
      if (hitRate > 80 && currentRate < 50) {
        // 高命中率且低负载，增加默认TTL
        this.defaultTtl = Math.min(this.defaultTtl * 1.2, this.maxTtl);
      } else if (hitRate < 20 || currentRate > 200) {
        // 低命中率或极高负载，减少默认TTL
        this.defaultTtl = Math.max(this.defaultTtl * 0.8, this.minTtl);
      }
      
      this.stats.lastDynamicAdjustment = Date.now();
      
      // 记录调整日志
      console.log(`[动态TTL调整] 命中率: ${hitRate.toFixed(2)}%, 请求率: ${currentRate.toFixed(2)}/秒, 新TTL: ${(this.defaultTtl/1000).toFixed(0)}秒`);
    }, 300000); // 5分钟
  }
  
  /**
   * 驱逐最旧的项目
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * 驱逐所有过期项目
   */
  evictExpired() {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    this.stats.evictions += evicted;
    if (evicted > 0) {
      console.log(`[缓存清理] 驱逐了 ${evicted} 个过期项目`);
    }
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxItems,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.getHitRate(),
      evictions: this.stats.evictions,
      currentTtl: this.getCurrentTtl(),
      requestRate: this.calculateAverageRequestRate(),
      regionDistribution: this.stats.regionRequests,
      lastAdjustment: new Date(this.stats.lastDynamicAdjustment).toISOString()
    };
  }
}

/**
 * 自动备份管理器 - 支持R2存储备份和冗余
 */
class AutoBackupManager {
  constructor(env) {
    this.env = env;
    this.enabled = env.AUTO_BACKUP_ENABLED === 'true';
    this.backupInterval = parseInt(env.BACKUP_INTERVAL || 86400000); // 默认24小时
    this.redundancyEnabled = env.REDUNDANCY_ENABLED === 'true';
    this.lastBackupTime = null;
    this.backupHistory = [];
    
    if (this.enabled) {
      console.log('自动备份系统已启用，间隔:', Math.floor(this.backupInterval / 3600000), '小时');
    }
  }
  
  /**
   * 执行Durable Object数据备份
   */
  async backupDurableObjects(stateManagerIds = []) {
    if (!this.enabled) {
      console.log('备份系统已禁用');
      return { success: false, reason: 'backup_disabled' };
    }
    
    try {
      const backupKey = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {},
        metadata: {
          backupType: 'durable_objects',
          count: stateManagerIds.length,
          environment: this.env.ENVIRONMENT || 'production'
        }
      };
      
      // 如果有特定的Durable Object ID列表，只备份这些
      if (stateManagerIds.length > 0) {
        for (const id of stateManagerIds) {
          try {
            // 获取Durable Object数据
            const stateData = await this.fetchDurableObjectState(id);
            backupData.data[id] = stateData;
          } catch (err) {
            console.error(`备份Durable Object ${id}失败:`, err);
          }
        }
      }
      
      // 将备份数据上传到R2存储桶
      const backupResult = await this.uploadToR2(
        this.env.BACKUP_BUCKET,
        backupKey,
        JSON.stringify(backupData)
      );
      
      if (backupResult.success) {
        // 如果启用了冗余，同时备份到冗余存储桶
        if (this.redundancyEnabled && this.env.REDUNDANCY_BUCKET) {
          await this.uploadToR2(
            this.env.REDUNDANCY_BUCKET,
            backupKey,
            JSON.stringify(backupData)
          );
        }
        
        this.lastBackupTime = Date.now();
        this.backupHistory.push({
          key: backupKey,
          timestamp: this.lastBackupTime,
          size: backupData.data ? Object.keys(backupData.data).length : 0
        });
        
        // 保留最近10次备份历史
        if (this.backupHistory.length > 10) {
          this.backupHistory.shift();
        }
        
        console.log(`备份完成: ${backupKey}, 包含 ${Object.keys(backupData.data).length} 个Durable Object`);
        return { success: true, backupKey, count: Object.keys(backupData.data).length };
      }
      
      return backupResult;
    } catch (error) {
      console.error('备份过程出错:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 从R2存储桶恢复备份
   */
  async restoreFromBackup(backupKey, targetEnvironment = null) {
    try {
      // 尝试从主备份存储桶获取
      let backupData = await this.downloadFromR2(this.env.BACKUP_BUCKET, backupKey);
      
      // 如果主备份失败且启用了冗余，尝试从冗余存储桶获取
      if (!backupData && this.redundancyEnabled) {
        backupData = await this.downloadFromR2(this.env.REDUNDANCY_BUCKET, backupKey);
      }
      
      if (!backupData) {
        throw new Error(`未找到备份文件: ${backupKey}`);
      }
      
      const parsedData = JSON.parse(backupData);
      
      // 恢复Durable Object数据
      let restoredCount = 0;
      for (const [id, data] of Object.entries(parsedData.data)) {
        try {
          await this.restoreDurableObjectState(id, data, targetEnvironment);
          restoredCount++;
        } catch (err) {
          console.error(`恢复Durable Object ${id}失败:`, err);
        }
      }
      
      return { success: true, restoredCount };
    } catch (error) {
      console.error('恢复过程出错:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 获取备份历史
   */
  async listBackups() {
    try {
      const backups = [];
      
      // 列出主备份存储桶中的备份文件
      const mainBackups = await this.listR2Files(this.env.BACKUP_BUCKET, 'backup_');
      backups.push(...mainBackups);
      
      // 如果启用了冗余，也列出冗余存储桶中的备份
      if (this.redundancyEnabled) {
        const redundancyBackups = await this.listR2Files(this.env.REDUNDANCY_BUCKET, 'backup_');
        // 合并去重
        const existingKeys = new Set(mainBackups.map(b => b.key));
        for (const backup of redundancyBackups) {
          if (!existingKeys.has(backup.key)) {
            backups.push({ ...backup, fromRedundancy: true });
          }
        }
      }
      
      // 按时间戳排序
      backups.sort((a, b) => b.timestamp - a.timestamp);
      
      return { success: true, backups };
    } catch (error) {
      console.error('列出备份失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 私有辅助方法
  
  async fetchDurableObjectState(id) {
    // 这里应该实现获取Durable Object状态的逻辑
    // 实际实现需要根据您的Durable Object接口进行调整
    const response = await fetch(`http://localhost:8787/internal/state/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.env.INTERNAL_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取状态失败: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async restoreDurableObjectState(id, data, targetEnvironment) {
    // 这里应该实现恢复Durable Object状态的逻辑
    const url = targetEnvironment 
      ? `http://localhost:8787/internal/restore/${id}?env=${targetEnvironment}`
      : `http://localhost:8787/internal/restore/${id}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.INTERNAL_API_KEY}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`恢复状态失败: ${response.status}`);
    }
  }
  
  async uploadToR2(bucket, key, data) {
    try {
      // 在实际环境中，这里应该使用Cloudflare Workers的R2 API
      // 这是一个模拟实现
      console.log(`上传备份到 ${bucket}: ${key}, 大小: ${data.length} 字节`);
      
      // 实际实现示例（在Worker环境中）:
      // await bucket.put(key, data, {
      //   httpMetadata: { contentType: 'application/json' },
      //   customMetadata: { backupTimestamp: new Date().toISOString() }
      // });
      
      return { success: true, key };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async downloadFromR2(bucket, key) {
    try {
      // 在实际环境中，这里应该使用Cloudflare Workers的R2 API
      console.log(`从 ${bucket} 下载备份: ${key}`);
      
      // 模拟实现，实际环境中需要调整
      return null; // 实际应该返回下载的数据
    } catch (error) {
      console.error(`下载备份失败:`, error);
      return null;
    }
  }
  
  async listR2Files(bucket, prefix) {
    try {
      // 模拟实现
      return [];
    } catch (error) {
      console.error(`列出文件失败:`, error);
      return [];
    }
  }
  
  /**
   * 获取备份管理器状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      redundancyEnabled: this.redundancyEnabled,
      backupInterval: this.backupInterval,
      lastBackup: this.lastBackupTime ? new Date(this.lastBackupTime).toISOString() : null,
      backupHistory: this.backupHistory
    };
  }
}

/**
 * 多区域部署优化器
 */
class MultiRegionOptimizer {
  constructor(env) {
    this.env = env;
    this.regions = env.WORKER_REGIONS ? env.WORKER_REGIONS.split(',') : ['global'];
    this.regionStats = {};
    this.loadBalancingEnabled = env.LOAD_BALANCING_ENABLED === 'true';
    
    // 初始化区域统计
    for (const region of this.regions) {
      this.regionStats[region] = {
        requests: 0,
        errors: 0,
        latency: [],
        active: true
      };
    }
  }
  
  /**
   * 获取请求的最佳区域
   */
  getBestRegion(request) {
    if (!this.loadBalancingEnabled || this.regions.length <= 1) {
      return this.regions[0] || 'global';
    }
    
    // 基于请求头确定地理位置
    const cf = request.cf || {};
    const country = cf.country;
    const continent = cf.continent;
    
    // 简单的地理位置路由逻辑
    if (continent === 'AS') {
      return 'APAC';
    } else if (continent === 'EU') {
      return 'EU';
    } else if (continent === 'NA') {
      return 'NAM';
    } else if (continent === 'SA') {
      return 'SAM';
    }
    
    // 回退到全局区域
    return 'global';
  }
  
  /**
   * 更新区域统计信息
   */
  updateRegionStats(region, success = true, latency = null) {
    if (!this.regionStats[region]) {
      this.regionStats[region] = {
        requests: 0,
        errors: 0,
        latency: [],
        active: true
      };
    }
    
    const stats = this.regionStats[region];
    stats.requests++;
    
    if (!success) {
      stats.errors++;
    }
    
    if (latency !== null) {
      stats.latency.push(latency);
      // 只保留最近100个延迟数据点
      if (stats.latency.length > 100) {
        stats.latency.shift();
      }
    }
    
    // 检查区域健康状态
    this.checkRegionHealth(region);
  }
  
  /**
   * 检查区域健康状态
   */
  checkRegionHealth(region) {
    const stats = this.regionStats[region];
    if (!stats) return;
    
    // 如果错误率超过20%，标记区域为非活动
    const errorRate = stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0;
    const avgLatency = stats.latency.length > 0 
      ? stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length
      : 0;
    
    // 如果错误率过高或延迟过大，禁用该区域
    if ((errorRate > 20 && stats.requests > 10) || avgLatency > 2000) {
      stats.active = false;
      console.warn(`区域 ${region} 已被标记为非活动: 错误率=${errorRate.toFixed(2)}%, 延迟=${avgLatency.toFixed(2)}ms`);
      
      // 5分钟后尝试重新激活区域
      setTimeout(() => {
        if (this.regionStats[region]) {
          this.regionStats[region].active = true;
          this.regionStats[region].errors = 0;
          this.regionStats[region].requests = 0;
          console.log(`区域 ${region} 已重新激活`);
        }
      }, 300000);
    }
  }
  
  /**
   * 获取所有区域的健康状态
   */
  getRegionsHealth() {
    const health = {};
    
    for (const [region, stats] of Object.entries(this.regionStats)) {
      const errorRate = stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0;
      const avgLatency = stats.latency.length > 0 
        ? stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length
        : 0;
      
      health[region] = {
        active: stats.active,
        requests: stats.requests,
        errorRate: errorRate.toFixed(2),
        avgLatency: avgLatency.toFixed(2),
        status: stats.active ? 'healthy' : 'unhealthy'
      };
    }
    
    return health;
  }
}

/**
 * 生产环境优化器主类
 */
class ProductionOptimizer {
  constructor(env) {
    this.env = env;
    this.cache = new EnhancedGlobalCache(env);
    this.backupManager = new AutoBackupManager(env);
    this.regionOptimizer = new MultiRegionOptimizer(env);
    this.startedAt = Date.now();
  }
  
  /**
   * 初始化优化器
   */
  async initialize() {
    console.log('JEV生产环境优化器已初始化');
    
    // 如果启用了自动备份，设置定期备份
    if (this.backupManager.enabled) {
      const interval = parseInt(this.env.BACKUP_INTERVAL || 86400000);
      setInterval(async () => {
        try {
          console.log('执行定期自动备份...');
          await this.backupManager.backupDurableObjects();
        } catch (error) {
          console.error('定期备份失败:', error);
        }
      }, interval);
    }
  }
  
  /**
   * 处理请求前的优化
   */
  async optimizeRequest(request) {
    const startTime = performance.now();
    const region = this.regionOptimizer.getBestRegion(request);
    
    // 添加区域信息到请求上下文
    request.jevContext = {
      region,
      startTime,
      optimized: true
    };
    
    return request;
  }
  
  /**
   * 处理响应后的优化
   */
  async optimizeResponse(request, response, success = true) {
    if (!request.jevContext) return response;
    
    const { region, startTime } = request.jevContext;
    const latency = performance.now() - startTime;
    
    // 更新区域统计
    this.regionOptimizer.updateRegionStats(region, success, latency);
    
    // 添加优化信息到响应头
    const headers = new Headers(response.headers);
    headers.set('X-JEV-Region', region);
    headers.set('X-JEV-Latency', latency.toFixed(2));
    headers.set('X-JEV-Cache-Hit-Rate', this.cache.getHitRate().toFixed(2));
    
    // 复制响应体
    const body = response.body ? await response.clone().arrayBuffer() : null;
    
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  
  /**
   * 获取系统优化状态
   */
  getOptimizationStatus() {
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptime: Date.now() - this.startedAt,
      cache: this.cache.getStats(),
      backup: this.backupManager.getStatus(),
      regions: this.regionOptimizer.getRegionsHealth(),
      environment: this.env.ENVIRONMENT || 'production'
    };
  }
  
  /**
   * 执行手动备份
   */
  async performManualBackup(objectIds = []) {
    return await this.backupManager.backupDurableObjects(objectIds);
  }
  
  /**
   * 从备份恢复
   */
  async restoreFromBackup(backupKey, targetEnvironment = null) {
    return await this.backupManager.restoreFromBackup(backupKey, targetEnvironment);
  }
  
  /**
   * 获取缓存管理接口
   */
  getCache() {
    return this.cache;
  }
}

// 导出生产环境优化器模块
module.exports = {
  ProductionOptimizer,
  EnhancedGlobalCache,
  AutoBackupManager,
  MultiRegionOptimizer
};

// 在Cloudflare Worker环境中直接暴露
globalThis.ProductionOptimizer = ProductionOptimizer;
globalThis.EnhancedGlobalCache = EnhancedGlobalCache;
globalThis.AutoBackupManager = AutoBackupManager;
globalThis.MultiRegionOptimizer = MultiRegionOptimizer;