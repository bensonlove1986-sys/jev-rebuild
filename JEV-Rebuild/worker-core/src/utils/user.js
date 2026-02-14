// 用户相关工具函数

/**
 * 提取客户的显示名称
 * @param {Object} customer - 客户对象
 * @returns {string} 显示名称
 */
export function extractDisplayName(customer) {
  if (!customer) return 'Unknown';
  
  // 安全获取字符串值的辅助函数
  const getSafeString = (value) => {
    if (value === null || value === undefined || value === 'null' || value === 'undefined') {
      return '';
    }
    
    // 如果是对象，尝试从中提取名称字段
    if (typeof value === 'object') {
      return (
        value.name ||
        value.full_name ||
        value.real_name ||
        value.display_name ||
        ''
      );
    }
    
    return String(value);
  };
  
  // 优先使用 display_name
  const displayName = getSafeString(customer.display_name);
  if (displayName) return displayName;
  
  // 其次使用 real_name
  const realName = getSafeString(customer.real_name);
  if (realName) return realName;
  
  // 再次使用 customer_name
  const customerName = getSafeString(customer.customer_name);
  if (customerName) return customerName;
  
  // 尝试使用 contact 对象中的名称
  if (customer.contact) {
    const contactName = getSafeString(customer.contact.name || customer.contact.full_name || customer.contact.real_name || customer.contact.display_name);
    if (contactName) return contactName;
  }
  
  // 最后使用 customer_id 或 contactId，确保返回实际值而不是 Unknown
  const finalId = customer.customer_id || customer.contactId;
  if (finalId) {
    return String(finalId);
  }
  // 只有当 customer_id 和 contactId 都不存在时才返回 Unknown
  return 'Unknown';
}

/**
 * 检查是否为技术ID
 * @param {string} id - 要检查的ID
 * @returns {boolean} 是否为技术ID
 */
export function isTechId(id) {
  if (!id) return false;
  
  const techIdPatterns = [
    /^test_/,    // 测试ID
    /^demo/,     // 演示ID
    /^\d+$/,     // 纯数字ID
    /^customer-/, // 本地构造的客户ID
    /fake/i      // 包含fake的ID
  ];
  
  return techIdPatterns.some(pattern => pattern.test(id));
}
