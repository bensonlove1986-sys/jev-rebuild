// JEV L7.0 AutoCognition Cluster
// Event Reflection 模块 - 对日志与历史事件进行因果推理与行为反思

class EventReflection {
  constructor() {
    this.events = []; // 事件日志
    this.reflections = []; // 反思记录
    this.causalLinks = new Map(); // 因果关系映射
    this.patterns = new Map(); // 识别的模式
    this.initialized = false;
    this.maxEvents = 500; // 最大事件数
    this.reflectionDepth = 3; // 反思深度
  }

  /**
   * 初始化事件反思模块
   */
  async initialize() {
    try {
      console.log('[EventReflection] 初始化事件反思模块...');
      await this.loadHistoricalEvents();
      await this.loadLogFiles();
      this.analyzeEvents();
      this.discoverCausalRelationships();
      this.identifyPatterns();
      this.initialized = true;
      console.log('[EventReflection] 初始化完成，事件数:', this.events.length, '反思数:', this.reflections.length);
      return { success: true, events: this.events.length, reflections: this.reflections.length };
    } catch (error) {
      console.error('[EventReflection] 初始化失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 加载历史事件
   */
  async loadHistoricalEvents() {
    try {
      console.log('[EventReflection] 加载历史事件...');
      
      // 模拟从系统加载事件数据
      const events = [
        { id: 'evt-001', timestamp: Date.now() - 3600000, type: 'performance', source: 'daoCollector', severity: 'warning', description: '模块A响应时间增加45%', metadata: { latency: 420, previousLatency: 289 } },
        { id: 'evt-002', timestamp: Date.now() - 3500000, type: 'cascade', source: 'autoRecoveryCluster', severity: 'critical', description: '模块D故障引发连锁反应', metadata: { failurePath: 'moduleD → moduleE → moduleF' } },
        { id: 'evt-003', timestamp: Date.now() - 3400000, type: 'resource', source: 'watchdog', severity: 'warning', description: '内存使用率持续增长', metadata: { currentUsage: 65, previousUsage: 45, trend: 'growing' } },
        { id: 'evt-004', timestamp: Date.now() - 3300000, type: 'performance', source: 'realtimeTranslate', severity: 'warning', description: 'realtimeTranslate module shows periodic overload', metadata: { threshold: 0.7, current: 0.82 } },
        { id: 'evt-005', timestamp: Date.now() - 3200000, type: 'execution', source: 'autoLearningOptimizer', severity: 'info', description: '优化计划执行成功', metadata: { planId: 'plan-001', successRate: 0.95 } },
        { id: 'evt-006', timestamp: Date.now() - 3100000, type: 'timeout', source: 'daoCollector', severity: 'error', description: 'daoCollector timeout', metadata: { duration: 5000, threshold: 3000 } },
        { id: 'evt-007', timestamp: Date.now() - 3000000, type: 'recovery', source: 'autoRecoveryCluster', severity: 'info', description: 'recoveryCluster reload', metadata: { modulesAffected: 3, recoveryTime: 24500 } },
        { id: 'evt-008', timestamp: Date.now() - 2900000, type: 'interaction', source: 'autoOrchestrator', severity: 'info', description: '模块B和模块C之间存在高频交互', metadata: { interactionCount: 1200, timeWindow: '1h' } },
        { id: 'evt-009', timestamp: Date.now() - 2800000, type: 'performance', source: 'daoCollector', severity: 'warning', description: '模块A响应时间再次增加', metadata: { latency: 480, previousLatency: 420 } },
        { id: 'evt-010', timestamp: Date.now() - 2700000, type: 'resource', source: 'watchdog', severity: 'warning', description: '内存使用率继续增长', metadata: { currentUsage: 72, previousUsage: 65, trend: 'growing' } },
        { id: 'evt-011', timestamp: Date.now() - 2600000, type: 'error', source: 'TRAE', severity: 'warning', description: '上下文同步延迟', metadata: { latency: 320, threshold: 200 } },
        { id: 'evt-012', timestamp: Date.now() - 2500000, type: 'execution', source: 'predictivePlanner', severity: 'info', description: '生成内存优化计划', metadata: { confidence: 0.92, objectives: ['降低内存使用率'] } },
        { id: 'evt-013', timestamp: Date.now() - 2400000, type: 'timeout', source: 'daoCollector', severity: 'error', description: 'daoCollector再次timeout', metadata: { duration: 5200, threshold: 3000 } },
        { id: 'evt-014', timestamp: Date.now() - 2300000, type: 'recovery', source: 'autoRecoveryCluster', severity: 'info', description: 'recoveryCluster再次reload', metadata: { modulesAffected: 2, recoveryTime: 23800 } },
        { id: 'evt-015', timestamp: Date.now() - 2200000, type: 'performance', source: 'aiBridge', severity: 'warning', description: 'aiBridge延迟增加', metadata: { latency: 180, previousLatency: 120 } },
        { id: 'evt-016', timestamp: Date.now() - 2100000, type: 'resource', source: 'watchdog', severity: 'warning', description: '内存使用率接近警告阈值', metadata: { currentUsage: 78, previousUsage: 72, thresholdWarning: 80 } },
        { id: 'evt-017', timestamp: Date.now() - 2000000, type: 'execution', source: 'selfOptimizer', severity: 'info', description: '调整模块权重和阈值', metadata: { weightAdjustments: 3, thresholdChanges: 2 } }
      ];
      
      this.events = [...events].slice(-this.maxEvents);
      console.log('[EventReflection] 加载事件数:', this.events.length);
    } catch (error) {
      console.error('[EventReflection] 加载历史事件失败:', error.message);
    }
  }

  /**
   * 加载日志文件
   */
  async loadLogFiles() {
    try {
      console.log('[EventReflection] 加载日志文件...');
      
      // 模拟加载TRAE Bridge报告
      const bridgeReport = {
        performance: {
          averageLatency: 156,
          p95Latency: 320,
          errorRate: 0.028
        },
        sessions: [
          { id: 'session-001', status: 'active', duration: 3600, events: 120 },
          { id: 'session-002', status: 'active', duration: 1800, events: 65 },
          { id: 'session-003', status: 'error', duration: 900, events: 25, error: 'timeout' }
        ],
        syncHistory: [
          { timestamp: Date.now() - 1800000, type: 'context_sync', success: true, latency: 120 },
          { timestamp: Date.now() - 1700000, type: 'context_sync', success: true, latency: 135 },
          { timestamp: Date.now() - 1600000, type: 'context_sync', success: false, error: 'timeout' }
        ]
      };
      
      // 从报告中提取事件
      if (bridgeReport.syncHistory) {
        bridgeReport.syncHistory.forEach(sync => {
          this.events.push({
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: sync.timestamp,
            type: 'synchronization',
            source: 'TRAE',
            severity: sync.success ? 'info' : 'error',
            description: sync.success ? 'Context sync successful' : 'Context sync failed',
            metadata: { latency: sync.latency, error: sync.error }
          });
        });
      }
      
      console.log('[EventReflection] 从日志文件加载完成，总事件数:', this.events.length);
    } catch (error) {
      console.error('[EventReflection] 加载日志文件失败:', error.message);
    }
  }

  /**
   * 分析事件因果关系
   */
  analyzeEvents() {
    console.log('[EventReflection] 分析事件因果关系...');
    
    // 按时间排序事件
    this.events.sort((a, b) => a.timestamp - b.timestamp);
    
    // 分析时间上接近的事件，寻找因果关系
    const timeWindow = 60000; // 60秒时间窗口
    
    for (let i = 0; i < this.events.length; i++) {
      const currentEvent = this.events[i];
      
      // 如果当前事件是错误或警告，查找可能的原因
      if (['error', 'warning', 'critical'].includes(currentEvent.severity)) {
        const potentialCauses = [];
        
        // 查找时间窗口内的先前事件
        for (let j = i - 1; j >= 0 && currentEvent.timestamp - this.events[j].timestamp <= timeWindow; j--) {
          const prevEvent = this.events[j];
          
          // 检查是否存在源-目标关系或类型关联
          if (this.checkPotentialCause(prevEvent, currentEvent)) {
            potentialCauses.push({
              event: prevEvent,
              confidence: this.calculateConfidence(prevEvent, currentEvent)
            });
          }
        }
        
        // 如果找到潜在原因，添加到因果关系映射
        if (potentialCauses.length > 0) {
          // 按置信度排序
          potentialCauses.sort((a, b) => b.confidence - a.confidence);
          
          const linkId = `${potentialCauses[0].event.id}_${currentEvent.id}`;
          this.causalLinks.set(linkId, {
            cause: potentialCauses[0].event,
            effect: currentEvent,
            confidence: potentialCauses[0].confidence,
            timestamp: currentEvent.timestamp
          });
          
          // 为主要原因生成反思
          if (potentialCauses[0].confidence > 0.7) {
            this.generateReflection(potentialCauses[0].event, currentEvent, potentialCauses[0].confidence);
          }
        }
      }
    }
    
    console.log('[EventReflection] 发现因果关系数:', this.causalLinks.size);
  }

  /**
   * 检查潜在的因果关系
   */
  checkPotentialCause(causeEvent, effectEvent) {
    // 检查源模块关联
    if (causeEvent.source === effectEvent.source) return true;
    
    // 检查事件类型关联
    const typeRelationships = {
      'timeout': ['recovery', 'cascade'],
      'performance': ['resource', 'timeout', 'error'],
      'resource': ['performance', 'error', 'cascade'],
      'error': ['recovery', 'cascade']
    };
    
    if (typeRelationships[causeEvent.type] && typeRelationships[causeEvent.type].includes(effectEvent.type)) {
      return true;
    }
    
    // 检查描述中的模块引用
    const causeModules = this.extractModuleReferences(causeEvent.description);
    const effectModules = this.extractModuleReferences(effectEvent.description);
    
    for (const causeMod of causeModules) {
      for (const effectMod of effectModules) {
        if (causeMod === effectMod) return true;
      }
    }
    
    return false;
  }

  /**
   * 计算因果关系置信度
   */
  calculateConfidence(causeEvent, effectEvent) {
    let confidence = 0.5; // 基础置信度
    
    // 时间接近度（越近置信度越高）
    const timeDiff = effectEvent.timestamp - causeEvent.timestamp;
    const timeProximity = Math.max(0, 1 - (timeDiff / 60000)); // 60秒内
    confidence += timeProximity * 0.3;
    
    // 源模块相同
    if (causeEvent.source === effectEvent.source) {
      confidence += 0.1;
    }
    
    // 类型关联度
    const typeConfidenceMap = {
      'timeout_recovery': 0.8,
      'performance_timeout': 0.7,
      'resource_performance': 0.75,
      'error_cascade': 0.85
    };
    
    const typeKey = `${causeEvent.type}_${effectEvent.type}`;
    if (typeConfidenceMap[typeKey]) {
      confidence += typeConfidenceMap[typeKey] * 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * 从描述中提取模块引用
   */
  extractModuleReferences(description) {
    const moduleKeywords = [
      'module', 'daoCollector', 'autoRecoveryCluster', 'aiAutoReply', 
      'optimizer', 'aiBridge', 'TRAE', 'autoOrchestrator', 
      'realtimeTranslate', 'autoLearningOptimizer', 'watchdog'
    ];
    
    const references = [];
    for (const keyword of moduleKeywords) {
      if (description.toLowerCase().includes(keyword.toLowerCase())) {
        references.push(keyword);
      }
    }
    
    return references;
  }

  /**
   * 生成反思记录
   */
  generateReflection(causeEvent, effectEvent, confidence) {
    let reflectionText = '';
    let recommendation = '';
    
    // 根据事件类型生成不同的反思
    if (effectEvent.type === 'performance' && effectEvent.source === 'realtimeTranslate') {
      reflectionText = `[Reflection] "${effectEvent.description}; will lower threshold to 0.55 next cycle."`;
      recommendation = '降低realtimeTranslate模块阈值至0.55';
    } else if (causeEvent.type === 'timeout' && effectEvent.type === 'recovery') {
      reflectionText = `[Reflection] "Detected ${causeEvent.source} timeout leading to ${effectEvent.source} recovery; suggests potential resource constraints."`;
      recommendation = '检查daoCollector资源使用情况，考虑增加超时阈值';
    } else if (effectEvent.type === 'resource' && effectEvent.metadata.trend === 'growing') {
      reflectionText = `[Reflection] "Memory usage consistently growing from ${effectEvent.metadata.previousUsage}% to ${effectEvent.metadata.currentUsage}%; potential resource leak detected."`;
      recommendation = '执行内存优化计划，检查资源释放机制';
    } else if (causeEvent.type === 'error' && effectEvent.type === 'cascade') {
      reflectionText = `[Reflection] "Module failure cascade detected along path: ${effectEvent.metadata.failurePath}; requires circuit breaker implementation."`;
      recommendation = '在关键模块实现断路器模式';
    } else {
      reflectionText = `[Reflection] "Possible causal relationship between ${causeEvent.source} (${causeEvent.type}) and ${effectEvent.source} (${effectEvent.type}) with ${(confidence * 100).toFixed(0)}% confidence."`;
      recommendation = '监控相关模块性能指标';
    }
    
    const reflection = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      confidence: confidence,
      cause: causeEvent,
      effect: effectEvent,
      text: reflectionText,
      recommendation: recommendation,
      depth: this.calculateReflectionDepth(causeEvent, effectEvent)
    };
    
    this.reflections.push(reflection);
  }

  /**
   * 计算反思深度
   */
  calculateReflectionDepth(causeEvent, effectEvent) {
    // 根据事件复杂度和影响范围计算深度
    let depth = 1;
    
    if (effectEvent.severity === 'critical') depth++;
    if (effectEvent.metadata && effectEvent.metadata.modulesAffected > 2) depth++;
    if (this.findRootCause(causeEvent)) depth++;
    
    return Math.min(this.reflectionDepth, depth);
  }

  /**
   * 查找根本原因
   */
  findRootCause(event) {
    // 查找该事件的原因事件
    for (const [, link] of this.causalLinks.entries()) {
      if (link.effect.id === event.id) {
        return link.cause;
      }
    }
    return null;
  }

  /**
   * 发现因果关系网络
   */
  discoverCausalRelationships() {
    console.log('[EventReflection] 发现深层次因果关系...');
    
    // 构建因果图并分析
    const causalGraph = {};
    
    this.causalLinks.forEach((link, linkId) => {
      if (!causalGraph[link.cause.id]) {
        causalGraph[link.cause.id] = [];
      }
      causalGraph[link.cause.id].push({
        effect: link.effect.id,
        confidence: link.confidence
      });
    });
    
    // 分析常见的因果链
    this.analyzeCommonChains(causalGraph);
  }

  /**
   * 分析常见的因果链
   */
  analyzeCommonChains(causalGraph) {
    const chains = [];
    const chainLength = 3;
    
    // 查找长度为chainLength的链
    const findChains = (current, path, visited) => {
      if (path.length === chainLength) {
        chains.push([...path]);
        return;
      }
      
      if (!causalGraph[current] || visited.has(current)) return;
      
      visited.add(current);
      causalGraph[current].forEach(next => {
        path.push(next.effect);
        findChains(next.effect, path, visited);
        path.pop();
      });
      visited.delete(current);
    };
    
    // 对每个事件作为起点开始搜索
    Object.keys(causalGraph).forEach(eventId => {
      findChains(eventId, [eventId], new Set());
    });
    
    // 统计链出现的频率
    const chainFrequency = new Map();
    chains.forEach(chain => {
      const chainKey = chain.join('→');
      chainFrequency.set(chainKey, (chainFrequency.get(chainKey) || 0) + 1);
    });
    
    // 对高频链生成深度反思
    Array.from(chainFrequency.entries())
      .filter(([_, freq]) => freq > 1)
      .forEach(([chainKey, frequency]) => {
        const eventIds = chainKey.split('→');
        const events = eventIds.map(id => this.events.find(e => e.id === id)).filter(e => e);
        
        if (events.length === chainLength) {
          this.performDeepReflection(events, frequency);
        }
      });
  }

  /**
   * 执行深度反思
   */
  performDeepReflection(eventChain, frequency) {
    const reflectionId = `deep-ref-${Date.now()}`;
    const sourceModules = [...new Set(eventChain.map(e => e.source))];
    const eventTypes = eventChain.map(e => e.type);
    
    let reflectionText = `[DeepReflection] "Detected recurring event chain (x${frequency}): ${eventTypes.join(' → ')} involving modules: ${sourceModules.join(', ')}. `;
    let recommendation = '';
    
    // 分析特定的问题链
    if (eventTypes.includes('timeout') && eventTypes.includes('recovery') && eventTypes.includes('cascade')) {
      reflectionText += 'This indicates a systemic resilience issue."';
      recommendation = '实施完整的故障隔离策略，优化超时处理机制';
    } else if (eventTypes.includes('performance') && eventTypes.includes('resource')) {
      reflectionText += 'This suggests performance degradation due to resource constraints."';
      recommendation = '优化资源使用，考虑横向扩展关键模块';
    } else {
      reflectionText += 'This pattern warrants further investigation."';
      recommendation = '建立针对此类事件链的专项监控';
    }
    
    const reflection = {
      id: reflectionId,
      timestamp: new Date().toISOString(),
      confidence: 0.9,
      eventChain: eventChain,
      text: reflectionText,
      recommendation: recommendation,
      depth: this.reflectionDepth,
      isDeep: true
    };
    
    this.reflections.push(reflection);
  }

  /**
   * 识别事件模式
   */
  identifyPatterns() {
    console.log('[EventReflection] 识别事件模式...');
    
    // 按类型和源聚合事件
    const eventAggregates = new Map();
    
    this.events.forEach(event => {
      const key = `${event.type}_${event.source}`;
      if (!eventAggregates.has(key)) {
        eventAggregates.set(key, []);
      }
      eventAggregates.get(key).push(event);
    });
    
    // 分析时间模式
    eventAggregates.forEach((events, key) => {
      if (events.length >= 3) { // 至少需要3个事件来识别模式
        const timeDiffs = [];
        for (let i = 1; i < events.length; i++) {
          timeDiffs.push(events[i].timestamp - events[i - 1].timestamp);
        }
        
        // 计算平均时间间隔和标准差
        const avgInterval = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
        const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgInterval, 2), 0) / timeDiffs.length;
        const stdDev = Math.sqrt(variance);
        
        // 如果标准差很小，说明有周期性
        const regularity = 1 - (stdDev / avgInterval);
        
        if (regularity > 0.7 && avgInterval > 60000) { // 1分钟以上的周期，且规律性强
          this.patterns.set(key, {
            type: events[0].type,
            source: events[0].source,
            periodicity: avgInterval,
            regularity: regularity,
            count: events.length,
            lastOccurrence: events[events.length - 1].timestamp,
            description: `Periodic ${events[0].type} events from ${events[0].source} every ~${Math.round(avgInterval / 60000)} minutes`
          });
        }
      }
    });
    
    // 识别特定的问题模式
    this.identifySpecificPatterns();
    
    console.log('[EventReflection] 识别的模式数:', this.patterns.size);
  }

  /**
   * 识别特定的问题模式
   */
  identifySpecificPatterns() {
    // 检查daoCollector → timeout → recoveryCluster → reload 模式
    const daoCollectorEvents = this.events.filter(e => e.source === 'daoCollector' && e.type === 'timeout');
    const recoveryEvents = this.events.filter(e => e.source === 'autoRecoveryCluster' && e.type === 'recovery');
    
    if (daoCollectorEvents.length >= 2 && recoveryEvents.length >= 2) {
      // 检查时间序列
      let patternCount = 0;
      
      for (let i = 0; i < daoCollectorEvents.length; i++) {
        const timeoutEvent = daoCollectorEvents[i];
        // 查找在超时后30秒内发生的恢复事件
        const relatedRecovery = recoveryEvents.find(r => 
          r.timestamp > timeoutEvent.timestamp && 
          r.timestamp - timeoutEvent.timestamp < 30000
        );
        
        if (relatedRecovery) {
          patternCount++;
        }
      }
      
      if (patternCount >= 2) {
        this.patterns.set('dao_recovery_pattern', {
          name: 'daoCollector → timeout → recoveryCluster → reload',
          frequency: patternCount,
          confidence: 0.91,
          description: 'daoCollector超时后触发recoveryCluster重新加载的模式',
          recommendation: '优化daoCollector性能或增加资源配置'
        });
      }
    }
    
    // 检查内存增长模式
    const memoryEvents = this.events.filter(e => 
      e.type === 'resource' && 
      e.metadata && 
      e.metadata.currentUsage && 
      e.metadata.previousUsage
    );
    
    if (memoryEvents.length >= 3) {
      let consistentlyGrowing = true;
      let totalGrowth = 0;
      
      for (let i = 1; i < memoryEvents.length; i++) {
        const current = memoryEvents[i].metadata.currentUsage;
        const previous = memoryEvents[i].metadata.previousUsage;
        if (current <= previous) {
          consistentlyGrowing = false;
          break;
        }
        totalGrowth += current - previous;
      }
      
      if (consistentlyGrowing) {
        this.patterns.set('memory_growth_pattern', {
          name: 'continuous_memory_growth',
          frequency: memoryEvents.length,
          confidence: 0.88,
          description: `内存使用率持续增长，累计增长${totalGrowth}%`,
          recommendation: '执行内存优化计划，检查资源泄漏'
        });
      }
    }
  }

  /**
   * 获取关键洞察
   */
  getKeyInsights() {
    if (!this.initialized) {
      return [];
    }
    
    // 按置信度排序反思
    return this.reflections
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // 返回前10个高置信度洞察
      .map(reflection => ({
        insight_id: reflection.id,
        type: this.determineInsightType(reflection),
        severity: reflection.effect ? reflection.effect.severity : 'info',
        description: reflection.text,
        confidence: reflection.confidence,
        timestamp: reflection.timestamp,
        recommendation: reflection.recommendation
      }));
  }

  /**
   * 确定洞察类型
   */
  determineInsightType(reflection) {
    if (reflection.isDeep) return 'deep_analysis';
    
    if (reflection.effect && reflection.effect.type === 'performance') return 'performance_degradation';
    if (reflection.effect && reflection.effect.type === 'resource') return 'resource_leak';
    if (reflection.effect && reflection.effect.type === 'cascade') return 'cascade_failure';
    if (reflection.effect && reflection.effect.type === 'timeout') return 'timeout_pattern';
    
    return 'module_interaction';
  }

  /**
   * 获取识别的模式
   */
  getIdentifiedPatterns() {
    return Array.from(this.patterns.values()).sort((a, b) => {
      if (a.confidence && b.confidence) {
        return b.confidence - a.confidence;
      }
      return 0;
    });
  }

  /**
   * 添加新事件并分析
   */
  addEvent(event) {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // 重新分析
    this.analyzeEvents();
    this.discoverCausalRelationships();
    this.identifyPatterns();
  }

  /**
   * 获取反思统计
   */
  getReflectionStatistics() {
    const totalReflections = this.reflections.length;
    const deepReflections = this.reflections.filter(r => r.isDeep).length;
    
    // 按类型统计
    const reflectionByType = {};
    this.reflections.forEach(reflection => {
      const type = this.determineInsightType(reflection);
      reflectionByType[type] = (reflectionByType[type] || 0) + 1;
    });
    
    // 计算平均置信度
    const averageConfidence = totalReflections > 0 ? 
      this.reflections.reduce((sum, r) => sum + r.confidence, 0) / totalReflections : 0;
    
    return {
      total_reflections: totalReflections,
      deep_reflections: deepReflections,
      reflection_by_type: reflectionByType,
      average_confidence: averageConfidence,
      top_contributors: this.calculateTopContributors()
    };
  }

  /**
   * 计算主要贡献模块
   */
  calculateTopContributors() {
    const moduleCounts = new Map();
    
    this.reflections.forEach(reflection => {
      if (reflection.cause) {
        moduleCounts.set(reflection.cause.source, (moduleCounts.get(reflection.cause.source) || 0) + 1);
      }
      if (reflection.effect) {
        moduleCounts.set(reflection.effect.source, (moduleCounts.get(reflection.effect.source) || 0) + 1);
      }
    });
    
    // 转换为百分比
    const total = Array.from(moduleCounts.values()).reduce((a, b) => a + b, 0);
    const contributors = Array.from(moduleCounts.entries())
      .map(([module, count]) => ({
        module,
        contribution: count / total
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);
    
    return contributors;
  }

  /**
   * 生成因果发现报告
   */
  generateCausalDiscoveryReport() {
    const links = Array.from(this.causalLinks.values());
    const highConfidenceLinks = links.filter(l => l.confidence > 0.8);
    
    // 找出最显著的因果链
    let mostSignificantLink = null;
    if (links.length > 0) {
      mostSignificantLink = links.reduce((max, current) => 
        current.confidence > max.confidence ? current : max
      );
    }
    
    // 获取重复模式
    const recurringPatterns = this.getIdentifiedPatterns()
      .filter(p => p.frequency && p.frequency > 1)
      .map(p => ({
        pattern: p.name || p.type + '_' + p.source,
        frequency: p.frequency,
        confidence: p.confidence
      }));
    
    return {
      causal_links_found: links.length,
      high_confidence_links: highConfidenceLinks.length,
      most_significant_link: mostSignificantLink ? {
        source: mostSignificantLink.cause.source,
        target: mostSignificantLink.effect.source,
        confidence: mostSignificantLink.confidence,
        description: `${mostSignificantLink.cause.type} leads to ${mostSignificantLink.effect.type}`
      } : null,
      recurring_patterns: recurringPatterns
    };
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = EventReflection;
} else {
  window.EventReflection = EventReflection;
}

console.log('[L7.0][AutoCognitionCluster] EventReflection 模块加载完成');