// JEV Plugin v2.0 - 核心监控逻辑

// 根据环境加载模块
let fs, path, AlertEngine, LogAnalyzer;
let isNode = typeof require !== 'undefined' && typeof window === 'undefined';

if (isNode) {
  fs = require('fs');
  path = require('path');
  AlertEngine = require('./alert_engine.js');
  LogAnalyzer = require('./log_analyzer.js');
}

class MonitorCore {
  constructor() {
    this.status = 'ACTIVE';
    this.monitorInterval = null;
    this.monitorCycle = 60000; // 默认60秒
    this.logSources = this.getLogSources();
    this.rules = [];
    this.alertEngine = isNode ? new AlertEngine() : null;
    this.logAnalyzer = isNode ? new LogAnalyzer() : null;
    this.healthData = this.initializeHealthData();
    this.ruleViolations = {};
    
    // 初始化
    this.loadRules();
    if (isNode) {
      this.loadSystemHealth();
    }
  }

  // 获取日志来源路径
  getLogSources() {
    if (isNode) {
      return {
        cloud: path.join(__dirname, '../../logs/cloud_log.txt'),
        plugin: path.join(__dirname, '../../JEV_Client_Plugin/logs/plugin_log.txt'),
        auth: path.join(__dirname, '../auth_log.txt')
      };
    }
    return {
      cloud: '/logs/cloud_log.txt',
      plugin: '/JEV_Client_Plugin/logs/plugin_log.txt',
      auth: '/JEV_ControlCenter/auth_log.txt'
    };
  }

  // 初始化健康数据
  initializeHealthData() {
    return {
      timestamp: new Date().toISOString(),
      status: 'OK',
      worker_latency_avg: 0,
      plugin_error_rate: 0,
      active_clients: 0,
      alerts_last_24h: 0,
      version: 'v2.0'
    };
  }

  // 加载监控规则
  loadRules() {
    try {
      if (isNode) {
        const rulesPath = path.join(__dirname, 'monitor_rules.json');
        if (fs.existsSync(rulesPath)) {
          const rulesData = fs.readFileSync(rulesPath, 'utf8');
          this.rules = JSON.parse(rulesData).rules;
        }
      } else {
        // 浏览器环境下通过fetch加载
        fetch('monitor_rules.json')
          .then(response => response.json())
          .then(data => {
            this.rules = data.rules;
          })
          .catch(error => console.error('加载规则失败:', error));
      }
    } catch (error) {
      console.error('加载监控规则失败:', error);
    }
  }

  // 加载系统健康状态
  loadSystemHealth() {
    if (!isNode) return;
    
    try {
      const healthPath = path.join(__dirname, 'system_health.json');
      if (fs.existsSync(healthPath)) {
        const healthData = fs.readFileSync(healthPath, 'utf8');
        this.healthData = JSON.parse(healthData);
      }
    } catch (error) {
      console.error('加载系统健康状态失败:', error);
    }
  }

  // 保存系统健康状态
  saveSystemHealth() {
    if (!isNode) return;
    
    try {
      const healthPath = path.join(__dirname, 'system_health.json');
      fs.writeFileSync(healthPath, JSON.stringify(this.healthData, null, 2), 'utf8');
    } catch (error) {
      console.error('保存系统健康状态失败:', error);
    }
  }

  // 开始监控
  startMonitoring() {
    if (this.monitorInterval) {
      console.log('监控已经在运行');
      return;
    }

    console.log('✅ [JEV Plugin v2.0 Monitoring System Active]');
    this.monitorInterval = setInterval(() => {
      this.runMonitorCycle();
    }, this.monitorCycle);

    // 立即运行一次
    this.runMonitorCycle();
  }

  // 停止监控
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('监控已停止');
    }
  }

  // 运行监控周期
  async runMonitorCycle() {
    try {
      // 检查系统状态
      await this.checkSystemStatus();
      
      // 扫描日志
      await this.scanLogs();
      
      // 更新健康状态
      this.updateHealthStatus();
      
      // 清理缓存
      if (this.alertEngine) {
        this.alertEngine.cleanupCache();
      }
      
      // 输出状态
      this.logStatus();
    } catch (error) {
      console.error('监控周期执行失败:', error);
    }
  }

  // 检查系统状态
  async checkSystemStatus() {
    // 模拟检查云端模块在线率
    this.healthData.cloud_online_rate = Math.random() * 20 + 80; // 模拟80-100%
    
    // 模拟Worker响应延迟
    this.healthData.worker_latency_avg = Math.floor(Math.random() * 500) + 100;
    
    // 模拟插件调用错误率
    this.healthData.plugin_error_rate = Math.random() * 5;
    
    // 模拟活跃客户端数量
    this.healthData.active_clients = Math.floor(Math.random() * 20) + 5;
    
    // 更新状态
    if (this.healthData.plugin_error_rate > 10 || this.healthData.worker_latency_avg > 2000) {
      this.healthData.status = 'CRITICAL';
    } else if (this.healthData.plugin_error_rate > 5 || this.healthData.worker_latency_avg > 1000) {
      this.healthData.status = 'WARNING';
    } else {
      this.healthData.status = 'OK';
    }
  }

  // 扫描日志
  async scanLogs() {
    if (!isNode) return;
    
    for (const [source, logPath] of Object.entries(this.logSources)) {
      if (fs.existsSync(logPath)) {
        await this.analyzeLogFile(source, logPath);
      }
    }
  }

  // 分析日志文件
  async analyzeLogFile(source, logPath) {
    try {
      const logContent = fs.readFileSync(logPath, 'utf8');
      const logLines = logContent.split('\n');
      const recentLines = logLines.slice(-100); // 只分析最近100行
      
      recentLines.forEach(line => {
        this.checkRuleViolations(source, line);
      });
    } catch (error) {
      console.error(`分析日志文件失败 ${logPath}:`, error);
    }
  }

  // 检查规则违反
  checkRuleViolations(source, line) {
    for (const rule of this.rules) {
      if (line.toLowerCase().includes(rule.pattern.toLowerCase())) {
        const violationKey = `${rule.id}:${rule.interval}`;
        this.ruleViolations[violationKey] = (this.ruleViolations[violationKey] || 0) + 1;
        
        // 检查是否超过阈值
        if (this.ruleViolations[violationKey] >= rule.threshold) {
          this.triggerAlert(rule, source);
          // 重置计数
          this.ruleViolations[violationKey] = 0;
        }
      }
    }
  }

  // 触发报警
  async triggerAlert(rule, source) {
    if (!this.alertEngine) return;
    
    const severityText = {
      high: '严重',
      medium: '中等',
      low: '低'
    }[rule.severity];
    
    const message = `[${source}] ${rule.pattern} 检测到 ${rule.threshold} 次（${severityText}级别）`;
    await this.alertEngine.sendAlert(rule.id, message, {
      source,
      severity: rule.severity,
      threshold: rule.threshold,
      interval: rule.interval
    });
    
    // 更新报警计数
    this.healthData.alerts_last_24h++;
  }

  // 更新健康状态
  updateHealthStatus() {
    this.healthData.timestamp = new Date().toISOString();
    this.saveSystemHealth();
  }

  // 记录状态
  logStatus() {
    console.log(`[${new Date().toLocaleString('zh-CN')}] 状态: ${this.healthData.status}`);
    console.log(`  - 云端在线率: ${this.healthData.cloud_online_rate?.toFixed(1)}%`);
    console.log(`  - Worker延迟: ${this.healthData.worker_latency_avg}ms`);
    console.log(`  - 插件错误率: ${this.healthData.plugin_error_rate?.toFixed(2)}%`);
    console.log(`  - 活跃客户端: ${this.healthData.active_clients}`);
    console.log(`  - 24h报警数: ${this.healthData.alerts_last_24h}`);
  }

  // 获取当前状态
  getCurrentStatus() {
    return this.healthData;
  }

  // 手动触发报警测试
  async testAlert() {
    if (this.alertEngine) {
      await this.alertEngine.sendAlert('TEST', '测试报警消息，确认报警系统正常工作');
    }
  }

  // 设置监控周期
  setMonitorCycle(ms) {
    this.monitorCycle = ms;
    if (this.monitorInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }
}

// 导出模块
if (isNode) {
  module.exports = MonitorCore;
  
  // 如果直接运行该文件，则启动监控
  if (require.main === module) {
    const monitor = new MonitorCore();
    monitor.startMonitoring();
  }
} else {
  // 浏览器环境
  window.MonitorCore = MonitorCore;
}

// 输出激活信息
console.log('✅ [JEV Plugin v2.0 Monitoring System Active]');