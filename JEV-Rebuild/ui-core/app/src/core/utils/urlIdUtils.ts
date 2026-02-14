/**
 * URL 和 ID 处理工具函数
 * L9.6 架构：防止二次拼接和 ID 污染
 */

/**
 * 清洗 ID，只允许纯 ID 格式
 * @param input 输入字符串
 * @returns 清洗后的 ID
 */
export function normalizeId(input: string): string {
  if (!input) return "";
  
  // 如果 input 含 http:// 或 https://，只提取最后一个 MM... 或 SM... 段作为 id
  if (input.includes('http://') || input.includes('https://')) {
    const match = input.match(/(MM|SM)[a-zA-Z0-9]{10,}/g);
    if (match && match.length > 0) {
      return match[match.length - 1];
    }
    return "";
  }
  
  // 如果 input 含 /api/，从 path 中提取 MM... 或 SM...
  if (input.includes('/api/')) {
    const match = input.match(/(MM|SM)[a-zA-Z0-9]{10,}/g);
    if (match && match.length > 0) {
      return match[match.length - 1];
    }
    return "";
  }
  
  // 检查是否符合 ID 格式
  const idMatch = input.match(/^(MM|SM)[a-zA-Z0-9]{10,}$/i);
  if (idMatch) {
    return input;
  }
  
  // 尝试提取 ID 部分
  const extractMatch = input.match(/(MM|SM)[a-zA-Z0-9]{10,}/);
  if (extractMatch) {
    return extractMatch[0];
  }
  
  return "";
}

/**
 * 构建 Worker URL，防止重复拼接
 * @param baseUrl 基础 URL
 * @param pathOrUrl 路径或完整 URL
 * @returns 构建后的 URL
 */
export function buildWorkerUrl(baseUrl: string, pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  
  // 如果 pathOrUrl 已经是 https:// 开头，直接返回它
  if (pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  
  // 如果是 http:// 开头，转换为 https://
  if (pathOrUrl.startsWith('http://')) {
    return pathOrUrl.replace('http://', 'https://');
  }
  
  // 如果是 /api/... 相对路径，使用 baseUrl 构建
  if (pathOrUrl.startsWith('/api/')) {
    try {
      return new URL(pathOrUrl, baseUrl).toString();
    } catch (error) {
      console.error('[URL_BUILD_ERROR] Failed to build URL:', error);
      return baseUrl + pathOrUrl;
    }
  }
  
  // 如果是 api/... 无前导斜杠，补 /
  if (pathOrUrl.startsWith('api/')) {
    try {
      return new URL('/' + pathOrUrl, baseUrl).toString();
    } catch (error) {
      console.error('[URL_BUILD_ERROR] Failed to build URL:', error);
      return baseUrl + '/' + pathOrUrl;
    }
  }
  
  // 其他情况，直接使用 pathOrUrl
  return pathOrUrl;
}

/**
 * 检查是否为有效的 ID
 * @param id 要检查的 ID
 * @returns 是否有效
 */
export function isValidId(id: string): boolean {
  if (!id) return false;
  return /^(MM|SM)[a-zA-Z0-9]{10,}$/i.test(id);
}

/**
 * 清理 URL 中的 ID 参数
 * @param url 原始 URL
 * @returns 清理后的 URL
 */
export function cleanUrlIdParam(url: string): string {
  if (!url) return "";
  
  try {
    const parsedUrl = new URL(url);
    const messageId = parsedUrl.searchParams.get('message_id');
    
    if (messageId) {
      const cleanId = normalizeId(messageId);
      if (cleanId) {
        parsedUrl.searchParams.set('message_id', cleanId);
      } else {
        parsedUrl.searchParams.delete('message_id');
      }
    }
    
    return parsedUrl.toString();
  } catch (error) {
    console.error('[URL_CLEAN_ERROR] Failed to clean URL:', error);
    return url;
  }
}
