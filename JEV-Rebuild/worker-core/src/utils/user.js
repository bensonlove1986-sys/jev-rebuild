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
 * 优先级：
 * 【优先级 1｜最可信】
 * message.sender.name
 * message.sender.nickname
 * message.sender.display_name
 * 
 * 【优先级 2｜Daojie 常见字段】
 * message.from_name
 * message.from
 * message.username
 * 
 * 【优先级 3｜结构兜底】
 * message.meta.contact_name
 * message.meta.sender_name
 * 
 * 【优先级 4｜最终兜底】
 * customer_id 前 6 位 + "客户"
 * 例如：gakcvf3msauchq2dter9 → gakcvf 客户
 * 
 * @param {Object} contact - 联系人对象
 * @param {string} customerId - 客户ID
 * @param {Object} body - 完整的body对象
 * @returns {string} - 用户显示名称
 */
export function getDisplayName(contact, customerId, body = {}) {
  const rawBody = body || {};
  const contactInfo = contact || {};
  const message = rawBody.message || {};
  
  // 严格按照优先级顺序获取显示名称
  let displayName = null;
  let source = 'unknown';
  
  // 【优先级 1｜最可信】
  // message.sender.name
  if (!displayName && message.sender?.name) {
    const name = normalizeStr(message.sender.name);
    if (name) {
      displayName = name;
      source = 'message.sender.name';
    }
  }
  
  // message.sender.nickname
  if (!displayName && message.sender?.nickname) {
    const name = normalizeStr(message.sender.nickname);
    if (name) {
      displayName = name;
      source = 'message.sender.nickname';
    }
  }
  
  // message.sender.display_name
  if (!displayName && message.sender?.display_name) {
    const name = normalizeStr(message.sender.display_name);
    if (name) {
      displayName = name;
      source = 'message.sender.display_name';
    }
  }
  
  // 【优先级 2｜Daojie 常见字段】
  // message.from_name
  if (!displayName && message.from_name) {
    const name = normalizeStr(message.from_name);
    if (name) {
      displayName = name;
      source = 'message.from_name';
    }
  }
  
  // message.from
  if (!displayName && message.from) {
    const name = normalizeStr(message.from);
    if (name) {
      displayName = name;
      source = 'message.from';
    }
  }
  
  // message.username
  if (!displayName && message.username) {
    const name = normalizeStr(message.username);
    if (name) {
      displayName = name;
      source = 'message.username';
    }
  }
  
  // 额外处理：从body中提取（兼容旧逻辑）
  // 严格遵循优先级：customer_name > company > customer_id
  if (!displayName && rawBody.customer_name) {
    const name = normalizeStr(rawBody.customer_name);
    if (name) {
      displayName = name;
      source = 'body.customer_name';
    }
  }
  
  // 添加对 company 字段的支持，优先级仅次于 customer_name
  if (!displayName && rawBody.company) {
    const name = normalizeStr(rawBody.company);
    if (name) {
      displayName = name;
      source = 'body.company';
    }
  }
  
  if (!displayName && rawBody.from_name) {
    const name = normalizeStr(rawBody.from_name);
    if (name) {
      displayName = name;
      source = 'body.from_name';
    }
  }
  
  if (!displayName && rawBody.from) {
    const name = normalizeStr(rawBody.from);
    if (name) {
      displayName = name;
      source = 'body.from';
    }
  }
  
  if (!displayName && rawBody.username) {
    const name = normalizeStr(rawBody.username);
    if (name) {
      displayName = name;
      source = 'body.username';
    }
  }
  
  if (!displayName && contactInfo.name) {
    const name = normalizeStr(contactInfo.name);
    if (name) {
      displayName = name;
      source = 'contact.name';
    }
  }
  
  if (!displayName && rawBody.sender_name) {
    const name = normalizeStr(rawBody.sender_name);
    if (name) {
      displayName = name;
      source = 'body.sender_name';
    }
  }
  
  // 【优先级 3｜结构兜底】
  // message.meta.contact_name
  if (!displayName && message.meta?.contact_name) {
    const name = normalizeStr(message.meta.contact_name);
    if (name) {
      displayName = name;
      source = 'message.meta.contact_name';
    }
  }
  
  // message.meta.sender_name
  if (!displayName && message.meta?.sender_name) {
    const name = normalizeStr(message.meta.sender_name);
    if (name) {
      displayName = name;
      source = 'message.meta.sender_name';
    }
  }
  
  // 【优先级 4｜最终兜底】
  // customer_id 前 6 位 + "客户"
  if (!displayName) {
    const shortId = (customerId || '').substring(0, 6);
    displayName = `${shortId} 客户`;
    source = 'customer_id_short';
  }
  
  // 输出标准化日志
  console.log('[DISPLAY_NAME_RESOLVED]', {
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