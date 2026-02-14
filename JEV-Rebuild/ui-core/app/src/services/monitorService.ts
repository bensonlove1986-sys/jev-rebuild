import { MonitorConfig } from '../store/configStore';
import { 
  extractAllText, 
  extractAllImages, 
  captureScreenshot, 
  compressImage,
  throttle 
} from '../utils/monitorUtils';

// 监控历史记录类型
export interface MonitorHistory {
  id: string;
  timestamp: number;
  type: 'text' | 'image';
  content: string | HTMLCanvasElement;
  metadata?: Record<string, any>;
}

// 监控服务事件类型
export type MonitorEvent = 
  | { type: 'monitor_started' }
  | { type: 'monitor_stopped' }
  | { type: 'text_extracted'; data: string }
  | { type: 'image_captured'; data: HTMLCanvasElement }
  | { type: 'monitor_error'; error: Error };

// 监控服务接口
export class MonitorService {
  private iframe: HTMLIFrameElement;
  private config: MonitorConfig;
  private observer: MutationObserver | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private history: MonitorHistory[] = [];
  private eventListeners: Map<string, Set<(event: MonitorEvent) => void>> = new Map();
  private lastProcessedTime = 0;
  private isMonitoring = false;

  constructor(iframe: HTMLIFrameElement, config: MonitorConfig) {
    this.iframe = iframe;
    this.config = config;
    // 使用节流优化DOM变化处理
    this.handleDomChanges = throttle(this.handleDomChanges.bind(this), this.config.monitorInterval / 2);
  }

  // 启动监控
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('[MonitorService] Monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.emitEvent({ type: 'monitor_started' });

    // 监听iframe加载完成
    this.iframe.onload = () => {
      console.log('[MonitorService] Iframe loaded, setting up observer');
      this.setupObserver();
      this.startIntervalMonitoring();
    };
    
    // 如果iframe已经加载完成，直接启动监控
    if (this.iframe.contentDocument?.readyState === 'complete') {
      console.log('[MonitorService] Iframe already loaded, setting up observer');
      this.setupObserver();
      this.startIntervalMonitoring();
    }
  }

  // 停止监控
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.warn('[MonitorService] Monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    this.emitEvent({ type: 'monitor_stopped' });

    // 清理资源
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // 清空历史记录（如果需要）
    this.history = [];
  }

  // 获取监控状态
  getIsMonitoring(): boolean {
    return this.isMonitoring;
  }

  // 获取监控历史记录
  getHistory(): MonitorHistory[] {
    return [...this.history];
  }

  // 清空监控历史记录
  clearHistory(): void {
    this.history = [];
  }

  // 更新配置
  updateConfig(config: MonitorConfig): void {
    this.config = config;
    // 如果监控正在运行，重启监控以应用新配置
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // 订阅监控事件
  on(eventType: MonitorEvent['type'], listener: (event: MonitorEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)?.add(listener);
  }

  // 取消订阅监控事件
  off(eventType: MonitorEvent['type'], listener: (event: MonitorEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener);
  }

  // 设置MutationObserver监听DOM变化
  private setupObserver(): void {
    const iframeDoc = this.iframe.contentDocument;
    if (!iframeDoc) {
      console.error('[MonitorService] Cannot access iframe document');
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      this.handleDomChanges(mutations);
    });

    // 监听整个文档的变化
    this.observer.observe(iframeDoc.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    console.log('[MonitorService] MutationObserver setup completed');
  }

  // 启动定时监控
  private startIntervalMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.performMonitoring();
    }, this.config.monitorInterval);

    console.log('[MonitorService] Interval monitoring started with interval:', this.config.monitorInterval, 'ms');
  }

  // 处理DOM变化
  private handleDomChanges(mutations: MutationRecord[]): void {
    // 节流处理，避免频繁触发
    const now = Date.now();
    if (now - this.lastProcessedTime < this.config.monitorInterval / 2) {
      return;
    }
    
    this.lastProcessedTime = now;
    this.performMonitoring();
  }

  // 执行监控任务
  private async performMonitoring(): Promise<void> {
    const iframeDoc = this.iframe.contentDocument;
    if (!iframeDoc) {
      console.error('[MonitorService] Cannot access iframe document');
      return;
    }

    try {
      // 提取文字
      if (this.config.monitorTypes.includes('text')) {
        this.extractText(iframeDoc);
      }

      // 捕获图片
      if (this.config.monitorTypes.includes('image')) {
        await this.captureImages(iframeDoc);
      }
    } catch (error) {
      console.error('[MonitorService] Monitoring error:', error);
      this.emitEvent({ type: 'monitor_error', error: error as Error });
    }
  }

  // 提取文字
  private extractText(doc: Document): void {
    const text = extractAllText(doc);
    if (text && text.trim().length > 0) {
      // 添加到历史记录
      const historyItem: MonitorHistory = {
        id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'text',
        content: text
      };
      
      this.addToHistory(historyItem);
      this.emitEvent({ type: 'text_extracted', data: text });
      console.log('[MonitorService] Text extracted:', text.length, 'characters');
    }
  }

  // 捕获图片
  private async captureImages(doc: Document): Promise<void> {
    const images = extractAllImages(doc);
    
    for (const img of images) {
      try {
        // 使用Canvas捕获图片
        const canvas = await captureScreenshot(img);
        
        // 添加到历史记录
        const historyItem: MonitorHistory = {
          id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'image',
          content: canvas,
          metadata: {
            width: canvas.width,
            height: canvas.height,
            src: img.src,
            alt: img.alt
          }
        };
        
        this.addToHistory(historyItem);
        this.emitEvent({ type: 'image_captured', data: canvas });
        console.log('[MonitorService] Image captured:', img.src);
      } catch (error) {
        console.error('[MonitorService] Error capturing image:', error);
      }
    }
  }

  // 添加到历史记录
  private addToHistory(item: MonitorHistory): void {
    this.history.push(item);
    
    // 限制历史记录数量
    if (this.history.length > this.config.maxHistoryCount) {
      this.history.shift();
    }
  }

  // 触发事件
  private emitEvent(event: MonitorEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[MonitorService] Error in event listener:', error);
        }
      });
    }
  }
}
