// ==UserScript==
// @name         JEV ChatCapture Plugin
// @namespace    JEV.L8.9.9.2
// @version      1.1
// @description  自动采集 Daojie 聊天记录并上传到 JEV Worker
// @match        https://app.daojiemarketing.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // 修复URL中的额外引号
  const WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev/messages/ingest';
  
  // 添加调试日志函数
  function log(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1];
    console.log(`[ChatCapture ${timestamp}] ${message}`, data || '');
  }

  // 获取token并验证
  function getToken() {
    const token = localStorage.getItem('JEV_AGENT_TOKEN');
    if (!token) {
      log('警告: 未找到JEV_AGENT_TOKEN');
      // 尝试从环境变量或URL参数获取token作为备份
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('jev_token') || '';
    }
    return token;
  }

  // 增强的上传消息函数
  function uploadMessage(payload) {
    const token = getToken();
    if (!token) {
      log('错误: 没有可用的token，无法上传消息');
      return Promise.reject(new Error('没有可用的token'));
    }

    log('准备上传消息', { sender: payload.sender, length: payload.body.length });
    
    return fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...payload,
        source: 'daojie_chat',
        version: '1.1'
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      log('上传成功', data);
      return data;
    })
    .catch(error => {
      log('上传失败', error);
      // 重试逻辑
      setTimeout(() => {
        log('尝试重新上传');
        uploadMessage(payload);
      }, 5000);
      throw error;
    });
  }

  // 增强的消息提取函数
  function extractMessage(node) {
    try {
      // 支持多种消息节点结构
      const messageContainers = [
        node.querySelector('.message-content'),
        node.querySelector('.chat-message'),
        node.querySelector('.message-text'),
        node
      ].filter(Boolean);

      if (messageContainers.length === 0) return;

      // 尝试多种方式获取消息文本
      const text = messageContainers[0].innerText?.trim() || '';
      
      // 获取所有图片
      const imgs = Array.from(node.querySelectorAll('img')).map(img => 
        img.src || img.dataset.src || img.getAttribute('data-original')
      ).filter(Boolean);

      // 尝试多种方式获取发送者信息
      const sender = (
        node.querySelector('.sender-name, .user-name, .sender, .message-author')?.innerText ||
        node.dataset.sender ||
        node.getAttribute('data-sender') ||
        'unknown'
      ).trim();

      // 跳过空消息
      if (!text && imgs.length === 0) {
        log('跳过空消息');
        return;
      }

      // 构建完整的消息对象
      const message = {
        sender,
        body: text,
        images: imgs,
        timestamp: new Date().toISOString(),
        messageId: node.id || `msg_${Date.now()}`,
        elementClass: node.className,
        elementId: node.id
      };

      log('提取到消息', { sender, textLength: text.length, imagesCount: imgs.length });
      uploadMessage(message);
    } catch (error) {
      log('提取消息时出错', error);
    }
  }

  // 查找聊天容器的增强版函数
  function findChatContainer() {
    const selectors = [
      '#chat-messages',
      '.chat-content',
      '.conversation-container',
      '.messages-container',
      '.chat-history',
      '[data-testid="chat-messages"]',
      '[role="chat"]',
      '.messages-list'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        log(`找到聊天容器: ${selector}`);
        return element;
      }
    }
    return null;
  }

  // 初始化观察器
  function initObserver(target) {
    log('开始观察聊天容器');
    
    // 先处理已存在的消息
    const existingMessages = target.querySelectorAll(
      '.message-item, .message-text, .chat-message, [class*="message"][class*="item"]'
    );
    
    log(`发现 ${existingMessages.length} 条已存在的消息`);
    
    // 限制初始处理的消息数量
    const recentMessages = Array.from(existingMessages).slice(-20);
    recentMessages.forEach(msg => extractMessage(msg));

    // 设置观察器
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // 检查节点本身是否是消息
            if (node.classList.contains('message-item') || 
                node.classList.contains('chat-message') ||
                node.querySelector('.message-text') ||
                node.querySelector('.message-content')) {
              extractMessage(node);
            } else {
              // 检查节点内是否包含消息
              const messages = node.querySelectorAll(
                '.message-item, .chat-message, .message-text, [class*="message"][class*="item"]'
              );
              messages.forEach(msg => extractMessage(msg));
            }
          }
        });
      });
    });

    observer.observe(target, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false 
    });

    log('聊天观察器已启动');
  }

  // 主初始化函数
  function initialize() {
    log('JEV ChatCapture 插件初始化');

    // 立即尝试查找聊天容器
    let chatContainer = findChatContainer();
    
    if (chatContainer) {
      initObserver(chatContainer);
    } else {
      log('未找到聊天容器，启动全局观察器');
      
      // 设置全局观察器
      const globalObserver = new MutationObserver(() => {
        const target = findChatContainer();
        if (target) {
          log('通过全局观察器找到聊天容器');
          globalObserver.disconnect();
          initObserver(target);
        }
      });

      // 扩大观察范围和选项
      globalObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id']
      });

      // 设置超时，防止观察器永久运行
      setTimeout(() => {
        globalObserver.disconnect();
        log('全局观察器超时，尝试直接处理当前页面');
        // 最后的尝试：直接处理文档中所有可能的消息
        const allMessages = document.querySelectorAll(
          '.message-item, .chat-message, .message-text, [class*="message"][class*="item"]'
        );
        log(`超时后发现 ${allMessages.length} 条消息`);
        allMessages.forEach(msg => extractMessage(msg));
      }, 30000); // 30秒超时
    }

    // 添加页面加载完成后的额外检查
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        log('DOM内容加载完成，再次检查聊天容器');
        const container = findChatContainer();
        if (container && !window._jevChatInitialized) {
          window._jevChatInitialized = true;
          initObserver(container);
        }
      });
    }
  }

  // 启动插件
  initialize();

  // 暴露一些调试功能
  window._jevChatCapture = {
    reload: initialize,
    getToken,
    findChatContainer
  };

  log('插件加载完成，可以通过 window._jevChatCapture 访问调试功能');
})();