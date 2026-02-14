import { chatStoreInstance as chatStore } from './ui-core/app/src/modules/chat_modular/store/chatStore';

// Event types
export enum SchedulerEventType {
  WS_MESSAGE = 'WS_MESSAGE',
  OCR_RESULT = 'OCR_RESULT',
  DRAFT_COMPLETE = 'DRAFT_COMPLETE',
  TRANSLATION_READY = 'TRANSLATION_READY',
  MEDIA_UPLOADED = 'MEDIA_UPLOADED'
}

// Event interface
export interface SchedulerEvent {
  type: SchedulerEventType;
  data: any;
  messageId?: string;
  timestamp?: number;
}

// Event guard map for deduplication
interface EventGuard {
  timestamp: number;
  processed: boolean;
}

class UISchedulerCore {
  private static instance: UISchedulerCore;
  private eventGuardMap: Map<string, EventGuard> = new Map();
  private readonly WORKER_BASE_URL: string = this.getWorkerBaseUrl();
  private readonly EVENT_THROTTLE_MS: number = 500;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): UISchedulerCore {
    if (!UISchedulerCore.instance) {
      UISchedulerCore.instance = new UISchedulerCore();
    }
    return UISchedulerCore.instance;
  }

  // 统一接收事件
  public receiveEvent(event: SchedulerEvent): void {
    try {
      // 统一校验
      if (!this.validateEvent(event)) {
        console.warn('[Scheduler] Event validation failed:', event.type);
        return;
      }

      // 事件节流与去重
      if (!this.dedupeEvent(event)) {
        console.warn('[Scheduler] Event deduplicated:', event.type);
        return;
      }

      // 统一派发
      this.dispatchToStore(event);
    } catch (error) {
      console.error('[Scheduler] Error processing event:', error);
    }
  }

  // 统一校验
  private validateEvent(event: SchedulerEvent): boolean {
    // 1. 标准化 messageId
    if (event.messageId) {
      event.messageId = this.normalizeMessageId(event.messageId);
    }

    // 2. 清理 URL
    if (event.data && typeof event.data === 'object') {
      this.sanitizeUrl(event.data);
    }

    // 3. 基本类型检查
    if (!event.type || !Object.values(SchedulerEventType).includes(event.type)) {
      return false;
    }

    return true;
  }

  // 标准化 messageId
  private normalizeMessageId(messageId: string): string {
    return messageId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  }

  // 清理 URL
  private sanitizeUrl(data: any): void {
    if (typeof data === 'object' && data !== null) {
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (typeof value === 'string' && (value.includes('http://') || value.includes('https://'))) {
          data[key] = value.trim();
        } else if (typeof value === 'object' && value !== null) {
          this.sanitizeUrl(value);
        }
      });
    }
  }

  // 事件节流与去重
  private dedupeEvent(event: SchedulerEvent): boolean {
    const eventKey = `${event.messageId || 'unknown'}_${event.type}`;
    const now = Date.now();
    const existingGuard = this.eventGuardMap.get(eventKey);

    if (existingGuard && (now - existingGuard.timestamp) < this.EVENT_THROTTLE_MS) {
      return false;
    }

    this.eventGuardMap.set(eventKey, {
      timestamp: now,
      processed: true
    });

    // 清理过期的守卫
    this.cleanupEventGuards();

    return true;
  }

  // 清理过期的事件守卫
  private cleanupEventGuards(): void {
    const now = Date.now();
    for (const [key, guard] of this.eventGuardMap.entries()) {
      if (now - guard.timestamp > this.EVENT_THROTTLE_MS * 2) {
        this.eventGuardMap.delete(key);
      }
    }
  }

  // 统一派发
  private dispatchToStore(event: SchedulerEvent): void {
    const store = chatStore.getState();

    switch (event.type) {
      case SchedulerEventType.WS_MESSAGE:
        store.appendMessage(event.data);
        break;

      case SchedulerEventType.OCR_RESULT:
        if (event.messageId) {
          store.applyOCR(event.messageId, event.data);
        }
        break;

      case SchedulerEventType.DRAFT_COMPLETE:
        if (event.messageId) {
          store.updateDraft(event.messageId, event.data);
        }
        break;

      case SchedulerEventType.TRANSLATION_READY:
        if (event.messageId) {
          store.setTranslation(event.messageId, event.data);
        }
        break;

      case SchedulerEventType.MEDIA_UPLOADED:
        store.appendMessage(event.data);
        break;

      default:
        console.warn('[Scheduler] Unknown event type:', event.type);
    }
  }

  // URL 永久防二次拼接
  public buildWorkerUrl(path: string): string {
    // 如果包含 http/https → 直接返回
    if (path.includes('http://') || path.includes('https://')) {
      return path;
    }

    // 如果为 /api/... → 自动补 Worker Base
    if (path.startsWith('/api/')) {
      return `${this.WORKER_BASE_URL}${path}`;
    }

    // 其他情况，直接返回
    return path;
  }

  // 获取 Worker 基础 URL
  private getWorkerBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return '';
  }

  // 重置事件守卫（用于测试或特殊情况）
  public resetEventGuards(): void {
    this.eventGuardMap.clear();
  }
}

// 导出单例实例
export const uiScheduler = UISchedulerCore.getInstance();
