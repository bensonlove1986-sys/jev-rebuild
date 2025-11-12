const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'daojiem_capture_disabled_ui.user.js');

// 读取文件内容
let content = fs.readFileSync(filePath, 'utf8');

// 修复正则表达式错误
content = content.replace(/\/\/\+$/, '/\\/$/');

// 修复第201行的未闭合字符串
content = content.replace(/console\.log\('\[JEV\] 寮圭獥宸茬鐢紝UI闈㈡澘鍒涘缓鍔熻兘宸插叧闂?\);/, "console.log('[JEV] 界面已禁用，UI面板创建功能已关闭');");

// 重写ensurePanel函数
const newEnsurePanel = `function ensurePanel() {
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
};`;

// 替换ensurePanel函数
const ensurePanelRegex = /function ensurePanel\([^)]*\)[^{]*\{[\s\S]*?\};?/;
content = content.replace(ensurePanelRegex, newEnsurePanel);

// 修复bindEvents函数
const newBindEvents = `function bindEvents() {
  try {
    console.log('[JEV] 绑定事件功能已禁用');
  } catch (e) {
    console.error('[JEV] 绑定事件失败:', e);
  }
}`;

const bindEventsRegex = /function bindEvents\([^)]*\)[^{]*\{[\s\S]*?\}/;
content = content.replace(bindEventsRegex, newBindEvents);

// 修复renderFlags函数
const newRenderFlags = `function renderFlags() {
  try {
    // 确保在window对象上定义关键变量
    window.JEV_IS_ADMIN = typeof JEV_IS_ADMIN !== 'undefined' ? JEV_IS_ADMIN : false;
    window.JEV_AUTO_PUSH = typeof JEV_AUTO_PUSH !== 'undefined' ? JEV_AUTO_PUSH : false;
    window.JEV_SEND_MODE = typeof JEV_SEND_MODE !== 'undefined' ? JEV_SEND_MODE : 'worker';
    window.JEV_CHAT_ONLY = typeof JEV_CHAT_ONLY !== 'undefined' ? JEV_CHAT_ONLY : false;
    window.JEV_CHAT_ROOT_SEL = typeof JEV_CHAT_ROOT_SEL !== 'undefined' ? JEV_CHAT_ROOT_SEL : null;
    
    // 更新window.JEV.CFG对象
    if (window.JEV && window.JEV.CFG) {
      window.JEV.CFG.AUTO_PUSH = JEV_AUTO_PUSH;
      window.JEV.CFG.SEND_MODE = JEV_SEND_MODE;
      window.JEV.CFG.CHAT_ONLY = JEV_CHAT_ONLY;
      window.JEV.CFG.CHAT_ROOT_SEL = JEV_CHAT_ROOT_SEL;
    }
    
    console.log('[JEV] 状态已更新到window.JEV_IS_ADMIN等全局变量和window.JEV.CFG对象');
    
    // 调用updateResultActions（如果存在）
    if (typeof updateResultActions === 'function') {
      try {
        updateResultActions();
      } catch (e) {
        console.error('[JEV] 调用updateResultActions失败:', e);
      }
    }
  } catch (e) {
    console.error('[JEV] renderFlags执行失败:', e);
  }
}`;

const renderFlagsRegex = /function renderFlags\([^)]*\)[^{]*\{[\s\S]*?\}/;
content = content.replace(renderFlagsRegex, newRenderFlags);

// 写入修复后的内容
fs.writeFileSync(filePath, content, 'utf8');
console.log('语法错误修复完成！');