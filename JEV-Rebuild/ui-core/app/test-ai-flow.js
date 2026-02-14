// 测试AI草稿生成流程
console.log('=== AI草稿生成流程测试 ===');

// 模拟一个测试消息
const testMessage = {
  id: `test_msg_${Date.now()}`,
  chatId: 'whatsapp:+1234567890',
  from: 'whatsapp:+1234567890',
  to: 'operator',
  direction: 'inbound',
  type: 'text',
  text: '你好，我想咨询一下产品信息',
  timestamp: Date.now(),
  status: 'read',
  isGroup: false
};

console.log('测试消息:', testMessage);

// 导入必要的模块
import { AutoDraftWorker } from './src/services/AutoDraftWorker';
import { useChatStore } from './src/modules/chat_modular/store/chatStore';

// 测试步骤1: 清除localStorage
console.log('\n1. 清除localStorage...');
try {
  localStorage.removeItem('chat_messages_v1');
  localStorage.removeItem('chat_chats_v1');
  localStorage.removeItem('chat_translations_v1');
  localStorage.removeItem('chat_ocr_v1');
  localStorage.removeItem('chat_ocr_results_v1');
  localStorage.removeItem('chat_drafts_v1');
  console.log('✓ localStorage已清除');
} catch (error) {
  console.error('✗ 清除localStorage失败:', error.message);
}

// 测试步骤2: 获取chatStore实例
console.log('\n2. 获取chatStore实例...');
try {
  const chatStore = useChatStore.getState();
  console.log('✓ chatStore实例获取成功');
  console.log('初始drafts数量:', Object.keys(chatStore.drafts || {}).length);
} catch (error) {
  console.error('✗ 获取chatStore实例失败:', error.message);
}

// 测试步骤3: 调用AutoDraftWorker.processNewCustomerMessage
console.log('\n3. 调用AutoDraftWorker.processNewCustomerMessage...');
try {
  AutoDraftWorker.processNewCustomerMessage({
    chatId: testMessage.chatId,
    messageId: testMessage.id,
    text: testMessage.text,
    direction: testMessage.direction,
    timestamp: testMessage.timestamp
  }).then(result => {
    console.log('✓ AutoDraftWorker处理结果:', result);
    
    // 测试步骤4: 检查localStorage中的草稿
    console.log('\n4. 检查localStorage中的草稿...');
    try {
      const drafts = localStorage.getItem('chat_drafts_v1');
      if (drafts) {
        const draftsObj = JSON.parse(drafts);
        console.log('✓ 草稿数量:', Object.keys(draftsObj).length);
        for (const [messageId, draft] of Object.entries(draftsObj)) {
          console.log('✓ 草稿内容 (', messageId, '):', draft);
        }
      } else {
        console.error('✗ 没有找到草稿数据');
      }
    } catch (error) {
      console.error('✗ 检查localStorage失败:', error.message);
    }
    
    // 测试步骤5: 检查chatStore中的草稿
    console.log('\n5. 检查chatStore中的草稿...');
    try {
      const chatStore = useChatStore.getState();
      console.log('✓ chatStore.drafts数量:', Object.keys(chatStore.drafts || {}).length);
      for (const [messageId, draft] of Object.entries(chatStore.drafts || {})) {
        console.log('✓ chatStore草稿内容 (', messageId, '):', draft);
      }
    } catch (error) {
      console.error('✗ 检查chatStore失败:', error.message);
    }
  }).catch(error => {
    console.error('✗ AutoDraftWorker处理失败:', error.message);
  });
} catch (error) {
  console.error('✗ 调用AutoDraftWorker失败:', error.message);
}

console.log('\n=== 测试完成 ===');
