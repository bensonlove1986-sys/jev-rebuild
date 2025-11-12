// JEV AI Commerce Autopilot v13.5 - Customer Profiler
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, 'autopilot_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 客户画像模块
class CustomerProfiler {
  constructor() {
    this.regionKeywords = this.initializeRegionKeywords();
    this.budgetIndicators = this.initializeBudgetIndicators();
    this.sentimentLexicon = this.initializeSentimentLexicon();
  }

  // 初始化地区关键词
  initializeRegionKeywords() {
    return {
      'North America': ['USA', 'US', 'America', 'United States', 'Canada', 'Mexico'],
      'Europe': ['UK', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium'],
      'Asia': ['China', 'India', 'Japan', 'Korea', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam'],
      'Middle East': ['UAE', 'Dubai', 'Saudi Arabia', 'Qatar', 'Kuwait'],
      'Africa': ['Nigeria', 'Egypt', 'South Africa', 'Kenya', 'Ghana'],
      'South America': ['Brazil', 'Argentina', 'Colombia', 'Peru', 'Chile']
    };
  }

  // 初始化预算指标
  initializeBudgetIndicators() {
    return {
      'high': ['premium', 'best quality', 'top', 'luxury', 'expensive', 'high end'],
      'medium': ['affordable', 'reasonable price', 'good value', 'competitive', 'standard'],
      'low': ['cheap', 'budget', 'economy', 'low cost', 'affordable price']
    };
  }

  // 初始化情感词典
  initializeSentimentLexicon() {
    return {
      'positive': ['good', 'excellent', 'great', 'wonderful', 'amazing', 'happy', 'satisfied'],
      'negative': ['bad', 'terrible', 'poor', 'disappointed', 'unhappy', 'worried', 'concerned'],
      'neutral': ['okay', 'alright', 'fine', 'average', 'standard', 'normal']
    };
  }

  // 生成客户画像
  profileCustomer(chatLog) {
    return {
      region: this.detectRegion(chatLog),
      budget: this.estimateBudget(chatLog),
      product_interest: this.extractKeywords(chatLog),
      sentiment: this.analyzeTone(chatLog),
      language: this.detectLanguage(chatLog),
      communication_style: this.analyzeCommunicationStyle(chatLog),
      urgency_level: this.detectUrgency(chatLog),
      profile_quality: 'medium',
      last_updated: new Date().toISOString()
    };
  }

  // 检测客户地区
  detectRegion(text) {
    const lowerText = text.toLowerCase();
    
    for (const [region, keywords] of Object.entries(this.regionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return region;
        }
      }
    }
    
    return 'Unknown';
  }

  // 估计客户预算
  estimateBudget(text) {
    const lowerText = text.toLowerCase();
    
    // 高预算关键词检测
    for (const keyword of this.budgetIndicators.high) {
      if (lowerText.includes(keyword)) {
        return 'high';
      }
    }
    
    // 低预算关键词检测
    for (const keyword of this.budgetIndicators.low) {
      if (lowerText.includes(keyword)) {
        return 'low';
      }
    }
    
    // 中预算关键词检测
    for (const keyword of this.budgetIndicators.medium) {
      if (lowerText.includes(keyword)) {
        return 'medium';
      }
    }
    
    return 'unknown';
  }

  // 提取关键词
  extractKeywords(text) {
    // 模拟关键词提取
    const commonProducts = ['machinery', 'equipment', 'parts', 'tools', 'components', 'devices'];
    const keywords = [];
    
    const lowerText = text.toLowerCase();
    for (const product of commonProducts) {
      if (lowerText.includes(product)) {
        keywords.push(product);
      }
    }
    
    // 提取价格相关关键词
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('quote')) {
      keywords.push('pricing');
    }
    
    // 提取质量相关关键词
    if (lowerText.includes('quality') || lowerText.includes('specification') || lowerText.includes('standard')) {
      keywords.push('quality');
    }
    
    return keywords.length > 0 ? keywords : ['general_inquiry'];
  }

  // 分析语气
  analyzeTone(text) {
    const lowerText = text.toLowerCase();
    let sentimentScores = { positive: 0, negative: 0, neutral: 0 };
    
    // 计算各类情感分数
    for (const word of this.sentimentLexicon.positive) {
      if (lowerText.includes(word)) sentimentScores.positive++;
    }
    
    for (const word of this.sentimentLexicon.negative) {
      if (lowerText.includes(word)) sentimentScores.negative++;
    }
    
    for (const word of this.sentimentLexicon.neutral) {
      if (lowerText.includes(word)) sentimentScores.neutral++;
    }
    
    // 确定主要情感
    const maxSentiment = Object.entries(sentimentScores)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    
    return maxSentiment;
  }

  // 检测语言
  detectLanguage(text) {
    // 简单的语言检测
    const langPatterns = {
      'en': /[a-zA-Z]{5,}/,
      'zh': /[\u4e00-\u9fa5]/,
      'es': /[a-zA-Záéíóúüñ¿¡]{5,}/,
      'fr': /[a-zA-Zéèêëàâäôöùûüç]{5,}/,
      'de': /[a-zA-Zäöüß]{5,}/,
      'pt': /[a-zA-Záéíóúãõç]{5,}/,
      'ru': /[а-яА-Я]{5,}/,
      'ja': /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/,
      'ko': /[\uac00-\ud7af]/
    };
    
    for (const [lang, pattern] of Object.entries(langPatterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }
    
    return 'en'; // 默认英语
  }

  // 分析沟通风格
  analyzeCommunicationStyle(text) {
    const messageLength = text.length;
    const questionCount = (text.match(/\?/g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    
    if (messageLength < 50) {
      return 'brief';
    } else if (messageLength > 200) {
      return 'detailed';
    }
    
    if (questionCount > 3) {
      return 'inquisitive';
    }
    
    if (exclamationCount > 2) {
      return 'enthusiastic';
    }
    
    return 'neutral';
  }

  // 检测紧急程度
  detectUrgency(text) {
    const urgencyWords = ['urgent', 'immediate', 'quick', 'fast', 'ASAP', 'hurry', 'quickly', 'soon'];
    const lowerText = text.toLowerCase();
    
    for (const word of urgencyWords) {
      if (lowerText.includes(word)) {
        return 'high';
      }
    }
    
    const timeWords = ['today', 'tomorrow', 'week', 'month'];
    let hasTimeReference = false;
    
    for (const word of timeWords) {
      if (lowerText.includes(word)) {
        hasTimeReference = true;
        break;
      }
    }
    
    return hasTimeReference ? 'medium' : 'low';
  }

  // 更新客户画像
  updateProfile(existingProfile, newText) {
    const newProfile = this.profileCustomer(newText);
    
    // 合并新的信息，保留旧信息的优先级
    return {
      ...existingProfile,
      ...newProfile,
      // 保留一些重要的历史信息
      initial_region: existingProfile.region || newProfile.region,
      profile_quality: this.calculateProfileQuality(existingProfile, newProfile),
      interaction_count: (existingProfile.interaction_count || 0) + 1
    };
  }

  // 计算画像质量
  calculateProfileQuality(existing, newData) {
    let qualityScore = 0;
    
    // 根据信息完整性评分
    if (newData.region !== 'Unknown') qualityScore += 20;
    if (newData.budget !== 'unknown') qualityScore += 20;
    if (newData.product_interest.length > 1) qualityScore += 20;
    if (newData.sentiment !== 'neutral') qualityScore += 10;
    
    const interactionCount = (existing.interaction_count || 0) + 1;
    if (interactionCount > 5) qualityScore += 30;
    else if (interactionCount > 2) qualityScore += 15;
    
    if (qualityScore >= 80) return 'high';
    else if (qualityScore >= 50) return 'medium';
    else return 'low';
  }
}

// 创建并导出分析器实例
const profiler = new CustomerProfiler();

// 导出关键函数
module.exports = {
  profileCustomer: profiler.profileCustomer.bind(profiler),
  detectRegion: profiler.detectRegion.bind(profiler),
  estimateBudget: profiler.estimateBudget.bind(profiler),
  extractKeywords: profiler.extractKeywords.bind(profiler),
  analyzeTone: profiler.analyzeTone.bind(profiler),
  updateProfile: profiler.updateProfile.bind(profiler)
};