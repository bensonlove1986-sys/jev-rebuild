// Chat Reset Manager
// 职责：清空聊天相关的本地存储和状态

import { chatStore } from '../chat_v4/store/chatStore';
import { WhatsAppInboxService } from './WhatsAppInboxService';

export class ChatResetManager {
  /**
   * 清空所有聊天相关的本地存储
   */
  static clearLocalStorage(): void {
    // 必须删除的keys
    const keysToRemove = [
      'jev_ws_connection_status_3000',
      'jev_poll_leader_3000',
      'jev_chat_store',
      'jev_autodraft_state'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * 清空sessionStorage
   */
  static clearSessionStorage(): void {
    sessionStorage.clear();
  }

  /**
   * 清空processedIds
   */
  static clearProcessedIds(): void {
    // 这里需要根据实际的processedIds存储位置来实现
    // 假设它存储在某个store中
    if (chatStore && typeof chatStore.reset === 'function') {
      chatStore.reset();
    }
  }

  /**
   * 清空WS leader锁
   */
  static clearWSLeaderLock(): void {
    localStorage.removeItem('jev_ws_connection_status_3000');
    localStorage.removeItem('jev_poll_leader_3000');
  }



  /**
   * 执行完整的聊天重置
   */
  static resetChat(): void {
    console.log('🔄 执行聊天历史重置...');
    
    // 1. 清空localStorage中所有JEV chat相关key
    this.clearLocalStorage();
    
    // 2. 清空sessionStorage
    this.clearSessionStorage();
    
    // 3. 清空processedIds
    this.clearProcessedIds();
    
    // 4. 清空WS leader锁
    this.clearWSLeaderLock();
    
    // 5. 不触碰图片缓存
    
    console.log('✅ 聊天历史重置完成');
  }
}

// 暴露全局API
  if (typeof window !== 'undefined') {
    (window as any).JEV_RESET_CHAT = () => {
      console.log('🌍 全局API调用: JEV_RESET_CHAT');
      
      // 执行chatStore.reset()
      if (chatStore && typeof chatStore.reset === 'function') {
        chatStore.reset();
      }
      
      // 执行WhatsAppInboxService.resetLeaderLock()
      if (WhatsAppInboxService && typeof WhatsAppInboxService.resetLeaderLock === 'function') {
        WhatsAppInboxService.resetLeaderLock();
      }
      
      // 执行完整重置
      ChatResetManager.resetChat();
      
      // 强制释放leader lock
      localStorage.removeItem('jev_ws_connection_status_3000');
      localStorage.removeItem('jev_poll_leader_3000');
      
      // 重新初始化WhatsAppInboxService
      if (WhatsAppInboxService && typeof WhatsAppInboxService.reinit === 'function') {
        WhatsAppInboxService.reinit();
      }
      
      console.log('✅ 全局API执行完成');
    };
  }

export default ChatResetManager;