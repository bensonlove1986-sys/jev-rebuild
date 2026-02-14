import { getJevRuntimeConfig } from '../core/jev_runtime_config';
import { useChatStore } from '../modules/chat_modular/store/chatStore';

const LEADER_KEY = 'jev-ws-leader';
const BROADCAST_CHANNEL_NAME = 'jev-ws-broadcast';
const LEASE_DURATION = 3000;
const ELECTION_INTERVAL = 1500;
const RECONNECT_DELAY_BASE = 1000;
const RECONNECT_MAX_DELAY = 30000;

type WSState = 'IDLE' | 'ELECTING' | 'CONNECTING' | 'OPEN' | 'RECONNECT_WAIT' | 'FAILED';

interface WSRuntime {
  tabId: string;
  epoch: number;
  isLeader: boolean;
  leaderId: string;
  ws: WebSocket | null;
  state: WSState;
  electTimer: NodeJS.Timeout | null;
  heartbeatTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  reconnectAttempts: number;
  stopFlag: boolean;
  broadcastChannel: BroadcastChannel | null;
  leaderLeaseUntil: number;
}

class WhatsAppInboxService {
  private static instance: WhatsAppInboxService | null = null;
  private runtime: WSRuntime;
  private messageCallbacks: Set<(message: any) => void> = new Set();

  private constructor() {
    this.runtime = {
      tabId: this.generateTabId(),
      epoch: Date.now(),
      isLeader: false,
      leaderId: '',
      ws: null,
      state: 'IDLE',
      electTimer: null,
      heartbeatTimer: null,
      reconnectTimer: null,
      reconnectAttempts: 0,
      stopFlag: false,
      broadcastChannel: null,
      leaderLeaseUntil: 0
    };
  }

  public static getInstance(): WhatsAppInboxService {
    if (!WhatsAppInboxService.instance) {
      WhatsAppInboxService.instance = new WhatsAppInboxService();
    }
    return WhatsAppInboxService.instance;
  }

  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public async init(): Promise<void> {
    if (this.runtime.stopFlag) {
      console.warn('[WS_INIT_SKIPPED] Service is stopping');
      return;
    }

    if (this.runtime.state !== 'IDLE') {
      console.log('[WS_INIT_SKIPPED] Already initialized:', this.runtime.state);
      return;
    }

    console.log('[WS_INIT_START] Initializing WhatsApp Inbox Service');
    this.runtime.state = 'ELECTING';

    try {
      this.setupBroadcastChannel();
      this.startElectionLoop();
      await this.electLeader();
    } catch (error) {
      console.error('[WS_INIT_ERROR]', error);
      this.runtime.state = 'FAILED';
    }
  }

  private setupBroadcastChannel(): void {
    try {
      this.runtime.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.runtime.broadcastChannel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
      console.log('[WS_BROADCAST_CHANNEL_SETUP] BroadcastChannel initialized');
    } catch (error) {
      console.error('[WS_BROADCAST_CHANNEL_ERROR]', error);
    }
  }

  private startElectionLoop(): void {
    this.runtime.electTimer = setInterval(() => {
      if (this.runtime.stopFlag) {
        clearInterval(this.runtime.electTimer!);
        this.runtime.electTimer = null;
        return;
      }
      this.checkLeaderStatus();
    }, ELECTION_INTERVAL);
    console.log('[WS_ELECTION_LOOP_STARTED] Election loop started');
  }

  private checkLeaderStatus(): void {
    try {
      const leaderData = localStorage.getItem(LEADER_KEY);
      if (!leaderData) {
        this.electLeader();
        return;
      }

      const { id, leaseUntil } = JSON.parse(leaderData);
      const now = Date.now();

      if (leaseUntil <= now) {
        console.log('[WS_LEASE_EXPIRED] Leader lease expired');
        this.electLeader();
        return;
      }

      if (this.runtime.isLeader && id !== this.runtime.tabId) {
        console.warn('[WS_DEMOTED] Lost leadership');
        this.demoteToFollower();
        return;
      }

      if (!this.runtime.isLeader && id === this.runtime.tabId) {
        console.log('[WS_PROMOTED] Promoted to leader');
        this.runtime.isLeader = true;
        this.runtime.leaderId = this.runtime.tabId;
        this.ensureConnected();
      }
    } catch (error) {
      console.error('[WS_LEADER_CHECK_ERROR]', error);
    }
  }

  private async electLeader(): Promise<void> {
    if (this.runtime.stopFlag) return;

    try {
      const now = Date.now();
      const leaderClaim = JSON.stringify({
        id: this.runtime.tabId,
        leaseUntil: now + LEASE_DURATION
      });

      localStorage.setItem(LEADER_KEY, leaderClaim);

      const confirm = localStorage.getItem(LEADER_KEY);
      if (confirm === leaderClaim) {
        console.log('[WS_LEADER_ELECTED] Elected as leader');
        this.runtime.isLeader = true;
        this.runtime.leaderId = this.runtime.tabId;
        this.runtime.leaderLeaseUntil = now + LEASE_DURATION;
        this.ensureConnected();
      } else {
        console.log('[WS_LEADER_ELECTION_FAILED] Election failed, becoming follower');
        this.runtime.isLeader = false;
        this.demoteToFollower();
      }
    } catch (error) {
      console.error('[WS_ELECTION_ERROR]', error);
      this.runtime.isLeader = false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.runtime.stopFlag) return;
    if (!this.runtime.isLeader) return;
    if (this.runtime.ws && this.runtime.ws.readyState === WebSocket.OPEN) return;

    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (this.runtime.stopFlag) return;
    if (this.runtime.state === 'CONNECTING' || this.runtime.state === 'OPEN') return;

    this.runtime.state = 'CONNECTING';
    console.log('[WS_CONNECTING] Connecting to WebSocket');

    try {
      const config = getJevRuntimeConfig();
      const wsUrl = config.wsBase;
      console.log('[WS_CONNECT_URL]', wsUrl);
      console.log('[WS_CONNECT_ATTEMPT] Attempt', this.runtime.reconnectAttempts + 1);
      
      // 检查URL格式
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        throw new Error(`Invalid WebSocket URL: ${wsUrl}`);
      }
      
      const ws = new WebSocket(wsUrl);
      const currentEpoch = this.runtime.epoch;

      // 添加连接超时检测
      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error('[WS_CONNECT_TIMEOUT] Connection timeout after 10 seconds');
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        if (currentEpoch !== this.runtime.epoch || this.runtime.stopFlag) {
          ws.close();
          return;
        }

        console.log('[WS_ONOPEN] WebSocket connected successfully');
        console.log('[WS_CONNECTION_STATE] Ready state:', ws.readyState);
        this.runtime.ws = ws;
        this.runtime.state = 'OPEN';
        this.runtime.reconnectAttempts = 0;
        this.startLeaderHeartbeat();
        useChatStore.getState().setIsConnected(true);
        console.log('[WS_CONNECTION_SUCCESS] WebSocket connection established');
      };

      ws.onmessage = (event) => {
        if (currentEpoch !== this.runtime.epoch || this.runtime.stopFlag) {
          return;
        }

        try {
          const message = JSON.parse(event.data);
          console.log('[WS_ONMESSAGE] Received message:', message);
          this.handleInboundMessage(message);
        } catch (error) {
          console.error('[WS_MESSAGE_PARSE_ERROR]', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (currentEpoch !== this.runtime.epoch || this.runtime.stopFlag) {
          return;
        }

        console.log('[WS_ONCLOSE] WebSocket closed');
        console.log('[WS_CLOSE_CODE]', event.code);
        console.log('[WS_CLOSE_REASON]', event.reason);
        console.log('[WS_WAS_CLEAN]', event.wasClean);
        this.runtime.ws = null;
        this.runtime.state = 'RECONNECT_WAIT';
        useChatStore.getState().setIsConnected(false);
        this.scheduleReconnect();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        if (currentEpoch !== this.runtime.epoch || this.runtime.stopFlag) {
          return;
        }

        console.error('[WS_ONERROR] WebSocket error:', error);
        console.error('[WS_ERROR_DETAILS]', error.message);
        if (error.stack) {
          console.error('[WS_ERROR_STACK]', error.stack);
        }
      };
    } catch (error) {
      console.error('[WS_CONNECT_ERROR]', error);
      console.error('[WS_CONNECT_ERROR_DETAILS]', error.message);
      this.runtime.state = 'RECONNECT_WAIT';
      useChatStore.getState().setIsConnected(false);
      this.scheduleReconnect();
    }
  }

  private startLeaderHeartbeat(): void {
    if (this.runtime.heartbeatTimer) {
      clearInterval(this.runtime.heartbeatTimer);
    }

    this.runtime.heartbeatTimer = setInterval(() => {
      if (this.runtime.stopFlag || !this.runtime.isLeader) {
        clearInterval(this.runtime.heartbeatTimer!);
        this.runtime.heartbeatTimer = null;
        return;
      }

      try {
        const now = Date.now();
        const leaderClaim = JSON.stringify({
          id: this.runtime.tabId,
          leaseUntil: now + LEASE_DURATION
        });

        localStorage.setItem(LEADER_KEY, leaderClaim);
        this.runtime.leaderLeaseUntil = now + LEASE_DURATION;
      } catch (error) {
        console.error('[WS_HEARTBEAT_ERROR]', error);
      }
    }, LEASE_DURATION / 2);
  }

  private scheduleReconnect(): void {
    if (this.runtime.reconnectTimer) {
      clearTimeout(this.runtime.reconnectTimer);
    }

    const delay = Math.min(
      RECONNECT_DELAY_BASE * Math.pow(2, this.runtime.reconnectAttempts) +
      Math.random() * 1000,
      RECONNECT_MAX_DELAY
    );

    this.runtime.reconnectAttempts++;
    console.log(`[WS_RECONNECT_SCHEDULED] Reconnecting in ${delay}ms`);

    this.runtime.reconnectTimer = setTimeout(() => {
      if (this.runtime.stopFlag) return;
      if (this.runtime.isLeader) {
        this.connectWebSocket();
      }
    }, delay);
  }

  private demoteToFollower(): void {
    if (!this.runtime.isLeader) return;

    console.log('[WS_DEMOTING] Demoting to follower');
    this.runtime.isLeader = false;
    this.runtime.leaderId = '';

    if (this.runtime.heartbeatTimer) {
      clearInterval(this.runtime.heartbeatTimer);
      this.runtime.heartbeatTimer = null;
    }

    if (this.runtime.ws) {
      this.runtime.ws.close();
      this.runtime.ws = null;
    }

    this.runtime.state = 'IDLE';
    useChatStore.getState().setIsConnected(false);
  }

  private handleInboundMessage(message: any): void {
    if (!message || !message.id) {
      return;
    }

    const now = Date.now();
    if (now - message.timestamp > 90 * 24 * 60 * 60 * 1000) {
      console.log('[WS_OLD_MESSAGE_DROPPED] Message too old');
      return;
    }

    // 确保消息有 kind 或 type 属性，防止被 chatStore 过滤
    if (!message.kind && !message.type) {
      message.type = 'text'; // 默认设置为文本消息
      console.log('[WS_MESSAGE_FIXED] Added missing type property:', message.type);
    }

    try {
      useChatStore.getState().appendMessage(message);
      console.log('[STORE_APPEND_OK] Message appended to store');
      
      if (this.runtime.broadcastChannel) {
        this.runtime.broadcastChannel.postMessage({
          type: 'message',
          data: message
        });
      }
    } catch (error) {
      console.error('[WS_MESSAGE_HANDLER_ERROR]', error);
    }

    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[WS_CALLBACK_ERROR]', error);
      }
    });
  }

  private handleBroadcastMessage(data: any): void {
    if (!data) return;

    switch (data.type) {
      case 'message':
        this.handleInboundMessage(data.data);
        break;
      case 'send':
        if (this.runtime.isLeader && this.runtime.ws && this.runtime.ws.readyState === WebSocket.OPEN) {
          try {
            this.runtime.ws.send(JSON.stringify(data.data));
          } catch (error) {
            console.error('[WS_SEND_ERROR]', error);
          }
        }
        break;
      case 'leader-changed':
        this.checkLeaderStatus();
        break;
    }
  }

  public onMessage(callback: (message: any) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  public send(message: any): void {
    if (this.runtime.isLeader && this.runtime.ws && this.runtime.ws.readyState === WebSocket.OPEN) {
      try {
        this.runtime.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WS_SEND_ERROR]', error);
      }
    } else if (this.runtime.broadcastChannel) {
      this.runtime.broadcastChannel.postMessage({
        type: 'send',
        data: message
      });
    }
  }

  public getState(): WSState {
    return this.runtime.state;
  }

  public getIsLeader(): boolean {
    return this.runtime.isLeader;
  }

  public async stop(): Promise<void> {
    if (this.runtime.stopFlag) return;

    console.log('[WS_STOP] Stopping WhatsApp Inbox Service');
    this.runtime.stopFlag = true;

    if (this.runtime.electTimer) {
      clearInterval(this.runtime.electTimer);
      this.runtime.electTimer = null;
    }

    if (this.runtime.heartbeatTimer) {
      clearInterval(this.runtime.heartbeatTimer);
      this.runtime.heartbeatTimer = null;
    }

    if (this.runtime.reconnectTimer) {
      clearTimeout(this.runtime.reconnectTimer);
      this.runtime.reconnectTimer = null;
    }

    if (this.runtime.ws) {
      this.runtime.ws.close();
      this.runtime.ws = null;
    }

    if (this.runtime.broadcastChannel) {
      this.runtime.broadcastChannel.close();
      this.runtime.broadcastChannel = null;
    }

    if (this.runtime.isLeader) {
      try {
        localStorage.setItem(LEADER_KEY, JSON.stringify({
          id: '',
          leaseUntil: 0
        }));
      } catch (error) {
        console.error('[WS_STOP_LEASE_ERROR]', error);
      }
    }

    this.runtime.state = 'IDLE';
    this.runtime.isLeader = false;
    useChatStore.getState().setIsConnected(false);

    console.log('[WS_STOPPED] WhatsApp Inbox Service stopped');
  }

  // 添加 fetchHistory 方法，用于拉取历史消息
  public async fetchHistory(customerId: string): Promise<void> {
    console.log('[WS_HISTORY] Fetching history for customer:', customerId);
    
    try {
      const config = getJevRuntimeConfig();
      const url = `${config.apiBase}/inbox/history?customer_id=${encodeURIComponent(customerId)}&limit=30`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }
      
      const messages = await response.json();
      console.log(`[WS_HISTORY] Received ${messages} messages for customer: ${customerId}`);
      
      // 处理收到的消息
      if (Array.isArray(messages)) {
        console.log(`[WS_HISTORY] Processing ${messages.length} messages`);
        messages.forEach((message: any) => {
          this.handleInboundMessage(message);
        });
      } else {
        console.log('[WS_HISTORY] No messages to process');
      }
    } catch (error) {
      console.error('[WS_HISTORY_ERROR] Error fetching history:', error);
    }
  }

  // 添加 loadCustomerHistory 方法，作为 fetchHistory 的别名，防回归
  public async loadCustomerHistory(customerId: string): Promise<void> {
    return this.fetchHistory(customerId);
  }

  // 添加 loadContactList 方法，用于加载联系人列表
  public async loadContactList(): Promise<void> {
    console.log('[WS_CONTACT_LIST] Loading contact list');
    
    try {
      const config = getJevRuntimeConfig();
      const url = `${config.apiBase}/contacts`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load contact list: ${response.status}`);
      }
      
      const contacts = await response.json();
      console.log(`[WS_CONTACT_LIST] Received ${contacts.length} contacts`);
      
      // 这里可以添加处理联系人列表的逻辑
      // 例如更新store等
    } catch (error) {
      console.error('[WS_CONTACT_LIST_ERROR] Error loading contact list:', error);
    }
  }

  // 添加 pullOnDemand 方法，用于按需拉取消息
  public async pullOnDemand(chatId: string): Promise<void> {
    console.log('[WS_PULL_ON_DEMAND] Pulling messages on demand for chat:', chatId);
    
    try {
      // 调用 fetchHistory 方法来获取历史消息
      await this.fetchHistory(chatId);
    } catch (error) {
      console.error('[WS_PULL_ON_DEMAND_ERROR] Error pulling messages on demand:', error);
      throw error;
    }
  }

  // 添加 registerMessageCallback 方法
  public registerMessageCallback(callback: (chat_id: string, message: any) => void): void {
    console.log('[WS_REGISTER_CALLBACK] Registering message callback');
    // 注册回调到 messageCallbacks 集合
    this.messageCallbacks.add(callback);
  }

  // 添加 isIncrementalSyncRunning 方法
  public isIncrementalSyncRunning(): boolean {
    return false;
  }

  // 添加 isForcePullRunning 方法
  public isForcePullRunning(): boolean {
    return false;
  }

  // 添加 isWSConnected 方法
  public isWSConnected(): boolean {
    return this.runtime.ws !== null && this.runtime.ws.readyState === WebSocket.OPEN;
  }

  // 添加 getLastSyncTS 方法
  public getLastSyncTS(): number {
    return Date.now();
  }

  // 添加 getLastServerTS 方法
  public getLastServerTS(): number {
    return Date.now();
  }

  // 添加 getRollbackBlockedCount 方法
  public getRollbackBlockedCount(): number {
    return 0;
  }

  // 添加 forceShutdown 方法
  public forceShutdown(): void {
    console.log('[WS_FORCE_SHUTDOWN] Forcing shutdown');
    this.stop();
  }

  // 添加 start 方法
  public start(): void {
    console.log('[WS_START] Starting service');
    this.init();
  }

  // 添加 isLeader 方法
  public isLeader(): boolean {
    return this.runtime.isLeader;
  }

  // 添加 getters for properties accessed in scripts
  public get isInitialized(): boolean {
    return this.runtime.state !== 'IDLE';
  }

  public get tabId(): string {
    return this.runtime.tabId;
  }

  public get wsDisabledBecauseAnotherTab(): boolean {
    return !this.runtime.isLeader;
  }
}

const getWhatsAppInboxService = (): WhatsAppInboxService => {
  return WhatsAppInboxService.getInstance();
};

const __svc = getWhatsAppInboxService();

// 暴露到window对象
if (typeof window !== 'undefined') {
  (window as any).__WhatsAppInboxServiceInstance = __svc;
  (window as any).whatsAppInboxService = __svc; // 添加这个以便测试页面可以访问
  (window as any).__JEV_RUNTIME__ = {
    WORKER_ORIGIN: "https://jev-rebuild-worker.bensonlove1986.workers.dev",
    API_BASE: "https://jev-rebuild-worker.bensonlove1986.workers.dev/api",
    WS_BASE: "wss://jev-rebuild-worker.bensonlove1986.workers.dev/stream"
  };
  console.log('[WS_SERVICE_EXPOSED] WhatsAppInboxService exposed to window');
}

// 初始化服务
console.log('[WS_INIT_START] Starting WhatsAppInboxService initialization');
__svc.init().then(() => {
  console.log('[WS_INIT_SUCCESS] WhatsAppInboxService initialized successfully');
}).catch(error => {
  console.error('[WS_INIT_ERROR] Failed to initialize WhatsAppInboxService:', error);
  console.error('[WS_INIT_ERROR_DETAILS]', error.message);
  console.error('[WS_INIT_ERROR_STACK]', error.stack);
});

export { getWhatsAppInboxService };
export default getWhatsAppInboxService();
