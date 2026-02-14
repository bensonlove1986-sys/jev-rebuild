// version.js - 全局版本配置

/**
 * 全局数据版本
 * 用于隔离不同版本的数据
 */
export const DATA_VERSION = "v2";

/**
 * UI 存储版本
 * 用于控制 UI localStorage 缓存重置
 */
export const UI_STORAGE_VERSION = "v2";

/**
 * 生成带版本前缀的 DO ID
 * @param {string} type DO 类型
 * @param {string} customerId 客户 ID
 * @returns {string} 带版本前缀的 DO ID
 */
export function generateVersionedDoId(type, customerId) {
  return `${DATA_VERSION}:${type}:${customerId}`;
}

/**
 * 生成带版本前缀的 KV key
 * @param {string} type KV 类型
 * @param {string} ...parts 其他 key 部分
 * @returns {string} 带版本前缀的 KV key
 */
export function generateVersionedKvKey(type, ...parts) {
  return `${DATA_VERSION}:${type}:${parts.join(':')}`;
}
