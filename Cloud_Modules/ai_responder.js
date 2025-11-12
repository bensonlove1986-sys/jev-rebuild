/**
 * JEV Plugin v2.0 - AI 自动回复与推荐话语模块
 * 生成自然语言回复与推荐话术，支持多种语气风格
 */

// AI模型配置
const AI_CONFIG = {
  models: [
    {
      name: 'deepseek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      key: process.env.DEEPSEEK_API_KEY || 'placeholder',
      priority: 1
    },
    {
      name: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      key: process.env.OPENAI_API_KEY || 'placeholder',
      priority: 2
    },
    {
      name: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      key: process.env.GEMINI_API_KEY || 'placeholder',
      priority: 3
    }
  ]
};

// 支持的语气类型
const TONE_TYPES = {
  friendly: '友好的',
  technical: '专业的',
  sales: '销售型',
  neutral: '中立的'
};

// 上下文管理
const contextStore = new Map();
const MAX_CONTEXT_SIZE = 10;
const CONTEXT_TTL = 3600000; // 1小时

// 推荐话术模板
const REPLY_TEMPLATES = {
  friendly: [
    '您好！很高兴为您提供帮助。关于您的问题，我们有以下建议...',
    '感谢您的咨询！我理解您的需求，这是我们为您准备的方案...',
    '您好！针对您提到的情况，我们可以...',
    '亲爱的客户，很高兴收到您的消息。关于...'
  ],
  technical: [
    '根据技术分析，您的问题可能是由...导致的。建议采取以下措施...',
    '经过系统诊断，我们发现...，推荐解决方案为...',
    '技术评估显示...，请按照以下步骤操作...',
    '根据数据分析，最优配置应为...'
  ],
  sales: [
    '这是我们的热门产品！现在购买可享受...优惠，非常适合您的需求。',
    '好消息！我们正在进行限时促销活动，您感兴趣的产品现在仅需...',
    '这个产品正是您所需要的！它具有...优势，能够为您节省...',
    '您真是眼光独到！这款产品目前销量领先，客户满意度高达...'
  ],
  neutral: [
    '根据您的询问，以下是相关信息...',
    '关于您提出的问题，我们的回复如下...',
    '这是您所需的信息...',
    '基于您的需求，我们提供以下建议...'
  ]
};

// 加载语义分析模块
let semanticAnalyzer = null;
try {
  // 尝试动态导入语义分析模块
  semanticAnalyzer = require('./semantic_analyzer.js');
} catch (error) {
  console.log('[ai_responder] Semantic analyzer module not available, running without it');
}

// 获取随机模板
function getRandomTemplate(tone) {
  const templates = REPLY_TEMPLATES[tone] || REPLY_TEMPLATES.neutral;
  return templates[Math.floor(Math.random() * templates.length)];
}

// 生成对话历史
function generateConversationHistory(context, maxLength = 5) {
  if (!context || !context.history) {
    return [];
  }
  
  // 只保留最近的对话记录
  const history = context.history.slice(-maxLength);
  return history.map(item => ({
    role: item.role,
    content: item.content
  }));
}

// 构建系统提示词
function buildSystemPrompt(tone, intent) {
  const toneName = TONE_TYPES[tone] || TONE_TYPES.neutral;
  let intentInfo = '';
  
  if (intent) {
    intentInfo = `用户意图分析结果: ${JSON.stringify(intent)}\n基于此意图，生成更精准的回复。`;
  }
  
  return `
你是一个专业的AI客服助手，现在需要以${toneName}语气回复客户。

语气指南:
- 友好型: 使用亲切的语言，表达关心和乐于助人的态度
- 专业型: 提供详细准确的技术信息，使用专业术语
- 销售型: 强调产品优势和促销信息，鼓励客户购买
- 中立型: 客观准确地提供信息，不偏不倚

回复要求:
1. 语言自然流畅，符合中文表达习惯
2. 针对性强，直接回应用户的核心问题
3. 简洁明了，避免冗长和复杂句子
4. 保持专业形象，不使用口语化或不当用语
5. 鼓励进一步交流

${intentInfo}
`;
}

// 使用DeepSeek生成回复
async function generateWithDeepseek(context, tone) {
  const config = AI_CONFIG.models.find(m => m.name === 'deepseek');
  if (!config || !config.key || config.key === 'placeholder') {
    throw new Error('Deepseek model not configured');
  }
  
  try {
    // 分析用户意图（如果可用）
    let intent = null;
    if (semanticAnalyzer && semanticAnalyzer.analyzeMessage) {
      try {
        const lastMessage = context.history[context.history.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          intent = await semanticAnalyzer.analyzeMessage(lastMessage.content);
        }
      } catch (error) {
        console.error('[ai_responder] Intent analysis failed:', error);
      }
    }
    
    // 构建消息数组
    const messages = [
      {
        role: 'system',
        content: buildSystemPrompt(tone, intent)
      },
      ...generateConversationHistory(context)
    ];
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[ai_responder] Deepseek generation failed:', error);
    throw error;
  }
}

// 使用OpenAI生成回复
async function generateWithOpenAI(context, tone) {
  const config = AI_CONFIG.models.find(m => m.name === 'openai');
  if (!config || !config.key || config.key === 'placeholder') {
    throw new Error('OpenAI model not configured');
  }
  
  try {
    // 构建消息数组
    const messages = [
      {
        role: 'system',
        content: buildSystemPrompt(tone)
      },
      ...generateConversationHistory(context)
    ];
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[ai_responder] OpenAI generation failed:', error);
    throw error;
  }
}

// 使用Gemini生成回复
async function generateWithGemini(context, tone) {
  const config = AI_CONFIG.models.find(m => m.name === 'gemini');
  if (!config || !config.key || config.key === 'placeholder') {
    throw new Error('Gemini model not configured');
  }
  
  try {
    const conversationText = generateConversationHistory(context)
      .map(item => `${item.role === 'user' ? '用户' : '助手'}: ${item.content}`)
      .join('\n');
    
    const prompt = `${buildSystemPrompt(tone)}\n\n对话历史:\n${conversationText}\n\n请生成下一步回复:`;
    
    const response = await fetch(`${config.endpoint}?key=${config.key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  } catch (error) {
    console.error('[ai_responder] Gemini generation failed:', error);
    throw error;
  }
}

// 备用回复生成
function generateFallbackReply(context, tone) {
  const template = getRandomTemplate(tone);
  const lastMessage = context.history[context.history.length - 1];
  
  // 简单的模板替换
  let reply = template;
  if (lastMessage && lastMessage.content.length > 0) {
    // 提取关键词（简单实现）
    const keywords = extractKeywords(lastMessage.content);
    if (keywords.length > 0) {
      reply += ` 针对${keywords[0]}，我们有专业的解决方案。`;
    }
  }
  
  return reply;
}

// 提取关键词（简单实现）
function extractKeywords(text) {
  // 移除标点符号并分词
  const words = text.replace(/[.,?!;:，。！？；：]/g, '').split(/\s+/);
  // 过滤常见词（简单实现）
  const commonWords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
  return words.filter(word => word.length > 1 && !commonWords.has(word));
}

// 更新上下文
function updateContext(contextId, role, content) {
  if (!contextStore.has(contextId)) {
    contextStore.set(contextId, {
      history: [],
      createdAt: Date.now()
    });
  }
  
  const context = contextStore.get(contextId);
  
  // 清理过期上下文
  if (Date.now() - context.createdAt > CONTEXT_TTL) {
    context.history = [];
    context.createdAt = Date.now();
  }
  
  // 添加新消息
  context.history.push({ role, content, timestamp: Date.now() });
  
  // 限制历史记录长度
  if (context.history.length > MAX_CONTEXT_SIZE) {
    context.history = context.history.slice(-MAX_CONTEXT_SIZE);
  }
  
  contextStore.set(contextId, context);
  return context;
}

// 生成回复主函数
async function generateReply(context, tone = 'neutral') {
  try {
    // 验证参数
    if (!context || !context.history || !Array.isArray(context.history)) {
      throw new Error('Invalid context format');
    }
    
    // 验证语气类型
    if (!TONE_TYPES[tone]) {
      throw new Error(`Unsupported tone: ${tone}`);
    }
    
    // 确保有用户消息
    const userMessages = context.history.filter(item => item.role === 'user');
    if (userMessages.length === 0) {
      throw new Error('No user messages found in context');
    }
    
    // 按优先级尝试不同的AI模型
    let reply = '';
    const generators = [
      { generateFn: generateWithDeepseek },
      { generateFn: generateWithOpenAI },
      { generateFn: generateWithGemini }
    ];
    
    for (const { generateFn } of generators) {
      try {
        reply = await generateFn(context, tone);
        if (reply && reply.trim().length > 0) {
          break;
        }
      } catch (error) {
        console.log(`[ai_responder] Trying next generator: ${error.message}`);
      }
    }
    
    // 如果所有AI模型都失败，使用备用回复
    if (!reply || reply.trim().length === 0) {
      reply = generateFallbackReply(context, tone);
    }
    
    // 如果有contextId，更新上下文
    if (context.contextId) {
      updateContext(context.contextId, 'assistant', reply);
    }
    
    return {
      reply,
      tone,
      timestamp: Date.now(),
      model_used: reply === generateFallbackReply ? 'fallback' : 'ai',
      has_intent_analysis: semanticAnalyzer !== null
    };
  } catch (error) {
    console.error('[ai_responder] Reply generation error:', error);
    throw new Error(`Failed to generate reply: ${error.message}`);
  }
}

// 清理过期上下文
function cleanupExpiredContexts() {
  const now = Date.now();
  for (const [contextId, context] of contextStore.entries()) {
    if (now - context.createdAt > CONTEXT_TTL) {
      contextStore.delete(contextId);
    }
  }
}

// 定期清理过期上下文
setInterval(cleanupExpiredContexts, 300000); // 每5分钟清理一次

// 模块导出
module.exports = {
  generateReply,
  TONE_TYPES,
  updateContext,
  cleanupExpiredContexts
};

// 导出为ES模块
exports.default = {
  generateReply,
  TONE_TYPES,
  updateContext,
  cleanupExpiredContexts
};
