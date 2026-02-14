// 清空历史信息脚本
import { useChatStore } from '../modules/chat_modular/store/chatStore';
import { resetWhatsAppInboxService } from '../services/WhatsAppInboxService';

// 清空chatStore中的所有历史信息
function clearHistory() {
  console.log('[CLEAR_HISTORY_START] 开始清空历史信息');
  
  try {
    const chatStore = useChatStore.getState();
    if (chatStore && chatStore.resetHard) {
      chatStore.resetHard();
      console.log('[CLEAR_HISTORY_SUCCESS] 成功清空chatStore中的历史信息');
    } else {
      console.error('[CLEAR_HISTORY_ERROR] chatStore不存在或没有resetHard方法');
    }
  } catch (error) {
    console.error('[CLEAR_HISTORY_EXCEPTION] 清空历史信息时出错:', error);
  }
  
  // 重置WhatsAppInboxService
  try {
    const waService = resetWhatsAppInboxService();
    console.log('[CLEAR_HISTORY_SERVICE_RESET] 成功重置WhatsAppInboxService');
  } catch (error) {
    console.error('[CLEAR_HISTORY_SERVICE_ERROR] 重置WhatsAppInboxService时出错:', error);
  }
  
  // 清空localStorage中的相关数据
  try {
    const keysToRemove = [
      'jev_chat_store',
      'jev_chat_state',
      'jev_sync_last_ts',
      'jev_processed_message_ids',
      'jev_ws_leader',
      'jev_ws_heartbeat',
      'jev_sync_state',
      'jev_clean_boot'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('[CLEAR_HISTORY_LOCAL_STORAGE_CLEARED] 清空localStorage中的:', key);
    });
  } catch (error) {
    console.error('[CLEAR_HISTORY_LOCAL_STORAGE_ERROR] 清空localStorage时出错:', error);
  }
  
  console.log('[CLEAR_HISTORY_COMPLETE] 历史信息清空完成');
}

// 执行清空操作
if (typeof window !== 'undefined') {
  // 在浏览器环境中执行
  window.clearHistory = clearHistory;
  console.log('[CLEAR_HISTORY_SCRIPT_LOADED] 清空历史信息脚本已加载，可通过 window.clearHistory() 执行');
} else {
  // 在Node.js环境中执行
  clearHistory();
}

export { clearHistory };
