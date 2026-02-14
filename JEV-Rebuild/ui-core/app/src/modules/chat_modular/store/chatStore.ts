import { create } from 'zustand';
import { normalizeCustomerId } from '@/utils/customerId';

// 全局单例键
const STORE_KEY = "__JEV_CHAT_STORE__";

// BroadcastChannel name for cross-tab communication
const BROADCAST_CHANNEL_NAME = 'jev-chat-store';

// Tab ID for identification
const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
if ((window as any).__DEV_DEBUG__) {
  console.debug('[CHAT_STORE_TAB_INIT] Generated tab ID:', tabId);
}

// BroadcastChannel instance
let broadcastChannel: BroadcastChannel | null = null;

// Initialize BroadcastChannel
function initBroadcastChannel() {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[CHAT_STORE_BROADCAST_CHANNEL_INIT] BroadcastChannel initialized');
    }
    
    // Set up message handler
    broadcastChannel.onmessage = (event) => {
      handleBroadcastMessage(event);
    };
    
    // Set up error handler
    broadcastChannel.onerror = (error) => {
      console.error('[CHAT_STORE_BROADCAST_CHANNEL_ERROR]', error);
    };
    
    // Set up close handler
    broadcastChannel.onclose = () => {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_BROADCAST_CHANNEL_CLOSED] BroadcastChannel closed');
      }
    };
  } catch (error) {
    console.error('[CHAT_STORE_BROADCAST_CHANNEL_INIT_ERROR]', error);
    broadcastChannel = null;
  }
}

// Broadcast message to other tabs
function broadcast(message: any) {
  try {
    if (broadcastChannel) {
      const messageWithTabId = {
        ...message,
        tabId,
        timestamp: Date.now()
      };
      broadcastChannel.postMessage(messageWithTabId);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_BROADCAST_MESSAGE_SENT]', message.type);
      }
    }
  } catch (error) {
    console.error('[CHAT_STORE_BROADCAST_ERROR]', error);
  }
}

// Handle broadcast messages from other tabs
function handleBroadcastMessage(event: MessageEvent) {
  try {
    const data = event.data;
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[CHAT_STORE_BROADCAST_MESSAGE_RECEIVED]', data.type, 'from tab:', data.tabId);
    }
    
    // Ignore messages from this tab
    if (data.tabId === tabId) {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_BROADCAST_MESSAGE_IGNORED] Same tab message');
      }
      return;
    }
    
    switch (data.type) {
      case 'chat:added':
        // Another tab added a chat
        handleChatAdded(data);
        break;
      case 'message:added':
        // Another tab added a message
        handleMessageAdded(data);
        break;
      case 'chat:updated':
        // Another tab updated a chat
        handleChatUpdated(data);
        break;
      case 'message:updated':
        // Another tab updated a message
        handleMessageUpdated(data);
        break;
      case 'selectedChat:changed':
        // Another tab changed selected chat
        handleSelectedChatChanged(data);
        break;
      case 'sync:completed':
        // Another tab completed sync
        handleSyncCompleted(data);
        break;
      default:
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[CHAT_STORE_BROADCAST_MESSAGE_UNKNOWN]', data.type);
        }
    }
  } catch (error) {
    console.error('[CHAT_STORE_BROADCAST_MESSAGE_ERROR]', error);
  }
}

// Get chat store instance - using the exported getChatStore function below

// Handle chat added event from another tab
function handleChatAdded(data: any) {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_OTHER_TAB_CHAT_ADDED] Another tab added chat:', data.chatId);
  }
  // Force re-sync of chat data
  try {
    const chatStore = useChatStore.getState();
    if (chatStore && data.chat) {
      chatStore.addChat(data.chat);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_CHAT_ADDED_FROM_BROADCAST] Chat added from broadcast:', data.chatId);
      }
    }
  } catch (error) {
    console.error('[CHAT_STORE_HANDLE_CHAT_ADDED_ERROR]', error);
  }
}

// Handle message added event from another tab
function handleMessageAdded(data: any) {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_OTHER_TAB_MESSAGE_ADDED] Another tab added message:', data.messageId);
  }
  // Force re-sync of message data
  try {
    const chatStore = useChatStore.getState();
    if (chatStore && data.message) {
      chatStore.addMessage(data.message);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_MESSAGE_ADDED_FROM_BROADCAST] Message added from broadcast:', data.messageId);
      }
    }
  } catch (error) {
    console.error('[CHAT_STORE_HANDLE_MESSAGE_ADDED_ERROR]', error);
  }
}

// Handle chat updated event from another tab
function handleChatUpdated(data: any) {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_OTHER_TAB_CHAT_UPDATED] Another tab updated chat:', data.chatId);
  }
  // Force re-sync of chat data
  try {
    const chatStore = useChatStore.getState();
    if (chatStore && data.chatId && data.updates) {
      chatStore.updateChat(data.chatId, data.updates);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_CHAT_UPDATED_FROM_BROADCAST] Chat updated from broadcast:', data.chatId);
      }
    }
  } catch (error) {
    console.error('[CHAT_STORE_HANDLE_CHAT_UPDATED_ERROR]', error);
  }
}

// Handle message updated event from another tab
function handleMessageUpdated(data: any) {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_OTHER_TAB_MESSAGE_UPDATED] Another tab updated message:', data.messageId);
  }
  // Force re-sync of message data
  try {
    const chatStore = useChatStore.getState();
    if (chatStore && data.messageId && data.status) {
      chatStore.updateMessageStatus(data.messageId, data.status);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_MESSAGE_UPDATED_FROM_BROADCAST] Message updated from broadcast:', data.messageId);
      }
    }
  } catch (error) {
    console.error('[CHAT_STORE_HANDLE_MESSAGE_UPDATED_ERROR]', error);
  }
}

// Handle selected chat changed event from another tab
function handleSelectedChatChanged(data: any) {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_OTHER_TAB_SELECTED_CHAT_CHANGED] Another tab changed selected chat:', data.selectedChatId);
  }
  // No action needed, each tab maintains its own selected chat
}

// Handle sync completed event from another tab
function handleSyncCompleted(data: any) {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_OTHER_TAB_SYNC_COMPLETED] Another tab completed sync');
  }
  // Sync completed event doesn't require immediate action
  // Each tab will load data as needed
}

// Initialize BroadcastChannel
initBroadcastChannel();

// 清理被污染的 media_path
function cleanMediaPath(mediaPath) {
  if (!mediaPath || typeof mediaPath !== 'string') {
    return mediaPath;
  }
  
  // 检测污染：如果包含 "MMhttps://" 或重复的 API_BASE_URL
  if (mediaPath.includes('MMhttps://') || mediaPath.includes('MMhttp://')) {
    if ((window as any).__DEV_DEBUG__) {
      console.error('[MEDIA_PATH_CORRUPTED_CLEANUP]', mediaPath);
    }
    
    // 尝试提取干净的路径
    // 格式: /api/media/twilio/MM.../ME...
    const match = mediaPath.match(/\/api\/media\/twilio\/(MM[a-f0-9]+\/ME[a-f0-9]+)/);
    if (match && match[1]) {
      const cleanPath = `/api/media/twilio/${match[1]}`;
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[MEDIA_PATH_CLEANED]', cleanPath);
      }
      return cleanPath;
    }
    
    // 如果无法提取，返回空字符串让 UI 显示错误
    if ((window as any).__DEV_DEBUG__) {
      console.error('[MEDIA_PATH_CLEANUP_FAILED]', mediaPath);
    }
    return '';
  }
  
  return mediaPath;
}

// 合并消息函数：non-empty wins
function mergeMessageNonEmptyWins(prev, next) {
  if (!prev) {
    return next;
  }
  if (!next) {
    return prev;
  }
  
  // 创建合并后的消息对象
  const merged = {
    ...prev,
    ...next
  };
  
  // 强字段：non-empty wins
  const strongFields = [
    'type', 'kind', 'media_path', 'mediaPath', 'url', 'fileUrl',
    'mimeType', 'mediaType', 'file_type', 'media_category', 'isMedia'
  ];
  
  strongFields.forEach(field => {
    // 检查 prev 字段是否非空
    const prevValue = prev[field];
    const nextValue = next[field];
    
    // 如果 prev 有非空值，next 为空值，则保留 prev 的值
    if ((prevValue !== undefined && prevValue !== null && prevValue !== '') && 
        (nextValue === undefined || nextValue === null || nextValue === '')) {
      merged[field] = prevValue;
    }
  });
  
  return merged;
}

// 检查 chatId 是否为 canonical 格式
function isCanonicalChatId(chatId) {
  return chatId && typeof chatId === 'string' && chatId.match(/^whatsapp:\+\d+$/);
}

// 尝试将 chatId 转换为 canonical 格式
export function normalizeChatId(chatId) {
  if (!chatId || typeof chatId !== 'string') {
    return '';
  }
  let v = chatId.trim();

  if (v.startsWith("whatsapp:")) {
    v = v.replace(/\s+/g, "");
    // 提取国家码和手机号部分
    const phonePart = v.substring(9); // 移除 "whatsapp:" 前缀
    // 检查是否是纯数字且没有 + 号
    if (/^\d+$/.test(phonePart)) {
      // 添加 + 号
      return "whatsapp:+" + phonePart;
    }
    return v;
  }

  if (/^\+?\d+$/.test(v)) {
    if (!v.startsWith("+")) v = "+" + v;
    return "whatsapp:" + v;
  }

  return v;
}

// 清理消息中的被污染字段
function cleanMessage(message) {
  if (!message || typeof message !== 'object') {
    return message;
  }
  
  // 清理 media_path
  if (message.media_path) {
    message.media_path = cleanMediaPath(message.media_path);
  }
  
  // 清理其他可能的 URL 字段
  if (message.image_url) {
    message.image_url = cleanMediaPath(message.image_url);
  }
  
  if (message.url) {
    message.url = cleanMediaPath(message.url);
  }
  
  return message;
}

// 清理消息列表中的所有消息
function cleanMessages(messages) {
  if (!messages || !(messages instanceof Map)) {
    return messages;
  }
  
  const cleanedMessages = new Map();
  let cleanedCount = 0;
  
  for (const [chatId, msgs] of messages.entries()) {
    const cleanedMsgs = msgs.map(msg => {
      const originalPath = msg.media_path;
      const cleanedMsg = cleanMessage(msg);
      if (cleanedMsg.media_path !== originalPath) {
        cleanedCount++;
      }
      return cleanedMsg;
    });
    cleanedMessages.set(chatId, cleanedMsgs);
  }
  
  if (cleanedCount > 0) {
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[MESSAGES_CLEANED]', cleanedCount, 'messages cleaned');
    }
  }
  
  return cleanedMessages;
}

// 从 localStorage 加载状态 - 临时禁用，返回空对象
function loadStateFromStorage() {
  try {
    console.log('[REHYDRATE_CALLED]');
    console.log('[CHAT_STORE_LOAD_DISABLED] Local storage loading disabled, returning empty state');
    return { messages: {}, chats: {}, translations: {}, ocr: {}, ocrResults: {} };
  } catch (error) {
    console.error('[CHAT_STORE_LOAD_ERROR]', error);
    return { messages: {}, chats: {}, translations: {}, ocr: {}, ocrResults: {} };
  }
}

// 清理非 canonical keys，合并到 canonical keys
function cleanNonCanonicalKeys(messages, chats) {
  const cleanedMessages = {};
  const cleanedChats = {};
  const processedKeys = new Set();
  let droppedTwilioImages = 0;
  let droppedPollutedMessages = 0;
  let preservedMessages = 0;
  
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_CLEANING] Starting data cleaning for canonical keys');
  }
  
  // 处理消息
  for (const chatId in messages) {
    if (processedKeys.has(chatId)) continue;
    
    const canonicalChatId = normalizeChatId(chatId);
    const chatMessages = messages[chatId];
    
    // 清理基于 media_path 的规则
    const cleanedChatMessages = chatMessages.filter(msg => {
      // 保留所有文本消息，即使它们的 media_path 可能存在问题
      if (msg.type === 'text') {
        preservedMessages++;
        return true;
      }
      
      // 对于图片消息，尽量保留
      if (msg.type === 'image' || msg.kind === 'image') {
        // 只在 media_path 严重污染时才过滤
        if (msg.media_path && typeof msg.media_path === 'string') {
          // 尝试清理 media_path
          const cleanedPath = cleanMediaPath(msg.media_path);
          if (cleanedPath) {
            msg.media_path = cleanedPath;
            preservedMessages++;
            return true;
          }
        }
        // 即使 media_path 有问题，也保留消息本身
        preservedMessages++;
        return true;
      }
      
      // 其他类型的消息：保留
      preservedMessages++;
      return true;
    });
    
    if (chatId !== canonicalChatId) {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_CLEANING] Normalizing chatId:', chatId, '->', canonicalChatId);
      }
      
      // 合并消息到 canonical key
      const existingMessages = cleanedMessages[canonicalChatId] || [];
      const mergedMessages = [...existingMessages, ...cleanedChatMessages];
      // 去重 - 确保每个消息都有唯一id
      const uniqueMessages = [];
      const seenIds = new Set();
      for (const msg of mergedMessages) {
        // 为没有id的消息生成临时id
        const msgId = msg.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!seenIds.has(msgId)) {
          seenIds.add(msgId);
          // 确保消息对象有id字段
          if (!msg.id) {
            msg.id = msgId;
          }
          uniqueMessages.push(msg);
        }
      }
      // 按时间戳排序
      uniqueMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      cleanedMessages[canonicalChatId] = uniqueMessages;
      
      processedKeys.add(chatId);
    } else {
      // 已经是 canonical key，添加时也需要去重
      const uniqueMessages = [];
      const seenIds = new Set();
      for (const msg of cleanedChatMessages) {
        // 为没有id的消息生成临时id
        const msgId = msg.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!seenIds.has(msgId)) {
          seenIds.add(msgId);
          // 确保消息对象有id字段
          if (!msg.id) {
            msg.id = msgId;
          }
          uniqueMessages.push(msg);
        }
      }
      // 按时间戳排序
      uniqueMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      cleanedMessages[chatId] = uniqueMessages;
    }
  }
  
  // 处理聊天
  for (const chatId in chats) {
    const canonicalChatId = normalizeChatId(chatId);
    const chat = chats[chatId];
    
    if (chatId !== canonicalChatId) {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_CLEANING] Normalizing chat:', chatId, '->', canonicalChatId);
      }
      
      // 创建新的 canonical chat
      const canonicalChat = {
        ...chat,
        id: canonicalChatId
      };
      cleanedChats[canonicalChatId] = canonicalChat;
    } else {
      // 已经是 canonical key，直接添加
      cleanedChats[chatId] = chat;
    }
  }
  
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_CLEANING] Cleaning completed. Messages:', Object.keys(cleanedMessages).length, 'Chats:', Object.keys(cleanedChats).length);
    console.debug('[CHAT_STORE_CLEANING] Preserved messages:', preservedMessages);
  }
  
  return { cleanedMessages, cleanedChats };
}

// 保存状态到 localStorage - 临时禁用
let lastSerializedState = '';

function saveStateToStorage(messages, chats, translations = {}, ocr = {}, ocrResults = {}) {
  try {
    // 序列化当前状态
    const currentState = JSON.stringify({
      messages,
      chats,
      translations,
      ocr,
      ocrResults
    });
    
    // 只有当状态改变时才执行保存操作
    if (lastSerializedState === currentState) {
      // 状态未改变，跳过保存
      return;
    }
    
    // 更新上次序列化状态
    lastSerializedState = currentState;
    
    // 只在开发模式且启用调试存储时打印
    const DEV_MODE = import.meta.env?.DEV || (window as any).__DEV_DEBUG__;
    const debugStorage = (window as any).__DEBUG_STORAGE__;
    if (DEV_MODE && debugStorage) {
      console.log('[CHAT_STORE_SAVE_DISABLED] Local storage saving disabled');
      console.debug('[CHAT_STORE_SAVE_INFO] Would save:', Object.keys(messages).length, 'messages', Object.keys(chats).length, 'chats');
    }
  } catch (error) {
    console.error('[CHAT_STORE_SAVE_ERROR]', error);
  }
}

// 初始化聊天状态管理hook
function initializeChatStore() {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[CHAT_STORE_INITIALIZED][GLOBAL]');
  }
  
  const { messages: initialMessages, chats: initialChats, translations: initialTranslations, ocr: initialOCR, ocrResults: initialOCRResults } = loadStateFromStorage();
  
  // 打印初始化时的消息来源
  console.log("[HISTORY_SOURCE]", initialMessages);
  
  // 添加测试聊天数据（如果没有数据）
  let chatsWithTestData = initialChats;
  let messagesWithTestData = initialMessages;
  let firstChatId = Object.keys(chatsWithTestData)[0];
  
  if (Object.keys(chatsWithTestData).length === 0) {
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[CHAT_STORE] Adding test chat data');
    }
    const testChats = {};
    const testMessages = {};
    
    // 测试聊天 1
    const chat1Id = 'whatsapp:+1234567890';
    testChats[chat1Id] = {
      id: chat1Id,
      type: 'single',
      name: '测试客户 1',
      lastMessage: '你好，这是一条测试消息',
      lastMessageTime: Date.now() - 3600000,
      unreadCount: 2,
      participants: [chat1Id, 'operator'],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000
    };
    
    // 测试聊天 1 的消息
    testMessages[chat1Id] = [
      {
        id: `msg_${Date.now() - 7200000}_1`,
        chatId: chat1Id,
        from: chat1Id,
        to: 'operator',
        direction: 'inbound',
        type: 'text',
        text: '你好，我想咨询一下产品信息',
        timestamp: Date.now() - 7200000,
        status: 'read',
        isGroup: false
      },
      {
        id: `msg_${Date.now() - 3600000}_2`,
        chatId: chat1Id,
        from: chat1Id,
        to: 'operator',
        direction: 'inbound',
        type: 'text',
        text: '你好，这是一条测试消息',
        timestamp: Date.now() - 3600000,
        status: 'delivered',
        isGroup: false
      }
    ];
    
    // 测试聊天 2
    const chat2Id = 'whatsapp:+0987654321';
    testChats[chat2Id] = {
      id: chat2Id,
      type: 'single',
      name: '测试客户 2',
      lastMessage: 'Hello, this is a test message',
      lastMessageTime: Date.now() - 10800000,
      unreadCount: 1,
      participants: [chat2Id, 'operator'],
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 10800000
    };
    
    // 测试聊天 2 的消息
    testMessages[chat2Id] = [
      {
        id: `msg_${Date.now() - 10800000}_3`,
        chatId: chat2Id,
        from: chat2Id,
        to: 'operator',
        direction: 'inbound',
        type: 'text',
        text: 'Hello, this is a test message',
        timestamp: Date.now() - 10800000,
        status: 'delivered',
        isGroup: false
      }
    ];
    
    chatsWithTestData = testChats;
    messagesWithTestData = testMessages;
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[CHAT_STORE] Test chat data added:', Object.keys(chatsWithTestData).length, 'chats,', Object.keys(messagesWithTestData).length, 'message sets');
    }
    
    // 设置第一个测试聊天为默认选中
    firstChatId = Object.keys(chatsWithTestData)[0];
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[CHAT_STORE] Setting default selected chat:', firstChatId);
    }
  }
  
  return create((set, get) => ({
    // 消息版本号，用于强制 React 重新渲染
    messageVersion: 0,
    // 聊天版本号，用于强制 React 重新渲染聊天列表
    chatVersion: 0,
    
    // 去重集合，按 chatId 分组
    dedupeSets: {},
    
    // 历史加载状态
    historyLoaded: {},
    
    // 是否在 hydration 阶段
    isHydrating: true,
    
    // 初始化状态
    initState: {
      cacheLoaded: false,
      workerHistoryLoaded: false,
      websocketEnabled: false
    },
    
    // AI 自动回复设置
    aiAutoReplyEnabled: false,
    aiAutoReplyDelay: 5, // 默认延迟 5 秒,

    
    // 去重统计
    dedupeStats: {
      accept: 0,
      drop: 0,
      bySource: {}
    },
    
    // 当前选中的聊天
    selectedChatId: firstChatId || null,
    setSelectedChatId: (chatId) => set((state) => {
      // Broadcast to other tabs
      broadcast({
        type: 'selectedChat:changed',
        selectedChatId: chatId
      });
      
      // 按需加载历史消息
      if (chatId) {
        setTimeout(async () => {
          const chatStore = useChatStore.getState();
          await chatStore.loadChatHistory(chatId);
        }, 0);
      }
      
      return { selectedChatId: chatId };
    }),
    
    // 增加消息版本号
    incrementMessageVersion: () => set((state) => ({
      messageVersion: state.messageVersion + 1
    })),
    
    // 当前选中的消息
    selectedMessageId: null,
    setSelectedMessageId: (messageId) => set({ selectedMessageId: messageId }),
    
    // 聊天列表
    chats: chatsWithTestData,
    addChat: (chat) => set((state) => {
      // 统一客户 ID 格式
      const rawId = chat.id;
      const normalizedId = normalizeCustomerId(rawId);
      const isExisting = !!state.chats[normalizedId];
      console.log('[ADD_CHAT_CALLED]', {
        chatId: normalizedId,
        isExisting
      });
      console.log('RAW_ID:', rawId, 'NORMALIZED_ID:', normalizedId);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CANONICAL_APPLIED]', rawId, '→', normalizedId);
      }
      
      const normalizedChat = {
        ...chat,
        id: normalizedId,
        participants: chat.participants.map(p => normalizeCustomerId(p))
      };
      
      const newChats = { ...state.chats };
      const existingChat = state.chats[normalizedId];
      
      if (existingChat) {
        // Server tried to nullify history detection
        if (normalizedChat.lastMessage === null && existingChat.lastMessage) {
          console.warn('[SERVER_TRIED_TO_NULLIFY_HISTORY]', normalizedId);
        }
        
        // Safe merge: preserve local history fields, only update server meta fields
        newChats[normalizedId] = {
          ...existingChat,
          // Only update server-provided fields
          name: normalizedChat.name || existingChat.name,
          unreadCount: normalizedChat.unreadCount !== undefined ? normalizedChat.unreadCount : existingChat.unreadCount,
          updatedAt: normalizedChat.updatedAt || Date.now(),
          // Preserve all local history fields
          // lastMessage, lastMessageTime, messages, drafts, ocr, translations are kept from existingChat
        };
      } else {
        // Create new chat if it doesn't exist
        newChats[normalizedId] = normalizedChat;
      }
      saveStateToStorage(state.messages, newChats, state.translations, state.ocr, state.ocrResults);
      
      // Broadcast to other tabs
      broadcast({
        type: 'chat:added',
        chatId: normalizedId,
        chat: normalizedChat
      });
      
      return { chats: newChats, chatVersion: state.chatVersion + 1 };
    }),

    
    // 聊天消息
    messages: messagesWithTestData,
    updateChat: (chatId, updates) => set((state) => {
      const newChats = { ...state.chats };
      const chat = newChats[chatId];
      if (chat) {
        // Safe update: prevent overwriting local history fields through updates
        const safeUpdates = { ...updates };
        
        // Remove any history fields that should not be updated through this method
        delete safeUpdates.lastMessage;
        delete safeUpdates.lastMessageTime;
        delete safeUpdates.messages;
        delete safeUpdates.drafts;
        delete safeUpdates.ocr;
        delete safeUpdates.translations;
        
        newChats[chatId] = { ...chat, ...safeUpdates, updatedAt: Date.now() };
        saveStateToStorage(state.messages, newChats, state.translations, state.ocr, state.ocrResults);
        
        // Broadcast to other tabs
        broadcast({
          type: 'chat:updated',
          chatId: chatId,
          updates: safeUpdates
        });
      }
      return { chats: newChats, chatVersion: state.chatVersion + 1 };
    }),
    removeChat: (chatId) => set((state) => {
      const newChats = { ...state.chats };
      const newMessages = { ...state.messages };
      delete newChats[chatId];
      delete newMessages[chatId];
      saveStateToStorage(newMessages, newChats, state.translations, state.ocr, state.ocrResults);
      return { chats: newChats, messages: newMessages, chatVersion: state.chatVersion + 1 };
    }),
    setChats: (chats) => set((state) => {
      console.log('[SET_CHATS_TIMESTAMP]', Date.now());
      console.log('[SET_CHATS_CALLED]', {
        incomingLength: chats.length,
        existingLength: Object.keys(state.chats || {}).length
      });
      // 统一客户 ID 格式
      const normalizedChats = chats.map(chat => {
        const normalizedId = normalizeCustomerId(chat.id);
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[CANONICAL_APPLIED]', chat.id, '→', normalizedId);
        }
        return {
          ...chat,
          id: normalizedId,
          participants: chat.participants.map(p => normalizeCustomerId(p))
        };
      });
      
      const incomingChats = {};
      normalizedChats.forEach(chat => {
        incomingChats[chat.id] = chat;
      });
      
      // Safe merge with existing chats - preserve local history fields
      const mergedChats = { ...state.chats };
      
      normalizedChats.forEach(chat => {
        const chatId = chat.id;
        const existingChat = state.chats[chatId];
        
        if (existingChat) {
          // Server tried to nullify history detection
          if (chat.lastMessage === null && existingChat.lastMessage) {
            console.warn('[SERVER_TRIED_TO_NULLIFY_HISTORY]', chatId);
          }
          
          // Safe merge: preserve local history fields, only update server meta fields
          mergedChats[chatId] = {
            ...existingChat,
            // Only update server-provided fields
            name: chat.name || existingChat.name,
            unreadCount: chat.unreadCount !== undefined ? chat.unreadCount : existingChat.unreadCount,
            updatedAt: chat.updatedAt || Date.now(),
            // Preserve all local history fields
            // lastMessage, lastMessageTime, messages, drafts, ocr, translations are kept from existingChat
          };
        } else {
          // Create new chat if it doesn't exist
          mergedChats[chatId] = chat;
        }
      });
      
      saveStateToStorage(state.messages, mergedChats, state.translations, state.ocr, state.ocrResults);
      return { chats: mergedChats, chatVersion: state.chatVersion + 1 };
    }),
    addMessage: (message, source = 'unknown') => set((state) => {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_APPEND_OK]', message);
      }
      
      // 校验：只记录日志，不阻断 append
      if (message.direction === 'outbound') {
        if (!message.id?.startsWith('SM') && !message.id?.startsWith('msg_local_') && message.type !== 'image') {
          console.error('ILLEGAL_OUTBOUND_ID', message);
          if ((window as any).__DEV_DEBUG__) {
            console.debug('[INVALID_OUTBOUND_ID_LOGGED]', message.id);
          }
          // 不再阻断，继续处理
        }
      }
      
      // 防污染保护：确保 chatId 是 canonical 格式
      let canonicalChatId = message.chatId;
      if (canonicalChatId) {
        canonicalChatId = normalizeChatId(canonicalChatId);
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[CANONICAL_APPLIED]', message.chatId, '→', canonicalChatId);
        }
        // 拒绝无效的 chatId
        if (!isCanonicalChatId(canonicalChatId)) {
          console.error('[CHAT_STORE_ERROR] Invalid chatId rejected:', message.chatId);
          return {};
        }
      }
      
      const msgWithCanonicalId = {
        ...message,
        id: message.id || message.message_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 确保消息有唯一id
        chatId: canonicalChatId,
        customer_id: canonicalChatId,
        source: message.source || source // 添加消息来源标记
      };
      
      const oldMessages = state.messages;
      const chatMessages = oldMessages[canonicalChatId] || [];
      const existingMessageIndex = chatMessages.findIndex(msg => msg.id === msgWithCanonicalId.id);
      if (existingMessageIndex >= 0) {
        // 发现重复消息 ID，记录警告并返回
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[DUPLICATE_MESSAGE_ID_DROP]', msgWithCanonicalId.id);
        }
        // 即使重复被丢弃，也要确保当前聊天的引用被更新，避免 UI 卡死
        if (state.selectedChatId === canonicalChatId) {
          if ((window as any).__DEV_DEBUG__) {
            console.debug('[RENDER_SOURCE_CHECK] Duplicate message but selected chat, forcing update');
          }
          // 创建一个新的对象和数组引用，确保 React 重新渲染
          const newMessages = { ...oldMessages };
          // 创建一个新的数组引用，即使内容相同
          newMessages[canonicalChatId] = [...chatMessages];
          return { messages: newMessages };
        }
        return {};
      }
      
      // 添加新消息（创建新数组，避免突变现有数组）
      const updatedChatMessages = [...chatMessages, msgWithCanonicalId];
      // 按时间戳排序
      updatedChatMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // 创建全新的对象引用，确保 React 检测到变化
      const newMessages = { ...oldMessages };
      // 对于当前聊天，使用新的数组引用
      newMessages[canonicalChatId] = updatedChatMessages;
      
      console.log('[MESSAGES_WRITE]', {
        chatId: canonicalChatId,
        count: updatedChatMessages.length
      });
      
      // 更新聊天的最后一条消息
      const newChats = { ...state.chats };
      if (newChats[canonicalChatId]) {
        // 对于当前聊天，更新最后一条消息
        newChats[canonicalChatId] = {
          ...newChats[canonicalChatId],
          lastMessage: msgWithCanonicalId,
          lastMessageTime: msgWithCanonicalId.timestamp,
          updatedAt: Date.now(),
          // 如果是未读消息，增加未读计数
          unreadCount: msgWithCanonicalId.direction === 'inbound' && newChats[canonicalChatId].id !== state.selectedChatId 
            ? (newChats[canonicalChatId].unreadCount + 1 || 1) 
            : newChats[canonicalChatId].unreadCount
        };
      }
      
      // 保存到 sessionStorage
      saveStateToStorage(newMessages, newChats, state.translations, state.ocr, state.ocrResults);
      
      // 触发新消息事件
      eventEmitter.emit('newMessage', canonicalChatId, msgWithCanonicalId);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CHAT_STORE_EVENT] Emitted newMessage event for chatId:', canonicalChatId, 'messageId:', msgWithCanonicalId.id);
      }
      
      // Broadcast to other tabs
      broadcast({
        type: 'message:added',
        messageId: msgWithCanonicalId.id || msgWithCanonicalId.message_id,
        chatId: canonicalChatId,
        message: msgWithCanonicalId
      });
      
      // 打印渲染源检查日志
      if (state.selectedChatId === canonicalChatId) {
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[RENDER_SOURCE_CHECK] selectedChatId=', canonicalChatId, 'listRefChanged=true length=', updatedChatMessages.length);
        }
      }
      
      // 增加消息版本号，确保 React 重新渲染
      return { messages: newMessages, chats: newChats, messageVersion: state.messageVersion + 1 };
    }),
    appendMessage: (message, source = 'UNKNOWN') => set((state) => {
      // 声明 mergedMessage 变量
      let mergedMessage = null;
      
      // HARD GUARD: 过滤非消息事件对象
      if (!message.kind && !message.type) {
        // 检查是否为事件对象
        const isEventObject = message.type === 'draft_complete' || message.type === 'TRANSLATION_READY' || 
                            message.eventType === 'draft_complete' || message.eventType === 'TRANSLATION_READY';
        
        if (isEventObject || (!message.kind && !message.type)) {
          console.warn('[DROP_NON_MESSAGE_EVENT]', message);
          return {};
        }
      }
      
      // 校验：只记录日志，不阻断 append
      if (message.direction === 'outbound') {
        if (!message.id?.startsWith('SM') && !message.id?.startsWith('msg_local_') && message.type !== 'image') {
          console.error('ILLEGAL_OUTBOUND_ID', message);
          // 不再阻断，继续处理
        }
      }
      
      // 为消息分配默认 chatId（如果没有的话），优先使用 customer_id
      let chatId = message.chatId || message.customer_id || message.from || message.to || 'default';
      
      // 防污染保护：确保 chatId 是 canonical 格式
      const canonicalChatId = normalizeChatId(chatId);
      
      // 拒绝无效的 chatId
      if (!isCanonicalChatId(canonicalChatId)) {
        console.error('[CHAT_STORE_ERROR] Invalid chatId rejected:', chatId);
        return {};
      }
      
      // 检查消息是否为媒体消息且 media_path 为空
      const looksLikeMedia = message.type === 'image' || message.kind === 'image' || message.media_kind || message.media_type;
      if (looksLikeMedia && !message.media_path) {
        // 标记为 pending
        message.media_status = 'pending';
      }
      
      // 生成 dedupe_key
      const baseId = message.id || message.message_id || message.sid || '';
      const tsBucket = Math.floor((message.timestamp || message.ts || 0) / 1000); // 秒级
      let contentSig;
      if (message.text && message.text.trim()) {
        contentSig = message.text.trim().slice(0, 64);
      } else if (looksLikeMedia) {
        contentSig = `media:${message.media_kind || message.kind || message.type || 'unknown'}:${message.media_path || ''}`;
      } else {
        contentSig = 'empty';
      }
      const dedupeKey = `${canonicalChatId}|${baseId || contentSig}|${tsBucket}`;
      
      // 初始化 dedupeSets 结构
      const newDedupeSets = { ...state.dedupeSets };
      if (!newDedupeSets[canonicalChatId]) {
        newDedupeSets[canonicalChatId] = new Set();
      }
      
      // 检查 dedupe_key 是否已存在
      if (newDedupeSets[canonicalChatId].has(dedupeKey)) {
        // 去重：消息在渲染前被 filter/早退全部抹掉
        
        // 更新去重统计
        const newDedupeStats = { ...state.dedupeStats };
        newDedupeStats.drop += 1;
        if (!newDedupeStats.bySource[source]) {
          newDedupeStats.bySource[source] = { accept: 0, drop: 0 };
        }
        newDedupeStats.bySource[source].drop += 1;
        
        // 重复消息直接返回，不创建新的引用，避免不必要的渲染
        return { dedupeStats: newDedupeStats };
      }
      
      // 添加 dedupe_key 到集合
      newDedupeSets[canonicalChatId].add(dedupeKey);
      
      // 更新去重统计
      const newDedupeStats = { ...state.dedupeStats };
      newDedupeStats.accept += 1;
      if (!newDedupeStats.bySource[source]) {
        newDedupeStats.bySource[source] = { accept: 0, drop: 0 };
      }
      newDedupeStats.bySource[source].accept += 1;
      
      const msgWithCanonicalId = { 
        ...message, 
        id: message.id || message.message_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 确保消息有唯一id
        chatId: canonicalChatId,
        customer_id: canonicalChatId, // 确保 customer_id 也是 canonical 格式
        media_status: message.media_status || (looksLikeMedia && !message.media_path ? 'pending' : undefined)
      };
      
      // 防御层：阻止 dataUrl 进入存储
      if (msgWithCanonicalId.media_path?.startsWith("data:")) {
        console.warn("[MEDIA_BLOCKED_DATAURL]");
        msgWithCanonicalId.media_path = "__BLOCKED__";
      }
      
      // 防御层：处理 media_source 中的 dataUrl
      if (msgWithCanonicalId.type === 'image' && msgWithCanonicalId.media_source?.type === 'dataUrl') {
        console.warn("[MEDIA_SOURCE_BLOCKED_DATAURL]");
        msgWithCanonicalId.media_path = undefined;
        if (msgWithCanonicalId.media_source) {
          msgWithCanonicalId.media_source = { type: 'dataUrl', previewOnly: true };
        }
      }
      
      // 媒体消息字段补全（作为最后的防线）
      if (!msgWithCanonicalId.text || msgWithCanonicalId.text.trim() === '') {
        const media = 
          message.raw?.media_url || 
          message.raw?.image || 
          message.raw?.file_url || 
          message.raw?.url || 
          message.raw?.body_url || 
          message.raw?.media ||
          // 从根级别提取媒体字段
          message.media_url || 
          message.image || 
          message.file_url || 
          message.url || 
          message.body_url || 
          message.media;

        const messageId = msgWithCanonicalId.id || msgWithCanonicalId.message_id;
        const isTwilioMediaMessage = messageId && typeof messageId === 'string' && messageId.startsWith('MM');

        if (media || isTwilioMediaMessage) {
          msgWithCanonicalId.text = '[MEDIA]';
          if (media) {
            msgWithCanonicalId.media_path = media;
          }
          msgWithCanonicalId.type = 'image';
          msgWithCanonicalId.kind = 'image';
        }
      }
      
      // 再次检查 outbound 消息的 ID
      if (msgWithCanonicalId.direction === 'outbound') {
        if (!msgWithCanonicalId.id?.startsWith('SM') && !msgWithCanonicalId.id?.startsWith('msg_local_') && msgWithCanonicalId.type !== 'image') {
          console.error('ILLEGAL_OUTBOUND_ID', msgWithCanonicalId);
          // 不再阻断，继续处理
        }
      }
      
      const oldMessages = state.messages;
      const chatMessages = oldMessages[canonicalChatId] || [];
      // 检查消息 ID 是否重复
      const existingMessageIndex = chatMessages.findIndex(msg => msg.id === msgWithCanonicalId.id);
      if (existingMessageIndex >= 0) {
        // 发现重复消息 ID，使用强合并策略更新现有消息
        
        // 获取现有消息
        const existingMessage = chatMessages[existingMessageIndex];
        
        // 使用 non-empty wins 策略合并消息
        const mergedMessage = mergeMessageNonEmptyWins(existingMessage, msgWithCanonicalId);
        
        // 同步填充媒体路径字段
        if (mergedMessage.mediaPath || mergedMessage.media_path) {
          const mediaPath = mergedMessage.mediaPath || mergedMessage.media_path;
          mergedMessage.mediaPath = mediaPath;
          mergedMessage.media_path = mediaPath;
          mergedMessage.url = mediaPath;
          mergedMessage.fileUrl = mediaPath;
        }
        
        // 创建新的消息数组并更新重复的消息
        const updatedChatMessages = [...chatMessages];
        updatedChatMessages[existingMessageIndex] = mergedMessage;
        
        // 创建全新的对象引用，确保 React 检测到变化
        const newMessages = { ...oldMessages };
        newMessages[canonicalChatId] = updatedChatMessages;
        
        console.log('[MESSAGES_WRITE]', {
          chatId: canonicalChatId,
          count: updatedChatMessages.length
        });
        
        // 更新聊天的最后一条消息
        const newChats = { ...state.chats };
        if (newChats[canonicalChatId]) {
          newChats[canonicalChatId] = {
            ...newChats[canonicalChatId],
            lastMessage: mergedMessage,
            lastMessageTime: mergedMessage.timestamp,
            updatedAt: Date.now()
          };
        }
        
        // 保存到 sessionStorage
        saveStateToStorage(newMessages, newChats, state.translations, state.ocr, state.ocrResults);
        
        // 触发新消息事件
        eventEmitter.emit('newMessage', canonicalChatId, mergedMessage);
        
        // 增加消息版本号，确保 React 重新渲染
        return { messages: newMessages, chats: newChats, messageVersion: state.messageVersion + 1, dedupeSets: newDedupeSets, dedupeStats: newDedupeStats };
      }
      
      // 添加新消息（创建新数组，避免突变现有数组）
      const updatedChatMessages = [...chatMessages, msgWithCanonicalId];
      // 按时间戳排序
      updatedChatMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      // 为新消息分支赋值 mergedMessage
      mergedMessage = msgWithCanonicalId;
      
      // 创建全新的对象引用，确保 React 检测到变化
      const newMessages = { ...oldMessages };
      // 对于当前聊天，使用新的数组引用
      newMessages[canonicalChatId] = updatedChatMessages;
      
      // 更新聊天的最后一条消息
      const newChats = { ...state.chats };
      if (newChats[canonicalChatId]) {
        // 对于当前聊天，更新最后一条消息
        newChats[canonicalChatId] = {
          ...newChats[canonicalChatId],
          lastMessage: msgWithCanonicalId,
          lastMessageTime: msgWithCanonicalId.timestamp,
          updatedAt: Date.now(),
          // 如果是未读消息，增加未读计数
          unreadCount: msgWithCanonicalId.direction === 'inbound' && newChats[canonicalChatId].id !== state.selectedChatId 
            ? (newChats[canonicalChatId].unreadCount + 1 || 1) 
            : newChats[canonicalChatId].unreadCount
        };
      }
      
      // 如果聊天不存在，创建新的聊天项
      if (!newChats[canonicalChatId]) {
        // 当发送消息给新联系人或收到新联系人的消息时，自动创建新的聊天项
        const newChat = {
          id: canonicalChatId,
          type: 'single' as const,
          name: canonicalChatId.replace('whatsapp:+', ''),
          lastMessage: msgWithCanonicalId,
          lastMessageTime: msgWithCanonicalId.timestamp,
          unreadCount: msgWithCanonicalId.direction === 'inbound' ? 1 : 0,
          participants: [canonicalChatId, 'operator'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        newChats[canonicalChatId] = newChat;
      }
      
      // 保存到 sessionStorage
      saveStateToStorage(newMessages, newChats, state.translations, state.ocr, state.ocrResults);
      
      // 触发新消息事件
      eventEmitter.emit('newMessage', canonicalChatId, msgWithCanonicalId);
      
      // Broadcast to other tabs
      broadcast({
        type: 'message:added',
        messageId: msgWithCanonicalId.id || msgWithCanonicalId.message_id,
        chatId: canonicalChatId,
        message: msgWithCanonicalId
      });
      
      // 增加消息版本号，确保 React 重新渲染
      return { messages: newMessages, chats: newChats, messageVersion: state.messageVersion + 1, dedupeSets: newDedupeSets, dedupeStats: newDedupeStats };
    }),
    updateMessageStatus: (messageId, status, error) => set((state) => {
      const newMessages = { ...state.messages };
      let updated = false;
      
      // 遍历所有聊天的消息，更新匹配的消息状态
      for (const chatId in newMessages) {
        const messages = newMessages[chatId];
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex >= 0) {
          // 使用不可变更新模式，创建新的消息数组
          const updatedMessages = [...messages];
          updatedMessages[messageIndex] = { ...messages[messageIndex], status, error };
          newMessages[chatId] = updatedMessages;
          updated = true;
          break;
        }
      }
      
      if (updated) {
        // 保存到 sessionStorage
        saveStateToStorage(newMessages, state.chats, state.translations, state.ocr, state.ocrResults);
        
        // Broadcast to other tabs
        broadcast({
          type: 'message:updated',
          messageId: messageId,
          status: status,
          error: error
        });
      }
      
      return updated ? { messages: newMessages, messageVersion: state.messageVersion + 1 } : {};
    }),
    
    // 删除消息
    deleteMessage: (chatId, messageId) => set((state) => {
      const newMessages = { ...state.messages };
      const newChats = { ...state.chats };
      let updated = false;
      
      // 检查聊天是否存在
      if (newMessages[chatId]) {
        const messages = newMessages[chatId];
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex >= 0) {
          // 使用不可变更新模式，创建新的消息数组
          const updatedMessages = messages.filter(msg => msg.id !== messageId);
          newMessages[chatId] = updatedMessages;
          updated = true;
          
          // 更新聊天的最后一条消息
          if (newChats[chatId]) {
            if (updatedMessages.length > 0) {
              // 使用最后一条消息作为新的最后一条消息
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              newChats[chatId] = {
                ...newChats[chatId],
                lastMessage: lastMessage,
                lastMessageTime: lastMessage.timestamp,
                updatedAt: Date.now()
              };
            } else {
              // 如果没有消息了，清空最后一条消息
              newChats[chatId] = {
                ...newChats[chatId],
                lastMessage: '',
                lastMessageTime: 0,
                updatedAt: Date.now()
              };
            }
          }
        }
      }
      
      if (updated) {
        // 保存到 sessionStorage
        saveStateToStorage(newMessages, newChats, state.translations, state.ocr, state.ocrResults);
        
        // Broadcast to other tabs
        broadcast({
          type: 'message:deleted',
          messageId: messageId,
          chatId: chatId
        });
      }
      
      return updated ? { messages: newMessages, chats: newChats, messageVersion: state.messageVersion + 1 } : {};
    }),
    
    // 硬重置（Clean Boot 专用）
    resetHard: () => set(() => {
      console.log('[CHAT_STORE_RESET_HARD] Performing hard reset of chat store');
      
      // 彻底清空所有状态
      const emptyState = {
        messageVersion: 0,
        chatVersion: 0,
        dedupeSets: {},
        aiAutoReplyEnabled: false,
        aiAutoReplyDelay: 5,
        selectedChatId: null,
        selectedMessageId: null,
        chats: {},
        messages: {},
        translations: {},
        ocr: {},
        ocrResults: {},
        dedupeStats: {
          accept: 0,
          drop: 0,
          bySource: {}
        },
        initState: {
          cacheLoaded: false,
          workerHistoryLoaded: false,
          websocketEnabled: false
        }
      };
      
      // 清空 localStorage 中的 chat 相关数据
      try {
        localStorage.removeItem('jev_chat_store');
        localStorage.removeItem('jev_chat_state');
        localStorage.removeItem('jev_chat_messages');
        console.log('[CHAT_STORE_RESET_HARD] Cleared chat-related localStorage keys');
      } catch (error) {
        console.error('[CHAT_STORE_RESET_HARD_ERROR] Error clearing localStorage:', error);
      }
      
      console.log('[CHAT_STORE_RESET_HARD] Hard reset completed successfully');
      return emptyState;
    }),
    
    // 更新初始化状态
    updateInitState: (updates) => set((state) => {
      const newInitState = {
        ...state.initState,
        ...updates
      };
      console.log('[CHAT_STORE_INIT_STATE_UPDATED]', newInitState);
      return { initState: newInitState };
    }),
    
    // 检查初始化是否完成
    isInitComplete: () => {
      const state = get();
      const isComplete = state.initState.cacheLoaded && state.initState.workerHistoryLoaded;
      
      // 当初始化完成时，标记 hydration 阶段结束
      if (isComplete && state.isHydrating) {
        set({ isHydrating: false });
        console.log('[HYDRATION_COMPLETE] Hydration phase completed');
      }
      
      return isComplete;
    },
    // 获取最后一条消息的时间戳，用于生成since参数
    getLastMessageTimestamp: (chatId) => {
      const state = get();
      const messages = state.messages[chatId] || [];
      if (messages.length === 0) {
        return 0;
      }
      // 按时间戳排序，返回最新的时间戳
      const sortedMessages = [...messages].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return sortedMessages[0].timestamp || 0;
    },
    
    // 安全按需加载历史消息
    loadChatHistory: async (chatId) => {
      const state = get();
      
      // 检查是否在 hydration 阶段
      if (state.isHydrating) {
        console.error('[SAFE_HISTORY_ERROR] Cannot load history during hydration');
        return false;
      }
      
      // 检查历史是否已加载
      if (state.historyLoaded[chatId]) {
        console.log('[SAFE_HISTORY] History already loaded for chat:', chatId);
        return false;
      }
      
      // 检查消息是否已存在
      if (state.messages[chatId]) {
        console.log('[SAFE_HISTORY] Messages already exist for chat:', chatId);
        return false;
      }
      
      try {
        console.log('[SAFE_HISTORY_LOADING] Loading history for chat:', chatId);
        
        // 导入 JEV_RUNTIME
        const { JEV_RUNTIME } = await import('@/core/jev_runtime_config');
        const historyPath = `${JEV_RUNTIME.API_BASE}/inbox/history?customer_id=${encodeURIComponent(chatId)}&limit=30`;
        
        console.log('[SAFE_HISTORY_REQUEST]', historyPath);
        
        const response = await fetch(historyPath);
        if (!response.ok) {
          throw new Error(`History load failed: ${response.status}`);
        }
        
        const historyData = await response.json();
        const historyMessages = historyData.messages || [];
        
        console.log('[SAFE_HISTORY_RESPONSE] Loaded', historyMessages.length, 'messages');
        
        // 过滤消息
        const filteredMessages = historyMessages.filter(msg => {
          // 时间过滤：丢弃 90 天前的消息
          const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
          if (msg.timestamp < ninetyDaysAgo) {
            console.log('[SAFE_HISTORY_FILTERED] Old message filtered out:', msg.id);
            return false;
          }
          return true;
        });
        
        console.log('[SAFE_HISTORY_FILTERED] After filtering:', filteredMessages.length, 'messages');
        
        if (filteredMessages.length === 0) {
          console.log('[SAFE_HISTORY] No valid messages to load');
          // 标记为已加载
          set((state) => ({
            historyLoaded: {
              ...state.historyLoaded,
              [chatId]: true
            }
          }));
          return true;
        }
        
        // 去重并写入消息
        set((state) => {
          const existingMessages = state.messages[chatId] || [];
          const existingIds = new Set(existingMessages.map(msg => msg.id));
          
          // 去重
          const uniqueMessages = filteredMessages.filter(msg => {
            if (existingIds.has(msg.id)) {
              console.log('[SAFE_HISTORY_DUPLICATE] Duplicate message filtered out:', msg.id);
              return false;
            }
            return true;
          });
          
          console.log('[SAFE_HISTORY_UNIQUE] After deduplication:', uniqueMessages.length, 'messages');
          
          // 合并消息
          const mergedMessages = [...existingMessages, ...uniqueMessages];
          // 按时间戳排序
          mergedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          
          console.log('[MESSAGES_WRITE]', {
            chatId,
            count: mergedMessages.length
          });
          
          return {
            messages: {
              ...state.messages,
              [chatId]: mergedMessages
            },
            historyLoaded: {
              ...state.historyLoaded,
              [chatId]: true
            }
          };
        });
        
        console.log('[SAFE_HISTORY_SUCCESS] History loaded successfully for chat:', chatId);
        return true;
      } catch (error) {
        console.error('[SAFE_HISTORY_ERROR]', error);
        return false;
      }
    },
    
    // 设置 hydration 状态
    setHydrationComplete: () => set((state) => ({
      isHydrating: false
    })),
    
    // 重置历史加载状态
    resetHistoryLoaded: (chatId) => set((state) => {
      const newHistoryLoaded = { ...state.historyLoaded };
      if (chatId) {
        delete newHistoryLoaded[chatId];
      } else {
        // 清空所有历史加载状态
        return { historyLoaded: {} };
      }
      return { historyLoaded: newHistoryLoaded };
    }),
    addMessages: (chatId, messages) => set((state) => {
      // 防污染保护：确保 chatId 是 canonical 格式
      const canonicalChatId = normalizeChatId(chatId);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[CANONICAL_APPLIED]', chatId, '→', canonicalChatId);
      }
      // 拒绝无效的 chatId
      if (!isCanonicalChatId(canonicalChatId)) {
        console.error('[CHAT_STORE_ERROR] Invalid chatId rejected:', chatId);
        return {};
      }
      
      const oldMessages = state.messages;
      const existingMessages = oldMessages[canonicalChatId] || [];
      // 合并消息，去重
      const existingMessageIds = new Set(existingMessages.map(msg => msg.id));
      const newMessagesOnly = messages.filter(msg => !existingMessageIds.has(msg.id));
      const allMessages = [...existingMessages, ...newMessagesOnly];
      // 使用对象去重，使用 non-empty wins 策略
      const uniqueMessagesMap = {};
      allMessages.forEach(msg => {
        if (uniqueMessagesMap[msg.id]) {
          // 如果已存在同 ID 消息，使用 non-empty wins 策略合并
          uniqueMessagesMap[msg.id] = mergeMessageNonEmptyWins(uniqueMessagesMap[msg.id], msg);
        } else {
          // 不存在则直接添加
          uniqueMessagesMap[msg.id] = msg;
        }
      });
      const uniqueMessages = Object.values(uniqueMessagesMap);
      // 按时间戳排序
      const sortedMessages = uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // 创建全新的对象引用，确保 React 检测到变化
      const newMessages = { ...oldMessages };
      // 对于当前聊天，使用新的数组引用
      newMessages[canonicalChatId] = sortedMessages;
      
      console.log('[MESSAGES_WRITE]', {
        chatId: canonicalChatId,
        count: sortedMessages.length
      });
      
      // 保存到 sessionStorage
      saveStateToStorage(newMessages, state.chats, state.translations, state.ocr, state.ocrResults);
      
      // 为每个新消息触发新消息事件
      newMessagesOnly.forEach(msg => {
        eventEmitter.emit('newMessage', canonicalChatId, msg);
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[CHAT_STORE_EVENT] Emitted newMessage event for chatId:', canonicalChatId, 'messageId:', msg.id);
        }
      });
      
      // 打印渲染源检查日志
      if (state.selectedChatId === canonicalChatId && (window as any).__DEV_DEBUG__) {
        console.debug('[RENDER_SOURCE_CHECK] selectedChatId=', canonicalChatId, 'listRefChanged=true length=', sortedMessages.length);
      }
      
      // 增加消息版本号，确保 React 重新渲染
      return { messages: newMessages, messageVersion: state.messageVersion + 1 };
    }),

    
    // 翻译存储
    translations: initialTranslations,
    setTranslation: (messageId, translation) => set((state) => {
      const newTranslations = {
        ...state.translations,
        [messageId]: {
          ...translation,
          ts: Date.now()
        }
      };
      saveStateToStorage(state.messages, state.chats, newTranslations, state.ocr, state.ocrResults);
      return { translations: newTranslations };
    }),
    getTranslation: (messageId) => {
      const state = useChatStore.getState();
      return state.translations[messageId];
    },
    removeTranslation: (messageId) => set((state) => {
      const newTranslations = { ...state.translations };
      delete newTranslations[messageId];
      saveStateToStorage(state.messages, state.chats, newTranslations, state.ocr, state.ocrResults);
      return { translations: newTranslations };
    }),
    clearTranslations: () => set((state) => {
      saveStateToStorage(state.messages, state.chats, {}, state.ocr, state.ocrResults);
      return { translations: {} };
    }),
    
    // OCR 存储
    ocr: initialOCR,
    ocrResults: initialOCRResults || {},
    setOCR: (messageId, ocrResult) => set((state) => {
      const newOCR = {
        ...state.ocr,
        [messageId]: {
          ...ocrResult,
          ts: Date.now()
        }
      };
      saveStateToStorage(state.messages, state.chats, state.translations, newOCR, state.ocrResults);
      return { ocr: newOCR };
    }),
    setOCRResult: (messageId, text, meta={}) => set((state) => {
      if(!messageId) return {};
      const newOCRResults = {
        ...(state.ocrResults || {}),
        [messageId]: {
          message_id: messageId,
          text: text || "",
          ts: Date.now(),
          ...meta
        }
      };
      saveStateToStorage(state.messages, state.chats, state.translations, state.ocr, newOCRResults);
      return { ocrResults: newOCRResults };
    }),
    applyOCR: (messageId, ocrResult) => set((state) => {
      const newOCR = {
        ...state.ocr,
        [messageId]: {
          ...ocrResult,
          ts: Date.now()
        }
      };
      saveStateToStorage(state.messages, state.chats, state.translations, newOCR, state.ocrResults);
      return { ocr: newOCR };
    }),
    getOCR: (messageId) => (state) => {
      return state.ocr[messageId];
    },
    removeOCR: (messageId) => set((state) => {
      const newOCR = { ...state.ocr };
      delete newOCR[messageId];
      const newOCRResults = { ...state.ocrResults };
      delete newOCRResults[messageId];
      saveStateToStorage(state.messages, state.chats, state.translations, newOCR, newOCRResults);
      return { ocr: newOCR, ocrResults: newOCRResults };
    }),
    clearOCR: () => set((state) => {
      saveStateToStorage(state.messages, state.chats, state.translations, {}, {});
      return { ocr: {}, ocrResults: {} };
    }),
    // 增量同步相关方法
    performIncrementalSync: async (since) => {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[INCREMENTAL_SYNC_START]', since);
      }
      try {
        const response = await fetch(`/api/inbox/pull?since=${since}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[INCREMENTAL_SYNC_OK]', data);
        }
        
        if (data.messages && data.messages.length > 0) {
          const state = useChatStore.getState();
          data.messages.forEach(message => {
            state.appendMessage(message);
          });
        }
        
        return data;
      } catch (error) {
        console.error('[INCREMENTAL_SYNC_ERROR]', error);
        throw error;
      }
    },
    
    // 消息发送
    sendingMessages: new Map(),
    setSendingMessage: (messageId, isSending) => set((state) => {
      const newSendingMessages = new Map(state.sendingMessages);
      if (isSending) {
        newSendingMessages.set(messageId, true);
      } else {
        newSendingMessages.delete(messageId);
      }
      return { sendingMessages: newSendingMessages };
    }),
    
    // 聊天连接状态
    isConnected: false,
    setIsConnected: (isConnected) => set({ isConnected }),
    
    // 加载状态
    isLoadingChats: false,
    setIsLoadingChats: (isLoading) => set({ isLoadingChats: isLoading }),
    isLoadingMessages: false,
    setIsLoadingMessages: (isLoading) => set({ isLoadingMessages: isLoading }),
    
    // 错误状态
    error: null,
    setError: (error) => set({ error }),
    
    // 未读消息计数
    totalUnreadCount: 0,
    updateTotalUnreadCount: () => set((state) => {
      let total = 0;
      for (const chatId in state.chats) {
        const chat = state.chats[chatId];
        total += chat.unreadCount || 0;
      }
      return { totalUnreadCount: total };
    }),
    
    // 群聊相关
    groupMembers: {},
    setGroupMembers: (chatId, members) => set((state) => {
      const newGroupMembers = { ...state.groupMembers };
      newGroupMembers[chatId] = members;
      return { groupMembers: newGroupMembers };
    }),
    addGroupMember: (chatId, member) => set((state) => {
      const newGroupMembers = { ...state.groupMembers };
      const members = newGroupMembers[chatId] || [];
      // 检查成员是否已存在
      if (!members.find(m => m.id === member.id)) {
        // 使用不可变更新模式，创建新的成员数组
        const updatedMembers = [...members, member];
        newGroupMembers[chatId] = updatedMembers;
      }
      return { groupMembers: newGroupMembers };
    }),
    removeGroupMember: (chatId, memberId) => set((state) => {
      const newGroupMembers = { ...state.groupMembers };
      const members = newGroupMembers[chatId] || [];
      const filteredMembers = members.filter(m => m.id !== memberId);
      newGroupMembers[chatId] = filteredMembers;
      return { groupMembers: newGroupMembers };
    }),
    
    // 消息搜索
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    searchResults: [],
    setSearchResults: (results) => set({ searchResults: results }),
    isSearching: false,
    setIsSearching: (isSearching) => set({ isSearching }),
  

  
    // CRM 相关状态
    isSyncingWithCRM: false,
    crmLastSyncTime: null,
    
    // CRM 相关方法
    syncMessageToCRM: async (messageId, chatId) => {
      console.log('[CRM_SYNC] Syncing message to CRM:', messageId, 'chatId:', chatId);
      // 使用Zustand的正确方式获取状态
      const state = useChatStore.getState();
      
      // 使用规范化的chatId查找消息（与addMessage保持一致）
      const canonicalChatId = normalizeChatId(chatId);
      console.log('[CRM_SYNC] Using canonical chatId:', canonicalChatId);
      
      const chatMessages = state.messages[canonicalChatId];
      
      if (!chatMessages) {
        console.error('[CRM_SYNC_ERROR] Chat messages not found:', canonicalChatId);
        return;
      }
      
      const message = chatMessages.find(msg => msg.id === messageId);
      if (!message) {
        console.error('[CRM_SYNC_ERROR] Message not found:', messageId, 'in chat:', canonicalChatId);
        // 打印所有消息ID以便调试
        console.log('[CRM_SYNC_DEBUG] Available messages:', chatMessages.map(msg => msg.id));
        return;
      }
      
      set({ isSyncingWithCRM: true });
      
      try {
        // 模拟 CRM API 调用
        console.log('[CRM_API] Syncing message:', message);
        
        // 构建 CRM 消息对象
        const crmMessage: CRMMessage = {
          id: message.id,
          chatId: chatId,
          customerId: chatId, // 使用 chatId 作为 customerId
          content: message.text || 'Media message',
          direction: message.direction,
          timestamp: message.timestamp,
          status: message.status,
          mediaUrl: message.url || message.MediaUrl0,
          mediaType: message.mediaType || message.MediaContentType0
        };
        
        console.log('[CRM_API] CRM message:', crmMessage);
        
        // 模拟 API 响应延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set({ 
          crmLastSyncTime: Date.now(),
          isSyncingWithCRM: false 
        });
        console.log('[CRM_SYNC_SUCCESS] Message synced to CRM:', messageId);
      } catch (error) {
        console.error('[CRM_SYNC_ERROR] Failed to sync message to CRM:', error);
        set({ isSyncingWithCRM: false });
      }
    },
    
    getCustomerFromCRM: async (phone) => {
      console.log('[CRM_API] Getting customer from CRM by phone:', phone);
      
      try {
        // 模拟 CRM API 调用
        console.log('[CRM_API] Mock API call to get customer:', phone);
        
        // 模拟 API 响应延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 模拟 CRM 客户数据
        const mockCustomer = {
          id: `crm_${phone}`,
          name: `客户 ${phone}`,
          phone: phone,
          email: `customer${phone.replace(/\D/g, '')}@example.com`,
          company: '示例公司',
          tags: ['潜在客户'],
          notes: '通过聊天系统创建',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastContactTime: Date.now(),
          value: 10000,
          status: '活跃'
        };
        
        console.log('[CRM_API_SUCCESS] Got customer from CRM:', mockCustomer);
        return mockCustomer;
      } catch (error) {
        console.error('[CRM_API_ERROR] Failed to get customer from CRM:', error);
        return null;
      }
    },
    
    createTaskInCRM: async (customerId, task) => {
      console.log('[CRM_API] Creating task in CRM:', customerId, task);
      
      try {
        // 模拟 CRM API 调用
        console.log('[CRM_API] Mock API call to create task:', task);
        
        // 模拟 API 响应延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[CRM_API_SUCCESS] Task created in CRM:', task.title);
      } catch (error) {
        console.error('[CRM_API_ERROR] Failed to create task in CRM:', error);
      }
    },
  
    addNoteToCRM: async (customerId, note) => {
      console.log('[CRM_API] Adding note to CRM:', customerId, note);
      
      try {
        // 模拟 CRM API 调用
        console.log('[CRM_API] Mock API call to add note:', note);
        
        // 模拟 API 响应延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[CRM_API_SUCCESS] Note added to CRM');
      } catch (error) {
        console.error('[CRM_API_ERROR] Failed to add note to CRM:', error);
      }
    },
  
    // 事件系统
    onNewMessage: (listener: (chatId: string, message: any) => void) => {
      eventEmitter.on('newMessage', listener);
    },
    offNewMessage: (listener: (chatId: string, message: any) => void) => {
      eventEmitter.off('newMessage', listener);
    },
    emitNewMessage: (chatId: string, message: any) => {
      eventEmitter.emit('newMessage', chatId, message);
    },
    
    // CRM 事件系统
    onCRMCustomerUpdated: (listener: (customerId: string, customer: any) => void) => {
      eventEmitter.on('crm:customerUpdated', listener);
    },
    offCRMCustomerUpdated: (listener: (customerId: string, customer: any) => void) => {
      eventEmitter.off('crm:customerUpdated', listener);
    },
    emitCRMCustomerUpdated: (customerId: string, customer: any) => {
      eventEmitter.emit('crm:customerUpdated', customerId, customer);
    },
    
    onCRMNoteAdded: (listener: (customerId: string, note: string) => void) => {
      eventEmitter.on('crm:noteAdded', listener);
    },
    offCRMNoteAdded: (listener: (customerId: string, note: string) => void) => {
      eventEmitter.off('crm:noteAdded', listener);
    },
    emitCRMNoteAdded: (customerId: string, note: string) => {
      eventEmitter.emit('crm:noteAdded', customerId, note);
    },
    
    onCRMTaskCreated: (listener: (customerId: string, task: any) => void) => {
      eventEmitter.on('crm:taskCreated', listener);
    },
    offCRMTaskCreated: (listener: (customerId: string, task: any) => void) => {
      eventEmitter.off('crm:taskCreated', listener);
    },
    emitCRMTaskCreated: (customerId: string, task: any) => {
      eventEmitter.emit('crm:taskCreated', customerId, task);
    },
  
    // 任务管理功能
    tasks: new Map(),
    addTask: (task) => set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.set(task.id, task);
      console.log('[TASK_MANAGER] Added task:', task.id, task.title);
      return { tasks: newTasks };
    }),
    updateTask: (taskId, updates) => set((state) => {
      const newTasks = new Map(state.tasks);
      const task = newTasks.get(taskId);
      if (task) {
        newTasks.set(taskId, {
          ...task,
          ...updates,
          updatedAt: Date.now()
        });
        console.log('[TASK_MANAGER] Updated task:', taskId, updates);
      }
      return { tasks: newTasks };
    }),
    deleteTask: (taskId) => set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.delete(taskId);
      console.log('[TASK_MANAGER] Deleted task:', taskId);
      return { tasks: newTasks };
    }),
    completeTask: (taskId) => set((state) => {
      const newTasks = new Map(state.tasks);
      const task = newTasks.get(taskId);
      if (task) {
        newTasks.set(taskId, {
          ...task,
          status: 'completed' as TaskStatus,
          completedAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log('[TASK_MANAGER] Completed task:', taskId);
      }
      return { tasks: newTasks };
    }),
    getTasksByCustomer: (customerId) => {
      const state = get();
      const tasks = [];
      for (const task of state.tasks.values()) {
        if (task.customerId === customerId) {
          tasks.push(task);
        }
      }
      return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    getTasksByStatus: (status) => {
      const state = get();
      const tasks = [];
      for (const task of state.tasks.values()) {
        if (task.status === status) {
          tasks.push(task);
        }
      }
      return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    getTasksByPriority: (priority) => {
      const state = get();
      const tasks = [];
      for (const task of state.tasks.values()) {
        if (task.priority === priority) {
          tasks.push(task);
        }
      }
      return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    searchTasks: (query) => {
      const state = get();
      const lowerQuery = query.toLowerCase();
      const tasks = [];
      for (const task of state.tasks.values()) {
        if (
          task.title.toLowerCase().includes(lowerQuery) ||
          task.description?.toLowerCase().includes(lowerQuery) ||
          task.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        ) {
          tasks.push(task);
        }
      }
      return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
    },
  
    // 提醒管理功能
    reminders: new Map(),
    addReminder: (reminder) => set((state) => {
      const newReminders = new Map(state.reminders);
      newReminders.set(reminder.id, reminder);
      console.log('[REMINDER_MANAGER] Added reminder:', reminder.id, reminder.title);
      return { reminders: newReminders };
    }),
    // 标记客户在线状态
    markOnline: (customerId) => set((state) => {
      console.log('[CHAT_STORE_MARK_ONLINE]', customerId);
      // 这里可以添加在线状态的逻辑，例如更新聊天的在线状态
      // 但不直接创建新的聊天
      return {};
    }),
    updateReminder: (reminderId, updates) => set((state) => {
      const newReminders = new Map(state.reminders);
      const reminder = newReminders.get(reminderId);
      if (reminder) {
        newReminders.set(reminderId, {
          ...reminder,
          ...updates,
          updatedAt: Date.now()
        });
        console.log('[REMINDER_MANAGER] Updated reminder:', reminderId, updates);
      }
      return { reminders: newReminders };
    }),
    deleteReminder: (reminderId) => set((state) => {
      const newReminders = new Map(state.reminders);
      newReminders.delete(reminderId);
      console.log('[REMINDER_MANAGER] Deleted reminder:', reminderId);
      return { reminders: newReminders };
    }),
    completeReminder: (reminderId) => set((state) => {
      const newReminders = new Map(state.reminders);
      const reminder = newReminders.get(reminderId);
      if (reminder) {
        newReminders.set(reminderId, {
          ...reminder,
          isCompleted: true,
          completedAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log('[REMINDER_MANAGER] Completed reminder:', reminderId);
      }
      return { reminders: newReminders };
    }),
    getRemindersByCustomer: (customerId) => {
      const state = get();
      const reminders = [];
      for (const reminder of state.reminders.values()) {
        if (reminder.customerId === customerId && !reminder.isCompleted) {
          reminders.push(reminder);
        }
      }
      return reminders.sort((a, b) => a.scheduledAt - b.scheduledAt);
    },
    getUpcomingReminders: (days = 7) => {
      const state = get();
      const now = Date.now();
      const cutoff = now + (days * 24 * 60 * 60 * 1000);
      const reminders = [];
      for (const reminder of state.reminders.values()) {
        if (!reminder.isCompleted && reminder.scheduledAt >= now && reminder.scheduledAt <= cutoff) {
          reminders.push(reminder);
        }
      }
      return reminders.sort((a, b) => a.scheduledAt - b.scheduledAt);
    },
    getOverdueReminders: () => {
      const state = get();
      const now = Date.now();
      const reminders = [];
      for (const reminder of state.reminders.values()) {
        if (!reminder.isCompleted && reminder.scheduledAt < now) {
          reminders.push(reminder);
        }
      }
      return reminders.sort((a, b) => a.scheduledAt - b.scheduledAt);
    },
}));
}

// 事件系统
class ChatEventEmitter {
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('[CHAT_EVENT_ERROR]', error);
      }
    });
  }
}

// 全局事件发射器
export const eventEmitter = new ChatEventEmitter();

// 从 globalThis 获取或创建聊天状态管理hook
const getChatStoreHook = () => {
  const g: any = globalThis as any;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = initializeChatStore();
  }
  return g[STORE_KEY];
};

// 导出聊天状态管理hook
export const useChatStore = getChatStoreHook();

// 导出获取store实例的函数（用于非组件环境）
export function getChatStore() {
  return useChatStore;
}

// 导出store的原始实例（用于非组件环境）
export const chatStoreInstance = useChatStore;

// 直接在chatStore中定义所有必要的类型，绕过chatTypes.ts

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'reaction';

// 确保消息类型包含 image
export type MessageDirection = 'inbound' | 'outbound';
export type ChatType = 'single' | 'group';

export interface Message {
  id: string;
  chatId?: string;
  customer_id?: string;
  from: string;
  to: string;
  type: MessageType;
  kind?: 'image'; // 用于标识消息类型
  text?: string;
  // 双重内容显示字段
  originalText?: string;
  translatedText?: string;
  translationInfo?: {
    targetLanguage: string;
    engine: string;
    timestamp: number;
  };
  url?: string; // 支持 url 字段，用于图片消息
  mime?: string; // 支持 mime 字段，用于图片消息
  mediaType?: string;
  mediaSize?: number;
  mediaDuration?: number;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
  reaction?: {
    emoji: string;
    sender: string;
  };
  direction: MessageDirection;
  status: MessageStatus;
  error?: string;
  timestamp: number;
  isGroup: boolean;
  senderName?: string;
  isDeleted?: boolean;
  isForwarded?: boolean;
  quoteMessageId?: string;
  quoteText?: string;
  // Twilio 相关字段
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
};

// DEBUG ONLY
if (typeof window !== 'undefined') {
  (window as any).__CHAT_STORE__ = useChatStore;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  avatar?: string;
  lastMessage?: Message;
  lastMessageTime?: number;
  unreadCount: number;
  participants: string[];
  isMuted?: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
  groupOwnerId?: string;
  groupDescription?: string;
  groupMembers?: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}

// 统一的用户名解析函数
export const resolveDisplayName = (message: Message | any): string => {
  // 优先级：profile_name/ProfileName > customer > sender_name > from
  // 从消息中提取 displayName
  let displayName = '';
  
  // 尝试从不同字段获取名称
  if (message.profile_name) {
    displayName = message.profile_name;
  } else if (message.ProfileName) {
    // 支持 ProfileName 字段（Twilio 标准字段），如 "Industrial sensor"
    displayName = message.ProfileName;
  } else if (message.customer) {
    // 支持 customer 字段，如 "Industrial sensor"
    displayName = message.customer;
  } else if (message.senderName || message.sender_name) {
    displayName = message.senderName || message.sender_name;
  } else if (message.from) {
    displayName = message.from;
    // 如果 from 是手机号，提取纯数字部分
    if (displayName.startsWith('whatsapp:')) {
      displayName = displayName.replace('whatsapp:', '');
    }
  }
  
  // 确保 displayName 不为空
  return displayName || 'Unknown';
};

// 翻译类型定义
export interface Translation {
  text: string;
  provider: string;
  ts: number;
}

// OCR 类型定义
export interface OCRResult {
  text: string;
  provider: string;
  confidence: number;
  ts: number;
}

// CRM 消息接口
export interface CRMMessage {
  id: string;
  chatId: string;
  customerId: string;
  content: string;
  direction: 'inbound' | 'outbound';
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  mediaType?: string;
}

// 任务类型
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 任务接口
export interface Task {
  id: string;
  title: string;
  description?: string;
  customerId: string;
  assignee?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  completedAt?: number;
  createdBy: string;
  tags?: string[];
  relatedMessageId?: string;
}

// 提醒接口
export interface Reminder {
  id: string;
  title: string;
  description?: string;
  customerId: string;
  scheduledAt: number;
  createdAt: number;
  updatedAt: number;
  isCompleted: boolean;
  completedAt?: number;
  createdBy: string;
  relatedTaskId?: string;
  relatedMessageId?: string;
}

// 聊天状态接口
interface ChatState {
  // CRM 相关功能
  syncMessageToCRM: (messageId: string, chatId: string) => Promise<void>;
  getCustomerFromCRM: (phone: string) => Promise<any>;
  createTaskInCRM: (customerId: string, task: { title: string; description: string; dueDate?: number }) => Promise<void>;
  addNoteToCRM: (customerId: string, note: string) => Promise<void>;
  
  // 任务管理功能
  tasks: Map<string, Task>;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  getTasksByCustomer: (customerId: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  searchTasks: (query: string) => Task[];
  
  // 提醒管理功能
  reminders: Map<string, Reminder>;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => void;
  deleteReminder: (reminderId: string) => void;
  completeReminder: (reminderId: string) => void;
  getRemindersByCustomer: (customerId: string) => Reminder[];
  getUpcomingReminders: (days?: number) => Reminder[];
  getOverdueReminders: () => Reminder[];
  
  // CRM 数据状态
  isSyncingWithCRM: boolean;
  crmLastSyncTime: number | null;
  
  // 聊天列表
  chats: Map<string, Chat>;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  setChats: (chats: Chat[]) => void;
  
  // 聊天消息
  messages: Map<string, Message[]>;
  addMessage: (message: Message) => void;
  appendMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: MessageStatus, error?: string) => void;
  addMessages: (chatId: string, messages: Message[]) => void;
  deleteMessage: (messageId: string) => void;
  
  // 翻译存储
  translations: Record<string, Translation>;
  setTranslation: (messageId: string, translation: Omit<Translation, 'ts'>) => void;
  getTranslation: (messageId: string) => Translation | undefined;
  removeTranslation: (messageId: string) => void;
  clearTranslations: () => void;
  
  // OCR 存储
  ocr: Record<string, OCRResult>;
  setOCR: (messageId: string, ocrResult: Omit<OCRResult, 'ts'>) => void;
  getOCR: (messageId: string) => OCRResult | undefined;
  removeOCR: (messageId: string) => void;
  clearOCR: () => void;
  
  // 消息发送
  sendingMessages: Map<string, boolean>;
  setSendingMessage: (messageId: string, isSending: boolean) => void;
  
  // 聊天连接状态
  isConnected: boolean;
  setIsConnected: (isConnected: boolean) => void;
  
  // 加载状态
  isLoadingChats: boolean;
  setIsLoadingChats: (isLoading: boolean) => void;
  isLoadingMessages: boolean;
  setIsLoadingMessages: (isLoading: boolean) => void;
  
  // 错误状态
  error: string | null;
  setError: (error: string | null) => void;
  
  // 未读消息计数
  totalUnreadCount: number;
  updateTotalUnreadCount: () => void;
  
  // 群聊相关
  groupMembers: Map<string, { id: string; name: string; avatar?: string }[]>;
  setGroupMembers: (chatId: string, members: { id: string; name: string; avatar?: string }[]) => void;
  addGroupMember: (chatId: string, member: { id: string; name: string; avatar?: string }) => void;
  removeGroupMember: (chatId: string, memberId: string) => void;
  
  // 消息搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Message[];
  setSearchResults: (results: Message[]) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
}
