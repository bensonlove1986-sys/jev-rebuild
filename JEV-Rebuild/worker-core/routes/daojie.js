import { DAOJIE_CONFIG } from '../config/constants.js';
import { ok, fail, text } from '../utils/response.js';
import { upsertInboxIndexEntry } from '../index.js';

// 辅助函数：创建统一格式的响应 - 已替换为使用统一响应工具
// function createResponse({ success, data = null, error = null, status = 200 }) {
//   const responseBody = {
//     success,
//   };
//   
//   if (data) {
//     responseBody.data = data;
//   }
//   
//   if (error) {
//     responseBody.error = error;
//   }
//   
//   return new Response(
//     JSON.stringify(responseBody),
//     {
//       status,
//       headers: {
//         'Content-Type': 'application/json',
//       }
//     }
//   );
// }



// 处理 Daojie 入站消息
export async function handleDaojieInbound(request, env) {
  try {
    // 1. 校验请求合法性
    // TODO: 可添加签名验证等安全措施
    
    // 2. 解析请求体
    const payload = await request.json();
    
    // 3. 解析关键字段
    const {
      conversationId,
      contactId,
      text,
      channel,
      // 其他可能的字段
      contactName,
      timestamp,
      // Additional name fields for display_name extraction
      username,
      display_name,
      from_name,
      nickname
    } = payload;
    
    // 4. 验证必填字段
    if (!conversationId || !contactId || !text) {
      return fail(request, 'Missing required fields', 400);
    }
    
    // 5. 转发给前端或写入内存缓存（仅用于通知，不用于回复）
    // 冻结期：直接跳过，不调用 DAOJIE_STREAM
    // 添加防御性检查，防止 idFromName 错误
    // if (env.DAOJIE_STREAM && env.DAOJIE_STREAM.idFromName) {
    //   const id = env.DAOJIE_STREAM.idFromName('global');
    //   await env.DAOJIE_STREAM.get(id).broadcast({
    //     type: 'raw_daojie',
    //     received_at: Date.now(),
    //     payload: {
    //       conversationId,
    //       contactId,
    //       contactName,
    //       text,
    //       channel,
    //       timestamp
    //     }
    //   });
    // }
    console.info('[WS] skipped: frozen by config');
    
    // 6. Handle Customer Profile upsert
    const customerId = contactId; // Use contactId as customer_id
    if (env.INBOX_KV && customerId) {
      try {
        // Extract display_name from various fields with fallback
        let displayName = contactName || username || display_name || from_name || nickname || customerId || "Unknown";
        
        // Only process if we have a customerId
        if (customerId) {
          const customerKey = `customer:${customerId}`;
          
          // Read existing customer data
          const existingCustomerRaw = await env.INBOX_KV.get(customerKey);
          let customerData = {
            customer_id: customerId,
            display_name: displayName,
            real_name: displayName,
            customer_name: displayName,
            source: "daojie_inbound",
            last_message_at: Date.now(),
            created_at: Date.now(),
            updated_at: Date.now()
          };
          
          // If customer data exists, update it
          if (existingCustomerRaw) {
            const existingCustomer = JSON.parse(existingCustomerRaw);
            // Don't overwrite existing display_name unless new value is non-empty
            if (!displayName || displayName === "Unknown") {
              customerData.display_name = existingCustomer.display_name || customerId || "Unknown";
              customerData.real_name = existingCustomer.real_name || existingCustomer.display_name || customerId || "Unknown";
              customerData.customer_name = existingCustomer.customer_name || existingCustomer.display_name || customerId || "Unknown";
            }
            customerData.source = existingCustomer.source || "daojie_inbound";
            customerData.created_at = existingCustomer.created_at || Date.now();
          }
          
          // Update last_message_at and updated_at
          customerData.last_message_at = Date.now();
          customerData.updated_at = Date.now();
          
          // Write customer data to INBOX_KV (using same KV as read side)
          try {
            if (env.INBOX_KV?.put) {
              await env.INBOX_KV.put(customerKey, JSON.stringify(customerData));
              console.log("[CUSTOMER_UPSERT_SUCCESS] customer_id=" + customerId + " display_name=" + customerData.display_name);
              console.log("[CUSTOMER_UPSERT_KEY] Key: " + customerKey);
            } else {
              console.warn("[CUSTOMER_UPSERT_SKIP] INBOX_KV not bound or missing put method");
            }
          } catch (e) {
            console.error("[CUSTOMER_UPSERT_FAIL] customer_id=" + customerId + " error:" + e.message);
          }
        }
      } catch (profileError) {
      console.error("[PROFILE_UPSERT_ERROR]", profileError.message);
      // Continue execution, return success response
    }
  }
  
  // 8. Upsert inbox index entry
  try {
    const inboxEntry = {
      customer_id: customerId,
      chat_id: conversationId,
      last_message_ts: Date.now(),
      last_message_preview: text.substring(0, 50),
      source: 'daojie'
    };
    await upsertInboxIndexEntry(env, inboxEntry);
  } catch (upsertError) {
    console.error('[INBOX_INDEX_UPSERT_ERROR]', upsertError.message);
    // Upsert error doesn't block message processing
  }
  
  // 9. 返回成功响应
  return ok(request, { status: 'received' });
    
  } catch (error) {
    console.error('Error handling Daojie inbound message:', error);
    return fail(request, error.message, 500);
  }
}

// 获取会话列表
export async function getConversations(request, env) {
  try {
    // 1. 获取API密钥
    const apiKey = env.DAIJIE_API_KEY;
    if (!apiKey) {
      return fail(request, 'API key not configured', 500);
    }
    
    // 2. 调用Daojie官方API
    const response = await fetch(`${DAOJIE_CONFIG.API_BASE_URL}/conversations/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': DAOJIE_CONFIG.API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    // 3. 直接透传响应，不进行自定义格式转换
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Failed to fetch conversations'
      }));
      return fail(request, errorData.error || 'Failed to fetch conversations', response.status, errorData);
    }
    
    // 4. 直接返回官方API的完整响应
    const data = await response.json();
    return ok(request, data);
    
  } catch (error) {
    console.error('Error getting conversations:', error);
    return fail(request, 'Failed to fetch conversations', 500);
  }
}

// 获取会话消息列表
export async function getConversationMessages(request, env) {
  try {
    // 1. 获取API密钥
    const apiKey = env.DAIJIE_API_KEY;
    if (!apiKey) {
      return fail(request, 'API key not configured', 500);
    }
    
    // 2. 解析conversationId
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const conversationId = pathSegments[4];
    
    if (!conversationId) {
      return fail(request, 'conversationId is required', 400);
    }
    
    // 3. 调用Daojie官方API
    const response = await fetch(`${DAOJIE_CONFIG.API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': DAOJIE_CONFIG.API_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    // 4. 直接透传响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Failed to fetch messages'
      }));
      return fail(request, errorData.error || 'Failed to fetch messages', response.status, errorData);
    }
    
    // 5. 直接返回官方API的完整响应
    const data = await response.json();
    return ok(request, data);
    
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return fail(request, 'Failed to fetch messages', 500);
  }
}

// 回复客户
export async function replyToCustomer(request, env) {
  try {
    // 1. 获取API密钥
    const apiKey = env.DAIJIE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. 解析conversationId
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const conversationId = pathSegments[4];
    
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'conversationId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. 解析请求体
    const body = await request.json();
    const { message, type = 'LiveChat' } = body;
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. 调用Daojie官方API回复客户
    const response = await fetch(`${DAOJIE_CONFIG.API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': DAOJIE_CONFIG.API_VERSION
      },
      body: JSON.stringify({
        type,
        message
      })
    });
    
    // 5. 直接透传响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Failed to send message'
      }));
      return fail(request, errorData.error || 'Failed to send message', response.status, errorData);
    }
    
    // 6. 直接返回官方API的完整响应
    const data = await response.json();
    return ok(request, data);
    
  } catch (error) {
    console.error('Error replying to customer:', error);
    return fail(request, 'Failed to send message', 500);
  }
}

// AI 生成回复草稿
export async function generateDraftReply(request, env) {
  try {
    // 添加日志
    console.log('[AI] draft-reply called');
    
    // 1. 解析请求体
    const { text, contactId, language } = await request.json();
    
    // 2. 验证必填字段
    if (!text || !contactId || !language) {
      return fail(request, 'Missing required fields', 400);
    }
    
    // 3. 模拟调用 LLM 生成回复草稿
    // TODO: 替换为实际的 DeepSeek / LLM 调用
    let generatedText;
    let generatedLang;
    
    if (language === 'zh') {
      generatedText = `根据客户消息："${text}"，我建议回复：这是一个中文回复建议。`;
      generatedLang = 'zh';
    } else {
      generatedText = `Based on the customer message: "${text}", I suggest replying: This is an English draft reply.`;
      generatedLang = 'en';
    }
    
    // 添加日志
    console.log('[AI] draft generated successfully');
    
    // 4. 返回草稿，不触发任何发送
    return ok(request, {
      text: generatedText,
      lang: generatedLang
    });
    
  } catch (error) {
    console.error('[AI] draft generation failed:', error);
    return fail(request, error.message, 500);
  }
}