import { create } from 'zustand';

// 简单的 chatStore 实现，用于 action_center 测试
export const chatStore = create((set, get) => ({
  // 消息版本号，用于强制 React 重新渲染
  messageVersion: 0,
  // 聊天版本号，用于强制 React 重新渲染聊天列表
  chatVersion: 0,
  
  // 当前选中的聊天
  selectedChatId: null,
  setSelectedChatId: (chatId) => set({ selectedChatId: chatId }),
  
  // 增加消息版本号
  incrementMessageVersion: () => set((state) => ({ messageVersion: state.messageVersion + 1 })),
  
  // 当前选中的消息
  selectedMessageId: null,
  setSelectedMessageId: (messageId) => set({ selectedMessageId: messageId }),
  
  // 聊天列表
  chats: {},
  addChat: (chat) => set((state) => {
    const newChats = { ...state.chats };
    newChats[chat.id] = chat;
    return { chats: newChats };
  }),
  
  // 聊天消息
  messages: {},
  addMessage: (message) => set((state) => {
    const canonicalChatId = message.chatId || 'default';
    const oldMessages = state.messages;
    const chatMessages = oldMessages[canonicalChatId] || [];
    const updatedChatMessages = [...chatMessages, message];
    const newMessages = { ...oldMessages };
    newMessages[canonicalChatId] = updatedChatMessages;
    return { messages: newMessages, messageVersion: state.messageVersion + 1 };
  }),
  
  // 更新消息状态
  updateMessageStatus: (messageId, status, error) => set((state) => {
    const newMessages = { ...state.messages };
    let updated = false;
    
    for (const chatId in newMessages) {
      const messages = newMessages[chatId];
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex >= 0) {
        const updatedMessages = [...messages];
        updatedMessages[messageIndex] = { ...messages[messageIndex], status, error };
        newMessages[chatId] = updatedMessages;
        updated = true;
        break;
      }
    }
    
    return updated ? { messages: newMessages, messageVersion: state.messageVersion + 1 } : {};
  }),
  
  // 翻译相关
  translations: {},
  setTranslation: (messageId, translation) => set((state) => {
    const newTranslations = { ...state.translations };
    newTranslations[messageId] = translation;
    return { translations: newTranslations, messageVersion: state.messageVersion + 1 };
  }),
  
  // OCR 相关
  ocr: {},
  setOCR: (messageId, ocrResult) => set((state) => {
    const newOCR = { ...state.ocr };
    newOCR[messageId] = ocrResult;
    return { ocr: newOCR };
  }),
  
  // 事件发射器
  onNewMessage: (callback) => {},
  offNewMessage: (callback) => {},
  emitNewMessage: (chatId, message) => {}
}));
