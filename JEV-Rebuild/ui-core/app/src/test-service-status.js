// 简单的服务状态检查脚本
console.log('[TEST] Checking WhatsAppInboxService status...');

// 检查服务是否暴露到window对象
if (typeof window.__WhatsAppInboxServiceInstance !== 'undefined') {
    console.log('[TEST] ✓ WhatsAppInboxServiceInstance found on window');
    const service = window.__WhatsAppInboxServiceInstance;
    
    // 检查服务状态
    console.log('[TEST] Service state:', service.getState());
    console.log('[TEST] Is leader:', service.getIsLeader());
    console.log('[TEST] Is WS connected:', service.isWSConnected());
    console.log('[TEST] Is initialized:', service.isInitialized);
    console.log('[TEST] Tab ID:', service.tabId);
    console.log('[TEST] WS disabled because another tab:', service.wsDisabledBecauseAnotherTab);
    
    // 检查WebSocket连接
    if (service.isWSConnected()) {
        console.log('[TEST] ✓ WebSocket is connected');
    } else {
        console.log('[TEST] ✗ WebSocket is not connected');
    }
    
    // 检查服务方法
    console.log('[TEST] Service methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(service)));
} else if (typeof window.whatsAppInboxService !== 'undefined') {
    console.log('[TEST] ✓ whatsAppInboxService found on window');
    const service = window.whatsAppInboxService;
    
    // 检查服务状态
    console.log('[TEST] Service state:', service.getState());
    console.log('[TEST] Is leader:', service.getIsLeader());
    console.log('[TEST] Is WS connected:', service.isWSConnected());
    console.log('[TEST] Is initialized:', service.isInitialized);
    console.log('[TEST] Tab ID:', service.tabId);
    console.log('[TEST] WS disabled because another tab:', service.wsDisabledBecauseAnotherTab);
    
    // 检查WebSocket连接
    if (service.isWSConnected()) {
        console.log('[TEST] ✓ WebSocket is connected');
    } else {
        console.log('[TEST] ✗ WebSocket is not connected');
    }
    
    // 检查服务方法
    console.log('[TEST] Service methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(service)));
} else {
    console.log('[TEST] ✗ WhatsAppInboxService not found on window');
}

// 检查控制台是否有错误
console.log('[TEST] Console error count:', console.error.callCount || 'N/A');

console.log('[TEST] Status check completed');
