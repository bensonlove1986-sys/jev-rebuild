export function normalizeStr(v) {
  return String(v ?? "").trim();
}

/**
 * 判断是否为技术ID（最终版，不可弱化）
 * 放行：
 * - /^[A-Za-z]{2,}$/               → Lucy
 * - /[A-Za-z]{2,}\s[A-Za-z]{2,}/   → Benson Sensor
 * - /[A-Za-z]{2,}\s[A-Za-z]{1,}/   → L Buongpiu
 * 拦截：
 * - /^[a-z0-9]{12,}$/i             → base62 技术ID
 * - /^[a-f0-9-]{16,}$/i            → uuid-like 技术ID
 */
export function isLikelyTechId(s) {
  const x = normalizeStr(s);
  if (!x) return true;
  
  // 强制技术 ID 过滤：任何命中以下规则的字符串一律视为非法显示名
  if (/^[a-z0-9]{12,}$/i.test(x)) return true; // 12位以上base62技术ID
  if (/^[a-f0-9-]{16,}$/i.test(x)) return true; // 16位以上uuid-like技术ID
  
  // 放行：真实英文名
  if (/^[A-Za-z]{2,}$/i.test(x)) return false; // Lucy
  if (/[A-Za-z]{2,}\s[A-Za-z]{2,}/i.test(x)) return false; // Benson Sensor
  if (/[A-Za-z]{2,}\s[A-Za-z]{1,}/i.test(x)) return false; // L Buongpiu
  
  // 其他技术ID拦截规则
  if (x.length >= 18 && /^[a-z0-9_-]+$/i.test(x) && !/\s/.test(x)) return true; // 长随机串
  if (/^(external_|kv_|test_|gakcv|msg_|cust_)/i.test(x)) return true; // 特定前缀
  if (/^(customer_id|sessionId|conversation_id)/i.test(x)) return true; // 明确的技术ID字段名
  
  return false;
}

/**
 * resolveDisplayName(message, customer)
 * 唯一允许的显示名优先级（硬规则，命中即停）
 * 1) message.sender_name
 * 2) customer.profile.displayName
 * 3) customer.profile.username
 * 4) customer.company_name
 * 5) fallback: "客户"
 * 
 * ❌ 禁止来源：
 * - customer_id
 * - sessionId / conversation_id
 * - 任意 base62 / uuid / hash 派生字符串
 */
export function resolveDisplayName(message, customer = {}) {
  const msg = message || {};
  const cust = customer || {};
  
  // 硬编码优先级顺序（遇到第一个合法值即 return）
  const candidates = [
    // 1) message.sender_name
    msg.sender_name,
    
    // 2) customer.profile.displayName
    cust.profile?.displayName,
    cust.displayName,
    
    // 3) customer.profile.username
    cust.profile?.username,
    cust.username,
    
    // 4) customer.company_name
    cust.company_name
  ];
  
  // 遍历所有候选值，找到第一个合法的显示名
  for (const candidate of candidates) {
    const name = normalizeStr(candidate);
    if (name && !isLikelyTechId(name)) {
      return name;
    }
  }
  
  // 固定兜底："客户"，绝不返回技术ID
  return "客户";
}

/**
 * 确保显示名不为空，且不是技术ID
 * @param {string} displayName - 显示名
 * @returns {string} - 安全的显示名
 */
export function ensureSafeDisplayName(displayName) {
  const name = normalizeStr(displayName);
  if (name && !isLikelyTechId(name)) {
    return name;
  }
  return "客户";
}

export function resolveAvatarLetter(message, customer = {}) {
  const name = resolveDisplayName(message, customer);
  const ch = normalizeStr(name).charAt(0);
  return ch ? ch.toUpperCase() : "?";
}