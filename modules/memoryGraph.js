// JEV L7.0 AutoCognition Cluster
// Memory Graph 模块 - 构建系统记忆图谱，分析模块间因果与依赖

class MemoryGraph {
  constructor() {
    this.nodes = new Map(); // 模块节点
    this.edges = new Map(); // 模块关系边
    this.eventLogs = []; // 事件日志
    this.initialized = false;
    this.maxLogEntries = 500; // 最大日志条目数
    this.moduleImportance = new Map(); // 模块重要性评分
    this.anomalyPaths = new Map(); // 异常路径与评分
    this.criticalPaths = []; // 关键路径
  }

  /**
   * 初始化记忆图谱
   */
  async initialize() {
    try {
      console.log('[MemoryGraph] 初始化记忆图谱模块...');
      await this.loadSystemLogs();
      await this.loadDurableObjectData();
      this.buildGraph();
      this.analyzeModuleImportance();
      this.detectAnomalyPaths();
      this.findCriticalPaths();
      this.initialized = true;
      console.log('[MemoryGraph] 初始化完成，节点数:', this.nodes.size, '关系数:', this.edges.size);
      return { success: true, nodes: this.nodes.size, edges: this.edges.size };
    } catch (error) {
      console.error('[MemoryGraph] 初始化失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 从系统日志加载数据
   */
  async loadSystemLogs() {
    try {
      console.log('[MemoryGraph] 加载系统日志...');
      
      // 模拟从日志文件加载数据
      const logs = [
        { timestamp: Date.now() - 3600000, source: 'daoCollector', target: 'autoRecoveryCluster', event: 'data_transfer', result: 'success', latency: 230 },
        { timestamp: Date.now() - 3500000, source: 'aiAutoReply', target: 'optimizer', event: 'performance_data', result: 'success', latency: 180 },
        { timestamp: Date.now() - 3400000, source: 'daoCollector', target: 'autoRecoveryCluster', event: 'timeout', result: 'failure', latency: 5000 },
        { timestamp: Date.now() - 3300000, source: 'autoRecoveryCluster', target: 'memoryGraph', event: 'reload', result: 'success', latency: 450 },
        { timestamp: Date.now() - 3200000, source: 'aiBridge', target: 'TRAE', event: 'context_sync', result: 'success', latency: 120 },
        { timestamp: Date.now() - 3100000, source: 'autoOrchestrator', target: 'autoRecoveryCluster', event: 'priority_adjust', result: 'success', latency: 95 },
        { timestamp: Date.now() - 3000000, source: 'aiAutoReply', target: 'optimizer', event: 'feedback', result: 'success', latency: 210 },
        { timestamp: Date.now() - 2900000, source: 'daoCollector', target: 'autoRecoveryCluster', event: 'timeout', result: 'failure', latency: 5200 },
        { timestamp: Date.now() - 2800000, source: 'autoRecoveryCluster', target: 'memoryGraph', event: 'reload', result: 'success', latency: 430 },
        { timestamp: Date.now() - 2700000, source: 'realtimeTranslate', target: 'TRAE', event: 'overload', result: 'warning', latency: 870 },
        { timestamp: Date.now() - 2600000, source: 'aiBridge', target: 'TRAE', event: 'context_sync', result: 'success', latency: 135 },
        { timestamp: Date.now() - 2500000, source: 'autoLearningOptimizer', target: 'autoOrchestrator', event: 'weight_update', result: 'success', latency: 78 },
        { timestamp: Date.now() - 2400000, source: 'daoCollector', target: 'autoRecoveryCluster', event: 'timeout', result: 'failure', latency: 5100 },
        { timestamp: Date.now() - 2300000, source: 'autoRecoveryCluster', target: 'memoryGraph', event: 'reload', result: 'success', latency: 440 },
        { timestamp: Date.now() - 2200000, source: 'watchdog', target: 'autoRecoveryCluster', event: 'threshold_exceeded', result: 'warning', latency: 45 }
      ];
      
      this.eventLogs = [...logs].slice(-this.maxLogEntries);
      console.log('[MemoryGraph] 加载日志条目数:', this.eventLogs.length);
    } catch (error) {
      console.error('[MemoryGraph] 加载日志失败:', error.message);
    }
  }

  /**
   * 从Durable Objects加载数据
   */
  async loadDurableObjectData() {
    try {
      console.log('[MemoryGraph] 从Durable Objects加载模块数据...');
      
      // 模拟从Durable Objects加载模块数据
      const modules = [
        { id: 'daoCollector', name: '数据收集模块', status: 'active', importance: 0.85 },
        { id: 'autoRecoveryCluster', name: '自动恢复集群', status: 'active', importance: 0.92 },
        { id: 'aiAutoReply', name: 'AI自动回复', status: 'active', importance: 0.78 },
        { id: 'optimizer', name: '优化器', status: 'active', importance: 0.82 },
        { id: 'aiBridge', name: 'AI桥接模块', status: 'active', importance: 0.88 },
        { id: 'TRAE', name: 'TRAE引擎', status: 'active', importance: 0.95 },
        { id: 'autoOrchestrator', name: '自动编排器', status: 'active', importance: 0.89 },
        { id: 'realtimeTranslate', name: '实时翻译', status: 'warning', importance: 0.76 },
        { id: 'autoLearningOptimizer', name: '自动学习优化器', status: 'active', importance: 0.83 },
        { id: 'watchdog', name: '监控看门狗', status: 'active', importance: 0.87 },
        { id: 'memoryGraph', name: '记忆图谱', status: 'active', importance: 0.80 },
        { id: 'eventReflection', name: '事件反思', status: 'initializing', importance: 0.86 },
        { id: 'predictivePlanner', name: '预测规划器', status: 'initializing', importance: 0.84 },
        { id: 'selfOptimizer', name: '自我优化器', status: 'initializing', importance: 0.90 }
      ];
      
      // 添加模块节点
      modules.forEach(module => {
        this.nodes.set(module.id, {
          id: module.id,
          name: module.name,
          status: module.status,
          importance: module.importance,
          events: 0,
          failures: 0,
          successRate: 1.0
        });
      });
      
      console.log('[MemoryGraph] 加载模块数:', this.nodes.size);
    } catch (error) {
      console.error('[MemoryGraph] 加载Durable Objects数据失败:', error.message);
    }
  }

  /**
   * 构建模块关系图谱
   */
  buildGraph() {
    console.log('[MemoryGraph] 构建模块关系图谱...');
    
    // 处理每条事件日志
    this.eventLogs.forEach(log => {
      // 更新源模块统计
      if (this.nodes.has(log.source)) {
        const sourceNode = this.nodes.get(log.source);
        sourceNode.events++;
        if (log.result === 'failure') {
          sourceNode.failures++;
        }
        sourceNode.successRate = sourceNode.events > 0 ? 
          1 - (sourceNode.failures / sourceNode.events) : 1.0;
        this.nodes.set(log.source, sourceNode);
      }
      
      // 更新目标模块统计
      if (this.nodes.has(log.target)) {
        const targetNode = this.nodes.get(log.target);
        targetNode.events++;
        if (log.result === 'failure') {
          targetNode.failures++;
        }
        targetNode.successRate = targetNode.events > 0 ? 
          1 - (targetNode.failures / targetNode.events) : 1.0;
        this.nodes.set(log.target, targetNode);
      }
      
      // 创建或更新边关系
      const edgeKey = `${log.source}_${log.target}`;
      if (this.edges.has(edgeKey)) {
        const edge = this.edges.get(edgeKey);
        edge.weight = Math.min(1.0, edge.weight + 0.05);
        edge.count++;
        edge.totalLatency += log.latency;
        edge.avgLatency = edge.totalLatency / edge.count;
        if (log.result === 'failure') {
          edge.failures++;
        }
        edge.successRate = edge.count > 0 ? 
          1 - (edge.failures / edge.count) : 1.0;
        this.edges.set(edgeKey, edge);
      } else {
        this.edges.set(edgeKey, {
          from: log.source,
          to: log.target,
          weight: 0.1,
          count: 1,
          totalLatency: log.latency,
          avgLatency: log.latency,
          failures: log.result === 'failure' ? 1 : 0,
          successRate: log.result === 'failure' ? 0 : 1,
          eventTypes: new Set([log.event])
        });
      }
    });
    
    console.log('[MemoryGraph] 图谱构建完成，边数:', this.edges.size);
  }

  /**
   * 分析模块重要性
   */
  analyzeModuleImportance() {
    console.log('[MemoryGraph] 分析模块重要性...');
    
    this.nodes.forEach((node, nodeId) => {
      // 计算入度和出度
      let inDegree = 0;
      let outDegree = 0;
      let inWeightSum = 0;
      let outWeightSum = 0;
      
      this.edges.forEach(edge => {
        if (edge.to === nodeId) {
          inDegree++;
          inWeightSum += edge.weight;
        }
        if (edge.from === nodeId) {
          outDegree++;
          outWeightSum += edge.weight;
        }
      });
      
      // 综合计算重要性分数
      const importanceScore = (
        node.importance * 0.5 +  // 基础重要性
        (inDegree + outDegree) / 20 * 0.2 +  // 连接度影响
        node.successRate * 0.1 +  // 成功率影响
        (inWeightSum + outWeightSum) / 2 * 0.2  // 关系权重影响
      );
      
      this.moduleImportance.set(nodeId, importanceScore);
      
      // 更新节点重要性
      node.importanceScore = importanceScore;
      node.inDegree = inDegree;
      node.outDegree = outDegree;
      this.nodes.set(nodeId, node);
    });
    
    console.log('[MemoryGraph] 模块重要性分析完成');
  }

  /**
   * 检测异常路径
   */
  detectAnomalyPaths() {
    console.log('[MemoryGraph] 检测异常路径...');
    
    // 查找失败率高的路径
    const failureThreshold = 0.3; // 30%失败率阈值
    
    this.edges.forEach((edge, edgeKey) => {
      if (edge.successRate < 1 - failureThreshold) {
        // 计算异常分数
        const anomalyScore = (
          (1 - edge.successRate) * 0.5 +  // 失败率权重
          Math.min(edge.avgLatency / 1000, 1) * 0.5  // 延迟权重
        );
        
        this.anomalyPaths.set(edgeKey, {
          from: edge.from,
          to: edge.to,
          score: anomalyScore,
          failureRate: 1 - edge.successRate,
          avgLatency: edge.avgLatency,
          count: edge.count,
          failures: edge.failures
        });
      }
    });
    
    // 查找连续失败链
    this.findFailureChains();
    
    console.log('[MemoryGraph] 检测到异常路径数:', this.anomalyPaths.size);
  }

  /**
   * 查找失败链
   */
  findFailureChains() {
    const failureChains = [];
    const maxChainLength = 3;
    
    // 查找形式如: A → B → C 的失败链
    for (let i = 0; i < this.eventLogs.length - maxChainLength; i++) {
      let isChain = true;
      const chain = [];
      
      for (let j = 0; j < maxChainLength; j++) {
        const currentLog = this.eventLogs[i + j];
        chain.push(currentLog);
        
        if (currentLog.result !== 'failure' && currentLog.result !== 'warning') {
          isChain = false;
          break;
        }
        
        if (j > 0 && this.eventLogs[i + j - 1].target !== currentLog.source) {
          isChain = false;
          break;
        }
      }
      
      if (isChain) {
        failureChains.push(chain);
      }
    }
    
    // 为发现的失败链创建异常路径记录
    failureChains.forEach(chain => {
      const chainKey = chain.map(log => log.source).join('→') + '→' + chain[chain.length - 1].target;
      if (!this.anomalyPaths.has(chainKey)) {
        this.anomalyPaths.set(chainKey, {
          chain: chain,
          score: 0.95, // 高异常分数
          description: `发现失败链: ${chainKey}`,
          timestamp: chain[chain.length - 1].timestamp
        });
      }
    });
  }

  /**
   * 查找关键路径
   */
  findCriticalPaths() {
    console.log('[MemoryGraph] 查找关键路径...');
    
    // 按照重要性排序模块
    const sortedModules = Array.from(this.moduleImportance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // 取前5个最重要的模块
    
    // 构建从最重要模块出发的路径
    const paths = [];
    
    sortedModules.forEach(([moduleId]) => {
      const path = this.findLongestPathFrom(moduleId, 3); // 最多3跳
      if (path && path.length > 1) {
        paths.push(path);
      }
    });
    
    // 去重并排序
    const uniquePaths = Array.from(new Set(paths.map(p => p.join('→'))))
      .map(p => p.split('→'))
      .sort((a, b) => b.length - a.length);
    
    this.criticalPaths = uniquePaths.slice(0, 3); // 保留前3个关键路径
    
    console.log('[MemoryGraph] 发现关键路径数:', this.criticalPaths.length);
  }

  /**
   * 从指定模块查找最长路径
   */
  findLongestPathFrom(startModule, maxDepth) {
    const visited = new Set();
    const path = [startModule];
    const longestPath = [];
    
    const dfs = (current, depth) => {
      if (depth >= maxDepth) return;
      
      visited.add(current);
      let found = false;
      
      this.edges.forEach(edge => {
        if (edge.from === current && !visited.has(edge.to)) {
          path.push(edge.to);
          found = true;
          dfs(edge.to, depth + 1);
          path.pop();
        }
      });
      
      if (!found && path.length > longestPath.length) {
        longestPath.length = 0;
        path.forEach(node => longestPath.push(node));
      }
      
      visited.delete(current);
    };
    
    dfs(startModule, 0);
    return longestPath;
  }

  /**
   * 获取记忆图谱数据
   */
  getGraphData() {
    if (!this.initialized) {
      console.warn('[MemoryGraph] 未初始化，返回空数据');
      return { nodes: [], edges: [] };
    }
    
    // 转换为指定格式
    const nodes = Array.from(this.nodes.values()).map(node => node.id);
    const edges = Array.from(this.edges.values()).map(edge => ({
      from: edge.from,
      to: edge.to,
      weight: Number(edge.weight.toFixed(2))
    }));
    
    return { nodes, edges };
  }

  /**
   * 获取模块重要性排名
   */
  getModuleImportanceRanking() {
    return Array.from(this.moduleImportance.entries())
      .map(([moduleId, importance]) => ({
        moduleId,
        name: this.nodes.get(moduleId)?.name || moduleId,
        importance: Number(importance.toFixed(2))
      }))
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * 获取异常路径
   */
  getAnomalyPaths() {
    return Array.from(this.anomalyPaths.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 获取关键路径
   */
  getCriticalPaths() {
    return this.criticalPaths;
  }

  /**
   * 更新图谱（添加新事件）
   */
  updateWithEvent(event) {
    // 添加到事件日志
    this.eventLogs.push(event);
    if (this.eventLogs.length > this.maxLogEntries) {
      this.eventLogs.shift();
    }
    
    // 重新构建图谱
    this.buildGraph();
    this.analyzeModuleImportance();
    this.detectAnomalyPaths();
    this.findCriticalPaths();
  }

  /**
   * 获取模块详细信息
   */
  getModuleDetails(moduleId) {
    const node = this.nodes.get(moduleId);
    if (!node) return null;
    
    // 收集相关边
    const incomingEdges = [];
    const outgoingEdges = [];
    
    this.edges.forEach(edge => {
      if (edge.to === moduleId) {
        incomingEdges.push(edge);
      }
      if (edge.from === moduleId) {
        outgoingEdges.push(edge);
      }
    });
    
    return {
      ...node,
      importanceScore: this.moduleImportance.get(moduleId),
      incomingEdges: incomingEdges.length,
      outgoingEdges: outgoingEdges.length,
      relationships: {
        incoming: incomingEdges.map(e => ({ from: e.from, weight: e.weight })),
        outgoing: outgoingEdges.map(e => ({ to: e.to, weight: e.weight }))
      }
    };
  }

  /**
   * 生成系统健康报告
   */
  generateHealthReport() {
    const highImportanceModules = this.getModuleImportanceRanking().slice(0, 5);
    const anomalies = this.getAnomalyPaths().slice(0, 5);
    
    let systemHealth = 'good';
    if (anomalies.length > 3) {
      systemHealth = 'warning';
    } else if (anomalies.some(a => a.score > 0.8)) {
      systemHealth = 'critical';
    }
    
    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      moduleCount: this.nodes.size,
      relationshipCount: this.edges.size,
      anomalyCount: this.anomalyPaths.size,
      criticalPaths: this.criticalPaths,
      topModules: highImportanceModules,
      criticalAnomalies: anomalies
    };
  }
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = MemoryGraph;
} else {
  window.MemoryGraph = MemoryGraph;
}

console.log('[L7.0][AutoCognitionCluster] MemoryGraph 模块加载完成');