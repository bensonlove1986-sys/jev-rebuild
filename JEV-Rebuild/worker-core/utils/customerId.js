// customerId.js - 客户ID标准化工具

import { DATA_VERSION } from './version.js';

/**
 * 标准化客户ID
 * 确保客户ID格式为 whatsapp:+国家码手机号，无空格
 * @param {string} input 输入的客户ID
 * @returns {string} 标准化后的客户ID
 */
export function normalizeCustomerId(input) {
  if (!input) return "";
  let v = input.trim();

  if (v.startsWith("whatsapp:")) {
    v = v.replace(/\s+/g, "");
    // 提取国家码和手机号部分
    const phonePart = v.substring(9); // 移除 "whatsapp:" 前缀
    // 检查是否是纯数字且没有 + 号
    if (/^\d+$/.test(phonePart)) {
      // 添加 + 号
      return "whatsapp:" + phonePart;
    }
    return v;
  }

  if (/^\+?\d+$/.test(v)) {
    if (!v.startsWith("+")) v = "+" + v;
    return "whatsapp:" + v;
  }

  return v;
}

/**
 * 从客户ID中提取手机号
 * @param {string} customerId 客户ID
 * @returns {string} 手机号
 */
export function extractPhoneNumber(customerId) {
  if (!customerId) return "";
  
  // 移除 whatsapp: 前缀
  let phone = customerId.replace(/^whatsapp:/, "");
  // 移除所有空格
  phone = phone.replace(/\s+/g, "");
  return phone;
}

/**
 * 生成 CHAT_ROOM_DO ID
 * @param {string} customerId 客户ID
 * @returns {string} DO ID
 */
export function generateChatRoomDoId(customerId) {
  const normalizedId = normalizeCustomerId(customerId);
  return `${DATA_VERSION}:room:${normalizedId}`;
}

/**
 * 生成 DEAL_STATE_DO ID
 * @param {string} customerId 客户ID
 * @returns {string} DO ID
 */
export function generateDealStateDoId(customerId) {
  const normalizedId = normalizeCustomerId(customerId);
  return `${DATA_VERSION}:deal:${normalizedId}`;
}

/**
 * 从 CHAT_ROOM_DO ID 中提取客户ID
 * @param {string} doId DO ID
 * @returns {string} 客户ID
 */
export function extractCustomerIdFromDoId(doId) {
  const match = doId.match(/^v2:room:(.+)$/);
  if (match) {
    return normalizeCustomerId(match[1]);
  }
  // 兼容旧格式
  const oldMatch = doId.match(/^room:(.+)$/);
  if (oldMatch) {
    return normalizeCustomerId(oldMatch[1]);
  }
  return "";
}

/**
 * 从 DEAL_STATE_DO ID 中提取客户ID
 * @param {string} doId DO ID
 * @returns {string} 客户ID
 */
export function extractCustomerIdFromDealDoId(doId) {
  const match = doId.match(/^v2:deal:(.+)$/);
  if (match) {
    return normalizeCustomerId(match[1]);
  }
  // 兼容旧格式
  const oldMatch = doId.match(/^deal:(.+)$/);
  if (oldMatch) {
    return normalizeCustomerId(oldMatch[1]);
  }
  return "";
}
