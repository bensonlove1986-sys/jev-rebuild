/**
 * JEV L7.1 MetaCognition Supervisor
 * 元认知监督核心模块：追踪并评估所有决策链
 */

class MetaCognitionSupervisor {
  constructor() {
    this.reflectionChains = new Map(); // 存储所有推理链
    this.loopDetections = [];          // 循环调用检测记录
    this.decisionHistory = [];         // 决策历史
    this.metaFeedbackLog = [];         // 元反馈日志
    this.sentinelMonitor = null;       // 安全哨兵引用
    this.isActive = false;
    
    console.log('[L7.1][MetaCognitionSupervisor] Initialization Complete');
  }
  
  /**
   * 启动元认知监督器
   */
  start() {
    this.isActive = true;
    console.log('✅ Meta-Reflection System Online');
    return this;
  }
  
  /**
   * 设置安全哨兵引用
   */
  setSentinelMonitor(sentinel) {
    this.sentinelMonitor = sentinel;
  }
  
  /**
   * 开始一个新的推理链
   */
  startReflectionChain(moduleName, decision) {
    if (!this.isActive) return null;
    
    const chainId = this._generateId();
    const timestamp = new Date().toISOString();
    
    const chain = {
      id: chainId,
      module: moduleName,
      decision: decision,
      startTime: timestamp,
      depth: 0,
      steps: [],
      status: 'active',
      rating: 'A',
      safetyStatus: 'safe'
    };
    
    this.reflectionChains.set(chainId, chain);
    return chainId;
  }
  
  /**
   * 记录推理链步骤
   */
  logReflectionStep(chainId, step, depth = 1) {
    if (!this.isActive) return;
    
    const chain = this.reflectionChains.get(chainId);
    if (!chain || chain.status !== 'active') return;
    
    chain.depth = Math.max(chain.depth, depth);
    chain.steps.push({
      timestamp: new Date().toISOString(),
      step: step,
      depth: depth
    });
    
    // 检查循环调用
    this._checkForLoops(chain);
    
    // 更新评分
    chain.rating = this._calculateRating(chain.depth, chain.steps.length);
    
    console.log(`[MetaSupervisor] Reflection chain depth=${chain.depth} | Rating=${chain.rating} | ${chain.safetyStatus}`);
  }
  
  /**
   * 完成推理链并生成元反馈
   */
  completeReflectionChain(chainId, result, successRateChange = 0) {
    if (!this.isActive) return;
    
    const chain = this.reflectionChains.get(chainId);
    if (!chain) return;
    
    chain.endTime = new Date().toISOString();
    chain.status = 'completed';
    chain.result = result;
    chain.successRateChange = successRateChange;
    
    // 生成元反馈
    const metaFeedback = this._generateMetaFeedback(chain);
    chain.metaFeedback = metaFeedback;
    
    // 记录决策历史
    this.decisionHistory.push({
      decision: chain.decision,
      reason: chain.steps.length > 0 ? chain.steps[chain.steps.length - 1].step : 'No reasoning provided',
      reflection: successRateChange > 0 ? `success_rate ↑ ${Math.abs(successRateChange)}%` : successRateChange < 0 ? `success_rate ↓ ${Math.abs(successRateChange)}%` : 'success_rate stable',
      meta_feedback: metaFeedback,
      timestamp: chain.endTime,
      module: chain.module,
      rating: chain.rating
    });
    
    this.metaFeedbackLog.push(chain);
    
    // 通知安全哨兵更新自治评分
    if (this.sentinelMonitor) {
      this.sentinelMonitor.updateAutonomyScore(chain);
    }
  }
  
  /**
   * 检查自我引用和循环调用
   */
  _checkForLoops(chain) {
    const steps = chain.steps.map(s => s.step);
    const uniqueSteps = new Set(steps);
    
    // 检查重复步骤超过3次
    const stepCounts = {};
    steps.forEach(step => {
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });
    
    for (const [step, count] of Object.entries(stepCounts)) {
      if (count >= 3) {
        const loopEvent = {
          timestamp: new Date().toISOString(),
          chainId: chain.id,
          module: chain.module,
          repeatedStep: step,
          count: count
        };
        
        this.loopDetections.push(loopEvent);
        chain.safetyStatus = 'warning';
        
        // 通知安全哨兵
        if (this.sentinelMonitor) {
          this.sentinelMonitor.detectLoop(loopEvent);
        }
        
        break;
      }
    }
    
    // 检查循环调用模式
    if (steps.length >= 3) {
      for (let i = 0; i <= steps.length - 3; i++) {
        if (steps[i] === steps[i+2] && steps[i+1] === steps[i+1]) {
          const loopEvent = {
            timestamp: new Date().toISOString(),
            chainId: chain.id,
            module: chain.module,
            loopPattern: [steps[i], steps[i+1], steps[i+2]],
            position: i
          };
          
          this.loopDetections.push(loopEvent);
          chain.safetyStatus = 'critical';
          
          // 通知安全哨兵冻结模块
          if (this.sentinelMonitor) {
            this.sentinelMonitor.freezeModule(chain.module, 'loop_detection');
          }
          
          break;
        }
      }
    }
  }
  
  /**
   * 计算推理链评分
   */
  _calculateRating(depth, stepsCount) {
    if (depth <= 2 && stepsCount <= 5) return 'A';
    if (depth <= 4 && stepsCount <= 10) return 'B';
    if (depth <= 6 && stepsCount <= 15) return 'C';
    if (depth <= 8 && stepsCount <= 20) return 'D';
    if (depth <= 10 && stepsCount <= 30) return 'E';
    return 'F';
  }
  
  /**
   * 生成元反馈
   */
  _generateMetaFeedback(chain) {
    const successRateChange = chain.successRateChange || 0;
    
    if (successRateChange > 3) {
      return 'strategy validated';
    } else if (successRateChange > 0) {
      return 'slight improvement';
    } else if (successRateChange === 0) {
      return 'no change detected';
    } else if (successRateChange > -3) {
      return 'needs adjustment';
    } else {
      return 'strategy invalidated';
    }
  }
  
  /**
   * 生成唯一ID
   */
  _generateId() {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      isActive: this.isActive,
      reflectionChainsCount: this.reflectionChains.size,
      decisionHistoryCount: this.decisionHistory.length,
      loopDetectionsCount: this.loopDetections.length,
      currentFocus: this._getCurrentFocus()
    };
  }
  
  /**
   * 获取当前焦点模块
   */
  _getCurrentFocus() {
    if (this.decisionHistory.length === 0) return 'None';
    
    // 获取最近5个决策中出现频率最高的模块
    const recentModules = this.decisionHistory.slice(-5).map(d => d.module);
    const moduleCounts = {};
    recentModules.forEach(module => {
      moduleCounts[module] = (moduleCounts[module] || 0) + 1;
    });
    
    let maxCount = 0;
    let focusModule = 'None';
    
    for (const [module, count] of Object.entries(moduleCounts)) {
      if (count > maxCount) {
        maxCount = count;
        focusModule = module;
      }
    }
    
    return focusModule;
  }
  
  /**
   * 生成报告数据
   */
  generateReport() {
    const autonomyScore = this.sentinelMonitor ? this.sentinelMonitor.getCurrentScore() : 0;
    
    return {
      timestamp: new Date().toISOString(),
      reflections: this.metaFeedbackLog.length,
      loop_detections: this.loopDetections.length,
      autonomy_events: this.sentinelMonitor ? this.sentinelMonitor.getEventCount() : 0,
      avg_autonomy_score: autonomyScore,
      status: autonomyScore < 0.5 ? 'safe' : autonomyScore < 0.75 ? 'warning' : 'critical'
    };
  }
}

// 导出单例实例
const metaCognitionSupervisor = new MetaCognitionSupervisor();
module.exports = metaCognitionSupervisor;