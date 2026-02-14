// 强制删除指定聊天记录的脚本
// 目标：彻底删除 whatsapp:+8615757759002 的历史聊天记录，确保刷新时不重新加载

const targetChatId = 'whatsapp:+8615757759002';

function forceDeleteChat() {
  console.log(`[FORCE_DELETE_CHAT] 开始强制删除聊天记录: ${targetChatId}`);
  
  // 直接操作 localStorage
  if (localStorage) {
    console.log('[FORCE_DELETE_CHAT] localStorage 可用');
    
    // 清理所有相关数据
    const keysToCheck = [
      'chat_messages_v1',
      'chat_chats_v1',
      'chat_translations_v1',
      'chat_drafts_v1',
      'chat_ocr_v1',
      'chat_ocr_results_v1'
    ];
    
    keysToCheck.forEach(key => {
      try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          console.log(`[FORCE_DELETE_CHAT] 检查 ${key} 数据`);
          const data = JSON.parse(storedData);
          
          // 检查是否包含目标聊天 ID
          let dataUpdated = false;
          
          if (data[targetChatId]) {
            console.log(`[FORCE_DELETE_CHAT] 在 ${key} 中找到目标聊天，删除`);
            delete data[targetChatId];
            dataUpdated = true;
          }
          
          // 检查所有键，删除包含目标聊天 ID 的项
          for (const itemKey in data) {
            if (itemKey.includes(targetChatId)) {
              console.log(`[FORCE_DELETE_CHAT] 在 ${key} 中找到包含目标聊天 ID 的项，删除: ${itemKey}`);
              delete data[itemKey];
              dataUpdated = true;
            }
          }
          
          if (dataUpdated) {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`[FORCE_DELETE_CHAT] 已更新 ${key} 数据`);
          } else {
            console.log(`[FORCE_DELETE_CHAT] ${key} 中未找到目标聊天数据`);
          }
        } else {
          console.log(`[FORCE_DELETE_CHAT] ${key} 数据不存在`);
        }
      } catch (error) {
        console.error(`[FORCE_DELETE_CHAT] 处理 ${key} 数据时出错:`, error);
      }
    });
    
    // 清理 sync 状态，防止重新同步
    try {
      localStorage.removeItem('jev_sync_last_ts_v1');
      localStorage.removeItem('jev_sync_status');
      console.log('[FORCE_DELETE_CHAT] 已清理同步状态');
    } catch (error) {
      console.error('[FORCE_DELETE_CHAT] 清理同步状态时出错:', error);
    }
    
    console.log('[FORCE_DELETE_CHAT] 强制删除完成');
    console.log('[FORCE_DELETE_CHAT] 请刷新页面查看效果');
    console.log('[FORCE_DELETE_CHAT] 如果仍然存在，请检查服务器端数据');
  } else {
    console.error('[FORCE_DELETE_CHAT] localStorage 不可用');
  }
}

// 执行强制删除操作
forceDeleteChat();
