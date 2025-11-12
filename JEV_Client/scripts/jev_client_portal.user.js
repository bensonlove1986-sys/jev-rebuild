/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.764Z */
// ==UserScript==
// @name         JEV Client Portal UI Embedder
// @namespace    JEV.L8.9.9.1
// @version      1.0
// @description  氓聹篓 Daojie 莽陆聭茅隆碌氓聫鲁盲赂聥猫搂聮氓碌聦氓聟楼 JEV 氓庐垄忙聹聧 UI 莽禄聢莽芦炉
// @match        https://app.daojiemarketing.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.right = '20px';
  container.style.bottom = '20px';
  container.style.zIndex = '99999';
  container.style.width = '420px';
  container.style.height = '620px';
  container.style.border = 'none';
  container.style.borderRadius = '16px';
  container.style.overflow = 'hidden';
  container.style.boxShadow = '0 0 25px rgba(0,0,0,0.35)';
  container.style.backdropFilter = 'blur(12px)';
  container.style.transition = 'opacity .3s ease';
  container.style.opacity = '1';

  const iframe = document.createElement('iframe');
  iframe.src = 'https://jevshop.pages.dev/ui/client_portal.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.allow = 'clipboard-read; clipboard-write;';
  container.appendChild(iframe);

  const toggle = document.createElement('button');
  toggle.textContent = '冒聼聮卢 JEV';
  toggle.style.position = 'fixed';
  toggle.style.right = '20px';
  toggle.style.bottom = '660px';
  toggle.style.background = 'rgba(59,130,246,0.9)';
  toggle.style.color = '#fff';
  toggle.style.border = 'none';
  toggle.style.borderRadius = '50%';
  toggle.style.width = '50px';
  toggle.style.height = '50px';
  toggle.style.cursor = 'pointer';
  toggle.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  toggle.onclick = () => {
    container.style.opacity = container.style.opacity === '0' ? '1' : '0';
  };

  document.body.appendChild(container);
  document.body.appendChild(toggle);
  console.log('[JEV Client] Portal Loaded 芒聹聟');
})();