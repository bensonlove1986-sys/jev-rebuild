// Message Normalization and Role Judgement - FROZEN
// This module contains the only allowed logic for message role/direction/context resolution
// Any modifications to this file must adhere to the freeze rules in freeze/message_normalization_and_role_judgement.freeze.md

/**
 * normalizeMessage - 唯一消息裁决入口
 * 所有写入inbox的消息必须且只能经过此函数
 * 
 * @param {Object} message - 原始消息对象
 * @param {string} source - 消息来源
 * @returns {Object} 标准化后的消息对象，包含role、direction、allowContext字段
 */
export function normalizeMessage(message, source) {
  // 确保message是对象
  if (typeof message !== 'object' || message === null) {
    message = {};
  }

  // 合并所有可能的text来源
  let text = message.text;
  if (!text) {
    // 从不同字段中获取text
    text = message.payload?.text || 
           message.body || 
           message.message || 
           message.content;
  }
  
  // 如果text是对象，尝试从中提取文本
  if (typeof text === 'object' && text !== null) {
    text = text.text || JSON.stringify(text);
  }
  
  // 确保text是字符串
  text = String(text || '').trim();

  // 1. 角色裁决（严格约束）
  let role;
  const validRoles = ['customer', 'agent', 'ai'];
  
  // 优先使用message中的role，如果有效则直接使用
  if (validRoles.includes(message.role)) {
    role = message.role;
  } 
  // 否则根据is_self字段和source综合判断
  else if (message.is_self === true) {
    // 如果是自己发送的消息，进一步判断是AI还是人工
    if (message.sender_id === 'ai-assistant' || source === 'ai' || message.source === 'ai') {
      role = 'ai'; // AI发送的消息
    } else {
      role = 'agent'; // 人工发送的消息
    }
  } 
  // 入站消息或客户消息
  else if (source === 'inbound' || source === 'customer' || message.direction === 'inbound') {
    role = 'customer'; // 客户发送的消息
  } 
  // 其他情况默认为agent
  else {
    role = 'agent';
  }
  
  // 2. 方向裁决（严格约束）
  let direction;
  if (message.is_self === true || role === 'agent' || role === 'ai') {
    direction = 'outbound'; // 自己发送的消息、AI消息或人工消息，方向为出站
  } else {
    direction = 'inbound'; // 客户消息，方向为入站
  } 
  
  // 3. 上下文权限裁决（严格约束）
  let allowContext;
  // 只有客户发送的入站消息才能进入AI上下文
  if (role === 'customer' && direction === 'inbound') {
    allowContext = true;
  } else {
    allowContext = false;
  }
  
  // 最终source赋值
  const finalSource = message.source || source;
  
  // 强制补齐所有必需字段
  const normalized = {
    ...message,
    role: role,
    direction: direction,
    source: finalSource,
    allowContext: allowContext,
    // 确保is_self字段存在
    is_self: message.is_self !== undefined ? message.is_self : (role === 'customer' ? false : true),
    // 确保id存在
    id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    // 确保timestamp存在
    timestamp: message.timestamp || Date.now(),
    // 确保type存在
    type: message.type || 'text',
    // 更新text为合并后的值
    text: text
  };
  
  // 写入日志 - 回归自证
  console.log('[MESSAGE_ROLE_RESOLVED]', {
    id: normalized.id,
    role: normalized.role,
    direction: normalized.direction,
    source: normalized.source,
    allowContext: normalized.allowContext,
    is_self: normalized.is_self
  });
  
  // 上下文允许日志
  console.log('[MESSAGE_CONTEXT_ALLOWED]', {
    id: normalized.id,
    role: normalized.role,
    allowContext: normalized.allowContext,
    reason: allowContext ? 'customer inbound message' : 'non-customer message'
  });
  
  // 添加INBOUND_MESSAGE_NORMALIZED日志（当方向为inbound时）
  if (normalized.direction === 'inbound') {
    console.log('[INBOUND_MESSAGE_NORMALIZED]', {
      id: normalized.id,
      customer_id: normalized.customer_id,
      text_length: normalized.text.length,
      source: normalized.source,
      type: normalized.type
    });
    
    // 检查是否可渲染
    const isRenderable = !!normalized.text && normalized.text.trim() !== '';
    console.log('[INBOUND_MESSAGE_RENDERABLE]', {
      id: normalized.id,
      customer_id: normalized.customer_id,
      renderable: isRenderable,
      reason: isRenderable ? 'Has valid text' : 'Empty text'
    });
  }
  
  return normalized;
}

/**
 * isContextAllowed - 检查消息是否允许进入AI上下文
 * @param {Object} message - 标准化后的消息对象
 * @returns {boolean} 是否允许进入AI上下文
 */
export function isContextAllowed(message) {
  return message.role === 'customer' && message.allowContext === true;
}

/**
 * validateMessageFields - 验证消息字段完整性
 * @param {Object} message - 标准化后的消息对象
 * @returns {boolean} 字段是否完整
 */
export function validateMessageFields(message) {
  // 验证核心字段
  const hasCoreFields = !!(message.role && message.direction && message.allowContext !== undefined);
  
  // 对于入站消息，要么有非空text，要么是图片消息
  const hasValidContent = message.direction === 'inbound' 
    ? !!(message.text && message.text.trim() !== '') || 
      message.kind === 'image' || 
      message.NumMedia >= 1 || 
      !!message.MediaUrl0
    : true;
  
  // 验证type字段存在
  const hasType = !!message.type;
  
  return hasCoreFields && hasValidContent && hasType;
}
