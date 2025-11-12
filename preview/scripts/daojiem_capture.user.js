// ==UserScript==
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
// @inject-into  page
// ==/UserScript==
/* global sendViaWorker, logUI */

(function() {
  'use strict';

  // ===== 可配置区域 =====
  const WORKER_BASE = (window.JEV_WORKER_BASE || 'https://jevshop.bensonlove1986.workers.dev').replace(/\/+$/, '');
  const WEBHOOK_SECRET = (window.JEV_WEBHOOK_SECRET || 'jevindustry2025');
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

  // ===== 工具函数 =====
  function log(...args) { console.log('[JEV-CAPTURE]', ...args); }
  function nowTs() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  function safeFileName(base) { return (base || '').replace(/[^a-zA-Z0-9._-]/g, '_'); }
  function pickSrc(img) { return img.currentSrc || img.src || ''; }
  function isDataUrl(s) { return /^data:image\//i.test(s || ''); }
  function isVisible(el) { try { const r = el.getBoundingClientRect(); return r.width > 3 && r.height > 3 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth; } catch { return true; } }

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

  // ===== 可视化面板与存储 =====
  function jevStoreGet(k, d){ try { if (typeof GM_getValue === 'function') { const v = GM_getValue(k); return (v === undefined ? d : v); } const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : d; } catch { return d; } }
  function jevStoreSet(k, v){ try { if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; } localStorage.setItem(k, JSON.stringify(v)); } catch {} }
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
  function ensurePanel(){
    try {
      if (jevPanel) return;
      if (!document.body) { document.addEventListener('DOMContentLoaded', ensurePanel, { once: true }); return; }
      jevPanel = document.createElement('div');
      jevPanel.id = 'jev-upload-panel';
      // 新增：面板尺寸持久化（宽/高）
      let JEV_PANEL_W = jevStoreGet('JEV_PANEL_W', 520);
      let JEV_PANEL_H = jevStoreGet('JEV_PANEL_H', 240);
      // 支持拖拽缩放，保留滚动
      jevPanel.style.cssText = 'position:fixed;bottom:10px;left:10px;background:rgba(0,0,0,0.95);color:#fff;padding:16px 20px;border-radius:8px;font-size:18px;z-index:99999;line-height:1.5;font-family:system-ui,Arial;box-shadow:0 6px 16px rgba(0,0,0,.25);resize:both;overflow:auto;min-width:300px;max-width:80vw;min-height:120px;max-height:80vh';
      jevPanel.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b>🖼️ JEV嘉尔威 跨境插件</b><span id="jev-status" style="opacity:.9">启动中...</span></div>' +
        '<div id="jev-flags" style="margin:6px 0 8px;opacity:.9"></div>' +
        '<div style="display:flex;gap:6px;margin-bottom:8px">' +
        '  <button id="jev-toggle" style="padding:6px 10px;font-size:16px">⏸️ 暂停</button>' +
        '  <button id="jev-config" style="padding:6px 10px;font-size:16px">⚙️ 设置</button>' +
        '  <button id="jev-log-toggle" style="padding:6px 10px;font-size:16px">📜 日志</button>' +
        '</div>' +
        '<div id="jev-settings" style="display:none;margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px">' +
        '  <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center">' +
        '    <label>自动推送</label><input id="jev-auto-push" type="checkbox" />' +
        '    <label>仅聊天区</label><input id="jev-chat-only" type="checkbox" />' +
        '    <label>聊天容器选择器</label><input id="jev-chat-sel" type="text" placeholder="例如：.conversation,.message-list" />' +
        '  </div>' +
        '  <div style="display:flex;gap:10px;margin-top:10px">' +
        '    <button id="jev-settings-save" style="padding:6px 10px;font-size:16px">💾 保存</button>' +
        '    <button id="jev-settings-close" style="padding:6px 10px;font-size:16px">✖️ 关闭</button>' +
        '  </div>' +
        '</div>' +
        '<div id="jev-log" style="display:none;max-height:160px;overflow:auto;border-top:1px solid rgba(255,255,255,.15);padding-top:6px"></div>';
      document.body.appendChild(jevPanel);
      // 增加明确拖拽缩放把手，解决部分环境下 CSS resize 不可见/不可用的问题
      try {
        const panelHandle = document.createElement('div');
        panelHandle.id = 'jev-panel-resizer';
        panelHandle.style.cssText = 'position:absolute;right:6px;bottom:6px;width:14px;height:14px;cursor:se-resize;background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.08));border-radius:2px;opacity:.8';
        panelHandle.title = '拖拽此角以调整面板大小';
        jevPanel.appendChild(panelHandle);
        (function(){
          let startX=0,startY=0,startW=0,startH=0,drag=false;
          const onMove = (e) => {
            if (!drag) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const w = Math.max(300, startW + dx);
            const h = Math.max(120, startH + dy);
            jevPanel.style.width = w + 'px';
            jevPanel.style.height = h + 'px';
          };
          const onUp = () => {
            if (!drag) return;
            drag=false;
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            try {
              const w = parseInt(String(jevPanel.style.width||'').replace(/px$/,''),10);
              const h = parseInt(String(jevPanel.style.height||'').replace(/px$/,''),10);
              if (w>0) jevStoreSet('JEV_PANEL_W', w);
              if (h>0) jevStoreSet('JEV_PANEL_H', h);
            } catch {}
          };
          panelHandle.addEventListener('mousedown',(e)=>{
            try {
              e.preventDefault();
              startX = e.clientX; startY = e.clientY;
              const rect = jevPanel.getBoundingClientRect();
              startW = rect.width; startH = rect.height; drag=true;
              document.addEventListener('mousemove', onMove, true);
              document.addEventListener('mouseup', onUp, true);
            } catch {}
          }, true);
        })();
      } catch {}

      // 应用持久化尺寸（确保默认就有高度），以便垂直拖拽生效
      try {
        if (Number(JEV_PANEL_W) > 0) jevPanel.style.width = JEV_PANEL_W + 'px';
        if (Number(JEV_PANEL_H) > 0) jevPanel.style.height = JEV_PANEL_H + 'px';
        jevPanel.style.resize = 'both';
        jevPanel.style.overflow = 'auto';
        if (typeof ResizeObserver === 'function') {
          const ro = new ResizeObserver((entries) => {
            try {
              const cr = entries && entries[0] && entries[0].contentRect;
              if (!cr) return;
              jevStoreSet('JEV_PANEL_W', Math.round(cr.width));
              jevStoreSet('JEV_PANEL_H', Math.round(cr.height));
            } catch {}
          });
          ro.observe(jevPanel);
        }
      } catch {}
      jevStatusSpan = jevPanel.querySelector('#jev-status');
      jevLogBox = jevPanel.querySelector('#jev-log');
      jevToggleBtn = jevPanel.querySelector('#jev-toggle');
      jevConfigBtn = jevPanel.querySelector('#jev-config');
      jevFlagsBox = jevPanel.querySelector('#jev-flags');
      const jevLogToggleBtn = jevPanel.querySelector('#jev-log-toggle');
      jevToggleBtn.onclick = () => { try { const newVal = !(typeof ENABLED !== 'undefined' ? ENABLED : true); if (typeof ENABLED !== 'undefined') ENABLED = newVal; setStatus(newVal ? '运行中' : '已暂停'); jevToggleBtn.textContent = newVal ? '⏸️ 暂停' : '▶️ 继续'; logUI((newVal?'恢复运行':'已暂停') + '（右下角面板控制）'); if (window.JEV_CAPTURE && typeof window.JEV_CAPTURE.setEnabled === 'function') window.JEV_CAPTURE.setEnabled(newVal); } catch {} };
      jevConfigBtn.onclick = () => { try {
        const curUrl = getWorkerBase(); const curSecret = getWebhookSecret();
        logUI('使用默认 Worker 与密钥，无需手动设置');
        // 新增：位置/联系人/会话ID以及推送/报价选项
        const newLoc = prompt('请输入 LocationId（可选，用于推送）', getLocationId() || '');
        if (typeof newLoc === 'string') { JEV_LOCATION_ID = newLoc.trim(); jevStoreSet('JEV_LOCATION_ID', JEV_LOCATION_ID); }
        const newContact = prompt('请输入 ContactId（可选，用于推送）', getContactId() || '');
        if (typeof newContact === 'string') { JEV_CONTACT_ID = newContact.trim(); jevStoreSet('JEV_CONTACT_ID', JEV_CONTACT_ID); }
        const newConv = prompt('请输入 ConversationId（可选，用于推送）', getConversationId() || '');
        if (typeof newConv === 'string') { JEV_CONVERSATION_ID = newConv.trim(); jevStoreSet('JEV_CONVERSATION_ID', JEV_CONVERSATION_ID); }
        const pushChoice = prompt('自动推送到会话？输入 yes/no', JEV_AUTO_PUSH ? 'yes' : 'no');
        if (pushChoice) { JEV_AUTO_PUSH = /^y(es)?$/i.test(pushChoice.trim()); jevStoreSet('JEV_AUTO_PUSH', JEV_AUTO_PUSH); }
        const quoteChoice = prompt('自动生成报价并发送？输入 yes/no', JEV_AUTO_QUOTE ? 'yes' : 'no');
        if (quoteChoice) { JEV_AUTO_QUOTE = /^y(es)?$/i.test(quoteChoice.trim()); jevStoreSet('JEV_AUTO_QUOTE', JEV_AUTO_QUOTE); }
        const sendMode = prompt('发送方式：worker 或 ui（不依赖官方接口请选 ui）', JEV_SEND_MODE);
        if (sendMode && /^(worker|ui)$/i.test(sendMode.trim())) { JEV_SEND_MODE = sendMode.trim().toLowerCase(); jevStoreSet('JEV_SEND_MODE', JEV_SEND_MODE); }
        renderFlags();
      } catch (e) { logUI('设置失败：' + (e.message||e)); } };
      renderFlags();
      try { ensureResultBox(); } catch {}
    } catch {}
  }
  // 替换：简化 flags 展示（隐藏 URL/Secret）
  function renderFlags(){ try { jevFlagsBox.innerHTML = `状态｜管理员: ${JEV_IS_ADMIN?'已登录':'未登录'}<br>自动推送: ${JEV_AUTO_PUSH?'开':'关'}`; } catch {} }
  function setStatus(msg){ try { ensurePanel(); if (jevStatusSpan) jevStatusSpan.textContent = String(msg||''); } catch {} }
  function logUI(msg){ try { ensurePanel(); if (!jevLogBox) return; const line = document.createElement('div'); line.textContent = `${new Date().toLocaleTimeString()} ➜ ${msg}`; jevLogBox.prepend(line); const max = 60; while (jevLogBox.children.length > max) { jevLogBox.removeChild(jevLogBox.lastChild); } } catch {} }
  // 暴露logUI到全局作用域，让外部函数可以调用
  window.logUI = logUI;
  ensurePanel(); setStatus((typeof ENABLED !== 'undefined' ? (ENABLED?'运行中':'已暂停') : '启动中...'));
  
  // 定义sendViaWorker函数，用于通过Worker发送文本
  async function sendViaWorker(text) {
    try {
      console.log('[JEV] sendViaWorker:', text);
      // 调用Cloudflare Worker接口发送文本
      const response = await fetch(`${getWorkerBase()}/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': getWebhookSecret()
        },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, path: 'worker' };
      } else {
        console.error('sendViaWorker failed:', data.error || 'Unknown error');
        return { success: false, path: 'ui' };
      }
    } catch (e) {
      console.error('sendViaWorker Error:', e);
      // 返回降级标识，让上层fallback到UI推送
      return { success: false, path: 'ui' };
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
        const quote = generateQuote(textForQuote);
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

  // 显式展示“设置”按钮，便于现场切换与排查
  try { if (jevConfigBtn) { jevConfigBtn.style.display = ''; } } catch {}
// 绑定“管理员登录/自动推送开关”的事件（仅定义一次）
  function bindFlagEvents(){
    try {
      const loginBtn = document.getElementById('jev-admin-login');
      if (loginBtn) loginBtn.onclick = () => {
        const pwd = prompt('请输入管理员密码');
        if (pwd === 'jev') { JEV_IS_ADMIN = true; jevStoreSet('JEV_IS_ADMIN', true); logUI('管理员已登录'); renderFlags(); }
        else { logUI('管理员密码错误'); }
      };
      const chk = document.getElementById('jev-auto-push-toggle');
      if (chk) chk.onchange = () => { JEV_AUTO_PUSH = !!chk.checked; jevStoreSet('JEV_AUTO_PUSH', JEV_AUTO_PUSH); logUI('自动推送：' + (JEV_AUTO_PUSH ? '开启' : '关闭')); };
    } catch {}
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
        if (!box) { logUI('设置面板未找到'); return; }
  
        // 展示并填充当前值
        if (inpWorker) inpWorker.value = getWorkerBase() || '';
        if (inpSecret) inpSecret.value = getWebhookSecret() || '';
        if (chkAutoPush) chkAutoPush.checked = !!JEV_AUTO_PUSH;
        box.style.display = 'block';
  
        // 只绑定一次保存/关闭事件
        if (!box.dataset.bound) {
          const btnSave = jevPanel.querySelector('#jev-settings-save');
          const btnClose = jevPanel.querySelector('#jev-settings-close');
          if (btnSave) btnSave.onclick = () => {
            try {
              if (inpWorker) { JEV_WORKER_URL = (inpWorker.value || '').trim(); jevStoreSet('JEV_WORKER_URL', JEV_WORKER_URL); }
              if (inpSecret) { JEV_WEBHOOK_SECRET = (inpSecret.value || '').trim(); jevStoreSet('JEV_WEBHOOK_SECRET', JEV_WEBHOOK_SECRET); }
              if (chkAutoPush) { JEV_AUTO_PUSH = !!chkAutoPush.checked; jevStoreSet('JEV_AUTO_PUSH', JEV_AUTO_PUSH); }
              box.style.display = 'none'; renderFlags(); logUI('设置已保存');
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
    const s = pickSrc(img);
    const hint = (img.getAttribute('alt') || '') + '|' + (img.getAttribute('title') || '');
    return `${s}|${hint}`;
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
  function logUI(msg){
    try {
      ensurePanel(); if (!jevLogBox) return;
      jevLogQueue.push(`${new Date().toLocaleTimeString()} ➜ ${msg}`);
      if (!jevLogScheduled) {
        jevLogScheduled = true;
        const flush = () => {
          try {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < jevLogQueue.length; i++) {
              const line = document.createElement('div');
              line.textContent = jevLogQueue[i];
              // 最新在顶部：先插入到片段头部
              frag.insertBefore(line, frag.firstChild);
            }
            jevLogBox.prepend(frag);
            jevLogQueue = [];
            // 限制最大日志条数
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
      if (img.dataset.jevUploaded === '1' || seen.has(key)) return;

      let src = pickSrc(img);
      let base64Url = null;
      let fileName = safeFileName(img.getAttribute('alt') || img.getAttribute('title') || `whatsapp_${nowTs()}.png`);
      if (!fileName.toLowerCase().endsWith('.png') && !fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) { fileName = `${fileName}.png`; }
      logUI(`检测到图片：${fileName}`);

      if (isDataUrl(src)) {
        base64Url = src;
        logUI('直接使用数据URL');
      } else {
        if (src && /^https?:/i.test(src)) {
          try { base64Url = await getBase64ViaWorker(src); } catch (e1) { logUI('Worker 拿图失败，改用前端截图'); }
        }
        if (!base64Url) {
          try { base64Url = await captureImgToDataUrl(img); logUI('已前端截图'); } catch (e2) { logUI('前端截图失败：' + e2.message); }
        }
      }

      if (!base64Url) { logUI('放弃：未获取到图片数据'); return; }
      const up = await uploadBase64(base64Url, fileName);
      notify(`已上传到R2：${up.key || up.url || fileName}`);
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
            if (!ENABLED) return;
            if (n.nodeType === 1) {
              if (n.tagName === 'IMG' && isVisible(n)) { if (!ioObserved.has(n)) { ioObserved.add(n); io.observe(n); } }
              n.querySelectorAll && n.querySelectorAll('img').forEach(img => { if (isVisible(img)) { if (!ioObserved.has(img)) { ioObserved.add(img); io.observe(img); } } });
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
    const roleText = JEV_IS_ADMIN ? '管理员' : '客服';
    const adminBtn = JEV_IS_ADMIN ? '' : ' <button id="jev-admin-login" style="margin-left:6px;padding:2px 6px;font-size:12px">管理员登录</button>';
    const autoPush = `自动推送: ${JEV_AUTO_PUSH ? '开' : '关'} <label style="margin-left:6px;font-size:12px;"><input id="jev-auto-push-toggle" type="checkbox" ${JEV_AUTO_PUSH ? 'checked' : ''}> 切换</label>`;
    const sendModeText = `发送模式: ${JEV_SEND_MODE === 'worker' ? 'Worker 推送' : 'UI 填写'}`;
    jevFlagsBox.innerHTML = `角色: ${roleText}${adminBtn}<br>${autoPush}<br>${sendModeText}`;
    if (typeof enhanceSettingsPanel === 'function') enhanceSettingsPanel();
    if (typeof updateResultActions === 'function') updateResultActions();
  } catch {}
}

// 在上传成功后，把 OCR/翻译的文字直接显示到面板“回传文字”区域
if (typeof j !== 'undefined') {
  const displayed = String(j.translated_text || j.ocr_text || '').trim();
  if (displayed) { try { setResultText(displayed); } catch {} }
}

// 新增：确保“回传文字”区域存在 & 设置文本
function ensureResultBox() {
  try {
    ensurePanel();
    if (!jevPanel) return;
    let box = jevPanel.querySelector('#jev-result');
    if (!box) {
      const jevResBox = document.createElement('div');
      jevResBox.id = 'jev-result';
      jevResBox.style.cssText = 'margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px';
      jevResBox.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>📝 回传文字</b><div style="flex:1"></div><button id="jev-copy-result" style="padding:4px 8px;font-size:12px">复制</button><button id="jev-send-result" style="padding:4px 8px;font-size:12px">推送</button><button id="jev-generate-cs" style="padding:4px 8px;font-size:12px">生成客服回复</button></div><div id="jev-result-text" style="white-space:pre-wrap;max-height:140px;overflow:auto;font-size:14px;line-height:1.5;color:#fffa"></div>';
      if (jevLogBox) { jevPanel.insertBefore(jevResBox, jevLogBox); } else { jevPanel.appendChild(jevResBox); }
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

// 更新：uploadBase64 支持单次强制 OCR/翻译，并自动写入面板
async function uploadBase64(base64Url, fileName, opts = {}) {
  logUI(`准备上传：${fileName}`);
  const body = {
    base64_url: base64Url,
    filename: fileName,
    ocr: (typeof opts.ocr === 'boolean' ? opts.ocr : ((typeof JEV_OCR!== 'undefined') ? JEV_OCR : false)),
    translate: (typeof opts.translate === 'boolean' ? opts.translate : ((typeof JEV_TRANSLATE!== 'undefined') ? JEV_TRANSLATE : false)),
    push: (typeof JEV_PUSH!=='undefined'?JEV_PUSH:false) || JEV_AUTO_PUSH,
    target_lang: (typeof JEV_TARGET_LANG!=='undefined'?JEV_TARGET_LANG:'zh-CN'),
    feature: 'DOCUMENT_TEXT_DETECTION',
    locationId: (typeof getLocationId==='function'?getLocationId():''),
    contactId: (typeof getContactId==='function'?getContactId():''),
    conversationId: (typeof getConversationId==='function'?getConversationId():'')
  };
  const r = await fetch(`${getWorkerBase()}/receive-image`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch {}  
  if (!r.ok || !j || !j.success) { logUI(`❌ 上传失败：status=${r.status}`); throw new Error(`upload failed: status=${r.status} body=${JSON.stringify(j || {})}`); }
  logUI(`✅ 上传成功：${j.key || j.url || fileName}`);
  if (j.ocr_text) { logUI(`OCR：${String(j.ocr_text).slice(0,200)}`); }
  if (j.translated_text) { logUI(`翻译：${String(j.translated_text).slice(0,200)}`); }
  try { const displayed = String(j.translated_text || j.ocr_text || '').trim(); if (displayed) setResultText(displayed); } catch {}
  
  // 新增：集成DeepSeek API处理，为客服生成报价建议和回复
  try {
    const textForAnalysis = String(j.translated_text || j.ocr_text || '').trim();
    if (textForAnalysis && JEV_IS_ADMIN) {
      logUI('正在调用DeepSeek API分析内容...');
      
      // 调用DeepSeek API进行文本分析和报价生成
      const deepSeekSystemMsg = `You are an international trade product quotation expert. Analyze the customer's needs from the provided text, and generate a professional quotation suggestion. Your response must include TWO parts:
1. ENGLISH ANSWER: Provide your analysis and quotation draft in English first
2. CHINESE EXPLANATION: Then provide a Chinese explanation of the key points and recommendations

Format your response with clear sections for English answer and Chinese explanation.`;
      
      const deepSeekBody = {
        system: deepSeekSystemMsg,
        prompt: `Customer inquiry: ${textForAnalysis}\n\nPlease provide a professional quotation analysis and recommendation.`,
        model: 'deepseek-reasoner', // 使用更强推理能力的模型
        temperature: 0.7,
        top_p: 0.95
      };
      
      const deepSeekResp = await fetch(`${getWorkerBase()}/deepseek-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': getWebhookSecret()
        },
        body: JSON.stringify(deepSeekBody)
      });
      
      let deepSeekData = null; try { deepSeekData = await deepSeekResp.json(); } catch {} 
      
      if (deepSeekResp.ok && deepSeekData && deepSeekData.success && deepSeekData.content) {
        const quoteDraft = deepSeekData.content;
        logUI(`DeepSeek分析完成，已生成报价建议`);
        
        // 显示DeepSeek的分析结果到客服推荐回复区域
        setCsText(quoteDraft);
        
        // 如果启用了自动报价功能，则发送报价
        if (JEV_AUTO_QUOTE) {
          logUI(`DeepSeek报价草案：${quoteDraft.slice(0,200)}...`);
          if (JEV_SEND_MODE === 'worker') {
            const res = await sendViaWorker(quoteDraft);
            logUI(res.path==='worker' ? '已通过Worker发送DeepSeek报价' : '已自动降级至页面UI发送报价');
          } else {
            const ok = sendViaUI(quoteDraft);
            logUI(ok ? '已通过页面UI发送DeepSeek报价' : '页面UI未找到输入框，发送失败');
          }
        }
      } else {
        const err = (deepSeekData && deepSeekData.error) ? deepSeekData.error : `HTTP ${deepSeekResp.status}`;
        logUI('DeepSeek调用失败：' + err);
      }
    }
  } catch (e) {
    logUI('DeepSeek集成处理失败：' + (e.message || e));
  }
  try {
    // DeepSeek API 已经处理了报价生成逻辑，这里保留自动推送功能
    if (JEV_AUTO_PUSH) { // 允许两种角色自动推送
      const toSend = String(j.translated_text || j.ocr_text || `已上传图片：${j.worker_url || j.url || fileName}`).slice(0,500);
      if (JEV_SEND_MODE === 'worker') { const res = await sendViaWorker(toSend); logUI(res.path==='worker' ? '已通过 Worker 推送文本' : '已自动降级至页面UI推送文本'); }
      else { const ok = sendViaUI(toSend); logUI(ok ? '已通过页面UI推送文本' : '页面UI未找到输入框，推送失败'); }
    }
  } catch (e) { logUI('自动发送失败：' + e.message); }
  return j;
}

// 新增：点击图片触发 OCR+翻译，仅处理被点击的元素
// 提取联系人/会话条目的可显示文本（优先名字）
function extractNodeTextForPerson(node) {
  try {
    if (!node) return '';
    const nameSel = ['.name','.title','.contact-name','.conversation-name','.thread-name','.user-name','.account-name'];
    for (const s of nameSel) {
      const el = node.querySelector && node.querySelector(s);
      if (el) { const t = (el.innerText || el.textContent || '').trim(); if (t) return t; }
    }
    const aria = (node.getAttribute && (node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder'))) || '';
    if (aria && aria.trim()) return aria.trim();
    let t = (node.innerText || node.textContent || '').trim();
    if (!t) return '';
    t = t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)[0] || t; // 取第一行
    t = t.replace(/\b\d{1,2}:\d{2}\s?(AM|PM)\b/i,'').trim(); // 去掉时间片段
    t = t.replace(/\s{2,}/g,' ');
    return t;
  } catch { return ''; }
}
// 覆盖：让客服也可使用自动推送（不再限制仅管理员）
function autoPushTextIfEnabled(text){
  try {
    const t = String(text || '').trim();
    if (!t) return;
    if (!JEV_AUTO_PUSH) return; // 仅依赖开关，不区分角色
    if (JEV_SEND_MODE === 'worker' && typeof sendViaWorker === 'function') {
      Promise.resolve(sendViaWorker(t)).then(res => logUI(res && res.path==='worker' ? '已自动推送文本（Worker）' : '已自动降级至页面UI推送文本')).catch(() => logUI('自动推送失败（Worker）'));
    } else {
      const ok = sendViaUI(t);
      logUI(ok ? '已自动推送文本到输入框' : '页面UI未找到输入框，自动推送失败');
    }
  } catch {}
}
document.addEventListener('click', async (e) => {
  try {
    const panel = document.getElementById('jev-upload-panel');
    if (panel && panel.contains(e.target)) return;
    const img = e.target && (e.target.closest ? e.target.closest('img') : null);
    if (img) return;
    const candidates = [
      '.chat-message', '.message', '.msg', '.msg-text', '.bubble',
      '.conversation-message', '.whatsapp-message', '.message-text',
      '.content', '.copyable-text', '[data-message]', '[data-msg]',
      '[role="textbox"]', '.ProseMirror', '.DraftEditor-content', '.public-DraftEditor-content',
      '.ql-editor[contenteditable="true"]', '.chat-input', '.composer', '.editor',
      '.conversation-item', '.conversation', '.thread-item', '.thread', '.list-item',
      '.contact', '.contact-item', '.sidebar .item', '.results .item',
      '[data-conversation]', '[data-thread]'
    ];
    let node = null;
    for (const sel of candidates) { const found = e.target.closest && e.target.closest(sel); if (found) { node = found; break; } }
    let txt = '';
    if (node) {
      txt = extractNodeTextForPerson(node);
    }
    if (!txt) {
      const inp = (e.target.closest && (e.target.closest('textarea') || e.target.closest('input[type="text"]') || e.target.closest('input:not([type])')));
      if (inp) { txt = (inp.value || '').trim(); node = inp; }
      else {
        const editable = e.target.closest && e.target.closest('[contenteditable="true"]');
        if (editable) { txt = (editable.innerText || editable.textContent || '').trim(); node = editable; }
        else { node = e.target; txt = ((node && (node.innerText || node.textContent)) || '').trim(); }
      }
    }
    if (!txt && node) { txt = (node.getAttribute('aria-label') || node.getAttribute('placeholder') || '').trim(); }
    if (!txt) {
      const sel = window.getSelection && window.getSelection();
      const selText = sel ? String(sel.toString() || '').trim() : '';
      if (selText) txt = selText;
    }
    if (!txt || txt.length < 1) return;
    const shouldTranslate = /[\u4e00-\u9fa5]/.test(txt) ? false : /[。？！!?，,]/.test(txt) || (txt.length >= 12);
    const out = shouldTranslate ? (await translateTextClient(txt)) : txt;
    setResultText(out || txt);
    autoPushTextIfEnabled(out || txt);
    logUI('已显示点击内容');
  } catch (err) { logUI('点击内容处理错误：' + (err && (err.message||err))); }
}, true);

// 新增：监听 selectionchange，选中文本自动翻译显示（带防抖）
(function(){
  let _selTimer = null; let _last = '';
  document.addEventListener('selectionchange', () => {
    try {
      const sel = window.getSelection && window.getSelection();
      const t = sel ? String(sel.toString() || '').trim() : '';
      if (!t || t.length < 2) return;
      if (t === _last) return;
      const panel = document.getElementById('jev-upload-panel');
      const anchorEl = sel && sel.anchorNode && sel.anchorNode.parentElement;
      if (panel && anchorEl && panel.contains(anchorEl)) return;
      _last = t;
      if (_selTimer) { clearTimeout(_selTimer); _selTimer = null; }
      _selTimer = setTimeout(async () => {
        try { const translated = await translateTextClient(t); setResultText(translated || t); autoPushTextIfEnabled(translated || t); logUI('已显示选中文本的翻译'); } catch {}
      }, 220);
    } catch {}
  }, true);
})();




// === 新增：翻译框（源文/译文 + 语言选择 + 操作按钮） ===
function ensureTranslateBox(){
  try {
    ensurePanel();
    if (!jevPanel) return;
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
      if (jevLogBox) { jevPanel.insertBefore(box, jevLogBox); } else { jevPanel.appendChild(box); }
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
          logUI('手动翻译完成');
          try { ensureCsBox(); if (getAutoCsEnabled()) { await generateCsFrom(res || t); } } catch {}
        } catch (e) { logUI('手动翻译失败：' + (e.message || e)); }
      };
      const copyBtn = box.querySelector('#jev-translate-copy');
      if (copyBtn) {
        copyBtn.onclick = () => {
          try { 
            const out = box.querySelector('#jev-translate-out'); 
            const t = out ? (out.value||'') : ''; 
            navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : null; 
            logUI('已复制译文'); 
          } catch {} 
        }
      };
      const pushBtn = box.querySelector('#jev-translate-push');
      if (pushBtn) {
        pushBtn.onclick = () => {
          const out = box.querySelector('#jev-translate-out');
          const t = out ? (out.value||'') : '';
          const ok = sendViaUI(t);
          logUI(ok ? '已推送译文到输入框' : '页面UI未找到输入框，推送失败');
        };
      }
      const clearBtn = box.querySelector('#jev-translate-clear');
      if (clearBtn) {
        clearBtn.onclick = () => {
          const src = box.querySelector('#jev-translate-src');
          const out = box.querySelector('#jev-translate-out');
          if (src) src.value = '';
          if (out) out.value = '';
          setResultText('');
        };
      }
    }
  } catch {}
}
// 新增：客服推荐回复区域 + 自动生成
function ensureCsBox(){
  try {
    ensurePanel(); 
    if (!jevPanel) return;
    let cs = jevPanel?.querySelector('#jev-cs-suggest');
    if (!cs) {
      cs = document.createElement('div');
      cs.id = 'jev-cs-suggest';
      cs.style.cssText = 'margin:8px 0;border-top:1px solid rgba(255,255,255,.15);padding-top:8px';
      cs.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>🤖 客服推荐回复</b><div style="flex:1"></div><label style="font-size:12px"><input id="jev-auto-cs-toggle" type="checkbox"> 自动生成</label><button id="jev-cs-copy" style="padding:4px 8px;font-size:12px">复制</button><button id="jev-cs-push" style="padding:4px 8px;font-size:12px">推送</button><button id="jev-cs-regenerate" style="padding:4px 8px;font-size:12px">重新生成</button></div><div id="jev-cs-text" style="white-space:pre-wrap;max-height:160px;overflow:auto;font-size:14px;line-height:1.5;color:#fffa"></div>';
      // 条件插入：如果jevLogBox存在则在其前插入，否则添加到面板末尾
      if (jevLogBox && jevPanel.contains(jevLogBox)) {
        jevPanel.insertBefore(cs, jevLogBox);
      } else {
        jevPanel.appendChild(cs);
      }
      const chk = cs?.querySelector('#jev-auto-cs-toggle'); 
      if (chk) {
        try { chk.checked = getAutoCsEnabled(); } catch {} 
        chk.onchange = () => {
          try {
            setAutoCsEnabled(!!chk.checked); 
            if (chk.checked) {
              const out = jevPanel?.querySelector('#jev-translate-out'); 
              const src = jevPanel?.querySelector('#jev-translate-src'); 
              const resEl = jevPanel?.querySelector('#jev-result-text'); 
              const t = (out?.value?.trim()) || (resEl?.textContent?.trim()) || (src?.value?.trim()) || '';
              if (t) generateCsFrom(t);
            }
          } catch {}
        };
      }
      const copyBtn = cs?.querySelector('#jev-cs-copy'); 
      if (copyBtn) {
        copyBtn.onclick = () => {
          try {
            const el = jevPanel?.querySelector('#jev-cs-text'); 
            const t = el ? (el.textContent||'') : ''; 
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(t); 
              logUI('已复制客服推荐回复');
            }
          } catch {}
        };
      }
      const pushBtn = cs?.querySelector('#jev-cs-push'); 
      if (pushBtn) {
        pushBtn.onclick = () => {
          const el = jevPanel?.querySelector('#jev-cs-text'); 
          const t = el ? (el.textContent||'') : ''; 
          const ok = sendViaUI(t); 
          logUI(ok ? '已推送客服推荐回复到输入框' : '页面UI未找到输入框，推送失败');
        };
      }
      const regenBtn = cs?.querySelector('#jev-cs-regenerate'); 
      if (regenBtn) {
        regenBtn.onclick = async () => {
          try {
            const out = jevPanel?.querySelector('#jev-translate-out'); 
            const src = jevPanel?.querySelector('#jev-translate-src'); 
            const resEl = jevPanel?.querySelector('#jev-result-text'); 
            const t = (out?.value?.trim()) || (resEl?.textContent?.trim()) || (src?.value?.trim()) || '';
            if (!t) {
              logUI('没有可用于生成的文本'); 
              return;
            }
            await generateCsFrom(t);
          } catch (e) {
            logUI('生成失败：' + (e.message || e));
          }
        };
      }
    }
  } catch {}
}
function setCsText(txt){ try { ensurePanel(); ensureCsBox(); const el = jevPanel?.querySelector('#jev-cs-text'); if (el) el.textContent = String(txt||''); } catch {} }
function getAutoCsEnabled(){ try { return !!jevStoreGet('JEV_AUTO_CS', true); } catch { return true; } }
function setAutoCsEnabled(v){ try { jevStoreSet('JEV_AUTO_CS', !!v); } catch {} }
async function generateCsFrom(text){
  try {
    const t = String(text||'').trim(); if (!t) return false;
    // 确保面板已初始化
    ensurePanel();
    const systemMsg = '你是一名中文客服。先迅速判断客户的语气与意图（礼貌/着急/愤怒/困惑/正式/随意/请求帮助/投诉等），并据此调整回复的语气、礼貌程度和长度。仅输出最终客服回复，不要解释分析过程。要求：简洁、友好、专业；先表达同理心或确认，再给出解决方案或下一步引导；必要时分点说明；使用简体中文；避免机械口吻与过度道歉。';
    const body = { system: systemMsg, prompt: t, model: 'deepseek-chat', temperature: 0.7, top_p: 0.95 };
    const r = await fetch(`${getWorkerBase()}/deepseek-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': getWebhookSecret() }, body: JSON.stringify(body) });
    const respTxt = await r.text(); let j = null; try { j = JSON.parse(respTxt); } catch {}
    if (r.ok && j && j.success && j.content) { setCsText(j.content); logUI('已生成客服推荐回复'); return true; }
    const err = (j && j.error) ? j.error : `HTTP ${r.status}`; logUI('生成失败：' + err); return false;
  } catch (e) { logUI('生成失败：' + (e.message || e)); return false; }
}
function setTranslateSource(txt){ try { ensurePanel(); ensureTranslateBox(); const src = jevPanel?.querySelector('#jev-translate-src'); if (src) src.value = String(txt||''); } catch {} }
function setTranslateOutput(txt){ try { ensurePanel(); ensureTranslateBox(); const out = jevPanel?.querySelector('#jev-translate-out'); const t = String(txt||''); if (out) out.value = t; try { ensureCsBox(); if (t.trim() && getAutoCsEnabled()) { generateCsFrom(t); } } catch {} } catch {} }
// 在 ensurePanel 完成后确保渲染翻译框
try { ensureTranslateBox(); } catch {}

