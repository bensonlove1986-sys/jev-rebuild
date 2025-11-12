// ==UserScript==
/* global html2canvas, sendViaWorker, logUI */
/* eslint-disable curly, no-loop-func */
// @name         DAOJIE 聊天图片采集 → R2
// @name:en      DAOJIE Chat Image Capture → R2
// @name:zh-CN   DAOJIE 聊天图片采集 → R2
// @namespace    https://daojiemarketing.com/
// @version      1.0.0
// @description  自动截取聊天图片并上传到你的 Cloudflare Worker（存入 R2），确保100%可控拿图。
// @author       JEV
// @match        https://app.daojiemarketing.com/*
// @match        https://*.daojiemarketing.com/*
// @match        https://deepseek.com/*
// @match        https://*.deepseek.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

// 立即创建全局变量和调试功能
window.JEV_DEBUG_MODE = true;

// 添加控制台使用说明
console.log('=======================================');
console.log('🖼️ JEV嘉尔威跨境插件 - 控制台使用指南');
console.log('---------------------------------------');
console.log('📌 window.ensurePanel() - 创建主面板');
console.log('📌 window.logUI("消息") - 输出日志到面板');
console.log('📌 window.JEV_DEBUG_MODE - 当前调试模式: true');
console.log('=======================================');

// 立即尝试创建面板
setTimeout(() => {
  try {
    if (document.body && !document.getElementById('jev-upload-panel')) {
      console.log('JEV插件: 尝试自动创建面板...');
      window.ensurePanel();
    }
  } catch (e) {
    console.error('JEV插件: 自动创建面板失败:', e);
  }
}, 1000);

// 直接在window对象上定义ensurePanel函数 - 已禁用弹窗
window.ensurePanel = function ensurePanel() {
  try {
    console.log('[JEV] 弹窗已禁用，面板创建功能已关闭');
    console.log('[JEV] 功能仍可通过API使用');
  } catch (e) {
    console.error('[JEV] ensurePanel执行失败:', e);
  }
};

// createMainPanel函数 - 已禁用弹窗
function createMainPanel() {
  try {
    console.log('[JEV] 弹窗已禁用，面板创建功能已关闭');
    return null;
  } catch (e) {
    console.error('[JEV] 创建面板失败:', e);
    return null;
  }
}

// 立即尝试创建调试面板
(function createDebugPanelImmediate() {
  try {
    const checkBodyAndCreate = () => {
      if (document.body) {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'jev-debug-immediate';
        debugPanel.style.cssText = 'position:fixed;top:10px;left:100px;background:red;color:white;padding:20px;font-size:16px;z-index:999999 !important;display:block !important;visibility:visible !important;opacity:1 !important;pointer-events:auto !important;border:3px solid yellow';
        debugPanel.textContent = '� JEV调试面板';
        
        const createMainBtn = document.createElement('button');
        createMainBtn.textContent = '创建主面板';
        createMainBtn.style.cssText = 'margin-top:10px;padding:8px 16px;background:blue;color:white;border:none;border-radius:4px;cursor:pointer';
        createMainBtn.onclick = () => {
          try {
            window.ensurePanel();
            debugPanel.textContent += '\n✅ 主面板创建请求已发送';
          } catch (e) {
            debugPanel.textContent += '\n❌ 主面板创建失败: ' + e.message;
          }
        };
        debugPanel.appendChild(document.createElement('br'));
        debugPanel.appendChild(createMainBtn);
        
        document.body.appendChild(debugPanel);
        console.log('JEV调试面板已创建');
      } else {
        setTimeout(checkBodyAndCreate, 50);
      }
    };
    
    checkBodyAndCreate();
  } catch (e) {
    console.error('创建调试面板失败:', e);
  }
})();

(function() {
  'use strict';

  // ===== 工具函数 =====
  function log(...args) { console.log('[JEV-CAPTURE]', ...args); }
  function nowTs() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  function safeFileName(base) { return (base || '').replace(/[^a-zA-Z0-9._-]/g, '_'); }
  function pickSrc(img) { return img.currentSrc || img.src || ''; }
  function isDataUrl(s) { return /^data:image\//i.test(s || ''); }
  function isVisible(el) { try { const r = el.getBoundingClientRect(); return r.width > 3 && r.height > 3 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth; } catch { return true; } }
  function jevStoreGet(k, d){ try { if (typeof GM_getValue === 'function') { const v = GM_getValue(k); return (v === undefined ? d : v); } const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : d; } catch { return d; } }
  function jevStoreSet(k, v){ try { if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; } localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  // ===== 可配置区域 =====
  const WORKER_BASE = (window.JEV_WORKER_BASE || 'https://jevshop.bensonlove1986.workers.dev').replace(//+$/, '');
  const WEBHOOK_SECRET = (window.JEV_WEBHOOK_SECRET || 'jevindustry2025');
  // 初始化必要的全局变量
  let JEV_OCR = false;
  let JEV_TRANSLATE = true;
  let JEV_PUSH = false;
  let JEV_TARGET_LANG = jevStoreGet('JEV_TARGET_LANG', 'zh-CN');
  let isInsideChat = function(element) { return true; };
  const SCAN_INTERVAL_MS = 12000; // 自动扫描周期
  const CANVAS_SCALE = 1; // 截图分辨率倍数
  const IMG_SELECTORS = [
    '.chat-message img',
    'img[data-message-type="image"]',
    'img[src*="whatsapp"], img[src*="lookaside"]',
    'img' // 兜底，提高命中率
  ];
  let PAUSE_WHEN_HIDDEN = (typeof window.JEV_PAUSE_WHEN_HIDDEN === 'boolean' ? window.JEV_PAUSE_WHEN_HIDDEN : true);
  const BG_SCAN_INTERVAL_MS = 30000; // 后台扫描周期（允许后台运行时）
  let NOTIFY_UPLOAD = (typeof window.JEV_NOTIFY_UPLOAD === 'boolean' ? window.JEV_NOTIFY_UPLOAD : true);
  let ENABLED = (typeof window.JEV_ENABLED === 'boolean' ? window.JEV_ENABLED : true);
  let MAX_CONCURRENCY = (typeof window.JEV_MAX_CONCURRENCY === 'number' ? window.JEV_MAX_CONCURRENCY : 2);

  function ensureHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.async = true;
      s.onload = () => resolve(window.html2canvas);
      s.onerror = (e) => reject(new Error('html2canvas load failed'));
      document.head.appendChild(s);
    });
  }
  let JEV_WORKER_URL = jevStoreGet('JEV_WORKER_URL', (typeof WORKER_BASE !== 'undefined' ? WORKER_BASE : ''));
  let JEV_WEBHOOK_SECRET = jevStoreGet('JEV_WEBHOOK_SECRET', (typeof WEBHOOK_SECRET !== 'undefined' ? WEBHOOK_SECRET : ''));
  // 新增：会话/联系人/自动推送&报价配置
  let JEV_LOCATION_ID = jevStoreGet('JEV_LOCATION_ID', '');
  let JEV_CONTACT_ID = jevStoreGet('JEV_CONTACT_ID', '');
  let JEV_CONVERSATION_ID = jevStoreGet('JEV_CONVERSATION_ID', '');
  let JEV_AUTO_PUSH = jevStoreGet('JEV_AUTO_PUSH', false);
  let JEV_AUTO_QUOTE = jevStoreGet('JEV_AUTO_QUOTE', false);
  let JEV_SEND_MODE = jevStoreGet('JEV_SEND_MODE', 'ui');
  let JEV_IS_ADMIN = jevStoreGet('JEV_IS_ADMIN', false);
  // 新增：聊天区限定
  let JEV_CHAT_ONLY = jevStoreGet('JEV_CHAT_ONLY', true);
  let JEV_CHAT_ROOT_SEL = jevStoreGet('JEV_CHAT_ROOT_SEL', '');
  function getWorkerBase(){
    try {
      const host = String(location && location.hostname || '');
      const stored = String(JEV_WORKER_URL || '');
      const def = String((typeof WORKER_BASE !== 'undefined' ? WORKER_BASE : '')).replace(/\/+$/, '');
      const isLocalEndpoint = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(stored) || /:\d{4,5}\b/.test(stored);
      if (host === '127.0.0.1' || host === 'localhost' || isLocalEndpoint) {
        if (isLocalEndpoint) { JEV_WORKER_URL = def; try { jevStoreSet('JEV_WORKER_URL', JEV_WORKER_URL); } catch {} }
        return def;
      }
      return String(stored || def).replace(/\/+$/, '');
    } catch { return String((typeof WORKER_BASE !== 'undefined' ? WORKER_BASE : '')).replace(/\/+$/, ''); }
  }
  function getWebhookSecret(){ return String(JEV_WEBHOOK_SECRET || (typeof WEBHOOK_SECRET !== 'undefined' ? WEBHOOK_SECRET : '')); }
  function getLocationId(){ return String(JEV_LOCATION_ID || ''); }
  function getContactId(){ return String(JEV_CONTACT_ID || ''); }
  function getConversationId(){ return String(JEV_CONVERSATION_ID || ''); }
  let jevPanel = null; let jevLogBox = null; let jevStatusSpan = null; let jevToggleBtn = null; let jevConfigBtn = null; let jevFlagsBox = null;
  // 保留原ensurePanel函数以兼容现有代码
// ensurePanel - 已禁用UI面板创建
function ensurePanel(){
    try {
      // 弹窗已禁用，不再创建面板UI
      console.log('[JEV] 弹窗已禁用，UI面板创建功能已关闭');
      console.log('[JEV] 配置可以通过 window.JEV.CFG 和 window.JEV.STATE 手动设置');
      
      // 确保关键变量在window对象上可用，以便通过控制台访问
      if (!window.JEV) {
        window.JEV = window.JEV || {};
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
      
      // 保留空值，以避免依赖该变量的代码出现错误
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
  }
      jevFlagsBox = jevPanel.querySelector('#jev-flags');
      const jevLogToggleBtn = jevPanel.querySelector('#jev-log-toggle');
      const jevChatOnlyBtn = jevPanel.querySelector('#jev-chat-only-btn');
      jevToggleBtn.onclick = () => { try { const newVal = !(typeof ENABLED !== 'undefined' ? ENABLED : true); if (typeof ENABLED !== 'undefined') ENABLED = newVal; setStatus(newVal ? '运行中' : '已暂停'); jevToggleBtn.textContent = newVal ? '⏸️ 暂停' : '▶️ 继续'; logUI((newVal?'恢复运行':'已暂停') + '（右下角面板控制）'); if (window.JEV_CAPTURE && typeof window.JEV_CAPTURE.setEnabled === 'function') window.JEV_CAPTURE.setEnabled(newVal); } catch {} };
      jevConfigBtn.onclick = () => { try {
        // 弹窗已禁用，配置功能已关闭
        console.log('[JEV] 弹窗已禁用，配置功能已关闭');
        console.log('[JEV] 配置可以通过 window.JEV.CFG 手动设置');
        console.log('[JEV] 例如：window.JEV.CFG.LOCATION_ID = "your_location_id";');
        console.log('[JEV] 例如：window.JEV.CFG.AUTO_PUSH = true;');
        console.log('[JEV] 例如：window.JEV.CFG.SEND_MODE = "worker";');
      } catch (e) { console.error('[JEV] 配置功能执行失败:', e); } };
      renderFlags();
      try { ensureResultBox(); } catch {}
      try { ensureTranslateBox(); } catch {}
      try { ensureResultBox(); } catch {}
    } catch {}
  }
  // 确保绑定事件
  try { bindFlagEvents(); } catch (e) { console.error('Failed to bind flag events:', e); }
  // 替换：完整的 flags 展示，确保全局变量可访问
  function renderFlags(){ try {
    // 确保在window对象上定义关键变量
    window.JEV_IS_ADMIN = typeof JEV_IS_ADMIN !== 'undefined' ? JEV_IS_ADMIN : false;
    window.JEV_AUTO_PUSH = typeof JEV_AUTO_PUSH !== 'undefined' ? JEV_AUTO_PUSH : false;
    window.JEV_SEND_MODE = typeof JEV_SEND_MODE !== 'undefined' ? JEV_SEND_MODE : 'worker';
    window.JEV_CHAT_ONLY = typeof JEV_CHAT_ONLY !== 'undefined' ? JEV_CHAT_ONLY : false;
    window.JEV_CHAT_ROOT_SEL = typeof JEV_CHAT_ROOT_SEL !== 'undefined' ? JEV_CHAT_ROOT_SEL : null;
    const roleText = JEV_IS_ADMIN ? '管理员' : '客服';
    const adminBtn = JEV_IS_ADMIN ? '' : ' <button id="jev-admin-login" style="margin-left:6px;padding:2px 6px;font-size:12px">管理员登录</button>';
    const autoPush = `自动推送: ${JEV_AUTO_PUSH ? '开' : '关'} <label style="margin-left:6px;font-size:12px;"><input id="jev-auto-push-toggle" type="checkbox" ${JEV_AUTO_PUSH ? 'checked' : ''}> 切换</label>`;
    const sendModeText = `发送模式: ${JEV_SEND_MODE === 'worker' ? 'Worker 推送' : 'UI 填写'}`;
    const chatOnlyText = `仅聊天: ${JEV_CHAT_ONLY ? '开' : '关'}${JEV_CHAT_ROOT_SEL ? `｜容器: ${JEV_CHAT_ROOT_SEL}` : ''}`;
    jevFlagsBox.innerHTML = `角色: ${roleText}${adminBtn}<br>${autoPush}<br>${sendModeText}<br>${chatOnlyText}`;
    if (typeof updateResultActions === 'function') updateResultActions();
  } catch {} }
  function setStatus(msg){ console.log(`[JEV] 状态更新: ${String(msg||'')}`); }
  // 确保面板创建并设置状态
  try { 
    // 强制面板创建
    ensurePanel(); 
    
    // 确保所有面板相关变量暴露到window对象
    window.jevPanel = jevPanel;
    window.jevStatusSpan = jevStatusSpan;
    window.jevLogBox = jevLogBox;
    window.jevToggleBtn = jevToggleBtn;
    window.jevConfigBtn = jevConfigBtn;
    window.jevFlagsBox = jevFlagsBox;
    
    // 暴露关键函数到window对象
    window.renderFlags = renderFlags;
    window.setStatus = setStatus;
    window.logUI = logUI;
    
    // 暴露配置变量
    window.JEV_OCR = JEV_OCR;
    window.JEV_TRANSLATE = JEV_TRANSLATE;
    window.JEV_PUSH = JEV_PUSH;
    window.JEV_AUTO_PUSH = JEV_AUTO_PUSH;
    window.JEV_SEND_MODE = JEV_SEND_MODE;
    window.JEV_CHAT_ONLY = JEV_CHAT_ONLY;
    window.ENABLED = ENABLED;
    
    setStatus((typeof ENABLED !== 'undefined' ? (ENABLED?'运行中':'已暂停') : '启动中...'));
    
    // 确保面板可见性（使用更强制的样式）
    if (window.jevPanel) {
      // 移除任何可能隐藏面板的样式
      window.jevPanel.style.display = 'block !important';
      window.jevPanel.style.visibility = 'visible !important';
      window.jevPanel.style.opacity = '1 !important';
      window.jevPanel.style.position = 'fixed !important';
      window.jevPanel.style.zIndex = '999999 !important';
      window.jevPanel.style.pointerEvents = 'auto !important';
      window.jevPanel.style.left = '10px !important';
      window.jevPanel.style.right = 'auto !important';
      
      // 添加边框以确保可见性
      window.jevPanel.style.border = '2px solid #00ff00';
      
      console.log('JEV Panel initialized and made visible');
      console.log('可以通过控制台访问: window.ensurePanel(), window.renderFlags(), window.logUI()');
    }
    
    // 立即渲染标志
    renderFlags();
    
    // 在控制台打印使用说明
    console.log('🖼️ JEV插件已加载');
    console.log('📋 可用命令:');
    console.log('  - window.ensurePanel() - 创建/显示面板');
    console.log('  - window.renderFlags() - 刷新面板状态');
    console.log('  - window.logUI("消息") - 在面板显示日志');
    console.log('  - window.ENABLED = true/false - 启用/禁用插件');
    console.log('  - window.JEV_AUTO_PUSH = true/false - 启用/禁用自动推送');
  } catch (e) { 
    console.error('Panel initialization error:', e);
    // 即使出错，也尝试创建一个简单的调试面板
    try {
      const debugPanel = document.createElement('div');
      debugPanel.id = 'jev-debug-panel';
      debugPanel.style.cssText = 'position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:999999 !important;display:block !important;visibility:visible !important';
      debugPanel.textContent = 'JEV面板初始化失败，请检查控制台错误';
      document.body.appendChild(debugPanel);
    } catch (e2) {
      console.error('Failed to create debug panel:', e2);
    }
  }

  async function uploadBase64(base64Url, fileName) {
    logUI(`准备上传：${fileName}`);
    const body = { base64_url: base64Url, filename: fileName, ocr: (typeof JEV_OCR!=='undefined'?JEV_OCR:false), translate: (typeof JEV_TRANSLATE!=='undefined'?JEV_TRANSLATE:false), push: (typeof JEV_PUSH!=='undefined'?JEV_PUSH:false) || JEV_AUTO_PUSH, target_lang: (typeof JEV_TARGET_LANG!=='undefined'?JEV_TARGET_LANG:'zh-CN'), feature: 'DOCUMENT_TEXT_DETECTION', locationId: getLocationId(), contactId: getContactId(), conversationId: getConversationId() };
    const r = await fetch(`${getWorkerBase()}/receive-image`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || !j.success) { logUI(`❌ 上传失败：status=${r.status}`); throw new Error(`upload failed: status=${r.status} body=${JSON.stringify(j || {})}`); }
    logUI(`✅ 上传成功：${j.key || j.url || fileName}`);
    if (j.ocr_text) { logUI(`OCR：${String(j.ocr_text).slice(0,200)}`); }
    if (j.translated_text) { logUI(`翻译：${String(j.translated_text).slice(0,200)}`); }
    // 自动报价与发送（按选择）
    try {
      const textForQuote = String(j.translated_text || j.ocr_text || '').trim();
      if (JEV_AUTO_QUOTE && textForQuote) {
        const quote = `尊敬的客户，感谢您的咨询。基于您的需求，我们的报价如下：\n1. 基础服务：¥100\n2. 高级功能：¥200\n总计：¥300`;
        logUI(`报价草案：${quote.slice(0,200)}`);
        if (JEV_SEND_MODE === 'worker') {
          await sendViaWorker(quote);
          logUI('已通过 Worker 发送报价');
        } else {
          const ok = sendViaUI(quote);
          logUI(ok ? '已通过页面UI发送报价' : '页面UI未找到输入框，发送失败');
        }
      } else if (JEV_AUTO_PUSH) {
        const toSend = String(j.translated_text || j.ocr_text || `已上传图片：${j.worker_url || j.url || fileName}`).slice(0,500);
        if (JEV_SEND_MODE === 'worker') { await sendViaWorker(toSend); logUI('已通过 Worker 推送文本'); } else { const ok = sendViaUI(toSend); logUI(ok ? '已通过页面UI推送文本' : '页面UI未找到输入框，推送失败'); }
      }
    } catch (e) { logUI('自动发送失败：' + e.message); }
    return j;
  }
  async function getBase64ViaWorker(srcUrl) {
    logUI(`尝试直链拿图：${srcUrl.slice(0,80)}...`);
    const body = { url: srcUrl, mode: 'json' };
    const r = await fetch(`${getWorkerBase()}/get-image-by-url`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || !j.success || !j.base64_url) { logUI('直链拿图失败，改用前端截图'); throw new Error(`get-image-by-url failed: status=${r.status}`); }
    logUI('直链拿图成功');
    return j.base64_url;
  }

  async function captureImgToDataUrl(img) { // 避免重复声明
    const html2canvas = await ensureHtml2Canvas();
    try {
      const canvas = await html2canvas(img, { useCORS: true, scale: CANVAS_SCALE });
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl.length < 64) throw new Error('empty dataUrl');
      return dataUrl;
    } catch (e) {
      throw e; // 上层处理退路
    }
  }

  // 显式展示"设置"按钮，便于现场切换与排查
  try { if (jevConfigBtn) { jevConfigBtn.style.display = ''; } } catch {}
// 绑定"管理员登录/自动推送开关"的事件（仅定义一次）
  function bindFlagEvents(){
    try {
      // 弹窗已禁用，移除所有UI相关事件绑定
      console.log('[JEV] bindFlagEvents函数已禁用UI相关功能');
      console.log('[JEV] 管理员模式可通过控制台设置：JEV_IS_ADMIN = true; jevStoreSet(\'JEV_IS_ADMIN\', true);');
      console.log('[JEV] 自动推送可通过控制台设置：JEV_AUTO_PUSH = true/false; jevStoreSet(\'JEV_AUTO_PUSH\', JEV_AUTO_PUSH);');
    } catch (e) {
      console.error('[JEV] bindFlagEvents执行失败:', e);
    }
  }
  // 管理员密码门 + 设置面板展示与保存（覆盖原有点击逻辑）
  if (jevConfigBtn) {
    jevConfigBtn.onclick = () => {
      try {
        if (!JEV_IS_ADMIN) {
          const pwd = prompt('请输入管理员密码');
          if (pwd === 'jev') {
            JEV_IS_ADMIN = true;
            jevStoreSet('JEV_IS_ADMIN', true);
            logUI('管理员已登录');
            renderFlags();
          } else {
            logUI('管理员密码错误');
            return;
          }
        }
        const box = jevPanel.querySelector('#jev-settings');
        const inpWorker = jevPanel.querySelector('#jev-set-worker');
        const inpSecret = jevPanel.querySelector('#jev-set-secret');
        const chkAutoPush = jevPanel.querySelector('#jev-auto-push');
        const chkChatOnly = jevPanel.querySelector('#jev-chat-only');
        const inpChatSel = jevPanel.querySelector('#jev-chat-sel');
        const inpInputSel = jevPanel.querySelector('#jev-input-sel');
        if (!box) { logUI('设置面板未找到'); return; }

        // 展示并填充当前值
        if (inpWorker) inpWorker.value = getWorkerBase() || '';
        if (inpSecret) inpSecret.value = getWebhookSecret() || '';
        if (chkAutoPush) chkAutoPush.checked = !!JEV_AUTO_PUSH;
        if (chkChatOnly) chkChatOnly.checked = !!JEV_CHAT_ONLY;
        if (inpChatSel) inpChatSel.value = String(JEV_CHAT_ROOT_SEL || '');
        if (inpInputSel) inpInputSel.value = String(jevStoreGet('JEV_INPUT_SEL', '') || '');
        box.style.display = 'block';

        // 只绑定一次保存/关闭事件
        if (!box.dataset.bound) {
          const btnSave = jevPanel.querySelector('#jev-settings-save');
          const btnClose = jevPanel.querySelector('#jev-settings-close');
          if (btnSave) { btnSave.onclick = () => {
            try {
              if (inpWorker) { JEV_WORKER_URL = (inpWorker.value || '').trim(); jevStoreSet('JEV_WORKER_URL', JEV_WORKER_URL); }
              if (inpSecret) { JEV_WEBHOOK_SECRET = (inpSecret.value || '').trim(); jevStoreSet('JEV_WEBHOOK_SECRET', JEV_WEBHOOK_SECRET); }
              if (chkAutoPush) { JEV_AUTO_PUSH = !!chkAutoPush.checked; jevStoreSet('JEV_AUTO_PUSH', JEV_AUTO_PUSH); }
              if (chkChatOnly) { JEV_CHAT_ONLY = !!chkChatOnly.checked; jevStoreSet('JEV_CHAT_ONLY', JEV_CHAT_ONLY); }
              if (inpChatSel) { JEV_CHAT_ROOT_SEL = (inpChatSel.value || '').trim(); jevStoreSet('JEV_CHAT_ROOT_SEL', JEV_CHAT_ROOT_SEL); }
              if (inpInputSel) { const v = (inpInputSel.value || '').trim(); jevStoreSet('JEV_INPUT_SEL', v); }
              box.style.display = 'none'; renderFlags(); logUI('设置已保存'); scanAll();
            } catch (e) { logUI('保存失败：' + (e.message || e)); }
          };
          if (btnClose) btnClose.onclick = () => { box.style.display = 'none'; };
          box.dataset.bound = '1';
        }
      } catch (e) {
        logUI('设置失败：' + (e.message || e));
      }
    };
  }

  // 提供一个可复用方法：更新回传文字到面板
  function setResultText(txt) { try { setResultTextDom(txt); } catch {} }
  async function getBase64ViaWorker(srcUrl) {
    logUI(`尝试直链拿图：${srcUrl.slice(0,80)}...`);
    const body = { url: srcUrl, mode: 'json' };
    const r = await fetch(`${getWorkerBase()}/get-image-by-url`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || !j.success || !j.base64_url) { logUI('直链拿图失败，改用前端截图'); throw new Error(`get-image-by-url failed: status=${r.status}`); }
    logUI('直链拿图成功');
    return j.base64_url;
  }

  async function captureImgToDataUrl(img) {
    const html2canvas = await ensureHtml2Canvas();
    try {
      const canvas = await html2canvas(img, { useCORS: true, scale: CANVAS_SCALE });
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl.length < 64) throw new Error('empty dataUrl');
      return dataUrl;
    } catch (e) {
      throw e; // 上层处理退路
    }
  }

  // 已处理去重集合（避免重复上传）
  const seen = new Set();
  function seenKey(img) {
    try {
      const src = pickSrc(img) || '';
      // 仅使用图片源作为去重键，避免不同 alt/title 导致重复
      if (!src) return '';
      // 对 dataURL 只取前 120 字符作为键，减少内存占用
      if (isDataUrl(src)) return src.slice(0, 120);
      // 规范化 URL（去掉查询参数中可能变化但不影响内容的片段）
      try { const u = new URL(src, location.href); return u.origin + u.pathname; } catch { return src; }
    } catch { return pickSrc(img) || ''; }
  }

  function notify(text, title = '图片上传成功') {
    if (!NOTIFY_UPLOAD) return;
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') { new Notification(title, { body: text }); return; }
        if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body: text }); });
        }
      }
      const id = 'jev-toast';
      let box = document.getElementById(id);
      if (!box) {
        box = document.createElement('div');
        box.id = id;
        box.style.cssText = 'position:fixed;left:12px;bottom:90px;z-index:999999;font:14px/1.4 system-ui,Arial;color:#fff;background:rgba(0,0,0,0.75);padding:8px 12px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.2);';
        document.body.appendChild(box);
      }
      const item = document.createElement('div');
      item.textContent = text;
      box.appendChild(item);
      setTimeout(() => { try { box.removeChild(item); if (!box.childElementCount) box.remove(); } catch {} }, 4000);
    } catch (e) { log('notify error:', e.message); }
  }

  let activeCount = 0; const queue = [];
  function runTask(fn) { if (activeCount < MAX_CONCURRENCY) startTask(fn); else queue.push(fn); }
  function startTask(fn) { activeCount++; Promise.resolve().then(fn).catch(err => log('task error:', err && (err.message || err))).finally(() => { activeCount--; const next = queue.shift(); if (next) startTask(next); }); }
  // 批量刷新日志，降低频繁 DOM 变更带来的卡顿
  let jevLogQueue = []; let jevLogScheduled = false;
  // 将logUI暴露到window对象 - 已禁用UI功能
  window.logUI = function logUI(msg){
    try {
      console.log('[JEV-UI]', msg);
      // 弹窗已禁用，不再尝试任何UI操作
      if (true) {
        // 如果仍然没有日志框，至少记录到控制台
        console.log('[JEV-LOG]', msg);
        return;
      }
      
      jevLogQueue.push(`${new Date().toLocaleTimeString()} ➜ ${msg}`);
      if (!jevLogScheduled) {
        jevLogScheduled = true;
        const flush = () => {
          try {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < jevLogQueue.length; i++) {
              const line = document.createElement('div');
              line.textContent = jevLogQueue[i];
              frag.insertBefore(line, frag.firstChild);
            }
            jevLogBox.prepend(frag);
            jevLogQueue = [];
            const max = 60;
            while (jevLogBox.children.length > max) { jevLogBox.removeChild(jevLogBox.lastChild); }
          } finally {
            jevLogScheduled = false;
          }
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush); else setTimeout(flush, 50);
      }
    } catch {}
  }
  // 全局暴露 logUI 函数
  window.logUI = logUI;
  // 速率限制：每分钟最多处理若干张，防止忙时阻塞页面
  let JEV_MAX_PER_MINUTE = jevStoreGet('JEV_MAX_PER_MINUTE', 20); let _processTokens = JEV_MAX_PER_MINUTE;
  function refillTokens(){ _processTokens = JEV_MAX_PER_MINUTE; }
  setInterval(refillTokens, 60000);
  function enqueueProcess(img) {
    runTask(() => new Promise((resolve) => {
      const runner = () => Promise.resolve().then(() => processImage(img)).catch(() => {}).finally(resolve);
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => runner(), { timeout: 2000 }); else setTimeout(runner, 0);
    }));
  }

  async function processImage(img) {
    try {
      if (_processTokens <= 0) { logUI('速率已满，本分钟暂缓处理'); return; }
      _processTokens--;
      const key = seenKey(img);
      if (!key) return;
      if (img.dataset.jevUploaded === '1' || seen.has(key)) return;

      let src = pickSrc(img);
      let base64Url = null;
      let fileName = safeFileName(img.getAttribute('alt') || img.getAttribute('title') || `whatsapp_${nowTs()}.png`);
      if (!fileName.toLowerCase().endsWith('.png') && !fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) { fileName = `${fileName}.png`; }
      logUI('检测到图片');
      if (isDataUrl(src)) { base64Url = src; logUI('直接使用数据URL'); }
      else {
        if (src && /^https?:/i.test(src)) {
          try { base64Url = await getBase64ViaWorker(src); } catch (e1) { logUI('Worker 拿图失败，改用前端截图'); }
        }
        if (!base64Url) {
          try { base64Url = await captureImgToDataUrl(img); logUI('已前端截图'); } catch (e2) { logUI('前端截图失败：' + e2.message); }
        }
      }

      if (!base64Url) { logUI('放弃：未获取到图片数据'); return; }
      const up = await uploadBase64(base64Url, fileName);
      notify('已上传到R2');
      img.dataset.jevUploaded = '1';
      seen.add(key);
    } catch (e) {
      logUI('❌ 处理失败：' + (e.message||e));
    }
  }

  // 观察器初始化（缺失情况下提供兜底）
  let io = null;
  let ioObserved = new WeakSet();
  function ensureIO() {
    if (io) return;
    try {
      if (typeof IntersectionObserver !== 'function') {
        io = {
          observe: (img) => { try { enqueueProcess(img); } catch {} },
          unobserve: () => {},
          disconnect: () => {}
        };
        return;
      }
      ioObserved = new WeakSet();
      io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          try {
            const img = en.target;
            if (en.isIntersecting && isVisible(img)) { enqueueProcess(img); }
          } catch {}
        }
      }, { root: null, rootMargin: '0px', threshold: 0.1 });
    } catch {}
  }

  function scanAll() {
    if (!ENABLED) { log('scan skipped: disabled'); return; }
    ensureIO();
    const nodes = [];
    IMG_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => nodes.push(el)));
    const visible = nodes.filter(isVisible);
    log('scan counts:', { matched: nodes.length, visible: visible.length });
    visible.forEach(img => { if (!ioObserved.has(img)) { ioObserved.add(img); io.observe(img); } });
  }

  function observeNewImages() {
    ensureIO();
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes && m.addedNodes.forEach(n => {
          try {
            const currentEnabled = ENABLED;
            const currentInsideChat = isInsideChat;
            const currentVisible = isVisible;
            const currentIoObserved = ioObserved;
            const currentIo = io;
            if (!currentEnabled) return;
            if (n.nodeType === 1) {
              if (n.tagName === 'IMG' && currentVisible(n) && currentInsideChat(n)) { if (!currentIoObserved.has(n)) { currentIoObserved.add(n); currentIo.observe(n); } }
              n.querySelectorAll && n.querySelectorAll('img').forEach(img => { if (currentVisible(img) && currentInsideChat(img)) { if (!currentIoObserved.has(img)) { currentIoObserved.add(img); currentIo.observe(img); } } });
            }
          } catch {}
        });
      }
    });
    const observeBody = () => { try { if (document.body) { mo.observe(document.body, { childList: true, subtree: true }); } } catch {} };
    if (document.body) { observeBody(); } else { document.addEventListener('DOMContentLoaded', observeBody, { once: true }); }
  }

  // 暴露手动触发方法（稳妥的全局对象 + 直接函数）
  window.JEV_CAPTURE = Object.assign(window.JEV_CAPTURE || {}, {
    scanAll,
    counts: () => {
      const nodes = [];
      IMG_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => nodes.push(el)));
      const visible = nodes.filter(isVisible);
      return { matched: nodes.length, visible: visible.length };
    },
    setBackground(enabled = true) { PAUSE_WHEN_HIDDEN = !enabled; startScanTimer && startScanTimer(); },
    setEnabled(enabled = true) { ENABLED = !!enabled; startScanTimer && startScanTimer(); },
    setNotify(flag = true) { NOTIFY_UPLOAD = !!flag; },
    setConcurrency(n = 2) { MAX_CONCURRENCY = Math.max(1, Number(n) || 1); },
    setOcr(flag = true) { JEV_OCR = !!flag; },
    setTranslate(flag = true) { JEV_TRANSLATE = !!flag; },
    setPush(flag = false) { JEV_PUSH = !!flag; },
    setTargetLang(lang = 'zh-CN') { JEV_TARGET_LANG = String(lang || 'zh-CN'); },
    status: () => ({ enabled: ENABLED, pauseWhenHidden: PAUSE_WHEN_HIDDEN, notify: NOTIFY_UPLOAD, concurrency: MAX_CONCURRENCY, active: activeCount, queued: queue.length, ocr: JEV_OCR, translate: JEV_TRANSLATE, push: JEV_PUSH, targetLang: JEV_TARGET_LANG })
  });

  Object.defineProperty(window, 'captureAllImages', { value: () => window.JEV_CAPTURE.scanAll(), writable: true, configurable: true });

  // 启动
  observeNewImages();
  scanAll();

  let scanTimer = null;
  function startScanTimer() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    const interval = (document.hidden && !PAUSE_WHEN_HIDDEN) ? BG_SCAN_INTERVAL_MS : SCAN_INTERVAL_MS;
    scanTimer = setInterval(() => {
      if (!ENABLED) return;
      if (document.hidden) {
        if (!PAUSE_WHEN_HIDDEN) scanAll();
      } else {
        scanAll();
      }
    }, interval);
    log('scan timer set:', { hidden: document.hidden, pause: PAUSE_WHEN_HIDDEN, interval, enabled: ENABLED });
  }
  document.addEventListener('visibilitychange', startScanTimer);
  startScanTimer();

  log('DAOJIE capture script active. Worker:', WORKER_BASE);
})();

// 修复：sendViaUI 输入框选择器
// 通过UI发送文本 - 已禁用
function sendViaUI(text) {
  // 弹窗已禁用，此函数不再执行任何操作
  console.log('[JEV] 弹窗已禁用，UI发送功能已关闭');
  console.log('[JEV] 配置可以通过 window.JEV.CFG 和 window.JEV.STATE 手动设置');
  console.log('[JEV] 尝试发送的文本:', text);
  return false;
}

// 新增：客户端翻译纯文本（Google Translate 非官方接口）
async function translateTextClient(text, target = (typeof JEV_TARGET_LANG!=='undefined'?JEV_TARGET_LANG:'zh-CN')) {
  const q = String(text || '').trim(); if (!q) return '';
  try {
    const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(q)}`;
    const r = await fetch(u, { method: 'GET' });
    const t = await r.text();
    let a = null; try { a = JSON.parse(t); } catch {}
    const chunks = Array.isArray(a?.[0]) ? a[0].map(x => x?.[0]).filter(Boolean) : [];
    return chunks.length ? chunks.join('') : q;
  } catch { return q; }
}
function renderFlags(){
  try {
    // 弹窗已禁用，不再尝试创建或更新面板
    console.log('[JEV] 弹窗已禁用，renderFlags函数仅输出到控制台');
    const roleText = window.JEV_IS_ADMIN ? '管理员' : '客服';
    console.log('[JEV-Flags] 角色:', roleText);
    console.log('[JEV-Flags] 自动推送:', window.JEV_AUTO_PUSH ? '✅' : '❌');
    console.log('[JEV-Flags] 发送模式:', window.JEV_SEND_MODE === 'worker' ? 'Worker 推送' : 'UI 填写');
    console.log('[JEV-Flags] 仅聊天:', window.JEV_CHAT_ONLY ? '✅' : '❌' + (window.JEV_CHAT_ROOT_SEL ? ` | 容器: ${window.JEV_CHAT_ROOT_SEL}` : ''));
    
    // 绑定管理员登录按钮事件
    const adminLoginBtn = jevPanel.querySelector('#jev-admin-login');
    if (adminLoginBtn) {
      adminLoginBtn.onclick = () => {
        const pw = prompt('请输入管理员密码：');
        if (pw === 'admin123') {
          window.JEV_IS_ADMIN = true;
          jevStoreSet('JEV_IS_ADMIN', true);
          renderFlags();
          logUI('✅ 管理员登录成功');
        } else {
          logUI('❌ 密码错误');
        }
      };
    }
    
    // 绑定自动推送切换事件
    const autoPushToggle = jevPanel.querySelector('#jev-auto-push-toggle');
    if (autoPushToggle) {
      autoPushToggle.onchange = () => {
        window.JEV_AUTO_PUSH = autoPushToggle.checked;
        jevStoreSet('JEV_AUTO_PUSH', window.JEV_AUTO_PUSH);
        logUI(`自动推送已${window.JEV_AUTO_PUSH ? '开启' : '关闭'}`);
      };
    }
    
    // 调用其他可能的增强函数
    try {
      if (typeof enhanceSettingsPanel === 'function') enhanceSettingsPanel();
    } catch (e) { log('enhanceSettingsPanel error:', e.message); }
    try {
      if (typeof updateResultActions === 'function') updateResultActions();
    } catch (e) { log('updateResultActions error:', e.message); }
  } catch (e) { 
    log('renderFlags error:', e.message);
    try {
      if (jevFlagsBox) {
        jevFlagsBox.innerHTML = '角色: 客服<br>自动推送: 关<br>发送模式: UI 填写<br>仅聊天: 开';
      }
    } catch {}
  }
}

// 初始化翻译区域和结果区域
setTimeout(() => {
  try { ensureTranslateBox(); ensureResultBox(); ensureCsBox(); } catch {}
}, 500);

// 注意：上传成功后的处理已经在 uploadBase64 函数中完成

// 新增：确保“回传文字”区域存在 & 设置文本
function ensureResultBox() {
    try {
      // 弹窗已禁用，结果展示功能已关闭
      console.log('[JEV] 弹窗已禁用，结果展示框功能已关闭');
      console.log('[JEV] 识别结果将通过控制台输出');
      return;
    } catch (e) {
      console.error('[JEV] ensureResultBox执行失败:', e);
    }
    ensurePanel();
    if (!jevPanel || !jevLogBox) return;
    let box = jevPanel.querySelector('#jev-result');
    if (!box) {
      const jevResBox = document.createElement('div');
      jevResBox.id = 'jev-result';
      jevResBox.style.cssText = 'margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px';
      jevResBox.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>📝 回传文字</b><div style="flex:1"></div><button id="jev-copy-result" style="padding:4px 8px;font-size:12px">复制</button><button id="jev-send-result" style="padding:4px 8px;font-size:12px">推送</button><button id="jev-generate-cs" style="padding:4px 8px;font-size:12px">生成客服回复</button></div><div id="jev-result-text" style="white-space:pre-wrap;max-height:140px;overflow:auto;font-size:14px;line-height:1.5;color:#fffa"></div>';
      jevPanel.insertBefore(jevResBox, jevLogBox);
      try { updateResultActions(); } catch {}

      const copyBtn = jevPanel.querySelector('#jev-copy-result');
      if (copyBtn) copyBtn.onclick = () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? el.textContent || '' : '';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t);
            logUI('已复制回传文字');
          } else {
            throw new Error('clipboard API not available');
          }
        } catch {
          try {
            if (el) {
              const r = document.createRange(); r.selectNodeContents(el);
              const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
              document.execCommand('copy'); sel.removeAllRanges();
              logUI('已复制回传文字');
            }
          } catch {}
        }
      };
      const sendBtn = jevPanel.querySelector('#jev-send-result');
      if (sendBtn) sendBtn.onclick = () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? el.textContent || '' : '';
        const ok = sendViaUI(t);
        logUI(ok ? '已推送回传文字到输入框' : '页面UI未找到输入框，推送失败');
      };
      const genBtn = jevPanel.querySelector('#jev-generate-cs');
      if (genBtn) genBtn.onclick = async () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? (el.textContent || '') : '';
        const text = String(t || '').trim();
        if (!text) { logUI('没有可用于生成的文本'); return; }
        genBtn.disabled = true; const oldTxt = genBtn.textContent; genBtn.textContent = '生成中...';
        try {
          const systemMsg = '你是一名中文客服。先迅速判断客户的语气与意图（礼貌/着急/愤怒/困惑/正式/随意/请求帮助/投诉等），并据此调整回复的语气、礼貌程度和长度。仅输出最终客服回复，不要解释分析过程。要求：简洁、友好、专业；先表达同理心或确认，再给出解决方案或下一步引导；必要时分点说明；使用简体中文；避免机械口吻与过度道歉。';
          const body = { system: systemMsg, prompt: text, model: 'deepseek-chat', temperature: 0.7, top_p: 0.95 };
          const r = await fetch(`${getWorkerBase()}/deepseek-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
          const respTxt = await r.text(); let j = null; try { j = JSON.parse(respTxt); } catch {}
          if (r.ok && j && j.success && j.content) {
            setResultText(j.content);
            logUI('已生成客服回复');
          } else {
            const err = (j && j.error) ? j.error : `HTTP ${r.status}`;
            logUI('生成失败：' + err);
          }
        } catch (e) {
          logUI('生成失败：' + (e.message || e));
        } finally {
          genBtn.disabled = false; genBtn.textContent = oldTxt || '生成客服回复';
        }
      };
      updateResultActions();
    }
    // 每次确保调用都刷新一次按钮可见性
    updateResultActions();
  } catch {}
}
function setResultText(txt) {
  try {
    ensureResultBox();
    const el = jevPanel.querySelector('#jev-result-text');
    if (el) el.textContent = String(txt || '');
  } catch {}
}

// 新增：根据页面实际情况调整“回传文字”区的按钮状态
function updateResultActions() {
  try {
    ensurePanel();
    const sendBtn = jevPanel.querySelector('#jev-send-result');
    const copyBtn = jevPanel.querySelector('#jev-copy-result');
    if (copyBtn) { copyBtn.disabled = false; }
    if (sendBtn) {
      const customSel = jevStoreGet('JEV_INPUT_SEL', '');
      const baseCandidates = ['textarea','input[type="text"]','[contenteditable="true"]','.ql-editor[contenteditable="true"]','.chat-input textarea','.composer textarea','[data-testid="chat-input"]'];
      const candidates = customSel ? [customSel, ...baseCandidates] : baseCandidates;
      let el = null;
      for (const sel of candidates) { const found = document.querySelector(sel); if (found) { el = found; break; } }
      const ok = !!el;
      sendBtn.disabled = !ok;
      sendBtn.style.opacity = ok ? '' : '0.6';
      sendBtn.title = ok ? '' : '未找到输入框';
    }
  } catch {}
}

// 新增：通过 Worker 发送消息
async function sendViaWorker(text) {
  try {
    if (!text || typeof text !== 'string') return false;
    const body = {
      text: text.trim(),
      locationId: getLocationId(),
      contactId: getContactId(),
      conversationId: getConversationId()
    };
    const r = await fetch(`${getWorkerBase()}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': getWebhookSecret()
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j || !j.success) throw new Error(j?.error || 'Unknown error');
    return true;
  } catch (e) {
    logUI('Worker 发送失败：' + (e.message || e));
    return false;
  }
}

// 新增：根据配置自动推送文本
function autoPushTextIfEnabled(text) {
  try {
    if (!JEV_AUTO_PUSH || !text || typeof text !== 'string') return;
    const t = text.trim();
    if (!t) return;
    if (JEV_SEND_MODE === 'worker') {
      sendViaWorker(t).catch(err => logUI('自动推送失败：' + err.message));
    } else {
      sendViaUI(t);
    }
  } catch (e) {
    logUI('自动推送错误：' + (e.message || e));
  }
}

// === 新增：翻译框（源文/译文 + 语言选择 + 操作按钮） ===
function ensureTranslateBox(){
  try {
    ensurePanel();
    if (!jevPanel || !jevLogBox) return;
    let box = jevPanel.querySelector('#jev-translate');
    if (!box) {
      box = document.createElement('div');
      box.id = 'jev-translate';
      box.style.cssText = 'margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px;resize:both;overflow:auto;min-width:300px;min-height:120px;max-width:80vw;max-height:70vh' ;
      const curLang = (typeof JEV_TARGET_LANG !== 'undefined' ? JEV_TARGET_LANG : (jevStoreGet('JEV_TARGET_LANG','zh-CN')));
      box.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <b>🌐 翻译框</b>
          <div style="flex:1"></div>
          <label style="font-size:12px;opacity:.9">目标语言</label>
          <select id="jev-translate-lang" style="padding:3px 6px;font-size:12px">
            <option value="zh-CN">中文(zh-CN)</option>
            <option value="en">English(en)</option>
            <option value="es">Español(es)</option>
            <option value="ja">日本語(ja)</option>
            <option value="ko">한국어(ko)</option>
            <option value="fr">Français(fr)</option>
          </select>
          <button id="jev-translate-run" style="padding:4px 8px;font-size:12px">翻译</button>
          <button id="jev-translate-copy" style="padding:4px 8px;font-size:12px">复制译文</button>
          <button id="jev-translate-push" style="padding:4px 8px;font-size:12px">推送译文</button>
          <button id="jev-translate-clear" style="padding:4px 8px;font-size:12px">清空</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <textarea id="jev-translate-src" placeholder="原文" style="min-height:90px;resize:both;font-size:14px"></textarea>
          <textarea id="jev-translate-out" placeholder="译文" style="min-height:90px;resize:both;font-size:14px"></textarea>
        </div>`;
      const TW = parseInt(String(jevStoreGet('JEV_TRANSLATE_W','0')||'0'),10);
      const TH = parseInt(String(jevStoreGet('JEV_TRANSLATE_H','0')||'0'),10);
      if (TW>0) box.style.width = TW+'px';
      if (TH>0) box.style.height = TH+'px';
      jevPanel.insertBefore(box, jevLogBox);
      // 翻译框增加拖拽缩放把手（确保在部分环境下可见、可用）
      try {
        box.style.position = 'relative';
        const tHandle = document.createElement('div');
        tHandle.id = 'jev-translate-resizer';
        tHandle.style.cssText = 'position:absolute;right:6px;bottom:6px;width:14px;height:14px;cursor:se-resize;background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.08));border-radius:2px;opacity:.8';
        tHandle.title = '拖拽此角以调整翻译框大小';
        box.appendChild(tHandle);
        (function(){
          let startX=0,startY=0,startW=0,startH=0,drag=false;
          const onMove = (e) => {
            if (!drag) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const w = Math.max(300, startW + dx);
            const h = Math.max(120, startH + dy);
            box.style.width = w + 'px';
            box.style.height = h + 'px';
          };
          const onUp = () => {
            if (!drag) return; drag=false;
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            try {
              const w = parseInt(String(box.style.width||'').replace(/px$/,''),10);
              const h = parseInt(String(box.style.height||'').replace(/px$/,''),10);
              if (w>0) jevStoreSet('JEV_TRANSLATE_W', w);
              if (h>0) jevStoreSet('JEV_TRANSLATE_H', h);
            } catch {}
          };
          tHandle.addEventListener('mousedown',(e)=>{
            try {
              e.preventDefault();
              startX = e.clientX; startY = e.clientY;
              const rect = box.getBoundingClientRect();
              startW = rect.width; startH = rect.height; drag=true;
              document.addEventListener('mousemove', onMove, true);
              document.addEventListener('mouseup', onUp, true);
            } catch {}
          }, true);
        })();
      } catch {}

      try {
        const ro = new ResizeObserver((entries)=>{
          try {
            const r = entries && entries[0] && entries[0].contentRect ? entries[0].contentRect : null;
            if (r) { jevStoreSet('JEV_TRANSLATE_W', Math.round(r.width||0)); jevStoreSet('JEV_TRANSLATE_H', Math.round(r.height||0)); }
          } catch {}
        });
        ro.observe(box);
      } catch {}

      const selLang = box.querySelector('#jev-translate-lang');
      if (selLang) {
        selLang.value = String(curLang || 'zh-CN');
        selLang.onchange = () => { try { JEV_TARGET_LANG = selLang.value; jevStoreSet('JEV_TARGET_LANG', JEV_TARGET_LANG); logUI('目标语言：' + JEV_TARGET_LANG); } catch {} };
      }
      const runBtn = box.querySelector('#jev-translate-run');
      if (runBtn) runBtn.onclick = async () => {
        try {
          const src = box.querySelector('#jev-translate-src');
          const out = box.querySelector('#jev-translate-out');
          const t = (src && src.value || '').trim(); if (!t) return;
          const lang = (selLang && selLang.value) || (typeof JEV_TARGET_LANG!=='undefined'?JEV_TARGET_LANG:'zh-CN');
          const res = await translateTextClient(t, lang);
          if (out) out.value = res || t;
          setResultText(res || t);
          autoPushTextIfEnabled(res || t);
          try { ensureCsBox(); if (getAutoCsEnabled()) { await generateCsFrom(res || t); } } catch {}
          logUI('手动翻译完成');
        } catch (e) { logUI('手动翻译失败：' + (e.message || e)); }
      };
      const copyBtn = box.querySelector('#jev-translate-copy');
      if (copyBtn) copyBtn.onclick = () => {
        try { const out = box.querySelector('#jev-translate-out'); const t = out ? (out.value||'') : ''; navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : null; logUI('已复制译文'); } catch {}
      };
      const pushBtn = box.querySelector('#jev-translate-push');
      if (pushBtn) pushBtn.onclick = () => {
        const out = box.querySelector('#jev-translate-out');
        const t = out ? (out.value||'') : '';
        const ok = sendViaUI(t);
        logUI(ok ? '已推送译文到输入框' : '页面UI未找到输入框，推送失败');
      };
      const clearBtn = box.querySelector('#jev-translate-clear');
      if (clearBtn) clearBtn.onclick = () => {
        const src = box.querySelector('#jev-translate-src');
        const out = box.querySelector('#jev-translate-out');
        if (src) src.value = '';
        if (out) out.value = '';
        setResultText('');
      };
    }
  } catch {}
}
// 新增：客服推荐回复区域 + 自动生成
function ensureCsBox(){
  try {
    ensurePanel(); if (!jevPanel || !jevLogBox) return;
    let cs = jevPanel.querySelector('#jev-cs-suggest');
    if (!cs) {
      cs = document.createElement('div');
      cs.id = 'jev-cs-suggest';
      cs.style.cssText = 'margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px';
      cs.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>🤖 客服推荐回复</b><div style="flex:1"></div><label style="font-size:12px"><input id="jev-auto-cs-toggle" type="checkbox"> 自动生成</label><button id="jev-cs-copy" style="padding:4px 8px;font-size:12px">复制</button><button id="jev-cs-push" style="padding:4px 8px;font-size:12px">推送</button><button id="jev-cs-regenerate" style="padding:4px 8px;font-size:12px">重新生成</button></div><div id="jev-cs-text" style="white-space:pre-wrap;max-height:160px;overflow:auto;font-size:14px;line-height:1.5;color:#fffa"></div>';
      jevPanel.insertBefore(cs, jevLogBox);
      const chk = jevPanel.querySelector('#jev-auto-cs-toggle'); if (chk) { try { chk.checked = getAutoCsEnabled(); } catch {} chk.onchange = () => { try { setAutoCsEnabled(!!chk.checked); if (chk.checked) { const out = jevPanel.querySelector('#jev-translate-out'); const src = jevPanel.querySelector('#jev-translate-src'); const resEl = jevPanel.querySelector('#jev-result-text'); const t = (out && out.value && out.value.trim()) || (resEl && resEl.textContent && resEl.textContent.trim()) || (src && src.value && src.value.trim()) || ''; if (t) generateCsFrom(t); } } catch {} }; }
      const copyBtn = jevPanel.querySelector('#jev-cs-copy'); if (copyBtn) copyBtn.onclick = () => { try { const el = jevPanel.querySelector('#jev-cs-text'); const t = el ? (el.textContent||'') : ''; if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); logUI('已复制客服推荐回复'); } } catch {} };
      const pushBtn = jevPanel.querySelector('#jev-cs-push'); if (pushBtn) pushBtn.onclick = () => { const el = jevPanel.querySelector('#jev-cs-text'); const t = el ? (el.textContent||'') : ''; const ok = sendViaUI(t); logUI(ok ? '已推送客服推荐回复到输入框' : '页面UI未找到输入框，推送失败'); };
      const regenBtn = jevPanel.querySelector('#jev-cs-regenerate'); if (regenBtn) regenBtn.onclick = async () => { try { const out = jevPanel.querySelector('#jev-translate-out'); const src = jevPanel.querySelector('#jev-translate-src'); const resEl = jevPanel.querySelector('#jev-result-text'); const t = (out && out.value && out.value.trim()) || (resEl && resEl.textContent && resEl.textContent.trim()) || (src && src.value && src.value.trim()) || ''; if (!t) { logUI('没有可用于生成的文本'); return; } await generateCsFrom(t); } catch (e) { logUI('生成失败：' + (e.message || e)); } };
    }
  } catch {}
}
function setCsText(txt){ try { ensureCsBox(); const el = jevPanel.querySelector('#jev-cs-text'); if (el) el.textContent = String(txt||''); } catch {} }
function getAutoCsEnabled(){ try { return !!jevStoreGet('JEV_AUTO_CS', true); } catch { return true; } }
function setAutoCsEnabled(v){ try { jevStoreSet('JEV_AUTO_CS', !!v); } catch {} }
async function generateCsFrom(text){
  try {
    const t = String(text||'').trim(); if (!t) return false;
    const systemMsg = '你是一名中文客服。先迅速判断客户的语气与意图（礼貌/着急/愤怒/困惑/正式/随意/请求帮助/投诉等），并据此调整回复的语气、礼貌程度和长度。仅输出最终客服回复，不要解释分析过程。要求：简洁、友好、专业；先表达同理心或确认，再给出解决方案或下一步引导；必要时分点说明；使用简体中文；避免机械口吻与过度道歉。';
    const body = { system: systemMsg, prompt: t, model: 'deepseek-chat', temperature: 0.7, top_p: 0.95 };
    const r = await fetch(`${getWorkerBase()}/deepseek-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    const respTxt = await r.text(); let j = null; try { j = JSON.parse(respTxt); } catch {}
    if (r.ok && j && j.success && j.content) { setCsText(j.content); logUI('已生成客服推荐回复'); return true; }
    const err = (j && j.error) ? j.error : `HTTP ${r.status}`; logUI('生成失败：' + err); return false;
  } catch (e) { logUI('生成失败：' + (e.message || e)); return false; }
}
function setTranslateSource(txt){
  try { ensureTranslateBox(); const src = jevPanel.querySelector('#jev-translate-src'); if (src) src.value = String(txt||''); } catch {}
}
function setTranslateOutput(txt){
  try {
    ensureTranslateBox();
    const out = jevPanel.querySelector('#jev-translate-out'); if (out) out.value = String(txt||'');
    ensureCsBox();
    const t = String(txt||'').trim();
    if (t && getAutoCsEnabled()) { try { generateCsFrom(t); } catch {} }
  } catch {}
}
// 为设置面板添加保存逻辑
  function setupSettingsSave() {
    try {
      if (!jevPanel) return;
      const box = jevPanel.querySelector('#jev-settings');
      const inpInputSel = jevPanel.querySelector('#jev-input-sel');
      const btnSave = jevPanel.querySelector('#jev-settings-save');
      if (inpInputSel) inpInputSel.value = jevStoreGet('JEV_INPUT_SEL','');
      if (btnSave) btnSave.onclick = () => {
        try {
          if (inpInputSel) { jevStoreSet('JEV_INPUT_SEL', (inpInputSel.value||'').trim()); }
          if (box) box.style.display = 'none'; 
          renderFlags(); 
          logUI('设置已保存');
        } catch (e) { logUI('保存失败：' + (e.message || e)); }
      };
    } catch (e) { log('setup settings save error:', e.message); }
  }
  
  // 初始化设置保存逻辑
  try { setupSettingsSave(); } catch (e) { log('Failed to setup settings save:', e.message); }
// 发送到页面 UI：优先使用“输入框选择器”，回退通用候选（含 DeepSeek 常见）
function sendViaUI(text) {
  try {
    const customSel = jevStoreGet('JEV_INPUT_SEL','');
    const baseCandidates = ['textarea','input[type="text"]','[contenteditable="true"]','.ql-editor[contenteditable="true"]','.chat-input textarea','.composer textarea','textarea[placeholder*="输入"]','textarea[placeholder*="发送"]','textarea[placeholder*="Message"]','[data-testid="chat-input"]'];
    const candidates = customSel ? [customSel, ...baseCandidates] : baseCandidates;
    let el = null;
    for (const sel of candidates) { const found = document.querySelector(sel); if (found) { el = found; break; } }
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || !el.type))) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.textContent = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true });
    el.dispatchEvent(ev);
    const evUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true });
    el.dispatchEvent(evUp);
    return true;
  } catch { return false; }
}

// 新增：客户端翻译纯文本（Google Translate 非官方接口）
async function translateTextClient(text, target = (typeof JEV_TARGET_LANG!=='undefined'?JEV_TARGET_LANG:'zh-CN')) {
  const q = String(text || '').trim(); if (!q) return '';
  try {
    const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(q)}`;
    const r = await fetch(u, { method: 'GET' });
    const t = await r.text();
    let a = null; try { a = JSON.parse(t); } catch {}
    const chunks = Array.isArray(a?.[0]) ? a[0].map(x => x?.[0]).filter(Boolean) : [];
    return chunks.length ? chunks.join('') : q;
  } catch { return q; }
}
function renderFlags(){
  try {
    // 弹窗已禁用，不再尝试创建或更新面板
    console.log('[JEV] 弹窗已禁用，renderFlags函数仅输出到控制台');
    const roleText = JEV_IS_ADMIN ? '管理员' : '客服';
    console.log('[JEV-Flags] 角色:', roleText);
    console.log('[JEV-Flags] 自动推送:', JEV_AUTO_PUSH ? '✅' : '❌');
    console.log('[JEV-Flags] 发送模式:', JEV_SEND_MODE === 'worker' ? 'Worker 推送' : 'UI 填写');
    console.log('[JEV-Flags] 仅聊天:', JEV_CHAT_ONLY ? '✅' : '❌' + (JEV_CHAT_ROOT_SEL ? ` | 容器: ${JEV_CHAT_ROOT_SEL}` : ''));
  } catch (e) {
    console.error('[JEV] renderFlags执行失败:', e);
  }
}

// 在上传成功后，把 OCR/翻译的文字直接显示到面板“回传文字”区域
if (typeof j !== 'undefined') {
  const displayed = String(j.translated_text || j.ocr_text || '').trim();
  if (displayed) { try { setResultText(displayed); } catch {} }
  try { if (j.ocr_text) setTranslateSource(j.ocr_text); if (j.translated_text) setTranslateOutput(j.translated_text); } catch {}
}

// 新增：确保“回传文字”区域存在 & 设置文本
function ensureResultBox() {
  try {
    ensurePanel();
    if (!jevPanel || !jevLogBox) return;
    let box = jevPanel.querySelector('#jev-result');
    if (!box) {
      const jevResBox = document.createElement('div');
      jevResBox.id = 'jev-result';
      jevResBox.style.cssText = 'margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px';
      jevResBox.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>📝 回传文字</b><div style="flex:1"></div><button id="jev-copy-result" style="padding:4px 8px;font-size:12px">复制</button><button id="jev-send-result" style="padding:4px 8px;font-size:12px">推送</button></div><div id="jev-result-text" style="white-space:pre-wrap;max-height:140px;overflow:auto;font-size:14px;line-height:1.5;color:#fffa"></div>';
      jevPanel.insertBefore(jevResBox, jevLogBox);
      const copyBtn = jevPanel.querySelector('#jev-copy-result');
      if (copyBtn) copyBtn.onclick = () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? el.textContent || '' : '';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t);
            logUI('已复制回传文字');
          } else {
            throw new Error('clipboard API not available');
          }
        } catch {
          try {
            if (el) {
              const r = document.createRange(); r.selectNodeContents(el);
              const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
              document.execCommand('copy'); sel.removeAllRanges();
              logUI('已复制回传文字');
            }
          } catch {}
        }
      };
      const sendBtn = jevPanel.querySelector('#jev-send-result');
      if (sendBtn) sendBtn.onclick = () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? el.textContent || '' : '';
        const ok = sendViaUI(t);
        logUI(ok ? '已推送回传文字到输入框' : '页面UI未找到输入框，推送失败');
      };
      updateResultActions();
    }
    // 每次确保调用都刷新一次按钮可见性
    updateResultActions();
  } catch {}
}
function setResultText(txt) {
  try {
    ensureResultBox();
    const el = jevPanel.querySelector('#jev-result-text');
    if (el) el.textContent = String(txt || '');
  } catch {}
}

// 新增：根据页面实际情况调整“回传文字”区的按钮状态
function updateResultActions() {
  try {
    ensurePanel();
    const sendBtn = jevPanel.querySelector('#jev-send-result');
    const copyBtn = jevPanel.querySelector('#jev-copy-result');
    if (copyBtn) { copyBtn.disabled = false; }
    if (sendBtn) {
      const candidates = ['textarea','input[type="text"]','[contenteditable="true"]','.ql-editor[contenteditable="true"]','.chat-input textarea','.composer textarea'];
      let el = null;
      for (const sel of candidates) { const found = document.querySelector(sel); if (found) { el = found; break; } }
      const ok = !!el;
      sendBtn.disabled = !ok;
      sendBtn.style.opacity = ok ? '' : '0.6';
      sendBtn.title = ok ? '' : '未找到输入框';
    }
  } catch {}
}