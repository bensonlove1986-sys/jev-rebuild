// JEV L7.0 AutoCognition Cluster
// Self Optimizer 模块 - 动态调整模块参数与阈值以提升效率

class SelfOptimizer {
  constructor() {
    this.configuration = {}; // 当前配置
    this.learningHistory = []; // 学习历史
    this.optimizationRules = this.initializeOptimizationRules(); // 优化规则
    this.adjustmentLog = []; // 调整日志
    this.performanceMetrics = {}; // 性能指标跟踪
    this.learningRate = 0.1; // 学习率
    this.explorationRate = 0.2; // 探索率
    this.stabilityThreshold = 0.05; // 稳定性阈值
    this.confidenceWindow = 5; // 置信度窗口
    this.initialized = false;
    this.lastOptimizationTime = null;
  }

  /**
   * 初始化自适应优化器
   */
  async initialize() {
    try {
      console.log('[SelfOptimizer] 初始化自适应优化器...');
      
      // 初始化默认配置
      this.initializeDefaultConfiguration();
      
      // 加载优化历史
      await this.loadLearningHistory();
      
      // 初始化性能指标
      this.initializePerformanceMetrics();
      
      this.initialized = true;
      this.lastOptimizationTime = Date.now();
      
      console.log('[SelfOptimizer] 初始化完成，配置模块数:', Object.keys(this.configuration).length);
      
      return {
        success: true,
        modulesConfigured: Object.keys(this.configuration).length,
        rulesCount: Object.keys(this.optimizationRules).length
      };
    } catch (error) {
      console.error('[SelfOptimizer] 初始化失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初始化默认配置
   */
  initializeDefaultConfiguration() {
    console.log('[SelfOptimizer] 初始化默认配置...');
    
    this.configuration = {
      daoCollector: {
        weight: 1.0,
        timeoutThreshold: 3000,
        retryCount: 3,
        concurrencyLimit: 10,
        cacheSize: 500,
        priority: 'high',
        minHealthScore: 0.7,
        maxQueueSize: 1000
      },
      aiBridge: {
        weight: 0.9,
        timeoutThreshold: 2000,
        retryCount: 2,
        concurrencyLimit: 15,
        cacheSize: 300,
        priority: 'high',
        minHealthScore: 0.75,
        maxQueueSize: 800
      },
      TRAE: {
        weight: 1.0,
        syncFrequency: 5000,
        batchSize: 20,
        timeoutThreshold: 1500,
        compressionLevel: 3,
        maxPayloadSize: 102400,
        minHealthScore: 0.8,
        retryCount: 3
      },
      autoRecoveryCluster: {
        weight: 0.8,
        recoveryTimeout: 30000,
        maxRetries: 5,
        coolDownPeriod: 60000,
        healthCheckInterval: 5000,
        minHealthScore: 0.65,
        priority: 'medium',
        maxConcurrentRecoveries: 3
      },
      realtimeTranslate: {
        weight: 0.7,
        timeoutThreshold: 1000,
        threshold: 0.7, // 原始阈值
        retryCount: 2,
        concurrencyLimit: 20,
        cacheSize: 200,
        minHealthScore: 0.7,
        maxQueueSize: 500
      },
      autoLearningOptimizer: {
        weight: 0.85,
        learningRate: 0.05,
        explorationRate: 0.1,
        batchSize: 100,
        modelUpdateInterval: 3600000,
        minConfidence: 0.7,
        priority: 'medium',
        featureImportanceThreshold: 0.1
      },
      watchdog: {
        weight: 1.0,
        checkInterval: 2000,
        threshold: 0.68, // 原始阈值
        memoryWarningThreshold: 75,
        cpuWarningThreshold: 80,
        minHealthScore: 0.6,
        priority: 'high',
        maxConsecutiveFailures: 3
      },
      autoOrchestrator: {
        weight: 0.95,
        loadBalancingStrategy: 'round-robin',
        taskTimeout: 5000,
        priorityAdjustmentInterval: 30000,
        resourceAllocationStrategy: 'fair',
        minHealthScore: 0.7,
        maxConcurrentTasks: 50,
        queuePriority: 'dynamic'
      }
    };
  }

  /**
   * 初始化优化规则
   */
  initializeOptimizationRules() {
    return {
      weight_adjustment: {
        name: '权重调整规则',
        description: '根据模块性能和重要性动态调整权重',
        applicableMetrics: ['successRate', 'latency', 'errorRate'],
        adjustmentFunction: this.calculateWeightAdjustment.bind(this),
        maxAdjustment: 0.2,
        minWeight: 0.5,
        maxWeight: 1.5
      },
      threshold_optimization: {
        name: '阈值优化规则',
        description: '优化各种性能和资源阈值',
        applicableMetrics: ['errorRate', 'resourceUsage', 'latency'],
        adjustmentFunction: this.calculateThresholdAdjustment.bind(this),
        maxAdjustment: 0.15,
        minThreshold: 0.3,
        maxThreshold: 0.95
      },
      timeout_calibration: {
        name: '超时校准规则',
        description: '基于实际响应时间调整超时阈值',
        applicableMetrics: ['latency', 'timeoutRate'],
        adjustmentFunction: this.calculateTimeoutAdjustment.bind(this),
        maxAdjustment: 0.3,
        minTimeout: 500,
        maxTimeout: 10000
      },
      concurrency_scaling: {
        name: '并发扩展规则',
        description: '优化并发连接数和处理能力',
        applicableMetrics: ['throughput', 'latency', 'resourceUsage'],
        adjustmentFunction: this.calculateConcurrencyAdjustment.bind(this),
        maxAdjustment: 0.4,
        minConcurrency: 5,
        maxConcurrency: 50
      },
      cache_optimization: {
        name: '缓存优化规则',
        description: '调整缓存大小和策略',
        applicableMetrics: ['cacheHitRate', 'latency', 'memoryUsage'],
        adjustmentFunction: this.calculateCacheAdjustment.bind(this),
        maxAdjustment: 0.25,
        minCacheSize: 100,
        maxCacheSize: 1000
      },
      recovery_enhancement: {
        name: '恢复增强规则',
        description: '优化恢复策略和超时设置',
        applicableMetrics: ['recoverySuccessRate', 'recoveryTime', 'failureRate'],
        adjustmentFunction: this.calculateRecoveryAdjustment.bind(this),
        maxAdjustment: 0.3,
        minRecoveryTime: 10000,
        maxRecoveryTime: 60000
      }
    };
  }

  /**
   * 加载学习历史
   */
  async loadLearningHistory() {
    try {
      console.log('[SelfOptimizer] 加载学习历史...');
      
      // 模拟学习历史数据
      const history = [
        {
          timestamp: Date.now() - 86400000, // 1天前
          module: 'daoCollector',
          parameter: 'weight',
          oldValue: 1.0,
          newValue: 1.1,
          reason: '高成功率和低延迟',
          impact: 0.08, // 性能提升8%
          confidence: 0.85
        },
        {
          timestamp: Date.now() - 72000000, // 20小时前
          module: 'aiBridge',
          parameter: 'weight',
          oldValue: 0.9,
          newValue: 0.8,
          reason: '错误率略有上升',
          impact: 0.05,
          confidence: 0.75
        },
        {
          timestamp: Date.now() - 43200000, // 12小时前
          module: 'realtimeTranslate',
          parameter: 'threshold',
          oldValue: 0.7,
          newValue: 0.65,
          reason: '性能优化建议',
          impact: 0.12,
          confidence: 0.9
        },
        {
          timestamp: Date.now() - 21600000, // 6小时前
          module: 'watchdog',
          parameter: 'threshold',
          oldValue: 0.68,
          newValue: 0.7,
          reason: '增加系统敏感度',
          impact: 0.04,
          confidence: 0.8
        },
        {
          timestamp: Date.now() - 10800000, // 3小时前
          module: 'TRAE',
          parameter: 'syncFrequency',
          oldValue: 5000,
          newValue: 6000,
          reason: '减少网络负载',
          impact: 0.03,
          confidence: 0.7
        }
      ];
      
      this.learningHistory = history;
      console.log('[SelfOptimizer] 学习历史加载完成，记录数:', this.learningHistory.length);
      
      // 应用历史调整到当前配置
      this.applyHistoricalAdjustments();
    } catch (error) {
      console.error('[SelfOptimizer] 加载学习历史失败:', error.message);
    }
  }

  /**
   * 应用历史调整
   */
  applyHistoricalAdjustments() {
    this.learningHistory.forEach(adjustment => {
      if (this.configuration[adjustment.module] && 
          this.configuration[adjustment.module][adjustment.parameter] !== undefined) {
        
        // 只应用最近的调整
        if (Date.now() - adjustment.timestamp < 86400000) { // 24小时内
          this.configuration[adjustment.module][adjustment.parameter] = adjustment.newValue;
        }
      }
    });
  }

  /**
   * 初始化性能指标
   */
  initializePerformanceMetrics() {
    this.performanceMetrics = {
      successRate: {},
      latency: {},
      errorRate: {},
      resourceUsage: {},
      throughput: {},
      timeoutRate: {},
      cacheHitRate: {},
      recoverySuccessRate: {},
      recoveryTime: {},
      failureRate: {}
    };
    
    // 为每个模块初始化指标
    Object.keys(this.configuration).forEach(module => {
      this.performanceMetrics.successRate[module] = { current: 0.95, baseline: 0.95, trend: 'stable' };
      this.performanceMetrics.latency[module] = { current: 150, baseline: 150, trend: 'stable' };
      this.performanceMetrics.errorRate[module] = { current: 0.02, baseline: 0.02, trend: 'stable' };
      this.performanceMetrics.resourceUsage[module] = { current: 60, baseline: 60, trend: 'stable' };
    });
    
    // 设置特定模块的指标
    this.performanceMetrics.latency['daoCollector'] = { current: 180, baseline: 180, trend: 'stable' };
    this.performanceMetrics.latency['aiBridge'] = { current: 120, baseline: 120, trend: 'increasing' }; // 上升趋势
    this.performanceMetrics.errorRate['realtimeTranslate'] = { current: 0.03, baseline: 0.02, trend: 'increasing' };
  }

  /**
   * 执行全局优化
   */
  async performGlobalOptimization(insights) {
    if (!this.initialized) {
      console.warn('[SelfOptimizer] 优化器未初始化');
      return { success: false, error: '未初始化' };
    }
    
    console.log('[SelfOptimizer] 执行全局优化...');
    const adjustments = [];
    
    // 1. 基于洞察进行优化
    if (insights && insights.length > 0) {
      const insightAdjustments = this.applyInsightBasedOptimization(insights);
      adjustments.push(...insightAdjustments);
    }
    
    // 2. 基于性能指标进行优化
    const metricAdjustments = this.applyMetricBasedOptimization();
    adjustments.push(...metricAdjustments);
    
    // 3. 应用探索性优化
    const explorationAdjustments = this.performExploratoryOptimization();
    adjustments.push(...explorationAdjustments);
    
    // 4. 记录优化日志
    this.logOptimizationResults(adjustments);
    
    this.lastOptimizationTime = Date.now();
    
    return {
      success: true,
      adjustments: adjustments,
      timestamp: new Date().toISOString(),
      moduleCount: new Set(adjustments.map(a => a.module)).size
    };
  }

  /**
   * 应用基于洞察的优化
   */
  applyInsightBasedOptimization(insights) {
    const adjustments = [];
    
    insights.forEach(insight => {
      // 提取模块名称
      const moduleName = this.extractModuleFromInsight(insight.description);
      
      if (moduleName && this.configuration[moduleName]) {
        // 根据洞察类型生成调整
        if (insight.type === 'performance_degradation') {
          const adj = this.adjustForPerformanceIssue(moduleName, insight);
          if (adj) adjustments.push(adj);
        } else if (insight.type === 'resource_leak') {
          const adj = this.adjustForResourceIssue(moduleName, insight);
          if (adj) adjustments.push(adj);
        } else if (insight.type === 'timeout_pattern') {
          const adj = this.adjustForTimeoutIssue(moduleName, insight);
          if (adj) adjustments.push(adj);
        }
      }
    });
    
    return adjustments;
  }

  /**
   * 从洞察中提取模块名称
   */
  extractModuleFromInsight(description) {
    const moduleNames = Object.keys(this.configuration);
    for (const name of moduleNames) {
      if (description.includes(name)) {
        return name;
      }
    }
    
    // 特殊处理realtimeTranslate
    if (description.includes('realtimeTranslate')) {
      return 'realtimeTranslate';
    }
    
    return null;
  }

  /**
   * 针对性能问题进行调整
   */
  adjustForPerformanceIssue(module, insight) {
    // 调整模块权重和阈值
    if (this.configuration[module].weight !== undefined) {
      const adjustment = this.optimizationRules.weight_adjustment;
      const weightChange = adjustment.adjustmentFunction(module, 'weight', this.performanceMetrics);
      
      if (Math.abs(weightChange) > 0.01) { // 只有显著变化才应用
        const oldValue = this.configuration[module].weight;
        const newValue = Math.min(
          adjustment.maxWeight,
          Math.max(adjustment.minWeight, oldValue * (1 + weightChange))
        );
        
        this.configuration[module].weight = newValue;
        
        return {
          module: module,
          parameter: 'weight',
          oldValue: oldValue,
          newValue: newValue,
          change: weightChange,
          rule: adjustment.name,
          reason: `性能问题优化: ${insight.description}`,
          timestamp: Date.now()
        };
      }
    }
    
    return null;
  }

  /**
   * 针对资源问题进行调整
   */
  adjustForResourceIssue(module, insight) {
    // 调整资源相关参数
    if (this.configuration[module].concurrencyLimit !== undefined) {
      const adjustment = this.optimizationRules.concurrency_scaling;
      const concurrencyChange = adjustment.adjustmentFunction(module, 'concurrencyLimit', this.performanceMetrics);
      
      if (Math.abs(concurrencyChange) > 0.05) {
        const oldValue = this.configuration[module].concurrencyLimit;
        const newValue = Math.min(
          adjustment.maxConcurrency,
          Math.max(adjustment.minConcurrency, Math.round(oldValue * (1 + concurrencyChange)))
        );
        
        this.configuration[module].concurrencyLimit = newValue;
        
        return {
          module: module,
          parameter: 'concurrencyLimit',
          oldValue: oldValue,
          newValue: newValue,
          change: concurrencyChange,
          rule: adjustment.name,
          reason: `资源使用优化: ${insight.description}`,
          timestamp: Date.now()
        };
      }
    }
    
    return null;
  }

  /**
   * 针对超时问题进行调整
   */
  adjustForTimeoutIssue(module, insight) {
    // 调整超时阈值
    if (this.configuration[module].timeoutThreshold !== undefined) {
      const adjustment = this.optimizationRules.timeout_calibration;
      const timeoutChange = adjustment.adjustmentFunction(module, 'timeoutThreshold', this.performanceMetrics);
      
      if (Math.abs(timeoutChange) > 0.08) {
        const oldValue = this.configuration[module].timeoutThreshold;
        const newValue = Math.min(
          adjustment.maxTimeout,
          Math.max(adjustment.minTimeout, Math.round(oldValue * (1 + timeoutChange)))
        );
        
        this.configuration[module].timeoutThreshold = newValue;
        
        return {
          module: module,
          parameter: 'timeoutThreshold',
          oldValue: oldValue,
          newValue: newValue,
          change: timeoutChange,
          rule: adjustment.name,
          reason: `超时问题优化: ${insight.description}`,
          timestamp: Date.now()
        };
      }
    }
    
    return null;
  }

  /**
   * 应用基于指标的优化
   */
  applyMetricBasedOptimization() {
    const adjustments = [];
    
    // 对每个模块应用优化规则
    Object.keys(this.configuration).forEach(module => {
      // 检查是否需要优化
      if (this.shouldOptimizeModule(module)) {
        // 应用每个规则
        Object.values(this.optimizationRules).forEach(rule => {
          const ruleAdjustments = this.applyOptimizationRule(module, rule);
          adjustments.push(...ruleAdjustments);
        });
      }
    });
    
    return adjustments;
  }

  /**
   * 检查模块是否需要优化
   */
  shouldOptimizeModule(module) {
    // 检查性能趋势
    const metrics = ['latency', 'errorRate', 'successRate'];
    
    for (const metric of metrics) {
      if (this.performanceMetrics[metric][module]) {
        const trend = this.performanceMetrics[metric][module].trend;
        const current = this.performanceMetrics[metric][module].current;
        const baseline = this.performanceMetrics[metric][module].baseline;
        
        // 如果有明显的性能下降趋势
        if (trend === 'increasing' && (metric === 'latency' || metric === 'errorRate')) {
          return true;
        }
        if (trend === 'decreasing' && metric === 'successRate') {
          return true;
        }
        
        // 如果当前值偏离基线超过15%
        const deviation = Math.abs(current - baseline) / baseline;
        if (deviation > 0.15) {
          return true;
        }
      }
    }
    
    // 定期优化（每30分钟）
    if (this.lastOptimizationTime && 
        Date.now() - this.lastOptimizationTime > 1800000) {
      return true;
    }
    
    return false;
  }

  /**
   * 应用优化规则
   */
  applyOptimizationRule(module, rule) {
    const adjustments = [];
    
    // 查找模块中适用此规则的参数
    const applicableParams = this.findApplicableParameters(module, rule);
    
    applicableParams.forEach(param => {
      // 计算调整量
      const change = rule.adjustmentFunction(module, param, this.performanceMetrics);
      
      if (Math.abs(change) > 0.01) { // 只有显著变化才应用
        const oldValue = this.configuration[module][param];
        let newValue;
        
        // 根据参数类型应用不同的限制
        if (param === 'weight') {
          newValue = Math.min(rule.maxWeight, Math.max(rule.minWeight, oldValue * (1 + change)));
        } else if (param.includes('threshold')) {
          newValue = Math.min(rule.maxThreshold, Math.max(rule.minThreshold, oldValue * (1 + change)));
        } else if (param.includes('timeout')) {
          newValue = Math.min(rule.maxTimeout, Math.max(rule.minTimeout, Math.round(oldValue * (1 + change))));
        } else if (param.includes('concurrency')) {
          newValue = Math.min(rule.maxConcurrency, Math.max(rule.minConcurrency, Math.round(oldValue * (1 + change))));
        } else if (param.includes('cache')) {
          newValue = Math.min(rule.maxCacheSize, Math.max(rule.minCacheSize, Math.round(oldValue * (1 + change))));
        } else if (param.includes('recovery')) {
          newValue = Math.min(rule.maxRecoveryTime, Math.max(rule.minRecoveryTime, Math.round(oldValue * (1 + change))));
        } else {
          // 通用参数调整
          newValue = oldValue * (1 + change);
          if (Number.isInteger(oldValue)) {
            newValue = Math.round(newValue);
          }
        }
        
        // 应用新值
        this.configuration[module][param] = newValue;
        
        adjustments.push({
          module: module,
          parameter: param,
          oldValue: oldValue,
          newValue: newValue,
          change: change,
          rule: rule.name,
          reason: `基于规则的自动优化`,
          timestamp: Date.now()
        });
      }
    });
    
    return adjustments;
  }

  /**
   * 查找适用的参数
   */
  findApplicableParameters(module, rule) {
    const params = [];
    const config = this.configuration[module];
    
    // 根据规则类型确定适用参数
    if (rule.name.includes('权重')) {
      if (config.weight !== undefined) params.push('weight');
    } else if (rule.name.includes('阈值')) {
      Object.keys(config).forEach(key => {
        if (key.includes('threshold')) params.push(key);
      });
    } else if (rule.name.includes('超时')) {
      Object.keys(config).forEach(key => {
        if (key.includes('timeout')) params.push(key);
      });
    } else if (rule.name.includes('并发')) {
      Object.keys(config).forEach(key => {
        if (key.includes('concurrency')) params.push(key);
      });
    } else if (rule.name.includes('缓存')) {
      Object.keys(config).forEach(key => {
        if (key.includes('cache')) params.push(key);
      });
    } else if (rule.name.includes('恢复')) {
      Object.keys(config).forEach(key => {
        if (key.includes('recovery')) params.push(key);
      });
    }
    
    return params;
  }

  /**
   * 执行探索性优化
   */
  performExploratoryOptimization() {
    const adjustments = [];
    
    // 探索性优化 - 随机选择少量模块进行小幅调整
    if (Math.random() < this.explorationRate) {
      const modules = Object.keys(this.configuration);
      const selectedModule = modules[Math.floor(Math.random() * modules.length)];
      const params = Object.keys(this.configuration[selectedModule]);
      const selectedParam = params[Math.floor(Math.random() * params.length)];
      
      // 只对数值型参数进行调整
      if (typeof this.configuration[selectedModule][selectedParam] === 'number') {
        const oldValue = this.configuration[selectedModule][selectedParam];
        const change = (Math.random() - 0.5) * 0.1; // ±5%的随机调整
        let newValue = oldValue * (1 + change);
        
        if (Number.isInteger(oldValue)) {
          newValue = Math.round(newValue);
        }
        
        this.configuration[selectedModule][selectedParam] = newValue;
        
        adjustments.push({
          module: selectedModule,
          parameter: selectedParam,
          oldValue: oldValue,
          newValue: newValue,
          change: change,
          rule: '探索性优化',
          reason: '随机参数调整以探索潜在改进',
          timestamp: Date.now(),
          isExploration: true
        });
      }
    }
    
    return adjustments;
  }

  /**
   * 计算权重调整
   */
  calculateWeightAdjustment(module, param, metrics) {
    const successMetric = metrics.successRate[module];
    const latencyMetric = metrics.latency[module];
    const errorMetric = metrics.errorRate[module];
    
    let adjustment = 0;
    
    // 基于成功率调整
    if (successMetric) {
      const successRatio = successMetric.current / successMetric.baseline;
      adjustment += (successRatio - 1) * 0.3;
    }
    
    // 基于延迟调整
    if (latencyMetric) {
      const latencyRatio = latencyMetric.baseline / latencyMetric.current;
      adjustment += (latencyRatio - 1) * 0.2;
    }
    
    // 基于错误率调整
    if (errorMetric) {
      const errorRatio = errorMetric.baseline / errorMetric.current;
      adjustment += (errorRatio - 1) * 0.3;
    }
    
    // 限制调整幅度
    adjustment = Math.max(-0.2, Math.min(0.2, adjustment));
    
    // 添加稳定性考虑
    if (Math.abs(adjustment) < this.stabilityThreshold) {
      adjustment = 0;
    }
    
    return adjustment;
  }

  /**
   * 计算阈值调整
   */
  calculateThresholdAdjustment(module, param, metrics) {
    const errorMetric = metrics.errorRate[module];
    const resourceMetric = metrics.resourceUsage[module];
    
    let adjustment = 0;
    
    // 基于错误率调整
    if (errorMetric) {
      if (errorMetric.current > errorMetric.baseline * 1.2) {
        adjustment += -0.05; // 降低阈值增加敏感度
      } else if (errorMetric.current < errorMetric.baseline * 0.8) {
        adjustment += 0.03; // 提高阈值减少误报
      }
    }
    
    // 基于资源使用调整
    if (resourceMetric) {
      if (resourceMetric.current > 80) {
        adjustment += -0.03; // 高资源使用时降低阈值
      }
    }
    
    // 特殊处理realtimeTranslate的threshold
    if (module === 'realtimeTranslate' && param === 'threshold') {
      // 根据反思建议，将阈值调整为0.55
      const currentValue = this.configuration[module][param];
      if (currentValue > 0.55) {
        adjustment += (0.55 - currentValue) / currentValue;
      }
    }
    
    // 特殊处理watchdog的threshold
    if (module === 'watchdog' && param === 'threshold') {
      // 根据要求保持阈值在0.68
      const targetValue = 0.68;
      const currentValue = this.configuration[module][param];
      if (Math.abs(currentValue - targetValue) > 0.01) {
        adjustment += (targetValue - currentValue) / currentValue;
      }
    }
    
    return adjustment;
  }

  /**
   * 计算超时调整
   */
  calculateTimeoutAdjustment(module, param, metrics) {
    const latencyMetric = metrics.latency[module];
    
    if (!latencyMetric) {
      return 0;
    }
    
    // 基于延迟调整超时时间
    const latencyRatio = latencyMetric.current / latencyMetric.baseline;
    let adjustment = (latencyRatio - 1) * 0.4;
    
    // 如果延迟趋势上升，增加更多缓冲
    if (latencyMetric.trend === 'increasing') {
      adjustment += 0.05;
    }
    
    return adjustment;
  }

  /**
   * 计算并发调整
   */
  calculateConcurrencyAdjustment(module, param, metrics) {
    const throughputMetric = metrics.throughput[module];
    const latencyMetric = metrics.latency[module];
    const resourceMetric = metrics.resourceUsage[module];
    
    let adjustment = 0;
    
    // 基于吞吐量调整
    if (throughputMetric && throughputMetric.current > throughputMetric.baseline * 1.1) {
      adjustment += 0.1; // 增加并发以处理更高吞吐量
    }
    
    // 基于延迟调整
    if (latencyMetric && latencyMetric.current > latencyMetric.baseline * 1.2) {
      adjustment += -0.08; // 减少并发以降低延迟
    }
    
    // 基于资源使用调整
    if (resourceMetric && resourceMetric.current > 85) {
      adjustment += -0.1; // 高资源使用时减少并发
    }
    
    return adjustment;
  }

  /**
   * 计算缓存调整
   */
  calculateCacheAdjustment(module, param, metrics) {
    const hitRateMetric = metrics.cacheHitRate[module];
    const memoryMetric = metrics.resourceUsage[module];
    
    let adjustment = 0;
    
    // 基于缓存命中率调整
    if (hitRateMetric && hitRateMetric.current < hitRateMetric.baseline * 0.9) {
      adjustment += 0.1; // 增加缓存大小
    } else if (hitRateMetric && hitRateMetric.current > hitRateMetric.baseline * 1.1) {
      adjustment += 0.05; // 命中率高可以适度增加缓存
    }
    
    // 基于内存使用限制缓存增长
    if (memoryMetric && memoryMetric.current > 80) {
      adjustment += -0.05; // 高内存使用时减少缓存
    }
    
    return adjustment;
  }

  /**
   * 计算恢复调整
   */
  calculateRecoveryAdjustment(module, param, metrics) {
    const recoveryMetric = metrics.recoverySuccessRate[module];
    const recoveryTimeMetric = metrics.recoveryTime[module];
    
    let adjustment = 0;
    
    // 基于恢复成功率调整
    if (recoveryMetric && recoveryMetric.current < recoveryMetric.baseline * 0.9) {
      adjustment += 0.1; // 增加恢复超时时间
    }
    
    // 基于恢复时间调整
    if (recoveryTimeMetric && recoveryTimeMetric.current > recoveryTimeMetric.baseline * 1.2) {
      adjustment += -0.05; // 恢复时间过长，减少超时
    }
    
    return adjustment;
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(module, metrics) {
    Object.keys(metrics).forEach(metric => {
      if (this.performanceMetrics[metric] && this.performanceMetrics[metric][module] !== undefined) {
        const currentValue = metrics[metric];
        const baseline = this.performanceMetrics[metric][module].baseline;
        
        // 更新当前值
        this.performanceMetrics[metric][module].current = currentValue;
        
        // 更新趋势
        const oldValue = this.performanceMetrics[metric][module].previous || baseline;
        if (Math.abs(currentValue - oldValue) > oldValue * 0.05) {
          if (currentValue > oldValue && (metric === 'latency' || metric === 'errorRate')) {
            this.performanceMetrics[metric][module].trend = 'increasing';
          } else if (currentValue < oldValue && (metric === 'successRate')) {
            this.performanceMetrics[metric][module].trend = 'decreasing';
          } else {
            this.performanceMetrics[metric][module].trend = 'stable';
          }
        } else {
          this.performanceMetrics[metric][module].trend = 'stable';
        }
        
        // 保存前一个值
        this.performanceMetrics[metric][module].previous = currentValue;
      }
    });
  }

  /**
   * 记录优化结果
   */
  logOptimizationResults(adjustments) {
    adjustments.forEach(adjustment => {
      // 创建优化日志
      const logEntry = {
        id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        module: adjustment.module,
        parameter: adjustment.parameter,
        oldValue: adjustment.oldValue,
        newValue: adjustment.newValue,
        changePercent: (adjustment.change * 100).toFixed(2),
        rule: adjustment.rule,
        reason: adjustment.reason,
        isExploration: adjustment.isExploration || false
      };
      
      // 格式化特殊日志输出
      let logOutput = `[SelfOptimizer] `;
      
      if (adjustment.parameter === 'weight') {
        const sign = adjustment.change > 0 ? '+' : '';
        logOutput += `Adjusted weight(${adjustment.module})=${sign}${adjustment.change.toFixed(2)} `;
      }
      
      if (adjustment.parameter === 'threshold') {
        logOutput += `| threshold(${adjustment.module})=${adjustment.newValue.toFixed(2)}`;
      }
      
      if (logOutput.length > 15) { // 如果有内容
        console.log(logOutput.trim());
      }
      
      // 添加到调整日志
      this.adjustmentLog.push(logEntry);
      
      // 添加到学习历史
      this.learningHistory.push({
        timestamp: Date.now(),
        module: adjustment.module,
        parameter: adjustment.parameter,
        oldValue: adjustment.oldValue,
        newValue: adjustment.newValue,
        reason: adjustment.reason,
        impact: 0, // 初始影响设为0，后续会更新
        confidence: 0.7
      });
    });
    
    // 限制日志大小
    if (this.adjustmentLog.length > 1000) {
      this.adjustmentLog = this.adjustmentLog.slice(-1000);
    }
    
    if (this.learningHistory.length > 500) {
      this.learningHistory = this.learningHistory.slice(-500);
    }
  }

  /**
   * 评估优化效果
   */
  evaluateOptimizationEffect(adjustmentId, impactData) {
    const logEntry = this.adjustmentLog.find(log => log.id === adjustmentId);
    const historyEntry = this.learningHistory.find(h => 
      h.module === logEntry.module && 
      h.parameter === logEntry.parameter && 
      h.timestamp === logEntry.timestamp
    );
    
    if (historyEntry && impactData) {
      // 计算性能影响
      let overallImpact = 0;
      let impactCount = 0;
      
      if (impactData.successRate !== undefined) {
        overallImpact += impactData.successRate;
        impactCount++;
      }
      if (impactData.latencyImprovement !== undefined) {
        overallImpact += impactData.latencyImprovement;
        impactCount++;
      }
      if (impactData.errorReduction !== undefined) {
        overallImpact += impactData.errorReduction;
        impactCount++;
      }
      
      if (impactCount > 0) {
        historyEntry.impact = overallImpact / impactCount;
        historyEntry.confidence = this.calculateConfidence(impactCount, historyEntry.impact);
      }
      
      // 更新学习率和探索率
      this.updateLearningParameters(historyEntry.impact);
    }
  }

  /**
   * 计算置信度
   */
  calculateConfidence(dataPoints, impact) {
    // 基于数据点数量和影响大小计算置信度
    const baseConfidence = 0.5 + (dataPoints / 10) * 0.3;
    const impactFactor = Math.min(1, Math.abs(impact) * 2);
    
    return Math.min(0.99, baseConfidence + impactFactor * 0.2);
  }

  /**
   * 更新学习参数
   */
  updateLearningParameters(impact) {
    // 根据优化效果调整学习率和探索率
    if (impact > 0.1) { // 良好效果
      this.learningRate = Math.min(0.15, this.learningRate * 1.1);
      this.explorationRate = Math.max(0.1, this.explorationRate * 0.9);
    } else if (impact < -0.05) { // 不良效果
      this.learningRate = Math.max(0.05, this.learningRate * 0.9);
      this.explorationRate = Math.min(0.3, this.explorationRate * 1.1);
    }
  }

  /**
   * 获取当前配置
   */
  getConfiguration(module = null) {
    if (module && this.configuration[module]) {
      return { [module]: { ...this.configuration[module] } };
    }
    
    return { ...this.configuration };
  }

  /**
   * 获取优化统计
   */
  getOptimizationStats() {
    const totalAdjustments = this.adjustmentLog.length;
    const adjustmentsByModule = {};
    const adjustmentsByType = {};
    
    // 按模块统计
    this.adjustmentLog.forEach(log => {
      adjustmentsByModule[log.module] = (adjustmentsByModule[log.module] || 0) + 1;
      adjustmentsByType[log.parameter] = (adjustmentsByType[log.parameter] || 0) + 1;
    });
    
    // 获取最近的调整
    const recentAdjustments = this.adjustmentLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    
    return {
      total_adjustments: totalAdjustments,
      adjustments_by_module: adjustmentsByModule,
      adjustments_by_type: adjustmentsByType,
      recent_adjustments: recentAdjustments,
      last_optimization_time: this.lastOptimizationTime ? 
        new Date(this.lastOptimizationTime).toISOString() : null,
      learning_rate: this.learningRate,
      exploration_rate: this.explorationRate
    };
  }

  /**
   * 获取优化报告
   */
  generateOptimizationReport() {
    const stats = this.getOptimizationStats();
    const topModules = Object.entries(stats.adjustments_by_module)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([module, count]) => ({ module, count }));
    
    const topParameters = Object.entries(stats.adjustments_by_type)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([param, count]) => ({ parameter: param, count }));
    
    // 计算平均调整幅度
    const avgAdjustment = this.adjustmentLog.length > 0 ?
      this.adjustmentLog.reduce((sum, log) => sum + Math.abs(parseFloat(log.changePercent)), 0) / 
      this.adjustmentLog.length : 0;
    
    return {
      report_generated_at: new Date().toISOString(),
      optimization_summary: {
        total_adjustments: stats.total_adjustments,
        top_adjusted_modules: topModules,
        top_adjusted_parameters: topParameters,
        average_adjustment_percent: avgAdjustment.toFixed(2),
        last_optimization_time: stats.last_optimization_time
      },
      current_configuration_highlights: this.getConfigurationHighlights(),
      optimization_trends: this.analyzeOptimizationTrends()
    };
  }

  /**
   * 获取配置亮点
   */
  getConfigurationHighlights() {
    const highlights = [];
    
    Object.entries(this.configuration).forEach(([module, config]) => {
      if (config.weight > 1.1) {
        highlights.push(`模块 ${module} 权重增加至 ${config.weight.toFixed(2)}，表示高优先级`);
      }
      if (config.threshold && config.threshold < 0.6) {
        highlights.push(`模块 ${module} 阈值降低至 ${config.threshold.toFixed(2)}，增加敏感度`);
      }
      if (config.timeoutThreshold && config.timeoutThreshold > 4000) {
        highlights.push(`模块 ${module} 超时阈值增加至 ${config.timeoutThreshold}ms，提高容错性`);
      }
    });
    
    return highlights.slice(0, 5);
  }

  /**
   * 分析优化趋势
   */
  analyzeOptimizationTrends() {
    // 分析最近24小时的优化趋势
    const recentLogs = this.adjustmentLog.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return Date.now() - logTime < 86400000;
    });
    
    // 按小时分组
    const hourlyTrends = {};
    recentLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (!hourlyTrends[hour]) {
        hourlyTrends[hour] = 0;
      }
      hourlyTrends[hour]++;
    });
    
    return {
      hourly_adjustments: hourlyTrends,
      total_recent_adjustments: recentLogs.length,
      is_adjustment_frequency_decreasing: this.isAdjustmentFrequencyDecreasing()
    };
  }

  /**
   * 检查调整频率是否降低（表示系统趋于稳定）
   */
  isAdjustmentFrequencyDecreasing() {
    // 比较最近两个时间段的调整频率
    const now = Date.now();
    const recentPeriod = 3600000; // 1小时
    const previousPeriod = 7200000; // 2小时
    
    const recentAdjustments = this.adjustmentLog.filter(log => {
      return Date.now() - new Date(log.timestamp).getTime() < recentPeriod;
    }).length;
    
    const previousAdjustments = this.adjustmentLog.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime > now - previousPeriod && logTime <= now - recentPeriod;
    }).length;
    
    return recentAdjustments < previousAdjustments * 0.8;
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = SelfOptimizer;
} else {
  window.SelfOptimizer = SelfOptimizer;
}

console.log('[L7.0][AutoCognitionCluster] SelfOptimizer 模块加载完成');