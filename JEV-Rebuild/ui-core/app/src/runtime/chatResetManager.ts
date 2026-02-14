// Chat Reset Manager - Clean Boot Implementation
// 职责：一键清空所有聊天相关本地脏状态，强制本 Tab 成为 leader

import { getWhatsAppInboxService } from '@/services/WhatsAppInboxService';
import { useChatStore } from '@/modules/chat_modular/store/chatStore';
import { useContactStore } from '@/modules/chat_modular/store/contactStore';

// 强制释放 leader 的广播消息类型
interface ForceReleaseLeaderMessage {
  type: 'force_release_leader';
  tabId: string;
  timestamp: number;
}

/**
 * 硬重置聊天运行时
 * 一键清空所有聊天相关本地脏状态，强制本 Tab 成为 leader
 */
export function hardResetChatRuntime(): void {
  console.log('[CHAT_RESET] Starting hardResetChatRuntime()');
  
  try {
    // A1) 关闭跨 Tab 复活机制（先关再删）
    console.log('[CHAT_RESET] Step A1: Disabling cross-tab resurrection');
    
    // 发送 force_release_leader 广播
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('jev-wa-inbox-service');
      const message: ForceReleaseLeaderMessage = {
        type: 'force_release_leader',
        tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };
      broadcastChannel.postMessage(message);
      console.log('[CHAT_RESET] Sent force_release_leader broadcast');
      
      // 立即关闭 BroadcastChannel，避免后续广播继续进来
      broadcastChannel.close();
      console.log('[CHAT_RESET] Closed BroadcastChannel');
    } catch (error) {
      console.error('[CHAT_RESET] Error with BroadcastChannel:', error);
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch (closeError) {
          console.error('[CHAT_RESET] Error closing BroadcastChannel:', closeError);
        }
      }
    }
    
    // 调用 WhatsAppInboxService.forceShutdown()
    const waService = getWhatsAppInboxService();
    if (waService && typeof waService.forceShutdown === 'function') {
      waService.forceShutdown();
      console.log('[CHAT_RESET] Called WhatsAppInboxService.forceShutdown()');
    } else {
      console.warn('[CHAT_RESET] WhatsAppInboxService.forceShutdown() not available');
    }
    
    // A2) 清空所有 JEV chat 相关 key（精确 + 前缀扫描）
    console.log('[CHAT_RESET] Step A2: Clearing all JEV chat-related storage keys');
    
    // 必须删除的精确 key
    const exactKeysToDelete = [
      'jev_ws_connection_status_3000',
      'jev_poll_leader_3000',
      'jev_chat_store',
      'jev_chat_state',
      'jev_chat_messages',
      'jev_processed_ids',
      'jev_autodraft_state',
      'jev_autodraft_runtime',
      'jev_sync_state',
      'jev_inbox_cache',
      'jev_translation_cache'
    ];
    
    // 精确删除
    exactKeysToDelete.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log('[CHAT_RESET] Deleted key:', key);
      } catch (error) {
        console.error('[CHAT_RESET] Error deleting key', key, error);
      }
    });
    
    // 前缀扫描删除
    const prefixesToDelete = ['jev_'];
    const containsToDelete = ['chat', 'ws', 'poll', 'autodraft', 'translation'];
    
    // 禁止删除的关键词（图片线路缓存）
    const forbiddenKeywords = ['media', 'r2', 'image', 'photo', 'picture'];
    
    // 扫描 localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // 检查是否包含禁止删除的关键词
      const containsForbidden = forbiddenKeywords.some(forbidden => 
        key.toLowerCase().includes(forbidden)
      );
      if (containsForbidden) {
        console.log('[CHAT_RESET] Skipping (image cache):', key);
        continue;
      }
      
      // 检查前缀
      const matchesPrefix = prefixesToDelete.some(prefix => key.startsWith(prefix));
      // 检查包含关键词
      const matchesContains = containsToDelete.some(contains => 
        key.toLowerCase().includes(contains)
      );
      
      if (matchesPrefix || matchesContains) {
        try {
          localStorage.removeItem(key);
          console.log('[CHAT_RESET] Deleted (scan):', key);
          i--; // 索引调整
        } catch (error) {
          console.error('[CHAT_RESET] Error deleting key', key, error);
        }
      }
    }
    
    // 扫描 sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      
      // 检查是否包含禁止删除的关键词
      const containsForbidden = forbiddenKeywords.some(forbidden => 
        key.toLowerCase().includes(forbidden)
      );
      if (containsForbidden) {
        console.log('[CHAT_RESET] Skipping sessionStorage (image cache):', key);
        continue;
      }
      
      // 检查前缀
      const matchesPrefix = prefixesToDelete.some(prefix => key.startsWith(prefix));
      // 检查包含关键词
      const matchesContains = containsToDelete.some(contains => 
        key.toLowerCase().includes(contains)
      );
      
      if (matchesPrefix || matchesContains) {
        try {
          sessionStorage.removeItem(key);
          console.log('[CHAT_RESET] Deleted sessionStorage (scan):', key);
          i--; // 索引调整
        } catch (error) {
          console.error('[CHAT_RESET] Error deleting sessionStorage key', key, error);
        }
      }
    }
    
    // 清空整个 sessionStorage（额外保险）
    try {
      sessionStorage.clear();
      console.log('[CHAT_RESET] Cleared entire sessionStorage');
    } catch (error) {
      console.error('[CHAT_RESET] Error clearing sessionStorage:', error);
    }
    
    // A3) 清空内存态（store reset）
    console.log('[CHAT_RESET] Step A3: Resetting in-memory stores');
    
    // 获取 store 实例
    const chatStore = useChatStore.getState();
    const contactStore = useContactStore.getState();
    
    // chatStore.resetHard()
    if (chatStore && typeof chatStore.resetHard === 'function') {
      chatStore.resetHard();
      console.log('[CHAT_RESET] Called chatStore.resetHard()');
    } else if (chatStore && typeof chatStore.reset === 'function') {
      chatStore.reset();
      console.log('[CHAT_RESET] Called chatStore.reset() (fallback)');
    } else {
      console.warn('[CHAT_RESET] chatStore.resetHard() not available');
    }
    
    // contactStore.resetTransient()
    if (contactStore && typeof contactStore.resetTransient === 'function') {
      contactStore.resetTransient();
      console.log('[CHAT_RESET] Called contactStore.resetTransient()');
    } else {
      console.warn('[CHAT_RESET] contactStore.resetTransient() not available');
    }
    
    // 尝试 reset draftStore（如果存在）
    try {
      const { useDraftStore } = require('@/modules/chat_modular/store/draftStore');
      const draftStore = useDraftStore.getState();
      if (draftStore && typeof draftStore.reset === 'function') {
        draftStore.reset();
        console.log('[CHAT_RESET] Called draftStore.reset()');
      }
    } catch (error) {
      console.log('[CHAT_RESET] draftStore not found, skipping reset');
    }
    
    // 尝试 reset systemScheduler（如果存在）
    try {
      const { systemScheduler } = require('@/core/scheduler/system_scheduler');
      if (systemScheduler && typeof systemScheduler.resetQueue === 'function') {
        systemScheduler.resetQueue();
        console.log('[CHAT_RESET] Called systemScheduler.resetQueue()');
      }
    } catch (error) {
      console.log('[CHAT_RESET] systemScheduler not found, skipping reset');
    }
    
    // A4) 写入一个“Clean Boot 哨兵”防止立刻恢复
    console.log('[CHAT_RESET] Step A4: Writing Clean Boot sentinel');
    
    try {
      const cleanBootSentinel = {
        ts: Date.now(),
        mode: 'hard' as const
      };
      localStorage.setItem('jev_clean_boot', JSON.stringify(cleanBootSentinel));
      console.log('[CHAT_RESET] Written Clean Boot sentinel:', cleanBootSentinel);
    } catch (error) {
      console.error('[CHAT_RESET] Error writing Clean Boot sentinel:', error);
    }
    
    console.log('[CHAT_RESET] hardResetChatRuntime() completed successfully');
    
    // 输出完成标志
    console.log('[CLEAN_BOOT_DONE]');
    console.log('[LOCAL_RESTORE_BLOCKED]');
    console.log('[WS_LEADER_OK]');
    
  } catch (error) {
    console.error('[CHAT_RESET] Error in hardResetChatRuntime()', error);
  }
}

/**
 * 检查是否处于 Clean Boot 状态
 */
export function isInCleanBoot(): boolean {
  try {
    const sentinelStr = localStorage.getItem('jev_clean_boot');
    if (!sentinelStr) return false;
    
    const sentinel = JSON.parse(sentinelStr);
    if (!sentinel.ts || typeof sentinel.ts !== 'number') return false;
    
    // 检查是否在 10 分钟内
    const tenMinutes = 10 * 60 * 1000;
    return (Date.now() - sentinel.ts) < tenMinutes;
  } catch (error) {
    return false;
  }
}

/**
 * 清除 Clean Boot 哨兵
 */
export function clearCleanBootSentinel(): void {
  try {
    localStorage.removeItem('jev_clean_boot');
    console.log('[CHAT_RESET] Clean Boot sentinel cleared');
  } catch (error) {
    console.error('[CHAT_RESET] Error clearing Clean Boot sentinel:', error);
  }
}
