/**
 * Customer ID 规范化工具
 * 统一所有 customer_id 为 whatsapp:+{number} 格式
 */

/**
 * 规范化客户 ID
 * @param raw 原始客户 ID
 * @returns 规范化后的客户 ID
 */
export function normalizeCustomerId(raw: string): string {
  if (!raw) return raw;

  let id = raw.trim();
  id = id.replace(/^whatsapp:/i, "");
  id = id.replace(/[^\d]/g, "");

  return `whatsapp:+${id}`;
}

/**
 * 检查客户 ID 是否为规范化格式
 * @param id 客户 ID
 * @returns 是否为规范化格式
 */
export function isNormalizedCustomerId(id: string): boolean {
  return id && typeof id === 'string' && id.match(/^whatsapp:\+\d+$/);
}
