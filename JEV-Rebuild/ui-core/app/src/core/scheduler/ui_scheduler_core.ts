// UI Scheduler Core - 单向调度中心
// 统一接收、校验、派发所有事件，建立唯一调度入口

import { useChatStore } from '@/modules/chat_modular/store/chatStore';
import { useContactStore } from '@/modules/chat_modular/store/contactStore';
import { buildApiUrl } from '@/core/network/urlBuilder';
import { safeFetch } from '@/main';

// 事件类型定义
export enum SchedulerEventType {
  WS_MESSAGE = 'WS_MESSAGE',
  OCR_RESULT = 'OCR_RESULT',
  TRANSLATION_READY = 'TRANSLATION_READY',
  MEDIA_UPLOADED = 'MEDIA_UPLOADED'
}

// 调度事件接口
export interface SchedulerEvent {
  type: SchedulerEventType;
  messageId?: string;
  chatId?: string;
  data: any;
  timestamp: number;
}

// 事件保护映射接口
interface EventGuard {
  timestamp: number;
  processed: boolean;
}

// UI Scheduler Core 类
class UISchedulerCore {
  // 事件保护映射，用于去重和节流
  private eventGuardMap: Map<string, EventGuard> = new Map();
  
  // OCR去重集合
  private OCR_SEEN: Set<string> = new Set();
  
  // 去重时间窗口（毫秒）
  private readonly DEBOUNCE_WINDOW = 500;
  
  // 单例实例
  private static instance: UISchedulerCore;
  
  // 获取单例实例
  public static getInstance(): UISchedulerCore {
    if (!UISchedulerCore.instance) {
      UISchedulerCore.instance = new UISchedulerCore();
    }
    return UISchedulerCore.instance;
  }
  
  // 统一接收事件
  public receiveEvent(event: SchedulerEvent): boolean {
    // 拒绝系统事件
    const systemEventTypes = ['pong', 'connected', 'status', 'heartbeat'];
    if (systemEventTypes.includes(event.type as string)) {
      console.log('[SCHEDULER_REJECT_SYSTEM_EVENT]', event.type);
      return false;
    }
    
    console.log('[SCHEDULER_RECEIVE_EVENT]', event.type, event.messageId);
    console.log('[SCHEDULER_EVENT_DETAIL]', { type: event.type, messageId: event.messageId, chatId: event.chatId, timestamp: event.timestamp });
    
    // 特殊处理 'message' 类型事件
    if (event.type === 'message') {
      console.log('[SCHEDULER_APPEND_MESSAGE]', event.message?.id || event.data?.id || event.data?.message_id);
      const chatStore = useChatStore.getState();
      let messageToProcess = null;
      if (chatStore && event.message) {
        const message = {
          ...event.message,
          canonical_id: event.customer_id
        };
        chatStore.appendMessage(message);
        console.log('[SCHEDULER_MESSAGE_APPENDED] Message added to chatStore');
        messageToProcess = message;
      } else if (chatStore && event.data) {
        const message = {
          ...event.data,
          canonical_id: event.customer_id || event.data.customer_id
        };
        chatStore.appendMessage(message);
        console.log('[SCHEDULER_DATA_APPENDED] Message data added to chatStore');
        messageToProcess = message;
      }
      

    }
    
    // 事件去重和节流
    if (!this.canProcessEvent(event)) {
      console.log('[SCHEDULER_EVENT_GUARD] Skipping duplicate event:', event.type, event.messageId);
      return false;
    }
    
    // 标记事件为处理中
    this.markEventProcessing(event);
    
    try {
      // 统一校验
      const validatedEvent = this.validateEvent(event);
      if (!validatedEvent) {
        console.log('[SCHEDULER_EVENT_VALIDATION_FAILED]', event.type, event.messageId);
        return false;
      }
      
      // 统一派发
      this.dispatchToStore(validatedEvent);
      console.log('[SCHEDULER_EVENT_DISPATCHED]', event.type, event.messageId);
      return true;
    } catch (error) {
      console.error('[SCHEDULER_ERROR]', error);
      return false;
    } finally {
      // 标记事件为已处理
      this.markEventProcessed(event);
    }
  }
  
  // 检查事件是否可以处理（去重和节流）
  private canProcessEvent(event: SchedulerEvent): boolean {
    const eventKey = this.getEventKey(event);
    const existingGuard = this.eventGuardMap.get(eventKey);
    
    if (existingGuard) {
      const timeDiff = Date.now() - existingGuard.timestamp;
      if (timeDiff < this.DEBOUNCE_WINDOW) {
        return false;
      }
    }
    
    return true;
  }
  
  // 标记事件为处理中
  private markEventProcessing(event: SchedulerEvent): void {
    const eventKey = this.getEventKey(event);
    this.eventGuardMap.set(eventKey, {
      timestamp: Date.now(),
      processed: false
    });
  }
  
  // 标记事件为已处理
  private markEventProcessed(event: SchedulerEvent): void {
    const eventKey = this.getEventKey(event);
    const guard = this.eventGuardMap.get(eventKey);
    if (guard) {
      this.eventGuardMap.set(eventKey, {
        ...guard,
        processed: true
      });
    }
  }
  
  // 获取事件唯一键
  private getEventKey(event: SchedulerEvent): string {
    return `${event.type}_${event.messageId || 'unknown'}_${event.chatId || 'unknown'}`;
  }
  
  // 统一校验事件
  private validateEvent(event: SchedulerEvent): SchedulerEvent | null {
    // 验证消息ID
    if (event.messageId) {
      event.messageId = this.normalizeMessageId(event.messageId);
    }
    
    // 验证URL（如果有）
    if (event.data && typeof event.data === 'object') {
      this.sanitizeUrls(event.data);
    }
    
    // 验证必要字段
    if (!event.type || !event.data) {
      return null;
    }
    
    return event;
  }
  
  // 规范化消息ID
  private normalizeMessageId(messageId: string): string {
    // 移除空格和特殊字符
    return messageId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  }
  
  // 清理URL
  private sanitizeUrls(data: any): void {
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (typeof data[key] === 'string' && (key.includes('url') || key.includes('path'))) {
          data[key] = this.sanitizeUrl(data[key]);
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          this.sanitizeUrls(data[key]);
        }
      }
    }
  }
  
  // 清理单个URL
  private sanitizeUrl(url: string): string {
    // 移除多余的空格
    url = url.trim();
    
    // 构建完整的Worker URL
    return this.buildWorkerUrl(url);
  }
  
  // 构建Worker URL，防止二次拼接
  public buildWorkerUrl(path: string): string {
    // 如果已经包含 http/https，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // 如果是 /api/ 开头，使用 buildApiUrl 构建
    if (path.startsWith('/api/')) {
      return buildApiUrl(path);
    }
    
    // 其他情况，直接返回
    return path;
  }
  
  // 统一派发事件到Store
  private dispatchToStore(event: SchedulerEvent): void {
    const chatStore = useChatStore.getState();
    
    // 联系人持久化逻辑
    if (event.type === SchedulerEventType.WS_MESSAGE || event.type === SchedulerEventType.OCR_RESULT) {
      const customerId = event.data.customer_id || event.data.chatId || event.data.from || event.chatId;
      if (customerId) {
        // 增加去重逻辑，防止短时间内重复触发
        const now = Date.now();
        if (window.__UPSERT_LOCK__ && now - window.__UPSERT_LOCK__ < 1500) {
          console.log('[UPSERT_THROTTLED]');
          return;
        }
        window.__UPSERT_LOCK__ = now;
        
        safeFetch('/api/contact/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customerId,
            last_message: event.data.text || '[media]',
            last_ts: Date.now(),
            channel: 'whatsapp'
          })
        }).then(response => {
          if (!response.ok) {
            console.error('[SCHEDULER_CONTACT_UPSERT_ERROR] Failed to upsert contact:', response.status);
          } else {
            console.log('[SCHEDULER_CONTACT_UPSERT_SUCCESS] Contact upserted:', customerId);
          }
        }).catch(error => {
          console.error('[SCHEDULER_CONTACT_UPSERT_ERROR] Failed to upsert contact:', error);
        });
      }
    }
    
    switch (event.type) {
      case SchedulerEventType.WS_MESSAGE:
        this.dispatchWSMessage(chatStore, event);
        break;
      case SchedulerEventType.OCR_RESULT:
        this.dispatchOCRResult(chatStore, event);
        break;
      case SchedulerEventType.TRANSLATION_READY:
        this.dispatchTranslationReady(chatStore, event);
        break;
      case SchedulerEventType.MEDIA_UPLOADED:
        this.dispatchMediaUploaded(chatStore, event);
        break;
      default:
        console.warn('[SCHEDULER_UNKNOWN_EVENT_TYPE]', event.type);
    }
  }
  
  // 派发WebSocket消息
  private dispatchWSMessage(chatStore: any, event: SchedulerEvent): void {
    const { chatId, data } = event;
    
    if (chatId && data) {
      // 使用 appendMessage 方法添加消息
      chatStore.appendMessage(data);
      console.log('[SCHEDULER_DISPATCH_WS_MESSAGE]', chatId, event.messageId);
      

      
      // 触发联系人列表刷新
      const contactStore = useContactStore.getState();
      if (contactStore && contactStore.reloadContactList) {
        contactStore.reloadContactList().catch(error => {
          console.error('[SCHEDULER_RELOAD_CONTACTS_ERROR] Failed to reload contacts:', error);
        });
        console.log('[SCHEDULER_TRIGGER_CONTACTS_RELOAD]');
      }
    }
  }
  
  // 派发OCR结果
  private dispatchOCRResult(chatStore: any, event: SchedulerEvent): void {
    const { messageId, data } = event;
    
    if (messageId && data) {
      // 构建 OCR 结果数据
      const mid = messageId;
      const txt = 
        data.result?.text || 
        data.text || 
        data.ocr_text || 
        "";
      
      // 使用新的 setOCRResult 方法落库
      chatStore.setOCRResult(mid, txt, {
        provider: data.provider || "ocr",
        raw: data.result || data
      });
      
      console.log('[SCHEDULER_DISPATCH_OCR_RESULT]', messageId);
      
      // 检查 OCR 结果是否成功且文本长度大于100
      if ((data.status === "completed" || data.status === "success") && txt && txt.length > 0) {
        console.log('[SCHEDULER_TRIGGER_DEEPSEEK_ANALYSIS]', messageId);
        console.log('[OCR_EVENT_EMIT]', { message_id: messageId, text_length: txt.length });
        // 触发 OCR_DEEPSEEK_ANALYZE 事件
        window.dispatchEvent(
          new CustomEvent("OCR_DEEPSEEK_ANALYZE", {
            detail: {
              message_id: messageId,
              text: txt,
              mediaPath: data.mediaPath || data.image_url,
              direction: data.direction || "inbound"
            }
          })
        );
        console.log('[SCHEDULER_DISPATCH_OCR_DEEPSEEK_ANALYZE_EVENT]', messageId);
      }
    }
  }
  

  
  // 派发翻译完成
  private dispatchTranslationReady(chatStore: any, event: SchedulerEvent): void {
    const { messageId, data } = event;
    
    if (messageId && data) {
      // 使用 setTranslation 方法更新翻译结果
      chatStore.setTranslation(messageId, {
        text: data.text,
        provider: data.provider || 'deepseek',
        ts: Date.now()
      });
      console.log('[SCHEDULER_DISPATCH_TRANSLATION_READY]', messageId);
    }
  }
  
  // 派发媒体上传完成
  private dispatchMediaUploaded(chatStore: any, event: SchedulerEvent): void {
    const { messageId, data } = event;
    
    if (messageId && data) {
      // 媒体上传完成事件处理
      console.log('[SCHEDULER_DISPATCH_MEDIA_UPLOADED]', messageId);
      // 这里可以添加媒体上传相关的处理逻辑
    }
  }
  
  // 清理过期的事件保护
  public cleanupExpiredGuards(): void {
    const now = Date.now();
    for (const [key, guard] of this.eventGuardMap.entries()) {
      if (now - guard.timestamp > this.DEBOUNCE_WINDOW * 2) {
        this.eventGuardMap.delete(key);
      }
    }
  }
  
  // 获取当前事件保护数量（用于调试）
  public getEventGuardCount(): number {
    return this.eventGuardMap.size;
  }


}

// 导出单例实例
export const uiScheduler = UISchedulerCore.getInstance();

// 导出调度器工厂函数
export function getUISchedulerCore(): UISchedulerCore {
  return UISchedulerCore.getInstance();
}

// 导出调度事件创建函数
export function createSchedulerEvent(
  type: SchedulerEventType,
  data: any,
  messageId?: string,
  chatId?: string
): SchedulerEvent {
  return {
    type,
    messageId,
    chatId,
    data,
    timestamp: Date.now()
  };
}

// 导出工具函数：检查URL是否需要构建
export function needsWorkerUrlBuild(url: string): boolean {
  return !url.startsWith('http://') && !url.startsWith('https://') && url.startsWith('/api/');
}
