// 语言识别服务

// 语言配置
export const LANGUAGE_CONFIG = {
  zh: { name: '中文', script: 'Han', emoji: '🌍 中文' },
  en: { name: 'English', script: 'Latin', emoji: '🌍 EN' },
  ar: { name: 'Arabic', script: 'Arabic', emoji: '🌍 AR' },
  ru: { name: 'Russian', script: 'Cyrillic', emoji: '🌍 RU' },
  hi: { name: 'Hindi', script: 'Devanagari', emoji: '🌍 HI' },
  vi: { name: 'Vietnamese', script: 'Latin', emoji: '🌍 VI' },
  fr: { name: 'French', script: 'Latin', emoji: '🌍 FR' },
  de: { name: 'German', script: 'Latin', emoji: '🌍 DE' },
  es: { name: 'Spanish', script: 'Latin', emoji: '🌍 ES' },
  pt: { name: 'Portuguese', script: 'Latin', emoji: '🌍 PT' }
};

export type SupportedLanguage = keyof typeof LANGUAGE_CONFIG;

export interface LanguageDetectionResult {
  language: string;
  country?: string;
  confidence: number;
}

export interface CustomerLanguageProfile {
  customer_id: string;
  lang: SupportedLanguage;
  confidence: number; // 0 ~ 1
  source: 'auto' | 'manual';
  updated_at: number;
}

// 检查文本是否有效（非空、非纯数字、非URL）
function isValidText(text: string): boolean {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return false;
  }
  
  // 检查是否为纯数字
  if (/^\d+$/.test(text.trim())) {
    return false;
  }
  
  // 检查是否为URL
  const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  if (urlRegex.test(text.trim())) {
    return false;
  }
  
  return true;
}

// 方法1：使用浏览器原生Intl.Segmenter检测语言
function detectLanguageUsingSegmenter(text: string): { lang: SupportedLanguage; confidence: number } {
  try {
    // 检查是否支持Intl.Segmenter
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      // 创建中文分词器
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
      const segments = segmenter.segment(text);
      
      let hanCount = 0;
      let arabicCount = 0;
      let cyrillicCount = 0;
      let devanagariCount = 0;
      let totalChars = 0;
      
      // 遍历所有字符，统计不同脚本的字符数
      for (const segment of segments) {
        const char = segment.segment;
        const script = char.codePointAt(0)?.toString(16);
        if (!script) continue;
        
        totalChars++;
        
        // 检查字符所属的Unicode脚本范围
        const codePoint = parseInt(script, 16);
        
        // Han (中文)
        if ((codePoint >= 0x4E00 && codePoint <= 0x9FFF) ||
            (codePoint >= 0x3400 && codePoint <= 0x4DBF) ||
            (codePoint >= 0x20000 && codePoint <= 0x2A6DF) ||
            (codePoint >= 0x2A700 && codePoint <= 0x2B73F) ||
            (codePoint >= 0x2B740 && codePoint <= 0x2B81F) ||
            (codePoint >= 0x2B820 && codePoint <= 0x2CEAF) ||
            (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
            (codePoint >= 0x2F800 && codePoint <= 0x2FA1F)) {
          hanCount++;
        }
        // Arabic
        else if (codePoint >= 0x0600 && codePoint <= 0x06FF) {
          arabicCount++;
        }
        // Cyrillic
        else if (codePoint >= 0x0400 && codePoint <= 0x04FF) {
          cyrillicCount++;
        }
        // Devanagari (Hindi)
        else if (codePoint >= 0x0900 && codePoint <= 0x097F) {
          devanagariCount++;
        }
      }
      
      // 计算各脚本的占比
      const hanRatio = hanCount / totalChars;
      const arabicRatio = arabicCount / totalChars;
      const cyrillicRatio = cyrillicCount / totalChars;
      const devanagariRatio = devanagariCount / totalChars;
      
      // 判断主要语言
      if (hanRatio > 0.5) {
        return { lang: 'zh', confidence: Math.min(1, hanRatio) };
      } else if (arabicRatio > 0.5) {
        return { lang: 'ar', confidence: Math.min(1, arabicRatio) };
      } else if (cyrillicRatio > 0.5) {
        return { lang: 'ru', confidence: Math.min(1, cyrillicRatio) };
      } else if (devanagariRatio > 0.5) {
        return { lang: 'hi', confidence: Math.min(1, devanagariRatio) };
      } else {
        // 默认返回英语
        return { lang: 'en', confidence: 0.5 };
      }
    }
  } catch (error) {
    console.error('Error in segmenter-based language detection:', error);
  }
  
  // 回退到文本规则检测
  return detectLanguageUsingTextRules(text);
}

// 方法2：使用轻量文本规则检测语言
function detectLanguageUsingTextRules(text: string): { lang: SupportedLanguage; confidence: number } {
  // 检查是否包含中文字符
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return { lang: 'zh', confidence: 0.8 };
  }
  
  // 检查是否包含阿拉伯字符
  if (/[\u0600-\u06FF]/.test(text)) {
    return { lang: 'ar', confidence: 0.8 };
  }
  
  // 检查是否包含印地语字符
  if (/[\u0900-\u097F]/.test(text)) {
    return { lang: 'hi', confidence: 0.8 };
  }
  
  // 检查是否包含俄语字符
  if (/[\u0400-\u04FF]/.test(text)) {
    return { lang: 'ru', confidence: 0.8 };
  }
  
  // 默认返回英语
  return { lang: 'en', confidence: 0.6 };
}

// 检测文本语言
function detectLanguage(text: string): { lang: SupportedLanguage; confidence: number } {
  if (!isValidText(text)) {
    return { lang: 'en', confidence: 0.0 };
  }
  
  // 首先尝试使用浏览器原生Segmenter检测
  const segmenterResult = detectLanguageUsingSegmenter(text);
  
  // 如果置信度较高，直接返回
  if (segmenterResult.confidence > 0.7) {
    return segmenterResult;
  }
  
  // 否则使用文本规则检测
  return detectLanguageUsingTextRules(text);
}

// 从本地存储加载语言配置
function loadLanguageProfileFromStorage(customerId: string): CustomerLanguageProfile | undefined {
  try {
    const key = `chat_customer_lang:${customerId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as CustomerLanguageProfile;
    }
  } catch (error) {
    console.error('Failed to load language profile from storage:', error);
  }
  return undefined;
}

// 保存语言配置到本地存储
function saveLanguageProfileToStorage(customerId: string, profile: CustomerLanguageProfile): void {
  try {
    const key = `chat_customer_lang:${customerId}`;
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save language profile to storage:', error);
  }
}

// 检测语言并推断国家
export async function detectLanguageAndCountry(text: string): Promise<LanguageDetectionResult> {
  const detection = detectLanguage(text);
  
  // 简单的语言到国家映射示例
  const languageToCountry: Record<string, string[]> = {
    en: ['US', 'GB', 'IN', 'AU'],
    pt: ['BR', 'PT'],
    es: ['ES', 'MX', 'CO'],
    fr: ['FR', 'CA'],
    de: ['DE'],
    ru: ['RU'],
    ar: ['AE', 'EG', 'SA'],
    hi: ['IN'],
    vi: ['VN'],
    zh: ['CN', 'TW', 'HK']
  };
  
  // 默认国家选择
  const countries = languageToCountry[detection.lang] || [];
  const country = countries.length > 0 ? countries[0] : undefined;
  
  return {
    language: detection.lang,
    country,
    confidence: detection.confidence
  };
}

// 获取客户语言配置
export function getCustomerLanguageProfile(customerId: string): CustomerLanguageProfile | undefined {
  return loadLanguageProfileFromStorage(customerId);
}

// 设置客户语言配置（手动设置）
export function setCustomerLanguageProfile(customerId: string, lang: SupportedLanguage): void {
  const profile: CustomerLanguageProfile = {
    customer_id: customerId,
    lang,
    confidence: 1.0,
    source: 'manual',
    updated_at: Date.now()
  };
  
  saveLanguageProfileToStorage(customerId, profile);
}

// 从客户消息中检测语言并更新配置
export function detectAndUpdateCustomerLanguage(customerId: string, messages: Array<{ text: string; role?: string; sender?: string; direction?: string }>): void {
  // 检查是否已经有手动设置的语言配置
  const existingProfile = loadLanguageProfileFromStorage(customerId);
  if (existingProfile && existingProfile.source === 'manual') {
    return; // 手动设置的语言不被自动更新覆盖
  }
  
  // 过滤出客户发送的有效消息
  const customerMessages = messages.filter(msg => {
    // 判断是否为客户消息
    const isCustomer = msg.role === 'customer' || 
                      msg.sender === 'customer' || 
                      msg.direction === 'inbound';
    
    return isCustomer && isValidText(msg.text);
  });
  
  // 只使用最近的5条消息
  const recentMessages = customerMessages.slice(-5);
  
  if (recentMessages.length === 0) {
    return; // 没有有效消息，不更新
  }
  
  // 合并所有消息文本
  const combinedText = recentMessages.map(msg => msg.text).join(' ');
  
  // 检测语言
  const detectionResult = detectLanguage(combinedText);
  
  // 只有当置信度大于0.5时才更新
  if (detectionResult.confidence > 0.5) {
    const profile: CustomerLanguageProfile = {
      customer_id: customerId,
      lang: detectionResult.lang,
      confidence: detectionResult.confidence,
      source: 'auto',
      updated_at: Date.now()
    };
    
    saveLanguageProfileToStorage(customerId, profile);
  }
}

// 获取语言的显示信息
export function getLanguageDisplayInfo(lang: SupportedLanguage): { name: string; emoji: string } {
  return {
    name: LANGUAGE_CONFIG[lang]?.name || 'Unknown',
    emoji: LANGUAGE_CONFIG[lang]?.emoji || '🌍 ?'
  };
}

