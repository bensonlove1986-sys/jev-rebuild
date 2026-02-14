// JEV L10.5 战略对表扫描脚本
// 仅扫描当前运行状态，不修改任何代码、不写入任何状态

import { useChatStore } from '../modules/chat_modular/store/chatStore';
import whatsAppInboxService from '../services/WhatsAppInboxService';

// 扫描函数
export function scanStrategy() {
  console.log('[SCAN_STRATEGY] Starting JEV L10.5 preflight scan...');
  
  // 获取当前时间
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // 1. 扫描 chatStore 当前运行态
  const chatStore = useChatStore.getState();
  
  // 计算消息总数
  const messages_total = Object.values(chatStore.messages).reduce((total, messages) => total + messages.length, 0);
  
  // 计算最近5分钟的消息数
  let messages_last_5min = 0;
  let dedup_drop_count_last_5min = 0;
  let render_forced_count_last_5min = 0;
  let media_path_empty_count_last_5min = 0;
  
  // 遍历所有消息，统计最近5分钟的数据
  Object.values(chatStore.messages).forEach(messages => {
    messages.forEach(message => {
      if (message.timestamp >= fiveMinutesAgo) {
        messages_last_5min++;
        if (!message.media_path) {
          media_path_empty_count_last_5min++;
        }
      }
    });
  });
  
  // 2. 扫描 WhatsAppInboxService 同步态
  const syncState = {
    incrementalSync_running: whatsAppInboxService.isIncrementalSyncRunning(),
    forcePull_running: whatsAppInboxService.isForcePullRunning(),
    ws_connected: whatsAppInboxService.isWSConnected(),
    last_sync_ts: whatsAppInboxService.getLastSyncTS(),
    last_server_ts: whatsAppInboxService.getLastServerTS(),
    rollback_blocked_count: whatsAppInboxService.getRollbackBlockedCount()
  };
  
  // 3. 扫描 UI 感知态
  const ui_state = {
    timeline_active_messages_count: chatStore.messages[chatStore.selectedChatId]?.length || 0,
    selector_activeChatId: chatStore.selectedChatId,
    selectedChatId_store: chatStore.selectedChatId,
    selectedChatId_selector: chatStore.selectedChatId,
    render_nonce_current: chatStore.renderNonce || 0,
    is_render_loop_detected: false // 需要通过分析日志来检测
  };
  
  // 4. 计算"新消息语义缺失指数"
  const semantic_gap = dedup_drop_count_last_5min / Math.max(messages_last_5min, 1);
  
  // 构建输出结果
  const result = {
    "scan_version": "L10.5_preflight",
    "store_state": {
      "activeChatId": chatStore.selectedChatId,
      "messages_total": messages_total,
      "messages_last_5min": messages_last_5min,
      "dedup_drop_count_last_5min": dedup_drop_count_last_5min,
      "render_forced_count_last_5min": render_forced_count_last_5min,
      "media_path_empty_count_last_5min": media_path_empty_count_last_5min
    },
    "sync_state": syncState,
    "ui_state": ui_state,
    "semantic_gap": semantic_gap
  };
  
  console.log('[SCAN_STRATEGY] Scan completed:', result);
  
  return result;
}

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行
  window.scanStrategy = scanStrategy;
  console.log('[SCAN_STRATEGY] Script loaded. Run window.scanStrategy() to execute scan.');
} else {
  // 在 Node.js 环境中运行
  console.log('[SCAN_STRATEGY] Script loaded. Import and call scanStrategy() to execute scan.');
}
