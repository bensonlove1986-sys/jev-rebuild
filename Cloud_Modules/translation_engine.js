/**
 * JEV Plugin v2.0 - 多语言翻译模块
 * 支持DeepSeek/OpenAI/Gemini可切换的翻译服务
 */

// 翻译引擎配置
const TRANSLATION_CONFIG = {
  services: [
    {
      name: 'deepseek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      key: process.env.DEEPSEEK_API_KEY || 'placeholder',
      priority: 1,
      enabled: true
    },
    {
      name: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      key: process.env.OPENAI_API_KEY || 'placeholder',
      priority: 2,
      enabled: true
    },
    {
      name: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      key: process.env.GEMINI_API_KEY || 'placeholder',
      priority: 3,
      enabled: true
    },
    {
      name: 'relay',
      endpoint: 'https://jevshop.workers.dev/api/translate',
      priority: 4,
      enabled: true
    }
  ],
  supported_languages: [
    { code: 'en', name: 'English' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-Hant', name: 'Chinese (Traditional)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'it', name: 'Italian' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' }
  ],
  default_source_lang: 'auto',
  default_target_lang: 'en',
  max_text_length: 10000,
  cache_ttl: 86400000, // 24小时
  retry_attempts: 2,
  retry_delay: 1000
};

// 缓存管理
const translationCache = new Map();
const MAX_CACHE_SIZE = 500;

// 语言代码映射（用于不同服务间的兼容性）
const languageCodeMap = {
  'zh-Hans': 'zh',
  'zh-CN': 'zh',
  'zh-TW': 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'en-US': 'en',
  'en-GB': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'ru-RU': 'ru',
  'it-IT': 'it',
  'nl-NL': 'nl',
  'pl-PL': 'pl',
  'tr-TR': 'tr',
  'ar-SA': 'ar',
  'hi-IN': 'hi',
  'th-TH': 'th',
  'vi-VN': 'vi'
};

// 日志记录
function logTranslationEvent(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    level,
    timestamp,
    message,
    details
  };
  console.log(`[translation_engine] ${JSON.stringify(logMessage)}`);
}

// 验证文本长度
function validateTextLength(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }
  
  if (text.length > TRANSLATION_CONFIG.max_text_length) {
    throw new Error(
      `Text too long. Maximum length is ${TRANSLATION_CONFIG.max_text_length} characters. ` +
      `Current length: ${text.length} characters.`
    );
  }
  
  return true;
}

// 验证目标语言
function validateTargetLanguage(targetLang) {
  if (!targetLang || typeof targetLang !== 'string') {
    throw new Error('Target language must be a non-empty string');
  }
  
  // 规范化语言代码
  const normalizedLang = languageCodeMap[targetLang] || targetLang;
  
  // 检查是否支持
  const isSupported = TRANSLATION_CONFIG.supported_languages.some(
    lang => lang.code === normalizedLang
  );
  
  if (!isSupported) {
    throw new Error(
      `Unsupported target language: ${targetLang}. ` +
      `Supported languages: ${TRANSLATION_CONFIG.supported_languages.map(lang => lang.code).join(', ')}`
    );
  }
  
  return normalizedLang;
}

// 生成缓存键
function generateCacheKey(text, targetLang, sourceLang = 'auto') {
  return `${sourceLang}:${targetLang}:${text.substring(0, 100)}:${text.length}:${hashString(text)}`;
}

// 简单的字符串哈希函数
function hashString(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return hash.toString(36);
}

// 获取缓存
function getFromCache(cacheKey) {
  const cachedItem = translationCache.get(cacheKey);
  
  if (cachedItem) {
    const now = Date.now();
    if (now - cachedItem.timestamp > TRANSLATION_CONFIG.cache_ttl) {
      // 缓存已过期
      translationCache.delete(cacheKey);
      return null;
    }
    
    return cachedItem.data;
  }
  
  return null;
}

// 设置缓存
function setToCache(cacheKey, data) {
  // 限制缓存大小
  if (translationCache.size >= MAX_CACHE_SIZE) {
    // 删除最旧的缓存项
    const oldestKey = translationCache.keys().next().value;
    translationCache.delete(oldestKey);
  }
  
  translationCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

// 清理过期缓存
function cleanupCache() {
  const now = Date.now();
  let deleted = 0;
  
  for (const [key, item] of translationCache.entries()) {
    if (now - item.timestamp > TRANSLATION_CONFIG.cache_ttl) {
      translationCache.delete(key);
      deleted++;
    }
  }
  
  if (deleted > 0) {
    logTranslationEvent('info', `Cleaned up ${deleted} expired cache entries`);
  }
}

// 定期清理缓存
setInterval(cleanupCache, 3600000); // 每小时清理一次

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 带重试机制的API调用
async function callWithRetry(fn, retries = TRANSLATION_CONFIG.retry_attempts, delayMs = TRANSLATION_CONFIG.retry_delay) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      logTranslationEvent('warn', `Retrying after error: ${error.message}`, { retriesLeft: retries - 1 });
      await delay(delayMs);
      return callWithRetry(fn, retries - 1, delayMs * 2); // 指数退避
    }
    throw error;
  }
}

// 使用DeepSeek进行翻译
async function translateWithDeepSeek(text, targetLang, sourceLang = 'auto') {
  const config = TRANSLATION_CONFIG.services.find(s => s.name === 'deepseek');
  
  if (!config || !config.enabled || !config.key || config.key === 'placeholder') {
    throw new Error('DeepSeek translation service not properly configured');
  }
  
  try {
    // 准备提示词
    const prompt = sourceLang === 'auto' 
      ? `Translate the following text to ${targetLang}. Keep the original meaning and formatting.\n\n${text}`
      : `Translate the following ${sourceLang} text to ${targetLang}. Keep the original meaning and formatting.\n\n${text}`;
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given text accurately while preserving the original meaning and formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        top_p: 1.0
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid DeepSeek API response format');
    }
    
    return {
      result_text: data.choices[0].message.content.trim(),
      model: 'deepseek-chat',
      confidence: 0.9 // 估计的置信度
    };
  } catch (error) {
    logTranslationEvent('error', 'DeepSeek translation failed', { error: error.message });
    throw error;
  }
}

// 使用OpenAI进行翻译
async function translateWithOpenAI(text, targetLang, sourceLang = 'auto') {
  const config = TRANSLATION_CONFIG.services.find(s => s.name === 'openai');
  
  if (!config || !config.enabled || !config.key || config.key === 'placeholder') {
    throw new Error('OpenAI translation service not properly configured');
  }
  
  try {
    // 准备提示词
    const prompt = sourceLang === 'auto' 
      ? `Translate the following text to ${targetLang}. Keep the original meaning and formatting.\n\n${text}`
      : `Translate the following ${sourceLang} text to ${targetLang}. Keep the original meaning and formatting.\n\n${text}`;
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given text accurately while preserving the original meaning and formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        top_p: 1.0
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI API response format');
    }
    
    return {
      result_text: data.choices[0].message.content.trim(),
      model: 'gpt-3.5-turbo',
      confidence: 0.92 // 估计的置信度
    };
  } catch (error) {
    logTranslationEvent('error', 'OpenAI translation failed', { error: error.message });
    throw error;
  }
}

// 使用Gemini进行翻译
async function translateWithGemini(text, targetLang, sourceLang = 'auto') {
  const config = TRANSLATION_CONFIG.services.find(s => s.name === 'gemini');
  
  if (!config || !config.enabled || !config.key || config.key === 'placeholder') {
    throw new Error('Gemini translation service not properly configured');
  }
  
  try {
    // 准备提示词
    const prompt = sourceLang === 'auto' 
      ? `Translate the following text to ${targetLang}. Keep the original meaning and formatting.\n\n${text}`
      : `Translate the following ${sourceLang} text to ${targetLang}. Keep the original meaning and formatting.\n\n${text}`;
    
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
          temperature: 0.1,
          maxOutputTokens: 2000
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || 
        !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Invalid Gemini API response format');
    }
    
    return {
      result_text: data.candidates[0].content.parts[0].text.trim(),
      model: 'gemini-pro',
      confidence: 0.91 // 估计的置信度
    };
  } catch (error) {
    logTranslationEvent('error', 'Gemini translation failed', { error: error.message });
    throw error;
  }
}

// 使用Relay服务进行翻译（备用）
async function translateWithRelay(text, targetLang, sourceLang = 'auto') {
  const config = TRANSLATION_CONFIG.services.find(s => s.name === 'relay');
  
  if (!config || !config.enabled) {
    throw new Error('Relay translation service not configured');
  }
  
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        target_lang: targetLang,
        source_lang: sourceLang
      })
    });
    
    if (!response.ok) {
      throw new Error(`Relay translation error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      result_text: data.result_text || '',
      model: 'relay',
      confidence: data.confidence || 0.8,
      detected_source_lang: data.source_lang
    };
  } catch (error) {
    logTranslationEvent('error', 'Relay translation failed', { error: error.message });
    throw error;
  }
}

// 自动检测语言（简化版）
async function detectLanguage(text) {
  // 这里可以实现更复杂的语言检测逻辑
  // 目前返回'en'作为默认值
  return 'en';
}

// 主翻译函数
async function translate(text, targetLang, options = {}) {
  try {
    // 验证输入
    validateTextLength(text);
    const normalizedTargetLang = validateTargetLanguage(targetLang);
    
    // 从选项中获取源语言，默认为'auto'
    const sourceLang = options.source_lang || TRANSLATION_CONFIG.default_source_lang;
    
    // 检查是否需要翻译（相同语言）
    if (sourceLang !== 'auto' && sourceLang === normalizedTargetLang) {
      return {
        success: true,
        source_lang: sourceLang,
        target_lang: normalizedTargetLang,
        result_text: text,
        confidence: 1.0,
        from_cache: false,
        message: 'No translation needed (same language)'
      };
    }
    
    // 检查缓存
    const cacheKey = generateCacheKey(text, normalizedTargetLang, sourceLang);
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      logTranslationEvent('info', 'Translation served from cache');
      return {
        ...cachedResult,
        from_cache: true
      };
    }
    
    // 准备翻译服务列表
    const translationServices = [
      { service: translateWithDeepSeek },
      { service: translateWithOpenAI },
      { service: translateWithGemini },
      { service: translateWithRelay }
    ];
    
    // 按优先级排序服务
    translationServices.sort((a, b) => {
      const aService = TRANSLATION_CONFIG.services.find(s => 
        s.name === a.service.name || s.name === a.service.toString().match(/translateWith(\w+)/)[1].toLowerCase()
      );
      const bService = TRANSLATION_CONFIG.services.find(s => 
        s.name === b.service.name || s.name === b.service.toString().match(/translateWith(\w+)/)[1].toLowerCase()
      );
      
      return (aService?.priority || 999) - (bService?.priority || 999);
    });
    
    // 尝试使用各个翻译服务
    let translationResult = null;
    let usedService = null;
    let detectedSourceLang = sourceLang;
    
    for (const { service } of translationServices) {
      try {
        logTranslationEvent('info', `Trying translation service: ${service.name || service.toString().match(/translateWith(\w+)/)[1]}`);
        
        // 调用翻译服务（带重试机制）
        const result = await callWithRetry(() => 
          service(text, normalizedTargetLang, sourceLang)
        );
        
        if (result.result_text && result.result_text.length > 0) {
          translationResult = result;
          usedService = service.name || service.toString().match(/translateWith(\w+)/)[1];
          
          // 如果检测到源语言，更新detectedSourceLang
          if (result.detected_source_lang) {
            detectedSourceLang = result.detected_source_lang;
          }
          
          break;
        }
      } catch (error) {
        logTranslationEvent('warn', `Translation service failed, trying next: ${error.message}`);
        // 继续尝试下一个服务
        continue;
      }
    }
    
    // 如果所有服务都失败
    if (!translationResult) {
      throw new Error('All translation services failed');
    }
    
    // 如果源语言是'auto'且没有检测到，尝试检测
    if (sourceLang === 'auto' && detectedSourceLang === 'auto') {
      try {
        detectedSourceLang = await detectLanguage(text);
      } catch (error) {
        logTranslationEvent('warn', 'Language detection failed, using default', { error: error.message });
        detectedSourceLang = 'unknown';
      }
    }
    
    // 构建最终结果
    const finalResult = {
      success: true,
      source_lang: detectedSourceLang,
      target_lang: normalizedTargetLang,
      result_text: translationResult.result_text,
      confidence: translationResult.confidence,
      service: usedService,
      model: translationResult.model,
      timestamp: Date.now()
    };
    
    // 缓存结果
    setToCache(cacheKey, finalResult);
    
    logTranslationEvent('info', 'Translation completed successfully', {
      service: usedService,
      sourceLang: detectedSourceLang,
      targetLang: normalizedTargetLang
    });
    
    // 返回符合规范的结果
    return {
      source_lang: finalResult.source_lang,
      target_lang: finalResult.target_lang,
      result_text: finalResult.result_text,
      confidence: finalResult.confidence
    };
  } catch (error) {
    logTranslationEvent('error', 'Translation failed', { error: error.message });
    throw new Error(`Translation failed: ${error.message}`);
  }
}

// 批量翻译
async function batchTranslate(texts, targetLang, options = {}) {
  if (!Array.isArray(texts)) {
    throw new Error('Texts must be an array');
  }
  
  if (texts.length === 0) {
    return [];
  }
  
  const results = await Promise.allSettled(
    texts.map(text => translate(text, targetLang, options))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        source_lang: 'unknown',
        target_lang: targetLang,
        result_text: '',
        confidence: 0,
        error: result.reason.message || 'Translation failed'
      };
    }
  });
}

// 获取支持的语言列表
function getSupportedLanguages() {
  return TRANSLATION_CONFIG.supported_languages;
}

// 获取服务状态
async function getServiceStatus() {
  const statuses = [];
  
  for (const service of TRANSLATION_CONFIG.services) {
    try {
      // 简单的健康检查
      const isConfigured = service.key && service.key !== 'placeholder';
      
      statuses.push({
        name: service.name,
        status: service.enabled && isConfigured ? 'available' : 'unavailable',
        priority: service.priority,
        configured: isConfigured
      });
    } catch (error) {
      statuses.push({
        name: service.name,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return statuses;
}

// 健康检查
async function healthCheck() {
  try {
    const serviceStatuses = await getServiceStatus();
    const availableServices = serviceStatuses.filter(s => s.status === 'available').length;
    
    return {
      status: availableServices > 0 ? 'healthy' : 'degraded',
      available_services: availableServices,
      total_services: TRANSLATION_CONFIG.services.length,
      supported_languages: TRANSLATION_CONFIG.supported_languages.length,
      cache_size: translationCache.size,
      max_cache_size: MAX_CACHE_SIZE,
      timestamp: Date.now()
    };
  } catch (error) {
    logTranslationEvent('error', 'Health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// 清理所有缓存
function clearCache() {
  translationCache.clear();
  logTranslationEvent('info', 'Translation cache cleared');
}

// 模块导出
module.exports = {
  translate,
  batchTranslate,
  getSupportedLanguages,
  getServiceStatus,
  healthCheck,
  clearCache,
  TRANSLATION_CONFIG
};

// 导出为ES模块
exports.default = {
  translate,
  batchTranslate,
  getSupportedLanguages,
  getServiceStatus,
  healthCheck,
  clearCache,
  TRANSLATION_CONFIG
};
