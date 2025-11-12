// JEV L7.0 - AutoCognition Cluster
// memoryGraph.js - 记忆图谱构建与分析模块
console.log('[JEV L7.0] Memory Graph Module Initialized');

class MemoryGraph {
  constructor(options = {}) {
    this.config = {
      maxNodes: 1000,
      timeWindowMs: 86400000, // 24小时
      relationTypes: ['calls', 'depends_on', 'updates', 'triggers', 'references'],
      workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
      ...options
    };
    
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      statistics: {
        totalNodes: 0,
        totalEdges: 0,
        nodeTypes: {},
        relationCounts: {},
        lastUpdated: null
      }
    };
    
    this.initGraphStructure();
    console.log('✅ Memory Graph Structure Initialized');
  }
  
  initGraphStructure() {
    // 初始化关系类型计数器
    this.config.relationTypes.forEach(type => {
      this.graph.statistics.relationCounts[type] = 0;
    });
    
    // 设置初始节点（核心模块）
    this.addNode('memoryGraph', {
      type: 'core_module',
      description: 'Memory Graph 核心模块',
      importance: 1.0,
      created_at: new Date().toISOString()
    });
    
    this.addNode('eventReflection', {
      type: 'core_module',
      description: '事件反思模块',
      importance: 1.0,
      created_at: new Date().toISOString()
    });
    
    this.addNode('predictivePlanner', {
      type: 'core_module',
      description: '预测规划模块',
      importance: 1.0,
      created_at: new Date().toISOString()
    });
  }
  
  // 从 Durable Objects 加载记忆数据
  async loadFromDurableObjects() {
    console.log('🔄 Loading memory data from Durable Objects...');
    
    try {
      const response = await fetch(`${this.config.workerUrl}/memory/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const memoryData = await response.json();
        this.buildGraphFromMemoryData(memoryData);
        console.log(`✅ Loaded ${this.graph.statistics.totalNodes} memory nodes`);
        return memoryData;
      } else {
        console.error(`❌ Failed to load memory data: HTTP ${response.status}`);
        // 使用模拟数据进行演示
        this.loadMockData();
      }
    } catch (error) {
      console.error('❌ Error loading from Durable Objects:', error);
      // 使用模拟数据进行演示
      this.loadMockData();
    }
  }
  
  // 加载模拟数据用于演示
  loadMockData() {
    console.log('📊 Loading mock memory data for demonstration...');
    
    const mockData = {
      modules: [
        { id: 'traeBridge', type: 'adapter', calls: ['durableSyncBridge'] },
        { id: 'durableSyncBridge', type: 'bridge', calls: ['eventReflection'] },
        { id: 'eventTracker', type: 'monitor', calls: ['memoryGraph'] },
        { id: 'sessionManager', type: 'service', calls: ['traeBridge'] },
        { id: 'analyticsEngine', type: 'service', calls: ['memoryGraph'] }
      ],
      events: [
        { id: 'evt-1', source: 'traeBridge', target: 'durableSyncBridge', type: 'sync', timestamp: new Date().toISOString() },
        { id: 'evt-2', source: 'durableSyncBridge', target: 'eventReflection', type: 'analyze', timestamp: new Date().toISOString() },
        { id: 'evt-3', source: 'eventTracker', target: 'memoryGraph', type: 'update', timestamp: new Date().toISOString() },
        { id: 'evt-4', source: 'sessionManager', target: 'traeBridge', type: 'read', timestamp: new Date().toISOString() },
        { id: 'evt-5', source: 'analyticsEngine', target: 'memoryGraph', type: 'query', timestamp: new Date().toISOString() }
      ],
      sessions: [
        { id: 'sess-1', modules: ['traeBridge', 'durableSyncBridge'], lastActive: new Date().toISOString() },
        { id: 'sess-2', modules: ['sessionManager', 'traeBridge'], lastActive: new Date().toISOString() }
      ]
    };
    
    this.buildGraphFromMemoryData(mockData);
  }
  
  // 从记忆数据构建图谱
  buildGraphFromMemoryData(data) {
    console.log('🔗 Building knowledge graph from memory data...');
    
    // 处理模块节点
    if (data.modules && Array.isArray(data.modules)) {
      data.modules.forEach(module => {
        this.addNode(module.id, {
          type: module.type,
          created_at: new Date().toISOString()
        });
        
        // 处理模块间调用关系
        if (module.calls && Array.isArray(module.calls)) {
          module.calls.forEach(targetModule => {
            this.addEdge(module.id, targetModule, 'calls');
          });
        }
      });
    }
    
    // 处理事件关系
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        this.addNode(event.id, {
          type: 'event',
          event_type: event.type,
          timestamp: event.timestamp
        });
        
        // 添加事件源和目标关系
        this.addEdge(event.source, event.id, 'triggers');
        this.addEdge(event.id, event.target, 'affects');
      });
    }
    
    // 处理会话
    if (data.sessions && Array.isArray(data.sessions)) {
      data.sessions.forEach(session => {
        this.addNode(session.id, {
          type: 'session',
          lastActive: session.lastActive
        });
        
        // 添加会话与模块的关系
        if (session.modules && Array.isArray(session.modules)) {
          session.modules.forEach(moduleId => {
            this.addEdge(session.id, moduleId, 'uses');
          });
        }
      });
    }
    
    // 更新统计信息
    this.updateStatistics();
    console.log(`✅ Knowledge graph built: ${this.graph.statistics.totalNodes} nodes, ${this.graph.statistics.totalEdges} edges`);
  }
  
  // 添加节点
  addNode(id, properties = {}) {
    if (this.graph.nodes.has(id)) {
      // 更新现有节点
      const existingNode = this.graph.nodes.get(id);
      this.graph.nodes.set(id, { ...existingNode, ...properties, updated_at: new Date().toISOString() });
      return false;
    }
    
    // 检查节点数量限制
    if (this.graph.nodes.size >= this.config.maxNodes) {
      console.warn('⚠️  Node limit reached, cannot add new nodes');
      return false;
    }
    
    // 添加新节点
    const node = {
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      importance: properties.importance || 0.5,
      ...properties
    };
    
    this.graph.nodes.set(id, node);
    
    // 更新节点类型统计
    const nodeType = node.type || 'unknown';
    this.graph.statistics.nodeTypes[nodeType] = (this.graph.statistics.nodeTypes[nodeType] || 0) + 1;
    
    return true;
  }
  
  // 添加边
  addEdge(sourceId, targetId, relationType) {
    if (!this.graph.nodes.has(sourceId) || !this.graph.nodes.has(targetId)) {
      console.warn(`⚠️  Cannot create edge: source ${sourceId} or target ${targetId} does not exist`);
      return false;
    }
    
    if (!this.config.relationTypes.includes(relationType)) {
      console.warn(`⚠️  Unknown relation type: ${relationType}`);
      return false;
    }
    
    const edgeId = `${sourceId}_${targetId}_${relationType}`;
    
    if (this.graph.edges.has(edgeId)) {
      // 更新现有边
      const existingEdge = this.graph.edges.get(edgeId);
      existingEdge.strength = Math.min(1.0, existingEdge.strength + 0.1);
      existingEdge.count = (existingEdge.count || 0) + 1;
      existingEdge.lastUpdated = new Date().toISOString();
      return false;
    }
    
    // 添加新边
    const edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: relationType,
      strength: 0.5,
      count: 1,
      created_at: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    this.graph.edges.set(edgeId, edge);
    
    // 更新关系计数
    this.graph.statistics.relationCounts[relationType] = 
      (this.graph.statistics.relationCounts[relationType] || 0) + 1;
    
    return true;
  }
  
  // 更新统计信息
  updateStatistics() {
    this.graph.statistics.totalNodes = this.graph.nodes.size;
    this.graph.statistics.totalEdges = this.graph.edges.size;
    this.graph.statistics.lastUpdated = new Date().toISOString();
  }
  
  // 获取模块依赖关系
  getModuleDependencies(moduleId) {
    const dependencies = [];
    
    this.graph.edges.forEach(edge => {
      if (edge.target === moduleId && edge.type === 'depends_on') {
        dependencies.push(edge.source);
      }
    });
    
    return dependencies;
  }
  
  // 获取模块调用的模块
  getModuleDependents(moduleId) {
    const dependents = [];
    
    this.graph.edges.forEach(edge => {
      if (edge.source === moduleId && edge.type === 'depends_on') {
        dependents.push(edge.target);
      }
    });
    
    return dependents;
  }
  
  // 分析模块重要性
  analyzeModuleImportance() {
    console.log('📈 Analyzing module importance...');
    
    // 基于连接度计算重要性
    this.graph.nodes.forEach(node => {
      if (node.type === 'core_module' || node.type === 'adapter' || node.type === 'service') {
        let importance = node.importance || 0.5;
        let connections = 0;
        
        // 计算入度
        this.graph.edges.forEach(edge => {
          if (edge.target === node.id) {
            connections++;
          }
        });
        
        // 计算出度
        this.graph.edges.forEach(edge => {
          if (edge.source === node.id) {
            connections++;
          }
        });
        
        // 更新重要性分数
        const connectionFactor = Math.min(connections * 0.1, 0.5);
        node.importance = Math.min(1.0, importance + connectionFactor);
        this.graph.nodes.set(node.id, node);
      }
    });
    
    console.log('✅ Module importance analysis completed');
  }
  
  // 检测模块异常关系
  detectAnomalies() {
    console.log('🔍 Detecting anomalies in module relationships...');
    
    const anomalies = [];
    const circularReferences = new Set();
    
    // 检测循环依赖
    this.graph.edges.forEach(edge => {
      if (edge.type === 'depends_on') {
        const path = this.findPath(edge.target, edge.source);
        if (path && path.length > 0) {
          circularReferences.add(`${edge.source} ↔ ${edge.target}`);
        }
      }
    });
    
    if (circularReferences.size > 0) {
      anomalies.push({
        type: 'circular_dependency',
        description: 'Circular dependencies detected',
        affected: Array.from(circularReferences)
      });
    }
    
    // 检测孤立模块
    const isolatedModules = [];
    this.graph.nodes.forEach(node => {
      if (node.type === 'core_module' || node.type === 'adapter' || node.type === 'service') {
        let hasConnections = false;
        
        this.graph.edges.forEach(edge => {
          if (edge.source === node.id || edge.target === node.id) {
            hasConnections = true;
          }
        });
        
        if (!hasConnections) {
          isolatedModules.push(node.id);
        }
      }
    });
    
    if (isolatedModules.length > 0) {
      anomalies.push({
        type: 'isolated_module',
        description: 'Isolated modules with no connections',
        affected: isolatedModules
      });
    }
    
    console.log(`✅ Anomaly detection completed: ${anomalies.length} issues found`);
    return anomalies;
  }
  
  // 查找两个节点之间的路径
  findPath(startId, endId, visited = new Set()) {
    if (!this.graph.nodes.has(startId) || !this.graph.nodes.has(endId)) {
      return null;
    }
    
    if (startId === endId) {
      return [startId];
    }
    
    visited.add(startId);
    
    // 查找所有从startId出发的边
    const outgoingEdges = [];
    this.graph.edges.forEach(edge => {
      if (edge.source === startId) {
        outgoingEdges.push(edge);
      }
    });
    
    // 递归搜索路径
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        const path = this.findPath(edge.target, endId, visited);
        if (path) {
          return [startId, ...path];
        }
      }
    }
    
    return null;
  }
  
  // 生成图谱可视化数据
  generateGraphData() {
    const nodes = Array.from(this.graph.nodes.values()).map(node => ({
      id: node.id,
      type: node.type,
      label: node.id,
      importance: node.importance || 0.5,
      metadata: {
        created_at: node.created_at,
        updated_at: node.updated_at,
        ...node
      }
    }));
    
    const edges = Array.from(this.graph.edges.values()).map(edge => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      strength: edge.strength,
      count: edge.count
    }));
    
    return {
      nodes,
      edges,
      statistics: this.graph.statistics,
      generated_at: new Date().toISOString()
    };
  }
  
  // 导出完整的记忆图谱数据
  exportGraph() {
    return {
      version: '1.0',
      generated_at: new Date().toISOString(),
      statistics: this.graph.statistics,
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values())
    };
  }
  
  // 分析关键路径
  analyzeCriticalPaths() {
    console.log('🚦 Analyzing critical paths...');
    
    const criticalPaths = [];
    const coreModules = [];
    
    // 找出核心模块
    this.graph.nodes.forEach(node => {
      if (node.type === 'core_module') {
        coreModules.push(node.id);
      }
    });
    
    // 分析核心模块之间的路径
    for (let i = 0; i < coreModules.length; i++) {
      for (let j = i + 1; j < coreModules.length; j++) {
        const path = this.findPath(coreModules[i], coreModules[j]);
        if (path && path.length > 2) { // 长度大于2表示存在中间模块
          criticalPaths.push({
            source: coreModules[i],
            target: coreModules[j],
            path: path,
            length: path.length
          });
        }
      }
    }
    
    console.log(`✅ Critical path analysis completed: ${criticalPaths.length} paths found`);
    return criticalPaths;
  }
  
  // 生成优化建议
  generateOptimizationSuggestions() {
    console.log('💡 Generating optimization suggestions...');
    
    const suggestions = [];
    const anomalies = this.detectAnomalies();
    
    // 基于异常生成建议
    anomalies.forEach(anomaly => {
      if (anomaly.type === 'circular_dependency') {
        suggestions.push({
          type: 'refactor',
          priority: 'high',
          description: '解决循环依赖问题，建议重构模块间关系',
          affected: anomaly.affected,
          solution: '将共享功能提取到独立模块，打破直接循环引用'
        });
      } else if (anomaly.type === 'isolated_module') {
        suggestions.push({
          type: 'integration',
          priority: 'medium',
          description: '整合孤立模块，避免代码浪费',
          affected: anomaly.affected,
          solution: '检查模块功能是否可合并到其他相关模块中'
        });
      }
    });
    
    // 基于模块重要性生成建议
    this.graph.nodes.forEach(node => {
      if (node.importance > 0.8 && node.type !== 'core_module') {
        suggestions.push({
          type: 'optimization',
          priority: 'high',
          description: `模块 ${node.id} 使用频率高，建议优化性能`,
          affected: [node.id],
          solution: '考虑缓存策略、异步处理或代码优化'
        });
      }
    });
    
    // 基于调用频率生成建议
    const callFrequencies = {};
    this.graph.edges.forEach(edge => {
      if (edge.type === 'calls') {
        const key = `${edge.source}_${edge.target}`;
        callFrequencies[key] = (callFrequencies[key] || 0) + edge.count;
      }
    });
    
    Object.entries(callFrequencies).forEach(([key, frequency]) => {
      if (frequency > 10) {
        const [source, target] = key.split('_');
        suggestions.push({
          type: 'caching',
          priority: 'medium',
          description: `模块 ${source} 频繁调用 ${target}，建议添加缓存`,
          affected: [source, target],
          solution: '实现结果缓存机制，减少重复计算'
        });
      }
    });
    
    console.log(`✅ Optimization suggestions generated: ${suggestions.length} suggestions`);
    return suggestions;
  }
}

// 导出模块
if (typeof module !== 'undefined') {
  module.exports = MemoryGraph;
}

// 初始化示例
if (typeof window !== 'undefined') {
  window.MemoryGraph = MemoryGraph;
  console.log('JEV L7.0 Memory Graph Module loaded in browser');
}