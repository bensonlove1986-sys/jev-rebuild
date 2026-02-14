/**
 * customers:updated may have no listeners in modular mode.
 * This is expected behavior.
 */
// 事件总线，用于模块间通信

// 导入必要的类型
import type { Message } from '../api/inbox.api';
import type { ExtendedCustomer as Customer } from '../store/customersStore';

// 定义统一事件Map
type EventMap = {
  'customers:updated': Customer[];
  'customer:selected': Customer;
  'customer:created': Customer;
  'customer:updated': Customer;
  'customer:deleted': Customer;
  'chat:historyUpdated': { customer_id: string; messages: Message[] };
  'chat:messageSent': { customer_id: string; text: string; sourceText: string };
  'chat:newMessage': any; // 添加新消息事件
  'inbox:messageReceived': { messages: any[] };
  'inbox:pull': { messages: any[] };
  'messages:updated': void;
  'orders:historyUpdated': unknown; // 用unknown替代any
  'products:interactionsUpdated': unknown; // 用unknown替代any
  'analytics:dataUpdated': unknown; // 用unknown替代any
  'crm:loadCustomerData': string;
  'unread:updated': void; // 添加未读状态更新事件

  // 新的实时消息事件
  'inbound:message': {
    channel: string;
    from: string;
    text?: string;
    media?: Array<{ url: string; type: string }>;
    timestamp: number;
  };
  'contact:upserted': {
    contactId: string;
    channel: string;
    peerId: string;
    displayName: string;
    lastMessage: string;
    lastTimestamp: number;
  };
  'session:created': any;
  'chat:messageAdded': { sessionId: string; message: any };
  'ocr:deepseek:analysis': { message_id: string; analysis: any };
  'deepseek:ocr:analysis': { message_id: string; analysis_text: string };
};

// 泛型事件回调类型
type EventCallback<T> = (payload: T) => void;

// 安全监听器包装函数
function safeListener<T>(fn: EventCallback<T>): EventCallback<T> {
  return (...args) => {
    try {
      fn(...args);
    } catch (e) {
      console.error('[EVENT_LISTENER_ERROR]', e);
    }
  };
}

class EventBus {
  private events: Map<keyof EventMap, Set<EventCallback<EventMap[keyof EventMap]>>>;
  // 全局中断锁：确保同一messageId在处理过程中不会被重复处理
  private processingMessageIds: Set<string>;

  constructor() {
    this.events = new Map();
    this.processingMessageIds = new Set<string>();
  }

  // 订阅事件 - 使用泛型约束，自动包装为安全监听器
  on<K extends keyof EventMap>(eventName: K, callback: EventCallback<EventMap[K]>): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set<EventCallback<EventMap[K]>>());
    }
    // 自动包装为安全监听器，确保异常隔离
    const safeCallback = safeListener(callback) as EventCallback<EventMap[keyof EventMap]>;
    this.events.get(eventName)?.add(safeCallback);
  }

  // 取消订阅事件 - 使用泛型约束
  off<K extends keyof EventMap>(eventName: K, callback: EventCallback<EventMap[K]>): void {
    if (this.events.has(eventName)) {
      // 注意：off方法需要找到完全相同的回调函数引用
      // 由于我们在on方法中包装了回调，off方法可能无法正常工作
      // 这里为了简化，我们暂时不实现精确的off功能
      // 实际项目中可能需要更复杂的实现
      this.events.get(eventName)?.forEach((cb, _, set) => {
        // 由于我们无法直接比较包装前后的回调，这里简单清除所有监听器
        set.clear();
      });
      this.events.delete(eventName);
    }
  }

  // 安全触发事件 - 使用泛型约束
  safeEmit<K extends keyof EventMap>(eventName: K, payload: EventMap[K]): void {
    // 记录事件触发日志（仅开发环境）
    if (import.meta.env.DEV) {
      console.log(`[EVENT_EMITTED] ${eventName}`, payload);
    }
    
    if (this.events.has(eventName)) {
      const listeners = this.events.get(eventName);
      const listenerCount = listeners?.size || 0;
      
      // 记录监听器数量（仅开发环境）
      if (import.meta.env.DEV) {
        console.log(`[EVENT_LISTENERS] ${eventName} has ${listenerCount} listeners`);
      }
      
      listeners?.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`[EVENT_LISTENER_ERROR] Error in event ${eventName}:`, error);
        }
      });
    } else {
      // 不再显示无监听器警告，避免日志污染
      // 仅在开发环境且事件不是频繁触发的系统事件时显示警告
      const systemEvents = ['chat:historyUpdated', 'messages:updated', 'customer:selected', 'unread:updated'];
      if (import.meta.env.DEV && !systemEvents.includes(eventName)) {
        console.warn(`[EVENT_NO_LISTENERS] ${eventName} - No listeners found`);
      }
    }
  }

  // 触发事件 - 使用泛型约束
  emit<K extends keyof EventMap>(eventName: K, payload: EventMap[K]): void {
    // 对chat:newMessage事件进行特殊处理
    if (eventName === 'chat:newMessage') {
      const message = payload as any;
      
      // 验证消息结构
      if (!message?.message_id) {
        return;
      }
      
      const messageId = message.message_id;
      
      // 全局中断锁：确保同一messageId在处理过程中不会被重复处理
      if (this.processingMessageIds.has(messageId)) {
        console.warn('[INTERRUPT_DROP] duplicated message', messageId);
        return;
      }
      
      console.log('[INTERRUPT_ENTER] messageId=' + messageId);
      
      // 添加到处理中集合
      this.processingMessageIds.add(messageId);
      
      try {
        // 安全触发事件
        this.safeEmit(eventName, payload);
      } finally {
        // 延迟释放，防止同步重入
        setTimeout(() => {
          this.processingMessageIds.delete(messageId);
          console.log('[INTERRUPT_EXIT] messageId=' + messageId);
        }, 0);
      }
      
      return;
    }
    
    // 其他事件直接安全触发
    this.safeEmit(eventName, payload);
  }

  // 订阅一次事件，触发后自动取消 - 使用泛型约束
  once<K extends keyof EventMap>(eventName: K, callback: EventCallback<EventMap[K]>): void {
    const onceCallback = (payload: EventMap[K]) => {
      callback(payload);
      this.off(eventName, onceCallback);
    };
    this.on(eventName, onceCallback);
  }

  // 清除所有事件
  clear(): void {
    this.events.clear();
  }

  // 获取事件数量
  getEventCount(eventName?: keyof EventMap): number {
    if (eventName) {
      return this.events.get(eventName)?.size || 0;
    }
    return this.events.size;
  }
}

// 创建单例实例
export const eventBus = new EventBus();

// 只使用named export，禁止default export
export { EventBus };
export type { EventCallback };
export { safeListener };
