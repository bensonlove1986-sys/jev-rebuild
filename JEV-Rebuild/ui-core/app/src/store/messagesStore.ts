// 消息存储
// 管理所有聊天消息，仅基于事件驱动，不依赖任何KV/API拉取
import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';

// 最终发送锁：防止同一 inboundId 被发送多次
const finalSentSet = new Set();

function FINAL_SEND_LOCK(inboundId: string) {
  if (finalSentSet.has(inboundId)) {
    console.log("[AUTO_ENGINE_FINAL_LOCK_SKIP]", inboundId);
    return false;
  }
  finalSentSet.add(inboundId);
  return true;
}

// 强制文本收敛器
function normalizeText(text: any): string {
  if (typeof text === 'string') return text;
  if (text == null) return '';
  try {
    return JSON.stringify(text);
  } catch {
    return '';
  }
}

// 消息状态接口
interface Message {
  id: string;
  customer_id: string;
  display_name: string;
  direction: 'inbound' | 'outbound';
  role: 'customer' | 'operator';
  type?: 'text' | 'image';
  text: string;
  image_url?: string;
  file_id?: string;
  media_source?: {
    type: 'dataUrl' | 'remoteUrl';
    dataUrl?: string;
    remoteUrl?: string;
  };
  __optimistic?: boolean;
  __pending?: boolean;
  timestamp: number;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'failed';
  status?: 'draft' | 'sent' | 'failed';
  send_status?: 'draft' | 'sent' | 'failed';
  failure_reason?: string;
}

// 消息存储状态接口
interface MessagesState {
  messages: Record<string, Message[]>;
  sendMessage: (phone: string, text: string, message_id: string, translatedText?: string, fileId?: string, image_url?: string, source_message_id?: string, media_source?: { type: 'dataUrl' | 'remoteUrl'; dataUrl?: string; remoteUrl?: string }) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteCustomerMessages: (phone: string) => void;
}

// 消息存储状态
const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: {}, // 初始值为空对象，不包含任何示例消息

  
  // 发送消息
  sendMessage: async (phone, text, message_id, translatedText, fileId, image_url, source_message_id, media_source) => {
    console.log("[SEND_MESSAGE_ENTER]", { phone, text, message_id, translatedText, fileId, image_url, source_message_id, media_source });
    // 最终发送锁检查
    if (!FINAL_SEND_LOCK(source_message_id || message_id)) {
      // 更新消息状态为失败
      get().updateMessage(message_id, {
        status: 'failed',
        send_status: 'failed',
        delivery_status: 'failed',
        __optimistic: false,
        __pending: false,
        failure_reason: 'Send blocked by final lock'
      });
      return;
    }
    
    // 导入 useAutoEngineStore
    const { useAutoEngineStore } = await import('./autoEngineStore');
    
    // 检查发送门控
    const checkSendGate = useAutoEngineStore.getState().checkSendGate;
    // 使用默认回复延迟 2 秒
    const replyDelay = 2;
    
    if (!checkSendGate(replyDelay)) {
      console.log('[AUTO_ENGINE_SEND_BLOCKED] in messagesStore.sendMessage');
      // 更新消息状态为失败
      get().updateMessage(message_id, {
        status: 'failed',
        send_status: 'failed',
        delivery_status: 'failed',
        __optimistic: false,
        __pending: false,
        failure_reason: 'Send blocked by AutoEngine gate'
      });
      return;
    }
    
    // 如果没有提供 media_source，则根据 image_url 创建
    if (!media_source && image_url) {
      if (image_url.startsWith('data:')) {
        media_source = { type: "dataUrl", dataUrl: image_url };
      } else {
        media_source = { type: "remoteUrl", remoteUrl: image_url };
      }
    }
    
    // 创建本地乐观消息
    const optimisticMessage: Message = {
      id: message_id,
      customer_id: phone,
      display_name: '你',
      direction: 'outbound',
      role: 'operator',
      type: image_url ? 'image' : 'text',
      text: text,
      image_url,
      file_id: fileId,
      media_source: media_source,
      status: 'sending',
      send_status: 'sending',
      delivery_status: 'sending',
      __optimistic: true,
      __pending: true,
      timestamp: Date.now()
    };
    
    // 添加本地乐观消息
    get().addMessage(optimisticMessage);
    
    try {
      // 导入 sendMessage API 函数
      const { sendMessage: sendMessageApi } = await import('../api/inbox.api');
      
      // 发送消息到 API
      const response = await sendMessageApi(phone, text, message_id, text, undefined, undefined, image_url, undefined, media_source);
      
      if (response.ok) {
        // 更新消息状态为已发送
        get().updateMessage(message_id, {
          status: 'sent',
          send_status: 'sent',
          delivery_status: 'sent',
          __optimistic: false,
          __pending: false
        });
      } else {
        // 更新消息状态为失败
        get().updateMessage(message_id, {
          status: 'failed',
          send_status: 'failed',
          delivery_status: 'failed',
          __optimistic: false,
          __pending: false,
          failure_reason: response.error
        });
      }
    } catch (error) {
      // 更新消息状态为失败
      get().updateMessage(message_id, {
        status: 'failed',
        send_status: 'failed',
        delivery_status: 'failed',
        __optimistic: false,
        __pending: false,
        failure_reason: error instanceof Error ? error.message : '未知错误'
      });
    }
  },
  
  // 添加消息
  addMessage: (message) => {
    // 添加保护逻辑，禁止在没有timestamp时自动补当前时间
    if (!message.timestamp) {
      console.warn("[TIMESTAMP_BLOCKED_NO_OVERRIDE]", message.id);
    }
    
    set(state => {
      // 强制文本收敛
      const normalizedText = normalizeText(message.text);
      const processedMessage = {
        ...message,
        text: normalizedText
      };
      
      const customer_id = message.customer_id;
      const messages = state.messages[customer_id] || [];
      return {
        messages: {
          ...state.messages,
          [customer_id]: [...messages, processedMessage]
        }
      };
    });
  },
  
  // 更新消息
  updateMessage: (messageId, updates) => {
    set(state => {
      const updatedMessages: Record<string, Message[]> = {};
      
      for (const [cid, messages] of Object.entries(state.messages)) {
        const updated = messages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, ...updates };
          }
          return msg;
        });
        updatedMessages[cid] = updated;
      }
      
      return {
        messages: updatedMessages
      };
    });
  },
  
  // 删除客户所有消息
  deleteCustomerMessages: (phone) => {
    set(state => {
      const { [phone]: _, ...rest } = state.messages;
      return {
        messages: rest
      };
    });
  }
}));

export { useMessagesStore };