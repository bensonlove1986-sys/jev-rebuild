// integrationTest.js
// 集成测试脚本 - 验证operator.js与desktopAgent.ps1的完整通信流程

import { executeTask } from '../modular/operator.js';

async function runIntegrationTest() {
  console.log('========================================');
  console.log('DeepSeek安全执行系统 - 集成测试开始');
  console.log('========================================');

  try {
    // 测试1: 基本的移动鼠标操作
    console.log('\n🔹 测试1: 基本的移动鼠标操作');
    const moveResult = await executeTask({
      id: `test_move_${Date.now()}`,
      token: 'TREA_MAIN',
      action: 'move',
      data: { x: 100, y: 100 }
    });
    console.log('测试1结果:', JSON.stringify(moveResult, null, 2));

    // 测试2: 键盘输入操作
    console.log('\n🔹 测试2: 键盘输入操作');
    const typeResult = await executeTask({
      id: `test_type_${Date.now()}`,
      token: 'TREA_MAIN',
      action: 'type',
      data: { text: 'DeepSeek安全测试' }
    });
    console.log('测试2结果:', JSON.stringify(typeResult, null, 2));

    // 测试3: 截图操作
    console.log('\n🔹 测试3: 截图操作');
    const captureResult = await executeTask({
      id: `test_capture_${Date.now()}`,
      token: 'TREA_MAIN',
      action: 'capture',
      data: { x: 0, y: 0, width: 800, height: 600 }
    });
    console.log('测试3结果:', JSON.stringify(captureResult, null, 2));

    // 测试4: 无效的token (应该被拒绝)
    console.log('\n🔹 测试4: 无效的token (安全验证)');
    const invalidTokenResult = await executeTask({
      id: `test_invalid_token_${Date.now()}`,
      token: 'INVALID_TOKEN',
      action: 'move',
      data: { x: 200, y: 200 }
    });
    console.log('测试4结果:', JSON.stringify(invalidTokenResult, null, 2));

    // 测试5: 无效的动作类型 (应该被拒绝)
    console.log('\n🔹 测试5: 无效的动作类型 (安全验证)');
    const invalidActionResult = await executeTask({
      id: `test_invalid_action_${Date.now()}`,
      token: 'TREA_MAIN',
      action: 'invalid_action',
      data: { test: 'data' }
    });
    console.log('测试5结果:', JSON.stringify(invalidActionResult, null, 2));

    console.log('\n========================================');
    console.log('DeepSeek安全执行系统 - 集成测试完成');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.log('\n========================================');
    console.log('DeepSeek安全执行系统 - 集成测试失败');
    console.log('========================================');
  }
}

// 运行测试
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  runIntegrationTest();
}

export { runIntegrationTest };