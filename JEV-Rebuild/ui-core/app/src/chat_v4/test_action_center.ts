import { dispatch } from './core/action_center';

// 测试 Action Center 功能
console.log('=== 测试 Action Center ===');

// 测试 AI_GENERATE_REPLY
dispatch({
  type: 'AI_GENERATE_REPLY',
  key: 'test_message_1',
  payload: { message_id: 'test_message_1' }
});

// 测试重复执行（应该被跳过）
dispatch({
  type: 'AI_GENERATE_REPLY',
  key: 'test_message_1',
  payload: { message_id: 'test_message_1' }
});

// 测试 SEND_MESSAGE
dispatch({
  type: 'SEND_MESSAGE',
  key: 'test_message_2',
  payload: { message_id: 'test_message_2' }
});

// 测试 TRANSLATE_MESSAGE
dispatch({
  type: 'TRANSLATE_MESSAGE',
  key: 'test_message_3',
  payload: { message_id: 'test_message_3' }
});

// 测试 OCR_PROCESS
dispatch({
  type: 'OCR_PROCESS',
  key: 'test_message_4',
  payload: { message_id: 'test_message_4' }
});

console.log('=== 测试完成 ===');
