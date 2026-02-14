/**
 * @FREEZE
 * Deal Stage Awareness Module V1
 * 成交阶段感知裁决模块
 * 
 * 模块类型：裁决模块（Decision Module）
 * 功能：判断客户当前所处阶段（CHAT/INQUIRY/ORDER）
 * 输入：客户新消息及最近3-5条客户消息
 * 输出：将裁决结果写入客户状态快照
 */

/**
 * 阶段判定规则配置
 */
const STAGE_RULES = {
  CHAT: {
    keywords: [
      /\b(hi|hello|how are you)\b/i,
      /\b(thanks|ok|noted)\b/i
    ],
    excludeKeywords: [
      /\b(price|quotation|cost|how much|model|spec|datasheet|moq|lead time|delivery time)\b/i,
      /\b(\d+\s*(pcs|piece|set|unit)\s+\w+)\b/i
    ]
  },
  INQUIRY: {
    keywords: [
      /\b(price|quotation|cost|how much)\b/i,
      /\b(model|spec|datasheet)\b/i,
      /\b(moq|lead time|delivery time)\b/i,
      /\b(\d+\s*(pcs|piece|set|unit)\s+\w+)\b/i
    ]
  },
  ORDER: {
    keywords: [
      /\b(order|place order|proceed)\b/i,
      /\b(pi|proforma invoice)\b/i,
      /\b(payment|t\/t|l\/c)\b/i,
      /\b(shipping address|consignee)\b/i
    ]
  }
};

/**
 * 判断消息是否命中关键词列表
 * @param message 消息文本
 * @param keywords 关键词列表（正则表达式）
 * @returns 是否命中
 */
const matchesKeywords = (message, keywords) => {
  return keywords.some(regex => regex.test(message));
};

/**
 * 评估成交阶段
 * @param input 裁决输入
 * @returns 裁决结果
 */
export const evaluateDealStage = (input) => {
  const { message, recent_messages } = input;
  const allMessages = [message, ...recent_messages].join(' ').toLowerCase();
  let stage = 'CHAT';
  let confidence = 0.5;
  let reason = '默认阶段';

  // 检查 ORDER 阶段（优先级最高）
  if (matchesKeywords(allMessages, STAGE_RULES.ORDER.keywords)) {
    stage = 'ORDER';
    confidence = 0.8;
    reason = '包含订单相关关键词';
  }
  // 检查 INQUIRY 阶段
  else if (matchesKeywords(allMessages, STAGE_RULES.INQUIRY.keywords)) {
    stage = 'INQUIRY';
    confidence = 0.7;
    reason = '包含询价相关关键词';
  }
  // 检查 CHAT 阶段
  else if (matchesKeywords(allMessages, STAGE_RULES.CHAT.keywords) || 
           !matchesKeywords(allMessages, [...STAGE_RULES.INQUIRY.keywords, ...STAGE_RULES.ORDER.keywords])) {
    stage = 'CHAT';
    confidence = 0.9;
    reason = '闲聊或未提及业务关键词';
  }

  return {
    deal_stage: stage,
    confidence,
    reason,
    updated_at: Date.now()
  };
};

/**
 * 获取最近3-5条客户消息
 * @param customerId 客户ID
 * @returns 最近3-5条客户消息
 */
export const getRecentCustomerMessages = (customerId, messageStore) => {
  const messages = messageStore.get(customerId) || [];
  const customerMessages = messages
    .filter(msg => msg.role === 'customer' && !msg.is_self)
    .map(msg => msg.text)
    .reverse()
    .slice(0, 5);
  
  return customerMessages;
};

/**
 * 写入裁决结果到客户状态
 * @param customerId 客户ID
 * @param decision 裁决结果
 */
export const writeDecisionToCustomerState = (customerId, decision, customerStore) => {
  const customer = customerStore.get(customerId);
  if (customer) {
    const updatedCustomer = {
      ...customer,
      deal_stage: decision.deal_stage,
      deal_stage_confidence: decision.confidence,
      deal_stage_reason: decision.reason,
      deal_stage_updated_at: decision.updated_at
    };
    customerStore.set(customerId, updatedCustomer);
    
    // 输出日志
    console.log('[DEAL_STAGE_EVAL]', {
      customer_id: customerId,
      channel_id: customer.channel_id || 'unknown',
      stage: decision.deal_stage,
      confidence: decision.confidence,
      reason: decision.reason
    });
  }
};

/**
 * 主裁决函数
 * @param customerId 客户ID
 * @param channelId 通道ID
 * @param platform 平台
 * @param currentMessage 当前消息
 */
export const runDealStageDecision = (customerId, channelId, platform, currentMessage, messageStore, customerStore) => {
  try {
    // 获取最近3-5条客户消息
    const recentMessages = getRecentCustomerMessages(customerId, messageStore);

    // 构建裁决输入
    const input = {
      customer_id: customerId,
      channel_id: channelId,
      platform: platform,
      message: currentMessage,
      recent_messages: recentMessages
    };

    // 评估成交阶段
    const decision = evaluateDealStage(input);

    // 写入裁决结果
    writeDecisionToCustomerState(customerId, decision, customerStore);
  } catch (error) {
    console.error('[DEAL_STAGE_ERROR] Failed to run deal stage decision:', error);
  }
};