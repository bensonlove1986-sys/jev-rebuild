/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.762Z */
// ==UserScript==
// @name         JEV ChatCapture Plugin
// @namespace    JEV.L8.9.9.2
// @version      1.0
// @description  猫聡陋氓聤篓茅聡聡茅聸聠 Daojie 猫聛聤氓陇漏猫庐掳氓陆聲氓鹿露盲赂聤盲录聽氓聢掳 JEV Worker
// @match        https://app.daojiemarketing.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev/messages/ingest';
  const token = localStorage.getItem('JEV_AGENT_TOKEN');

  function uploadMessage(payload) {
    fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(d => {
      console.log('[ChatCapture] 盲赂聤盲录聽忙聢聬氓聤聼:', d);
    }).catch(e => console.error('[ChatCapture] 盲赂聤盲录聽氓陇卤猫麓楼', e));
  }

  function extractMessage(node) {
    try {
      const text = node.innerText?.trim() || '';
      const imgs = Array.from(node.querySelectorAll('img')).map(i => i.src);
      const sender = node.querySelector('.sender-name')?.innerText || 'unknown';
      if (!text && imgs.length === 0) return;
      uploadMessage({ sender, body: text, images: imgs, timestamp: new Date().toISOString() });
    } catch (e) { console.error('[ChatCapture] extract error', e); }
  }

  const chatContainer = document.querySelector('#chat-messages, .chat-content, .conversation-container');
  if (!chatContainer) {
    console.warn('[ChatCapture] 忙聹陋忙聣戮氓聢掳猫聛聤氓陇漏氓庐鹿氓聶篓茂录聦莽颅聣氓戮聟氓聤聽猫陆陆...');
    const observer = new MutationObserver(() => {
      const target = document.querySelector('#chat-messages, .chat-content, .conversation-container');
      if (target) { observer.disconnect(); initObserver(target); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    initObserver(chatContainer);
  }

  function initObserver(container) {
    console.log('[ChatCapture] 莽聸聭氓聬卢氓聬炉氓聤篓');
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.innerText) extractMessage(node);
        });
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  }

  console.log('[ChatCapture] 忙聫聮盲禄露氓路虏氓聤聽猫陆陆 芒聹聟');
})();