// store_msg_hook.js - WhatsApp Store Hook for JEV
// 用于注入Playwright页面，实现聊天记录拉取与实时监听

console.log('[JEV] Loading store_msg_hook.js');

// 初始化JEV全局对象
window.__JEV__ = window.__JEV__ || {};
window.__JEV__.messages = window.__JEV__.messages || {};

// 立即暴露__JEV_GET_CHAT_MESSAGES__函数，即使Store不可用
window.__JEV_GET_CHAT_MESSAGES__ = async (chatId, limit = 50) => {
  console.log(`[JEV] __JEV_GET_CHAT_MESSAGES__ called for ${chatId}, limit: ${limit}`);
  
  // 直接返回空数组，因为Store不可用
  const messages = [];
  
  // 通过postMessage发送到playwright上下文
  window.postMessage({
    type: 'JEV_WHATSAPP_MESSAGE',
    action: 'history_messages',
    data: {
      chatId: chatId,
      messages: messages
    }
  }, '*');
  
  return messages;
};

console.log('[JEV] __JEV_GET_CHAT_MESSAGES__ function exposed');

// 等待Store可用
const waitForStore = async () => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkStore = () => {
      attempts++;
      
      // 方法1：直接检查window.Store
      if (window.Store && window.Store.Chat && window.Store.Msg) {
        console.log('[JEV] Store.Chat and Store.Msg available via window.Store');
        resolve(window.Store);
        return;
      }
      
      // 方法2：检查所有window属性，寻找Store对象
      for (const key in window) {
        if (typeof window[key] === 'object' && window[key] !== null) {
          // 检查是否有Chat、Contact、Msg等Store特征属性
          if (window[key].Chat && window[key].Contact && window[key].Msg) {
            console.log(`[JEV] Found Store via window.${key}`);
            resolve(window[key]);
            return;
          }
        }
      }
      
      if (attempts >= maxAttempts) {
        console.error('[JEV] Store not available after', maxAttempts, 'attempts');
        resolve(null);
        return;
      }
      
      setTimeout(checkStore, 500);
    };
    
    checkStore();
  });
};

// 标准化消息字段
const normalizeMessage = (msg) => {
  if (!msg) return null;
  
  // 构建标准化消息对象
  const result = {
    message_id: msg.id?._serialized || '',
    chatId: msg.chat?.id?._serialized || (msg.from?._serialized === msg.to?._serialized ? msg.from._serialized : msg.from._serialized + '_' + msg.to._serialized),
    fromMe: msg.fromMe || false,
    isIncoming: !(msg.fromMe || false),
    sender: null,
    text: msg.body || '',
    timestamp: msg.t || Date.now()
  };
  
  // 获取发送者信息
  if (msg.from && msg.from._serialized) {
    // 尝试从Store.Contact获取发送者信息
    let senderName = msg.from._serialized;
    
    // 检查是否有Store.Contact可用
    if (window.Store && window.Store.Contact) {
      const contact = window.Store.Contact.get(msg.from._serialized);
      if (contact) {
        senderName = contact.name || contact.pushname || contact.shortName || senderName;
      }
    }
    
    result.sender = {
      id: msg.from._serialized,
      name: senderName
    };
  }
  
  return result;
};

// 获取聊天历史消息
const getChatMessages = async (chatId, limit = 50) => {
  console.log(`[JEV] getChatMessages called for ${chatId}, limit: ${limit}`);
  
  try {
    // 确保Store可用
    const store = await waitForStore();
    if (!store) {
      console.error('[JEV] Store not available for getChatMessages');
      return [];
    }
    
    // 获取聊天对象
    const chat = store.Chat.get(chatId);
    if (!chat) {
      console.error(`[JEV] Chat ${chatId} not found`);
      return [];
    }
    
    // 获取消息模型数组
    const msgModels = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : [];
    console.log(`[JEV] Found ${msgModels.length} messages for chat ${chatId}`);
    
    // 按时间排序，取最近的limit条消息
    const sortedMsgs = msgModels
      .filter(msg => msg && msg.id && msg.body)
      .sort((a, b) => (a.t || 0) - (b.t || 0))
      .slice(-limit);
    
    // 标准化消息
    const normalizedMessages = sortedMsgs.map(normalizeMessage).filter(Boolean);
    console.log(`[JEV] Returning ${normalizedMessages.length} normalized messages for chat ${chatId}`);
    
    return normalizedMessages;
  } catch (error) {
    console.error(`[JEV] Error in getChatMessages: ${error.message}`);
    return [];
  }
};

// 初始化Hook
const initHook = async () => {
  console.log('[JEV] Initializing store_msg_hook');
  
  try {
    // 等待Store可用
    const store = await waitForStore();
    if (!store) {
      console.error('[JEV] Cannot initialize hook: Store not available');
      return;
    }
    
    // 更新__JEV_GET_CHAT_MESSAGES__函数，使用真实的Store
    window.__JEV_GET_CHAT_MESSAGES__ = async (chatId, limit = 50) => {
      console.log(`[JEV] Real __JEV_GET_CHAT_MESSAGES__ called for ${chatId}, limit: ${limit}`);
      
      const messages = await getChatMessages(chatId, limit);
      
      // 通过postMessage发送到playwright上下文
      window.postMessage({
        type: 'JEV_WHATSAPP_MESSAGE',
        action: 'history_messages',
        data: {
          chatId: chatId,
          messages: messages
        }
      }, '*');
      
      return messages;
    };
    
    console.log('[JEV] Updated __JEV_GET_CHAT_MESSAGES__ to use real Store');
    
    // 保存原始的Store.Msg.add方法
    const originalMsgAdd = store.Msg.add;
    
    // 重写Store.Msg.add方法，监听新消息
    store.Msg.add = function(...args) {
      const result = originalMsgAdd.apply(this, args);
      const msg = args[0];
      
      try {
        if (msg && msg.isNewMsg) {
          const normalizedMsg = normalizeMessage(msg);
          if (normalizedMsg) {
            console.log('[JEV] New message received:', normalizedMsg);
            
            // 通过postMessage发送到playwright上下文
            window.postMessage({
              type: 'JEV_WHATSAPP_MESSAGE',
              action: 'new_message',
              data: normalizedMsg
            }, '*');
          }
        }
      } catch (error) {
        console.error('[JEV] Error handling new message:', error);
      }
      
      return result;
    };
    
    // 或者使用Store.Msg.on('add')方法监听新消息
    if (store.Msg.on) {
      store.Msg.on('add', (msg) => {
        try {
          if (msg && msg.isNewMsg) {
            const normalizedMsg = normalizeMessage(msg);
            if (normalizedMsg) {
              console.log('[JEV] New message via Store.Msg.on:', normalizedMsg);
              
              // 通过postMessage发送到playwright上下文
              window.postMessage({
                type: 'JEV_WHATSAPP_MESSAGE',
                action: 'new_message',
                data: normalizedMsg
              }, '*');
            }
          }
        } catch (error) {
          console.error('[JEV] Error handling new message via Store.Msg.on:', error);
        }
      });
    }
    
    console.log('[JEV] Store.Msg hook installed successfully');
  } catch (error) {
    console.error('[JEV] Error initializing store_msg_hook:', error);
  }
};

// 初始化Hook
initHook();

console.log('[JEV] store_msg_hook.js loaded successfully');
