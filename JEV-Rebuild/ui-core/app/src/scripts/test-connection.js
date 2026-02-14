// 测试WebSocket连接的脚本
// 在浏览器控制台中执行此代码

async function testWebSocketConnection() {
  console.log('=== 开始测试WebSocket连接 ===');
  
  try {
    // 1. 检查服务实例
    let service;
    if (window.__WhatsAppInboxServiceInstance) {
      service = window.__WhatsAppInboxServiceInstance;
      console.log('✓ 从window.__WhatsAppInboxServiceInstance获取服务实例');
    } else if (window.whatsAppInboxService) {
      service = window.whatsAppInboxService;
      console.log('✓ 从window.whatsAppInboxService获取服务实例');
    } else {
      console.error('✗ 未找到服务实例');
      return;
    }
    
    // 2. 检查服务状态
    console.log('服务状态:', service.getState ? service.getState() : 'unknown');
    console.log('是否初始化:', service.isInitialized);
    console.log('Tab ID:', service.tabId);
    
    // 3. 检查领导者状态
    console.log('是否为领导者:', service.isLeader ? service.isLeader() : 'unknown');
    
    // 4. 检查WebSocket连接状态
    console.log('WebSocket是否连接:', service.isWSConnected ? service.isWSConnected() : 'unknown');
    
    // 5. 检查运行时配置
    if (window.__JEV_RUNTIME__) {
      console.log('运行时配置:', window.__JEV_RUNTIME__);
    } else {
      console.log('运行时配置未找到');
    }
    
    // 6. 尝试手动连接WebSocket
    if (service && service.getState && service.getState() !== 'OPEN') {
      console.log('尝试手动初始化服务...');
      await service.init();
      console.log('服务初始化完成');
      console.log('服务状态:', service.getState());
    }
    
    // 7. 检查localStorage中的领导者信息
    const leaderData = localStorage.getItem('jev-ws-leader');
    console.log('领导者信息:', leaderData ? JSON.parse(leaderData) : '无');
    
    // 8. 检查控制台日志
    console.log('=== 测试完成 ===');
    console.log('请检查上面的日志，特别是WebSocket连接相关的日志');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 执行测试
testWebSocketConnection();
