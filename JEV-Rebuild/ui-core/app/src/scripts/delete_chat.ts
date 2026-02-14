// 删除指定聊天记录的脚本
// 目标：删除 whatsapp:+8615757759002 的历史聊天记录，确保刷新时不重新加载

import { useChatStore } from '@/modules/chat_modular/store/chatStore';

const targetChatId = 'whatsapp:+8615757759002';

async function deleteChat() {
  try {
    console.log(`[DELETE_CHAT_SCRIPT] 开始删除聊天记录: ${targetChatId}`);
    
    // 获取 chatStore 实例
    const chatStore = useChatStore.getState();
    
    // 检查聊天是否存在
    if (chatStore.chats[targetChatId]) {
      console.log(`[DELETE_CHAT_SCRIPT] 找到聊天记录，开始删除`);
      
      // 删除聊天记录
      chatStore.removeChat(targetChatId);
      
      console.log(`[DELETE_CHAT_SCRIPT] 聊天记录删除成功`);
      
      // 清理 localStorage 中的相关数据
      try {
        // 检查 localStorage 是否可用
        if (localStorage) {
          // 加载现有数据
          const storedMessages = localStorage.getItem('chat_messages_v1');
          const storedChats = localStorage.getItem('chat_chats_v1');
          
          if (storedMessages) {
            const messages = JSON.parse(storedMessages);
            if (messages[targetChatId]) {
              delete messages[targetChatId];
              localStorage.setItem('chat_messages_v1', JSON.stringify(messages));
              console.log(`[DELETE_CHAT_SCRIPT] 清理 localStorage 中的消息数据`);
            }
          }
          
          if (storedChats) {
            const chats = JSON.parse(storedChats);
            if (chats[targetChatId]) {
              delete chats[targetChatId];
              localStorage.setItem('chat_chats_v1', JSON.stringify(chats));
              console.log(`[DELETE_CHAT_SCRIPT] 清理 localStorage 中的聊天数据`);
            }
          }
          
          console.log(`[DELETE_CHAT_SCRIPT] localStorage 清理完成`);
        }
      } catch (error) {
        console.error(`[DELETE_CHAT_SCRIPT] 清理 localStorage 时出错:`, error);
      }
      
    } else {
      console.log(`[DELETE_CHAT_SCRIPT] 聊天记录不存在`);
    }
    
  } catch (error) {
    console.error(`[DELETE_CHAT_SCRIPT] 删除聊天记录时出错:`, error);
  }
}

// 执行删除操作
deleteChat();
