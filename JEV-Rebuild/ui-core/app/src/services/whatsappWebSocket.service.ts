// WhatsApp WebSocket 服务
// 用于处理与服务器的实时通信

import { eventBus } from '../utils/eventBus';
import { createLogger } from '../utils/structuredLogger';
import { uiScheduler, SchedulerEventType } from '../core/scheduler/ui_scheduler_core';
import { JEV_RUNTIME, validateRuntimeConfig } from '../core/jev_runtime_config';
// TODO[SOURCE_GATE]:
// Services must dispatch via system_scheduler.
// Direct store mutation will be removed in Source Normalization phase.
import { useChatStore } from '../modules/chat_modular/store/chatStore';
import { dispatch } from '../core/scheduler/system_scheduler';

// 验证运行时配置
validateRuntimeConfig();

// 创建 logger 实例
const logger = createLogger('WhatsAppWebSocketService');

// WebSocket 状态类型
type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// WebSocket 服务类
class WhatsAppWebSocketService {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private url: string = '';

  // 获取 WebSocket 模式开关
  private get isWebSocketEnabled(): boolean {
    // 检查环境变量或配置，默认启用
    const mode = import.meta.env.VITE_WHATSAPP_ENGINE_MODE || '';
    // 支持多种模式：'local_ws' 或 'production' 或默认启用
    return mode === 'local_ws' || mode === 'production' || mode === '';
  }

  // 初始化 WebSocket 服务
  public init() {
    const wsUrl = JEV_RUNTIME.WS_BASE;
    this.url = wsUrl;
    
    logger.info(`Initializing WebSocket service with URL: ${wsUrl}`);
    logger.info('[WS_BASE_CONFIGURED] Using fixed WebSocket URL from runtime config');
    
    // 只有在启用 WebSocket 模式时才连接
    if (this.isWebSocketEnabled) {
      this.connect();
    } else {
      logger.info('[WHATSAPP_WS_DISABLED] WebSocket disabled');
    }
  }

  // 建立 WebSocket 连接
  public connect() {
    // 检查是否启用 WebSocket
    if (!this.isWebSocketEnabled) {
      logger.info('[WHATSAPP_WS_DISABLED] WebSocket disabled');
      return;
    }

    if (this.ws && this.status === 'connected') {
      logger.info('[WHATSAPP_WS_ALREADY_CONNECTED] WebSocket already connected');
      return;
    }

    this.status = 'connecting';
    logger.info('Connecting to WebSocket server...');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.handleOpen();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        this.handleError(error);
      };

      this.ws.onclose = (event) => {
        this.handleClose(event);
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      this.handleError(error as Error);
    }
  }

  // 处理连接打开
  private handleOpen() {
    this.status = 'connected';
    this.reconnectAttempts = 0;
    logger.info('[WA_WS_RECONNECTED] WebSocket connected successfully');
    logger.info('[WA_WS_CONNECTION_ESTABLISHED] Connection established, sending ping');
    
    // 发送初始ping消息
    this.send({ type: 'ping' });
    
    // 启动心跳机制
    this.startHeartbeat();
    
    eventBus.emit('ws:connected');
  }

  // 心跳间隔（毫秒）
  private heartbeatInterval: number = 30000;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // 启动心跳机制
  private startHeartbeat() {
    // 清除现有的定时器
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // 每30秒发送一次ping
    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected') {
        logger.info('[WA_WS_HEARTBEAT] Sending ping');
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  // 停止心跳机制
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 处理消息接收
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      logger.info('[WA_WS_RECV_MSG]', data);
      
      // 根据消息类型分发处理
      switch (data.type) {
        case 'message':
          // 使用 data.data 作为消息数据，符合我们的实现格式
          this.handleIncomingMessage(data.data);
          logger.info('[WA_WS_MESSAGE_APPENDED]');
          break;
        case 'message_update':
          // 处理媒体更新消息
          this.handleMessageUpdate(data.data);
          break;
        case 'status':
          this.handleStatusUpdate(data.data);
          break;
        case 'typing':
          this.handleTypingIndicator(data.data);
          break;
        case 'draft_complete':
          this.handleDraftComplete(data.data);
          break;
        case 'ocr-deepseek-analysis':
          // 处理OCR DeepSeek分析结果
          this.handleOcrDeepseekAnalysis(data.payload);
          break;
        case 'deepseek_ocr_analysis':
          // 处理DeepSeek OCR分析结果
          this.handleDeepseekOcrAnalysis(data);
          break;
        case 'pong':
          logger.info('[WA_WS_PONG] Received pong');
          break;
        case 'connected':
          logger.info('[WA_WS_CONNECTED] Received connected event');
          break;
        default:
          logger.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error, event.data);
    }
  }

  // 处理传入消息
  private handleIncomingMessage(message: any) {
    try {
      // TODO[SOURCE_GATE]:
      // Establish unified event flow with real business data
      dispatch({
        type: "WS_MESSAGE_RECEIVED",
        payload: message
      });
      
      // TODO[SOURCE_NORMALIZE]:
      // legacy direct store path; dispatch-first is the primary path now.
      const chatStore = useChatStore.getState();
      chatStore.addMessage(message, 'ws'); // 添加消息来源标记为 'ws'
      
      // 触发调度事件
      uiScheduler.emit(SchedulerEventType.WS_MESSAGE, {
        messageId: message.message_id,
        chatId: message.chat_id,
        data: message,
        timestamp: Date.now()
      });
      
      eventBus.emit('message:received', message);
    } catch (error) {
      logger.error('Failed to handle incoming message:', error);
    }
  }

  // 处理消息更新
  private handleMessageUpdate(data: any) {
    logger.info('[WA_WS_MESSAGE_UPDATE]', data);
    eventBus.emit('message:updated', data);
  }

  // 处理状态更新
  private handleStatusUpdate(data: any) {
    logger.info('[WA_WS_STATUS_UPDATE]', data);
    eventBus.emit('status:updated', data);
  }

  // 处理输入状态
  private handleTypingIndicator(data: any) {
    logger.info('[WA_WS_TYPING_INDICATOR]', data);
    eventBus.emit('typing:indicator', data);
  }

  // 处理草稿完成
  private handleDraftComplete(data: any) {
    logger.info('[WA_WS_DRAFT_COMPLETE]', data);
    eventBus.emit('draft:complete', data);
  }

  // 处理OCR DeepSeek分析结果
  private handleOcrDeepseekAnalysis(payload: any) {
    logger.info('[WA_WS_OCR_DEEPSEEK_ANALYSIS]', payload);
    eventBus.emit('ocr:deepseek:analysis', payload);
  }

  // 处理DeepSeek OCR分析结果
  private handleDeepseekOcrAnalysis(data: any) {
    logger.info('[WA_WS_DEEPSEEK_OCR_ANALYSIS]', data);
    eventBus.emit('deepseek:ocr:analysis', data);
  }

  // 处理错误
  private handleError(error: Error) {
    this.status = 'error';
    logger.error('[WA_WS_ERROR]', error);
    logger.error('[WA_WS_ERROR_DETAILS]', error.message, error.stack);
    
    // 停止心跳机制
    this.stopHeartbeat();
    
    eventBus.emit('ws:error', error);
    
    // 尝试重连
    this.attemptReconnect();
  }

  // 处理连接关闭
  private handleClose(event: CloseEvent) {
    this.status = 'disconnected';
    logger.info('[WA_WS_CLOSED] WebSocket connection closed:', event.code, event.reason);
    logger.info('[WA_WS_CLOSE_DETAILS] Code:', event.code, 'Reason:', event.reason, 'WasClean:', event.wasClean);
    
    // 停止心跳机制
    this.stopHeartbeat();
    
    eventBus.emit('ws:closed', event);
    
    // 尝试重连
    this.attemptReconnect();
  }

  // 尝试重连
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      logger.info(`[WA_WS_RECONNECT_ATTEMPT] Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        logger.info('[WA_WS_RECONNECTING] Reconnecting...');
        this.connect();
      }, delay);
    } else {
      logger.error('[WA_WS_MAX_RECONNECT_ATTEMPTS] Max reconnect attempts reached');
    }
  }

  // 发送消息
  public send(message: any) {
    if (this.ws && this.status === 'connected') {
      try {
        this.ws.send(JSON.stringify(message));
        logger.info('[WA_WS_SEND] Message sent:', message);
        return true;
      } catch (error) {
        logger.error('[WA_WS_SEND_ERROR] Failed to send message:', error);
        return false;
      }
    } else {
      logger.warn('[WA_WS_SEND_DISCONNECTED] Cannot send message - WebSocket not connected');
      return false;
    }
  }

  // 关闭连接
  public close() {
    if (this.ws) {
      // 停止心跳机制
      this.stopHeartbeat();
      
      this.ws.close();
      this.ws = null;
      this.status = 'disconnected';
      logger.info('[WA_WS_CLOSED_MANUALLY] WebSocket connection closed manually');
    }
  }

  // 获取当前状态
  public getStatus(): WebSocketStatus {
    return this.status;
  }

  // 单例实例
  private static instance: WhatsAppWebSocketService;

  // 获取单例实例
  public static getInstance(): WhatsAppWebSocketService {
    if (!WhatsAppWebSocketService.instance) {
      WhatsAppWebSocketService.instance = new WhatsAppWebSocketService();
    }
    return WhatsAppWebSocketService.instance;
  }
}

// 导出单例实例
export const whatsappWebSocketService = WhatsAppWebSocketService.getInstance();
