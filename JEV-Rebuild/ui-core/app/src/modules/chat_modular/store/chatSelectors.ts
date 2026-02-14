import React from 'react';
import { useChatStore } from './chatStore';

// 聊天会话类型定义
export interface Conversation {
  id: string;
  type: 'single' | 'group';
  name: string;
  lastMessage?: any;
  lastMessageTime?: number;
  unreadCount?: number;
  participants?: string[];
  createdAt?: number;
  updatedAt?: number;
}

// 消息类型定义
export interface Message {
  id: string;
  message_id?: string;
  chatId: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isGroup?: boolean;
  media_path?: string;
  media?: any;
}

// ChatState类型定义
export interface ChatState {
  chats: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  selectedChatId: string | null;
  chatVersion: number;
}

// 活跃聊天状态类型定义
export interface ActiveChatState {
  activeChatId: string | null;
  hasActiveChat: boolean;
  conversations: Conversation[];
  activeMessages: Message[];
  activeMessagesCount: number;
  chatsCount: number;
}

// 选择器：获取所有会话，包括没有历史消息的客户
export const selectConversations = (state: ChatState) => {
  const chats = Object.values(state.chats || {});

  return chats
    .map(chat => ({
      ...chat,
      lastMessage: chat.lastMessage ?? null,
      lastMessageTime: chat.lastMessageTime ?? 0
    }))
    .sort((a, b) => {
      const timeA = a.lastMessageTime ?? 0;
      const timeB = b.lastMessageTime ?? 0;
      return timeB - timeA;
    });
};

// 统一的活跃聊天状态选择器
export function selectActiveChatState(selectedChatId: string | null): ActiveChatState {
  // 获取最新的chatStore状态
  const chatStore = useChatStore.getState();
  
  // 获取chats，确保是对象
  const chats = chatStore.chats || {};
  
  // 使用selectConversations获取会话列表
  const conversations = Object.values(chats)
    .sort((a, b) => {
      const timeA = a.lastMessageTime ?? 0;
      const timeB = b.lastMessageTime ?? 0;
      return timeB - timeA;
    });
  
  // 计算chats数量
  const chatsCount = conversations.length;
  
  // 验证selectedChatId
  let activeChatId = selectedChatId;
  let hasActiveChat = false;
  
  // 检查selectedChatId是否有效
  if (activeChatId && conversations.some((c: Conversation) => c.id === activeChatId)) {
    hasActiveChat = true;
  } else {
    // 如果selectedChatId无效，返回第一个聊天的ID，但不修改状态
    if (conversations.length > 0) {
      activeChatId = conversations[0].id;
      hasActiveChat = true;
      console.log('[ACTIVE_CHAT_VALIDATION] selectedChatId invalid, using first chat:', activeChatId);
    } else {
      activeChatId = null;
      hasActiveChat = false;
      console.log('[ACTIVE_CHAT_VALIDATION] No conversations available');
    }
  }
  
  // 获取活跃聊天的消息，确保是数组
  let activeMessages: Message[] = [];
  if (activeChatId) {
    activeMessages = chatStore.messages[activeChatId] || [];
  }
  
  // 计算活跃消息数量
  const activeMessagesCount = activeMessages.length;
  
  // 日志：记录选择器状态
  console.log('[CHAT_SELECTOR_STATE]', {
    activeChatId,
    hasActiveChat,
    chatsCount,
    activeMessagesCount,
    conversationsLength: conversations.length
  });
  
  return {
    activeChatId,
    hasActiveChat,
    conversations,
    activeMessages,
    activeMessagesCount,
    chatsCount
  };
}

// 用于组件的React hook
export function useActiveChatState() {
  // 从store中获取selectedChatId和chatVersion，当聊天列表变化时重新计算
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const chatVersion = useChatStore((state) => state.chatVersion);
  
  // 使用useMemo缓存选择器结果，只依赖selectedChatId和chatVersion
  // 不依赖chats和messages的引用，避免presence变化时重新计算
  const activeChatState = React.useMemo(() => {
    // 直接获取chatStore实例每次都获取最新状态
    const chatStore = useChatStore.getState();
    
    // 获取chats，确保是对象
    const chatsObj = chatStore.chats || {};
    
    // 使用selectConversations获取会话列表
    const rawChats = chatStore.chats;
    const conversations = Object.values(rawChats || {})
      .sort((a, b) => {
        const timeA = a.lastMessageTime ?? 0;
        const timeB = b.lastMessageTime ?? 0;
        return timeB - timeA;
      });
    
    // 计算chats数量
    const chatsCount = conversations.length;
    
    // 验证selectedChatId
    let activeChatId = selectedChatId;
    let hasActiveChat = false;
    
    // 检查selectedChatId是否有效
    if (activeChatId && conversations.some((c: Conversation) => c.id === activeChatId)) {
      hasActiveChat = true;
    } else {
      // 如果selectedChatId无效，返回第一个聊天的ID，但不修改状态
      if (conversations.length > 0) {
        activeChatId = conversations[0].id;
        hasActiveChat = true;
        console.log('[ACTIVE_CHAT_VALIDATION] selectedChatId invalid, using first chat:', activeChatId);
      } else {
        activeChatId = null;
        hasActiveChat = false;
        console.log('[ACTIVE_CHAT_VALIDATION] No conversations available');
      }
    }
    
    // 获取活跃聊天的消息，确保是数组
    let activeMessages: Message[] = [];
    if (activeChatId) {
      activeMessages = chatStore.messages[activeChatId] || [];
    }
    
    // 计算活跃消息数量
    const activeMessagesCount = activeMessages.length;
    
    // 添加调试日志
    console.log('[SELECTOR_RAW_CHATS]', Object.keys(rawChats || {}));
    console.log('[SELECTOR_CONVERSATIONS_BEFORE_FILTER]', Object.values(rawChats || {}));
    
    // 日志：记录选择器状态
    console.log('[CHAT_SELECTOR_STATE]', {
      activeChatId,
      hasActiveChat,
      chatsCount,
      activeMessagesCount,
      conversationsLength: conversations.length
    });
    
    // 临时扫描日志：Selector 输出
    if (import.meta.env.DEV) {
      console.log('[SELECTOR_OUTPUT]', {
        activeChatId,
        activeMessagesLength: activeMessages.length,
        timestamp: Date.now()
      });
    }
    
    return {
      activeChatId,
      hasActiveChat,
      conversations,
      activeMessages,
      activeMessagesCount,
      chatsCount
    };
  }, [selectedChatId, chatVersion]);
  
  return activeChatState;
}
