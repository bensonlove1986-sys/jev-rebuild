// WebSocket 运行时状态验证脚本
// 此脚本用于在浏览器控制台中执行，验证 WebSocket 相关的运行时状态

// 等待页面加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runVerification);
} else {
  runVerification();
}

function runVerification() {
  try {
    // 导入 WhatsAppInboxService 实例
    const module = await import('/src/services/WhatsAppInboxService.ts');
    const service = module.default;
    
    if (!service) {
      console.error('WhatsAppInboxService 实例未找到');
      return;
    }
    
    // 1. 获取 WebSocket leader 状态
    const isLeader = service.isLeader ? service.isLeader() : false;
    const wsConnected = service.isWSConnected ? service.isWSConnected() : false;
    const wsDisabledReason = service.wsDisabledBecauseAnotherTab ? 'another_tab' : 'none';
    
    // 打印当前 tab leader 状态
    console.log('[VERIFY_WS_LEADER_RUNTIME]', {
      isLeader,
      wsConnected,
      wsDisabledReason
    });
    
    // 2. 获取 BroadcastChannel 状态
    const leaderId = localStorage.getItem('jev_poll_leader') ? JSON.parse(localStorage.getItem('jev_poll_leader')).tabId : null;
    const currentTabId = service.tabId;
    
    // 打印 BroadcastChannel 状态
    console.log('[VERIFY_BROADCAST_STATE]', leaderId, currentTabId);
    
    // 3. 获取 WS fallback 原因
    let fallbackMode = 'none';
    if (service.wsDisabledBecauseAnotherTab) {
      fallbackMode = 'another_tab';
    } else if (!wsConnected && isLeader) {
      fallbackMode = 'leader_timeout';
    }
    
    // 打印 WS fallback 原因
    console.log('[VERIFY_WS_FALLBACK_REASON]', fallbackMode);
    
    // 4. 最终输出指定格式的 JSON
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
    
  } catch (error) {
    console.error('验证过程中出错:', error);
  }
}
