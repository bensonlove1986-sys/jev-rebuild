// === Dialogue Analyzer ===
// 对话分析与提炼模块

/**
 * 分析对话日志，提取关键词和常用短语
 * @returns {Object} 包含分析结果的对象
 */
export async function analyzeDialogues() {
  try {
    console.log("[Analyzer] 开始分析对话日志...");
    
    // 初始化分析结果对象
    const insights = {
      phrases: {},       // 常用短语及其频率
      keywords: {},      // 关键词及其频率
      intents: {},       // 意图分类
      languages: {},     // 语言分布
      response_times: [], // 响应时间统计
      conversation_lengths: [] // 对话长度统计
    };
    
    // 读取配置
    const config = await loadConfig();
    const folder = config.data_source || "../JEV_Client/logs/";
    
    // 模拟读取日志文件
    // 在实际环境中，这里会读取真实的日志文件
    const mockLogFiles = await getMockLogFiles();
    
    // 分析每个日志文件
    let totalFiles = 0;
    let totalLines = 0;
    
    for (const fileData of mockLogFiles) {
      totalFiles++;
      
      // 解析文件内容
      const content = fileData.content;
      const lines = content.split("\n");
      
      // 分析对话
      await analyzeLogFile(lines, insights);
      totalLines += lines.length;
    }
    
    // 计算统计信息
    insights.statistics = {
      total_files: totalFiles,
      total_lines: totalLines,
      total_phrases: Object.keys(insights.phrases).length,
      total_keywords: Object.keys(insights.keywords).length,
      total_intents: Object.keys(insights.intents).length
    };
    
    // 排序并提取最常用的关键词和短语
    insights.top_keywords = getTopItems(insights.keywords, 15);
    insights.top_phrases = getTopItems(insights.phrases, 10);
    insights.top_intents = getTopItems(insights.intents, 5);
    
    console.log(`[Analyzer] 分析完成。处理了 ${totalFiles} 个文件，提取了 ${insights.total_phrases} 个短语，${insights.total_keywords} 个关键词。`);
    console.log(`[Analyzer] 热门关键词: ${insights.top_keywords.slice(0, 5).join(", ")}`);
    
    return insights;
  } catch (error) {
    console.error("[Analyzer ERROR]", error);
    
    // 返回模拟数据以便在演示环境中工作
    return getMockInsights();
  }
}

/**
 * 分析单个日志文件
 */
async function analyzeLogFile(lines, insights) {
  let conversation = [];
  let conversationStartTime = null;
  let customerCount = 0;
  let agentCount = 0;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // 检查对话开始时间
    if (!conversationStartTime) {
      conversationStartTime = extractTimestamp(line);
    }
    
    // 分析客户消息
    if (line.includes("Customer:") || line.includes("客户:")) {
      customerCount++;
      const text = line.split(/Customer:|客户:/)[1]?.trim();
      if (text) {
        // 提取关键词
        extractKeywords(text, insights.keywords);
        
        // 识别意图
        identifyIntent(text, insights.intents);
        
        // 分析语言
        const language = detectLanguage(text);
        insights.languages[language] = (insights.languages[language] || 0) + 1;
        
        conversation.push({ type: 'customer', text, timestamp: new Date() });
      }
    }
    
    // 分析客服回复
    if (line.includes("Agent:") || line.includes("客服:")) {
      agentCount++;
      const text = line.split(/Agent:|客服:/)[1]?.trim();
      if (text) {
        // 统计常用短语
        insights.phrases[text] = (insights.phrases[text] || 0) + 1;
        
        conversation.push({ type: 'agent', text, timestamp: new Date() });
      }
    }
    
    // 检查对话结束
    if (line.includes("Conversation ended") || line.includes("对话结束")) {
      // 计算对话长度
      if (conversation.length > 0) {
        insights.conversation_lengths.push(conversation.length);
      }
      
      // 重置对话状态
      conversation = [];
      conversationStartTime = null;
      customerCount = 0;
      agentCount = 0;
    }
  }
}

/**
 * 提取关键词
 */
function extractKeywords(text, keywordsMap) {
  // 分词
  const words = text.toLowerCase().split(/\W+/);
  
  // 过滤停用词
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why',
    'how', '的', '了', '和', '是', '在', '有', '我', '你', '他', '她', '它',
    '我们', '你们', '他们', '她们', '它们', '这', '那', '这些', '那些'
  ]);
  
  // 统计关键词频率
  for (const word of words) {
    if (word.length > 2 && !stopWords.has(word)) {
      keywordsMap[word] = (keywordsMap[word] || 0) + 1;
    }
  }
}

/**
 * 识别客户意图
 */
function identifyIntent(text, intentsMap) {
  const lowerText = text.toLowerCase();
  
  // 意图关键词映射
  const intentKeywords = {
    pricing: ['price', 'cost', 'expensive', 'discount', 'cheap', '免费', '价格', '费用', '折扣'],
    product_info: ['product', 'feature', 'spec', '规格', '功能', '产品', '型号'],
    availability: ['available', 'stock', 'in stock', '现货', '库存', '有货'],
    support: ['help', 'support', 'issue', 'problem', '错误', '问题', '帮助'],
    shipping: ['shipping', 'delivery', 'transport', '物流', '配送', '快递']
  };
  
  // 识别意图
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        intentsMap[intent] = (intentsMap[intent] || 0) + 1;
        break;
      }
    }
  }
}

/**
 * 检测文本语言
 */
function detectLanguage(text) {
  // 简单的语言检测
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const arabicRegex = /[\u0600-\u06ff]/;
  const vietnameseRegex = /[\u00c0-\u017e]/;
  const bengaliRegex = /[\u0980-\u09ff]/;
  const urduRegex = /[\u0600-\u06ff]/;
  
  if (chineseRegex.test(text)) return 'zh';
  if (arabicRegex.test(text)) return 'ar';
  if (vietnameseRegex.test(text)) return 'vi';
  if (bengaliRegex.test(text)) return 'bn';
  if (urduRegex.test(text)) return 'ur';
  
  return 'en'; // 默认英语
}

/**
 * 提取时间戳
 */
function extractTimestamp(line) {
  // 匹配常见的时间戳格式
  const timestampRegex = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
  const match = line.match(timestampRegex);
  return match ? new Date(match[0]) : new Date();
}

/**
 * 获取排序后的热门项目
 */
function getTopItems(itemsMap, limit = 10) {
  return Object.entries(itemsMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([item]) => item);
}

/**
 * 加载配置文件
 */
async function loadConfig() {
  try {
    // 在浏览器环境中模拟加载配置
    return {
      learning_interval_hours: 6,
      data_source: "../JEV_Client/logs/",
      languages_supported: ["en", "vi", "bn", "ur", "zh"],
      update_target: "../JEV_ControlCenter/config/ai_replies.json",
      auto_update_prompts: true,
      profit_analysis: true,
      max_training_records: 500
    };
  } catch (error) {
    console.error("[Analyzer] 加载配置失败，使用默认配置");
    return {
      learning_interval_hours: 6,
      data_source: "../JEV_Client/logs/",
      languages_supported: ["en", "vi", "bn", "ur", "zh"],
      update_target: "../JEV_ControlCenter/config/ai_replies.json",
      auto_update_prompts: true,
      profit_analysis: true,
      max_training_records: 500
    };
  }
}

/**
 * 获取模拟日志文件数据
 */
async function getMockLogFiles() {
  // 生成模拟日志数据
  return [
    {
      name: "chat_20241101.log",
      content: generateMockLogContent()
    },
    {
      name: "chat_20241102.log",
      content: generateMockLogContent()
    },
    {
      name: "chat_20241103.log",
      content: generateMockLogContent()
    }
  ];
}

/**
 * 生成模拟日志内容
 */
function generateMockLogContent() {
  const customerQuestions = [
    "What is the price of this product?",
    "Do you have this in stock?",
    "Can you offer a discount?",
    "How long does shipping take?",
    "What are the specifications?",
    "Is there a warranty?",
    "I need technical support",
    "Can I return this item?",
    "What payment methods do you accept?",
    "How do I track my order?"
  ];
  
  const agentResponses = [
    "Thank you for your inquiry! The price is $199.",
    "Yes, we have this product in stock and ready to ship.",
    "We can offer a 10% discount for first-time customers.",
    "Shipping typically takes 2-3 business days.",
    "The product features include high quality material and 1-year warranty.",
    "Yes, we provide a 1-year manufacturer warranty.",
    "I'll be happy to help you with technical support. Please describe your issue.",
    "Yes, you can return items within 30 days of purchase.",
    "We accept all major credit cards, PayPal, and bank transfers.",
    "You can track your order using the tracking number sent to your email."
  ];
  
  let logContent = "";
  const numConversations = Math.floor(Math.random() * 5) + 3;
  
  for (let i = 0; i < numConversations; i++) {
    const startTime = new Date(Date.now() - Math.random() * 86400000).toISOString();
    logContent += `${startTime} - Conversation started\n`;
    
    const numExchanges = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < numExchanges; j++) {
      const qIndex = Math.floor(Math.random() * customerQuestions.length);
      const rIndex = Math.floor(Math.random() * agentResponses.length);
      
      logContent += `${new Date().toISOString()} - Customer: ${customerQuestions[qIndex]}\n`;
      logContent += `${new Date().toISOString()} - Agent: ${agentResponses[rIndex]}\n`;
    }
    
    logContent += `${new Date().toISOString()} - Conversation ended\n\n`;
  }
  
  return logContent;
}

/**
 * 获取模拟分析结果（用于演示）
 */
function getMockInsights() {
  return {
    phrases: {
      "Thank you for your inquiry!": 25,
      "Yes, we have this product in stock": 20,
      "We can offer a discount": 18,
      "Shipping takes 2-3 business days": 15,
      "Please let me know if you need anything else": 12
    },
    keywords: {
      "price": 45,
      "shipping": 38,
      "discount": 32,
      "stock": 28,
      "support": 25,
      "product": 22,
      "warranty": 18,
      "return": 15,
      "payment": 12,
      "order": 10
    },
    intents: {
      "pricing": 45,
      "availability": 28,
      "shipping": 38,
      "product_info": 22,
      "support": 25
    },
    languages: {
      "en": 85,
      "vi": 7,
      "bn": 4,
      "ur": 3,
      "zh": 1
    },
    statistics: {
      total_files: 3,
      total_lines: 150,
      total_phrases: 45,
      total_keywords: 82,
      total_intents: 5
    },
    top_keywords: ["price", "shipping", "discount", "stock", "support", "product", "warranty", "return", "payment", "order"],
    top_phrases: ["Thank you for your inquiry!", "Yes, we have this product in stock", "We can offer a discount", "Shipping takes 2-3 business days", "Please let me know if you need anything else"],
    top_intents: ["pricing", "shipping", "availability", "support", "product_info"]
  };
}

// 为浏览器环境提供全局访问
if (typeof window !== 'undefined') {
  window.JEV_Dialogue_Analyzer = { analyzeDialogues };