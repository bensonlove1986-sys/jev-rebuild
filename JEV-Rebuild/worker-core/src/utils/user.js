/**
 * 用户相关工具函数
 * 提供用户ID归一化、用户信息处理等功能
 */

/**
 * 归一化用户ID
 * @param {string|number|null|undefined} id - 原始用户ID
 * @returns {string} - 归一化后的用户ID
 */
export function normalizeUserId(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * 归一化字符串
 * @param {*} v - 输入值
 * @returns {string} - 归一化后的字符串
 */
export function normalizeStr(v) {
  return String(v ?? "").trim();
}

/**
 * 判断是否为技术ID（最终版，不可弱化）
 * @param {string} s - 输入字符串
 * @returns {boolean} - 是否为技术ID
 */
export function isLikelyTechId(s) {
  const x = normalizeStr(s);
  if (!x) return true;
  
  // 放行：真实英文名
  if (/^[A-Za-z]{2,}$/i.test(x)) return false; // Lucy
  if (/[A-Za-z]{2,}\s[A-Za-z]{2,}/i.test(x)) return false; // Benson Sensor
  if (/[A-Za-z]{2,}\s[A-Za-z]{1,}/i.test(x)) return false; // L Buongpiu
  
  // 拦截：技术ID
  if (x.length >= 16 && /^[a-z0-9]{16,}$/i.test(x)) return true; // base62
  if (/^[a-f0-9-]{24,}$/i.test(x)) return true; // uuid-like
  if (x.length >= 18 && /^[a-z0-9_-]+$/i.test(x) && !/\s/.test(x)) return true; // 长随机串
  if (/^(external_|kv_|test_|gakcv|msg_|cust_)/i.test(x)) return true; // 特定前缀
  if (/^(customer_id|sessionId|conversation_id)/i.test(x)) return true; // 明确的技术ID字段名
  
  return false;
}

/**
 * 从多个候选值中选择第一个非空值
 * @param {...string} values - 候选值
 * @returns {string} - 第一个非空值
 */
export function firstNonEmpty(...values) {
  for (const v of values) {
    const normalized = normalizeStr(v);
    if (normalized) return normalized;
  }
  return '';
}

/**
 * 安全获取用户显示名称 - 严格遵循显示名优先级（硬规则，命中即停）
 * 1) inbound.body.customer_name
 * 2) inbound.body.company
 * 3) inbound.body.name
 * 4) inbound.body.email (取 @ 前)
 * 5) 最后兜底："客户"
 * @param {Object} inbound - 完整的inbound对象
 * @returns {string} - 用户显示名称
 */
export function getDisplayName(inbound) {
  const raw = inbound || {};
  const body = raw.body || {};
  
  // 严格按照优先级顺序获取显示名称
  let displayName = null;
  let source = 'unknown';
  
  // Daojie 特定字段 - 只使用已确认的字段
  // 1) body.customer_name
  if (body.customer_name) {
    const name = normalizeStr(body.customer_name);
    if (name) {
      displayName = name;
      source = 'customer_name';
    }
  }
  
  // 2) body.company
  if (!displayName && body.company) {
    const name = normalizeStr(body.company);
    if (name) {
      displayName = name;
      source = 'company';
    }
  }
  
  // 3) body.phone
  if (!displayName && body.phone) {
    const name = normalizeStr(body.phone);
    if (name) {
      displayName = name;
      source = 'phone';
    }
  }
  
  // 4) body.customer_id
  if (!displayName && body.customer_id) {
    const name = normalizeStr(body.customer_id);
    if (name) {
      displayName = name;
      source = 'customer_id';
    }
  }
  
  // 输出标准化日志
  console.log('[DISPLAY_NAME_RESOLVED]', {
    raw: body,
    resolved: displayName,
    source: source
  });
  
  return displayName;
}

/**
 * 归一化显示名称 - 直接内联使用，不依赖UI
 * @param {*} v - 输入值
 * @returns {string|null} - 归一化后的显示名称，无效则返回null
 */
export function normalizeDisplayName(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  // 明确判定技术 ID（base62 / uuid-like）
  if (/^[a-z0-9]{16,}$/i.test(s)) return null;
  if (/^[a-f0-9-]{24,}$/i.test(s)) return null;
  return s;
}