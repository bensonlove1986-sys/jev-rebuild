// 删除指定聊天记录的脚本
// 目标：删除 whatsapp:+8615757759002 的历史聊天记录，确保刷新时不重新加载

const targetChatId = 'whatsapp:+8615757759002';

async function deleteChat() {
  try {
    console.log(`[DELETE_CHAT_SCRIPT] 开始删除聊天记录: ${targetChatId}`);
    
    // 直接操作 localStorage
    if (localStorage) {
      // 加载现有数据
      const storedMessages = localStorage.getItem('chat_messages_v1');
      const storedChats = localStorage.getItem('chat_chats_v1');
      
      let messagesUpdated = false;
      let chatsUpdated = false;
      
      if (storedMessages) {
        try {
          const messages = JSON.parse(storedMessages);
          if (messages[targetChatId]) {
            delete messages[targetChatId];
            localStorage.setItem('chat_messages_v1', JSON.stringify(messages));
            messagesUpdated = true;
            console.log(`[DELETE_CHAT_SCRIPT] 清理 localStorage 中的消息数据`);
          }
        } catch (error) {
          console.error(`[DELETE_CHAT_SCRIPT] 解析 messages 数据时出错:`, error);
        }
      }
      
      if (storedChats) {
        try {
          const chats = JSON.parse(storedChats);
          if (chats[targetChatId]) {
            delete chats[targetChatId];
            localStorage.setItem('chat_chats_v1', JSON.stringify(chats));
            chatsUpdated = true;
            console.log(`[DELETE_CHAT_SCRIPT] 清理 localStorage 中的聊天数据`);
          }
        } catch (error) {
          console.error(`[DELETE_CHAT_SCRIPT] 解析 chats 数据时出错:`, error);
        }
      }
      
      // 清理翻译数据
      const storedTranslations = localStorage.getItem('chat_translations_v1');
      if (storedTranslations) {
        try {
          const translations = JSON.parse(storedTranslations);
          let translationsUpdated = false;
          
          // 遍历所有翻译，删除与目标聊天相关的翻译
          for (const key in translations) {
            // 假设翻译键包含聊天 ID 或消息 ID
            if (key.includes(targetChatId)) {
              delete translations[key];
              translationsUpdated = true;
            }
          }
          
          if (translationsUpdated) {
            localStorage.setItem('chat_translations_v1', JSON.stringify(translations));
            console.log(`[DELETE_CHAT_SCRIPT] 清理 localStorage 中的翻译数据`);
          }
        } catch (error) {
          console.error(`[DELETE_CHAT_SCRIPT] 解析 translations 数据时出错:`, error);
        }
      }
      
      if (messagesUpdated || chatsUpdated) {
        console.log(`[DELETE_CHAT_SCRIPT] 聊天记录删除成功`);
        console.log(`[DELETE_CHAT_SCRIPT] 刷新页面后，聊天记录将不再显示`);
      } else {
        console.log(`[DELETE_CHAT_SCRIPT] 聊天记录不存在`);
      }
      
    } else {
      console.error(`[DELETE_CHAT_SCRIPT] localStorage 不可用`);
    }
    
  } catch (error) {
    console.error(`[DELETE_CHAT_SCRIPT] 删除聊天记录时出错:`, error);
  }
}

// 执行删除操作
deleteChat();
