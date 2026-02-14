// 最小验证脚本：测试成交阶段回复策略模块
// 只运行单元测试，不调用任何网络、KV、DO、inbox

import { testDealStageReplyPolicy } from '../modules/dealStageReplyPolicy.js';

console.log('🚀 开始测试成交阶段回复策略模块...');

// 运行测试
const result = testDealStageReplyPolicy();

// 打印最终结果
console.log('\n📋 验证结果：');
if (result) {
  console.log('✅ PASS - 成交阶段回复策略模块测试通过');
  process.exit(0);
} else {
  console.log('❌ FAIL - 成交阶段回复策略模块测试失败');
  process.exit(1);
}