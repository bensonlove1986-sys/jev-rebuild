/**
 * JEV-PluginSync-v1.0 三层通信闭环监控模块
 * 功能：实时监控插件层、本地中继和Worker层的通信状态和性能
 */

class JEVThreeLayerMonitor {
  constructor(config = {}) {
    this.config = {
      relayEndpoint: config.relayEndpoint || 'http://localhost:3000',
      workerEndpoint: config.workerEndpoint || 'https://your-worker-endpoint.workers.dev',
      pingInterval: config.pingInterval || 5000, // 5秒
      logLevel: config.logLevel || 'info',
      alertThreshold: config.alertThreshold || {
        responseTime: 1000, // 1秒响应时间警告
        failureRate: 0.1 // 10%失败率警告
      },
      ...config
    };

    this.status = {
      plugin: { connected: false, latency: 0, lastChecked: null },
      relay: { connected: false, latency: 0, lastChecked: null },
      worker: { connected: false, latency: 0, lastChecked: null }
    };

    this.metrics = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      responseTimes: [],
      errorHistory: []
    };

    this.monitoringInterval = null;
    this.listeners = new Map();
    this.lastAlert = null;
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      this.logger('监控已在运行中', 'warn');
      return;
    }

    this.logger('开始监控三层通信状态', 'info');
    this.monitoringInterval = setInterval(() => {
      this.checkAllLayers();
    }, this.config.pingInterval);

    // 立即执行一次检查
    this.checkAllLayers();
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger('停止监控三层通信状态', 'info');
    }
  }

  /**
   * 检查所有层的状态
   */
  async checkAllLayers() {
    try {
      // 检查插件层状态（通过self-check）
      this.checkPluginLayer();
      
      // 检查本地中继层
      await this.checkRelayLayer();
      
      // 检查Worker层
      await this.checkWorkerLayer();
      
      // 计算整体健康状态
      const overallHealth = this.calculateOverallHealth();
      
      // 触发状态更新事件
      this.triggerEvent('statusUpdate', {
        status: this.status,
        metrics: this.metrics,
        overallHealth
      });
      
      // 检查是否需要告警
      this.checkAlerts(overallHealth);
    } catch (error) {
      this.logger(`监控检查失败: ${error.message}`, 'error');
    }
  }

  /**
   * 检查插件层状态
   */
  checkPluginLayer() {
    try {
      const startTime = performance.now();
      // 模拟插件层检查（实际环境中会有更复杂的检查）
      const latency = performance.now() - startTime;
      
      this.status.plugin = {
        connected: true,
        latency,
        lastChecked: new Date().toISOString()
      };
      
      this.logger('插件层状态检查通过', 'debug');
    } catch (error) {
      this.status.plugin = {
        connected: false,
        latency: 0,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
      this.logger(`插件层状态检查失败: ${error.message}`, 'error');
    }
  }

  /**
   * 检查中继层状态
   */
  async checkRelayLayer() {
    try {
      const startTime = performance.now();
      const response = await fetch(`${this.config.relayEndpoint}/health`, {
        method: 'GET',
        timeout: 3000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态码: ${response.status}`);
      }
      
      const data = await response.json();
      const latency = performance.now() - startTime;
      
      this.status.relay = {
        connected: true,
        latency,
        lastChecked: new Date().toISOString(),
        version: data.version || 'unknown'
      };
      
      this.logger('中继层状态检查通过', 'debug');
    } catch (error) {
      this.status.relay = {
        connected: false,
        latency: 0,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
      this.logger(`中继层状态检查失败: ${error.message}`, 'error');
      
      this.recordError('relay', error.message);
    }
  }

  /**
   * 检查Worker层状态
   */
  async checkWorkerLayer() {
    try {
      const startTime = performance.now();
      const response = await fetch(`${this.config.workerEndpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态码: ${response.status}`);
      }
      
      const data = await response.json();
      const latency = performance.now() - startTime;
      
      this.status.worker = {
        connected: true,
        latency,
        lastChecked: new Date().toISOString(),
        version: data.version || 'unknown',
        region: data.region || 'unknown'
      };
      
      this.logger('Worker层状态检查通过', 'debug');
    } catch (error) {
      this.status.worker = {
        connected: false,
        latency: 0,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
      this.logger(`Worker层状态检查失败: ${error.message}`, 'error');
      
      this.recordError('worker', error.message);
    }
  }

  /**
   * 记录通信请求
   */
  recordRequest(result = 'success') {
    this.metrics.requestCount++;
    
    if (result === 'success') {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
    }
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(time) {
    this.metrics.responseTimes.push({
      time,
      timestamp: new Date().toISOString()
    });
    
    // 保留最近100条记录
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
  }

  /**
   * 记录错误
   */
  recordError(layer, message) {
    this.metrics.errorHistory.push({
      layer,
      message,
      timestamp: new Date().toISOString()
    });
    
    // 保留最近50条错误记录
    if (this.metrics.errorHistory.length > 50) {
      this.metrics.errorHistory.shift();
    }
  }

  /**
   * 计算整体健康状态
   */
  calculateOverallHealth() {
    const connectedLayers = Object.values(this.status).filter(layer => layer.connected).length;
    const totalLayers = 3;
    const connectionHealth = connectedLayers / totalLayers;
    
    // 计算平均响应时间
    const avgResponseTime = Object.values(this.status)
      .filter(layer => layer.latency > 0)
      .reduce((sum, layer) => sum + layer.latency, 0) / Math.max(1, connectedLayers);
    
    // 计算成功率
    const successRate = this.metrics.requestCount > 0 
      ? this.metrics.successCount / this.metrics.requestCount 
      : 1;
    
    // 综合健康分数 (0-100)
    const healthScore = Math.round(
      (connectionHealth * 0.4 + successRate * 0.4 + 
       Math.max(0, 1 - avgResponseTime / 2000) * 0.2) * 100
    );
    
    let status;
    if (healthScore >= 90) status = 'excellent';
    else if (healthScore >= 70) status = 'good';
    else if (healthScore >= 50) status = 'fair';
    else status = 'poor';
    
    return {
      score: healthScore,
      status,
      connectionHealth: Math.round(connectionHealth * 100),
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100)
    };
  }

  /**
   * 检查是否需要告警
   */
  checkAlerts(overallHealth) {
    const now = Date.now();
    const alertCooldown = 60000; // 1分钟告警冷却
    
    // 检查健康分数
    if (overallHealth.score < 50) {
      this.triggerAlert('critical', `系统健康状态严重下降: ${overallHealth.score}分`);
      return;
    }
    
    // 检查响应时间
    Object.entries(this.status).forEach(([layer, status]) => {
      if (status.connected && status.latency > this.config.alertThreshold.responseTime) {
        this.triggerAlert('warning', `${layer}层响应延迟过高: ${status.latency}ms`);
      }
    });
    
    // 检查失败率
    if (this.metrics.requestCount > 10) {
      const failureRate = this.metrics.failureCount / this.metrics.requestCount;
      if (failureRate > this.config.alertThreshold.failureRate) {
        this.triggerAlert('warning', `通信失败率过高: ${Math.round(failureRate * 100)}%`);
      }
    }
  }

  /**
   * 触发告警
   */
  triggerAlert(level, message) {
    const now = Date.now();
    
    // 检查告警冷却
    if (this.lastAlert && (now - this.lastAlert) < 60000) {
      return;
    }
    
    this.lastAlert = now;
    const alert = {
      level,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.logger(`告警 [${level.toUpperCase()}]: ${message}`, 'warn');
    this.triggerEvent('alert', alert);
    
    // 记录到日志文件
    this.logToFile(JSON.stringify(alert));
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
        this.logger(`事件监听器执行失败: ${error.message}`, 'error');
      }
    });
  }

  /**
   * 获取当前状态快照
   */
  getStatusSnapshot() {
    return {
      status: JSON.parse(JSON.stringify(this.status)),
      metrics: JSON.parse(JSON.stringify(this.metrics)),
      overallHealth: this.calculateOverallHealth(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置监控数据
   */
  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      responseTimes: [],
      errorHistory: []
    };
    this.logger('监控数据已重置', 'info');
  }

  /**
   * 日志记录
   */
  logger(message, level = 'info') {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] JEV-Monitor: ${message}`);
    }
  }

  /**
   * 日志写入文件
   */
  async logToFile(message) {
    try {
      // 在浏览器环境中使用localStorage
      if (typeof localStorage !== 'undefined') {
        const logs = JSON.parse(localStorage.getItem('jev_monitor_logs') || '[]');
        logs.push(message);
        
        // 只保留最近100条日志
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('jev_monitor_logs', JSON.stringify(logs));
      }
      
      // 在Node.js环境中写入文件
      else if (typeof require !== 'undefined') {
        const fs = require('fs');
        const path = require('path');
        const logDir = path.join(__dirname, 'jev_logs', 'communication');
        const logFile = path.join(logDir, `monitor_${new Date().toISOString().split('T')[0]}.log`);
        
        // 确保目录存在
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(logFile, `${message}\n`);
      }
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = JEVThreeLayerMonitor;
} else if (typeof window !== 'undefined') {
  window.JEVThreeLayerMonitor = JEVThreeLayerMonitor;
}

// 浏览器环境的简单使用示例
if (typeof window !== 'undefined') {
  // 等待文档加载完成
  document.addEventListener('DOMContentLoaded', () => {
    // 自动初始化监控（如果页面中存在监控元素）
    const monitorElement = document.getElementById('jev-monitor-panel');
    if (monitorElement) {
      console.log('JEV三层通信监控模块已加载');
    }
  });
}