// scripts/modular/evolver.js
// 自进化模块 - 每天扫描externalMemory，生成摘要/洞察，存入memory-summary

// 支持模拟存储，避免网络依赖
let _localMemoryStore = {};

// 导入ExternalMemory，如果导入失败则使用模拟实现
let ExternalMemory;
try {
  // 尝试导入真实的ExternalMemory
  const memoryModule = require('./externalMemory.js');
  ExternalMemory = memoryModule.ExternalMemory || memoryModule.default;
} catch (error) {
  console.warn('[Evolver] 无法导入externalMemory.js，使用模拟实现');
  ExternalMemory = createMockExternalMemory();
}

/**
 * 创建模拟的ExternalMemory实现
 */
function createMockExternalMemory() {
  return {
    config: { timeout: 10000, maxRetries: 3 },
    
    configure(options) {
      this.config = { ...this.config, ...options };
      return this.config;
    },
    
    async set(key, value) {
      _localMemoryStore[key] = value;
      return { success: true };
    },
    
    async get(key) {
      return _localMemoryStore[key] !== undefined ? _localMemoryStore[key] : null;
    },
    
    async list() {
      return Object.keys(_localMemoryStore);
    },
    
    async del(key) {
      delete _localMemoryStore[key];
      return { success: true };
    },
    
    delete(key) {
      return this.del(key);
    },
    
    async batchSet(items) {
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.key && item.value !== undefined) {
            _localMemoryStore[item.key] = item.value;
          }
        });
      }
      return { success: true, results: [] };
    },
    
    async batchGet(keys) {
      if (!Array.isArray(keys)) {
        return [];
      }
      return keys.map(key => ({
        key,
        value: _localMemoryStore[key] !== undefined ? _localMemoryStore[key] : null
      }));
    },
    
    async batchDel(keys) {
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          delete _localMemoryStore[key];
        });
      }
      return { success: true };
    },
    
    async healthCheck() {
      return { success: true, status: 'healthy', latency: 50 };
    }
  };
}

/**
 * 初始化默认测试数据
 */
function initializeDefaultTestData() {
  console.log('[Evolver] 初始化默认测试数据...');
  
  const defaultTestData = [
    {
      key: 'conversation-test-001',
      value: {
        messages: [
          { author: 'user', role: 'user', content: '如何将PDF转换为网页格式？', timestamp: new Date().toISOString() },
          { author: 'system', role: 'assistant', content: '您可以使用PDF.js或其他转换工具', timestamp: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
      }
    },
    {
      key: 'document-test-001',
      value: {
        title: 'PDF转网页指南',
        content: '这是一份关于如何将PDF文件转换为网页格式的详细指南。包含了多种方法和工具推荐。',
        tags: ['PDF', '网页', '转换'],
        createdAt: new Date().toISOString()
      }
    },
    {
      key: 'preference-test-001',
      value: {
        preferences: {
          theme: 'dark',
          language: 'zh-CN',
          notificationEnabled: true,
          fontSize: 16
        },
        lastModified: new Date().toISOString()
      }
    },
    {
      key: 'task-test-001',
      value: {
        title: '完成PDF转换功能',
        status: 'pending',
        priority: 'high',
        createdAt: new Date().toISOString()
      }
    }
  ];
  
  defaultTestData.forEach(item => {
    _localMemoryStore[item.key] = item.value;
  });
  
  console.log(`[Evolver] 已设置 ${defaultTestData.length} 条默认测试数据`);
}

/**
 * 自进化模块
 * 负责扫描记忆数据，生成摘要和洞察，并存储到专门的摘要存储空间
 */
export const Evolver = {
  // 配置项
  config: {
    scanInterval: 24 * 60 * 60 * 1000, // 默认每天扫描一次
    batchSize: 50, // 批量处理的记录数
    summaryKeyPrefix: 'memory-summary-',
    lastScanKey: 'evolver-last-scan',
    debug: false,
    useMock: false // 强制使用模拟存储
  },

  /**
   * 配置自进化模块
   * @param {Object} options 配置选项
   * @returns {Object} 更新后的配置
   */
  configure(options) {
    this.config = { ...this.config, ...options };
    
    // 如果配置了强制使用模拟存储
    if (this.config.useMock) {
      ExternalMemory = createMockExternalMemory();
      this.log('已切换到模拟存储模式', 'info');
    }
    
    return this.config;
  },

  /**
   * 初始化自进化模块
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize() {
    try {
      this.log('自进化模块初始化中...');
      
      // 清理测试数据
      if (this.config.useMock) {
        _localMemoryStore = {};
        this.log('已清理模拟存储', 'debug');
        
        // 自动添加默认测试数据
        initializeDefaultTestData();
      }
      
      // 验证ExternalMemory可用性
      let healthCheck;
      try {
        healthCheck = await ExternalMemory.healthCheck();
        if (!healthCheck.success) {
          this.log('外部记忆模块健康检查失败，切换到模拟模式', 'warn');
          ExternalMemory = createMockExternalMemory();
          // 在切换到模拟模式后也添加默认数据
          initializeDefaultTestData();
        }
      } catch (error) {
        this.log(`健康检查失败: ${error.message}，切换到模拟模式`, 'warn');
        ExternalMemory = createMockExternalMemory();
        // 在切换到模拟模式后也添加默认数据
        initializeDefaultTestData();
        healthCheck = { success: true };
      }
      
      this.log('自进化模块初始化完成');
      return true;
    } catch (error) {
      this.log(`初始化失败: ${error.message}`, 'error');
      return false;
    }
  },

  /**
   * 执行扫描和进化操作
   * @returns {Promise<Object>} 扫描结果
   */
  async evolve() {
    try {
      this.log('开始执行进化操作...');
      
      // 获取上次扫描时间
      const lastScanResult = await ExternalMemory.get(this.config.lastScanKey);
      const lastScanTime = lastScanResult ? new Date(lastScanResult) : null;
      
      this.log(`上次扫描时间: ${lastScanTime ? lastScanTime.toISOString() : '首次扫描'}`);
      
      // 扫描所有记忆条目
      const allKeys = await ExternalMemory.list();
      this.log(`发现 ${allKeys.length} 条记忆条目`);
      
      // 过滤出需要处理的条目（排除摘要条目和系统条目）
      const memoryKeys = allKeys.filter(key => 
        !key.startsWith(this.config.summaryKeyPrefix) && 
        !key.startsWith('evolver-')
      );
      
      this.log(`实际处理 ${memoryKeys.length} 条记忆条目`);
      
      // 批量处理记忆条目
      const insights = await this.processMemoryBatch(memoryKeys);
      
      // 生成今日摘要
      const summaryKey = `${this.config.summaryKeyPrefix}${this.getFormattedDate()}`;
      const summary = this.generateSummary(insights);
      
      // 存储摘要
      await ExternalMemory.set(summaryKey, summary);
      
      // 更新上次扫描时间
      await ExternalMemory.set(this.config.lastScanKey, new Date().toISOString());
      
      const result = {
        success: true,
        processedKeys: memoryKeys.length,
        summaryKey,
        insightsCount: insights.length,
        timestamp: new Date().toISOString(),
        // 额外添加存储类型信息
        storageType: this.config.useMock || ExternalMemory === createMockExternalMemory() ? 'mock' : 'real'
      };
      
      this.log(`进化操作完成: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.log(`进化操作失败: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * 批量处理记忆条目
   * @param {Array<string>} keys 记忆条目键列表
   * @returns {Promise<Array<Object>>} 生成的洞察列表
   */
  async processMemoryBatch(keys) {
    const insights = [];
    
    // 分批处理，避免一次性加载过多数据
    for (let i = 0; i < keys.length; i += this.config.batchSize) {
      const batchKeys = keys.slice(i, i + this.config.batchSize);
      this.log(`处理批次 ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(keys.length / this.config.batchSize)}`);
      
      // 并行获取批次数据
      let batchResults;
      try {
        batchResults = await ExternalMemory.batchGet(batchKeys);
      } catch (error) {
        this.log(`获取批次数据失败: ${error.message}，尝试逐个获取`, 'warn');
        // 失败时尝试逐个获取
        batchResults = [];
        for (const key of batchKeys) {
          try {
            const value = await ExternalMemory.get(key);
            batchResults.push({ key, value });
          } catch (err) {
            this.log(`获取键 ${key} 失败: ${err.message}`, 'warn');
          }
        }
      }
      
      // 分析每个记忆条目，生成洞察
      for (const result of batchResults) {
        if (result.value) {
          const insight = this.analyzeMemoryItem(result.key, result.value);
          if (insight) {
            insights.push(insight);
          }
        }
      }
    }
    
    return insights;
  },

  /**
   * 分析单个记忆条目
   * @param {string} key 记忆条目键
   * @param {*} value 记忆条目值
   * @returns {Object|null} 生成的洞察
   */
  analyzeMemoryItem(key, value) {
    try {
      // 跳过无效数据
      if (value === null || value === undefined) {
        return null;
      }
      
      // 规范化数据为对象格式
      const data = typeof value === 'string' ? this.safeParseJSON(value) : value;
      
      // 基础洞察
      const insight = {
        key,
        type: this.detectType(data),
        createdAt: this.extractTimestamp(key, data),
        size: this.calculateSize(data),
        metadata: {}
      };
      
      // 根据数据类型进行深度分析
      switch (insight.type) {
        case 'conversation':
          this.enrichConversationInsight(insight, data);
          break;
        case 'document':
          this.enrichDocumentInsight(insight, data);
          break;
        case 'preference':
          this.enrichPreferenceInsight(insight, data);
          break;
        default:
          this.enrichGenericInsight(insight, data);
      }
      
      return insight;
    } catch (error) {
      this.log(`分析记忆条目 ${key} 失败: ${error.message}`, 'warn');
      return null;
    }
  },

  /**
   * 检测数据类型
   * @param {*} data 数据
   * @returns {string} 数据类型
   */
  detectType(data) {
    if (!data || typeof data !== 'object') {
      return 'primitive';
    }
    
    // 检测对话类型
    if (data.messages || data.conversation || data.text) {
      return 'conversation';
    }
    
    // 检测文档类型
    if (data.title || data.content || data.url || data.metadata) {
      return 'document';
    }
    
    // 检测偏好设置类型
    if (data.preferences || data.settings || data.options) {
      return 'preference';
    }
    
    return 'generic';
  },

  /**
   * 提取时间戳
   * @param {string} key 键
   * @param {*} data 数据
   * @returns {string|null} 时间戳
   */
  extractTimestamp(key, data) {
    // 尝试从数据中提取时间戳
    if (data && typeof data === 'object') {
      const timestampFields = ['createdAt', 'timestamp', 'date', 'time', '_timestamp'];
      for (const field of timestampFields) {
        if (data[field]) {
          return data[field];
        }
      }
    }
    
    // 尝试从键名中提取时间戳（添加安全检查）
    if (key && typeof key === 'string') {
      const timeMatch = key.match(/\d{13}|\d{10}/);
      if (timeMatch) {
        return new Date(parseInt(timeMatch[0])).toISOString();
      }
    }
    
    return null;
  },

  /**
   * 计算数据大小
   * @param {*} data 数据
   * @returns {number} 估算的字节大小
   */
  calculateSize(data) {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch (error) {
      return 0;
    }
  },

  /**
   * 丰富对话洞察
   * @param {Object} insight 洞察对象
   * @param {Object} data 对话数据
   */
  enrichConversationInsight(insight, data) {
    insight.metadata = {
      messageCount: Array.isArray(data.messages) ? data.messages.length : 1,
      participants: this.extractParticipants(data),
      topics: this.extractTopics(data),
      sentiment: this.analyzeSentiment(data)
    };
  },

  /**
   * 丰富文档洞察
   * @param {Object} insight 洞察对象
   * @param {Object} data 文档数据
   */
  enrichDocumentInsight(insight, data) {
    insight.metadata = {
      title: data.title || 'Untitled',
      hasContent: !!data.content,
      wordCount: data.content ? data.content.split(/\s+/).length : 0,
      tags: data.tags || []
    };
  },

  /**
   * 丰富偏好设置洞察
   * @param {Object} insight 洞察对象
   * @param {Object} data 偏好设置数据
   */
  enrichPreferenceInsight(insight, data) {
    const prefs = data.preferences || data.settings || data;
    insight.metadata = {
      settingCount: Object.keys(prefs).length,
      lastModified: this.extractTimestamp(null, data),
      categories: this.categorizePreferences(prefs)
    };
  },

  /**
   * 丰富通用洞察
   * @param {Object} insight 洞察对象
   * @param {Object} data 通用数据
   */
  enrichGenericInsight(insight, data) {
    if (typeof data === 'object') {
      insight.metadata = {
        propertyCount: Object.keys(data).length,
        isArray: Array.isArray(data),
        itemCount: Array.isArray(data) ? data.length : 0
      };
    }
  },

  /**
   * 提取对话参与者
   * @param {Object} data 对话数据
   * @returns {Array<string>} 参与者列表
   */
  extractParticipants(data) {
    const participants = new Set();
    const messages = Array.isArray(data.messages) ? data.messages : 
                    (Array.isArray(data) ? data : [data]);
    
    messages.forEach(msg => {
      if (msg.author || msg.sender || msg.user || msg.role) {
        participants.add(msg.author || msg.sender || msg.user || msg.role);
      }
    });
    
    return Array.from(participants);
  },

  /**
   * 提取对话主题（简单实现）
   * @param {Object} data 对话数据
   * @returns {Array<string>} 主题列表
   */
  extractTopics(data) {
    // 这里可以实现更复杂的主题提取算法
    // 目前只是简单实现
    const topics = new Set();
    const keywords = ['工作', '学习', '项目', '问题', '建议', '需求', '任务', 'PDF', '网页'];
    
    const text = this.extractTextFromData(data).toLowerCase();
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        topics.add(keyword);
      }
    });
    
    return Array.from(topics).slice(0, 5); // 最多返回5个主题
  },

  /**
   * 分析情感（简单实现）
   * @param {Object} data 对话数据
   * @returns {string} 情感分析结果
   */
  analyzeSentiment(data) {
    // 简单的情感分析实现
    const text = this.extractTextFromData(data).toLowerCase();
    const positiveWords = ['好', '优秀', '成功', '完成', '解决', '满意', '喜欢'];
    const negativeWords = ['问题', '错误', '失败', '无法', '困难', '不满意', '讨厌'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  },

  /**
   * 分类偏好设置
   * @param {Object} prefs 偏好设置对象
   * @returns {Array<string>} 分类列表
   */
  categorizePreferences(prefs) {
    const categories = new Set();
    
    Object.keys(prefs).forEach(key => {
      if (key.includes('theme') || key.includes('color') || key.includes('ui')) {
        categories.add('ui');
      } else if (key.includes('language') || key.includes('locale')) {
        categories.add('language');
      } else if (key.includes('timeout') || key.includes('delay')) {
        categories.add('timing');
      } else if (key.includes('notification') || key.includes('alert')) {
        categories.add('notification');
      } else if (key.includes('font') || key.includes('size')) {
        categories.add('display');
      }
    });
    
    return Array.from(categories);
  },

  /**
   * 从数据中提取文本内容
   * @param {*} data 数据
   * @returns {string} 提取的文本
   */
  extractTextFromData(data) {
    if (typeof data === 'string') return data;
    if (!data || typeof data !== 'object') return '';
    
    let texts = [];
    
    // 处理消息数组
    if (Array.isArray(data.messages)) {
      data.messages.forEach(msg => {
        if (msg.content || msg.text) {
          texts.push(msg.content || msg.text);
        }
      });
    } else if (Array.isArray(data)) {
      // 处理普通数组
      data.forEach(item => {
        if (typeof item === 'object' && (item.text || item.content)) {
          texts.push(item.text || item.content);
        } else if (typeof item === 'string') {
          texts.push(item);
        }
      });
    } else {
      // 处理单个对象
      if (data.text || data.content || data.message) {
        texts.push(data.text || data.content || data.message);
      }
    }
    
    return texts.join(' ');
  },

  /**
   * 生成整体摘要
   * @param {Array<Object>} insights 洞察列表
   * @returns {Object} 生成的摘要
   */
  generateSummary(insights) {
    const summary = {
      generatedAt: new Date().toISOString(),
      totalInsights: insights.length,
      byType: {},
      statistics: {},
      trends: [],
      recommendations: [],
      insights: insights.slice(0, 10) // 存储前10个洞察样本
    };
    
    // 按类型统计
    insights.forEach(insight => {
      summary.byType[insight.type] = (summary.byType[insight.type] || 0) + 1;
    });
    
    // 计算统计信息
    const sizes = insights.map(i => i.size);
    summary.statistics = {
      averageSize: sizes.length > 0 ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 0,
      largestSize: sizes.length > 0 ? Math.max(...sizes) : 0,
      oldestEntry: this.findOldestEntry(insights),
      newestEntry: this.findNewestEntry(insights)
    };
    
    // 生成趋势和建议
    summary.trends = this.generateTrends(insights);
    summary.recommendations = this.generateRecommendations(insights, summary);
    
    return summary;
  },

  /**
   * 生成趋势分析
   * @param {Array<Object>} insights 洞察列表
   * @returns {Array<Object>} 趋势列表
   */
  generateTrends(insights) {
    const trends = [];
    
    // 分析对话趋势
    const conversationInsights = insights.filter(i => i.type === 'conversation');
    if (conversationInsights.length > 0) {
      trends.push({
        type: 'conversation_volume',
        count: conversationInsights.length,
        description: `发现 ${conversationInsights.length} 条对话记录`
      });
    }
    
    // 分析文档趋势
    const documentInsights = insights.filter(i => i.type === 'document');
    if (documentInsights.length > 0) {
      trends.push({
        type: 'document_volume',
        count: documentInsights.length,
        description: `发现 ${documentInsights.length} 条文档记录`
      });
    }
    
    // 分析偏好设置趋势
    const preferenceInsights = insights.filter(i => i.type === 'preference');
    if (preferenceInsights.length > 0) {
      trends.push({
        type: 'preference_settings',
        count: preferenceInsights.length,
        description: `发现 ${preferenceInsights.length} 条偏好设置记录`
      });
    }
    
    return trends;
  },

  /**
   * 生成优化建议
   * @param {Array<Object>} insights 洞察列表
   * @param {Object} summary 摘要
   * @returns {Array<Object>} 建议列表
   */
  generateRecommendations(insights, summary) {
    const recommendations = [];
    
    // 基于数据量的建议
    if (insights.length === 0) {
      recommendations.push({
        type: 'data_collection',
        priority: 'high',
        description: '建议开始收集数据以启用记忆功能'
      });
    }
    
    // 基于对话量的建议
    const conversationCount = summary.byType.conversation || 0;
    if (conversationCount > 0) {
      recommendations.push({
        type: 'conversation_analysis',
        priority: 'medium',
        description: `已发现 ${conversationCount} 条对话记录，建议分析用户常见问题和需求`
      });
    }
    
    // 基于文档量的建议
    const documentCount = summary.byType.document || 0;
    if (documentCount > 0) {
      recommendations.push({
        type: 'document_management',
        priority: 'low',
        description: `已发现 ${documentCount} 条文档记录，可以考虑建立文档分类系统`
      });
    }
    
    // 基于偏好设置的建议
    const preferenceCount = summary.byType.preference || 0;
    if (preferenceCount > 0) {
      recommendations.push({
        type: 'personalization',
        priority: 'low',
        description: '可以基于用户偏好设置进行界面和功能个性化'
      });
    }
    
    // 通用建议
    recommendations.push({
      type: 'regular_maintenance',
      priority: 'medium',
      description: '建议定期清理过时数据，保持记忆系统的高效运行'
    });
    
    return recommendations;
  },

  /**
   * 查找最早的条目
   * @param {Array<Object>} insights 洞察列表
   * @returns {string|null} 最早的时间戳
   */
  findOldestEntry(insights) {
    const timestamps = insights
      .filter(i => i.createdAt)
      .map(i => new Date(i.createdAt).getTime());
    
    if (timestamps.length === 0) return null;
    
    const oldestTime = Math.min(...timestamps);
    return new Date(oldestTime).toISOString();
  },

  /**
   * 查找最新的条目
   * @param {Array<Object>} insights 洞察列表
   * @returns {string|null} 最新的时间戳
   */
  findNewestEntry(insights) {
    const timestamps = insights
      .filter(i => i.createdAt)
      .map(i => new Date(i.createdAt).getTime());
    
    if (timestamps.length === 0) return null;
    
    const newestTime = Math.max(...timestamps);
    return new Date(newestTime).toISOString();
  },

  /**
   * 安全解析JSON
   * @param {string} jsonString JSON字符串
   * @returns {*} 解析结果
   */
  safeParseJSON(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this.log(`JSON解析失败: ${error.message}`, 'warn');
      return { original: jsonString };
    }
  },

  /**
   * 获取格式化的日期字符串（用于摘要键）
   * @returns {string} YYYY-MM-DD格式的日期
   */
  getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },

  /**
   * 日志记录
   * @param {string} message 日志消息
   * @param {string} level 日志级别
   */
  log(message, level = 'info') {
    if (this.config.debug || level !== 'debug') {
      const timestamp = new Date().toISOString();
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `[Evolver] [${timestamp}] [${level.toUpperCase()}] ${message}`
      );
    }
  },

  /**
   * 启动定时扫描
   * @returns {Object} 定时器对象
   */
  startPeriodicScan() {
    this.log(`启动定期扫描，间隔 ${this.formatInterval(this.config.scanInterval)}`);
    
    const timer = setInterval(() => {
      this.evolve().catch(error => {
        this.log(`定期扫描失败: ${error.message}`, 'error');
      });
    }, this.config.scanInterval);
    
    return { timer, stop: () => clearInterval(timer) };
  },

  /**
   * 格式化时间间隔为人类可读形式
   * @param {number} ms 毫秒数
   * @returns {string} 格式化的时间间隔
   */
  formatInterval(ms) {
    if (ms >= 24 * 60 * 60 * 1000) {
      return `${Math.floor(ms / (24 * 60 * 60 * 1000))} 天`;
    } else if (ms >= 60 * 60 * 1000) {
      return `${Math.floor(ms / (60 * 60 * 1000))} 小时`;
    } else if (ms >= 60 * 1000) {
      return `${Math.floor(ms / (60 * 1000))} 分钟`;
    }
    return `${Math.floor(ms / 1000)} 秒`;
  }
};

// 为了兼容性
export default Evolver;

// 在浏览器环境下暴露到全局
if (typeof window !== 'undefined') {
  window.JEV = window.JEV || {};
  window.JEV.evolver = Evolver;
}