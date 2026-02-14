// CHAT_ROOM_DO - Message Authority Durable Object
// DO ID: room:{customer_id}
// 提供消息的唯一来源和持久化存储

import { normalizeCustomerId } from '../utils/customerId.js';
import { DATA_VERSION, withV } from '../utils/version.js';

/**
 * CHAT_ROOM_DO - 消息权威存储
 * 负责单个客户的消息存储、去重和查询
 */
export class CHAT_ROOM_DO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.messages = new Map(); // 内存缓存，message_id -> messageRecord
    this.processedMessageIds = new Set(); // 已处理的消息ID，用于去重
    this.customerId = null; // 从 DO ID 中提取
  }

  /**
   * 初始化方法，从 DO ID 中提取 customer_id
   */
  async initialize() {
    if (!this.customerId) {
      const doId = this.state.id.toString();
      const match = doId.match(/^v2:room:(.+)$/);
      if (match) {
        this.customerId = normalizeCustomerId(match[1]);
        console.log('[CHAT_ROOM_DO_INIT] Initialized for customer:', this.customerId);
      } else {
        // 兼容旧格式
        const oldMatch = doId.match(/^room:(.+)$/);
        if (oldMatch) {
          this.customerId = normalizeCustomerId(oldMatch[1]);
          console.log('[CHAT_ROOM_DO_INIT] Initialized for customer (old format):', this.customerId);
        } else {
          console.error('[CHAT_ROOM_DO_INIT_ERROR] Invalid DO ID format:', doId);
        }
      }
    }
  }

  /**
   * 从持久化存储加载消息到内存
   */
  async loadMessages() {
    await this.initialize();
    
    try {
      const storedMessages = await this.state.storage.get('messages');
      if (storedMessages) {
        const messagesArray = JSON.parse(storedMessages);
        messagesArray.forEach(msg => {
          this.messages.set(msg.message_id, msg);
          this.processedMessageIds.add(msg.message_id);
        });
        console.log('[CHAT_ROOM_DO_LOAD] Loaded', this.messages.size, 'messages for', this.customerId);
      }
    } catch (error) {
      console.error('[CHAT_ROOM_DO_LOAD_ERROR]', error.message);
    }
  }

  /**
   * 持久化消息到存储
   */
  async saveMessages() {
    try {
      const messagesArray = Array.from(this.messages.values());
      await this.state.storage.put('messages', JSON.stringify(messagesArray));
      console.log('[CHAT_ROOM_DO_SAVE] Saved', messagesArray.length, 'messages for', this.customerId);
    } catch (error) {
      console.error('[CHAT_ROOM_DO_SAVE_ERROR]', error.message);
    }
  }

  /**
   * 添加消息（幂等）
   * @param {Object} messageRecord 消息记录
   * @returns {Object} 操作结果
   */
  async appendMessage(messageRecord) {
    await this.initialize();
    await this.loadMessages();
    
    const messageId = messageRecord.message_id || messageRecord.id;
    
    if (!messageId) {
      console.error('[CHAT_ROOM_DO_APPEND_ERROR] Missing message_id');
      return {
        ok: false,
        error: 'MISSING_MESSAGE_ID'
      };
    }
    
    // 去重检查
    if (this.processedMessageIds.has(messageId)) {
      console.log('[DEDUP] hit mid=' + messageId);
      console.log('[CHAT_ROOM_DO_APPEND_DUPLICATE] Skipping duplicate message:', messageId);
      return {
        ok: true,
        duplicated: true,
        message_id: messageId
      };
    }
    
    console.log('[DEDUP] miss mid=' + messageId);
    
    // 标准化消息记录
    const normalizedMessage = this.normalizeMessageRecord(messageRecord);
    
    // 添加到存储
    this.messages.set(messageId, normalizedMessage);
    this.processedMessageIds.add(messageId);
    
    // 持久化
    await this.saveMessages();
    
    // 更新联系人索引
    await this.updateContactIndex(normalizedMessage);
    
    console.log('[CHAT_ROOM_DO_APPEND_SUCCESS] Appended message:', messageId, 'for customer:', this.customerId);
    
    return {
      ok: true,
      message_id: messageId,
      customer_id: this.customerId
    };
  }

  /**
   * 查询消息
   * @param {string} customerId 客户ID
   * @param {number} since 时间戳
   * @param {number} limit 限制
   * @param {number} cursor 游标
   * @returns {Object} 消息列表和游标
   */
  async fetchMessages(customerId, since = 0, limit = 50, cursor = 0) {
    await this.initialize();
    await this.loadMessages();
    
    // 验证客户ID
    if (customerId && customerId !== this.customerId) {
      console.error('[CHAT_ROOM_DO_FETCH_ERROR] Customer ID mismatch:', { requested: customerId, actual: this.customerId });
      return {
        messages: [],
        cursor: 0,
        hasMore: false
      };
    }
    
    // 过滤并排序消息
    let messagesArray = Array.from(this.messages.values())
      .filter(msg => msg.timestamp > since)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // 应用游标和限制
    const total = messagesArray.length;
    const slicedMessages = messagesArray.slice(cursor, cursor + limit);
    const nextCursor = cursor + slicedMessages.length;
    const hasMore = nextCursor < total;
    
    console.log('[CHAT_ROOM_DO_FETCH_SUCCESS] Fetched', slicedMessages.length, 'messages for', this.customerId, 'since:', since, 'cursor:', cursor);
    
    return {
      messages: slicedMessages,
      cursor: nextCursor,
      hasMore: hasMore,
      total: total
    };
  }

  /**
   * 标准化消息记录
   * @param {Object} messageRecord 原始消息记录
   * @returns {Object} 标准化后的消息记录
   */
  normalizeMessageRecord(messageRecord) {
    const messageId = messageRecord.message_id || messageRecord.id;
    const timestamp = messageRecord.timestamp || Date.now();
    
    return {
      message_id: messageId,
      id: messageId,
      customer_id: this.customerId,
      text: messageRecord.text || '',
      direction: messageRecord.direction || 'inbound',
      role: messageRecord.role || (messageRecord.direction === 'outbound' ? 'operator' : 'customer'),
      type: messageRecord.type || 'text',
      kind: messageRecord.kind || 'text',
      media_path: messageRecord.media_path || messageRecord.mediaPath || null,
      media_keys: messageRecord.media_keys || [],
      timestamp: timestamp,
      created_at: messageRecord.created_at || timestamp,
      updated_at: Date.now(),
      source: messageRecord.source || 'unknown',
      ...messageRecord // 保留其他字段
    };
  }

  /**
   * 更新联系人索引
   * @param {Object} messageRecord 消息记录
   */
  async updateContactIndex(messageRecord) {
    try {
      if (this.env.CONTACT_INDEX) {
        const contactIndexId = this.env.CONTACT_INDEX.idFromName('global');
        const contactIndexStub = this.env.CONTACT_INDEX.get(contactIndexId);
        
        const updateData = {
          customer_id: this.customerId,
          last_message_ts: messageRecord.timestamp,
          last_preview: messageRecord.text.substring(0, 50),
          unread_count: messageRecord.role === 'customer' ? 1 : 0,
          source: messageRecord.source
        };
        
        await contactIndexStub.fetch(new Request('http://localhost/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }));
        
        console.log('[CHAT_ROOM_DO_CONTACT_INDEX_UPDATED] Updated contact index for', this.customerId);
      }
    } catch (error) {
      console.error('[CHAT_ROOM_DO_CONTACT_INDEX_ERROR]', error.message);
    }
  }

  /**
   * HTTP 请求处理
   * @param {Request} request HTTP 请求
   * @returns {Response} HTTP 响应
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    console.log('[CHAT_ROOM_DO_FETCH] Received request:', { method, path });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // WebSocket 连接
    if (request.headers.get('Upgrade') === 'websocket') {
      console.log('[CHAT_ROOM_DO_WS_UPGRADE] Handling WebSocket upgrade request');
      
      try {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        
        this.handleWebSocketConnection(server);
        
        console.log('[CHAT_ROOM_DO_WS_UPGRADE_OK] WebSocket connection established');
        
        return new Response(null, {
            webSocket: client
          });
      } catch (error) {
        console.error('[CHAT_ROOM_DO_WS_ERROR]', error.message);
        return new Response('WebSocket connection error', {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // /append - 添加消息
    if (method === 'POST' && path === '/append') {
      try {
        const messageRecord = await request.json();
        const result = await this.appendMessage(messageRecord);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CHAT_ROOM_DO_APPEND_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /messages - 查询消息
    if (method === 'GET' && path === '/messages') {
      try {
        const customerId = url.searchParams.get('customer_id');
        const since = Number(url.searchParams.get('since') || 0);
        const limit = Number(url.searchParams.get('limit') || 50);
        const cursor = Number(url.searchParams.get('cursor') || 0);
        
        const result = await this.fetchMessages(customerId, since, limit, cursor);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CHAT_ROOM_DO_FETCH_ERROR]', error.message);
        return new Response(JSON.stringify({
          messages: [],
          cursor: 0,
          hasMore: false
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /info - 获取房间信息
    if (method === 'GET' && path === '/info') {
      await this.initialize();
      await this.loadMessages();
      
      return new Response(JSON.stringify({
        customer_id: this.customerId,
        message_count: this.messages.size,
        processed_message_ids_count: this.processedMessageIds.size
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // 404
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
  
  /**
   * 处理 WebSocket 连接
   * @param {WebSocket} webSocket WebSocket 连接对象
   */
  handleWebSocketConnection(webSocket) {
    try {
      webSocket.accept();
      console.log('[CHAT_ROOM_DO_WS_CLIENT_CONNECTED] WebSocket client connected');
      
      webSocket.send(JSON.stringify({ 
        type: 'connected', 
        message: 'WebSocket connected to CHAT_ROOM_DO successfully',
        timestamp: Date.now()
      }));
      
      webSocket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[CHAT_ROOM_DO_WS_CLIENT_MESSAGE] type=' + data.type);
          
          if (data.type === 'ping') {
            webSocket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('[CHAT_ROOM_DO_WS_PARSE_ERROR]', error);
          webSocket.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid JSON format',
            timestamp: Date.now()
          }));
        }
      });
      
      webSocket.addEventListener('close', (event) => {
        console.log('[CHAT_ROOM_DO_WS_CLIENT_CLOSED] code=' + event.code + ' reason=' + event.reason);
      });
      
      webSocket.addEventListener('error', (error) => {
        console.error('[CHAT_ROOM_DO_WS_CLIENT_ERROR] message=' + error.message);
      });
    } catch (error) {
      console.error('[CHAT_ROOM_DO_WS_CONNECTION_ERROR]', error);
      try {
        webSocket.close();
      } catch (closeError) {
        console.error('[CHAT_ROOM_DO_WS_CLOSE_ERROR]', closeError);
      }
    }
  }
}

/**
 * CHAT_ROOM_DO 工厂函数
 * @param {Object} env 环境变量
 * @returns {Function} DO 构造函数
 */
export function createChatRoomDO(env) {
  return class extends CHAT_ROOM_DO {
    constructor(state) {
      super(state, env);
    }
  };
}
