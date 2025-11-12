/**
 * JEV Plugin v2.0 - 客户意图与需求语义识别模块
 * 基于语义分析判断客户意图（询价/采购/投诉/售后）
 * 识别关键词、紧急程度和语言类型
 * 支持多语言语义分析
 */

// 系统配置
const SEMANTIC_CONFIG = {
  // 意图识别配置
  intent: {
    // 支持的意图类型
    INTENT_TYPES: [
      'inquiry',     // 询价
      'purchase',    // 采购/下单
      'complaint',   // 投诉/问题反馈
      'after_sales', // 售后服务
      'general',     // 一般咨询
      'negotiation', // 议价/谈判
      'shipping',    // 物流/运输
      'payment',     // 支付相关
      'return',      // 退换货
      'technical',   // 技术支持
      'price_check', // 价格查询
      'stock_check', // 库存查询
      'sample',      // 样品请求
      'customization', // 定制需求
      'other'        // 其他
    ],
    // 意图分类阈值
    CONFIDENCE_THRESHOLD: 0.6,
    // 默认意图
    DEFAULT_INTENT: 'general',
    // 意图识别方法
    RECOGNITION_METHOD: 'keyword_weighted', // keyword_weighted, regex, ml
  },
  
  // 紧急程度配置
  urgency: {
    // 紧急程度类型
    LEVELS: [
      { level: 'high', threshold: 0.8 },     // 高紧急度
      { level: 'medium', threshold: 0.4 },   // 中紧急度
      { level: 'low', threshold: 0.1 },      // 低紧急度
      { level: 'none', threshold: 0.0 }      // 无紧急度
    ],
    // 高紧急度关键词
    HIGH_KEYWORDS: [
      'urgent', 'immediate', 'asap', 'emergency', 'now', 'right now',
      '紧急', '立即', '尽快', '加急', '马上', '急需',
      'urgentemente', 'inmediatamente', 'ahora mismo', 'pronto',
      'dringend', 'sofort', 'sofortig', 'unmittelbar',
      'urgence', 'immédiat', 'tout de suite', 'urgent',
      'urgente', 'immediatamente', 'subito', 'subito stesso'
    ],
    // 时间敏感关键词
    TIME_SENSITIVE_KEYWORDS: [
      'today', 'tomorrow', 'this week', 'deadline', 'due',
      '今天', '明天', '本周', '期限', '到期',
      'hoy', 'mañana', 'esta semana', 'fecha límite',
      'heute', 'morgen', 'diese Woche', 'Frist',
      'aujourd\'hui', 'demain', 'cette semaine', 'échéance',
      'oggi', 'domani', 'questa settimana', 'scadenza'
    ]
  },
  
  // 关键词配置
  keywords: {
    // 询价相关关键词
    inquiry: [
      'price', 'cost', 'quote', 'quotation', 'how much',
      'pricing', 'estimate', 'estimation', 'rate',
      '价格', '多少钱', '报价', '费用', '价位',
      'precio', 'costo', 'cotización', 'cuánto cuesta',
      'Preis', 'Kosten', 'Angebot', 'kosten',
      'prix', 'coût', 'devis', 'combien coûte',
      'prezzo', 'costo', 'preventivo', 'quanto costa'
    ],
    
    // 采购相关关键词
    purchase: [
      'buy', 'order', 'purchase', 'need', 'want', 'stock',
      'quantity', 'place order', 'order now', 'buy now',
      '购买', '订单', '采购', '需要', '要', '库存',
      'cantidad', 'comprar', 'ordenar', 'necesito',
      'kaufen', 'bestellen', 'Anzahl', 'benötige',
      'acheter', 'commander', 'quantité', 'besoin',
      'acquistare', 'ordinare', 'quantità', 'ho bisogno'
    ],
    
    // 投诉相关关键词
    complaint: [
      'problem', 'issue', 'wrong', 'defect', 'damage',
      'broken', 'not working', 'bad quality', 'poor',
      '问题', '错误', '缺陷', '损坏', '坏了', '不工作',
      'problema', 'error', 'defecto', 'daño', 'rota',
      'Problem', 'Fehler', 'defekt', 'beschädigt', 'nicht funktionierend',
      'problème', 'erreur', 'défaut', 'endommagé', 'ne fonctionne pas',
      'problema', 'errore', 'difetto', 'rotto', 'non funziona'
    ],
    
    // 售后服务关键词
    after_sales: [
      'warranty', 'guarantee', 'after sales', 'service', 'repair',
      'maintenance', 'support', 'help', 'assistance',
      '保修', '售后', '维修', '保养', '支持', '帮助',
      'garantía', 'postventa', 'servicio', 'reparación', 'mantenimiento',
      'Garantie', 'Kundendienst', 'Reparatur', 'Wartung', 'Hilfe',
      'garantie', 'après-vente', 'service', 'réparation', 'maintenance',
      'garanzia', 'assistenza post-vendita', 'servizio', 'riparazione', 'manutenzione'
    ],
    
    // 物流相关关键词
    shipping: [
      'ship', 'shipping', 'delivery', 'transport', 'freight',
      'courier', 'track', 'tracking', 'when arrive', 'ETA',
      '发货', '物流', '快递', '运输', '跟踪', '何时到达',
      'enviar', 'envío', 'entrega', 'transporte', 'rastrear',
      'versenden', 'Versand', 'Lieferung', 'Transport', 'verfolgen',
      'expédier', 'livraison', 'transport', 'suivi', 'quand arrivera',
      'spedire', 'consegna', 'trasporto', 'tracciabilità', 'quando arriverà'
    ],
    
    // 支付相关关键词
    payment: [
      'payment', 'pay', 'paid', 'invoice', 'bill', 'transaction',
      'method', 'credit card', 'wire', 'transfer',
      '支付', '付款', '已付', '发票', '账单', '交易',
      'pago', 'pagar', 'pagado', 'factura', 'transacción',
      'Zahlung', 'bezahlen', 'bezahlt', 'Rechnung', 'Transaktion',
      'paiement', 'payer', 'payé', 'facture', 'transaction',
      'pagamento', 'pagare', 'pagato', 'fattura', 'transazione'
    ],
    
    // 退换货关键词
    return: [
      'return', 'refund', 'exchange', 'replace', 'change',
      'money back', 'cancel', 'cancellation', 'refund policy',
      '退货', '退款', '换货', '更换', '取消', '退款政策',
      'devolución', 'reembolso', 'cambio', 'cancelar', 'política de reembolso',
      'Rücksendung', 'Rückerstattung', 'Tausch', 'ersetzen', 'Stornierung',
      'retour', 'remboursement', 'échange', 'annuler', 'politique de remboursement',
      'ritorno', 'rimborso', 'scambio', 'cancellare', 'politica di rimborso'
    ],
    
    // 技术支持关键词
    technical: [
      'technical', 'support', 'setting', 'configuration', 'install',
      'setup', 'manual', 'guide', 'instruction', 'troubleshooting',
      '技术', '支持', '设置', '配置', '安装', '指南',
      'técnico', 'soporte', 'configuración', 'instalación', 'manual',
      'technisch', 'Support', 'Einstellung', 'Konfiguration', 'Installieren',
      'technique', 'support', 'configuration', 'installation', 'manuel',
      'tecnico', 'supporto', 'configurazione', 'installazione', 'manuale'
    ],
    
    // 库存查询关键词
    stock_check: [
      'stock', 'availability', 'available', 'in stock', 'out of stock',
      'inventory', 'quantity', 'how many', 'when available',
      '库存', '现货', '有货', '缺货', '库存情况', '数量',
      'stock', 'disponibilidad', 'disponible', 'agotado', 'inventario',
      'Lager', 'Verfügbarkeit', 'verfügbar', 'ausverkauft', 'Bestand',
      'stock', 'disponibilité', 'disponible', 'épuisé', 'inventaire',
      'stock', 'disponibilità', 'disponibile', 'esaurito', 'inventario'
    ],
    
    // 样品请求关键词
    sample: [
      'sample', 'free sample', 'sample request', 'test', 'demo',
      'trial', 'try', 'evaluation', 'testing',
      '样品', '免费样品', '样品请求', '测试', '演示',
      'muestra', 'muestra gratuita', 'solicitud de muestra', 'prueba',
      'Probe', 'kostenlose Probe', 'Probenanfrage', 'Test', 'Demo',
      'échantillon', 'échantillon gratuit', 'demande d\'échantillon', 'test',
      'campione', 'campione gratuito', 'richiesta campione', 'prova', 'demo'
    ],
    
    // 定制需求关键词
    customization: [
      'custom', 'customize', 'customized', 'personalize', 'special',
      'specific', 'requirement', 'custom made', 'tailor made',
      '定制', '个性化', '特殊', '特定', '需求', '定做',
      'personalizado', 'personalizar', 'especial', 'requisito', 'hecho a medida',
      'maßgeschneidert', 'anpassen', 'speziell', 'Anforderung', 'maßgefertigt',
      'personnalisé', 'personnaliser', 'spécial', 'exigence', 'sur mesure',
      'personalizzato', 'personalizzare', 'speciale', 'requisito', 'su misura'
    ]
  },
  
  // 语言识别配置
  language: {
    // 支持的语言
    SUPPORTED_LANGUAGES: [
      { code: 'en', name: 'English', confidence_threshold: 0.7 },
      { code: 'zh', name: 'Chinese', confidence_threshold: 0.7 },
      { code: 'es', name: 'Spanish', confidence_threshold: 0.7 },
      { code: 'de', name: 'German', confidence_threshold: 0.7 },
      { code: 'fr', name: 'French', confidence_threshold: 0.7 },
      { code: 'it', name: 'Italian', confidence_threshold: 0.7 },
      { code: 'ja', name: 'Japanese', confidence_threshold: 0.7 },
      { code: 'ko', name: 'Korean', confidence_threshold: 0.7 },
      { code: 'pt', name: 'Portuguese', confidence_threshold: 0.7 },
      { code: 'ru', name: 'Russian', confidence_threshold: 0.7 },
      { code: 'ar', name: 'Arabic', confidence_threshold: 0.7 },
      { code: 'hi', name: 'Hindi', confidence_threshold: 0.7 },
      { code: 'th', name: 'Thai', confidence_threshold: 0.7 },
      { code: 'vi', name: 'Vietnamese', confidence_threshold: 0.7 },
      { code: 'id', name: 'Indonesian', confidence_threshold: 0.7 },
      { code: 'tr', name: 'Turkish', confidence_threshold: 0.7 },
      { code: 'pl', name: 'Polish', confidence_threshold: 0.7 }
    ],
    // 语言检测方法
    DETECTION_METHOD: 'keyword_count', // keyword_count, character_set, ml
    // 默认语言
    DEFAULT_LANGUAGE: 'en',
    // 语言检测API（可选）
    DETECTION_API_URL: 'https://jevshop.workers.dev/api/language-detect',
    // 语言特定字符集
    CHARACTER_SETS: {
      en: /^[A-Za-z0-9\s,.!?'"\-():;]+$/,
      zh: /[\u4e00-\u9fff]/,
      ja: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/,
      ko: /[\uac00-\ud7af]/,
      ar: /[\u0600-\u06ff]/,
      ru: /[\u0400-\u04ff]/,
      hi: /[\u0900-\u097f]/,
      th: /[\u0e00-\u0e7f]/,
      vi: /[\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01a0\u01a1\u01af\u01b0]/
    }
  },
  
  // 关键词提取配置
  keyword_extraction: {
    // 最大关键词数量
    MAX_KEYWORDS: 10,
    // 最小关键词长度
    MIN_KEYWORD_LENGTH: 2,
    // 停用词列表（多语言）
    STOP_WORDS: {
      en: ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'with', 'on', 'at', 'by', 'from', 'as', 'if', 'when', 'where', 'who', 'which', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'],
      zh: ['的', '了', '和', '是', '在', '有', '我', '他', '她', '它', '们', '就', '也', '都', '要', '不是', '人', '这', '那', '你', '我', '他', '她', '它', '们', '而', '与', '或', '但', '如果', '因为', '所以', '虽然', '但是', '不过', '而且', '此外', '另外', '然而'],
      es: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'es', 'son', 'fue', 'fueron', 'a', 'de', 'en', 'para', 'con', 'por', 'desde', 'como', 'si', 'cuando', 'donde', 'quien', 'que', 'este', 'estos', 'esa', 'esas', 'ese', 'esos', 'aquel', 'aquellos', 'yo', 'tu', 'el', 'ella', 'usted', 'nosotros', 'vosotros', 'ellos', 'ellas', 'ustedes', 'mi', 'tu', 'su', 'nuestro', 'vuestro', 'sus'],
      de: ['der', 'die', 'das', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen', 'und', 'oder', 'aber', 'ist', 'sind', 'war', 'waren', 'zu', 'von', 'in', 'für', 'mit', 'an', 'bei', 'aus', 'als', 'wenn', 'wo', 'wer', 'was', 'dies', 'diese', 'dieser', 'dieses', 'dass', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'mein', 'dein', 'sein', 'ihr', 'unser', 'euer', 'ihr'],
      fr: ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'est', 'sont', 'était', 'étaient', 'à', 'de', 'en', 'pour', 'avec', 'sur', 'par', 'depuis', 'comme', 'si', 'quand', 'où', 'qui', 'que', 'ce', 'cet', 'cette', 'ces', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'mon', 'ton', 'son', 'notre', 'votre', 'leur']
    },
    // 关键词权重配置
    WEIGHT_CONFIG: {
      // 频率权重
      FREQUENCY_WEIGHT: 0.7,
      // 位置权重（越靠前权重越高）
      POSITION_WEIGHT: 0.3,
      // 大写关键词权重加成
      CAPITAL_WEIGHT_BOOST: 1.5,
      // 数字权重加成
      NUMBER_WEIGHT_BOOST: 1.3,
      // 连续出现权重加成
      CONSECUTIVE_BOOST: 2.0
    }
  },
  
  // 缓存配置
  cache: {
    ENABLED: true,
    TTL_MS: 300000, // 5分钟缓存
    MAX_SIZE: 1000,  // 最大缓存项数
    EVICTION_POLICY: 'LRU' // LRU, FIFO, LFU
  },
  
  // 安全配置
  security: {
    // 输入清理
    SANITIZE_INPUT: true,
    // 速率限制
    RATE_LIMIT_ENABLED: true,
    MAX_REQUESTS_PER_MINUTE: 100,
    // 敏感内容过滤
    FILTER_SENSITIVE_CONTENT: true,
    // 敏感词列表
    SENSITIVE_WORDS: [
      // 包含敏感词的消息将被标记并记录
    ]
  },
  
  // 日志配置
  logging: {
    ENABLED: true,
    LOG_LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR, FATAL
    LOG_FILE: 'semantic_analyzer.log',
    LOG_DIR: '/logs/',
    INCLUDE_DETAILS: false
  },
  
  // 性能配置
  performance: {
    // 最大处理文本长度
    MAX_TEXT_LENGTH: 5000,
    // 超时设置
    TIMEOUT_MS: 5000,
    // 并行处理
    ENABLE_PARALLEL_PROCESSING: true,
    MAX_PARALLEL_REQUESTS: 10
  },
  
  // AI 模型配置（可选）
  ai_model: {
    // 是否启用AI模型
    ENABLED: false,
    // 模型类型
    MODEL_TYPE: 'nlp', // nlp, transformer, custom
    // 模型端点
    MODEL_ENDPOINT: 'https://jevshop.workers.dev/api/ai/nlp',
    // API 密钥（不应该硬编码，这里只是示例）
    API_KEY: null,
    // 模型参数
    MODEL_PARAMS: {
      temperature: 0.1,
      max_tokens: 100,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0
    }
  }
};

// 内存缓存
let memoryCache = {
  // 分析结果缓存
  analysisCache: new Map(),
  // 缓存访问时间（用于LRU策略）
  cacheAccessTimes: new Map(),
  // 请求计数（用于速率限制）
  requestCounts: new Map(),
  // 语言检测缓存
  languageCache: new Map(),
  // 意图识别缓存
  intentCache: new Map(),
  // 关键词提取缓存
  keywordCache: new Map()
};

// 日志记录函数
function logMessage(level, message, details = {}) {
  if (!SEMANTIC_CONFIG.logging.ENABLED) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    level,
    timestamp,
    message,
    details: SEMANTIC_CONFIG.logging.INCLUDE_DETAILS ? details : {}
  };
  
  // 根据日志级别过滤
  const levelOrder = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'FATAL': 4 };
  const currentLevel = levelOrder[SEMANTIC_CONFIG.logging.LOG_LEVEL] || 1;
  
  if (levelOrder[level] >= currentLevel) {
    // 输出到控制台
    switch (level) {
      case 'DEBUG':
        console.debug(`[semantic_analyzer] ${JSON.stringify(logEntry)}`);
        break;
      case 'INFO':
        console.info(`[semantic_analyzer] ${JSON.stringify(logEntry)}`);
        break;
      case 'WARN':
        console.warn(`[semantic_analyzer] ${JSON.stringify(logEntry)}`);
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(`[semantic_analyzer] ${JSON.stringify(logEntry)}`);
        break;
    }
  }
}

// 清理过期请求计数
function cleanupRequestCounts() {
  const now = Date.now();
  for (const [key, value] of memoryCache.requestCounts.entries()) {
    if (now - value.timestamp > 60000) { // 1分钟过期
      memoryCache.requestCounts.delete(key);
    }
  }
}

// 速率限制检查
function checkRateLimit(clientId) {
  if (!SEMANTIC_CONFIG.security.RATE_LIMIT_ENABLED) return { allowed: true };
  
  // 清理过期计数
  cleanupRequestCounts();
  
  const now = Date.now();
  let count = 0;
  let timestamp = now;
  
  if (memoryCache.requestCounts.has(clientId)) {
    const data = memoryCache.requestCounts.get(clientId);
    count = data.count;
    timestamp = data.timestamp;
  }
  
  // 检查是否超过限制
  if (count >= SEMANTIC_CONFIG.security.MAX_REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Rate limit exceeded. Maximum ${SEMANTIC_CONFIG.security.MAX_REQUESTS_PER_MINUTE} requests per minute.`,
      retryAfter: Math.ceil((timestamp + 60000 - now) / 1000)
    };
  }
  
  // 更新计数
  memoryCache.requestCounts.set(clientId, {
    count: count + 1,
    timestamp: now
  });
  
  return { allowed: true, count: count + 1 };
}

// 清理输入数据
function sanitizeInput(input) {
  if (!SEMANTIC_CONFIG.security.SANITIZE_INPUT) return input;
  
  if (typeof input === 'string') {
    // 移除潜在的危险字符
    return input.replace(/[<>"&]/g, (char) => {
      const entityMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '&': '&amp;'
      };
      return entityMap[char] || char;
    });
  }
  
  return input;
}

// 检查敏感内容
function checkSensitiveContent(text) {
  if (!SEMANTIC_CONFIG.security.FILTER_SENSITIVE_CONTENT || 
      !SEMANTIC_CONFIG.security.SENSITIVE_WORDS.length) {
    return { hasSensitive: false };
  }
  
  const lowerText = text.toLowerCase();
  const sensitiveWordsFound = SEMANTIC_CONFIG.security.SENSITIVE_WORDS.filter(word => 
    lowerText.includes(word.toLowerCase())
  );
  
  return {
    hasSensitive: sensitiveWordsFound.length > 0,
    sensitiveWords: sensitiveWordsFound
  };
}

// 生成缓存键
function generateCacheKey(text, clientId = 'default') {
  // 为长文本创建截断键
  const maxKeyLength = 200;
  const textToHash = text.length > maxKeyLength ? text.substring(0, maxKeyLength) : text;
  
  // 创建简单哈希
  let hash = 0;
  for (let i = 0; i < textToHash.length; i++) {
    const char = textToHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `semantic_${Math.abs(hash)}_${clientId}`;
}

// 添加缓存
function addToCache(key, data, ttl = SEMANTIC_CONFIG.cache.TTL_MS) {
  if (!SEMANTIC_CONFIG.cache.ENABLED) return;
  
  // 检查缓存大小
  if (memoryCache.analysisCache.size >= SEMANTIC_CONFIG.cache.MAX_SIZE) {
    evictCacheItem();
  }
  
  // 添加到缓存
  memoryCache.analysisCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // 更新访问时间（用于LRU）
  memoryCache.cacheAccessTimes.set(key, Date.now());
}

// 从缓存获取
function getFromCache(key) {
  if (!SEMANTIC_CONFIG.cache.ENABLED) return null;
  
  const cached = memoryCache.analysisCache.get(key);
  if (!cached) return null;
  
  // 检查是否过期
  if (Date.now() - cached.timestamp > cached.ttl) {
    memoryCache.analysisCache.delete(key);
    memoryCache.cacheAccessTimes.delete(key);
    return null;
  }
  
  // 更新访问时间（用于LRU）
  memoryCache.cacheAccessTimes.set(key, Date.now());
  
  return cached.data;
}

// 缓存驱逐
function evictCacheItem() {
  switch (SEMANTIC_CONFIG.cache.EVICTION_POLICY) {
    case 'LRU':
      evictLRU();
      break;
    case 'FIFO':
      evictFIFO();
      break;
    case 'LFU':
      evictLFU();
      break;
    default:
      evictLRU();
  }
}

// 驱逐最久未使用的缓存项（LRU）
function evictLRU() {
  let oldestKey = null;
  let oldestTime = Infinity;
  
  for (const [key, time] of memoryCache.cacheAccessTimes.entries()) {
    if (time < oldestTime) {
      oldestTime = time;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    memoryCache.analysisCache.delete(oldestKey);
    memoryCache.cacheAccessTimes.delete(oldestKey);
  }
}

// 驱逐最先进入的缓存项（FIFO）
function evictFIFO() {
  let oldestKey = null;
  let oldestTime = Infinity;
  
  for (const [key, item] of memoryCache.analysisCache.entries()) {
    if (item.timestamp < oldestTime) {
      oldestTime = item.timestamp;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    memoryCache.analysisCache.delete(oldestKey);
    memoryCache.cacheAccessTimes.delete(oldestKey);
  }
}

// 驱逐最少使用的缓存项（LFU）
function evictLFU() {
  // 简化版LFU，实际上我们没有维护使用次数
  // 这里我们使用LRU代替
  evictLRU();
}

// 检测语言
function detectLanguage(text) {
  // 检查缓存
  const cacheKey = `lang_${generateCacheKey(text)}`;
  const cached = memoryCache.languageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1小时缓存
    return cached.result;
  }
  
  // 空文本处理
  if (!text || text.trim().length === 0) {
    return { language: SEMANTIC_CONFIG.language.DEFAULT_LANGUAGE, confidence: 0 };
  }
  
  // 根据配置选择检测方法
  let result;
  
  if (SEMANTIC_CONFIG.language.DETECTION_METHOD === 'character_set') {
    result = detectLanguageByCharacterSet(text);
  } else {
    result = detectLanguageByKeywords(text);
  }
  
  // 缓存结果
  memoryCache.languageCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  return result;
}

// 通过字符集检测语言
function detectLanguageByCharacterSet(text) {
  // 检查每个语言的特征字符
  const matches = [];
  
  for (const { code, confidence_threshold } of SEMANTIC_CONFIG.language.SUPPORTED_LANGUAGES) {
    const charSet = SEMANTIC_CONFIG.language.CHARACTER_SETS[code];
    if (!charSet) continue;
    
    // 计算匹配的字符比例
    const matchesCount = (text.match(charSet) || []).length;
    const confidence = Math.min(1, matchesCount / 10); // 最多10个匹配字符就认为是高置信度
    
    if (confidence >= confidence_threshold) {
      matches.push({ language: code, confidence });
    }
  }
  
  // 如果有匹配，返回置信度最高的
  if (matches.length > 0) {
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches[0];
  }
  
  // 默认返回英文
  return { language: SEMANTIC_CONFIG.language.DEFAULT_LANGUAGE, confidence: 0.5 };
}

// 通过关键词检测语言
function detectLanguageByKeywords(text) {
  // 转换为小写用于匹配
  const lowerText = text.toLowerCase();
  
  // 为每种语言计算匹配的关键词数量
  const languageScores = {};
  
  // 初始化所有支持的语言
  for (const { code } of SEMANTIC_CONFIG.language.SUPPORTED_LANGUAGES) {
    languageScores[code] = 0;
  }
  
  // 检查意图关键词中是否有匹配
  for (const [intent, keywords] of Object.entries(SEMANTIC_CONFIG.keywords)) {
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerText.includes(lowerKeyword)) {
        // 简单地根据关键词的语言特征判断
        // 这是一个简化的方法，实际应用中可能需要更复杂的逻辑
        if (/^[A-Za-z\s,.!?'"\-():;]+$/i.test(keyword)) {
          languageScores.en += 1;
        } else if (/[\u4e00-\u9fff]/.test(keyword)) {
          languageScores.zh += 1;
        } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(keyword)) {
          languageScores.ja += 1;
        } else if (/[\uac00-\ud7af]/.test(keyword)) {
          languageScores.ko += 1;
        } else if (/[\u0600-\u06ff]/.test(keyword)) {
          languageScores.ar += 1;
        } else if (/[\u0400-\u04ff]/.test(keyword)) {
          languageScores.ru += 1;
        }
      }
    }
  }
  
  // 找出得分最高的语言
  let maxScore = 0;
  let bestLanguage = SEMANTIC_CONFIG.language.DEFAULT_LANGUAGE;
  
  for (const [language, score] of Object.entries(languageScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestLanguage = language;
    }
  }
  
  // 计算置信度（基于匹配的关键词数量）
  const confidence = Math.min(1, maxScore / 10); // 最多10个关键词就认为是高置信度
  
  return { language: bestLanguage, confidence };
}

// 识别意图
function recognizeIntent(text, language = 'en') {
  // 检查缓存
  const cacheKey = `intent_${generateCacheKey(text)}_${language}`;
  const cached = memoryCache.intentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1小时缓存
    return cached.result;
  }
  
  // 根据配置选择识别方法
  let result;
  
  if (SEMANTIC_CONFIG.intent.RECOGNITION_METHOD === 'regex') {
    result = recognizeIntentByRegex(text, language);
  } else {
    result = recognizeIntentByKeywords(text, language);
  }
  
  // 缓存结果
  memoryCache.intentCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  return result;
}

// 通过关键词加权识别意图
function recognizeIntentByKeywords(text, language = 'en') {
  // 转换为小写用于匹配
  const lowerText = text.toLowerCase();
  
  // 计算每个意图的得分
  const intentScores = {};
  
  // 初始化所有意图类型
  for (const intentType of SEMANTIC_CONFIG.intent.INTENT_TYPES) {
    intentScores[intentType] = 0;
  }
  
  // 检查每个意图的关键词
  for (const [intent, keywords] of Object.entries(SEMANTIC_CONFIG.keywords)) {
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      
      // 计算关键词在文本中出现的次数
      const count = (lowerText.match(new RegExp(lowerKeyword, 'gi')) || []).length;
      
      // 根据关键词长度和出现次数计算得分
      const keywordScore = count * (keyword.length / 10); // 较长的关键词权重更高
      intentScores[intent] += keywordScore;
    }
  }
  
  // 找出得分最高的意图
  let maxScore = 0;
  let bestIntent = SEMANTIC_CONFIG.intent.DEFAULT_INTENT;
  
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent;
    }
  }
  
  // 计算置信度（基于最高得分）
  const confidence = Math.min(1, maxScore / 10); // 最高得分10就认为是高置信度
  
  // 如果置信度低于阈值，使用默认意图
  if (confidence < SEMANTIC_CONFIG.intent.CONFIDENCE_THRESHOLD) {
    bestIntent = SEMANTIC_CONFIG.intent.DEFAULT_INTENT;
  }
  
  return {
    intent: bestIntent,
    confidence,
    scores: intentScores
  };
}

// 通过正则表达式识别意图
function recognizeIntentByRegex(text, language = 'en') {
  // 这里可以实现更复杂的正则表达式匹配逻辑
  // 现在我们简单地使用关键词匹配
  return recognizeIntentByKeywords(text, language);
}

// 检测紧急程度
function detectUrgency(text, language = 'en') {
  // 转换为小写用于匹配
  const lowerText = text.toLowerCase();
  
  // 初始化紧急度得分
  let urgencyScore = 0;
  
  // 检查高紧急度关键词
  for (const keyword of SEMANTIC_CONFIG.urgency.HIGH_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      urgencyScore += 0.5; // 高权重
    }
  }
  
  // 检查时间敏感关键词
  for (const keyword of SEMANTIC_CONFIG.urgency.TIME_SENSITIVE_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      urgencyScore += 0.3; // 中等权重
    }
  }
  
  // 检查是否有感叹号
  const exclamationCount = (text.match(/!/g) || []).length;
  urgencyScore += exclamationCount * 0.1;
  
  // 检查是否全大写（可能表示紧急）
  if (text === text.toUpperCase() && text.length > 5) {
    urgencyScore += 0.2;
  }
  
  // 确保得分在0-1之间
  urgencyScore = Math.min(1, Math.max(0, urgencyScore));
  
  // 确定紧急程度级别
  let urgencyLevel = 'none';
  SEMANTIC_CONFIG.urgency.LEVELS.forEach(level => {
    if (urgencyScore >= level.threshold) {
      urgencyLevel = level.level;
    }
  });
  
  return {
    urgency_level: urgencyLevel,
    score: urgencyScore
  };
}

// 提取关键词
function extractKeywords(text, language = 'en', maxKeywords = SEMANTIC_CONFIG.keyword_extraction.MAX_KEYWORDS) {
  // 检查缓存
  const cacheKey = `keywords_${generateCacheKey(text)}_${language}`;
  const cached = memoryCache.keywordCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1小时缓存
    return cached.result;
  }
  
  // 基本清理
  let cleanedText = text.toLowerCase();
  
  // 移除特殊字符，只保留字母、数字和空格
  cleanedText = cleanedText.replace(/[^a-z0-9\s\u4e00-\u9fff]/gi, ' ');
  
  // 分词
  const words = cleanedText.split(/\s+/).filter(word => 
    word.length >= SEMANTIC_CONFIG.keyword_extraction.MIN_KEYWORD_LENGTH
  );
  
  // 获取停用词
  const stopWords = SEMANTIC_CONFIG.keyword_extraction.STOP_WORDS[language] || [];
  
  // 过滤停用词
  const filteredWords = words.filter(word => !stopWords.includes(word));
  
  // 计算词频
  const wordFrequency = {};
  for (let i = 0; i < filteredWords.length; i++) {
    const word = filteredWords[i];
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  }
  
  // 计算位置权重（越靠前权重越高）
  const positionWeight = {};
  for (let i = 0; i < filteredWords.length; i++) {
    const word = filteredWords[i];
    const weight = 1 - (i / filteredWords.length); // 位置权重从1递减到0
    positionWeight[word] = (positionWeight[word] || 0) + weight;
  }
  
  // 计算综合得分
  const keywordScores = {};
  for (const word of Object.keys(wordFrequency)) {
    // 频率权重
    const freqScore = wordFrequency[word] * SEMANTIC_CONFIG.keyword_extraction.WEIGHT_CONFIG.FREQUENCY_WEIGHT;
    
    // 位置权重
    const posScore = positionWeight[word] * SEMANTIC_CONFIG.keyword_extraction.WEIGHT_CONFIG.POSITION_WEIGHT;
    
    // 大写加成
    const originalWord = text.match(new RegExp(word, 'i'));
    const capitalBoost = originalWord && originalWord[0] === originalWord[0].toUpperCase() 
      ? SEMANTIC_CONFIG.keyword_extraction.WEIGHT_CONFIG.CAPITAL_WEIGHT_BOOST 
      : 1;
    
    // 数字加成
    const numberBoost = /\d/.test(word) 
      ? SEMANTIC_CONFIG.keyword_extraction.WEIGHT_CONFIG.NUMBER_WEIGHT_BOOST 
      : 1;
    
    // 综合得分
    keywordScores[word] = (freqScore + posScore) * capitalBoost * numberBoost;
  }
  
  // 排序并取前N个关键词
  const sortedKeywords = Object.entries(keywordScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([keyword, score]) => ({
      keyword,
      score,
      frequency: wordFrequency[keyword] || 0
    }));
  
  const result = {
    keywords: sortedKeywords.map(item => item.keyword),
    detailed: sortedKeywords,
    total: sortedKeywords.length
  };
  
  // 缓存结果
  memoryCache.keywordCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  return result;
}

// 分析消息文本
async function analyzeMessage(text, options = {}) {
  try {
    // 速率限制检查
    const clientId = options.clientId || 'default';
    const rateLimitCheck = checkRateLimit(clientId);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.reason);
    }
    
    // 清理输入
    const sanitizedText = sanitizeInput(text);
    
    // 检查文本长度
    if (sanitizedText.length > SEMANTIC_CONFIG.performance.MAX_TEXT_LENGTH) {
      throw new Error(`Text too long. Maximum ${SEMANTIC_CONFIG.performance.MAX_TEXT_LENGTH} characters allowed.`);
    }
    
    // 检查敏感内容
    const sensitiveCheck = checkSensitiveContent(sanitizedText);
    if (sensitiveCheck.hasSensitive) {
      logMessage('WARN', 'Sensitive content detected', {
        clientId,
        sensitiveWords: sensitiveCheck.sensitiveWords
      });
    }
    
    // 检查缓存
    const cacheKey = generateCacheKey(sanitizedText, clientId);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      logMessage('DEBUG', 'Cache hit for semantic analysis', { clientId, textLength: sanitizedText.length });
      return {
        ...cachedResult,
        from_cache: true,
        timestamp: new Date().toISOString()
      };
    }
    
    // 创建性能监控超时
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Semantic analysis timed out'));
      }, SEMANTIC_CONFIG.performance.TIMEOUT_MS);
    });
    
    try {
      // 并行执行分析任务
      let analysisPromises = [
        Promise.resolve(detectLanguage(sanitizedText)),
        Promise.resolve(extractKeywords(sanitizedText))
      ];
      
      // 等待语言检测完成后再进行意图和紧急度分析
      const [languageResult, keywordsResult] = await Promise.all(analysisPromises);
      
      const languageCode = languageResult.language;
      
      // 继续执行意图和紧急度分析
      analysisPromises = [
        Promise.resolve(recognizeIntent(sanitizedText, languageCode)),
        Promise.resolve(detectUrgency(sanitizedText, languageCode))
      ];
      
      const [intentResult, urgencyResult] = await Promise.all(analysisPromises);
      
      // 构建最终结果
      const result = {
        intent: intentResult.intent,
        intent_confidence: intentResult.confidence,
        keywords: keywordsResult.keywords,
        detailed_keywords: keywordsResult.detailed,
        urgency_level: urgencyResult.urgency_level,
        urgency_score: urgencyResult.score,
        language: languageCode,
        language_confidence: languageResult.confidence,
        sensitive_content: sensitiveCheck.hasSensitive,
        sensitive_words: sensitiveCheck.sensitiveWords,
        text_length: sanitizedText.length,
        timestamp: new Date().toISOString(),
        module: 'semantic_analyzer'
      };
      
      // 添加到缓存
      addToCache(cacheKey, result);
      
      logMessage('INFO', 'Semantic analysis completed', {
        intent: result.intent,
        language: result.language,
        urgency: result.urgency_level,
        clientId
      });
      
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logMessage('ERROR', 'Semantic analysis failed', { error: error.message });
    
    // 返回错误状态的默认结果
    return {
      intent: SEMANTIC_CONFIG.intent.DEFAULT_INTENT,
      intent_confidence: 0,
      keywords: [],
      detailed_keywords: [],
      urgency_level: 'none',
      urgency_score: 0,
      language: SEMANTIC_CONFIG.language.DEFAULT_LANGUAGE,
      language_confidence: 0,
      sensitive_content: false,
      sensitive_words: [],
      error: error.message,
      timestamp: new Date().toISOString(),
      module: 'semantic_analyzer'
    };
  }
}

// 批量分析消息
async function batchAnalyzeMessages(messages, options = {}) {
  try {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }
    
    if (messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }
    
    if (messages.length > 50) {
      throw new Error('Maximum 50 messages per batch');
    }
    
    // 速率限制检查
    const clientId = options.clientId || 'default';
    const rateLimitCheck = checkRateLimit(clientId);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.reason);
    }
    
    logMessage('INFO', `Batch analyzing ${messages.length} messages`, { clientId });
    
    // 控制并行数量
    const maxParallel = SEMANTIC_CONFIG.performance.ENABLE_PARALLEL_PROCESSING 
      ? SEMANTIC_CONFIG.performance.MAX_PARALLEL_REQUESTS 
      : 1;
    
    const results = [];
    const errors = [];
    
    // 分批处理
    for (let i = 0; i < messages.length; i += maxParallel) {
      const batch = messages.slice(i, i + maxParallel);
      
      const batchPromises = batch.map(async (message, index) => {
        try {
          const result = await analyzeMessage(message, {
            ...options,
            clientId: `${clientId}_batch_${i + index}`
          });
          results.push({
            index: i + index,
            message,
            success: true,
            data: result
          });
        } catch (error) {
          errors.push({
            index: i + index,
            message,
            success: false,
            error: error.message
          });
          results.push({
            index: i + index,
            message,
            success: false,
            error: error.message
          });
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    // 确保结果按原始顺序排序
    results.sort((a, b) => a.index - b.index);
    
    logMessage('INFO', `Batch analysis completed. Success: ${results.filter(r => r.success).length}, Failed: ${errors.length}`, { clientId });
    
    return {
      success: errors.length === 0,
      total_messages: messages.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length,
      results,
      errors,
      timestamp: new Date().toISOString(),
      module: 'semantic_analyzer'
    };
  } catch (error) {
    logMessage('ERROR', 'Batch semantic analysis failed', { error: error.message });
    throw error;
  }
}

// 获取意图配置
function getIntentConfig() {
  return {
    supported_intents: SEMANTIC_CONFIG.intent.INTENT_TYPES,
    default_intent: SEMANTIC_CONFIG.intent.DEFAULT_INTENT,
    confidence_threshold: SEMANTIC_CONFIG.intent.CONFIDENCE_THRESHOLD,
    recognition_method: SEMANTIC_CONFIG.intent.RECOGNITION_METHOD
  };
}

// 获取语言配置
function getLanguageConfig() {
  return {
    supported_languages: SEMANTIC_CONFIG.language.SUPPORTED_LANGUAGES,
    default_language: SEMANTIC_CONFIG.language.DEFAULT_LANGUAGE,
    detection_method: SEMANTIC_CONFIG.language.DETECTION_METHOD
  };
}

// 获取紧急度配置
function getUrgencyConfig() {
  return {
    urgency_levels: SEMANTIC_CONFIG.urgency.LEVELS,
    high_keywords_count: SEMANTIC_CONFIG.urgency.HIGH_KEYWORDS.length,
    time_sensitive_keywords_count: SEMANTIC_CONFIG.urgency.TIME_SENSITIVE_KEYWORDS.length
  };
}

// 健康检查
async function healthCheck() {
  try {
    // 测试基本功能
    const testText = 'Hello, I want to know the price of your products';
    const testResult = await analyzeMessage(testText, { clientId: 'health_check' });
    
    // 检查缓存状态
    const cacheStatus = {
      analysisCache: memoryCache.analysisCache.size,
      languageCache: memoryCache.languageCache.size,
      intentCache: memoryCache.intentCache.size,
      keywordCache: memoryCache.keywordCache.size
    };
    
    // 检查配置有效性
    const configValid = SEMANTIC_CONFIG.intent.INTENT_TYPES.length > 0 && 
                       SEMANTIC_CONFIG.language.SUPPORTED_LANGUAGES.length > 0;
    
    // 确定整体状态
    const status = configValid && testResult.intent !== SEMANTIC_CONFIG.intent.DEFAULT_INTENT 
      ? 'HEALTHY' 
      : 'DEGRADED';
    
    logMessage('INFO', 'Health check completed', { status });
    
    return {
      status,
      module: 'semantic_analyzer',
      timestamp: new Date().toISOString(),
      version: 'v2.0',
      test_result: {
        intent: testResult.intent,
        language: testResult.language
      },
      cacheStatus,
      configValid,
      supportedIntents: SEMANTIC_CONFIG.intent.INTENT_TYPES.length,
      supportedLanguages: SEMANTIC_CONFIG.language.SUPPORTED_LANGUAGES.length
    };
  } catch (error) {
    logMessage('ERROR', 'Health check failed', { error: error.message });
    return {
      status: 'ERROR',
      module: 'semantic_analyzer',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 清除缓存
function clearCache() {
  try {
    memoryCache = {
      analysisCache: new Map(),
      cacheAccessTimes: new Map(),
      requestCounts: new Map(),
      languageCache: new Map(),
      intentCache: new Map(),
      keywordCache: new Map()
    };
    
    logMessage('INFO', 'Cache cleared successfully');
    
    return {
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logMessage('ERROR', 'Failed to clear cache', { error: error.message });
    throw error;
  }
}

// 估算分析复杂度
function estimateComplexity(text) {
  // 基于文本长度和词汇多样性估算复杂度
  const wordCount = text.split(/\s+/).length;
  const uniqueWords = new Set(text.toLowerCase().match(/\b\w+\b/g) || []).size;
  
  // 计算词汇多样性（类型/标记比）
  const diversity = wordCount > 0 ? uniqueWords / wordCount : 0;
  
  // 复杂度得分（0-1）
  const complexity = Math.min(1, (wordCount / 100) * 0.7 + (diversity * 0.3));
  
  // 复杂度级别
  let level;
  if (complexity < 0.3) {
    level = 'simple';
  } else if (complexity < 0.7) {
    level = 'medium';
  } else {
    level = 'complex';
  }
  
  return {
    complexity,
    level,
    word_count: wordCount,
    unique_words: uniqueWords,
    diversity: parseFloat(diversity.toFixed(2))
  };
}

// 核心API导出
export async function analyzeMessage(text, options = {}) {
  return await analyzeMessage(text, options);
}

export async function batchAnalyzeMessages(messages, options = {}) {
  return await batchAnalyzeMessages(messages, options);
}

export function getIntentConfig() {
  return getIntentConfig();
}

export function getLanguageConfig() {
  return getLanguageConfig();
}

export function getUrgencyConfig() {
  return getUrgencyConfig();
}

export async function healthCheck() {
  return await healthCheck();
}

export function clearCache() {
  return clearCache();
}

export function estimateComplexity(text) {
  return estimateComplexity(text);
}

export function detectLanguage(text) {
  return detectLanguage(text);
}

export function recognizeIntent(text, language = 'en') {
  return recognizeIntent(text, language);
}

export function detectUrgency(text, language = 'en') {
  return detectUrgency(text, language);
}

export function extractKeywords(text, language = 'en', maxKeywords = SEMANTIC_CONFIG.keyword_extraction.MAX_KEYWORDS) {
  return extractKeywords(text, language, maxKeywords);
}

// 默认导出
module.exports = {
  // 主要功能
  analyzeMessage,
  batchAnalyzeMessages,
  
  // 配置获取
  getIntentConfig,
  getLanguageConfig,
  getUrgencyConfig,
  
  // 辅助功能
  healthCheck,
  clearCache,
  estimateComplexity,
  detectLanguage,
  recognizeIntent,
  detectUrgency,
  extractKeywords,
  
  // 配置信息
  getConfig: () => ({ ...SEMANTIC_CONFIG }),
  
  // 版本信息
  version: 'v2.0',
  name: 'Semantic Analyzer Module',
  description: 'JEV Plugin v2.0 - Customer Intent and Need Semantic Recognition Module'
};

// ES模块默认导出
exports.default = {
  analyzeMessage,
  batchAnalyzeMessages,
  getIntentConfig,
  getLanguageConfig,
  getUrgencyConfig,
  healthCheck,
  clearCache,
  estimateComplexity,
  detectLanguage,
  recognizeIntent,
  detectUrgency,
  extractKeywords,
  getConfig: () => ({ ...SEMANTIC_CONFIG }),
  version: 'v2.0',
  name: 'Semantic Analyzer Module',
  description: 'JEV Plugin v2.0 - Customer Intent and Need Semantic Recognition Module'
};

// 初始化日志
logMessage('INFO', 'Semantic Analyzer Module initialized successfully');
