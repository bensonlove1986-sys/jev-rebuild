// Mock Durable Object classes to satisfy existing bindings (required for deployment)
export class DaojieStreamDO {
  async fetch(request) {
    return new Response('DO disabled', {
      status: 410,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export class ChatHistoryDO {
  async fetch(request) {
    return new Response('DO disabled', {
      status: 410,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// UI Source Hard Lock - Prevent UI chaos by enforcing single source
const UI_SOURCE_DIR = "web-runtime"; // Read-only constant

// 路由注册转储日志
console.log('[ROUTE_REGISTRY_DUMP]', ['/api/inbox/customers', '/api/inbox/pull', '/api/inbound/daojie']);



// ===== SHA1 哈希生成函数 =====
async function generateMessageId(customerId, timestamp, content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${customerId}${timestamp}${content}`);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== HTTP EVENT ENGINE =====
// Helper function: Generate canonical customer ID (lowercase, trimmed)
const canonicalCustomerId = (rawId) => {
  return String(rawId || "")
    .trim()
    .toLowerCase();
};

// In-memory message store
const messageStore = new Map();

// Helper function to get messages for a customer
const getMessagesForCustomer = (customerId) => {
  const canonId = canonicalCustomerId(customerId);
  return messageStore.get(canonId) || [];
};

// Helper function to add message to store
const addMessageToStore = (customerId, message) => {
  const canonId = canonicalCustomerId(customerId);
  // Update message with canonical customer ID
  const updatedMessage = {
    ...message,
    customer_id: canonId
  };
  const messages = getMessagesForCustomer(canonId);
  messages.push(updatedMessage);
  messageStore.set(canonId, messages);
  return messages;
};

// 常量定义
const IS_DEV = false; // 生产模式标记
const APP_MODE = IS_DEV ? 'DEV' : 'PROD';

// 外部服务配置
const PIT_BASE_URL = 'https://services.leadconnectorhq.com';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// json helper function with CORS headers
const json = (body, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};

// 发送 Daojie WhatsApp 回复
const sendDaojieWhatsAppReply = async (env, payload) => {
  try {
    // 验证 PIT_API_KEY 是否存在
    if (!env.PIT_API_KEY) {
      throw new Error('PIT_API_KEY_NOT_CONFIGURED');
    }
    
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 构建 PIT API 请求
    const response = await fetch(`${PIT_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.PIT_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify({
        locationId: payload.locationId,
        contactId: payload.contactId,
        message: payload.message,
        type: 'message',
        direction: 'outbound',
        source: 'manual',
        via: 'whatsapp'
      })
    });
    
    // 记录完整请求日志
    console.log(`[PIT_API_REQUEST] traceId=${traceId} contactId=${payload.contactId} locationId=${payload.locationId}`);
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[PIT_API_ERROR] traceId=${traceId} status=${response.status} error=${JSON.stringify(errorBody)}`);
      return {
        success: false,
        error: errorBody,
        status: response.status,
        traceId
      };
    }
    
    const result = await response.json();
    console.log(`[PIT_API_SUCCESS] traceId=${traceId} conversationId=${result.conversationId} messageId=${result.messageId}`);
    
    return {
      success: true,
      data: {
        conversationId: result.conversationId,
        messageId: result.messageId,
        traceId
      },
      status: response.status
    };
  } catch (error) {
    console.error(`[PIT_API_FATAL_ERROR] ${error.message}`);
    return {
      success: false,
      error: { message: error.message },
      status: 500,
      traceId: `trace_${Date.now()}_error`
    };
  }
};

// 真实 DeepSeek 翻译函数
const translateWithDeepSeek = async (env, text, attempt = 1) => {
  try {
    // 验证 DEEPSEEK_API_KEY 是否存在
    if (!env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY_NOT_CONFIGURED');
    }
    
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_attempt${attempt}`;
    
    // 构建 DeepSeek Chat Completions 请求
    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            "role": "system",
            "content": "你是专业翻译引擎。把用户输入翻译成简体中文。\n要求：\n- 只输出翻译后的中文，不要解释，不要加标题，不要加引号。\n- 遇到拼写错误、口语、省略句：根据语境合理补全，使中文通顺。\n- 保留专有名词/缩写（如 PVG、RMB、PCS）不翻译或按常用译法处理。"
          },
          {
            "role": "user",
            "content": text
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
        timeout: 10000 // 10秒超时
      })
    });
    
    console.log(`[DEEPSEEK_REQUEST] attempt=${attempt} traceId=${traceId} text=${text.slice(0, 50)}...`);
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[DEEPSEEK_ERROR] attempt=${attempt} traceId=${traceId} status=${response.status} error=${JSON.stringify(errorBody)}`);
      
      // 重试逻辑：最多2次，指数退避
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000; // 1秒、2秒
        console.log(`[DEEPSEEK_RETRY] attempt=${attempt} retrying after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await translateWithDeepSeek(env, text, attempt + 1);
      }
      
      return {
        success: false,
        error: errorBody,
        status: response.status,
        traceId
      };
    }
    
    const result = await response.json();
    const translatedText = result.choices[0].message.content.trim();
    
    console.log(`[DEEPSEEK_SUCCESS] attempt=${attempt} traceId=${traceId} translated=${translatedText.slice(0, 50)}...`);
    
    return {
      success: true,
      data: {
        translated_text: translatedText,
        traceId
      },
      status: response.status
    };
  } catch (error) {
    console.error(`[DEEPSEEK_FATAL_ERROR] attempt=${attempt} ${error.message}`);
    
    // 重试逻辑：最多2次，指数退避
    if (attempt < 2) {
      const delay = Math.pow(2, attempt) * 1000; // 1秒、2秒
      console.log(`[DEEPSEEK_RETRY_ON_EXCEPTION] attempt=${attempt} retrying after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await translateWithDeepSeek(env, text, attempt + 1);
    }
    
    return {
      success: false,
      error: { message: error.message },
      status: 500,
      traceId: `trace_${Date.now()}_error_attempt${attempt}`
    };
  }
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const upgrade = request.headers.get('Upgrade');
      
      console.log('[ROUTER_PATHNAME]', path);
      console.log('[FETCH_ENTRY]', request.method, path, `[${APP_MODE}]`);

      // ===== /api/health - Always 200 JSON =====
      if (path === '/api/health') {
        return json({ ok: true });
      }
      
      // ===== /api/status - Always 200 JSON =====
      if (path === '/api/status') {
        return json({
          ok: true, 
          status: 'ok', 
          engine: 'local',
          mode: APP_MODE,
          dev_mode: IS_DEV,
          note: IS_DEV ? 'Local mode - no real Daojie webhook will be received' : 'Production mode - Daojie webhook active'
        });
      }

      // ===== ABSOLUTE HARD STOP FOR DAOJIE WS =====
      if (path === '/ws/daojie' || upgrade === 'websocket') {
        return new Response('WS disabled', {
          status: 410,
          headers: {
            'Connection': 'close',
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      // ===== END HARD STOP =====

      // ===== ROOT PATH HANDLING - PRIORITY #1 =====
      if (path === '/' || path === '') {
        // Only allow UI return logic, no API/inbox/status branches
        console.log('[ROOT_PATH] Handling root path, only UI logic allowed');
        
        // Generate a build ID for version fingerprinting
        const UI_BUILD_ID = Date.now().toString();
        
        // Simulate reading from web-runtime/index.html
        const uiContent = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/jev-logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="ui-build-id" content="${UI_BUILD_ID}">
    <title>JEV Workspace</title>
    <script type="module" crossorigin src="/assets/index-DfS6ulY8.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-DXiG4MDz.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
        
        // Return UI with proper headers
        return new Response(uiContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-UI-Build-Id': UI_BUILD_ID,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }

      // ===== CORS PREFLIGHT =====
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      // ===== INBOUND DAOJIE WEBHOOK =====
      if (request.method === 'POST' && path === '/api/inbound/daojie') {
        try {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const KV_BINDING_NAME = 'MESSAGES_KV';
          
          console.log(`[INBOUND][START] traceId=${traceId}`);
          
          // 1. 读取 raw body
          const rawText = await request.text();
          console.log(`[INBOUND][BODY_READ] traceId=${traceId} | rawText=${rawText}`);
          
          // 2. 解析 body
          let body = {};
          try {
            body = JSON.parse(rawText);
          } catch (parseError) {
            console.error(`[INBOUND][PARSE_ERROR] traceId=${traceId} | ${parseError.message}`);
            return json(
              { ok: false, error: 'PARSE_ERROR' },
              400
            );
          }
          
          // 3. 详细记录所有可能的字段，用于调试
          console.log(`[INBOUND][RESOLVED_JSON] traceId=${traceId} | fullBody=${JSON.stringify(body)}`);
          
          // 4. 提取必要字段
          // 提取消息内容（优先使用常见的消息字段名）
          const text = body.text || body.body || body.message || body.message_body || body.message_text || '';
          
          // 提取客户ID（优先使用稳定的contact相关字段）
          // 尝试多种可能的字段名，确保获取到稳定的customer_id
          const rawId = body.customer_id || body.customerId || body.contact_id || body.contactId || body.contact?.id || body.userId || body.user_id || body.sender_id || body.senderId || body.conversation_id || body.conversationId || 'unknown';
          
          // 生成 canonical customer_id（统一大小写和格式）
          const customerId = canonicalCustomerId(rawId);
          
          // 提取客户名称
          const displayName = body.customer_name || body.customerName || body.contact_name || body.contactName || body.contact?.displayName || body.name || 'Unknown';
          
          // 提取手机号（尝试多种可能的字段名）
          const phone = body.phone || body.contact_phone || body.contactPhone || body.mobile || body.mobile_phone || body.phone_number || body.contact_mobile || body.contact?.phone || body.whatsapp || '';
          
          // 生成消息 ID
          const messageId = body.message_id || body.messageId || crypto.randomUUID();
          const ts = Date.now();
          
          // 打印 customer_id 处理日志，用于调试
          console.log(`[INBOUND_ID_RAW] payload.customer_id = ${rawId}`);
          console.log(`[INBOUND_ID_CANONICAL] canonicalCustomerId = ${customerId}`);
          console.log(`[INBOUND_ID_WRITE_KEY] inbox:customer:${customerId}`);
          
          // 构造消息对象
          const message = {
            id: messageId,
            customer_id: customerId,
            text: text,
            type: 'inbound',
            source: 'daojie',
            timestamp: ts,
            stored: true,
            phone: phone // 保存手机号到消息对象
          };
          
          // Store in KV
          let stored = false;
          if (env[KV_BINDING_NAME]) {
            try {
              // 所有 KV key 统一使用 canonical customer_id
              const msgKey = `inbox:msg:${customerId}:${ts}:${messageId}`;
              const customerKey = `inbox:customer:${customerId}`;
              const customerIndexKey = `inbox:customers:index:${customerId}`;
              const messageIndexKey = `inbox:index:${customerId}`;
              
              // Step 1: Write message to KV
              await env[KV_BINDING_NAME].put(msgKey, JSON.stringify(message));
              stored = true;
              console.log(`[KV_MESSAGE_WRITE_OK] customer_id=${customerId} message_id=${messageId}`);
              
              // Step 2: 强制 UPSERT 客户实体（总是更新 display_name、phone 和 last_message_at）
              // 先读取现有实体（如果有）
              const existingCustomerRaw = await env[KV_BINDING_NAME].get(customerKey);
              let customerData = {};
              
              if (existingCustomerRaw) {
                try {
                  customerData = JSON.parse(existingCustomerRaw);
                } catch (parseError) {
                  console.error(`[CUSTOMER_PARSE_ERROR] customer_id=${customerId} | ${parseError.message}`);
                  customerData = {};
                }
              }
              
              // 强制更新客户实体的所有字段
              const updatedCustomer = {
                // 保留其他现有字段（如果有）
                ...customerData,
                // 覆盖更新的字段
                customer_id: customerId,
                display_name: displayName || 'Daojie User', // 总是使用最新的 display_name
                status: customerData.status || 'active',
                last_message_at: ts, // 总是更新时间戳
                phone: phone || customerData.phone || '' // 优先使用新手机号
              };
              
              // 写入更新后的客户实体
              await env[KV_BINDING_NAME].put(customerKey, JSON.stringify(updatedCustomer));
              console.log(`[KV_CUSTOMER_ENTITY_UPSERT_OK] customer_id=${customerId} display_name=${updatedCustomer.display_name} phone=${updatedCustomer.phone} last_message_at=${updatedCustomer.last_message_at}`);
              
              // Step 3: Ensure customer index exists
              await env[KV_BINDING_NAME].put(customerIndexKey, '1');
              console.log(`[KV_CUSTOMER_INDEX_OK] customer_id=${customerId}`);
              
              // Step 4: Write message index with improved reliability
              let messageIndex = [];
              const messageIndexRaw = await env[KV_BINDING_NAME].get(messageIndexKey);
              if (messageIndexRaw) {
                try {
                  messageIndex = JSON.parse(messageIndexRaw);
                } catch (parseError) {
                  console.error(`[INDEX_PARSE_ERROR] customer_id=${customerId} | ${parseError.message}`);
                  messageIndex = [];
                }
              }
              // Add new message to index
              messageIndex.push({ ts, key: msgKey });
              // Sort index by timestamp to ensure correct order
              messageIndex.sort((a, b) => a.ts - b.ts);
              // Write updated index back to KV
              await env[KV_BINDING_NAME].put(messageIndexKey, JSON.stringify(messageIndex));
              console.log(`[KV_MESSAGE_INDEX_WRITE_OK] customer_id=${customerId} message_count=${messageIndex.length}`);
              
              // 写入确认日志 - 针对特定 customer_id
              if (customerId === "GakCvF3msAChq2DTER9") {
                console.log(`[INBOUND_FINAL_WRITE_DUMP] { "customer_entity_key": "inbox:customer:GakCvF3msAChq2DTER9", "customer_index_key": "inbox:customers:index:GakCvF3msAChq2DTER9", "message_index_key": "inbox:messages:index:GakCvF3msAChq2DTER9", "message_key_sample": "inbox:msg:GakCvF3msAChq2DTER9:${messageId}" }`);
              }
            } catch (kvError) {
              console.error(`[INBOUND][KV_ERROR] traceId=${traceId} | ${kvError.message}`);
            }
          }
          
          // 内存存储
          addMessageToStore(customerId, message);
          
          // 输出必要日志
          console.log(`[INBOUND_MSG_WRITE] customer_id=${customerId} text_length=${text.length} phone=${phone}`);
          console.log(`[FORCE_CUSTOMER_REGISTERED] ${customerId}`);
          console.log(`[TRACE][DAOJIE_INBOUND_STORED] { customerId: '${customerId}', text: '${text}', type: 'inbound', stored: ${stored}, phone: '${phone}' }`);
          
          return json({
            ok: true,
            customer_id: customerId,
            message_id: messageId
          });
          
        } catch (error) {
          console.error(`[INBOUND][FATAL] ${error.message}`);
          return json(
            { ok: false, error: error.message },
            400
          );
        }
      }
      
      // ===== INBOX CUSTOMERS =====
      if (request.method === 'GET' && path === '/api/inbox/customers') {
        console.log('[ROUTE_HIT] /api/inbox/customers');
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const KV_BINDING_NAME = 'MESSAGES_KV';
        const queryTs = Date.now();
        
        console.log(`[CUSTOMERS_ROUTE_ENTER] ts=${queryTs}`);
        console.log(`[CUSTOMERS_ROUTE_SCAN_START]`);
        
        // 使用 Map 来存储 canonical ID 到客户实体的映射
        // 确保每个 canonical ID 只保留一个最新的客户实体
        const customersByCanonId = new Map();
        
        // 1. 从 KV 读取（生产环境）
        if (env[KV_BINDING_NAME]) {
          try {
            // 从索引获取所有客户
            const keys = await env[KV_BINDING_NAME].list({ 
              prefix: 'inbox:customers:index:',
              limit: 100
            });
            
            console.log(`[CUSTOMERS_TOTAL_INDEX_KEYS] found ${keys.keys.length} index keys`);
            
            for (const key of keys.keys) {
              console.log(`[CUSTOMERS_INDEX_KEY_FOUND] key=${key.name}`);
              console.log(`[CUSTOMERS_INDEX_SEEN] key=${key.name} ts=${Date.now()}`);
              
              // 从 key 中提取原始 customerId（格式：inbox:customers:index:customerId）
              const rawCustomerId = key.name.replace('inbox:customers:index:', '');
              
              // 生成 canonical customer_id（统一大小写和格式）
              const canonId = canonicalCustomerId(rawCustomerId);
              
              // 打印 customer_id 处理日志，用于调试
              console.log(`[CUSTOMER_INDEX_KEY] ${key.name}`);
              console.log(`[CUSTOMER_RAW_ID] ${rawCustomerId}`);
              console.log(`[CUSTOMER_CANON_ID] ${canonId}`);
              console.log(`[CUSTOMER_ENTITY_LOOKUP] inbox:customer:${canonId}`);
              
              // 检查是否已经处理过这个 canonical ID
              if (customersByCanonId.has(canonId)) {
                console.log(`[CUSTOMERS_DUPLICATE_ID] Duplicate canonical ID found: ${canonId} (raw: ${rawCustomerId})`);
                continue; // 跳过重复的 canonical ID
              }
              
              // 先尝试从 canonical ID 读取客户实体
              let customerRaw = await env[KV_BINDING_NAME].get(`inbox:customer:${canonId}`);
              let customerData = null;
              
              if (customerRaw) {
                try {
                  customerData = JSON.parse(customerRaw);
                } catch (parseError) {
                  console.error(`[CUSTOMER_PARSE_ERROR] customer_id=${canonId} | ${parseError.message}`);
                  customerData = null;
                }
              }
              
              // 如果 canonical ID 没有对应的实体，尝试从原始 ID 读取（处理旧数据迁移）
              if (!customerData && rawCustomerId !== canonId) {
                console.log(`[CUSTOMER_MIGRATION_ATTEMPT] Trying to migrate from rawId ${rawCustomerId} to canonId ${canonId}`);
                const oldCustomerRaw = await env[KV_BINDING_NAME].get(`inbox:customer:${rawCustomerId}`);
                
                if (oldCustomerRaw) {
                  try {
                    const oldCustomerData = JSON.parse(oldCustomerRaw);
                    // 迁移旧客户数据到 canonical ID
                  const migratedCustomer = {
                    ...oldCustomerData,
                    // 确保使用正确的 canonical ID
                    customer_id: canonId
                  };
                    
                    // 写入迁移后的数据
                    await env[KV_BINDING_NAME].put(`inbox:customer:${canonId}`, JSON.stringify(migratedCustomer));
                    // 确保 canonical ID 有索引
                    await env[KV_BINDING_NAME].put(`inbox:customers:index:${canonId}`, '1');
                    
                    customerData = migratedCustomer;
                    console.log(`[CUSTOMER_MIGRATION_SUCCESS] Migrated ${rawCustomerId} to ${canonId}`);
                  } catch (parseError) {
                    console.error(`[CUSTOMER_MIGRATION_ERROR] Failed to migrate ${rawCustomerId} to ${canonId}: ${parseError.message}`);
                  }
                }
              }
              
              // 如果找到了客户数据，添加到映射中
              if (customerData) {
                customersByCanonId.set(canonId, customerData);
                console.log(`[CUSTOMERS_ENTITY_FOUND] customer_id=${canonId}`);
                console.log(`[CUSTOMERS_ENTITY_FOUND] customer_id=${canonId} ts=${Date.now()}`);
                console.log(`[CUSTOMER_ENTITY_FOUND] customer_id=${canonId} display_name=${customerData.display_name}`);
                console.log(`[CUSTOMERS_ENTITY_RAW] ${JSON.stringify(customerData)}`);
              } else {
                // KV 最终一致性导致实体读取为 null，构造临时 customer
                const fallbackCustomer = {
                  customer_id: canonId,
                  display_name: canonId,
                  status: "pending",
                  last_message_at: 0,
                  _consistency: "eventual_kv_fallback"
                };
                customersByCanonId.set(canonId, fallbackCustomer);
                console.log(`[KV_EVENTUAL_FALLBACK] customer_id=${canonId} reason=entity_not_found`);
              }
            }
          } catch (error) {
            console.error(`[INBOX][CUSTOMERS_ERROR] ${error.message}`);
          }
        }
        
        // 2. 从内存存储读取（本地开发环境）
        if (IS_DEV) {
          for (const [rawCustomerId, messages] of messageStore.entries()) {
            const canonId = canonicalCustomerId(rawCustomerId);
            
            // 跳过已经从 KV 读取的客户
            if (customersByCanonId.has(canonId)) {
              continue;
            }
            
            if (messages.length > 0) {
              // 从消息中提取客户信息
              const lastMessage = messages[messages.length - 1];
              const customer = {
                customer_id: canonId,
                display_name: `Local Test User`,
                status: 'active',
                last_message_at: lastMessage.timestamp
              };
              customersByCanonId.set(canonId, customer);
            }
          }
        }
        
        // 转换为数组返回
        const customers = Array.from(customersByCanonId.values());
        
        console.log(`[CUSTOMERS_RESPONSE_SENT] count=${customers.length} ts=${Date.now()}`);
        console.log(`[CUSTOMERS_RETURN_COUNT] ${customers.length}`);
        
        return json({
          ok: true,
          customers: customers
        });
      }
      
      // ===== INBOX PULL =====
      if (request.method === 'GET' && path === '/api/inbox/pull') {
        const rawCustomerId = url.searchParams.get('customer_id');
        // 生成 canonical customer_id（统一大小写和格式）
        const customerId = canonicalCustomerId(rawCustomerId);
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`[INBOX][PULL] traceId=${traceId} | rawCustomerId=${rawCustomerId} | canonicalCustomerId=${customerId}`);
        console.log(`[PULL_REQUEST] customer_id=${customerId}`);
        
        let messages = [];
        
        // 1. 从 KV 读取（生产环境）
        if (env.MESSAGES_KV && customerId) {
          try {
            const indexKey = `inbox:index:${customerId}`;
            console.log(`[PULL_MESSAGE_INDEX_KEY] ${indexKey}`);
            
            const indexRaw = await env.MESSAGES_KV.get(indexKey);
            console.log(`[PULL_MESSAGE_INDEX_RAW] ${indexRaw}`);
            if (indexRaw) {
              const index = JSON.parse(indexRaw);
              console.log(`[PULL_MESSAGE_INDEX_FOUND] customer_id=${customerId} message_count=${index.length}`);
              
              for (const item of index) {
                console.log(`[PULL_MESSAGE_LOOKUP] ${item.key}`);
                const msgRaw = await env.MESSAGES_KV.get(item.key);
                console.log(`[PULL_MESSAGE_ENTITY_RAW] ${msgRaw}`);
                if (msgRaw) {
                  const message = JSON.parse(msgRaw);
                  // 确保返回的消息使用 canonical customer_id
                  message.customer_id = customerId;
                  messages.push(message);
                } else {
                  console.error(`[PULL_MESSAGE_NOT_FOUND] ${item.key}`);
                }
              }
            } else {
              console.error(`[PULL_MESSAGE_INDEX_NOT_FOUND] customer_id=${customerId}`);
            }
          } catch (error) {
            console.error(`[INBOX][PULL_ERROR] traceId=${traceId} | ${error.message}`);
          }
        }
        
        // 2. 从内存存储读取（本地开发环境）
        if (IS_DEV && customerId) {
          const memoryMessages = getMessagesForCustomer(customerId);
          messages = messages.concat(memoryMessages);
        }
        
        // 去重并按时间排序
        const uniqueMessages = Array.from(new Map(messages.map(msg => [msg.id, msg])).values());
        uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        return json({
          ok: true,
          messages: uniqueMessages,
          cursor: uniqueMessages.length,
          hasMore: false
        });
      }
      
      // ===== TRANSLATE TEXT (统一翻译入口) =====
      if (request.method === 'POST' && (path === '/api/translate/text' || path === '/api/translate/message' || path.startsWith('/api/translate/'))) {
        try {
          // 兼容旧端点：提取文本
          const body = await request.json();
          const text = body.text || body.content || body.message || body.original_text || "";
          
          // 环境检查日志
          console.log("[ENV_CHECK]", !!env.DEEPSEEK_API_KEY);
          
          // 验证API密钥存在
          if (!env.DEEPSEEK_API_KEY) {
            const traceId = `trace_${Date.now()}`;
            return json({
              ok: false,
              engine: "deepseek",
              error: "DEEPSEEK_API_KEY_NOT_SET",
              trace_id: traceId
            }, 502);
          }
          
          // 强制日志：TRANSLATE_REQUEST
          console.log('[TRANSLATE_REQUEST] text=' + text.slice(0, 50) + '...');
          
          // 验证文本不为空
          if (!text.trim()) {
            return json({
              ok: false,
              error: "EMPTY_TEXT",
              engine: "deepseek"
            }, 400);
          }
          
          // 调用真实 DeepSeek 翻译函数
          const result = await translateWithDeepSeek(env, text);
          
          if (result.success) {
            // 强制日志：TRANSLATE_RESULT
            console.log('[TRANSLATE_RESULT] translated=' + result.data.translated_text.slice(0, 50) + '...');
            
            // 返回固定格式的成功响应
            return json({
              ok: true,
              source_lang: "auto",
              translated_text: result.data.translated_text,
              engine: "deepseek"
            });
          } else {
            // 翻译失败，返回错误响应
            console.error('[TRANSLATE_ERROR]', JSON.stringify(result.error));
            
            return json({
              ok: false,
              engine: "deepseek",
              error: result.error.message || JSON.stringify(result.error),
              trace_id: result.traceId
            }, result.status || 500);
          }
        } catch (error) {
          console.error('[TRANSLATE_ENDPOINT_ERROR]', error.message);
          
          return json({
            ok: false,
            engine: "deepseek",
            error: error.message,
            trace_id: `trace_${Date.now()}_error`
          }, 500);
        }
      }
      
      // ===== SEND WHATSAPP REPLY =====
      if (request.method === 'POST' && path === '/api/reply/daojie') {
        const body = await request.json();
        
        // 验证必填字段
        if (!body.contactId || !body.locationId || !body.message) {
          return json(
            { ok: false, error: 'MISSING_REQUIRED_FIELDS' },
            400
          );
        }
        
        // 调用 PIT API 发送回复
        const result = await sendDaojieWhatsAppReply(env, body);
        
        if (result.success) {
          return json({
            ok: true,
            conversationId: result.data.conversationId,
            messageId: result.data.messageId,
            traceId: result.data.traceId
          }, result.status);
        } else {
          return json({
            ok: false,
            error: result.error,
            traceId: result.traceId
          }, result.status);
        }
      }
      
      // ===== INDEX BACKFILL (一次性) =====
      if (request.method === 'GET' && path === '/api/admin/index-backfill') {
        // Only allow GET requests for safety
        const KV_BINDING_NAME = 'MESSAGES_KV';
        
        if (!env[KV_BINDING_NAME]) {
          return json({
            ok: false,
            error: 'KV_NOT_AVAILABLE'
          }, 500);
        }
        
        console.log('[INDEX_BACKFILL_START] Starting index backfill process');
        
        try {
          const messagesByCustomer = new Map();
          let msgCount = 0;
          let cursor = null;
          
          // Step 1: Scan all message keys
          do {
            const listResult = await env[KV_BINDING_NAME].list({
              prefix: 'inbox:msg:',
              cursor: cursor
            });
            
            for (const key of listResult.keys) {
              // Parse message key to extract customer_id, ts, and message_id
              // Format: inbox:msg:customerId:timestamp:messageId
              const keyParts = key.name.split(':');
              if (keyParts.length >= 5) {
                const customerId = keyParts[2];
                const ts = parseInt(keyParts[3], 10);
                
                if (!isNaN(ts)) {
                  // Add message to customer's list
                  if (!messagesByCustomer.has(customerId)) {
                    messagesByCustomer.set(customerId, []);
                  }
                  messagesByCustomer.get(customerId).push({ ts, key: key.name });
                  msgCount++;
                }
              }
            }
            
            cursor = listResult.cursor;
          } while (cursor);
          
          console.log(`[INDEX_BACKFILL_SCAN] Found ${msgCount} messages for ${messagesByCustomer.size} customers`);
          
          // Step 2: Rebuild index for each customer
          let backfillCount = 0;
          for (const [customerId, messages] of messagesByCustomer.entries()) {
            console.log(`[INDEX_BACKFILL_CUSTOMER] Processing customer: ${customerId} (${messages.length} messages)`);
            
            // Sort messages by timestamp
            messages.sort((a, b) => a.ts - b.ts);
            
            // Write index to KV
            const messageIndexKey = `inbox:index:${customerId}`;
            await env[KV_BINDING_NAME].put(messageIndexKey, JSON.stringify(messages));
            
            backfillCount++;
          }
          
          console.log(`[INDEX_BACKFILL_DONE] count=${backfillCount}`);
          
          return json({
            ok: true,
            message: 'Index backfill completed',
            customers: backfillCount,
            messages: msgCount
          });
          
        } catch (error) {
          console.error(`[INDEX_BACKFILL_ERROR] ${error.message}`);
          return json({
            ok: false,
            error: error.message
          }, 500);
        }
      }
      
      // ===== DEFAULT FALLBACK - JSON 404 =====
      return json(
        { ok: false, error: 'ROUTE_NOT_HANDLED', path },
        404
      );
      
    } catch (error) {
      console.error('[FETCH_ERROR]', error.message, error.stack);
      return json(
        { ok: false, error: 'INTERNAL_SERVER_ERROR' },
        500
      );
    }
  }
};
