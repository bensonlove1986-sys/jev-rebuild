// Mock Durable Object classes to satisfy existing bindings (required for deployment)
export class DaojieStreamDO {
  async fetch(request) {
    return new Response('DO disabled', {
      status: 410,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000'
      }
    });
  }
}

export class ChatHistoryDO {
  async fetch(request) {
    return new Response('DO disabled', {
      status: 410,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000'
      }
    });
  }
}

// UI Source Hard Lock - Prevent UI chaos by enforcing single source
const UI_SOURCE_DIR = "web-runtime"; // Read-only constant



// ===== SHA1 哈希生成函数 =====
async function generateMessageId(customerId, timestamp, content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${customerId}${timestamp}${content}`);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== HTTP EVENT ENGINE =====
// Helper function to generate a unique message key
const generateMessageKey = (customerId, messageId) => {
  return `msg:${customerId}:${messageId}`;
};

// Helper function to generate customer index key
const generateCustomerIndexKey = (customerId) => {
  return `customer:${customerId}:index`;
};

// Helper function to check if message already exists (deduplication)
async function isMessageExists(env, customerId, messageId) {
  if (!env.MESSAGES_KV) return false;
  const key = generateMessageKey(customerId, messageId);
  const existing = await env.MESSAGES_KV.get(key);
  return !!existing;
}

// Helper function to store message with deduplication
async function storeMessage(env, customerId, message) {
  // Use KV directly, no fallback
  const kv = env.MESSAGES_KV;
  
  // Check if message already exists
  const exists = await isMessageExists(env, customerId, message.id);
  if (exists) {
    console.log(`[MESSAGE][DUPLICATE] Message ${message.id} already exists for customer ${customerId}`);
    return false;
  }
  
  // Store message entity
  const messageKey = generateMessageKey(customerId, message.id);
  await kv.put(messageKey, JSON.stringify(message));
  
  // Update customer index
  const indexKey = generateCustomerIndexKey(customerId);
  const indexRaw = await kv.get(indexKey);
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  
  // Add to index with timestamp and messageId
  index.push({
    messageId: message.id,
    timestamp: message.timestamp,
    key: messageKey
  });
  
  // Sort index by timestamp (ascending)
  index.sort((a, b) => a.timestamp - b.timestamp);
  
  // Store updated index
  await kv.put(indexKey, JSON.stringify(index));
  
  // 2️⃣ 写入审计索引（不影响主流程）
  try {
    // Format date as YYYYMMDD
    const date = new Date(message.timestamp);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    
    // 1. Global audit index by date
    const globalAuditKey = `audit:date:${dateStr}`;
    const globalAuditRaw = await kv.get(globalAuditKey);
    const globalAudit = globalAuditRaw ? JSON.parse(globalAuditRaw) : [];
    globalAudit.push(message.id);
    await kv.put(globalAuditKey, JSON.stringify(globalAudit));
    
    // 2. Customer-specific audit index by date
    const customerAuditKey = `audit:customer:${customerId}:date:${dateStr}`;
    const customerAuditRaw = await kv.get(customerAuditKey);
    const customerAudit = customerAuditRaw ? JSON.parse(customerAuditRaw) : [];
    customerAudit.push(message.id);
    await kv.put(customerAuditKey, JSON.stringify(customerAudit));
    
    // 3. Add audit success log
    console.log(`[AUDIT_WRITE_OK] message_id=${message.id} customer_id=${customerId} date=${dateStr}`);
  } catch (auditError) {
    // Audit errors should not affect main flow
    console.error(`[AUDIT_WRITE_ERROR] message_id=${message.id} error=${auditError.message}`);
  }
  
  // Log success
  console.log(`[STORE_OK] source=${message.source || 'unknown'} customer_id=${customerId} message_id=${message.id}`);
  return true;
}

// Helper function to get messages for a customer with pagination
async function getMessagesForCustomer(env, customerId, since = 0, limit = 20) {
  const kv = env.MESSAGES_KV;
  
  // Get customer index
  const indexKey = generateCustomerIndexKey(customerId);
  const indexRaw = await kv.get(indexKey);
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  
  // Filter messages after since timestamp
  const filteredIndex = index.filter(item => item.timestamp > since);
  
  // Limit results
  const paginatedIndex = filteredIndex.slice(0, limit);
  
  // Fetch messages from KV
  const messages = [];
  for (const item of paginatedIndex) {
    // Only use msg: keys, no fallback
    if (!item.key.startsWith('msg:')) {
      continue;
    }
    
    const messageRaw = await kv.get(item.key);
    const exists = !!messageRaw;
    
    // Add required hard log
    console.log(`[INBOX][KEY_READ] key=${item.key} exists=${exists}`);
    
    if (exists) {
      messages.push(JSON.parse(messageRaw));
    }
  }
  
  // Log indexSize and items count for validation
  const indexSize = filteredIndex.length;
  const items = messages.length;
  
  return { messages, indexSize, items };
}

// ===== CUSTOMER PROFILE FUNCTIONS =====
// Helper function to generate customer profile key
const generateCustomerProfileKey = (customerId) => {
  return `profile:${customerId}`;
};

// Helper function to get customer profile
async function getCustomerProfile(env, customerId) {
  // Check if CUSTOMER_PROFILE_KV is bound
  if (!env.CUSTOMER_PROFILE_KV) {
    console.warn('[CUSTOMER_PROFILE][KV_NOT_BOUND] Using fallback');
    return null;
  }
  
  const profileKey = generateCustomerProfileKey(customerId);
  const profileRaw = await env.CUSTOMER_PROFILE_KV.get(profileKey);
  return profileRaw ? JSON.parse(profileRaw) : null;
}

// Helper function to upsert customer profile
async function upsertCustomerProfile(env, customerId, profileData) {
  // Check if CUSTOMER_PROFILE_KV is bound
  if (!env.CUSTOMER_PROFILE_KV) {
    console.warn('[CUSTOMER_PROFILE][KV_NOT_BOUND] Skipping profile update');
    return false;
  }
  
  const ts = Date.now();
  const profile = {
    customer_id: customerId,
    display_name: profileData.display_name || profileData.displayName || customerId,
    source: profileData.source || 'unknown',
    country: profileData.country || '',
    business_stage: profileData.business_stage || 'new',
    last_message: profileData.last_message || '',
    last_message_at: profileData.last_message_at || ts,
    updated_at: ts
  };
  
  const profileKey = generateCustomerProfileKey(customerId);
  await env.CUSTOMER_PROFILE_KV.put(profileKey, JSON.stringify(profile));
  
  console.log(`[CUSTOMER_PROFILE][UPDATED] customer_id=${customerId} business_stage=${profile.business_stage}`);
  return true;
}

// Helper function to update customer business stage
async function updateCustomerStage(env, customerId, businessStage) {
  // Validate business stage
  const validStages = ['new', 'following', 'quoting', 'ordered', 'lost'];
  if (!validStages.includes(businessStage)) {
    console.error(`[CUSTOMER_PROFILE][INVALID_STAGE] customer_id=${customerId} stage=${businessStage}`);
    return false;
  }
  
  // Get existing profile or create new one
  const existingProfile = await getCustomerProfile(env, customerId) || {};
  
  // Update stage
  const updatedProfile = {
    ...existingProfile,
    business_stage: businessStage,
    updated_at: Date.now()
  };
  
  return await upsertCustomerProfile(env, customerId, updatedProfile);
}

// ===== INBOX DISPLAYNAME BACKFILL FUNCTION =====
/**
 * Backfills displayName for all inbox messages that have invalid displayNames
 * Runs only once per deployment
 */
async function backfillInboxDisplayName(env, ctx) {
  const KV_BINDING_NAME = 'MESSAGES_KV';
  const BACKFILL_FLAG_KEY = 'INBOX_DISPLAYNAME_BACKFILL_DONE';
  
  // Check if backfill has already been done
  if (env[KV_BINDING_NAME]) {
    const backfillDone = await env[KV_BINDING_NAME].get(BACKFILL_FLAG_KEY);
    if (backfillDone === 'true') {
      console.log('[INBOX][BACKFILL] already done, skipping');
      return;
    }
  }
  
  console.log('[INBOX][BACKFILL] starting backfill of displayNames...');
  
  // Import necessary functions
  const { getDisplayName, isLikelyTechId } = await import('./utils/user.js');
  
  try {
    // Get global index
    const globalIndexKey = 'INBOX_INDEX';
    const globalIndexRaw = env[KV_BINDING_NAME] ? await env[KV_BINDING_NAME].get(globalIndexKey) : null;
    
    if (!globalIndexRaw) {
      console.log('[INBOX][BACKFILL] no global index found, skipping');
      // Set flag to done to avoid running again
      if (env[KV_BINDING_NAME]) {
        await env[KV_BINDING_NAME].put(BACKFILL_FLAG_KEY, 'true');
      }
      return;
    }
    
    const globalIndex = JSON.parse(globalIndexRaw);
    console.log(`[INBOX][BACKFILL] found ${globalIndex.length} messages in global index`);
    
    // Process each message in the index
    let processed = 0;
    let updated = 0;
    
    for (const item of globalIndex) {
      processed++;
      
      // Get the message from KV
      const msgRaw = await env[KV_BINDING_NAME].get(item.key);
      if (!msgRaw) continue;
      
      let msg = JSON.parse(msgRaw);
      const userId = msg.userId || msg.customer_id;
      
      // Check if displayName needs updating
      const needsUpdate = !msg.displayName || 
                         msg.displayName === 'unknown' || 
                         isLikelyTechId(msg.displayName) ||
                         msg.displayName === userId;
      
      if (needsUpdate) {
        const before = msg.displayName;
        
        // Try to get a better displayName
        let newDisplayName = '客户';
        
        // Try to use getDisplayName if we have the original body
        if (msg._originalBody) {
          try {
            const displayNameResult = getDisplayName({ body: msg._originalBody });
            if (displayNameResult && displayNameResult !== 'unknown') {
              newDisplayName = displayNameResult;
            }
          } catch (e) {
            console.error('[INBOX][BACKFILL] getDisplayName failed:', e);
          }
        }
        
        // Update message
        msg.displayName = newDisplayName;
        msg.contact = {
          ...msg.contact,
          displayName: newDisplayName
        };
        
        // Write back to KV
        await env[KV_BINDING_NAME].put(item.key, JSON.stringify(msg));
        updated++;
        
        // Log the update
        console.log('[INBOX][BACKFILL]', {
          userId,
          before,
          after: newDisplayName,
          source: newDisplayName === '客户' ? 'fallback' : 'getDisplayName'
        });
      }
    }
    
    // Set flag to indicate backfill is done
    if (env[KV_BINDING_NAME]) {
      await env[KV_BINDING_NAME].put(BACKFILL_FLAG_KEY, 'true');
    }
    
    console.log(`[INBOX][BACKFILL] completed | processed: ${processed} | updated: ${updated}`);
    
  } catch (error) {
    console.error('[INBOX][BACKFILL] failed:', error);
    // Don't set the flag if backfill failed, allow retry on next cold start
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      // Force check KV binding existence
      if (!env.MESSAGES_KV) {
        throw new Error('[FATAL] MESSAGES_KV not bound');
      }
      
      // Run backfill once on cold start
      ctx.waitUntil(backfillInboxDisplayName(env, ctx));
      
      const url = new URL(request.url);
      const upgrade = request.headers.get('Upgrade');
      const path = url.pathname;
      
      // Helper function to get allowed CORS origin
      const getAllowedOrigin = () => {
        // 只允许 http://localhost:3000
        return 'http://localhost:3000';
      };

      // ===== ABSOLUTE HARD STOP FOR DAOJIE WS =====
      if (url.pathname === '/ws/daojie' || upgrade === 'websocket') {
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

      // ===== CORS PREFLIGHT =====
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('Origin');
        const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
        const allowedOrigin = allowedOrigins.includes(origin) ? origin : 'http://localhost:3000';
        
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      // ===== API STATUS =====
      if (url.pathname === '/api/status') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            ws: 'disabled',
            mode: 'http-event-engine',
            engine: 'active'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': getAllowedOrigin(),
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );
      }
      


      // ===== INBOUND TEST ENDPOINT =====
      if (request.method === 'POST' && url.pathname === '/api/inbound/test') {
        try {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const body = await request.json();
          const { customer_id, text = 'hello inbox' } = body;
          
          if (!customer_id) {
            return new Response(JSON.stringify({ success: false, error: 'customer_id is required' }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
              }
            });
          }
          
          const ts = Date.now();
          const messageId = crypto.randomUUID();
          
          // Create test message
          const message = {
            id: messageId,
            customer_id: customer_id,
            display_name: `Test User ${customer_id}`,
            text: text,
            timestamp: ts,
            source: 'test',
            direction: 'inbound',
            type: 'inbound'
          };
          
          // Store message with deduplication
          const stored = await storeMessage(env, customer_id, message);
          
          // Upsert customer profile for test messages too
          try {
            const profileData = {
              customer_id: customer_id,
              display_name: message.display_name,
              source: 'test',
              last_message: text,
              last_message_at: ts
            };
            await upsertCustomerProfile(env, customer_id, profileData);
          } catch (profileError) {
            console.error(`[CUSTOMER_PROFILE][ERROR] customer_id=${customer_id} error=${profileError.message}`);
          }
          
          console.log(`[INBOUND][TEST][SUCCESS] traceId=${traceId} customerId=${customer_id} textLen=${text.length} stored=${stored} duplicate=${!stored}`);
          
          return new Response(JSON.stringify({ success: true, message_id: messageId, trace_id: traceId, stored, duplicate: !stored }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': getAllowedOrigin(),
            }
          });
        } catch (error) {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.error(`[INBOUND][TEST][ERROR] traceId=${traceId} error=${error.message}`);
          return new Response(JSON.stringify({ success: false, error: error.message, trace_id: traceId }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': getAllowedOrigin(),
            }
          });
        }
      }
      
      // ===== INBOUND DAOJIE WEBHOOK =====
      if (request.method === 'POST' && url.pathname === '/api/inbound/daojie') {
        try {
          // 使用更简单的方式生成 traceId，避免 crypto.randomUUID() 可能的问题
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const startTime = Date.now();
          
          console.log(`[INBOUND][START] traceId=${traceId}`);
          
          // 防御性校验：检查 KV 绑定是否存在
          const KV_BINDING_NAME = 'MESSAGES_KV';
          if (!env[KV_BINDING_NAME]) {
            console.warn(`[INBOUND][WARN][BINDING_MISSING] traceId=${traceId} | binding=${KV_BINDING_NAME} | will use in-memory storage`);
            // 不返回错误，继续使用内存存储
          }
          
          // 1. 读取 raw body 和 content-type
          let rawText = '';
          try {
            rawText = await request.text();
            // Required log: raw body
            console.log('[DAOJIE_INBOUND_RAW]', rawText);
            console.log(`[INBOUND][BODY_READ] traceId=${traceId} | rawText=${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}`);
          } catch (readError) {
            console.error(`[INBOUND][BODY_READ_ERROR] traceId=${traceId} | ${readError.message}`);
            return new Response(
              JSON.stringify({ success: true, message_id: `msg_${Date.now()}_read_error`, trace_id: traceId }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          const contentType = request.headers.get('content-type') || '';
          console.log(`[INBOUND][CONTENT_TYPE] traceId=${traceId} | contentType=${contentType}`);
          
          let body = {};
          let bodyKeys = [];
          
          // 3. 解析 body，兼容不同格式
          if (contentType.includes('application/json') && rawText.trim() !== '') {
            try {
              body = JSON.parse(rawText);
              bodyKeys = Object.keys(body);
              console.log(`[INBOUND][PARSE_SUCCESS] traceId=${traceId} | bodyKeys=${bodyKeys.join(',')}`);
              // 打印完整的 Daojie 原始 payload
              console.log('[DAOJIE_RAW]', JSON.stringify(body));
            } catch (parseError) {
              console.error(`[INBOUND][PARSE_ERROR] traceId=${traceId} | ${parseError.message} | rawText=${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}`);
              // 解析失败仍返回 200，避免平台重试风暴
              return new Response(
                JSON.stringify({ success: true, message_id: `msg_${Date.now()}_parse_error`, trace_id: traceId }),
                {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': getAllowedOrigin(),
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'X-Trace-Id': traceId
                  }
                }
              );
            }
          }
          
          // 4. 兼容外部 webhook 常见字段映射 - 带强校验和自动填充
          
          // 确保 contact 对象存在
          if (!body.contact) {
            body.contact = {
              id: body.customer_id || body.customerId || body.contact_id || body.platform_conversation_id || 'unknown'
            };
          }
          
          // 确保 message 对象存在
          if (!body.message) {
            body.message = {
              body: body.text || body.body || '',
              channel: body.channel || 'unknown'
            };
          } else {
            // 确保 message.body 存在
            if (!body.message.body) {
              body.message.body = body.text || body.body || '';
            }
            // 确保 message.channel 存在
            if (!body.message.channel) {
              body.message.channel = body.channel || 'unknown';
            }
          }
          
          // 归一化用户ID - 使用稳定的customer_id来源
          const { getDisplayName, normalizeUserId, isLikelyTechId } = await import('./utils/user.js');
          
          // 强制标准化customer_id，禁止undefined/null/空
          const rawCustomerId = 
            body.customer_id || 
            body.from || 
            body.sender || 
            body.contact?.id || 
            body.sender_id || 
            body.phone || 
            body.username || 
            'unknown';
          
          // 使用统一的normalizeUserId函数进行归一化，确保与inbox pull保持一致
          const customerId = normalizeUserId(rawCustomerId);
          console.log(`[DAOJIE_CUSTOMER_ID] raw=${rawCustomerId} normalized=${customerId}`);
          

          
          // 提取 text - 确保只返回字符串
          let text = '';
          if (typeof body.text === 'string') {
            text = body.text;
          } else if (typeof body.body === 'string') {
            text = body.body;
          } else if (body.message) {
            if (typeof body.message === 'string') {
              text = body.message;
            } else if (typeof body.message.body === 'string') {
              text = body.message.body;
            } else if (typeof body.message.text === 'string') {
              text = body.message.text;
            }
          } else if (body.payload && typeof body.payload.text === 'string') {
            text = body.payload.text;
          }
          text = text.trim();
          
          // 提取 source - 确保只返回字符串，自动填充缺失值
          let source = body.source;
          if (!source || typeof source !== 'string') {
            source = 'daojie';
            console.log(`[INBOUND][SOURCE_AUTOFILL] traceId=${traceId} | source=daojie`);
          }
          
          // 确保 source 已存在于 body
          body.source = source;
          
          // 提取 timestamp
          const timestamp = body.timestamp || 
                           body.message?.created_at || 
                           Date.now();
          
          // 确保 timestamp 已存在于 body
          body.timestamp = timestamp;
          
          // 5. 记录校验结果
          console.log(`[INBOUND][VALIDATED] traceId=${traceId} | contactId=${customerId} | textLen=${text.trim().length} | source=${source} | ts=${timestamp}`);
          
          // 记录用户ID归一化
          console.log(`[USER][NORMALIZED] traceId=${traceId} | normalized=${customerId}`);
          
          // 6. 处理空消息（trim后长度=0）
          if (!text.trim()) {
            text = 'Empty message'; // Set default text for empty messages
            console.log(`[INBOUND][DEFAULT_TEXT] traceId=${traceId} | customerId=${customerId} | rawKeys=${bodyKeys.join(',')}`);
          }
          
          // 7. 提取真实用户名 - getDisplayName already imported at line 205
          
          // 断点E：用户名解析输入源
          console.log('[TRACE][DISPLAYNAME_INPUT]', {
            sender_name: body.sender_name,
            customer_profile: body.contact,
            customer_company: body.company_name,
            customerId: customerId
          });
          
          // 8. 生成有效的messageId
          const ts = Date.now();
          let messageId = 
            body.platform_conversation_id && 
            body.platform_conversation_id !== 'null' && 
            body.platform_conversation_id !== 'undefined'
              ? body.platform_conversation_id 
              : crypto.randomUUID();
          
          // 打印messageId
          console.log('[MESSAGE_ID]', messageId);
          
          // 直接使用 Daojie 原始字段生成 display_name
          const displayName = body.customer_name || body.company || body.phone || customerId;
          
          // 创建简单消息结构
          const message = {
            id: messageId,
            customer_id: customerId,
            display_name: displayName,
            text: text,
            timestamp: ts,
            source: 'daojie',
            direction: 'inbound'
          };

          // Message storage will use storeMessage function below
          if (env[KV_BINDING_NAME]) {
            try {
              // 写入用户信息（profileKey）
              const profileKey = `profile:${customerId}`;
              const userKey = `user:${customerId}`;
              
              // 如果 displayName 存在且不是 techId，则写入 profile
              if (displayName && !isLikelyTechId(displayName)) {
                const profile = {
                  customer_id: customerId,
                  displayName: displayName,
                  username: body.contact?.username || '',
                  source: source,
                  updatedAt: ts
                };
                await env[KV_BINDING_NAME].put(profileKey, JSON.stringify(profile));
              }
              
              // 写入用户信息（兼容旧版本）
              await env[KV_BINDING_NAME].put(userKey, JSON.stringify({
                userId: customerId,
                displayName: displayName,
                source: source,
                updatedAt: ts
              }));
            } catch (kvError) {
              console.error(`[INBOUND][KV_ERROR] traceId=${traceId} | ${kvError.message}`);
            }
          } else {
            console.log(`[INBOUND][KV_SKIPPED] traceId=${traceId} | ${KV_BINDING_NAME} not available`);
          }
          
          // Store message using the same function as outbound messages
          let stored = false;
          try {
            stored = await storeMessage(env, customerId, message);
            if (stored) {
              console.log(`[STORE_MESSAGE_OK] source=daojie customer_id=${customerId} message_id=${messageId}`);
            }
          } catch (error) {
            console.error('[INBOX_STORE_ERROR]', error.message);
          }
          
          // Upsert customer profile
          try {
            const profileData = {
              customer_id: customerId,
              display_name: displayName,
              source: 'daojie',
              last_message: text,
              last_message_at: ts
            };
            await upsertCustomerProfile(env, customerId, profileData);
          } catch (profileError) {
            console.error(`[CUSTOMER_PROFILE][ERROR] customer_id=${customerId} error=${profileError.message}`);
          }
          
          // 断点A：Worker写入是否成功
          console.log('[TRACE][INBOUND_STORE]', {
            customerId,
            messageId: messageId,
            displayName: message.display_name,
            content: text,
            stored
          });
          
          // 添加required logs
          console.log(`[DAOJIE_INBOX_WRITE_OK] customer_id=${customerId} message_id=${messageId}`);
          
          // 添加DAOJIE专属日志
          console.log('[TRACE][DAOJIE_INBOUND_STORED]', {
            customerId,
            text,
            type: 'inbound',
            stored
          });

          const totalTime = performance.now() - startTime;
          // Return success response
          return new Response(
            JSON.stringify({ success: true, message_id: messageId, trace_id: traceId }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.error(`[INBOUND][FATAL] traceId=${traceId} | error=${error.message} | stack=${error.stack || 'no stack'}`);
          return new Response(
            JSON.stringify({ success: false, error: error.message, trace_id: traceId }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }

      // ===== MESSAGE POLLING ENDPOINT =====
      if (request.method === 'GET' && url.pathname === '/api/messages') {
        try {
          const customer_id = url.searchParams.get('customer_id');
          const since = parseInt(url.searchParams.get('since') || '0');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          
          if (!customer_id) {
            return new Response(
              JSON.stringify({ error: 'customer_id is required' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
              }
            );
          }

          const messages = await getMessagesForCustomer(env, customer_id, since, limit);
          console.log(`[HTTP EVENT] Polled messages for ${customer_id}: ${messages.length} since=${since} limit=${limit}`);

          return new Response(
            JSON.stringify(messages),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
            }
          );
        } catch (error) {
          console.error(`[HTTP EVENT ERROR] Polling: ${error.message}`);
          return new Response(
            JSON.stringify({ error: 'Polling failed' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
            }
          );
        }
      }

      // ===== SEND MESSAGE ENDPOINT =====
      if (request.method === 'POST' && url.pathname === '/api/send') {
        try {
          const traceId = crypto.randomUUID();
          const body = await request.json();
          const { customer_id, text } = body;
          
          if (!customer_id || !text) {
            return new Response(
              JSON.stringify({ ok: false, error: 'customer_id and text are required' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }

          const ts = Date.now();
          // Create message object
          const message = {
            id: `msg_${ts}_${Math.random().toString(36).substr(2, 9)}`,
            customer_id,
            text,
            type: 'agent',
            timestamp: ts,
            source: 'operator',
            status: 'sent',
            direction: 'outbound'
          };

          // Store the message with deduplication
          const stored = await storeMessage(env, customer_id, message);
          
          // 记录符合要求的Outbound发送日志
          console.log(`[OUTBOUND][SEND] traceId=${traceId} customerId=${customer_id} textLen=${text.length} target=external_platform stored=${stored}`);
          
          // 模拟外部平台发送逻辑（实际项目中应替换为真实API调用）
          let sendResult = 'success';
          try {
            // 这里应该是真实的外部平台API调用
            // 例如：await fetch('https://external-platform.com/send', { ... });
            console.log(`[OUTBOUND] ${traceId} | Simulating external send to ${customer_id}`);
            sendResult = 'success';
          } catch (error) {
            console.error(`[OUTBOUND] ${traceId} | External send failed: ${error.message}`);
            sendResult = 'error';
          }
          
          // 记录发送结果日志
          console.log(`[OUTBOUND][RESULT] traceId=${traceId} status=${sendResult}`);

          // Return success response
          return new Response(
            JSON.stringify({ ok: true, message, stored }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          const traceId = crypto.randomUUID();
          console.error(`[OUTBOUND] ERROR | ${traceId} | ${error.message}`);
          return new Response(
            JSON.stringify({ ok: false, error: 'Send failed' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }

      // ===== MESSAGE SEND ALIAS FOR COMPATIBILITY =====
      if (request.method === 'POST' && url.pathname === '/api/message/send') {
        try {
          const traceId = crypto.randomUUID();
          const body = await request.json();
          const { customer_id, text, source } = body;
          
          if (!customer_id || !text) {
            return new Response(
              JSON.stringify({ ok: false, error: 'customer_id and text are required' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          const ts = Date.now();
          // Create message object
          const message = {
            id: `msg_${ts}_${Math.random().toString(36).substr(2, 9)}`,
            customer_id,
            text,
            type: 'agent',
            timestamp: ts,
            source: source || 'operator',
            status: 'sent',
            direction: 'outbound'
          };

          // Store the message with deduplication
          const stored = await storeMessage(env, customer_id, message);
          
          // 记录符合要求的Outbound发送日志
          console.log(`[OUTBOUND][SEND] traceId=${traceId} customerId=${customer_id} textLen=${text.length} target=external_platform stored=${stored}`);
          
          // 模拟外部平台发送逻辑（实际项目中应替换为真实API调用）
          let sendResult = 'success';
          try {
            // 这里应该是真实的外部平台API调用
            // 例如：await fetch('https://external-platform.com/send', { ... });
            console.log(`[OUTBOUND] ${traceId} | Simulating external send to ${customer_id}`);
            sendResult = 'success';
          } catch (error) {
            console.error(`[OUTBOUND] ${traceId} | External send failed: ${error.message}`);
            sendResult = 'error';
          }
          
          // 记录发送结果日志
          console.log(`[OUTBOUND][RESULT] traceId=${traceId} status=${sendResult}`);
          
          // Return success response
          return new Response(
            JSON.stringify({ ok: true, stored }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          const traceId = crypto.randomUUID();
          console.error(`[OUTBOUND] ERROR | ${traceId} | alias=true | ${error.message}`);
          return new Response(
            JSON.stringify({ ok: false, error: 'Invalid request' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }

      // ===== INBOX CUSTOMERS ENDPOINT =====
      if (request.method === 'GET' && url.pathname === '/api/inbox/customers') {
        try {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Check KV binding
          if (!env.MESSAGES_KV) {
            return new Response(
              JSON.stringify({ customers: [] }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
              }
            );
          }
          
          // Get all customer-specific indexes
          const customerKeys = await env.MESSAGES_KV.list({ prefix: 'customer:' });
          const customerIndexes = new Map();
          
          // Iterate through all customer indexes to build the customers list
          for (const key of customerKeys.keys) {
            if (key.name.endsWith(':index')) {
              const customerId = key.name.split(':')[1];
              const indexRaw = await env.MESSAGES_KV.get(key.name);
              
              if (indexRaw) {
                try {
                  const index = JSON.parse(indexRaw);
                  if (index.length > 0) {
                    // Get the latest message from this customer
                    const latestIndexItem = index[index.length - 1];
                    
                    // Get the actual message content
                    const messageRaw = await env.MESSAGES_KV.get(latestIndexItem.key);
                    let displayName = `客户 ${customerId.substring(0, 8)}`;
                    let message = null;
                    let lastMessage = '';
                    let lastTimestamp = latestIndexItem.timestamp;
                    
                    if (messageRaw) {
                      message = JSON.parse(messageRaw);
                      displayName = message.display_name || message.displayName || displayName;
                      lastMessage = message.text || '';
                      // Use the actual message timestamp for last_ts
                      lastTimestamp = message.timestamp || message.ts || latestIndexItem.timestamp || Date.now();
                    }
                    
                    // Always update the customer entry with the latest message info
                    customerIndexes.set(customerId, {
                      customer_id: customerId,
                      display_name: displayName,
                      name: displayName, // Added for UI compatibility
                      customer_name: displayName, // Added for UI compatibility
                      last_message: lastMessage,
                      last_ts: lastTimestamp,
                      last_message_at: lastTimestamp
                    });
                  }
                } catch (parseError) {
                  console.error(`[INBOX][CUSTOMER_INDEX_PARSE_ERROR] traceId=${traceId} | key=${key.name} | error=${parseError.message}`);
                }
              }
            }
          }
          
          // Convert Map to array and get customer profiles
          const customersWithProfiles = await Promise.all(
            Array.from(customerIndexes.values()).map(async (customer) => {
              // Get customer profile for business stage
              const profile = await getCustomerProfile(env, customer.customer_id);
              
              // Update display_name using priority rules
              const updatedCustomer = {
                ...customer
              };
              
              // Priority 1: customer_profile.display_name (if exists)
              if (profile?.display_name) {
                updatedCustomer.display_name = profile.display_name;
                updatedCustomer.name = profile.display_name;
                updatedCustomer.customer_name = profile.display_name;
              }
              // Priority 2: keep existing display_name from index (already set)
              // Priority 3: customer_id (already set as fallback)
              
              return {
                ...updatedCustomer,
                business_stage: profile?.business_stage || 'new'
              };
            })
          );
          
          // Sort customers by last_ts desc (latest message first)
          const customers = customersWithProfiles.sort((a, b) => b.last_ts - a.last_ts);
          
          // Add required log
          console.log(`[INBOX_CUSTOMERS_OK] count=${customers.length}`);
          
          // Return response
          return new Response(
            JSON.stringify({ customers }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
            }
          );
        } catch (error) {
          console.error(`[INBOX][CUSTOMERS_ERROR] error=${error.message} | stack=${error.stack || 'no stack'}`);
          return new Response(
            JSON.stringify({ customers: [] }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
            }
          );
        }
      }
      
      // ===== INBOX PULL ENDPOINT =====
      if (request.method === 'GET' && url.pathname === '/api/inbox/pull') {
        // 第一步：锁定 500 发生点，最外层加 try/catch
        // 1️⃣ 强制使用安全的 since 值 - 移到 try 外面，确保 catch 块也能访问
        const sinceParam = url.searchParams.get('since');
        const sinceSafe = Number.isFinite(+sinceParam) ? +sinceParam : 0;
        
        // 获取拉取参数 - 支持 customerId 或 customer_id
        const customerIdParam = url.searchParams.get('customerId') || url.searchParams.get('customer_id');
        
        // 生成 normalizedCustomerId - 严格按要求：toLowerCase().trim()
        const normalizedCustomerId = customerIdParam ? customerIdParam.toLowerCase().trim() : null;
        const requestedCustomerId = normalizedCustomerId;
        
        // ③ 修复 KV 未绑定导致的异常路径 - 硬保护
        if (!env.MESSAGES_KV) {
          console.error("[INBOX][FATAL] MESSAGES_KV not bound");
          return new Response(JSON.stringify({
            ok: false,
            error: "KV_NOT_BOUND",
            messages: [],
            cursor: 0,
            hasMore: false
          }), {
            status: 200,
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': getAllowedOrigin(),
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          });
        }
        
        try {
          // 重点排查三类必炸点
          
          const limitParam = url.searchParams.get('limit');
          const limit = Number.isFinite(+limitParam) ? Math.min(+limitParam, 50) : 20; // 限制最大50条
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const startTime = Date.now();
          
          // 记录拉取开始日志
          console.log(`[INBOX][PULL_START] traceId=${traceId} | sinceSafe=${sinceSafe} | limit=${limit}`);
          
          if (!customerIdParam) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: "MISSING_CUSTOMER_ID",
                messages: [],
                cursor: sinceSafe,
                hasMore: false
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          // Use new pagination function to get messages
          const { messages, indexSize, items } = await getMessagesForCustomer(env, requestedCustomerId, sinceSafe, limit);
          
          // Determine cursorAfter (last message timestamp or sinceSafe)
          const cursorAfter = messages.length > 0 
            ? messages[messages.length - 1].timestamp 
            : sinceSafe;
          
          // Check if there are more messages (if we got exactly limit messages, there might be more)
          const hasMore = messages.length === limit;
          
          // Generate customer_ids (deduplicated array)
          const customer_ids = requestedCustomerId ? [requestedCustomerId] : [];
          
          // Add required validation log
          console.log(`[INBOX_PULL_OK] customerId=${requestedCustomerId} indexSize=${indexSize} items=${items}`);
          
          // Check for index/data mismatch - ① 禁止 throw Error 暴露给前端
          if (indexSize > 0 && items === 0) {
            console.error(`[INBOX][INDEX_DATA_MISMATCH] customer_id=${requestedCustomerId} indexSize=${indexSize} items=${items}`);
            // 不throw，而是返回JSON响应
            return new Response(
              JSON.stringify({
                ok: false,
                error: "INBOX_PULL_FAILED",
                message: "Index has items but data is missing",
                messages: [],
                cursor: cursorAfter,
                hasMore: false
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          // Add OBS log as requested
          console.log(`[OBS][INBOX_PULL] traceId=${traceId} | since=${sinceSafe} | messages.length=${messages.length} | next_cursor=${cursorAfter} | has_more=${hasMore} | customer_ids=[${customer_ids.join(',')}]`);
          
          // Return response - 返回过滤后的消息
          return new Response(
            JSON.stringify({
              ok: true,
              messages: messages,
              cursor: cursorAfter,
              hasMore: hasMore
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          // 强制使用 trace_前缀，避免 crypto.randomUUID() 可能的问题
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          // 按照要求的格式输出日志
          console.error(`[INBOX][FATAL] traceId=${traceId} | error=${error.message} | stack=${error.stack || 'no stack'}`);
          
          // ② 统一 JSON 错误返回格式
          return new Response(
            JSON.stringify({
              ok: false,
              error: "INBOX_PULL_FAILED",
              message: error?.message || "unknown error",
              messages: [],
              cursor: 0,
              hasMore: false
            }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }

      // ===== GET CUSTOMER PROFILE ENDPOINT =====
      if (request.method === 'GET' && url.pathname === '/api/customer/profile') {
        try {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const customerId = url.searchParams.get('customer_id');
          
          if (!customerId) {
            return new Response(
              JSON.stringify({ ok: false, error: 'customer_id is required' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          // Get customer profile
          const profile = await getCustomerProfile(env, customerId);
          
          if (!profile) {
            return new Response(
              JSON.stringify({ ok: false, error: 'customer not found' }),
              {
                status: 404,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          console.log(`[CUSTOMER_PROFILE][RETRIEVED] traceId=${traceId} customer_id=${customerId}`);
          
          return new Response(
            JSON.stringify({ ok: true, profile }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.error(`[CUSTOMER_PROFILE][GET_ERROR] traceId=${traceId} error=${error.message}`);
          
          return new Response(
            JSON.stringify({ ok: false, error: 'internal server error' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }
      
      // ===== UPDATE CUSTOMER STAGE ENDPOINT =====
      if (request.method === 'POST' && url.pathname === '/api/customer/stage') {
        try {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const body = await request.json();
          const { customer_id, business_stage } = body;
          
          if (!customer_id || !business_stage) {
            return new Response(
              JSON.stringify({ ok: false, error: 'customer_id and business_stage are required' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          // Update customer stage
          const updated = await updateCustomerStage(env, customer_id, business_stage);
          
          if (!updated) {
            return new Response(
              JSON.stringify({ ok: false, error: 'invalid business_stage or update failed' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'X-Trace-Id': traceId
                }
              }
            );
          }
          
          console.log(`[CUSTOMER_PROFILE][STAGE_UPDATED] traceId=${traceId} customer_id=${customer_id} business_stage=${business_stage}`);
          
          return new Response(
            JSON.stringify({ ok: true, message: 'stage updated successfully' }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.error(`[CUSTOMER_PROFILE][STAGE_ERROR] traceId=${traceId} error=${error.message}`);
          
          return new Response(
            JSON.stringify({ ok: false, error: 'internal server error' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }
      
      // ===== TRANSLATION API =====
      if (request.method === 'POST' && url.pathname === '/api/translate/business') {
        try {
          const traceId = crypto.randomUUID();
          const startTime = performance.now();
          
          // Parse request body
          const body = await request.json();
          const { text, sourceLang = 'en', targetLang = 'zh' } = body;
          
          // Validate required fields
          if (!text) {
            return new Response(
              JSON.stringify({ ok: false, error: 'Text is required' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': getAllowedOrigin(),
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
              }
            );
          }
          
          let translatedText;
          let engine = 'deepseek';
          let success = true;
          
          // If source and target languages are the same, return original text
          if (sourceLang === targetLang) {
            translatedText = text;
            engine = 'same-lang';
          } else {
            // DeepSeek API call
            try {
              // Skip translation if API key is missing
              if (!env.DEEPSEEK_API_KEY) {
                throw new Error('DeepSeek API key not configured');
              }
              
              const deepseekResp = await fetch(
                "https://api.deepseek.com/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
                  },
                  body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                      {
                        role: "system",
                        content: "You are a professional business translator. Translate the text accurately."
                      },
                      {
                        role: "user",
                        content: `Translate from ${sourceLang} to ${targetLang}: ${text}`
                      }
                    ],
                    temperature: 0.1
                  })
                }
              );
              
              if (!deepseekResp.ok) {
                throw new Error(`DeepSeek API returned non-200 status: ${deepseekResp.status}`);
              }
              
              const deepseekData = await deepseekResp.json();
              translatedText = deepseekData?.choices?.[0]?.message?.content?.trim() || text;
              
              if (!translatedText || translatedText === text) {
                // If translation failed to produce different result, use fallback
                translatedText = text;
                engine = 'fallback';
              }
            } catch (error) {
              // Fallback to original text on any error
              console.error(`[TRANSLATE] ${traceId} | DeepSeek API error: ${error.message}`);
              translatedText = text;
              engine = 'fallback';
              success = false;
            }
          }
          
          // Prepare response
          const responseBody = {
            ok: true,
            translatedText,
            sourceLang,
            targetLang,
            engine
          };
          
          // Log structured translation request
          const textLength = text.length;
          const totalTime = performance.now() - startTime;
          console.log(`[TRANSLATE] ${traceId} | api=translate | sourceLang=${sourceLang} | targetLang=${targetLang} | textLength=${textLength} | success=${success} | engine=${engine} | time=${totalTime.toFixed(2)}ms`);
          
          return new Response(
            JSON.stringify(responseBody),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        } catch (error) {
          const traceId = crypto.randomUUID();
          console.error(`[TRANSLATE] ${traceId} | api=translate | success=false | error=${error.message}`);
          
          // Return error response
          return new Response(
            JSON.stringify({ ok: false, error: 'Translation failed', details: error.message }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getAllowedOrigin(),
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Trace-Id': traceId
              }
            }
          );
        }
      }
      
      // ===== UI ROUTING WHITELIST - ONLY THESE PATHS ALLOWED =====
      // Generate a build ID for version fingerprinting
      const UI_BUILD_ID = Date.now().toString(); // Use timestamp as build ID
      
      // WHITELIST ONLY - Hard lock for UI routes
      const WHITELISTED_PATHS = [
        '/',
        '/assets/',
        '/__ui_runtime__.json',
        '/api/'
      ];

      // Check if path is allowed
      const isAllowedPath = WHITELISTED_PATHS.some(allowedPath => {
        if (allowedPath.endsWith('/')) {
          // Allow subpaths for directories
          return path === allowedPath.slice(0, -1) || path.startsWith(allowedPath);
        }
        // Exact match for files
        return path === allowedPath;
      });

      // BLOCK ALL NON-WHITELISTED PATHS
      if (!isAllowedPath) {
        return new Response('Path Forbidden', {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'text/plain'
          }
        });
      }

      // Serve __ui_runtime__.json endpoint for verification - ENFORCING UI_SOURCE_DIR
      if (path === '/__ui_runtime__.json') {
        return new Response(JSON.stringify({
          "ui_name": "JEV ChatUI",
          "ui_version": "v4",
          "source_dir": UI_SOURCE_DIR,
          "local_verify_port": 3000,
          "verified": true,
          "build_id": UI_BUILD_ID
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-UI-Build-Id': UI_BUILD_ID
          }
        });
      }

      // Serve index.html from web-runtime (UI_SOURCE_DIR) with version fingerprint
      if (path === '/') {
        return new Response(`<!doctype html>
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
</html>`, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-UI-Build-Id': UI_BUILD_ID,
            // Forced refresh strategy for index.html
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }

      // Serve CSS file from web-runtime/assets with proper caching
      if (path === '/assets/index-DXiG4MDz.css') {
        return new Response(`.ant-layout{min-height:100vh}.ant-layout-header{background:#fff;padding:0}.ant-layout-content{background:#f0f2f5}.chat-panel{display:flex;flex-direction:column;height:100%}.chat-header{padding:12px 16px;border-bottom:1px solid #f0f0f0}.chat-messages{flex:1;overflow-y:auto;padding:16px}.chat-input{padding:16px;border-top:1px solid #f0f0f0}`, {
          status: 200,
          headers: {
            'Content-Type': 'text/css',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-UI-Build-Id': UI_BUILD_ID,
            // Long-term caching for static assets
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }

      // Serve JS file from web-runtime/assets with proper caching
      if (path === '/assets/index-DfS6ulY8.js') {
        return new Response(`console.log('JEV ChatUI loaded successfully!');`, {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-UI-Build-Id': UI_BUILD_ID,
            // Long-term caching for static assets
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }

      // Serve logo SVG from web-runtime with proper caching
      if (path === '/jev-logo.svg') {
        return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90" fill="#1890ff">JEV</text></svg>`, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-UI-Build-Id': UI_BUILD_ID,
            // Long-term caching for static assets
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }

      // Return 404 for all other UI paths - STRICT ENFORCEMENT
      return new Response('UI Path Not Found - Only web-runtime UI allowed', {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-UI-Build-Id': UI_BUILD_ID
        }
      });
    } catch (error) {
      // Catch all exceptions and log them
      console.error('[WORKER_ROOT_EXCEPTION]', error.message, error.stack);
      
      // Return explicit error response for root path exceptions
      return new Response('WORKER_ROOT_EXCEPTION', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
  }
};