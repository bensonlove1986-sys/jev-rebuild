// 翻译服务
// 翻译缓存，以 message_id + targetLang 为 key
const translationCache = new Map<string, any>();

// 正在翻译的消息，用于去重
const translatingMessages = new Set<string>();

// 导入 API_BASE_URL 和 safeFetch
import { API_BASE_URL } from '@/api/apiClient';
import { safeFetch } from '@/main';

/**
 * 通过 Worker 调用翻译服务
 * @param messageId 消息 ID
 * @param text 要翻译的文本
 * @param targetLang 目标语言
 * @param mode 模式：translate 或 answer
 * @param chatId 聊天 ID
 * @param languageOverride 是否覆盖语言
 * @returns 翻译后的文本
 */
async function callTranslateAPI(messageId: string, text: string, targetLang: string, mode: string = 'translate', chatId?: string, languageOverride: boolean = false): Promise<any> {
  try {
    // 使用线上Worker端点
    const response = await safeFetch("/api/translate", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_id: messageId,
        source_text: text,
        source_lang: 'auto',
        target_lang: targetLang,
        mode: mode,
        chat_id: chatId,
        language_override: languageOverride
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Translation API response:', data);
    
    // 处理商业发送模式的响应
    if (mode === 'business_send') {
      if (data.business_output) {
        console.log('Business send mode output:', data.business_output);
        return data.business_output;
      } else if (data.translated_text) {
        // 降级处理：当没有 business_output 时，使用 translated_text
        console.log('Business send mode fallback to translated_text:', data.translated_text);
        return {
          internal: {
            original: text,
            translation: data.translated_text
          },
          external: {
            send_text: data.translated_text
          }
        };
      }
    }
    
    // 确保获取到翻译结果
    let translatedText = data.translated_text || data.text || data.translatedText || '翻译结果为空';
    
    // 解析格式化输出，提取翻译部分
    if (translatedText.includes('【Translation｜TargetLanguage=')) {
      const translationMatch = translatedText.match(/【Translation｜TargetLanguage=.*?】\s*(.*)/s);
      if (translationMatch && translationMatch[1]) {
        translatedText = translationMatch[1].trim();
      }
    } else if (translatedText.includes('【Translation】')) {
      const translationMatch = translatedText.match(/【Translation】\s*(.*)/s);
      if (translationMatch && translationMatch[1]) {
        translatedText = translationMatch[1].trim();
      }
    }
    
    console.log('Extracted translated text:', translatedText);
    
    return translatedText;
  } catch (error) {
    console.error('Translation API call failed:', error);
    throw error;
  }
}

/**
 * 翻译消息
 * @param messageId 消息 ID
 * @param text 要翻译的文本
 * @param mode 翻译模式
 * @param targetLang 目标语言
 * @param chatId 聊天 ID
 * @param languageOverride 是否覆盖语言
 * @returns 翻译结果
 */
export async function translateMessage(
  messageId: string,
  text: string,
  mode: 'auto' | 'manual' | 'business_send',
  targetLang: string = 'en',
  chatId?: string,
  languageOverride: boolean = false
): Promise<any> {
  console.log('[TRANSLATE_SERVICE_DEBUG] translateMessage called:', {
    messageId,
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    mode,
    targetLang,
    chatId,
    languageOverride
  });
  
  // 使用 messageId + targetLang 作为缓存键
  const cacheKey = `${messageId}_${targetLang}`;
  
  // 检查缓存
  if (translationCache.has(cacheKey)) {
    const cachedResult = translationCache.get(cacheKey)!;
    console.log('[TRANSLATE_SERVICE_DEBUG] Returning cached result:', cachedResult);
    return cachedResult;
  }

  // 检查是否正在翻译
  if (translatingMessages.has(cacheKey)) {
    console.log('[TRANSLATE_SERVICE_DEBUG] Message is already being translated');
    // 等待翻译完成
    while (translatingMessages.has(cacheKey)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // 再次检查缓存
    if (translationCache.has(cacheKey)) {
      const cachedResult = translationCache.get(cacheKey)!;
      console.log('[TRANSLATE_SERVICE_DEBUG] Returning cached result after translation completed:', cachedResult);
      return cachedResult;
    }
  }

  // 标记为正在翻译
  translatingMessages.add(cacheKey);
  console.log('[TRANSLATE_SERVICE_DEBUG] Marked message as translating');
  console.log('[TRANSLATE_SERVICE_DEBUG] Cache key:', cacheKey);

  try {
    console.log('[TRANSLATE_SERVICE_DEBUG] Calling callTranslateAPI');
    const translatedResult = await callTranslateAPI(messageId, text, targetLang, mode === 'answer' ? 'answer' : mode === 'business_send' ? 'business_send' : 'translate', chatId, languageOverride);
    console.log('[TRANSLATE_SERVICE_DEBUG] callTranslateAPI returned:', translatedResult);
    
    let result;
    if (mode === 'business_send') {
      // 处理商业发送模式的结果
      if (typeof translatedResult === 'object' && translatedResult.internal && translatedResult.external) {
        // 直接使用返回的商业发送模式结果
        result = {
          target: targetLang,
          text: translatedResult.external.send_text,
          internal: translatedResult.internal,
          external: translatedResult.external,
          engine: 'deepseek',
          mode: 'business_send',
          status: 'done',
        };
      } else if (typeof translatedResult === 'object' && translatedResult.business_output) {
        // 处理后端返回的 business_output
        const businessOutput = translatedResult.business_output;
        result = {
          target: targetLang,
          text: businessOutput.external.send_text,
          internal: businessOutput.internal,
          external: businessOutput.external,
          engine: 'deepseek',
          mode: 'business_send',
          status: 'done',
        };
      } else {
        // 处理降级情况
        result = {
          target: targetLang,
          text: typeof translatedResult === 'string' ? translatedResult : '翻译失败',
          internal: {
            original: text,
            translation: typeof translatedResult === 'string' ? translatedResult : '翻译失败'
          },
          external: {
            send_text: typeof translatedResult === 'string' ? translatedResult : '翻译失败'
          },
          engine: 'deepseek',
          mode: 'business_send',
          status: 'done',
        };
      }
    } else {
      // 处理普通翻译结果
      result = {
        target: targetLang,
        text: translatedResult,
        engine: 'deepseek',
        mode: mode === 'answer' ? 'answer' : 'translate',
        status: 'done',
      };
    }

    // 缓存结果
    translationCache.set(cacheKey, result);
    console.log('[TRANSLATE_SERVICE_DEBUG] Cached translation result:', result);
    return result;
  } catch (error) {
    console.error('[TRANSLATE_SERVICE_DEBUG] Translation error:', error);
    const errorResult = {
      target: targetLang,
      text: '',
      engine: 'deepseek',
      mode: mode === 'answer' ? 'answer' : mode === 'business_send' ? 'business_send' : 'translate',
      status: 'error',
    };

    // 缓存错误结果
    translationCache.set(cacheKey, errorResult);
    console.log('[TRANSLATE_SERVICE_DEBUG] Cached error result:', errorResult);
    return errorResult;
  } finally {
    // 移除正在翻译标记
    translatingMessages.delete(cacheKey);
    console.log('[TRANSLATE_SERVICE_DEBUG] Removed translating mark');
  }
}

/**
 * 获取翻译结果
 * @param messageId 消息 ID
 * @returns 翻译结果，如果没有则返回 undefined
 */
export function getTranslation(messageId: string): any {
  return translationCache.get(messageId);
}

/**
 * 清除翻译缓存
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * 检查是否可以翻译
 * @param messageId 消息 ID
 * @returns 是否可以翻译
 */
export function canTranslate(messageId: string): boolean {
  return !translationCache.has(messageId) && !translatingMessages.has(messageId);
}
