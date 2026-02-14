// 测试草稿持久化功能
import { AutoDraftEngine, AutoDraftWorker } from './index.js';

// 模拟环境变量
const mockEnv = {
  DEEPSEEK_API_KEY: 'sk-77dbd0cc5f30451daa863d5213e6607f',
  DRAFT_KV: {
    put: async (key, value) => {
      console.log(`[Mock KV] Put: ${key}`, JSON.parse(value));
    },
    get: async (key, options) => {
      console.log(`[Mock KV] Get: ${key}`);
      return null;
    },
    delete: async (key) => {
      console.log(`[Mock KV] Delete: ${key}`);
    }
  },
  WHATSAPP_CHAT_DO: {
    idFromName: () => ({ toString: () => 'mock-do-id' }),
    get: () => ({
      fetch: async () => ({
        json: async () => ({ messages: [] })
      })
    })
  }
};

async function testDraftPersistence() {
  console.log('=== 测试草稿持久化功能 ===');
  
  try {
    // 创建 AutoDraftWorker 实例
    const draftWorker = new AutoDraftWorker(mockEnv);
    
    // 模拟客户消息
    const mockMessage = {
      message_id: 'SM1234567890',
      chat_id: 'whatsapp:+8615757759002',
      text: 'Printing will be same?',
      direction: 'inbound',
      timestamp: Date.now()
    };
    
    console.log('1. 测试处理新客户消息...');
    const result = await draftWorker.processNewCustomerMessage(mockMessage, mockMessage.chat_id);
    console.log('处理结果:', result);
    
    console.log('2. 测试获取草稿...');
    const draft = await draftWorker.getDraft(mockMessage.chat_id);
    console.log('获取到的草稿:', draft);
    
    console.log('3. 测试删除草稿...');
    const deleteResult = await draftWorker.deleteDraft(mockMessage.chat_id);
    console.log('删除结果:', deleteResult);
    
    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testDraftPersistence();
