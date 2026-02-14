// Import unified inbox keys generator
import { inboxKeys } from "../inbox/key";

// Import unified response utilities
import { ok, fail, notFound } from '../utils/response.js';

// Import version utilities
import { DATA_VERSION, withV } from '../utils/version.js';

// CORS headers definition
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// In-memory message store (local development)
const messageStore = new Map();

// Helper function to get messages for a customer
const getMessagesForCustomer = (customerId) => {
  const id = String(customerId || "");
  return messageStore.get(id) || [];
};

// Helper function: Extract customer_id from request with priority order
// Priority: request.query.customer_id → request.body.customer_id
// MCT: 严格要求 customer_id，不提供任何 fallback
const getCustomerIdFromRequest = async (request) => {
  try {
    const url = new URL(request.url);
    
    // Priority 1: request.query.customer_id
    const queryCustomerId = url.searchParams.get('customer_id');
    if (queryCustomerId) {
      return String(queryCustomerId);
    }
    
    // Only parse body for POST/PUT requests
    if (['POST', 'PUT'].includes(request.method)) {
      try {
        const body = await request.clone().json();
        
        // Priority 2: request.body.customer_id
        if (body.customer_id) {
          return String(body.customer_id);
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    return null;
  } catch (error) {
    console.error("[GET_CUSTOMER_ID_ERROR]", error.message);
    return null;
  }
};


export async function handleInbox(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle OPTIONS preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  console.log(`[INBOX_ROUTE_HIT] ${method} ${path}`);

  // /api/inbox/customers
  if (method === 'GET' && path === '/api/inbox/customers') {
    try {
      // 步骤1 - 后端真实性校验 - 入口日志
      console.log('[CUSTOMERS_ROUTE_SCAN_START]');
      console.log('[API_REQUEST_SOURCE] Origin:', request.headers.get('Origin'));
      console.log('[API_REQUEST_SOURCE] Cookie:', request.headers.get('Cookie'));
      console.log('[API_REQUEST_SOURCE] Authorization:', request.headers.get('Authorization'));
      console.log('[API_REQUEST_SOURCE] Request URL:', request.url);
      
      // 检查身份标识
      console.log('[IDENTITY_CHECK] Worker env:', { 
        worker_env: env.ENV || 'production',
        has_contact_index: !!env.CONTACT_INDEX,
        contact_index_type: typeof env.CONTACT_INDEX
      });
      
      let customers = [];
      
      // 从 CONTACT_INDEX KV 读取（权威存储源）
      if (env.CONTACT_INDEX) {
        try {
          // 导入版本工具
          const { DATA_VERSION, withV } = await import('../utils/version.js');
          
          // 扫描所有以 v2:contact: 开头的键
          const prefix = `${DATA_VERSION}:contact:`;
          console.log('[CONTACT_INDEX_SCAN_PREFIX]', prefix);
          
          // 列出所有匹配的键
          const keysResult = await env.CONTACT_INDEX.list({ prefix });
          console.log('[CONTACT_INDEX_KEYS_FOUND]', keysResult.keys.length);
          
          // 读取每个键对应的数据
          for (const key of keysResult.keys) {
            try {
              const contactData = await env.CONTACT_INDEX.get(key.name, { type: 'json' });
              if (contactData) {
                // 转换为前端期望的格式
                const customerEntry = {
                  customer_id: contactData.customer_id,
                  last_ts: contactData.timestamp,
                  preview: contactData.lastMessage,
                  last_message: contactData.lastMessage,
                  chat_id: contactData.chatId,
                  source: contactData.source,
                  updated_at: contactData.updated_at
                };
                customers.push(customerEntry);
              }
            } catch (readError) {
              console.error('[CONTACT_INDEX_READ_ERROR]', key.name, readError.message);
            }
          }
          
          console.log(`[CONTACT_INDEX_PULL_SUCCESS] Retrieved ${customers.length} contacts`);
        } catch (error) {
          console.error('[CONTACT_INDEX_PULL_ERROR]', error.message);
        }
      }
      
      console.log('[CUSTOMERS_RETURN_COUNT]', customers.length);
      console.log('[WORKER_INBOX_CUSTOMERS_RETURN]', { count: customers.length });
      
      // 返回客户列表 - 锁死返回结构，禁止 undefined
      return new Response(JSON.stringify({
        customers: customers,
        single_world: true
      }), {
        status: 200,
        headers: corsHeaders,
      });
      
    } catch (error) {
      console.error(`[INBOX][CUSTOMERS_ERROR] ${error.message}`);
      // 出错时返回空数组
      return new Response(JSON.stringify({
        customers: []
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }
  }

  // 辅助函数：扫描最近的消息（有限范围）
  async function scanRecentMessages(kv, customerId, sinceTs, windowMs = 5 * 60 * 1000) {
    // 计算时间窗口，只扫描最近5分钟的消息
    const timeWindowStart = Math.max(0, sinceTs - windowMs);
    const prefix = `inbox:msg:${customerId}`;
    
    // 列出所有消息键
    const listResult = await kv.list({ prefix });
    const messages = [];
    
    // 遍历所有消息键
    for (const key of listResult.keys) {
      // 从key中提取时间戳
      const keyParts = key.name.split(':');
      if (keyParts.length >= 4) {
        const msgTs = Number(keyParts[3]);
        // 只处理时间窗口内的消息
        if (msgTs > timeWindowStart) {
          const msgRaw = await kv.get(key.name);
          if (msgRaw) {
            const message = JSON.parse(msgRaw);
            messages.push(message);
          }
        }
      }
    }
    
    // 去重、排序
    const uniqueMessages = Array.from(new Map(messages.map(msg => [msg.id, msg])).values());
    uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    return uniqueMessages;
  }

  // /api/inbox/debug_dump - Debug endpoint to dump messages for a customer_id
  if (method === 'GET' && path === '/api/inbox/debug_dump') {
    try {
      const customer_id = url.searchParams.get('customer_id');
      
      if (!customer_id) {
        return new Response(JSON.stringify({ error: 'customer_id_required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      
      let messages = [];
      
      if (env.INBOX_KV) {
        try {
          // list KV keys with prefix message:{customer_id}:
          const prefix = `message:${customer_id}:`;
          const keysResult = await env.INBOX_KV.list({ prefix });
          
          for (const key of keysResult.keys) {
            const msgRaw = await env.INBOX_KV.get(key.name);
            if (msgRaw) {
              const message = JSON.parse(msgRaw);
              messages.push(message);
            }
          }
          
          // Sort messages by timestamp
          messages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Format debug output
          const debugMessages = messages.map(m => ({
            id: m.id,
            customer_id: m.customer_id,
            role: m.role,
            textPreview: m.text?.slice(0, 50),
            source: m.source,
            sender_id: m.sender_id,
            is_self: m.is_self,
            operator_id: m.operator_id,
            created_at: m.created_at
          }));
          
          // Log debug info
          console.log('[INBOX_DEBUG_DUMP]', {
            customer_id,
            count: messages.length,
            messages: debugMessages
          });
          
          return new Response(JSON.stringify({ messages: debugMessages }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (error) {
          console.error('[INBOX_DEBUG_DUMP_ERROR]', error.message);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      }
      
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('[INBOX_DEBUG_DUMP_FATAL]', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }
  
  // /api/inbox/pull - CORE MESSAGING DOMAIN | 系统底座，禁止任何模块介入
  if (method === 'GET' && path === '/api/inbox/pull') {
    try {
      // Get customer_id from query params
      const customer_id = url.searchParams.get('customer_id');
      
      // Handle cursor/limit parameters correctly
      const cursorParam = url.searchParams.get('cursor');
      const cursor = Number(cursorParam || 0);
      const limit = Number(url.searchParams.get('limit') || 50);
      const since = Number(url.searchParams.get('since') || 0);
      
      console.log(`[INBOX][PULL] customer_id=${customer_id} | cursor=${cursor} | limit=${limit} | since=${since}`);
      
      // If no customer_id provided, return empty messages immediately
      if (!customer_id) {
        return new Response(JSON.stringify({
          messages: [],
          cursor: 0,
          hasMore: false
        }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      
      let messages = [];
      let nextCursor = cursor;
      let hasMore = false;
      
      // 从 CHAT_ROOM_DO 读取（权威存储源）
      if (env.CHAT_ROOM_DO) {
        try {
          // 生成 CHAT_ROOM_DO ID (v2 格式)
          const chatRoomDoId = env.CHAT_ROOM_DO.idFromName(`${DATA_VERSION}:room:${customer_id}`);
          const chatRoomStub = env.CHAT_ROOM_DO.get(chatRoomDoId);
          
          // 从 CHAT_ROOM_DO 获取消息
          const response = await chatRoomStub.fetch(`http://localhost/messages?customer_id=${customer_id}&since=${since}&limit=${limit}&cursor=${cursor}`);
          const messagesData = await response.json();
          
          if (messagesData.messages) {
            messages = messagesData.messages;
            nextCursor = messagesData.cursor || 0;
            hasMore = messagesData.hasMore || false;
            
            console.log(`[CHAT_ROOM_DO_PULL_SUCCESS] Retrieved ${messages.length} messages for ${customer_id}`);
          } else {
            console.log(`[CHAT_ROOM_DO_PULL_NO_MESSAGES] No messages found for ${customer_id}`);
          }
        } catch (error) {
          console.error('[CHAT_ROOM_DO_PULL_ERROR]', error.message);
        }
      }
      
      // 返回完整的消息结构，包括客户名称和所有图片URL
      const minimalMessages = messages.map(msg => {
        // 1. 识别 WhatsApp 消息
        const isWhatsApp = (
          msg.platform === 'whatsapp' ||
          msg.source === 'whatsapp' ||
          msg.channel === 'whatsapp' ||
          msg.channel_id === 19 ||
          msg.messageType === 19 ||
          msg.type === 'WhatsApp' ||
          msg.sender === 'WhatsApp' ||
          (msg.messageId && msg.message === ' ')
        );
        
        // 2. 强制补齐 WhatsApp 消息的必需字段
        if (isWhatsApp) {
          msg.channel_id = 19;
          msg.role = msg.is_self ? 'operator' : 'customer';
          msg.type = 'whatsapp';
          msg.messageType = 19;
        }
        
        // 3. 构造 UI attachments 数组
        let attachments = msg.attachments || [];
        
        // 如果是 WhatsApp 消息且没有 attachments，检查其他字段
        if (isWhatsApp && !attachments.length) {
          // 检查上游消息是否包含媒体信息
          const hasMedia = (
            msg.media_url ||
            msg.image_url ||
            msg.imageUrl ||
            msg.url ||
            (msg.message && msg.message.media) ||
            (msg.message && msg.message.attachments)
          );
          
          if (hasMedia) {
            attachments = [{
              type: "image",
              source: "whatsapp",
              messageId: msg.message_id || msg.id,
              preview: null
            }];
          }
        }
        
        // 4. 构造最终消息对象
        const finalMessage = {
          message_id: msg.message_id || msg.id,
          customer_id: msg.customer_id || msg.customerId,
          text: msg.text || (msg.content?.text || msg.media?.ocr_text || ''),
          // WhatsApp 必需字段
          channel_id: msg.channel_id || (isWhatsApp ? 19 : null),
          role: msg.role || msg.sender_role || (msg.direction === 'outbound' ? 'operator' : 'customer'),
          type: msg.type || msg.channel || msg.media?.kind || (isWhatsApp ? 'whatsapp' : null),
          messageType: msg.messageType || (isWhatsApp ? 19 : null),
          // 图片相关字段
          image_url: msg.image_url || msg.imageUrl || msg.media?.image_url,
          media_url: msg.media_url || (msg.content?.media?.[0]?.url || '') || msg.media?.image_original_url,
          url: msg.url || msg.media?.image_url,
          // 方向和时间戳
          direction: msg.direction || (msg.is_self ? 'out' : 'in'),
          timestamp: msg.timestamp || Date.now(),
          // 客户名称信息
          stable_name: msg.stable_name,
          display_name: msg.display_name,
          // 附件信息
          attachments: attachments,
          // 保留原始 ext 字段
          ext: msg.ext
        };
        
        // 5. 为 Twilio 媒体消息注入 media_url
        if (finalMessage.ext === "[MEDIA]") {
          const messageId = finalMessage.message_id || finalMessage.id;
          if (messageId) {
            finalMessage.media_url = `/api/media/${messageId}`;
            console.log('[TWILIO_MEDIA_URL_INJECTED]', { messageId, media_url: finalMessage.media_url });
          }
        }
        
        // 6. 为 Twilio 媒体消息添加 mediaSid 和 media_path
        if (msg.source === "twilio" && (msg.hasMedia || msg.media || msg.media_url || msg.image_url)) {
          // 设置 mediaSid
          finalMessage.mediaSid = msg.twilio_media_sid || msg.media_id || msg.mediaSid;
          
          // 如果有 mediaSid，设置 media_path
          if (finalMessage.mediaSid) {
            finalMessage.media_path = `/api/media/r2/twilio/${finalMessage.mediaSid}.jpg`;
            console.log('[TWILIO_MEDIA_PATH_INJECTED]', { 
              messageId: finalMessage.message_id, 
              mediaSid: finalMessage.mediaSid, 
              media_path: finalMessage.media_path 
            });
          }
          
          // 添加媒体类型信息
          finalMessage.mediaType = msg.mediaType || msg.media_type || "image/jpeg";
          finalMessage.mimeType = msg.mimeType || msg.mime || "image/jpeg";
          finalMessage.isMedia = true;
        }
        
        // 7. 为历史 Twilio 媒体消息补充媒体类型信息
        if (finalMessage.mediaSid || (finalMessage.id && finalMessage.id.startsWith("MM"))) {
          if (!finalMessage.mediaType) {
            finalMessage.mediaType = "image/jpeg";
            console.log('[TWILIO_MEDIA_TYPE_SUPPLEMENTED]', { 
              messageId: finalMessage.message_id, 
              mediaType: finalMessage.mediaType 
            });
          }
          if (!finalMessage.mimeType) {
            finalMessage.mimeType = "image/jpeg";
          }
          if (finalMessage.isMedia === undefined) {
            finalMessage.isMedia = true;
          }
        }
        
        // 8. 为所有以 "MM" 开头的消息强制设置媒体类型信息
        if (finalMessage.id && finalMessage.id.startsWith("MM")) {
          finalMessage.isMedia = true;
          finalMessage.mediaType = "image/jpeg";
          finalMessage.mimeType = "image/jpeg";
          console.log('[TWILIO_MM_MESSAGE_MEDIA_INFO_SET]', { 
            messageId: finalMessage.id, 
            isMedia: finalMessage.isMedia, 
            mediaType: finalMessage.mediaType, 
            mimeType: finalMessage.mimeType 
          });
        }
        
        // 5. 添加调试日志
        if (isWhatsApp) {
          console.log(`[INBOX_NORMALIZE_WHATSAPP] messageId=${finalMessage.message_id}, channel_id=${finalMessage.channel_id}, hasAttachments=${!!attachments.length}`);
        }
        
        return finalMessage;
      });
      
      // 6. 过滤掉无效消息
      const validMessages = minimalMessages.filter(msg => {
        // WhatsApp 消息特殊处理：允许所有消息（文本和图片），包括operator消息
        if (msg.channel_id === 19 || msg.type === 'whatsapp') {
          // 确保所有WhatsApp消息都能通过，包括operator消息
          return true;
        }
        // 非 WhatsApp 消息：至少有文本或图片URL或附件
        return (
          (msg.text && msg.text.trim().length > 0) ||
          msg.image_url ||
          msg.media_url ||
          (msg.attachments && msg.attachments.length > 0)
        );
      });
      
      // 7. 计算unread状态：只基于最近一条customer消息
      let isUnread = false;
      if (validMessages.length > 0) {
        // 按时间戳排序，获取最新消息
        const sortedMessages = [...validMessages].sort((a, b) => b.timestamp - a.timestamp);
        const latestMessage = sortedMessages[0];
        // 只有当最新消息是customer消息时，才标记为未读
        isUnread = latestMessage.role === 'customer';
      }
      
      // 添加返回日志，验证消息是否正确返回
      validMessages.forEach(msg => {
        console.log('[INBOX_MESSAGE_RETURNED]', {
          customerId: msg.customer_id,
          messageId: msg.message_id || msg.id,
          role: msg.role,
          channel_id: msg.channel_id,
          isUnread: msg.role === 'customer' // 每个消息的unread状态
        });
      });
      
      // 日志：打印最新消息的unread状态
      if (validMessages.length > 0) {
        const sortedMessages = [...validMessages].sort((a, b) => b.timestamp - a.timestamp);
        const latestMessage = sortedMessages[0];
        console.log('[INBOX_LATEST_MESSAGE_UNREAD]', {
          customerId: latestMessage.customer_id,
          latestMessageRole: latestMessage.role,
          isUnread: isUnread
        });
      }
      
      // 🔴 添加 operator 图片消息专用日志
      const operatorImageMessages = validMessages.filter(msg => 
        msg.role === 'operator' && 
        msg.channel_id === 19 && 
        !!msg.attachments?.length
      );
      
      if (operatorImageMessages.length > 0) {
        operatorImageMessages.forEach(msg => {
          console.log(`[INBOX_OPERATOR_IMAGE_RETURNED] messageId=${msg.id}, customerId=${msg.customer_id}`);
        });
      }
      
      // 返回响应，确保带有CORS头
      return new Response(JSON.stringify({
        messages: validMessages,
        cursor: nextCursor,
        hasMore: hasMore
      }), {
        status: 200,
        headers: corsHeaders,
      });
      
    } catch (err) {
      console.error('[INBOX_PULL_ERROR]', err);
      // 返回错误响应，确保带有CORS头
      return new Response(JSON.stringify({
        messages: [],
        cursor: 0,
        hasMore: false
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }
  }

  // 内部迁移路由：修复客户display_name
  if (method === 'POST' && path === '/api/internal/migrate/customers/display_name') {
    try {
      console.log('[INTERNAL_MIGRATE_START]');
      
      let customers = [];
      let customerIds = [];
      let usedIndex = false;
      
      // 尝试从 INBOX_KV 读取所有客户
      if (env.INBOX_KV) {
        // 策略1：优先使用强一致索引
        try {
          const indexRaw = await env.INBOX_KV.get('customers:index');
          if (indexRaw) {
            customerIds = JSON.parse(indexRaw);
            usedIndex = true;
          }
        } catch (indexError) {
          console.error(`[INDEX_READ_ERROR] ${indexError.message}`);
        }
        
        // 策略2：如果索引不存在，回退到KV list
        if (!usedIndex) {
          const listResult = await env.INBOX_KV.list({
            prefix: 'customer:',
            limit: 1000
          });
          customerIds = listResult.keys.map(key => {
            const parts = key.name.split(':');
            return parts[1];
          });
        }
        
        // 批量读取客户数据
        for (const customerId of customerIds) {
          try {
            const customerKey = `customer:${customerId}`;
            const customerRaw = await env.INBOX_KV.get(customerKey);
            if (customerRaw) {
              const customer = JSON.parse(customerRaw);
              customers.push(customer);
            }
          } catch (parseError) {
            console.error(`[CUSTOMER_PARSE_ERROR] id=${customerId} | ${parseError.message}`);
          }
        }
      }
      
      console.log(`[MIGRATE_CUSTOMERS_FOUND] ${customers.length} customers`);
      
      let fixed = 0;
      
      // 修复客户display_name
      for (const c of customers) {
        const resolved = 
          c.display_name && c.display_name !== "null"
            ? c.display_name
            : c.customer_name || c.phone || c.customer_id;
        
        if (c.display_name !== resolved) {
          c.display_name = resolved;
          // 保存客户数据到KV
          if (env.INBOX_KV) {
            const customerKey = `customer:${c.customer_id}`;
            await env.INBOX_KV.put(customerKey, JSON.stringify(c));
          }
          fixed++;
        }
      }
      
      // 重建客户索引
      if (env.INBOX_KV && customerIds.length > 0) {
        await env.INBOX_KV.put('customers:index', JSON.stringify(customerIds));
      }
      
      console.log(`[MIGRATE_COMPLETED] Fixed ${fixed} customers`);
      
      return ok(request, {
        fixed
      });
    } catch (error) {
      console.error(`[INTERNAL_MIGRATE_ERROR] ${error.message}`);
      return fail(request, error.message);
    }
  }
  
  // 重建 customers:index 路由
  if (method === 'POST' && path === '/api/internal/rebuild/customers/index') {
    try {
      console.log('[REBUILD_INDEX_START]');
      
      let customers = [];
      
      // 从 KV 读取所有 customer:* 键
      if (env.INBOX_KV) {
        const listResult = await env.INBOX_KV.list({
          prefix: 'customer:',
          limit: 1000
        });
        
        console.log(`[CUSTOMERS_LIST_KEYS] found ${listResult.keys.length} customer keys`);
        
        // 逐条读取客户数据
        for (const key of listResult.keys) {
          try {
            const customerRaw = await env.INBOX_KV.get(key.name);
            if (customerRaw) {
              const customer = JSON.parse(customerRaw);
              customers.push(customer);
            }
          } catch (parseError) {
            console.error(`[CUSTOMER_PARSE_ERROR] key=${key.name} | ${parseError.message}`);
          }
        }
        
        // 按 last_message_at 或 created_at 排序
        const sortedCustomers = [...customers].sort((a, b) => {
          // 优先按 last_message_at 降序排序
          if (a.last_message_at !== b.last_message_at) {
            return (b.last_message_at || 0) - (a.last_message_at || 0);
          }
          // 次级排序：按 created_at 降序
          if (a.created_at !== b.created_at) {
            return (b.created_at || 0) - (a.created_at || 0);
          }
          // 最后按 customer_id 升序
          return a.customer_id.localeCompare(b.customer_id);
        });
        
        // 提取 customer_id
        const customerIds = sortedCustomers.map(customer => customer.customer_id);
        
        // 写入 customers:index
        if (customerIds.length > 0) {
          await env.INBOX_KV.put('customers:index', JSON.stringify(customerIds));
          console.log(`[CUSTOMERS_INDEX_REBUILT] ${customerIds.length} customer IDs written to index`);
        } else {
          console.log('[CUSTOMERS_INDEX_REBUILT] No customer IDs to write to index');
        }
        
        return ok(request, {
        message: '[CUSTOMERS_INDEX_REBUILT] Index rebuilt successfully',
        count: customerIds.length
      });
      } else {
        console.error('[REBUILD_INDEX_ERROR] INBOX_KV binding is undefined');
        return fail(request, 'INBOX_KV binding is undefined', 500);
      }
    } catch (error) {
      console.error(`[REBUILD_INDEX_ERROR] ${error.message}`);
      return fail(request, error.message, 500);
    }
  }
  
  // 标记消息为已读的 endpoint
  if (method === 'POST' && path === '/api/inbox/mark_read') {
    try {
      const body = await request.json();
      const { customer_id } = body;
      
      if (!customer_id) {
        return new Response(JSON.stringify({ error: 'customer_id_required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      
      if (env.INBOX_KV) {
        const customerKey = `customer:${customer_id}`;
        const customerRaw = await env.INBOX_KV.get(customerKey);
        
        if (customerRaw) {
          const customer = JSON.parse(customerRaw);
          
          // 重置未读数为0
          customer.unread_count = 0;
          customer.updated_at = Date.now();
          
          await env.INBOX_KV.put(customerKey, JSON.stringify(customer));
          console.log(`[MESSAGES_MARKED_READ] customer_id=${customer_id}`);
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders,
          });
        }
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error(`[MARK_READ_ERROR] ${error.message}`);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }
  
  // GET /api/media/* - 媒体文件获取接口
  if (method === 'GET' && path.startsWith('/api/media/')) {
    try {
      console.log('[MEDIA_REQUEST_START]', { method, path, host: request.headers.get('Host') });
      
      // 从 R2 读取媒体文件
      if (env.JEV_MEDIA_BUCKET) {
        try {
          // 尝试多种可能的 R2 key 格式
          const possibleKeys = [
            // 格式1: 完整路径（去掉 /api/media/ 前缀）
            path.replace('/api/media/', ''),
            // 格式2: 只使用文件名
            path.split('/').pop(),
            // 格式3: 去掉文件扩展名
            path.split('/').pop()?.replace('.jpg', ''),
            // 格式4: 直接使用 mediaId（不带路径前缀）
            path.split('/').pop()?.split('.')[0]
          ].filter(Boolean);
          
          console.log('[MEDIA_POSSIBLE_KEYS]', possibleKeys);
          
          let foundObj = null;
          let foundKey = null;
          
          // 尝试所有可能的 key 格式
          for (const key of possibleKeys) {
            console.log('[MEDIA_TRY_KEY]', { key });
            const obj = await env.JEV_MEDIA_BUCKET.get(key);
            if (obj) {
              foundObj = obj;
              foundKey = key;
              console.log('[MEDIA_FOUND]', { key });
              break;
            }
          }
          
          if (foundObj) {
            console.log('[MEDIA_RETURN_SUCCESS]', { key: foundKey });
            return new Response(foundObj.body, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000',
              ...corsHeaders
            }
          });
          } else {
            console.error('[MEDIA_NOT_FOUND_ALL_KEYS]', { triedKeys: possibleKeys });
            return new Response('Not Found', {
              status: 404,
              headers: corsHeaders
            });
          }
        } catch (r2Error) {
          console.error('[R2_ERROR]', { message: r2Error.message, stack: r2Error.stack });
          return new Response('Internal server error', {
            status: 500,
            headers: corsHeaders
          });
        }
      } else {
        console.error('[R2_BUCKET_MISSING] JEV_MEDIA_BUCKET not configured');
        return new Response('Internal server error', {
          status: 500,
          headers: corsHeaders
        });
      }
    } catch (error) {
      console.error('[MEDIA_ERROR]', { message: error.message, stack: error.stack });
      return new Response('Internal server error', {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  
  // DELETE /api/inbox/contact - 删除联系人（仅 v2 CONTACT_INDEX）
  if (method === 'DELETE' && path === '/api/inbox/contact') {
    try {
      console.log('[CONTACT_DELETE_ROUTE_HIT]');
      
      // 校验 customer_id 参数存在
      const customer_id = url.searchParams.get('customer_id');
      if (!customer_id) {
        return new Response(JSON.stringify({ error: 'Missing customer_id parameter' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      
      console.log('[CONTACT_DELETE_PARAM]', customer_id);
      
      // 检查 CONTACT_INDEX KV 绑定
      if (!env.CONTACT_INDEX) {
        console.error('[CONTACT_INDEX_BINDING_MISSING] env.CONTACT_INDEX is not available');
        return new Response(JSON.stringify({ error: 'CONTACT_INDEX_BINDING_MISSING' }), {
          status: 500,
          headers: corsHeaders,
        });
      }
      
      // 导入版本工具和规范化函数
      const { DATA_VERSION, withV } = await import('../utils/version.js');
      const { normalizeCustomerId } = await import('../utils/customerId.js');
      
      // 规范化客户 ID
      const normalizedCustomerId = normalizeCustomerId(customer_id);
      console.log('[CANONICAL_ID_USED]', { raw: customer_id, normalized: normalizedCustomerId });
      
      // 生成 v2:contact:... 键
      const key = withV(`contact:${normalizedCustomerId}`);
      console.log('[CONTACT_DELETE]', key);
      
      // 删除 CONTACT_INDEX 中的 key
      await env.CONTACT_INDEX.delete(key);
      console.log('[CONTACT_DELETE_SUCCESS]', key);
      
      // 返回成功响应
      return new Response(JSON.stringify({ 
        ok: true, 
        customer_id: normalizedCustomerId 
      }), {
        status: 200,
        headers: corsHeaders,
      });
      
    } catch (error) {
      console.error('[CONTACT_DELETE_ERROR]', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: corsHeaders,
  });
};