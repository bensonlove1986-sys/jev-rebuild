/**
 * MessageID 防污染模块
 * L9.6 架构：确保 message_id 格式正确
 */

/**
 * 清洗 message_id，去除污染部分
 * @param id 原始 message_id
 * @returns 清洗后的 message_id
 */
export function sanitizeMessageId(id: string): string {
  return cleanMessageId(id);
}

/**
 * 清理 message_id，防止 URL 污染
 * @param id 原始 message_id
 * @returns 清理后的 message_id
 */
export function cleanMessageId(id: string): string {
  if (!id) return id || "";
  if (id.includes("http")) {
    const m = id.match(/MM[a-zA-Z0-9]+|msg_local_[a-zA-Z0-9_]+/);
    return m ? m[0] : id;
  }
  return id;
}

/**
 * 检查 message_id 是否有效
 * @param id 要检查的 message_id
 * @returns 是否有效
 */
export function isValidMessageId(id: string): boolean {
  if (!id) return false;
  return /MM[a-zA-Z0-9]{30,}/.test(id);
}

/**
 * 提取 message_id 中的 MM 部分
 * @param id 原始字符串
 * @returns 提取的 MM 部分
 */
export function extractMessageId(id: string): string {
  if (!id) return "";
  const match = id.match(/MM[a-f0-9]+/i);
  return match ? match[0] : id;
}

/**
 * 清理 URL 中的 message_id 参数
 * @param url 原始 URL
 * @returns 清理后的 URL
 */
export function cleanUrlMessageId(url: string): string {
  if (!url) return "";
  
  try {
    const parsedUrl = new URL(url);
    const messageId = parsedUrl.searchParams.get('message_id');
    
    if (messageId) {
      const cleanId = sanitizeMessageId(messageId);
      parsedUrl.searchParams.set('message_id', cleanId);
      return parsedUrl.toString();
    }
    
    return url;
  } catch (error) {
    console.error('[ID_SANITIZER_ERROR] Failed to clean URL:', error);
    return url;
  }
}
