function ensurePanel() {
  try {
    // 界面已禁用，不再创建面板UI
    console.log('[JEV] 界面已禁用，UI面板创建功能已关闭');
    console.log('[JEV] 配置可以通过 window.JEV.CFG 和 window.JEV.STATE 手动设置');
    
    // 确保关键变量在window对象上可用，以便通过控制台访问
    if (!window.JEV) {
      window.JEV = {};
      window.JEV.CFG = {
        WORKER_URL: getWorkerBase(),
        WEBHOOK_SECRET: getWebhookSecret(),
        LOCATION_ID: getLocationId(),
        CONTACT_ID: getContactId(),
        CONVERSATION_ID: getConversationId(),
        AUTO_PUSH: JEV_AUTO_PUSH,
        AUTO_QUOTE: JEV_AUTO_QUOTE,
        SEND_MODE: JEV_SEND_MODE,
        CHAT_ONLY: JEV_CHAT_ONLY,
        CHAT_ROOT_SEL: JEV_CHAT_ROOT_SEL
      };
      console.log('[JEV] 配置已暴露到 window.JEV.CFG');
    }
    
    // 防止崩溃，避免引用该变量的代码出现错误
    jevPanel = null;
    jevLogBox = null;
    jevStatusSpan = null;
    jevToggleBtn = null;
    jevConfigBtn = null;
    jevFlagsBox = null;
    
    console.log('[JEV] 所有UI相关功能已禁用，请通过控制台配置和管理');
  } catch (e) {
    console.error('[JEV] ensurePanel 执行异常:', e);
  }
};