// JEV L7.0 AutoCognition Cluster
// Predictive Planner 模块 - 基于趋势与反馈预测系统下一步最优行动

class PredictivePlanner {
  constructor() {
    this.systemState = {}; // 系统当前状态
    this.historicalData = []; // 历史性能数据（48小时）
    this.predictions = []; // 生成的预测
    this.plans = []; // 优化计划
    this.actionTemplates = this.initializeActionTemplates(); // 行动模板
    this.predictionWindow = 3600000; // 预测窗口（1小时）
    this.confidenceThreshold = 0.7; // 置信度阈值
    this.metrics = {
      predictionsMade: 0,
      accuratePredictions: 0,
      plansGenerated: 0,
      plansExecuted: 0,
      averageAccuracy: 0
    };
    this.initialized = false;
  }

  /**
   * 初始化预测规划模块
   */
  async initialize() {
    try {
      console.log('[PredictivePlanner] 初始化预测规划模块...');
      
      // 加载历史数据
      await this.loadHistoricalData();
      
      // 初始化系统状态
      this.initializeSystemState();
      
      // 生成初始预测
      this.generateInitialPredictions();
      
      // 生成初始优化计划
      this.generateInitialPlans();
      
      this.initialized = true;
      console.log('[PredictivePlanner] 初始化完成，预测数:', this.predictions.length, '计划数:', this.plans.length);
      
      return {
        success: true,
        predictions: this.predictions.length,
        plans: this.plans.length,
        historicalDataPoints: this.historicalData.length
      };
    } catch (error) {
      console.error('[PredictivePlanner] 初始化失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初始化行动模板
   */
  initializeActionTemplates() {
    return {
      performance_optimization: {
        name: '性能优化',
        description: '降低模块响应时间，提高吞吐量',
        applicableConditions: (moduleData) => {
          return moduleData.latency && moduleData.latency > moduleData.threshold * 1.2;
        },
        actions: [
          { action: 'increase_resource_allocation', weight: 0.7 },
          { action: 'optimize_caching_strategy', weight: 0.8 },
          { action: 'preload_resources', weight: 0.6 },
          { action: 'adjust_concurrency_limits', weight: 0.9 }
        ]
      },
      error_handling_enhancement: {
        name: '错误处理增强',
        description: '减少错误率，提高系统稳定性',
        applicableConditions: (moduleData) => {
          return moduleData.errorRate && moduleData.errorRate > 0.05;
        },
        actions: [
          { action: 'implement_circuit_breaker', weight: 0.9 },
          { action: 'increase_timeout_threshold', weight: 0.6 },
          { action: 'add_retry_mechanism', weight: 0.8 },
          { action: 'improve_error_logging', weight: 0.5 }
        ]
      },
      resource_management: {
        name: '资源管理',
        description: '优化内存和CPU使用',
        applicableConditions: (moduleData) => {
          return moduleData.memoryUsage && moduleData.memoryUsage > 75;
        },
        actions: [
          { action: 'trigger_garbage_collection', weight: 0.7 },
          { action: 'release_unused_resources', weight: 0.9 },
          { action: 'scale_horizontally', weight: 0.6 },
          { action: 'adjust_memory_limits', weight: 0.8 }
        ]
      },
      load_balancing: {
        name: '负载均衡',
        description: '平衡模块间负载分布',
        applicableConditions: (moduleData) => {
          return moduleData.loadFactor && moduleData.loadFactor > 0.85;
        },
        actions: [
          { action: 'redistribute_workload', weight: 0.9 },
          { action: 'spawn_additional_instances', weight: 0.7 },
          { action: 'implement_rate_limiting', weight: 0.6 },
          { action: 'adjust_priority_queues', weight: 0.8 }
        ]
      },
      predictive_loading: {
        name: '预测性加载',
        description: '提前准备资源以应对需求增长',
        applicableConditions: (moduleData) => {
          return moduleData.loadTrend && moduleData.loadTrend === 'increasing';
        },
        actions: [
          { action: 'prewarm_caches', weight: 0.8 },
          { action: 'prepare_backup_instances', weight: 0.7 },
          { action: 'schedule_maintenance', weight: 0.5 },
          { action: 'optimize_database_queries', weight: 0.9 }
        ]
      },
      synchronization_optimization: {
        name: '同步优化',
        description: '提高上下文同步效率',
        applicableConditions: (moduleData) => {
          return moduleData.syncLatency && moduleData.syncLatency > 200;
        },
        actions: [
          { action: 'reduce_payload_size', weight: 0.9 },
          { action: 'compress_transmissions', weight: 0.8 },
          { action: 'increase_batching_size', weight: 0.7 },
          { action: 'optimize_sync_frequency', weight: 0.8 }
        ]
      }
    };
  }

  /**
   * 加载历史性能数据
   */
  async loadHistoricalData() {
    try {
      console.log('[PredictivePlanner] 加载48小时历史性能数据...');
      
      // 生成模拟的48小时数据点（每5分钟一个数据点）
      const dataPoints = [];
      const now = Date.now();
      const interval = 5 * 60 * 1000; // 5分钟
      const totalPoints = Math.floor(48 * 60 / 5); // 48小时内的点数
      
      // 模拟周期性波动和趋势
      const baseLatency = 150;
      const baseErrorRate = 0.02;
      const baseMemoryUsage = 60;
      
      // 模拟不同模块的数据
      const modules = ['daoCollector', 'aiBridge', 'TRAE', 'autoRecoveryCluster', 'realtimeTranslate'];
      
      for (let i = totalPoints - 1; i >= 0; i--) {
        const timestamp = now - (i * interval);
        
        // 模拟负载变化（早晚高峰）
        const hour = new Date(timestamp).getHours();
        const isPeak = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21);
        const loadFactor = isPeak ? 1.5 : 0.8 + Math.random() * 0.2;
        
        // 为每个模块生成数据
        modules.forEach(module => {
          // 添加一些随机性和模块特定的特性
          const moduleOffset = modules.indexOf(module) * 0.1;
          
          // 生成带趋势的指标
          const trendFactor = 1 + (i / totalPoints) * 0.1; // 轻微上升趋势
          const periodicFactor = 1 + Math.sin(i * 0.1) * 0.1; // 周期性波动
          
          // 特定模块的问题模拟
          let moduleSpecificFactor = 1;
          if (module === 'aiBridge' && i > totalPoints - 200) {
            moduleSpecificFactor = 1 + (i - (totalPoints - 200)) * 0.005; // 最近数据显示上升趋势
          }
          
          dataPoints.push({
            timestamp: timestamp,
            module: module,
            latency: Math.round(baseLatency * loadFactor * trendFactor * periodicFactor * moduleSpecificFactor + Math.random() * 20),
            errorRate: parseFloat((baseErrorRate * loadFactor * (0.9 + Math.random() * 0.2)).toFixed(4)),
            memoryUsage: Math.round(baseMemoryUsage * loadFactor * (1 + Math.random() * 0.1)),
            throughput: Math.round(100 * loadFactor * (0.95 + Math.random() * 0.1)),
            syncLatency: module === 'TRAE' ? Math.round(150 * loadFactor * (0.9 + Math.random() * 0.2)) : null,
            activeConnections: Math.round(50 * loadFactor * (0.9 + Math.random() * 0.2))
          });
        });
      }
      
      this.historicalData = dataPoints;
      console.log('[PredictivePlanner] 加载历史数据点数量:', this.historicalData.length);
    } catch (error) {
      console.error('[PredictivePlanner] 加载历史数据失败:', error.message);
    }
  }

  /**
   * 初始化系统状态
   */
  initializeSystemState() {
    console.log('[PredictivePlanner] 初始化系统状态...');
    
    // 提取每个模块的最新数据作为当前状态
    const latestByModule = {};
    
    // 按时间戳降序排序，取每个模块的最新值
    this.historicalData
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach(data => {
        if (!latestByModule[data.module]) {
          latestByModule[data.module] = {
            ...data,
            threshold: this.calculateDynamicThreshold(data),
            loadTrend: this.analyzeLoadTrend(data.module)
          };
        }
      });
    
    this.systemState = latestByModule;
    console.log('[PredictivePlanner] 系统状态模块数:', Object.keys(this.systemState).length);
  }

  /**
   * 计算动态阈值
   */
  calculateDynamicThreshold(data) {
    // 根据历史数据计算动态阈值
    const moduleData = this.historicalData.filter(d => d.module === data.module);
    
    if (moduleData.length < 10) {
      // 默认阈值
      return data.latency * 1.5;
    }
    
    // 计算95百分位作为阈值
    const latencies = moduleData.map(d => d.latency).sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    
    return Math.max(latencies[p95Index], data.latency * 1.3);
  }

  /**
   * 分析负载趋势
   */
  analyzeLoadTrend(moduleName) {
    const recentData = this.historicalData
      .filter(d => d.module === moduleName)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 24); // 最近2小时的数据（每5分钟一个点）
    
    if (recentData.length < 10) {
      return 'stable';
    }
    
    // 计算线性回归斜率
    const n = recentData.length;
    const sumX = n * (n - 1) / 2; // 0+1+2+...+(n-1)
    const sumY = recentData.reduce((sum, d, i) => sum + d.latency, 0);
    const sumXY = recentData.reduce((sum, d, i) => sum + (i * d.latency), 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (slope > 1) return 'increasing';
    if (slope < -1) return 'decreasing';
    return 'stable';
  }

  /**
   * 生成初始预测
   */
  generateInitialPredictions() {
    console.log('[PredictivePlanner] 生成初始预测...');
    
    // 对每个模块生成预测
    Object.keys(this.systemState).forEach(moduleName => {
      const moduleData = this.systemState[moduleName];
      const prediction = this.predictModulePerformance(moduleName);
      
      if (prediction) {
        this.predictions.push({
          id: `pred-${Date.now()}-${moduleName}`,
          timestamp: new Date().toISOString(),
          module: moduleName,
          prediction: prediction,
          confidence: prediction.confidence,
          severity: this.calculatePredictionSeverity(prediction),
          suggestedActions: this.suggestActions(moduleData, prediction)
        });
      }
    });
    
    // 更新统计
    this.metrics.predictionsMade += this.predictions.length;
    console.log('[PredictivePlanner] 初始预测生成完成');
  }

  /**
   * 预测模块性能
   */
  predictModulePerformance(moduleName) {
    // 获取模块历史数据
    const moduleHistory = this.historicalData
      .filter(d => d.module === moduleName)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (moduleHistory.length < 20) {
      return null; // 数据不足
    }
    
    // 使用指数平滑预测
    const latencies = moduleHistory.map(d => d.latency);
    const predictedLatency = this.exponentialSmoothing(latencies, 0.3, this.predictionWindow / 300000); // 预测未来几个点
    
    // 获取当前阈值
    const currentState = this.systemState[moduleName];
    const threshold = currentState.threshold;
    
    // 预测是否会超过阈值
    const willExceedThreshold = predictedLatency > threshold * 1.1;
    
    // 计算预测时间
    const predictedIssueIn = willExceedThreshold ? 
      this.calculateTimeToThreshold(latencies, threshold) : null;
    
    // 计算置信度
    const confidence = this.calculatePredictionConfidence(latencies, predictedLatency);
    
    return {
      metric: 'latency',
      currentValue: currentState.latency,
      predictedValue: predictedLatency,
      threshold: threshold,
      willExceedThreshold: willExceedThreshold,
      predictedIssueIn: predictedIssueIn,
      confidence: confidence
    };
  }

  /**
   * 指数平滑预测
   */
  exponentialSmoothing(data, alpha, steps) {
    if (data.length === 0) return 0;
    
    let smoothed = data[0];
    
    // 平滑历史数据
    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i] + (1 - alpha) * smoothed;
    }
    
    // 预测未来steps步
    let predicted = smoothed;
    
    // 考虑趋势
    const recentData = data.slice(-10);
    const recentAvg = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
    const olderAvg = data.slice(-20, -10).reduce((sum, val) => sum + val, 0) / 10;
    const trend = recentAvg - olderAvg;
    
    for (let i = 0; i < steps; i++) {
      predicted = predicted + trend * 0.3; // 应用趋势
    }
    
    return Math.max(0, predicted);
  }

  /**
   * 计算达到阈值的时间
   */
  calculateTimeToThreshold(latencies, threshold) {
    // 使用最近趋势估计达到阈值的时间
    const recentTrend = this.calculateRecentTrend(latencies);
    
    if (recentTrend <= 0) {
      return Infinity; // 不会达到阈值
    }
    
    const currentValue = latencies[latencies.length - 1];
    const requiredIncrease = threshold - currentValue;
    
    if (requiredIncrease <= 0) {
      return 0; // 已经超过阈值
    }
    
    // 估计所需时间（毫秒）
    const estimatedTimeMs = (requiredIncrease / recentTrend) * 300000; // 假设每5分钟一个数据点
    
    return Math.round(estimatedTimeMs / 1000); // 转换为秒
  }

  /**
   * 计算最近趋势
   */
  calculateRecentTrend(data) {
    const recentData = data.slice(-10);
    
    if (recentData.length < 5) {
      return 0;
    }
    
    // 计算线性回归斜率
    const n = recentData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentData[i];
      sumXY += i * recentData[i];
      sumX2 += i * i;
    }
    
    if (n * sumX2 - sumX * sumX === 0) {
      return 0;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  /**
   * 计算预测置信度
   */
  calculatePredictionConfidence(historicalData, predictedValue) {
    // 基于历史数据的波动性计算置信度
    const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);
    
    // 波动性越小，置信度越高
    const volatilityFactor = Math.max(0, 1 - (stdDev / mean));
    
    // 数据点数量越多，置信度越高
    const dataVolumeFactor = Math.min(1, historicalData.length / 100);
    
    // 结合因素
    const confidence = (volatilityFactor * 0.7 + dataVolumeFactor * 0.3);
    
    return Math.max(0.1, Math.min(0.99, confidence));
  }

  /**
   * 计算预测严重性
   */
  calculatePredictionSeverity(prediction) {
    if (!prediction.willExceedThreshold) return 'info';
    
    const ratio = prediction.predictedValue / prediction.threshold;
    const timeToIssue = prediction.predictedIssueIn;
    
    if (ratio > 1.5 && timeToIssue < 300) return 'critical'; // 5分钟内严重超阈值
    if (ratio > 1.3 && timeToIssue < 600) return 'high'; // 10分钟内超阈值较多
    if (ratio > 1.1) return 'medium'; // 超阈值
    return 'low'; // 轻微超阈值
  }

  /**
   * 建议行动
   */
  suggestActions(moduleData, prediction) {
    const actions = [];
    
    // 应用适用的行动模板
    Object.values(this.actionTemplates).forEach(template => {
      if (template.applicableConditions(moduleData)) {
        // 对模板中的每个行动评分
        template.actions.forEach(action => {
          // 计算该行动对当前情况的适用性得分
          const applicabilityScore = this.calculateActionApplicability(action.action, moduleData, prediction);
          const finalScore = action.weight * applicabilityScore * prediction.confidence;
          
          actions.push({
            action: action.action,
            template: template.name,
            score: finalScore,
            description: this.getActionDescription(action.action, moduleData)
          });
        });
      }
    });
    
    // 特殊处理预测的问题
    if (prediction.willExceedThreshold && prediction.predictedIssueIn < 120) {
      // 紧急情况添加即时行动
      actions.push({
        action: 'immediate_intervention',
        template: '紧急干预',
        score: 1.0,
        description: `[紧急] 模块${moduleData.module}预计${prediction.predictedIssueIn}秒后性能下降，需要立即干预`
      });
    }
    
    // 按分数排序，返回前3个
    return actions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  /**
   * 计算行动适用性
   */
  calculateActionApplicability(action, moduleData, prediction) {
    const applicabilityMap = {
      'increase_resource_allocation': (moduleData.latency > moduleData.threshold * 1.2) ? 0.9 : 0.5,
      'optimize_caching_strategy': (moduleData.module === 'daoCollector' || moduleData.module === 'TRAE') ? 0.9 : 0.6,
      'preload_resources': (prediction.willExceedThreshold && prediction.predictedIssueIn > 60) ? 0.8 : 0.4,
      'adjust_concurrency_limits': (moduleData.activeConnections && moduleData.activeConnections > 40) ? 0.8 : 0.5,
      'implement_circuit_breaker': (moduleData.errorRate > 0.08) ? 0.9 : 0.4,
      'increase_timeout_threshold': (moduleData.latency > moduleData.threshold && moduleData.errorRate > 0.05) ? 0.8 : 0.3,
      'add_retry_mechanism': (moduleData.errorRate > 0.05 && moduleData.errorRate < 0.15) ? 0.9 : 0.4,
      'improve_error_logging': 0.5, // 通用适用
      'trigger_garbage_collection': (moduleData.memoryUsage > 80) ? 0.9 : 0.3,
      'release_unused_resources': (moduleData.memoryUsage > 75) ? 0.8 : 0.4,
      'scale_horizontally': (moduleData.loadFactor && moduleData.loadFactor > 0.85) ? 0.8 : 0.3,
      'adjust_memory_limits': (moduleData.memoryUsage > 85) ? 0.7 : 0.4,
      'redistribute_workload': (moduleData.loadFactor && moduleData.loadFactor > 0.9) ? 0.9 : 0.4,
      'spawn_additional_instances': (prediction.willExceedThreshold && prediction.predictedIssueIn > 180) ? 0.8 : 0.3,
      'implement_rate_limiting': (moduleData.activeConnections && moduleData.activeConnections > 50) ? 0.7 : 0.3,
      'adjust_priority_queues': (moduleData.loadFactor && moduleData.loadFactor > 0.8) ? 0.8 : 0.4,
      'prewarm_caches': (moduleData.loadTrend === 'increasing') ? 0.8 : 0.3,
      'prepare_backup_instances': (prediction.willExceedThreshold && prediction.predictedIssueIn > 300) ? 0.9 : 0.3,
      'schedule_maintenance': (moduleData.errorRate > 0.1) ? 0.7 : 0.2,
      'optimize_database_queries': (moduleData.module === 'daoCollector') ? 0.9 : 0.4,
      'reduce_payload_size': (moduleData.syncLatency && moduleData.syncLatency > 250) ? 0.9 : 0.4,
      'compress_transmissions': (moduleData.syncLatency && moduleData.syncLatency > 200) ? 0.8 : 0.5,
      'increase_batching_size': (moduleData.syncLatency && moduleData.syncLatency > 180) ? 0.7 : 0.4,
      'optimize_sync_frequency': (moduleData.syncLatency && moduleData.syncLatency > 150) ? 0.8 : 0.5,
      'immediate_intervention': 1.0 // 紧急情况最高适用性
    };
    
    return applicabilityMap[action] || 0.5;
  }

  /**
   * 获取行动描述
   */
  getActionDescription(action, moduleData) {
    const descriptions = {
      'increase_resource_allocation': `为${moduleData.module}增加CPU/内存资源分配`,
      'optimize_caching_strategy': `优化${moduleData.module}的缓存策略，减少重复计算`,
      'preload_resources': `预加载${moduleData.module}所需资源，减少响应延迟`,
      'adjust_concurrency_limits': `调整${moduleData.module}的并发连接限制`,
      'implement_circuit_breaker': `在${moduleData.module}实现断路器模式，防止级联故障`,
      'increase_timeout_threshold': `增加${moduleData.module}的超时阈值`,
      'add_retry_mechanism': `为${moduleData.module}添加智能重试机制`,
      'improve_error_logging': `增强${moduleData.module}的错误日志记录`,
      'trigger_garbage_collection': `触发${moduleData.module}的垃圾回收`,
      'release_unused_resources': `释放${moduleData.module}未使用的资源`,
      'scale_horizontally': `水平扩展${moduleData.module}实例数量`,
      'adjust_memory_limits': `调整${moduleData.module}的内存限制`,
      'redistribute_workload': `重新分配${moduleData.module}的工作负载`,
      'spawn_additional_instances': `准备${moduleData.module}的备用实例`,
      'implement_rate_limiting': `为${moduleData.module}实现速率限制`,
      'adjust_priority_queues': `调整${moduleData.module}的任务优先级队列`,
      'prewarm_caches': `预热${moduleData.module}的缓存`,
      'prepare_backup_instances': `准备${moduleData.module}的备份实例`,
      'schedule_maintenance': `为${moduleData.module}安排维护窗口`,
      'optimize_database_queries': `优化${moduleData.module}的数据库查询`,
      'reduce_payload_size': `减少${moduleData.module}的同步数据大小`,
      'compress_transmissions': `压缩${moduleData.module}的传输数据`,
      'increase_batching_size': `增加${moduleData.module}的数据批处理大小`,
      'optimize_sync_frequency': `优化${moduleData.module}的同步频率`,
      'immediate_intervention': `对${moduleData.module}进行紧急干预`
    };
    
    return descriptions[action] || `对${moduleData.module}执行${action}`;
  }

  /**
   * 生成初始优化计划
   */
  generateInitialPlans() {
    console.log('[PredictivePlanner] 生成初始优化计划...');
    
    // 按模块分组预测
    const predictionsByModule = {};
    this.predictions.forEach(pred => {
      predictionsByModule[pred.module] = pred;
    });
    
    // 为每个模块生成优化计划
    Object.keys(predictionsByModule).forEach(moduleName => {
      const prediction = predictionsByModule[moduleName];
      const moduleData = this.systemState[moduleName];
      
      // 只对高置信度预测生成计划
      if (prediction.confidence > this.confidenceThreshold) {
        const plan = this.createOptimizationPlan(moduleName, prediction, moduleData);
        this.plans.push(plan);
      }
    });
    
    // 生成系统级计划
    const systemPlan = this.createSystemLevelPlan();
    if (systemPlan) {
      this.plans.push(systemPlan);
    }
    
    this.metrics.plansGenerated += this.plans.length;
    console.log('[PredictivePlanner] 初始优化计划生成完成');
  }

  /**
   * 创建优化计划
   */
  createOptimizationPlan(moduleName, prediction, moduleData) {
    const priority = this.calculatePlanPriority(prediction, moduleData);
    const actions = prediction.suggestedActions.map(action => ({
      type: action.action,
      description: action.description,
      priority: priority,
      expectedImpact: this.calculateExpectedImpact(action.action, prediction),
      estimatedDuration: this.estimateActionDuration(action.action)
    }));
    
    return {
      id: `plan-${Date.now()}-${moduleName}`,
      timestamp: new Date().toISOString(),
      module: moduleName,
      priority: priority,
      targetMetric: prediction.prediction.metric,
      currentValue: prediction.prediction.currentValue,
      targetValue: this.calculateTargetValue(prediction.prediction),
      deadline: prediction.prediction.willExceedThreshold ? 
        new Date(Date.now() + prediction.prediction.predictedIssueIn * 1000).toISOString() : null,
      actions: actions,
      status: 'pending',
      qualityScore: this.calculatePlanQuality(actions, prediction.confidence),
      expectedOutcome: this.generateExpectedOutcome(moduleName, prediction)
    };
  }

  /**
   * 创建系统级计划
   */
  createSystemLevelPlan() {
    // 分析多个模块之间的协同优化机会
    const modulesWithIssues = this.predictions.filter(p => 
      p.confidence > this.confidenceThreshold && 
      p.severity !== 'info'
    );
    
    if (modulesWithIssues.length < 2) {
      return null; // 不需要系统级计划
    }
    
    // 检查是否有共享问题
    const sharedActions = new Map();
    
    modulesWithIssues.forEach(pred => {
      pred.suggestedActions.forEach(action => {
        const count = sharedActions.get(action.action) || 0;
        sharedActions.set(action.action, count + 1);
      });
    });
    
    // 找出多个模块共享的行动
    const commonActions = Array.from(sharedActions.entries())
      .filter(([_, count]) => count >= Math.min(2, modulesWithIssues.length * 0.5))
      .map(([action]) => action);
    
    if (commonActions.length === 0) {
      return null;
    }
    
    // 创建系统级优化计划
    const actions = commonActions.map(action => ({
      type: action,
      description: `对多个模块执行${action}`,
      priority: 'high',
      affectedModules: modulesWithIssues.map(p => p.module),
      expectedImpact: 0.8,
      estimatedDuration: 300
    }));
    
    return {
      id: `plan-system-${Date.now()}`,
      timestamp: new Date().toISOString(),
      module: 'system-wide',
      priority: 'high',
      targetMetric: 'system_stability',
      description: '多模块协同优化计划',
      actions: actions,
      status: 'pending',
      qualityScore: 0.85,
      expectedOutcome: `优化${modulesWithIssues.length}个模块，提高系统整体稳定性`
    };
  }

  /**
   * 计算计划优先级
   */
  calculatePlanPriority(prediction, moduleData) {
    const severity = prediction.severity;
    const confidence = prediction.confidence;
    const timeToIssue = prediction.prediction.predictedIssueIn;
    
    if (severity === 'critical' || (timeToIssue && timeToIssue < 120)) {
      return 'critical';
    } else if (severity === 'high' || (timeToIssue && timeToIssue < 300)) {
      return 'high';
    } else if (severity === 'medium' || confidence > 0.8) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 计算行动预期影响
   */
  calculateExpectedImpact(action, prediction) {
    // 基于行动类型和预测情况估计影响
    const baseImpactMap = {
      'immediate_intervention': 0.95,
      'increase_resource_allocation': 0.8,
      'optimize_caching_strategy': 0.75,
      'implement_circuit_breaker': 0.85,
      'trigger_garbage_collection': 0.65,
      'redistribute_workload': 0.7,
      'reduce_payload_size': 0.8,
      'preload_resources': 0.6
    };
    
    let baseImpact = baseImpactMap[action] || 0.5;
    
    // 根据预测置信度调整
    baseImpact *= prediction.confidence;
    
    // 根据问题紧急性调整
    if (prediction.prediction.predictedIssueIn && prediction.prediction.predictedIssueIn < 300) {
      baseImpact *= 1.1; // 紧急情况可能需要更激进的措施
    }
    
    return Math.min(0.99, Math.max(0.1, baseImpact));
  }

  /**
   * 估计行动持续时间
   */
  estimateActionDuration(action) {
    const durationMap = {
      'immediate_intervention': 30, // 秒
      'trigger_garbage_collection': 60,
      'optimize_caching_strategy': 180,
      'increase_resource_allocation': 120,
      'implement_circuit_breaker': 300,
      'redistribute_workload': 240,
      'reduce_payload_size': 180,
      'preload_resources': 90
    };
    
    return durationMap[action] || 120;
  }

  /**
   * 计算目标值
   */
  calculateTargetValue(prediction) {
    if (prediction.metric === 'latency') {
      // 目标是将延迟降低到阈值以下
      return Math.round(prediction.threshold * 0.9);
    }
    return prediction.currentValue * 0.9;
  }

  /**
   * 计算计划质量
   */
  calculatePlanQuality(actions, confidence) {
    // 基于行动数量、优先级和预测置信度
    const actionCountFactor = Math.min(1, actions.length / 5);
    const priorityFactor = actions.some(a => a.priority === 'critical' || a.priority === 'high') ? 0.9 : 0.7;
    const impactFactor = actions.reduce((sum, a) => sum + a.expectedImpact, 0) / actions.length;
    
    return actionCountFactor * 0.2 + priorityFactor * 0.3 + impactFactor * 0.3 + confidence * 0.2;
  }

  /**
   * 生成预期结果
   */
  generateExpectedOutcome(moduleName, prediction) {
    const issueTime = prediction.prediction.predictedIssueIn ? 
      `预计${prediction.prediction.predictedIssueIn}秒内` : '潜在';
    const current = prediction.prediction.currentValue;
    const target = this.calculateTargetValue(prediction.prediction);
    const improvement = ((current - target) / current * 100).toFixed(0);
    
    return `防止${issueTime}的${moduleName}性能下降，将${prediction.prediction.metric}从${current}降低到${target}，提升${improvement}%`;
  }

  /**
   * 执行优化计划
   */
  async executePlan(planId) {
    const plan = this.plans.find(p => p.id === planId);
    
    if (!plan) {
      return { success: false, error: '计划不存在' };
    }
    
    if (plan.status === 'executed' || plan.status === 'failed') {
      return { success: false, error: '计划已经执行过' };
    }
    
    try {
      console.log(`[PredictivePlanner] 执行计划 ${planId} 用于 ${plan.module}...`);
      
      // 模拟执行每个行动
      const executionResults = [];
      
      for (const action of plan.actions) {
        const result = await this.executeAction(action, plan.module);
        executionResults.push({
          action: action.type,
          success: result.success,
          message: result.message,
          executionTime: result.executionTime
        });
      }
      
      // 更新计划状态
      const allSuccess = executionResults.every(r => r.success);
      plan.status = allSuccess ? 'executed' : 'partial';
      plan.executionResults = executionResults;
      plan.executionTime = new Date().toISOString();
      
      // 更新统计
      this.metrics.plansExecuted++;
      
      return {
        success: true,
        planId: plan.id,
        executionResults: executionResults,
        finalStatus: plan.status
      };
    } catch (error) {
      plan.status = 'failed';
      plan.failureReason = error.message;
      
      return {
        success: false,
        error: error.message,
        planId: plan.id
      };
    }
  }

  /**
   * 执行单个行动
   */
  async executeAction(action, module) {
    // 模拟行动执行
    await new Promise(resolve => setTimeout(resolve, action.estimatedDuration / 2));
    
    // 模拟执行结果
    const success = Math.random() > 0.1; // 90%成功率
    
    return {
      success: success,
      message: success ? `${action.type} 执行成功` : `${action.type} 执行失败`,
      executionTime: action.estimatedDuration / 2
    };
  }

  /**
   * 更新预测
   */
  updatePredictions(newData) {
    // 添加新数据点
    this.historicalData.push(newData);
    
    // 保持数据量
    if (this.historicalData.length > 48 * 60 * 12) { // 48小时，每5分钟一个点
      this.historicalData.shift();
    }
    
    // 更新系统状态
    this.systemState[newData.module] = {
      ...newData,
      threshold: this.calculateDynamicThreshold(newData),
      loadTrend: this.analyzeLoadTrend(newData.module)
    };
    
    // 重新生成预测
    const newPrediction = this.predictModulePerformance(newData.module);
    
    if (newPrediction) {
      const updatedPrediction = {
        id: `pred-${Date.now()}-${newData.module}`,
        timestamp: new Date().toISOString(),
        module: newData.module,
        prediction: newPrediction,
        confidence: newPrediction.confidence,
        severity: this.calculatePredictionSeverity(newPrediction),
        suggestedActions: this.suggestActions(this.systemState[newData.module], newPrediction)
      };
      
      // 替换旧预测
      const index = this.predictions.findIndex(p => p.module === newData.module);
      if (index >= 0) {
        this.predictions[index] = updatedPrediction;
      } else {
        this.predictions.push(updatedPrediction);
      }
      
      this.metrics.predictionsMade++;
      
      return updatedPrediction;
    }
    
    return null;
  }

  /**
   * 获取预测报告
   */
  getPredictionReports() {
    return this.predictions.map(pred => ({
      module: pred.module,
      predicted_issue_in: pred.prediction.predictedIssueIn ? `${pred.prediction.predictedIssueIn}s` : null,
      recommended_action: pred.suggestedActions.length > 0 ? 
        pred.suggestedActions[0].description : null,
      confidence: pred.confidence,
      severity: pred.severity
    })).filter(report => report.predicted_issue_in !== null);
  }

  /**
   * 获取计划列表
   */
  getPlans() {
    return this.plans.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 评估预测准确性
   */
  evaluatePredictionAccuracy(actualData) {
    const module = actualData.module;
    const prediction = this.predictions.find(p => p.module === module);
    
    if (!prediction) {
      return null;
    }
    
    // 计算预测误差
    const predicted = prediction.prediction.predictedValue;
    const actual = actualData.latency;
    const error = Math.abs(predicted - actual) / predicted;
    
    // 判断预测是否准确（误差小于20%）
    const isAccurate = error < 0.2;
    
    // 更新统计
    if (isAccurate) {
      this.metrics.accuratePredictions++;
    }
    
    // 计算平均准确率
    if (this.metrics.predictionsMade > 0) {
      this.metrics.averageAccuracy = 
        this.metrics.accuratePredictions / this.metrics.predictionsMade;
    }
    
    return {
      module: module,
      prediction: predicted,
      actual: actual,
      error: error,
      isAccurate: isAccurate,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      activePredictions: this.predictions.filter(p => 
        p.prediction.willExceedThreshold
      ).length,
      pendingPlans: this.plans.filter(p => 
        p.status === 'pending'
      ).length,
      executedPlans: this.plans.filter(p => 
        p.status === 'executed'
      ).length,
      avgPlanQuality: this.plans.length > 0 ?
        this.plans.reduce((sum, p) => sum + p.qualityScore, 0) / this.plans.length : 0
    };
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = PredictivePlanner;
} else {
  window.PredictivePlanner = PredictivePlanner;
}

console.log('[L7.0][AutoCognitionCluster] PredictivePlanner 模块加载完成');