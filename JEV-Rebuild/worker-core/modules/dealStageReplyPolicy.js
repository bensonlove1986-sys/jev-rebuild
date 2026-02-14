// 成交阶段回复策略模块
// 纯策略层，基于成交阶段提供AI回复建议

/**
 * 基于成交阶段的AI回复策略函数
 * @param {Object} input 输入参数
 * @param {string} input.stage 成交阶段 ('CHAT' | 'INQUIRY' | 'ORDER')
 * @param {number} input.channel_id 通道ID
 * @param {string} input.lastCustomerMessage 最近的客户消息
 * @returns {Object} 回复策略
 * @returns {string} return.tone 回复语气 ('casual' | 'business' | 'confirm')
 * @returns {string} return.replyStyle 回复风格 ('short' | 'detailed')
 * @returns {string} return.suggestedFocus 建议关注重点
 * @returns {string[]} return.forbid 明确禁止内容
 */
export function getDealStageReplyPolicy(input) {
  const { stage } = input;
  
  console.log('[DEAL_STAGE_POLICY_APPLIED]', { stage });
  
  // 根据成交阶段返回不同策略
  switch (stage) {
    case 'CHAT':
      return {
        tone: 'casual',
        replyStyle: 'short',
        suggestedFocus: 'relationship building',
        forbid: ['price', 'quotation', 'payment', 'invoice', 'order']
      };
      
    case 'INQUIRY':
      return {
        tone: 'business',
        replyStyle: 'detailed',
        suggestedFocus: 'product details, specifications, pricing',
        forbid: ['payment', 'invoice', 'shipping address']
      };
      
    case 'ORDER':
      return {
        tone: 'confirm',
        replyStyle: 'short',
        suggestedFocus: 'payment, delivery, address confirmation',
        forbid: []
      };
      
    default:
      // 默认策略
      return {
        tone: 'casual',
        replyStyle: 'short',
        suggestedFocus: 'general conversation',
        forbid: ['payment', 'invoice']
      };
  }
}

/**
 * 单元测试函数
 * 覆盖CHAT / INQUIRY / ORDER三种策略
 * @returns {boolean} 测试是否通过
 */
export function testDealStageReplyPolicy() {
  console.log('=== 开始测试成交阶段回复策略模块 ===');
  
  let allTestsPassed = true;
  
  // 测试用例1：CHAT阶段
  const chatTestInput = {
    stage: 'CHAT',
    channel_id: 1,
    lastCustomerMessage: 'Hi there! How are you doing?'
  };
  
  const chatResult = getDealStageReplyPolicy(chatTestInput);
  console.log('\n测试用例1 - CHAT阶段：');
  console.log('输入:', chatTestInput);
  console.log('输出:', chatResult);
  console.log('期望: tone = casual, replyStyle = short');
  const chatTestPassed = chatResult.tone === 'casual' && chatResult.replyStyle === 'short';
  console.log('结果:', chatTestPassed ? 'PASS' : 'FAIL');
  if (!chatTestPassed) {
    allTestsPassed = false;
  }
  
  // 测试用例2：INQUIRY阶段
  const inquiryTestInput = {
    stage: 'INQUIRY',
    channel_id: 2,
    lastCustomerMessage: 'What is the price for E2E-X3D1?'
  };
  
  const inquiryResult = getDealStageReplyPolicy(inquiryTestInput);
  console.log('\n测试用例2 - INQUIRY阶段：');
  console.log('输入:', inquiryTestInput);
  console.log('输出:', inquiryResult);
  console.log('期望: tone = business, replyStyle = detailed');
  const inquiryTestPassed = inquiryResult.tone === 'business' && inquiryResult.replyStyle === 'detailed';
  console.log('结果:', inquiryTestPassed ? 'PASS' : 'FAIL');
  if (!inquiryTestPassed) {
    allTestsPassed = false;
  }
  
  // 测试用例3：ORDER阶段
  const orderTestInput = {
    stage: 'ORDER',
    channel_id: 3,
    lastCustomerMessage: 'Please send me the PI for the order.'
  };
  
  const orderResult = getDealStageReplyPolicy(orderTestInput);
  console.log('\n测试用例3 - ORDER阶段：');
  console.log('输入:', orderTestInput);
  console.log('输出:', orderResult);
  console.log('期望: tone = confirm, replyStyle = short');
  const orderTestPassed = orderResult.tone === 'confirm' && orderResult.replyStyle === 'short';
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
  getDealStageReplyPolicy,
  testDealStageReplyPolicy
};