// === 直接在浏览器控制台中执行此代码 ===

// 尝试多种方式获取 WhatsAppInboxService 实例
let whatsAppInboxService;

try {
  // 方式 1: 直接从全局对象获取
  if (window.whatsAppInboxService) {
    whatsAppInboxService = window.whatsAppInboxService;
    console.log('[WA_WS_INSTANCE_FOUND] From window.whatsAppInboxService');
  }
  
  // 方式 2: 从模块导入
  else if (typeof import === 'function') {
    const module = await import('/src/services/WhatsAppInboxService.ts');
    if (module.whatsAppInboxService) {
      whatsAppInboxService = module.whatsAppInboxService;
      console.log('[WA_WS_INSTANCE_FOUND] From module import');
    } else if (module.getWhatsAppInboxService) {
      whatsAppInboxService = module.getWhatsAppInboxService();
      console.log('[WA_WS_INSTANCE_FOUND] From getWhatsAppInboxService()');
    }
  }
  
  // 方式 3: 从全局 SERVICE_KEY 获取
  else if (window.__SERVICE_KEY__) {
    whatsAppInboxService = window[window.__SERVICE_KEY__];
    console.log('[WA_WS_INSTANCE_FOUND] From window[SERVICE_KEY]');
  }
  
  // 方式 4: 尝试使用 SERVICE_KEY 常量
  else {
    const SERVICE_KEY = "__JEV_WA_INBOX_SERVICE__";
    if (window[SERVICE_KEY]) {
      whatsAppInboxService = window[SERVICE_KEY];
      console.log('[WA_WS_INSTANCE_FOUND] From window[__JEV_WA_INBOX_SERVICE__]');
    } else {
      console.error('[WA_WS_INSTANCE_NOT_FOUND]');
    }
  }
  
  if (whatsAppInboxService) {
    // 1. 打印当前 tab leader 状态
    const isLeader = whatsAppInboxService.isLeader ? whatsAppInboxService.isLeader() : false;
    const wsConnected = whatsAppInboxService.isWSConnected ? whatsAppInboxService.isWSConnected() : false;
    const wsDisabledReason = whatsAppInboxService.wsDisabledBecauseAnotherTab ? 'another_tab' : 'none';
    
    console.log('[VERIFY_WS_LEADER_RUNTIME]', {
      isLeader,
      wsConnected,
      wsDisabledReason
    });
    
    // 2. 打印 BroadcastChannel 状态
    const leaderId = localStorage.getItem('jev_poll_leader') ? JSON.parse(localStorage.getItem('jev_poll_leader')).tabId : null;
    const currentTabId = whatsAppInboxService.tabId;
    
    console.log('[VERIFY_BROADCAST_STATE]', leaderId, currentTabId);
    
    // 3. 打印 WS fallback 原因
    let fallbackMode = 'none';
    if (whatsAppInboxService.wsDisabledBecauseAnotherTab) {
      fallbackMode = 'another_tab';
    } else if (!wsConnected && isLeader) {
      fallbackMode = 'leader_timeout';
    }
    
    console.log('[VERIFY_WS_FALLBACK_REASON]', fallbackMode);
    
    // 4. 最终输出
    const result = {
      "ws_runtime_state": isLeader ? "leader" : "follower",
      "ws_connected": wsConnected,
      "fallback_reason": fallbackMode
    };
    
    console.log('=== WebSocket 运行时状态验证结果 ===');
    console.log(JSON.stringify(result, null, 2));
    
    // 尝试复制到剪贴板
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('✅ 验证结果已复制到剪贴板');
    } catch (e) {
      console.log('⚠️ 无法复制到剪贴板:', e.message);
    }
    
  } else {
    console.error('❌ 无法获取 WhatsAppInboxService 实例');
  }
  
} catch (error) {
  console.error('❌ 执行过程中出错:', error);
}
