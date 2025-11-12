// JEV Cloud Relay v11.0 - Translator Module
// DeepSeek接口 + 多语种翻译模块

const https = require('https');
const fs = require('fs');
const path = require('path');

class RelayTranslator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.supportedLanguages = config.supported_languages || ['en', 'zh', 'vi', 'bn', 'ur', 'hi', 'id', 'ar', 'es', 'pt', 'fr', 'th', 'tr', 'de', 'ja', 'ko', 'ru'];
    this.translationLogPath = config.translation_log_path || './relay_translation_log.txt';
    this.cache = new Map(); // 简单的翻译缓存
  }

  async translate(text, targetLang, sourceLang = null) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('无效的文本输入');
      }

      // 验证目标语言
      if (!this.supportedLanguages.includes(targetLang)) {
        throw new Error(`不支持的目标语言: ${targetLang}`);
      }

      // 检查缓存
      const cacheKey = `${text}_${sourceLang || 'auto'}_${targetLang}`;
      if (this.cache.has(cacheKey)) {
        this.logger.logRelay(`使用缓存翻译: ${sourceLang || 'auto'} → ${targetLang}`);
        return this.cache.get(cacheKey);
      }

      // 调用DeepSeek翻译API
      const result = await this.callDeepSeekTranslate(text, targetLang, sourceLang);
      
      // 缓存结果
      this.cache.set(cacheKey, result);
      this.limitCacheSize();
      
      // 记录翻译日志
      this.logTranslation(text, result, targetLang, sourceLang);
      
      return result;
    } catch (error) {
      this.logger.logError('翻译错误:', error);
      return {
        text: text,
        translated_text: text, // 失败时返回原文
        source_lang: sourceLang || 'unknown',
        target_lang: targetLang,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async callDeepSeekTranslate(text, targetLang, sourceLang = null) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        text: text,
        target_language: targetLang,
        source_language: sourceLang || 'auto'
      });

      const options = {
        hostname: 'api.deepseek.com',
        path: '/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.deepseek_api_key}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.translated_text) {
              resolve({
                text: text,
                translated_text: response.translated_text,
                source_lang: response.source_language || sourceLang || 'auto',
                target_lang: targetLang,
                confidence: response.confidence || 'high',
                timestamp: new Date().toISOString()
              });
            } else {
              reject(new Error(`API错误: ${response.error || '未知错误'}`));
            }
          } catch (error) {
            reject(new Error('解析API响应失败'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  limitCacheSize(maxSize = 1000) {
    if (this.cache.size > maxSize) {
      // 删除最旧的缓存项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  logTranslation(originalText, result, targetLang, sourceLang) {
    try {
      const logEntry = {
        original_text: originalText,
        translated_text: result.translated_text,
        source_language: sourceLang || 'auto',
        target_language: targetLang,
        timestamp: new Date().toISOString(),
        success: !result.error
      };

      fs.appendFileSync(
        this.translationLogPath,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
    } catch (error) {
      this.logger.logError('记录翻译日志失败:', error);
    }
  }

  // 批量翻译
  async batchTranslate(texts, targetLang, sourceLang = null) {
    if (!Array.isArray(texts)) {
      throw new Error('输入必须是文本数组');
    }

    const translations = await Promise.all(
      texts.map(text => this.translate(text, targetLang, sourceLang))
    );

    return {
      translations: translations,
      total: translations.length,
      target_language: targetLang,
      source_language: sourceLang || 'auto',
      timestamp: new Date().toISOString()
    };
  }

  // 检测语言（如果DeepSeek API支持）
  async detectLanguage(text) {
    try {
      // 调用翻译API自动检测语言
      const result = await this.translate(text, 'en'); // 翻译成英语以触发语言检测
      return {
        language: result.source_lang,
        confidence: 'medium',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.logError('语言检测错误:', error);
      return {
        language: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 双向翻译（用于确认翻译质量）
  async bidirectionalTranslate(text, language1, language2) {
    try {
      const firstTranslation = await this.translate(text, language2, language1);
      const backTranslation = await this.translate(firstTranslation.translated_text, language1, language2);

      return {
        original_text: text,
        first_translation: firstTranslation,
        back_translation: backTranslation,
        similarity: this.calculateSimilarity(text, backTranslation.translated_text),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.logError('双向翻译错误:', error);
      throw error;
    }
  }

  calculateSimilarity(text1, text2) {
    // 简单的相似度计算
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return totalWords > 0 ? ((commonWords.length / totalWords) * 100).toFixed(2) + '%' : '0%';
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
    this.logger.logSystem('翻译缓存已清除');
  }

  // 获取支持的语言列表
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // 检查语言是否支持
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }
}

module.exports = RelayTranslator;