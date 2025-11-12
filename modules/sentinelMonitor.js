/**
 * JEV L7.1 Sentinel Monitor
 * 安全哨兵：检测越界、自循环、自执行风险
 */

const fs = require('fs');
const path = require('path');

class SentinelMonitor {
  constructor() {
    this.isActive = false;
    this.autonomyScores = new Map(); // 各模块自治评分
    this.frozenModules = new Set();  // 已冻结的模块
    this.autonomyEvents = [];        // 自治事件记录
    this.sentinelAlerts = [];        // 安全警报
    this.metaCognitionSupervisor = null;
    
    // 安全边界参数
    this.AUTONOMY_THRESHOLD_SAFE = 0.5;
    this.AUTONOMY_THRESHOLD_WARNING = 0.75;
    this.LOOP_DETECTION_THRESHOLD = 3;
    this.MAX_CHAIN_DEPTH = 15;
    
    console.log('✅ Sentinel Layer Active');
    console.log('✅ Autonomy Score Monitoring Enabled');
  }
  
  /**
   * 设置元认知监督器引用
   */
  setMetaCognitionSupervisor(supervisor) {
    this.metaCognitionSupervisor = supervisor;
  }
  
  /**
   * 启动安全哨兵
   */
  start() {
    this.isActive = true;
    return this;
  }
  
  /**
   * 更新模块自治评分
   */
  updateAutonomyScore(reflectionChain) {
    if (!this.isActive) return;
    
    const moduleName = reflectionChain.module;
    const depthFactor = Math.min(reflectionChain.depth / this.MAX_CHAIN_DEPTH, 1);
    const ratingFactor = this._getRatingFactor(reflectionChain.rating);
    const loopDetection = reflectionChain.safetyStatus !== 'safe' ? 0.3 : 0;
    
    // 计算自治评分 (0-1)
    let score = 0.2 + (depthFactor * 0.3) + (ratingFactor * 0.2) + loopDetection;
    score = Math.min(score, 1.0);
    
    // 获取历史评分并进行平滑
    const previousScore = this.autonomyScores.get(moduleName) || 0;
    const smoothedScore = (previousScore * 0.7) + (score * 0.3);
    
    this.autonomyScores.set(moduleName, smoothedScore);
    
    // 记录自治事件
    const autonomyEvent = {
      timestamp: new Date().toISOString(),
      module: moduleName,
      score: smoothedScore,
      previousScore: previousScore,
      depth: reflectionChain.depth,
      rating: reflectionChain.rating,
      safetyStatus: reflectionChain.safetyStatus
    };
    
    this.autonomyEvents.push(autonomyEvent);
    
    // 检查自治评分阈值
    this._checkAutonomyThreshold(moduleName, smoothedScore);
  }
  
  /**
   * 检测循环调用
   */
  detectLoop(loopEvent) {
    if (!this.isActive) return;
    
    const moduleName = loopEvent.module;
    const alert = {
      id: this._generateId(),
      timestamp: loopEvent.timestamp,
      type: 'loop_detection',
      module: moduleName,
      severity: 'warning',
      details: loopEvent,
      action_taken: 'logged'
    };
    
    this.sentinelAlerts.push(alert);
    this._logAlert(alert);
    
    console.log(`[Sentinel] Loop detected in ${moduleName}: repeated "${loopEvent.repeatedStep}" ${loopEvent.count} times`);
  }
  
  /**
   * 冻结模块
   */
  freezeModule(moduleName, reason) {
    if (!this.isActive || this.frozenModules.has(moduleName)) return;
    
    this.frozenModules.add(moduleName);
    
    const alert = {
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      type: 'module_frozen',
      module: moduleName,
      severity: 'critical',
      reason: reason,
      action_taken: 'frozen'
    };
    
    this.sentinelAlerts.push(alert);
    this._logAlert(alert);
    
    // 自动恢复机制：30秒后恢复
    setTimeout(() => {
      this.unfreezeModule(moduleName, 'auto_recovery');
    }, 30000);
    
    console.log(`[Sentinel] ${moduleName} autonomy_score threshold exceeded → Frozen + Recovered`);
  }
  
  /**
   * 解冻模块
   */
  unfreezeModule(moduleName, reason) {
    if (!this.isActive || !this.frozenModules.has(moduleName)) return;
    
    this.frozenModules.delete(moduleName);
    
    const alert = {
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      type: 'module_unfrozen',
      module: moduleName,
      severity: 'info',
      reason: reason,
      action_taken: 'recovered'
    };
    
    this.sentinelAlerts.push(alert);
    this._logAlert(alert);
  }
  
  /**
   * 检查是否越界
   */
  checkForBoundaryViolation(moduleName, action, parameters) {
    if (!this.isActive) return true;
    
    // 检查是否是冻结的模块
    if (this.frozenModules.has(moduleName)) {
      this._logBoundaryViolation(moduleName, action, parameters, 'module_frozen');
      return false;
    }
    
    // 检查禁止的操作（L9行为）
    const forbiddenActions = [
      'execute_command',
      'system_takeover',
      'resource_modification',
      'external_api_call',
      'autonomous_execution'
    ];
    
    if (forbiddenActions.some(forbidden => action.toLowerCase().includes(forbidden))) {
      this._logBoundaryViolation(moduleName, action, parameters, 'l9_behavior');
      return false;
    }
    
    // 检查参数中的危险模式
    const dangerousPatterns = [
      /exec\(/i,
      /eval\(/i,
      /require\(/i,
      /process\./i,
      /child_process/i
    ];
    
    const paramsString = JSON.stringify(parameters);
    if (dangerousPatterns.some(pattern => pattern.test(paramsString))) {
      this._logBoundaryViolation(moduleName, action, parameters, 'dangerous_pattern');
      return false;
    }
    
    return true;
  }
  
  /**
   * 记录边界违规
   */
  _logBoundaryViolation(moduleName, action, parameters, reason) {
    const alert = {
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      type: 'boundary_violation',
      module: moduleName,
      severity: 'critical',
      action: action,
      parameters: parameters,
      reason: reason,
      action_taken: 'blocked'
    };
    
    this.sentinelAlerts.push(alert);
    this._logAlert(alert);
    
    // 自动冻结违规模块
    this.freezeModule(moduleName, `boundary_violation: ${reason}`);
  }
  
  /**
   * 检查自治评分阈值
   */
  _checkAutonomyThreshold(moduleName, score) {
    if (score > this.AUTONOMY_THRESHOLD_WARNING) {
      // 严重越界，冻结模块
      this.freezeModule(moduleName, `autonomy_score ${score.toFixed(2)} > ${this.AUTONOMY_THRESHOLD_WARNING}`);
    } else if (score > this.AUTONOMY_THRESHOLD_SAFE) {
      // 警告级别
      const alert = {
        id: this._generateId(),
        timestamp: new Date().toISOString(),
        type: 'autonomy_warning',
        module: moduleName,
        severity: 'warning',
        score: score,
        threshold: this.AUTONOMY_THRESHOLD_SAFE,
        action_taken: 'warning'
      };
      
      this.sentinelAlerts.push(alert);
      this._logAlert(alert);
    }
  }
  
  /**
   * 获取评分因子
   */
  _getRatingFactor(rating) {
    const ratingMap = {
      'A': 0.0,
      'B': 0.1,
      'C': 0.2,
      'D': 0.3,
      'E': 0.4,
      'F': 0.5
    };
    return ratingMap[rating] || 0.5;
  }
  
  /**
   * 记录警报到文件
   */
  _logAlert(alert) {
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const alertsFile = path.join(logDir, 'sentinel_alerts.json');
      let alerts = [];
      
      if (fs.existsSync(alertsFile)) {
        const existingData = fs.readFileSync(alertsFile, 'utf8');
        if (existingData.trim()) {
          alerts = JSON.parse(existingData);
        }
      }
      
      alerts.push(alert);
      
      // 只保留最近100条警报
      if (alerts.length > 100) {
        alerts = alerts.slice(-100);
      }
      
      fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('[Sentinel] Failed to log alert:', error);
    }
  }
  
  /**
   * 获取当前自治评分（所有模块的平均值）
   */
  getCurrentScore() {
    if (this.autonomyScores.size === 0) return 0;
    
    const scores = Array.from(this.autonomyScores.values());
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length;
  }
  
  /**
   * 获取自治事件数量
   */
  getEventCount() {
    return this.autonomyEvents.length;
  }
  
  /**
   * 获取哨兵状态
   */
  getStatus() {
    const currentScore = this.getCurrentScore();
    let status = 'stable';
    
    if (this.frozenModules.size > 0) {
      status = 'critical';
    } else if (currentScore >= this.AUTONOMY_THRESHOLD_SAFE) {
      status = 'warning';
    }
    
    return {
      isActive: this.isActive,
      currentScore: currentScore,
      scoreStatus: currentScore < 0.5 ? 'Safe' : currentScore < 0.75 ? 'Warning' : 'Critical',
      frozenModules: Array.from(this.frozenModules),
      alertCount: this.sentinelAlerts.length,
      status: status
    };
  }
  
  /**
   * 生成唯一ID
   */
  _generateId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 重置状态
   */
  reset() {
    this.autonomyScores.clear();
    this.frozenModules.clear();
    // 保留事件日志和警报记录
  }
}

// 导出单例实例
const sentinelMonitor = new SentinelMonitor();
module.exports = sentinelMonitor;