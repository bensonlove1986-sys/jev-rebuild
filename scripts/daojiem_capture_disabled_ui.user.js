// 此脚本已禁用所有UI弹窗功能，仅保留核心API功能
// 所有UI交互已被移除，改为通过控制台和window.JEV对象进行管理
// ==UserScript==
/* global html2canvas, sendViaWorker, logUI */
/* eslint-disable curly, no-loop-func */
// @name         DAOJIE 聊天图片采集 → R2 (UI已禁用)
// @name:en      DAOJIE Chat Image Capture → R2 (UI Disabled)
// @name:zh-CN   DAOJIE 聊天图片采集 → R2 (UI已禁用)
// @namespace    https://daojiemarketing.com/
// @version      1.0.0
// @description  自动截取聊天图片并上传到你的 Cloudflare Worker（存入 R2），确保100%可控拿图。UI已禁用，通过控制台管理。
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
console.log('🖼️ JEV聊天图片采集插件 - 控制台使用指南（UI已禁用）');
console.log('---------------------------------------');
console.log('📌 window.JEV.CFG - 访问和修改配置');
console.log('📌 window.JEV.logs - 查看日志记录');
console.log('📌 window.JEV.notifications - 查看通知记录');
console.log('📌 window.JEV_DEBUG_MODE - 当前调试模式: true');
console.log('=======================================');
console.log('🔧 配置示例:');
console.log('   window.JEV.CFG.WORKER_URL = "your_worker_url"');
console.log('   window.JEV.CFG.AUTO_PUSH = true');
console.log('   window.JEV.CFG.SEND_MODE = "worker"')

// 立即尝试创建面板
setTimeout(() => {
  try {
    if (document.body && !document.getElementById('jev-upload-panel')) {
      console.log('JEV提示: 尝试自动创建面板...');
      window.ensurePanel();
    }
  } catch (e) {
    console.error('JEV提示: 自动创建面板失败:', e);
  }
}, 1000);

// 直接在window对象上定义ensurePanel函数 - 已禁用弹窗
window.ensurePanel = function ensurePanel() {
  try {
    // 界面已禁用，不再创建面板UI
    console.log('[JEV] 界面已禁用，UI面板创建功能已关闭');
    console.log('[JEV] 配置可以通过 window.JEV.CFG 和 window.JEV.STATE 手动设置');
    
    // 确保关键变量在window对象上可用，以便通过控制台访问
    if (!window.JEV) {
      window.JEV = {};
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
    
    // 更新配置对象，确保所有配置都可用
    window.JEV.CFG = {
      WORKER_URL: typeof getWorkerBase === 'function' ? getWorkerBase() : '',
      WEBHOOK_SECRET: typeof getWebhookSecret === 'function' ? getWebhookSecret() : '',
      LOCATION_ID: typeof getLocationId === 'function' ? getLocationId() : '',
      CONTACT_ID: typeof getContactId === 'function' ? getContactId() : '',
      CONVERSATION_ID: typeof getConversationId === 'function' ? getConversationId() : '',
      AUTO_PUSH: typeof JEV_AUTO_PUSH !== 'undefined' ? JEV_AUTO_PUSH : false,
      AUTO_QUOTE: typeof JEV_AUTO_QUOTE !== 'undefined' ? JEV_AUTO_QUOTE : false,
      SEND_MODE: typeof JEV_SEND_MODE !== 'undefined' ? JEV_SEND_MODE : 'ui',
      CHAT_ONLY: typeof JEV_CHAT_ONLY !== 'undefined' ? JEV_CHAT_ONLY : true,
      CHAT_ROOT_SEL: typeof JEV_CHAT_ROOT_SEL !== 'undefined' ? JEV_CHAT_ROOT_SEL : '',
      ENABLED: typeof ENABLED !== 'undefined' ? ENABLED : true,
      NOTIFY_UPLOAD: typeof NOTIFY_UPLOAD !== 'undefined' ? NOTIFY_UPLOAD : true
    };
    
    // 添加状态对象
    window.JEV.STATE = {
      activeCount: 0,
      lastResult: null,
      version: '1.0.0',
      debugMode: window.JEV_DEBUG_MODE
    };
    
    console.log('[JEV] 配置已暴露到 window.JEV.CFG');
    console.log('[JEV] 状态已暴露到 window.JEV.STATE');
    
    // 保留空值，以避免依赖该变量的代码出现错误
    jevPanel = null;
    jevLogBox = null;
    jevStatusSpan = null;
    jevToggleBtn = null;
    jevConfigBtn = null;
    jevFlagsBox = null;
    
    console.log('[JEV] 所有UI相关功能已禁用，请通过控制台配置和管理');

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

// 立即尝试创建调试面板 - 已禁用UI功能
(function createDebugPanelImmediate() {
  try {
    console.log('[JEV] 调试面板创建已禁用');
    console.log('[JEV] UI功能已关闭，请通过控制台管理');
    
    // 确保window.JEV对象存在
    if (!window.JEV) window.JEV = {};
    window.JEV.debugMode = true;
  } catch (e) {
    console.error('[JEV] createDebugPanelImmediate 执行失败:', e);
  }
})();

(function() {
  'use strict';

  // ===== 宸ュ叿鍑芥暟 =====
  function log(...args) { console.log('[JEV-CAPTURE]', ...args); }
  function nowTs() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  function safeFileName(base) { return (base || '').replace(/[^a-zA-Z0-9._-]/g, '_'); }
  function pickSrc(img) { return img.currentSrc || img.src || ''; }
  function isDataUrl(s) { return /^data:image\//i.test(s || ''); }
  function isVisible(el) { try { const r = el.getBoundingClientRect(); return r.width > 3 && r.height > 3 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth; } catch { return true; } }
  function jevStoreGet(k, d){ try { if (typeof GM_getValue === 'function') { const v = GM_getValue(k); return (v === undefined ? d : v); } const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : d; } catch { return d; } }
  function jevStoreSet(k, v){ try { if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; } localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  // ===== 鍙厤缃尯鍩?=====
  const WORKER_BASE = (window.JEV_WORKER_BASE || 'https://jevshop.bensonlove1986.workers.dev').replace(/\/$/, '');
  const WEBHOOK_SECRET = (window.JEV_WEBHOOK_SECRET || 'jevindustry2025');
  // 鍒濆鍖栧繀瑕佺殑鍏ㄥ眬鍙橀噺
  let JEV_OCR = false;
  let JEV_TRANSLATE = true;
  let JEV_PUSH = false;
  let JEV_TARGET_LANG = jevStoreGet('JEV_TARGET_LANG', 'zh-CN');
  let isInsideChat = function(element) { return true; };
  const SCAN_INTERVAL_MS = 12000; // 鑷姩鎵弿鍛ㄦ湡
  const CANVAS_SCALE = 1; // 画布缩放倍率
  const IMG_SELECTORS = [
    '.chat-message img',
    'img[data-message-type="image"]',
    'img[src*="whatsapp"], img[src*="lookaside"]',
    'img' // 鍏滃簳锛屾彁楂樺懡涓巼
  ];
  let PAUSE_WHEN_HIDDEN = (typeof window.JEV_PAUSE_WHEN_HIDDEN === 'boolean' ? window.JEV_PAUSE_WHEN_HIDDEN : true);
  const BG_SCAN_INTERVAL_MS = 30000; // 后台扫描周期（静默模式运行时）  let NOTIFY_UPLOAD = (typeof window.JEV_NOTIFY_UPLOAD === 'boolean' ? window.JEV_NOTIFY_UPLOAD : true);
  let ENABLED = (typeof window.JEV_ENABLED === 'boolean' ? window.JEV_ENABLED : true);
  let MAX_CONCURRENCY = (typeof window.JEV_MAX_CONCURRENCY === 'number' ? window.JEV_MAX_CONCURRENCY : 2);

  function ensureHtml2Canvas() {
    console.log('[JEV] UI功能已禁用，html2canvas加载已跳过');
    return Promise.resolve(() => console.log('[JEV] html2canvas功能已禁用'));
  }
  let JEV_WORKER_URL = jevStoreGet('JEV_WORKER_URL', (typeof WORKER_BASE !== 'undefined' ? WORKER_BASE : ''));
  let JEV_WEBHOOK_SECRET = jevStoreGet('JEV_WEBHOOK_SECRET', (typeof WEBHOOK_SECRET !== 'undefined' ? WEBHOOK_SECRET : ''));
  // 新增：会话、联系人、自动推送、报价配置
  let JEV_LOCATION_ID = jevStoreGet('JEV_LOCATION_ID', '');
  let JEV_CONTACT_ID = jevStoreGet('JEV_CONTACT_ID', '');
  let JEV_CONVERSATION_ID = jevStoreGet('JEV_CONVERSATION_ID', '');
  let JEV_AUTO_PUSH = jevStoreGet('JEV_AUTO_PUSH', false);
  let JEV_AUTO_QUOTE = jevStoreGet('JEV_AUTO_QUOTE', false);
  let JEV_SEND_MODE = jevStoreGet('JEV_SEND_MODE', 'ui');
  let JEV_IS_ADMIN = jevStoreGet('JEV_IS_ADMIN', false);
  // 新增：聊天区域限定
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
  // 保留并修复ensurePanel函数以确保现有代码鐮?// ensurePanel - 已禁用UI面板创建
function ensurePanel(){
    try {
      // 界面已禁用，不再创建面板UI
      console.log('[JEV] 寮圭獥宸茬鐢紝UI闈㈡澘鍒涘缓鍔熻兘宸插叧闂?');
      console.log('[JEV] 配置可以通过 window.JEV.CFG 鍜?window.JEV.STATE 鎵嬪姩璁剧疆');
      
      // 确保关键变量在window对象上可用，以便通过控制台访问?      if (!window.JEV) {
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
      
      // 淇濈暀绌哄€硷紝浠ラ伩鍏嶄緷璧栬鍙橀噺鐨勪唬鐮佸嚭鐜伴敊璇?      jevPanel = null;
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

// 确保绑定事件 - 已禁用UI相关功能
function bindEvents() {
  try {
    console.log('[JEV] 绑定事件功能已禁用');
  } catch (e) {
    console.error('[JEV] 绑定事件失败:', e);
  }
}// 替换：完整的 flags 显示，确保全局变量可访问
  function renderFlags() {
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
}catch (e) {
    console.error('[JEV] renderFlags执行失败:', e);
  }
}
      
      console.log('[JEV] 状态已更新到window.JEV_IS_ADMIN等全局变量和window.JEV.CFG对象');
      
      // 调用updateResultActions（如果存在）
      if (typeof updateResultActions === 'function') {
        try {
          updateResultActions();
        } catch (e) {
          console.error('[JEV] 调用updateResultActions失败:', e);
        }} catch (e) {
      console.error('[JEV] renderFlags执行失败:', e);
    }
  }
  function setStatus(msg){ console.log(`[JEV] 状态更新: ${String(msg||'')}`); }
  // 确保面板创建并设置状态
  try { 
    // 调用面板创建
    ensurePanel(); 
    
    // 确保所有面板相关变量暴露到window对象
    window.jevPanel = jevPanel;
    window.jevStatusSpan = jevStatusSpan;
    window.jevLogBox = jevLogBox;
    window.jevToggleBtn = jevToggleBtn;
    window.jevConfigBtn = jevConfigBtn;
    window.jevFlagsBox = jevFlagsBox;
  } catch (e) {
    console.error('[JEV] 初始化面板失败:', e);
  }
    
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
    
    // 纭繚闈㈡澘鍙鎬э紙浣跨敤鏇村己鍒剁殑鏍峰紡锛?    if (window.jevPanel) {
      // 绉婚櫎浠讳綍鍙兘闅愯棌闈㈡澘鐨勬牱寮?      window.jevPanel.style.display = 'block !important';
      window.jevPanel.style.visibility = 'visible !important';
      window.jevPanel.style.opacity = '1 !important';
      window.jevPanel.style.position = 'fixed !important';
      window.jevPanel.style.zIndex = '999999 !important';
      window.jevPanel.style.pointerEvents = 'auto !important';
      window.jevPanel.style.left = '10px !important';
      window.jevPanel.style.right = 'auto !important';
      
      // 娣诲姞杈规浠ョ‘淇濆彲瑙佹€?      window.jevPanel.style.border = '2px solid #00ff00';
      
      console.log('JEV Panel initialized and made visible');
      console.log('鍙互閫氳繃鎺у埗鍙拌闂? window.ensurePanel(), window.renderFlags(), window.logUI()');
    }
    
    // 绔嬪嵆娓叉煋鏍囧織
    renderFlags();
    
    // 鍦ㄦ帶鍒跺彴鎵撳嵃浣跨敤璇存槑
    console.log('馃柤锔?JEV鎻掍欢宸插姞杞?);
    console.log('馃搵 鍙敤鍛戒护:');
    console.log('  - window.ensurePanel() - 鍒涘缓/鏄剧ず闈㈡澘');
    console.log('  - window.renderFlags() - 鍒锋柊闈㈡澘鐘舵€?);
    console.log('  - window.logUI("娑堟伅") - 鍦ㄩ潰鏉挎樉绀烘棩蹇?);
    console.log('  - window.ENABLED = true/false - 鍚敤/绂佺敤鎻掍欢');
    console.log('  - window.JEV_AUTO_PUSH = true/false - 鍚敤/绂佺敤鑷姩鎺ㄩ€?);
  } catch (e) { 
    console.error('Panel initialization error:', e);
    // 鍗充娇鍑洪敊锛屼篃灏濊瘯鍒涘缓涓€涓畝鍗曠殑璋冭瘯闈㈡澘
    try {
      const debugPanel = document.createElement('div');
      debugPanel.id = 'jev-debug-panel';
      debugPanel.style.cssText = 'position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:999999 !important;display:block !important;visibility:visible !important';
      debugPanel.textContent = 'JEV闈㈡澘鍒濆鍖栧け璐ワ紝璇锋鏌ユ帶鍒跺彴閿欒';
      document.body.appendChild(debugPanel);
    } catch (e2) {
      console.error('Failed to create debug panel:', e2);
    }
  }

  async function uploadBase64(base64Url, fileName) {
    logUI(`鍑嗗涓婁紶锛?{fileName}`);
    const body = { base64_url: base64Url, filename: fileName, ocr: (typeof JEV_OCR!=='undefined'?JEV_OCR:false), translate: (typeof JEV_TRANSLATE!=='undefined'?JEV_TRANSLATE:false), push: (typeof JEV_PUSH!=='undefined'?JEV_PUSH:false) || JEV_AUTO_PUSH, target_lang: (typeof JEV_TARGET_LANG!=='undefined'?JEV_TARGET_LANG:'zh-CN'), feature: 'DOCUMENT_TEXT_DETECTION', locationId: getLocationId(), contactId: getContactId(), conversationId: getConversationId() };
    const r = await fetch(`${getWorkerBase()}/receive-image`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || !j.success) { logUI(`鉂?涓婁紶澶辫触锛歴tatus=${r.status}`); throw new Error(`upload failed: status=${r.status} body=${JSON.stringify(j || {})}`); }
    logUI(`鉁?涓婁紶鎴愬姛锛?{j.key || j.url || fileName}`);
    if (j.ocr_text) { logUI(`OCR锛?{String(j.ocr_text).slice(0,200)}`); }
    if (j.translated_text) { logUI(`缈昏瘧锛?{String(j.translated_text).slice(0,200)}`); }
    // 鑷姩鎶ヤ环涓庡彂閫侊紙鎸夐€夋嫨锛?    try {
      const textForQuote = String(j.translated_text || j.ocr_text || '').trim();
      if (JEV_AUTO_QUOTE && textForQuote) {
        const quote = `灏婃暚鐨勫鎴凤紝鎰熻阿鎮ㄧ殑鍜ㄨ銆傚熀浜庢偍鐨勯渶姹傦紝鎴戜滑鐨勬姤浠峰涓嬶細\n1. 鍩虹鏈嶅姟锛毬?00\n2. 楂樼骇鍔熻兘锛毬?00\n鎬昏锛毬?00`;
        logUI(`鎶ヤ环鑽夋锛?{quote.slice(0,200)}`);
        if (JEV_SEND_MODE === 'worker') {
          await sendViaWorker(quote);
          logUI('宸查€氳繃 Worker 鍙戦€佹姤浠?);
        } else {
          const ok = sendViaUI(quote);
          logUI(ok ? '宸查€氳繃椤甸潰UI鍙戦€佹姤浠? : '椤甸潰UI鏈壘鍒拌緭鍏ユ锛屽彂閫佸け璐?);
        }
      } else if (JEV_AUTO_PUSH) {
        const toSend = String(j.translated_text || j.ocr_text || `宸蹭笂浼犲浘鐗囷細${j.worker_url || j.url || fileName}`).slice(0,500);
        if (JEV_SEND_MODE === 'worker') { await sendViaWorker(toSend); logUI('宸查€氳繃 Worker 鎺ㄩ€佹枃鏈?); } else { const ok = sendViaUI(toSend); logUI(ok ? '宸查€氳繃椤甸潰UI鎺ㄩ€佹枃鏈? : '椤甸潰UI鏈壘鍒拌緭鍏ユ锛屾帹閫佸け璐?); }} catch (e) { logUI('鑷姩鍙戦€佸け璐ワ細' + e.message); }
    return j;
  }
  async function getBase64ViaWorker(srcUrl) {
    logUI(`灏濊瘯鐩撮摼鎷垮浘锛?{srcUrl.slice(0,80)}...`);
    const body = { url: srcUrl, mode: 'json' };
    const r = await fetch(`${getWorkerBase()}/get-image-by-url`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || !j.success || !j.base64_url) { logUI('鐩撮摼鎷垮浘澶辫触锛屾敼鐢ㄥ墠绔埅鍥?); throw new Error(`get-image-by-url failed: status=${r.status}`); }
    logUI('鐩撮摼鎷垮浘鎴愬姛');
    return j.base64_url;
  }

  async function captureImgToDataUrl(img) { // 閬垮厤閲嶅澹版槑
    const html2canvas = await ensureHtml2Canvas();
    try {
      const canvas = await html2canvas(img, { useCORS: true, scale: CANVAS_SCALE });
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl.length < 64) throw new Error('empty dataUrl');
      return dataUrl;
    } catch (e) {
      throw e; // 涓婂眰澶勭悊閫€璺?    }
  }

  // 鏄惧紡灞曠ず"璁剧疆"鎸夐挳锛屼究浜庣幇鍦哄垏鎹笌鎺掓煡
  try { if (jevConfigBtn) { jevConfigBtn.style.display = ''; } } catch {}
// 缁戝畾"绠＄悊鍛樼櫥褰?鑷姩鎺ㄩ€佸紑鍏?鐨勪簨浠讹紙浠呭畾涔変竴娆★級
  function bindFlagEvents(){
    try {
      // 寮圭獥宸茬鐢紝绉婚櫎鎵€鏈塙I鐩稿叧浜嬩欢缁戝畾
      console.log('[JEV] bindFlagEvents鍑芥暟宸茬鐢║I鐩稿叧鍔熻兘');
      console.log('[JEV] 绠＄悊鍛樻ā寮忓彲閫氳繃鎺у埗鍙拌缃細JEV_IS_ADMIN = true; jevStoreSet(\'JEV_IS_ADMIN\', true);');
      console.log('[JEV] 鑷姩鎺ㄩ€佸彲閫氳繃鎺у埗鍙拌缃細JEV_AUTO_PUSH = true/false; jevStoreSet(\'JEV_AUTO_PUSH\', JEV_AUTO_PUSH);');
    } catch (e) {
      console.error('[JEV] bindFlagEvents鎵ц澶辫触:', e);
    }
  }
  // 绠＄悊鍛樺瘑鐮侀棬 + 璁剧疆闈㈡澘灞曠ず涓庝繚瀛橈紙瑕嗙洊鍘熸湁鐐瑰嚮閫昏緫锛?  if (jevConfigBtn) {
    jevConfigBtn.onclick = () => {
      try {
        if (!JEV_IS_ADMIN) {
          const pwd = prompt('璇疯緭鍏ョ鐞嗗憳瀵嗙爜');
          if (pwd === 'jev') {
            JEV_IS_ADMIN = true;
            jevStoreSet('JEV_IS_ADMIN', true);
            logUI('绠＄悊鍛樺凡鐧诲綍');
            renderFlags();
          } else {
            logUI('绠＄悊鍛樺瘑鐮侀敊璇?);
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
        if (!box) { logUI('璁剧疆闈㈡澘鏈壘鍒?); return; }

        // 灞曠ず骞跺～鍏呭綋鍓嶅€?        if (inpWorker) inpWorker.value = getWorkerBase() || '';
        if (inpSecret) inpSecret.value = getWebhookSecret() || '';
        if (chkAutoPush) chkAutoPush.checked = !!JEV_AUTO_PUSH;
        if (chkChatOnly) chkChatOnly.checked = !!JEV_CHAT_ONLY;
        if (inpChatSel) inpChatSel.value = String(JEV_CHAT_ROOT_SEL || '');
        if (inpInputSel) inpInputSel.value = String(jevStoreGet('JEV_INPUT_SEL', '') || '');
        box.style.display = 'block';

        // 鍙粦瀹氫竴娆′繚瀛?鍏抽棴浜嬩欢
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
              box.style.display = 'none'; renderFlags(); logUI('璁剧疆宸蹭繚瀛?); scanAll();
            } catch (e) { logUI('淇濆瓨澶辫触锛? + (e.message || e)); }
          };
          if (btnClose) btnClose.onclick = () => { box.style.display = 'none'; };
          box.dataset.bound = '1';
        }
      } catch (e) {
        logUI('璁剧疆澶辫触锛? + (e.message || e));
      }
    };
  }

  // 鎻愪緵涓€涓彲澶嶇敤鏂规硶锛氭洿鏂板洖浼犳枃瀛楀埌闈㈡澘
  function setResultText(txt) { try { setResultTextDom(txt); } catch {} }
  async function getBase64ViaWorker(srcUrl) {
    logUI(`灏濊瘯鐩撮摼鎷垮浘锛?{srcUrl.slice(0,80)}...`);
    const body = { url: srcUrl, mode: 'json' };
    const r = await fetch(`${getWorkerBase()}/get-image-by-url`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || !j.success || !j.base64_url) { logUI('鐩撮摼鎷垮浘澶辫触锛屾敼鐢ㄥ墠绔埅鍥?); throw new Error(`get-image-by-url failed: status=${r.status}`); }
    logUI('鐩撮摼鎷垮浘鎴愬姛');
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
      throw e; // 涓婂眰澶勭悊閫€璺?    }
  }

  // 宸插鐞嗗幓閲嶉泦鍚堬紙閬垮厤閲嶅涓婁紶锛?  const seen = new Set();
  function seenKey(img) {
    try {
      const src = pickSrc(img) || '';
      // 浠呬娇鐢ㄥ浘鐗囨簮浣滀负鍘婚噸閿紝閬垮厤涓嶅悓 alt/title 瀵艰嚧閲嶅
      if (!src) return '';
      // 瀵?dataURL 鍙彇鍓?120 瀛楃浣滀负閿紝鍑忓皯鍐呭瓨鍗犵敤
      if (isDataUrl(src)) return src.slice(0, 120);
      // 瑙勮寖鍖?URL锛堝幓鎺夋煡璇㈠弬鏁颁腑鍙兘鍙樺寲浣嗕笉褰卞搷鍐呭鐨勭墖娈碉級
      try { const u = new URL(src, location.href); return u.origin + u.pathname; } catch { return src; }
    } catch { return pickSrc(img) || ''; }
  }

  function notify(text, title = '图片上传成功') {
    if (!NOTIFY_UPLOAD) return;
    try {
      // 禁用所有UI通知，改为控制台输出
      console.log(`[JEV-NOTIFY] ${title}: ${text}`);
      console.log('[JEV] 弹窗已禁用，通知仅输出到控制台');
      
      // 确保window.JEV对象存在并记录通知
      if (!window.JEV) window.JEV = {};
      if (!window.JEV.notifications) window.JEV.notifications = [];
      
      const notification = {
        title,
        text,
        timestamp: new Date().toISOString()
      };
      
      window.JEV.notifications.push(notification);
      // 限制通知数量
      if (window.JEV.notifications.length > 50) {
        window.JEV.notifications.shift();
      }
    } catch (e) { log('notify error:', e.message); }
  }

  let activeCount = 0; const queue = [];
  function runTask(fn) { if (activeCount < MAX_CONCURRENCY) startTask(fn); else queue.push(fn); }
  function startTask(fn) { activeCount++; Promise.resolve().then(fn).catch(err => log('task error:', err && (err.message || err))).finally(() => { activeCount--; const next = queue.shift(); if (next) startTask(next); }); }
  // 鎵归噺鍒锋柊鏃ュ織锛岄檷浣庨绻?DOM 鍙樻洿甯︽潵鐨勫崱椤?  let jevLogQueue = []; let jevLogScheduled = false;
  // 将logUI暴露到window对象 - 禁用UI功能
  window.logUI = function logUI(msg){
    try {
      // 确保window.JEV对象存在
      if (!window.JEV) window.JEV = {};
      if (!window.JEV.logs) window.JEV.logs = [];
      
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `${timestamp} ${msg}`;
      
      // 存储日志到window.JEV对象
      window.JEV.logs.push(logMessage);
      // 限制日志数量，避免内存占用过大
      if (window.JEV.logs.length > 100) {
        window.JEV.logs.shift(); // 移除最旧的日志
      }
      
      console.log('[JEV-LOG]', msg);
      console.log('[JEV] 弹窗已禁用，日志仅输出到控制台');
      console.log('[JEV] 完整日志可通过 window.JEV.logs 访问');
    } catch (e) {
      console.error('[JEV] logUI执行失败:', e);
    }
  }
  // 全局暴露 logUI 函数 (已在定义时暴露)
  // 閫熺巼闄愬埗锛氭瘡鍒嗛挓鏈€澶氬鐞嗚嫢骞插紶锛岄槻姝㈠繖鏃堕樆濉為〉闈?  let JEV_MAX_PER_MINUTE = jevStoreGet('JEV_MAX_PER_MINUTE', 20); let _processTokens = JEV_MAX_PER_MINUTE;
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
      if (_processTokens <= 0) { logUI('閫熺巼宸叉弧锛屾湰鍒嗛挓鏆傜紦澶勭悊'); return; }
      _processTokens--;
      const key = seenKey(img);
      if (!key) return;
      if (img.dataset.jevUploaded === '1' || seen.has(key)) return;

      let src = pickSrc(img);
      let base64Url = null;
      let fileName = safeFileName(img.getAttribute('alt') || img.getAttribute('title') || `whatsapp_${nowTs()}.png`);
      if (!fileName.toLowerCase().endsWith('.png') && !fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) { fileName = `${fileName}.png`; }
      logUI('妫€娴嬪埌鍥剧墖');
      if (isDataUrl(src)) { base64Url = src; logUI('鐩存帴浣跨敤鏁版嵁URL'); }
      else {
        if (src && /^https?:/i.test(src)) {
          try { base64Url = await getBase64ViaWorker(src); } catch (e1) { logUI('Worker 鎷垮浘澶辫触锛屾敼鐢ㄥ墠绔埅鍥?); }
        }
        if (!base64Url) {
          try { base64Url = await captureImgToDataUrl(img); logUI('宸插墠绔埅鍥?); } catch (e2) { logUI('鍓嶇鎴浘澶辫触锛? + e2.message); }}

      if (!base64Url) { logUI('鏀惧純锛氭湭鑾峰彇鍒板浘鐗囨暟鎹?); return; }
      const up = await uploadBase64(base64Url, fileName);
      notify('宸蹭笂浼犲埌R2');
      img.dataset.jevUploaded = '1';
      seen.add(key);
    } catch (e) {
      logUI('鉂?澶勭悊澶辫触锛? + (e.message||e));
    }
  }

  // 瑙傚療鍣ㄥ垵濮嬪寲锛堢己澶辨儏鍐典笅鎻愪緵鍏滃簳锛?  let io = null;
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
          } catch {}}, { root: null, rootMargin: '0px', threshold: 0.1 });
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
              n.querySelectorAll && n.querySelectorAll('img').forEach(img => { if (currentVisible(img) && currentInsideChat(img)) { if (!currentIoObserved.has(img)) { currentIoObserved.add(img); currentIo.observe(img); }});
            }
          } catch {}
        });
      }
    });
    const observeBody = () => { try { if (document.body) { mo.observe(document.body, { childList: true, subtree: true }); } } catch {} };
    if (document.body) { observeBody(); } else { document.addEventListener('DOMContentLoaded', observeBody, { once: true }); }
  }

  // 鏆撮湶鎵嬪姩瑙﹀彂鏂规硶锛堢ǔ濡ョ殑鍏ㄥ眬瀵硅薄 + 鐩存帴鍑芥暟锛?  window.JEV_CAPTURE = Object.assign(window.JEV_CAPTURE || {}, {
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

  // 鍚姩
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

// 淇锛歴endViaUI 杈撳叆妗嗛€夋嫨鍣?// 閫氳繃UI鍙戦€佹枃鏈?- 宸茬鐢?function sendViaUI(text) {
  // 寮圭獥宸茬鐢紝姝ゅ嚱鏁颁笉鍐嶆墽琛屼换浣曟搷浣?  console.log('[JEV] 寮圭獥宸茬鐢紝UI鍙戦€佸姛鑳藉凡鍏抽棴');
  console.log('[JEV] 配置可以通过 window.JEV.CFG 鍜?window.JEV.STATE 鎵嬪姩璁剧疆');
  console.log('[JEV] 灏濊瘯鍙戦€佺殑鏂囨湰:', text);
  return false;
}

// 鏂板锛氬鎴风缈昏瘧绾枃鏈紙Google Translate 闈炲畼鏂规帴鍙ｏ級
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
function renderFlags() {
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
}catch (e) { 
    log('renderFlags error:', e.message);
    try {
      if (jevFlagsBox) {
        jevFlagsBox.innerHTML = '瑙掕壊: 瀹㈡湇<br>鑷姩鎺ㄩ€? 鍏?br>鍙戦€佹ā寮? UI 濉啓<br>浠呰亰澶? 寮€';
      }
    } catch {}}

// 鍒濆鍖栫炕璇戝尯鍩熷拰缁撴灉鍖哄煙
setTimeout(() => {
  try { ensureTranslateBox(); ensureResultBox(); ensureCsBox(); } catch {}
}, 500);

// 娉ㄦ剰锛氫笂浼犳垚鍔熷悗鐨勫鐞嗗凡缁忓湪 uploadBase64 鍑芥暟涓畬鎴?
// 鏂板锛氱‘淇濃€滃洖浼犳枃瀛椻€濆尯鍩熷瓨鍦?& 璁剧疆鏂囨湰
function ensureResultBox() {
    try {
      // 弹窗已禁用，结果展示功能已关闭
      console.log('[JEV] 弹窗已禁用，结果展示功能已关闭');
      console.log('[JEV] 识别结果将通过控制台输出');
      
      // 确保window.JEV对象存在，以便存储和访问结果
      if (!window.JEV) {
        window.JEV = {};
      }
      
      // 提供一个模拟的结果存储位置
      window.JEV.lastResult = window.JEV.lastResult || '';
      
      console.log('[JEV] 结果可以通过 window.JEV.lastResult 访问');
      return;
    } catch (e) {
      console.error('[JEV] ensureResultBox 执行异常:', e);
    }
    // 确保Panel功能已禁用，不再执行任何UI操作
    console.log('[JEV] ensureResultBox - UI功能已完全禁用');
      };
      const sendBtn = jevPanel.querySelector('#jev-send-result');
      if (sendBtn) sendBtn.onclick = () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? el.textContent || '' : '';
        const ok = sendViaUI(t);
        logUI(ok ? '宸叉帹閫佸洖浼犳枃瀛楀埌杈撳叆妗? : '椤甸潰UI鏈壘鍒拌緭鍏ユ锛屾帹閫佸け璐?);
      };
      const genBtn = jevPanel.querySelector('#jev-generate-cs');
      if (genBtn) genBtn.onclick = async () => {
        const el = jevPanel.querySelector('#jev-result-text');
        const t = el ? (el.textContent || '') : '';
        const text = String(t || '').trim();
        if (!text) { logUI('娌℃湁鍙敤浜庣敓鎴愮殑鏂囨湰'); return; }
        genBtn.disabled = true; const oldTxt = genBtn.textContent; genBtn.textContent = '鐢熸垚涓?..';
        try {
          const systemMsg = '浣犳槸涓€鍚嶄腑鏂囧鏈嶃€傚厛杩呴€熷垽鏂鎴风殑璇皵涓庢剰鍥撅紙绀艰矊/鐫€鎬?鎰ゆ€?鍥版儜/姝ｅ紡/闅忔剰/璇锋眰甯姪/鎶曡瘔绛夛級锛屽苟鎹璋冩暣鍥炲鐨勮姘斻€佺ぜ璨岀▼搴﹀拰闀垮害銆備粎杈撳嚭鏈€缁堝鏈嶅洖澶嶏紝涓嶈瑙ｉ噴鍒嗘瀽杩囩▼銆傝姹傦細绠€娲併€佸弸濂姐€佷笓涓氾紱鍏堣〃杈惧悓鐞嗗績鎴栫‘璁わ紝鍐嶇粰鍑鸿В鍐虫柟妗堟垨涓嬩竴姝ュ紩瀵硷紱蹇呰鏃跺垎鐐硅鏄庯紱浣跨敤绠€浣撲腑鏂囷紱閬垮厤鏈烘鍙ｅ惢涓庤繃搴﹂亾姝夈€?;
          const body = { system: systemMsg, prompt: text, model: 'deepseek-chat', temperature: 0.7, top_p: 0.95 };
          const r = await fetch(`${getWorkerBase()}/deepseek-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
          const respTxt = await r.text(); let j = null; try { j = JSON.parse(respTxt); } catch {}
          if (r.ok && j && j.success && j.content) {
            setResultText(j.content);
            logUI('宸茬敓鎴愬鏈嶅洖澶?);
          } else {
            const err = (j && j.error) ? j.error : `HTTP ${r.status}`;
            logUI('鐢熸垚澶辫触锛? + err);
          }
        } catch (e) {
          logUI('鐢熸垚澶辫触锛? + (e.message || e));
        } finally {
          genBtn.disabled = false; genBtn.textContent = oldTxt || '鐢熸垚瀹㈡湇鍥炲';
        }
      };
      updateResultActions();
    }
    // 姣忔纭繚璋冪敤閮藉埛鏂颁竴娆℃寜閽彲瑙佹€?    updateResultActions();
  } catch {}
}
function setResultText(txt) {
  try {
    // 弹窗已禁用，不再更新UI
    const text = String(txt || '').trim();
    
    // 确保window.JEV对象存在
    if (!window.JEV) {
      window.JEV = {};
    }
    
    // 存储结果到window.JEV.lastResult
    window.JEV.lastResult = text;
    
    // 输出结果到控制台
    console.log('[JEV] 结果已存储:', text);
    console.log('[JEV] 可以通过 window.JEV.lastResult 访问结果');
  } catch (e) {
    console.error('[JEV] setResultText 执行异常:', e);
  }
}

// 更新：禁用UI操作，仅通过控制台输出状态信息
function updateResultActions() {
  try {
    // 确保window.JEV对象存在
    if (!window.JEV) window.JEV = {};
    if (!window.JEV.CFG) window.JEV.CFG = {};
    
    console.log('[JEV] updateResultActions执行，弹窗已禁用，UI相关功能已关闭');
    
    // 查找输入框元素并记录到JEV对象中
    const customSel = jevStoreGet('JEV_INPUT_SEL', '');
    const baseCandidates = ['textarea','input[type="text"]','[contenteditable="true"]','.ql-editor[contenteditable="true"]','.chat-input textarea','.composer textarea','[data-testid="chat-input"]'];
    const candidates = customSel ? [customSel, ...baseCandidates] : baseCandidates;
    let el = null;
    let foundSelector = null;
    
    for (const sel of candidates) { 
      const found = document.querySelector(sel); 
      if (found) { 
        el = found;
        foundSelector = sel;
        break; 
      } 
    }
    
    window.JEV.inputElementFound = !!el;
    window.JEV.foundSelector = foundSelector;
    
    console.log('[JEV] 输入框状态:', window.JEV.inputElementFound ? `找到 (选择器: ${foundSelector})` : '未找到');
    console.log('[JEV] 使用方法: 通过 window.JEV.sendViaWorker(text) 发送文本');
  } catch (e) {
    console.error('[JEV] updateResultActions执行失败:', e);
  }
}

// 鏂板锛氶€氳繃 Worker 鍙戦€佹秷鎭?async function sendViaWorker(text) {
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
    logUI('Worker 鍙戦€佸け璐ワ細' + (e.message || e));
    return false;
  }
}

// 鏂板锛氭牴鎹厤缃嚜鍔ㄦ帹閫佹枃鏈?function autoPushTextIfEnabled(text) {
  try {
    if (!JEV_AUTO_PUSH || !text || typeof text !== 'string') return;
    const t = text.trim();
    if (!t) return;
    if (JEV_SEND_MODE === 'worker') {
      sendViaWorker(t).catch(err => logUI('鑷姩鎺ㄩ€佸け璐ワ細' + err.message));
    } else {
      sendViaUI(t);
    }
  } catch (e) {
    logUI('鑷姩鎺ㄩ€侀敊璇細' + (e.message || e));
  }
}

// === 更新：翻译功能（禁用UI，仅通过控制台和API提供功能）===
function ensureTranslateBox(){
  try {
    // 确保window.JEV对象存在
    if (!window.JEV) window.JEV = {};
    if (!window.JEV.translate) window.JEV.translate = {};
    
    // 初始化翻译配置
    const defaultLang = typeof JEV_TARGET_LANG !== 'undefined' ? JEV_TARGET_LANG : (jevStoreGet('JEV_TARGET_LANG','zh-CN'));
    window.JEV.translate.targetLang = defaultLang;
    window.JEV.translate.sourceText = '';
    window.JEV.translate.outputText = '';
    
    console.log('[JEV] ensureTranslateBox执行，弹窗已禁用，UI相关功能已关闭');
    console.log('[JEV] 翻译功能可通过 window.JEV.translate 对象使用');
    console.log('[JEV] 当前目标语言:', window.JEV.translate.targetLang);
    console.log('[JEV] 使用方法:');
    console.log('[JEV] 1. 设置源文本: window.JEV.translate.sourceText = "要翻译的文本";');
    console.log('[JEV] 2. 设置目标语言: window.JEV.translate.targetLang = "zh-CN";');
    console.log('[JEV] 3. 执行翻译: await window.JEV.translateText(window.JEV.translate.sourceText, window.JEV.translate.targetLang);');
    
    // 提供便捷的翻译API
    window.JEV.translateText = async function(text, targetLang = window.JEV.translate.targetLang) {
      try {
        const result = await translateTextClient(text, targetLang);
        window.JEV.translate.outputText = result;
        console.log('[JEV] 翻译完成，结果已保存到 window.JEV.translate.outputText');
        console.log('[JEV] 翻译结果预览:', result.length > 100 ? result.substring(0, 100) + '...' : result);
        return result;
      } catch (e) {
        console.error('[JEV] 翻译失败:', e);
        return text; // 失败时返回原文本
      }
    };
    
    // 提供复制翻译结果的便捷方法
    window.JEV.copyTranslation = async function() {
      try {
        if (!window.JEV.translate.outputText) {
          console.log('[JEV] 没有可用的翻译结果');
          return false;
        }
        
        await navigator.clipboard.writeText(window.JEV.translate.outputText);
        console.log('[JEV] 翻译结果已复制到剪贴板');
        return true;
      } catch (e) {
        console.error('[JEV] 复制翻译结果失败:', e);
        return false;
      }
    };
    
    // 提供发送翻译结果的便捷方法
    window.JEV.pushTranslation = async function() {
      try {
        if (!window.JEV.translate.outputText) {
          console.log('[JEV] 没有可用的翻译结果');
          return false;
        }
        
        const success = await sendViaWorker(window.JEV.translate.outputText);
        console.log('[JEV] 翻译结果推送', success ? '成功' : '失败');
        return success;
      } catch (e) {
        console.error('[JEV] 推送翻译结果失败:', e);
        return false;
      }
    };
    } catch (e) {
      console.error('[JEV] ensureTranslateBox执行失败:', e);
    }
  }
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
        selLang.onchange = () => { try { JEV_TARGET_LANG = selLang.value; jevStoreSet('JEV_TARGET_LANG', JEV_TARGET_LANG); logUI('鐩爣璇█锛? + JEV_TARGET_LANG); } catch {} };
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
          logUI('鎵嬪姩缈昏瘧瀹屾垚');
        } catch (e) { logUI('鎵嬪姩缈昏瘧澶辫触锛? + (e.message || e)); }
      };
      const copyBtn = box.querySelector('#jev-translate-copy');
      if (copyBtn) copyBtn.onclick = () => {
        try { const out = box.querySelector('#jev-translate-out'); const t = out ? (out.value||'') : ''; navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : null; logUI('宸插鍒惰瘧鏂?); } catch {}
      };
      const pushBtn = box.querySelector('#jev-translate-push');
      if (pushBtn) pushBtn.onclick = () => {
        const out = box.querySelector('#jev-translate-out');
        const t = out ? (out.value||'') : '';
        const ok = sendViaUI(t);
        logUI(ok ? '宸叉帹閫佽瘧鏂囧埌杈撳叆妗? : '椤甸潰UI鏈壘鍒拌緭鍏ユ锛屾帹閫佸け璐?);
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
// 鏂板锛氬鏈嶆帹鑽愬洖澶嶅尯鍩?+ 鑷姩鐢熸垚
function ensureCsBox(){
  try {
    // 确保window.JEV对象存在
    if (!window.JEV) window.JEV = {};
    if (!window.JEV.cs) window.JEV.cs = {};
    
    // 初始化客服配置
    window.JEV.cs.autoGenerate = getAutoCsEnabled();
    window.JEV.cs.lastSuggestion = '';
    
    console.log('[JEV] ensureCsBox执行，弹窗已禁用，UI相关功能已关闭');
    console.log('[JEV] 客服功能可通过 window.JEV.cs 对象使用');
    console.log('[JEV] 自动生成客服回复:', window.JEV.cs.autoGenerate ? '✅' : '❌');
    console.log('[JEV] 使用方法:');
    console.log('[JEV] 1. 生成客服回复: await generateCsFrom("原始文本");');
    console.log('[JEV] 2. 切换自动生成: window.JEV.cs.autoGenerate = true/false;');
    console.log('[JEV] 3. 复制最新建议: window.JEV.copyCsSuggestion();');
    
    // 提供复制客服建议的便捷方法
    window.JEV.copyCsSuggestion = async function() {
      try {
        if (!window.JEV.cs.lastSuggestion) {
          console.log('[JEV] 没有可用的客服建议');
          return false;
        }
        
        await navigator.clipboard.writeText(window.JEV.cs.lastSuggestion);
        console.log('[JEV] 客服建议已复制到剪贴板');
        return true;
      } catch (e) {
        console.error('[JEV] 复制客服建议失败:', e);
        return false;
      }
    };
    
    return;
  } catch (e) {
    console.error('[JEV] ensureCsBox 执行异常:', e);
  }
      // 所有UI相关按钮和事件处理已移除
        // 确保不会执行任何DOM操作
  }
}
function setCsText(txt){ 
  try { 
    ensureCsBox(); 
    // 确保window.JEV.cs对象存在
    if (window.JEV && window.JEV.cs) {
      window.JEV.cs.lastSuggestion = String(txt||'');
      console.log('[JEV] 客服建议已更新到 window.JEV.cs.lastSuggestion');
      console.log('[JEV] 客服建议预览:', window.JEV.cs.lastSuggestion.length > 100 ? window.JEV.cs.lastSuggestion.substring(0, 100) + '...' : window.JEV.cs.lastSuggestion);
    }
  } catch (e) { 
    console.error('[JEV] setCsText 执行异常:', e);
  } 
}
function getAutoCsEnabled(){ try { return !!jevStoreGet('JEV_AUTO_CS', true); } catch { return true; } }
function setAutoCsEnabled(v){ try { jevStoreSet('JEV_AUTO_CS', !!v); } catch {} }
async function generateCsFrom(text){
  try {
    const t = String(text||'').trim(); if (!t) return false;
    const systemMsg = '你是一名中文客服。请根据客户的语气与意图(疑问/需求/情感/请求帮助/告知等)，并据此调整回复的语气、亲密程度和长度。只输出最终客服回复，不要解释分析过程。要求：简洁、友好、专业；先表达同理心或肯定，再给出解决方案或下一步引导；必须分点说明；使用简洁中文；避免网络用语与过度用词。';
    const body = { system: systemMsg, prompt: t, model: 'deepseek-chat', temperature: 0.7, top_p: 0.95 };
    const r = await fetch(`${getWorkerBase()}/deepseek-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    const respTxt = await r.text(); let j = null; try { j = JSON.parse(respTxt); } catch {}
    if (r.ok && j && j.success && j.content) { 
      setCsText(j.content); 
      console.log('[JEV] 已生成客服推荐回复');
      return true; 
    }
    const err = (j && j.error) ? j.error : `HTTP ${r.status}`; 
    console.log('[JEV] 生成失败: ' + err); 
    return false;
  } catch (e) { 
    console.log('[JEV] 生成失败: ' + (e.message || e)); 
    return false; 
  }
}
function setTranslateSource(txt){
  try { 
    ensureTranslateBox(); 
    // 确保window.JEV.translate对象存在
    if (window.JEV && window.JEV.translate) {
      window.JEV.translate.sourceText = String(txt||'');
      console.log('[JEV] 翻译源文本已更新到 window.JEV.translate.sourceText');
    }
  } catch (e) { 
    console.error('[JEV] setTranslateSource 执行异常:', e);
  } 
}
function setTranslateOutput(txt){
  try {
    ensureTranslateBox();
    // 确保window.JEV.translate对象存在
    if (window.JEV && window.JEV.translate) {
      window.JEV.translate.outputText = String(txt||'');
      console.log('[JEV] 翻译输出文本已更新到 window.JEV.translate.outputText');
      console.log('[JEV] 翻译结果预览:', window.JEV.translate.outputText.length > 100 ? window.JEV.translate.outputText.substring(0, 100) + '...' : window.JEV.translate.outputText);
    }
    
    // 保持自动生成客服回复的逻辑
    ensureCsBox();
    const t = String(txt||'').trim();
    if (t && getAutoCsEnabled()) { 
      try { 
        console.log('[JEV] 检测到翻译结果，根据自动生成设置处理...');
        generateCsFrom(t); 
      } catch (e) {
        console.error('[JEV] 自动生成客服回复失败:', e);
      }} catch (e) {
    console.error('[JEV] setTranslateOutput 执行异常:', e);
  } 
}
// 为设置面板添加保存机制 - 已禁用UI
  function setupSettingsSave() {
    try {
      // 确保window.JEV对象存在
      if (!window.JEV) window.JEV = {};
      
      console.log('[JEV] setupSettingsSave 执行，UI已禁用，配置通过控制台管理');
      console.log('[JEV] 输入选择器配置可通过 window.JEV.inputSelector 设置');
      console.log('[JEV] 示例: window.JEV.inputSelector = "textarea.my-custom-selector";');
      
      // 提供通过控制台保存配置的方法
      window.JEV.saveSettings = function(selector) {
        try {
          jevStoreSet('JEV_INPUT_SEL', (selector||'').trim());
          console.log('[JEV] 设置已保存');
          renderFlags();
          return true;
        } catch (e) {
          console.error('[JEV] 保存失败:', e.message || e);
          return false;
        }
      };
    } catch (e) {
      console.error('[JEV] setupSettingsSave error:', e.message);
    }
  }
  
  // 初始化设置保存机制
  try { 
    setupSettingsSave();
    console.log('[JEV] 设置系统已初始化，可通过 window.JEV.saveSettings() 管理配置');
  } catch (e) { 
    console.error('[JEV] Failed to setup settings save:', e.message); 
  }
// 发送到页面UI - 已禁用，优先使用sendViaWorker
function sendViaUI(text) {
  try {
    console.log('[JEV] sendViaUI 执行，UI功能已禁用');
    console.log('[JEV] 文本将通过控制台输出，不会自动填入页面');
    console.log('[JEV] 待发送文本预览:', text.length > 100 ? text.substring(0, 100) + '...' : text);
    
    // 确保window.JEV对象存在，记录最后尝试发送的文本
    if (!window.JEV) window.JEV = {};
    window.JEV.lastSentText = text;
    console.log('[JEV] 文本已保存到 window.JEV.lastSentText');
    
    // 提供手动发送的指导
    console.log('[JEV] 建议使用 sendViaWorker 代替，或手动复制文本到输入框');
    
    return false; // 表示UI发送功能已禁用
    // 所有UI交互代码已移除
    } catch (e) {
      console.error('[JEV] sendViaUI 执行异常:', e);
      return false;
    }
    return false; // 始终返回false表示UI功能已禁用
}

// 鏂板锛氬鎴风缈昏瘧绾枃鏈紙Google Translate 闈炲畼鏂规帴鍙ｏ級
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
function renderFlags() {
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
}// 鍦ㄤ笂浼犳垚鍔熷悗锛屾妸 OCR/缈昏瘧鐨勬枃瀛楃洿鎺ユ樉绀哄埌闈㈡澘鈥滃洖浼犳枃瀛椻€濆尯鍩?if (typeof j !== 'undefined') {
  const displayed = String(j.translated_text || j.ocr_text || '').trim();
  if (displayed) { try { setResultText(displayed); } catch {} }
  try { if (j.ocr_text) setTranslateSource(j.ocr_text); if (j.translated_text) setTranslateOutput(j.translated_text); } catch {}
}

// 鏂板锛氱‘淇濃€滃洖浼犳枃瀛椻€濆尯鍩熷瓨鍦?& 璁剧疆鏂囨湰
function ensureResultBox() {
  try {
    // 弹窗已禁用，结果展示功能已关闭
    console.log('[JEV] 弹窗已禁用，结果展示功能已关闭');
    console.log('[JEV] 识别结果将通过控制台输出');
    
    // 确保window.JEV对象存在，以便存储和访问结果
    if (!window.JEV) {
      window.JEV = {};
    }
    
    // 提供一个模拟的结果存储位置
    window.JEV.lastResult = window.JEV.lastResult || '';
    
    console.log('[JEV] 结果可以通过 window.JEV.lastResult 访问');
  } catch (e) {
    console.error('[JEV] ensureResultBox 执行异常:', e);
  }
}
function setResultText(txt) {
  try {
    // 确保window.JEV对象存在
    if (!window.JEV) window.JEV = {};
    
    // 存储结果文本到window.JEV对象中
    const resultText = String(txt || '').trim();
    window.JEV.lastResult = resultText;
    
    console.log('[JEV] setResultText执行，弹窗已禁用，UI相关功能已关闭');
    console.log('[JEV] 结果文本已存储到 window.JEV.lastResult');
    console.log('[JEV] 结果预览:', resultText.length > 100 ? resultText.substring(0, 100) + '...' : resultText);
    
    // 调用updateResultActions以更新输入框状态
    updateResultActions();
  } catch (e) {
    console.error('[JEV] setResultText执行失败:', e);
  }
}

// 更新：禁用UI操作，仅通过控制台输出状态信息
function updateResultActions() {
  try {
    // 确保window.JEV对象存在
    if (!window.JEV) window.JEV = {};
    if (!window.JEV.CFG) window.JEV.CFG = {};
    
    console.log('[JEV] updateResultActions执行，弹窗已禁用，UI相关功能已关闭');
    
    // 查找输入框元素并记录到JEV对象中
    const candidates = ['textarea','input[type="text"]','[contenteditable="true"]','.ql-editor[contenteditable="true"]','.chat-input textarea','.composer textarea'];
    let el = null;
    let foundSelector = null;
    
    for (const sel of candidates) { 
      const found = document.querySelector(sel); 
      if (found) { 
        el = found;
        foundSelector = sel;
        break; 
      } 
    }
    
    window.JEV.inputElementFound = !!el;
    window.JEV.foundSelector = foundSelector;
    
    console.log('[JEV] 输入框状态:', window.JEV.inputElementFound ? `找到 (选择器: ${foundSelector})` : '未找到');
    console.log('[JEV] 使用方法: 通过 window.JEV.sendViaWorker(text) 发送文本');
  } catch (e) {
    console.error('[JEV] updateResultActions执行失败:', e);
  }
}
