// DEAL_STATE_DO.js - 成交状态权威存储

import { normalizeCustomerId, generateChatRoomDoId } from '../utils/customerId.js';
import { DATA_VERSION, withV } from '../utils/version.js';

/**
 * DEAL_STATE_DO - 成交状态权威存储
 * 负责管理客户成交状态，从 CHAT_ROOM_DO 拉取消息进行分析
 */
export class DEAL_STATE_DO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.dealState = null; // 内存缓存的成交状态
    this.customerId = null; // 从 DO ID 中提取
  }

  /**
   * 初始化方法，从 DO ID 中提取 customer_id
   */
  async initialize() {
    if (!this.customerId) {
      const doId = this.state.id.toString();
      let match;
      
      // 支持 v2 格式: v2:deal:{customer_id}
      match = doId.match(/^v2:deal:(.+)$/);
      if (match) {
        this.customerId = normalizeCustomerId(match[1]);
        console.log('[DEAL_STATE_DO_INIT] Initialized for customer (v2):', this.customerId);
        return;
      }
      
      // 支持旧格式: deal:{customer_id}
      match = doId.match(/^deal:(.+)$/);
      if (match) {
        this.customerId = normalizeCustomerId(match[1]);
        console.log('[DEAL_STATE_DO_INIT] Initialized for customer (legacy):', this.customerId);
        return;
      }
      
      console.error('[DEAL_STATE_DO_INIT_ERROR] Invalid DO ID format:', doId);
    }
  }

  /**
   * 从持久化存储加载成交状态
   */
  async loadDealState() {
    await this.initialize();
    
    try {
      const storedState = await this.state.storage.get('deal_state');
      if (storedState) {
        this.dealState = JSON.parse(storedState);
        console.log('[DEAL_STATE_DO_LOAD] Loaded deal state for', this.customerId);
      } else {
        // 初始化默认成交状态
        this.dealState = this.initializeDefaultDealState();
        await this.saveDealState();
        console.log('[DEAL_STATE_DO_INITIALIZE] Initialized default deal state for', this.customerId);
      }
    } catch (error) {
      console.error('[DEAL_STATE_DO_LOAD_ERROR]', error.message);
      this.dealState = this.initializeDefaultDealState();
    }
  }

  /**
   * 持久化成交状态到存储
   */
  async saveDealState() {
    try {
      if (this.dealState) {
        this.dealState.updated_at = Date.now();
        await this.state.storage.put('deal_state', JSON.stringify(this.dealState));
        console.log('[DEAL_STATE_DO_SAVE] Saved deal state for', this.customerId);
      }
    } catch (error) {
      console.error('[DEAL_STATE_DO_SAVE_ERROR]', error.message);
    }
  }

  /**
   * 初始化默认成交状态
   * @returns {Object} 默认成交状态
   */
  initializeDefaultDealState() {
    return {
      customer_id: this.customerId,
      stage: 'lead', // lead, prospect, quote, negotiation, closed
      profile: {
        name: '',
        phone: this.customerId,
        email: '',
        company: '',
        preferences: {},
        created_at: Date.now()
      },
      intent: {
        level: 'low', // low, medium, high
        products: [],
        budget: null,
        timeline: null,
        notes: ''
      },
      quotes: [],
      tasks: [],
      eventlog: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
  }

  /**
   * 从 CHAT_ROOM_DO 拉取消息并分析
   * @param {string} messageId 消息 ID
   * @returns {Object} 操作结果
   */
  async ingestMessage(messageId) {
    await this.initialize();
    await this.loadDealState();
    
    if (!messageId) {
      console.error('[DEAL_STATE_DO_INGEST_ERROR] Missing messageId');
      return {
        ok: false,
        error: 'MISSING_MESSAGE_ID'
      };
    }

    try {
      // 从 CHAT_ROOM_DO 拉取消息
      const chatRoomDoId = this.env.CHAT_ROOM_DO.idFromName(generateChatRoomDoId(this.customerId));
      const chatRoomStub = this.env.CHAT_ROOM_DO.get(chatRoomDoId);
      
      const response = await chatRoomStub.fetch(`http://localhost/messages?customer_id=${this.customerId}`);
      const messagesData = await response.json();
      
      if (messagesData.messages) {
        const targetMessage = messagesData.messages.find(msg => msg.message_id === messageId);
        
        if (targetMessage) {
          // 分析消息并更新成交状态
          await this.analyzeMessage(targetMessage);
          await this.saveDealState();
          
          console.log('[DEAL_STATE_DO_INGEST_SUCCESS] Ingested message:', messageId, 'for', this.customerId);
          return {
            ok: true,
            message_id: messageId,
            customer_id: this.customerId,
            deal_state: this.dealState
          };
        } else {
          console.error('[DEAL_STATE_DO_INGEST_ERROR] Message not found:', messageId);
          return {
            ok: false,
            error: 'MESSAGE_NOT_FOUND'
          };
        }
      } else {
        console.error('[DEAL_STATE_DO_INGEST_ERROR] Failed to fetch messages');
        return {
          ok: false,
          error: 'FAILED_TO_FETCH_MESSAGES'
        };
      }
    } catch (error) {
      console.error('[DEAL_STATE_DO_INGEST_ERROR]', error.message);
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * 分析消息并更新成交状态
   * @param {Object} message 消息对象
   */
  async analyzeMessage(message) {
    // 记录事件日志
    this.addEventLog('message_ingested', {
      message_id: message.message_id,
      text: message.text,
      timestamp: message.timestamp,
      direction: message.direction
    });

    // 简单的消息分析逻辑
    // 实际项目中可能需要更复杂的 NLP 分析
    const text = message.text.toLowerCase();
    
    // 分析意向级别
    if (text.includes('interested') || text.includes('want') || text.includes('need')) {
      this.dealState.intent.level = 'medium';
    }
    if (text.includes('urgent') || text.includes('immediate') || text.includes('now')) {
      this.dealState.intent.level = 'high';
    }

    // 分析预算相关信息
    if (text.includes('budget') || text.includes('price') || text.includes('cost')) {
      this.dealState.intent.notes += `Budget mentioned: ${message.text}\n`;
    }

    // 分析产品相关信息
    if (text.includes('product') || text.includes('service') || text.includes('item')) {
      this.dealState.intent.products.push({
        name: text.match(/(product|service|item)\s+(.+?)(\.|\?|!|$)/)?.[2] || 'General',
        mentioned_at: message.timestamp
      });
    }

    // 分析成交阶段
    if (text.includes('quote') || text.includes('estimate')) {
      this.dealState.stage = 'quote';
    }
    if (text.includes('negotiate') || text.includes('discount')) {
      this.dealState.stage = 'negotiation';
    }
    if (text.includes('agree') || text.includes('confirm') || text.includes('order')) {
      this.dealState.stage = 'closed';
    }

    // 分析客户信息
    if (text.includes('name') || text.includes('email') || text.includes('company')) {
      this.updateCustomerProfile(text, message.timestamp);
    }
  }

  /**
   * 更新客户资料
   * @param {string} text 消息文本
   * @param {number} timestamp 时间戳
   */
  updateCustomerProfile(text, timestamp) {
    // 简单的正则匹配，实际项目中可能需要更复杂的解析
    const nameMatch = text.match(/name\s*[:=]\s*([^\.,\?!]+)/i);
    const emailMatch = text.match(/email\s*[:=]\s*([^\s,]+@[^\s,]+)/i);
    const companyMatch = text.match(/company\s*[:=]\s*([^\.,\?!]+)/i);

    if (nameMatch) {
      this.dealState.profile.name = nameMatch[1].trim();
    }
    if (emailMatch) {
      this.dealState.profile.email = emailMatch[1].trim();
    }
    if (companyMatch) {
      this.dealState.profile.company = companyMatch[1].trim();
    }

    this.dealState.profile.updated_at = timestamp;
  }

  /**
   * 添加报价
   * @param {Object} quote 报价信息
   * @returns {Object} 操作结果
   */
  async addQuote(quote) {
    await this.initialize();
    await this.loadDealState();

    const newQuote = {
      quote_id: `quote_${Date.now()}`,
      ...quote,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    this.dealState.quotes.push(newQuote);
    await this.saveDealState();

    this.addEventLog('quote_added', {
      quote_id: newQuote.quote_id,
      amount: newQuote.amount
    });

    console.log('[DEAL_STATE_DO_ADD_QUOTE_SUCCESS] Added quote for', this.customerId);
    return {
      ok: true,
      quote: newQuote
    };
  }

  /**
   * 添加任务
   * @param {Object} task 任务信息
   * @returns {Object} 操作结果
   */
  async addTask(task) {
    await this.initialize();
    await this.loadDealState();

    const newTask = {
      task_id: `task_${Date.now()}`,
      ...task,
      status: 'pending', // pending, in_progress, completed
      created_at: Date.now(),
      updated_at: Date.now()
    };

    this.dealState.tasks.push(newTask);
    await this.saveDealState();

    this.addEventLog('task_added', {
      task_id: newTask.task_id,
      title: newTask.title
    });

    console.log('[DEAL_STATE_DO_ADD_TASK_SUCCESS] Added task for', this.customerId);
    return {
      ok: true,
      task: newTask
    };
  }

  /**
   * 更新任务状态
   * @param {string} taskId 任务 ID
   * @param {string} status 新状态
   * @returns {Object} 操作结果
   */
  async updateTaskStatus(taskId, status) {
    await this.initialize();
    await this.loadDealState();

    const task = this.dealState.tasks.find(t => t.task_id === taskId);
    if (task) {
      task.status = status;
      task.updated_at = Date.now();
      await this.saveDealState();

      this.addEventLog('task_updated', {
        task_id: taskId,
        status: status
      });

      console.log('[DEAL_STATE_DO_UPDATE_TASK_SUCCESS] Updated task status for', this.customerId);
      return {
        ok: true,
        task: task
      };
    } else {
      console.error('[DEAL_STATE_DO_UPDATE_TASK_ERROR] Task not found:', taskId);
      return {
        ok: false,
        error: 'TASK_NOT_FOUND'
      };
    }
  }

  /**
   * 更新成交阶段
   * @param {string} stage 新阶段
   * @returns {Object} 操作结果
   */
  async updateStage(stage) {
    await this.initialize();
    await this.loadDealState();

    const oldStage = this.dealState.stage;
    this.dealState.stage = stage;
    await this.saveDealState();

    this.addEventLog('stage_updated', {
      old_stage: oldStage,
      new_stage: stage
    });

    console.log('[DEAL_STATE_DO_UPDATE_STAGE_SUCCESS] Updated stage for', this.customerId, 'from', oldStage, 'to', stage);
    return {
      ok: true,
      stage: stage
    };
  }

  /**
   * 添加事件日志
   * @param {string} eventType 事件类型
   * @param {Object} data 事件数据
   */
  addEventLog(eventType, data) {
    const event = {
      event_id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type: eventType,
      timestamp: Date.now(),
      data: data
    };

    this.dealState.eventlog.push(event);
    
    // 限制事件日志大小
    if (this.dealState.eventlog.length > 1000) {
      this.dealState.eventlog = this.dealState.eventlog.slice(-1000);
    }
  }

  /**
   * 获取成交状态
   * @returns {Object} 成交状态
   */
  async getDealState() {
    await this.initialize();
    await this.loadDealState();

    console.log('[DEAL_STATE_DO_GET] Retrieved deal state for', this.customerId);
    return this.dealState;
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
    
    console.log('[DEAL_STATE_DO_FETCH] Received request:', { method, path });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // /ingest - 摄取消息
    if (method === 'POST' && path === '/ingest') {
      try {
        const data = await request.json();
        const messageId = data.message_id;
        const result = await this.ingestMessage(messageId);
        
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DEAL_STATE_DO_INGEST_ERROR]', error.message);
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

    // /state - 获取成交状态
    if (method === 'GET' && path === '/state') {
      try {
        const dealState = await this.getDealState();
        
        return new Response(JSON.stringify({
          ok: true,
          deal_state: dealState
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DEAL_STATE_DO_GET_ERROR]', error.message);
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

    // /stage - 更新成交阶段
    if (method === 'PUT' && path === '/stage') {
      try {
        const data = await request.json();
        const stage = data.stage;
        const result = await this.updateStage(stage);
        
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DEAL_STATE_DO_UPDATE_STAGE_ERROR]', error.message);
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

    // /quote - 添加报价
    if (method === 'POST' && path === '/quote') {
      try {
        const quote = await request.json();
        const result = await this.addQuote(quote);
        
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DEAL_STATE_DO_ADD_QUOTE_ERROR]', error.message);
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

    // /task - 添加任务
    if (method === 'POST' && path === '/task') {
      try {
        const task = await request.json();
        const result = await this.addTask(task);
        
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DEAL_STATE_DO_ADD_TASK_ERROR]', error.message);
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

    // /task/:taskId/status - 更新任务状态
    if (method === 'PUT' && path.match(/^\/task\/.+\/status$/)) {
      try {
        const parts = path.split('/');
        const taskId = parts[2];
        const data = await request.json();
        const status = data.status;
        const result = await this.updateTaskStatus(taskId, status);
        
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DEAL_STATE_DO_UPDATE_TASK_ERROR]', error.message);
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

    // 404
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
}

/**
 * DEAL_STATE_DO 工厂函数
 * @param {Object} env 环境变量
 * @returns {Function} DO 构造函数
 */
export function createDealStateDO(env) {
  return class extends DEAL_STATE_DO {
    constructor(state) {
      super(state, env);
    }
  };
}
