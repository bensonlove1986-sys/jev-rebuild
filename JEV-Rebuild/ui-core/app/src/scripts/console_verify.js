// 直接在浏览器控制台中执行此代码片段以验证 WebSocket 运行时状态

// 1. 获取 WhatsAppInboxService 实例
let whatsAppInboxService;
if (window.__WhatsAppInboxServiceInstance) {
  whatsAppInboxService = window.__WhatsAppInboxServiceInstance;
} else if (window.whatsAppInboxService) {
  whatsAppInboxService = window.whatsAppInboxService;
} else {
  const module = await import('/src/services/WhatsAppInboxService.ts');
  whatsAppInboxService = module.default;
}

if (!whatsAppInboxService) {
  console.error('WhatsAppInboxService 实例未找到');
} else {
  // 2. 获取 WebSocket leader 状态
  const isLeader = whatsAppInboxService.isLeader ? whatsAppInboxService.isLeader() : false;
  const wsConnected = whatsAppInboxService.isWSConnected ? whatsAppInboxService.isWSConnected() : false;
  const wsDisabledReason = whatsAppInboxService.wsDisabledBecauseAnotherTab ? 'another_tab' : 'none';
  
  // 打印当前 tab leader 状态
  console.log('[VERIFY_WS_LEADER_RUNTIME]', {
    isLeader,
    wsConnected,
    wsDisabledReason
  });
  
  // 3. 获取 BroadcastChannel 状态
  const leaderId = localStorage.getItem('jev_poll_leader') ? JSON.parse(localStorage.getItem('jev_poll_leader')).tabId : null;
  const currentTabId = whatsAppInboxService.tabId;
  
  // 打印 BroadcastChannel 状态
  console.log('[VERIFY_BROADCAST_STATE]', leaderId, currentTabId);
  
  // 4. 获取 WS fallback 原因
  let fallbackMode = 'none';
  if (whatsAppInboxService.wsDisabledBecauseAnotherTab) {
    fallbackMode = 'another_tab';
  } else if (!wsConnected && isLeader) {
    fallbackMode = 'leader_timeout';
  }
  
  // 打印 WS fallback 原因
  console.log('[VERIFY_WS_FALLBACK_REASON]', fallbackMode);
  
  // 5. 最终输出指定格式的 JSON
  const result = {
    "ws_runtime_state": isLeader ? "leader" : "follower",
    "ws_connected": wsConnected,
    "fallback_reason": fallbackMode
  };
  
  console.log('WebSocket 运行时状态验证结果:', result);
  
  // 将结果复制到剪贴板
  try {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    console.log('验证结果已复制到剪贴板');
  } catch (clipboardError) {
    console.warn('无法复制到剪贴板:', clipboardError);
  }
}
