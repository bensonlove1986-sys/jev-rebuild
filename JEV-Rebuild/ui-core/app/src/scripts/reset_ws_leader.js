// JEV WebSocket Leader 强制重置脚本

console.log('[JEV_WS_LEADER_RESET] 开始执行 WebSocket Leader 强制重置');

// 1️⃣ 清空 localStorage 中以下 key
const keysToRemove = [
  'jev_ws_connection_status_3000',
  'jev_poll_leader_3000',
  'jev_ws_processed_ids',
  'jev_processed_ids'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`[JEV_WS_LEADER_RESET] 已删除 localStorage key: ${key}`);
  }
});

// 2️⃣ 停止 WhatsAppInboxService
if (typeof window.whatsAppInboxService !== 'undefined') {
  console.log('[JEV_WS_LEADER_RESET] 停止 WhatsAppInboxService');
  // 调用 forceShutdown 方法
  if (typeof window.whatsAppInboxService.forceShutdown === 'function') {
    window.whatsAppInboxService.forceShutdown();
  }
}

// 3️⃣ 延迟 500ms 后重新启动
setTimeout(() => {
  console.log('[JEV_WS_LEADER_RESET] 延迟 500ms 后重新启动 WhatsAppInboxService');
  
  if (typeof window.whatsAppInboxService !== 'undefined') {
    // 4️⃣ 启动时强制写入：instanceId = 当前tab，role = leader
    console.log('[JEV_WS_LEADER_RESET] 启动 WhatsAppInboxService.start()');
    window.whatsAppInboxService.start();
  }
}, 500);

console.log('[JEV_WS_LEADER_RESET] 脚本执行完成');
