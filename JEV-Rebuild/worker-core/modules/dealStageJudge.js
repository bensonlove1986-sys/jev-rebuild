// 成交阶段感知模块
// 只读裁决模块，只做判断，不做任何发送或修改现有通道

/**
 * 成交阶段枚举
 * @readonly
 * @enum {string}
 */
export const DealStage = {
  CHAT: 'CHAT',
  INQUIRY: 'INQUIRY',
  ORDER: 'ORDER'
};

// 判定规则常量
const JUDGE_RULES = {
  // CHAT阶段关键词（闲聊）
  CHAT_KEYWORDS: [
    'hi', 'hello', 'hey', 'how are you', 'good morning',
    'good afternoon', 'good evening', 'nice to meet you',
    'how do you do', 'whats up', 'howdy', 'greetings'
  ],
  
  // INQUIRY阶段关键词（询价）
  INQUIRY_KEYWORDS: [
    'price', 'quotation', 'cost', 'datasheet', 'quote',
    'unit price', 'how much', 'cost', 'rate', 'pricing',
    'spec', 'specification', 'model', 'type', 'size',
    'quantity', 'qty', 'pcs', 'piece', 'set', 'kit'
  ],
  
  // ORDER阶段关键词（下单）
  ORDER_KEYWORDS: [
    'pay', 'payment', 'invoice', 'pi', 'proforma invoice',
    'tt', 'l/c', 'letter of credit', 'delivery', 'ship',
    'shipping', 'address', 'delivery time', 'lead time',
    'when will', 'send me', 'i want to order', 'place order',
    'confirm order', 'order', 'buy', 'purchase', 'need to buy'
  ]
};

/**
 * 成交阶段感知裁决函数
 * @param {Object} input - 输入参数
 * @param {string} input.customerId - 客户ID
 * @param {number} input.channel_id - 通道ID
 * @param {Array<Object>} input.messages - 消息列表
 * @param {'customer'|'agent'|'ai'} input.messages[].role - 消息角色
 * @param {string} input.messages[].text - 消息文本
 * @param {number} input.messages[].timestamp - 消息时间戳
 * @returns {Object} 判定结果
 * @returns {string} returns.stage - 成交阶段：CHAT|INQUIRY|ORDER
 * @returns {number} returns.confidence - 置信度：0~1
 * @returns {string} returns.reason - 判定依据
 */
export function judgeDealStage(input) {
  // 只分析最近10条customer消息，且只允许allowContext为true的消息
  const customerMessages = input.messages
    .filter(msg => msg.role === 'customer' && msg.allowContext === true)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .reverse(); // 按时间正序排列
    
  console.log('[MESSAGE_CONTEXT_ALLOWED]', {
    totalMessages: input.messages.length,
    customerMessages: input.messages.filter(msg => msg.role === 'customer').length,
    allowedContextMessages: input.messages.filter(msg => msg.role === 'customer' && msg.allowContext === true).length
  });

  // 控制台日志（debug级）
  console.log('[DEAL_STAGE_JUDGE]', {
    customerId: input.customerId,
    channel_id: input.channel_id,
    messageCount: customerMessages.length
  });

  // 如果没有客户消息，默认判定为CHAT阶段
  if (customerMessages.length === 0) {
    return {
      stage: DealStage.CHAT,
      confidence: 0.8,
      reason: 'No customer messages available, default to CHAT stage'
    };
  }

  // 分析每条客户消息
  let chatScore = 0;
  let inquiryScore = 0;
  let orderScore = 0;

  // 计算总消息数
  const totalMessages = customerMessages.length;

  // 分析每条客户消息
  for (const msg of customerMessages) {
    const text = msg.text.toLowerCase().trim();
    
    // 检查CHAT阶段关键词
    const hasChatKeywords = JUDGE_RULES.CHAT_KEYWORDS.some(keyword => text.includes(keyword));
    if (hasChatKeywords) {
      chatScore++;
    }
    
    // 检查INQUIRY阶段关键词
    const hasInquiryKeywords = JUDGE_RULES.INQUIRY_KEYWORDS.some(keyword => text.includes(keyword));
    if (hasInquiryKeywords) {
      inquiryScore++;
    }
    
    // 检查ORDER阶段关键词
    const hasOrderKeywords = JUDGE_RULES.ORDER_KEYWORDS.some(keyword => text.includes(keyword));
    if (hasOrderKeywords) {
      orderScore++;
    }
  }

  // 计算各阶段得分比例
  const chatRatio = chatScore / totalMessages;
  const inquiryRatio = inquiryScore / totalMessages;
  const orderRatio = orderScore / totalMessages;

  // 确定最终阶段
  let finalStage;
  let confidence;
  let reason;

  // 优先级：ORDER > INQUIRY > CHAT
  if (orderScore > 0) {
    finalStage = DealStage.ORDER;
    confidence = Math.min(1, orderRatio * 0.8 + 0.2); // 基础置信度0.2，最高1.0
    reason = `Found order-related keywords in ${orderScore}/${totalMessages} messages`;
  } else if (inquiryScore > 0) {
    finalStage = DealStage.INQUIRY;
    confidence = Math.min(1, inquiryRatio * 0.8 + 0.2); // 基础置信度0.2，最高1.0
    reason = `Found inquiry-related keywords in ${inquiryScore}/${totalMessages} messages`;
  } else {
    finalStage = DealStage.CHAT;
    confidence = Math.min(1, chatRatio * 0.8 + 0.2); // 基础置信度0.2，最高1.0
    reason = `Found chat-related keywords in ${chatScore}/${totalMessages} messages, no inquiry or order keywords`;
  }

  // 控制台日志（debug级）
  console.log('[DEAL_STAGE_JUDGE_RESULT]', {
    customerId: input.customerId,
    stage: finalStage,
    confidence,
    reason
  });

  return {
    stage: finalStage,
    confidence,
    reason
  };
}

/**
 * 单元测试函数
 * 覆盖CHAT / INQUIRY / ORDER三种输入
 * @returns {boolean} 测试是否通过
 */
export function testDealStageJudge() {
  console.log('=== 开始测试成交阶段感知模块 ===');

  let allTestsPassed = true;

  // 测试用例1：CHAT阶段
  const chatTestInput = {
    customerId: 'test-chat-123',
    channel_id: 1,
    messages: [
      {
        role: 'customer',
        text: 'Hi there! How are you doing today?',
        timestamp: Date.now() - 3600000
      },
      {
        role: 'customer',
        text: 'Good morning! Nice to meet you.',
        timestamp: Date.now() - 1800000
      }
    ]
  };

  const chatResult = judgeDealStage(chatTestInput);
  console.log('\n测试用例1 - CHAT阶段：');
  console.log('输入:', chatTestInput.messages.map(m => m.text));
  console.log('输出:', chatResult);
  console.log('期望: stage = CHAT, confidence > 0.5');
  const chatTestPassed = chatResult.stage === DealStage.CHAT && chatResult.confidence > 0.5;
  console.log('结果:', chatTestPassed ? 'PASS' : 'FAIL');
  if (!chatTestPassed) {
    allTestsPassed = false;
  }

  // 测试用例2：INQUIRY阶段
  const inquiryTestInput = {
    customerId: 'test-inquiry-456',
    channel_id: 2,
    messages: [
      {
        role: 'customer',
        text: 'What is the price for E2E-X3D1?',
        timestamp: Date.now() - 3600000
      },
      {
        role: 'customer',
        text: 'I need 10 pcs of this product.',
        timestamp: Date.now() - 1800000
      }
    ]
  };

  const inquiryResult = judgeDealStage(inquiryTestInput);
  console.log('\n测试用例2 - INQUIRY阶段：');
  console.log('输入:', inquiryTestInput.messages.map(m => m.text));
  console.log('输出:', inquiryResult);
  console.log('期望: stage = INQUIRY, confidence > 0.5');
  const inquiryTestPassed = inquiryResult.stage === DealStage.INQUIRY && inquiryResult.confidence > 0.5;
  console.log('结果:', inquiryTestPassed ? 'PASS' : 'FAIL');
  if (!inquiryTestPassed) {
    allTestsPassed = false;
  }

  // 测试用例3：ORDER阶段
  const orderTestInput = {
    customerId: 'test-order-789',
    channel_id: 3,
    messages: [
      {
        role: 'customer',
        text: 'Please send me the PI for the order.',
        timestamp: Date.now() - 3600000
      },
      {
        role: 'customer',
        text: 'We will pay by T/T.',
        timestamp: Date.now() - 1800000
      }
    ]
  };

  const orderResult = judgeDealStage(orderTestInput);
  console.log('\n测试用例3 - ORDER阶段：');
  console.log('输入:', orderTestInput.messages.map(m => m.text));
  console.log('输出:', orderResult);
  console.log('期望: stage = ORDER, confidence > 0.5');
  const orderTestPassed = orderResult.stage === DealStage.ORDER && orderResult.confidence > 0.5;
  console.log('结果:', orderTestPassed ? 'PASS' : 'FAIL');
  if (!orderTestPassed) {
    allTestsPassed = false;
  }

  console.log('\n=== 测试完成 ===');
  console.log('总结果:', allTestsPassed ? 'PASS' : 'FAIL');

  return allTestsPassed;
}

// 导出模块
export default {
  judgeDealStage,
  testDealStageJudge
};
