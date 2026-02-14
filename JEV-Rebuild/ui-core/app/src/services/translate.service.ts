// 翻译服务
// 统一处理所有翻译请求，支持多语言、错误处理
import { fetchApi } from '../api/apiClient';

// 翻译请求参数
interface TranslateTextParams {
  text: string;
  from?: string;
  to: string;
}

// DeepSeek翻译API调用 - 通过Worker代理
async function deepSeekTranslateAPI(text: string, from: string, to: string): Promise<string> {
  // 使用Worker API进行翻译
  const response = await fetchApi('/api/translate/text', {
    method: 'POST',
    body: JSON.stringify({
      text,
      from: from === 'auto' ? undefined : from,
      to
    })
  });
  
  console.log('[TRANSLATE_FRONTEND_RESPONSE]', response);
  
  // 改进的响应处理逻辑，更健壮地处理各种响应格式
  let translatedText = '';
  
  // 首先检查response是否为字符串
  if (typeof response === 'string') {
    // 直接返回字符串响应
    translatedText = response;
  } 
  // 然后检查response是否为有效对象
  else if (typeof response === 'object' && response !== null) {
    // 处理多种可能的成功响应格式
    if (response.ok === true || response.success === true) {
      // 尝试从多种可能的字段中获取翻译结果
      translatedText = response.translated || 
                      response.translated_text || 
                      response.translatedText || 
                      response.text || 
                      response.data?.translated || 
                      response.data?.translated_text || 
                      response.data?.text || '';
    } else if (response.data && typeof response.data === 'string') {
      // 处理 { data: "translated text" } 格式
      translatedText = response.data;
    } else {
      // 未知的成功格式，尝试提取文本
      console.warn('[TRANSLATE_UNKNOWN_RESPONSE]', response);
      // 尝试将响应转换为字符串作为最后的手段
      translatedText = JSON.stringify(response);
    }
  }
  
  // 清理翻译结果，去除多余的引号和空格
  translatedText = translatedText.trim();
  
  // 放宽结果验证，允许翻译结果与原文相似或相同的情况
  // 只在翻译结果为空或明显无效时才返回错误
  if (translatedText) {
    return translatedText;
  } else {
    // 如果返回的是空结果，返回翻译失败提示
    throw new Error('Translation API returned empty response');
  }
}

// 翻译文本
export async function translateText(params: TranslateTextParams): Promise<string> {
  try {
    // 参数验证
    if (!params.text || !params.to) {
      throw new Error('Missing required translation parameters: text and to are required');
    }
    
    // 调用DeepSeek翻译API
    const translatedText = await deepSeekTranslateAPI(params.text, params.from || 'auto', params.to);
    
    return translatedText;
  } catch (error) {
    console.error('[TRANSLATE_ERROR]', error);
    // 返回友好的错误提示，而不是抛出错误导致页面跳转
    return '翻译失败，请稍后重试';
  }
}

// 翻译为中文
export async function translateToChinese(text: string, from?: string): Promise<string> {
  return translateText({
    text,
    from,
    to: 'zh'
  });
}

// 从中文翻译到其他语言
export async function translateFromChinese(text: string, to: string): Promise<string> {
  return translateText({
    text,
    from: 'zh',
    to
  });
}
