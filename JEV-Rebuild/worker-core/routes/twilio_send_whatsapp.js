// Send WhatsApp message using Twilio API
import { ok, fail } from '../utils/response.js';
import { ingestMedia } from '../core/media/media_pipeline_core.js';

// Get public base URL for worker
function getPublicBaseUrl(request, env) {
  // 优先使用 env.PUBLIC_BASE_URL
  if (env && env.PUBLIC_BASE_URL) {
    const baseUrl = env.PUBLIC_BASE_URL;
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.log('[PUBLIC_BASE_URL] Using env.PUBLIC_BASE_URL:', baseUrl);
      return baseUrl;
    }
  }
  
  // 从 request.url 解析 origin
  if (request && request.url) {
    try {
      const url = new URL(request.url);
      const origin = url.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        console.log('[PUBLIC_BASE_URL] Using origin from request:', origin);
        return origin;
      }
    } catch (error) {
      console.error('[PUBLIC_BASE_URL_ERROR] Failed to parse request url:', error.message);
    }
  }
  
  // 强制 fallback 为真实 Worker 域名
  const fallbackUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
  console.log('[PUBLIC_BASE_URL] Using fallback:', fallbackUrl);
  return fallbackUrl;
}

// Twilio API constants
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';
const TWILIO_MESSAGES_ENDPOINT = `${TWILIO_API_BASE}/Accounts/{AccountSid}/Messages.json`;

export async function handleTwilioSendWhatsApp(request, env) {
  console.log('[V3_PIPELINE_ENTRY] twilio_send_whatsapp hit');
  console.log('[TWILIO_SEND_WHATSAPP_START]');
  
  // 🔴 检查是否运行在本地环境
  const url = new URL(request.url);
  const isLocalhost = url.origin.includes('localhost') || url.origin.includes('127.0.0.1');
  
  // 🔴 如果是本地环境，转发请求到 Cloudflare Worker
  if (isLocalhost) {
    console.log('[LOCK_WRITE_ENV] localhost - forwarding to Cloudflare Worker');
    console.log('[TWILIO_SEND_FORWARD_TO_WORKER]');
    
    const workerUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/whatsapp/send';
    
    try {
      const body = await request.json();
      const forwardedResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const forwardedBody = await forwardedResponse.json();
      return new Response(JSON.stringify(forwardedBody), {
        status: forwardedResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('[TWILIO_SEND_FORWARD_ERROR]', error.message);
      return fail(request, 'FORWARD_ERROR', 502, { message: error.message });
    }
  }
  
  // 🔴 在 Cloudflare Worker 环境中执行
  console.log('[LOCK_WRITE_ENV] production-worker');
  
  // Check required environment variables
  const missingEnv = [];
  if (!env.TWILIO_ACCOUNT_SID) missingEnv.push('TWILIO_ACCOUNT_SID');
  if (!env.TWILIO_AUTH_TOKEN) missingEnv.push('TWILIO_AUTH_TOKEN');
  if (!env.TWILIO_MESSAGING_SERVICE_SID) missingEnv.push('TWILIO_MESSAGING_SERVICE_SID');
  
  if (missingEnv.length) {
    console.error('[TWILIO_ENV_MISSING]', missingEnv);
    return fail(request, 'ENV_MISSING', 400, { missing: missingEnv });
  }
  
  // Parse request body
  let body;
  try {
    body = await request.json();
    console.log('[TWILIO_SEND_REQUEST_BODY]', body);
  } catch (error) {
    console.error('[TWILIO_BAD_JSON]', error.message);
    return fail(request, 'BAD_JSON', 400);
  }
  
  // Validate required parameters
  const { to, text, mediaUrl, message_id } = body;
  
  if (!to || !text) {
    console.error('[TWILIO_MISSING_PARAMS]', { to, text });
    return fail(request, 'MISSING_PARAMS', 400, {
      required: ['to', 'text'],
      provided: { to, text }
    });
  }
  
  // 🔴 发送函数入口：打印 message_id 来源
  const finalMessageId = message_id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log("[TWILIO_SEND_ENTRY]", {
    message_id: finalMessageId,
    message_id_source: message_id ? "client_provided" : "server_generated",
    original_message_id: message_id,
    is_ui_temp_id: !message_id || message_id.startsWith('temp_')
  });
  
  // 🔴 发送锁检查：确保同一 message_id 只发送一次
  const lockKey = `sent:${finalMessageId}`;
  if (env.KV) {
    const existed = await env.KV.get(lockKey);
    if (existed) {
      console.log("[TWILIO_SEND_SKIPPED_ALREADY_SENT]", finalMessageId);
      return fail(request, "ALREADY_SENT", 400, {
        message_id: finalMessageId,
        error: "ALREADY_SENT"
      });
    }
  }
  
  // Format phone number for Twilio
  let formattedTo = to;
  if (!formattedTo.startsWith('whatsapp:')) {
    formattedTo = `whatsapp:${formattedTo}`;
  }
  
  // Ensure phone number has + prefix
  const phonePart = formattedTo.replace('whatsapp:', '');
  if (!phonePart.startsWith('+')) {
    formattedTo = `whatsapp:+${phonePart}`;
  }
  
  console.log('[TWILIO_FORMATTED_TO]', formattedTo);
  
  // Media ingest: Process and store outbound media using Media Pipeline Core
  let finalMediaUrl = mediaUrl;
  let media_path = null;
  
  if (mediaUrl) {
    try {
      console.log('[OUTBOUND_MEDIA_INGEST_START] Processing outbound media');
      
      // 构建 pipeline 环境
      const pipelineEnv = {
        R2: env.R2_BUCKET,
        KV: env.KV,
        MEDIA_LOCK: env.MEDIA_LOCK,
        WORKER_ORIGIN: getPublicBaseUrl(request, env)
      };
      
      console.log('[V3_INGEST_CALL]', {customer_id: to, media_sid: finalMessageId, mediaUrl: mediaUrl});
      console.log('[V3_INGEST_CALL] about to ingest media');
      console.log('[OUTBOUND_MEDIA_INGEST_CALL] Starting media pipeline ingestion');
      
      // 使用 Media Pipeline Core 进行媒体入库
      const ingestResult = await ingestMedia(pipelineEnv, {
        remoteUrl: mediaUrl
      }, {
        namespace: 'whatsapp',
        direction: 'outbound',
        customerId: to,
        mediaId: finalMessageId
      });
      
      console.log('[OUTBOUND_MEDIA_INGEST_CALL] Media pipeline ingestion completed');
      console.log('[OUTBOUND_MEDIA_INGEST_RESULT]', {
        r2Key: ingestResult.r2Key,
        mediaPath: ingestResult.mediaPath,
        contentType: ingestResult.contentType,
        bytes: ingestResult.bytes
      });
      
      console.log('[V3_INGEST_DONE]', {r2Key: ingestResult.r2Key, media_path: ingestResult.mediaPath});
      
      // 获取结果
      media_path = ingestResult.mediaPath;
      finalMediaUrl = ingestResult.mediaPath; // 直接使用返回的 mediaPath 作为 Twilio MediaUrl
      
      console.log('[MEDIA_V3_TWILIO_URL]', finalMediaUrl);
      console.log('[OUTBOUND_MEDIA_INGEST_SUCCESS] Media stored successfully via pipeline');
      console.log('[OUTBOUND_MEDIA_RESULT]', {
        r2Key: ingestResult.r2Key,
        mediaPath: ingestResult.mediaPath,
        contentType: ingestResult.contentType,
        bytes: ingestResult.bytes
      });
      
    } catch (error) {
      console.error('[OUTBOUND_MEDIA_INGEST_ERROR]', error.message);
      // Continue with original mediaUrl if ingest fails
      finalMediaUrl = mediaUrl;
    }
  }
  
  // Prepare Twilio request body
  const twilioBody = {
    To: formattedTo,
    Body: text,
    MessagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID
  };
  
  // Add media URL if provided
  if (finalMediaUrl) {
    twilioBody.MediaUrl = finalMediaUrl;
  }
  
  console.log('[TWILIO_API_REQUEST_BODY]', twilioBody);
  
  // Prepare Twilio API endpoint
  const apiEndpoint = TWILIO_MESSAGES_ENDPOINT.replace('{AccountSid}', env.TWILIO_ACCOUNT_SID);
  
  // Prepare authorization header
  const authHeader = 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  
  try {
    console.log('[TWILIO_API_CALL_START]', apiEndpoint);
    
    // Make request to Twilio API
    const twilioResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams(twilioBody).toString()
    });
    
    const twilioResponseText = await twilioResponse.text();
    console.log('[TWILIO_API_RESPONSE_STATUS]', twilioResponse.status);
    console.log('[TWILIO_API_RESPONSE_BODY]', twilioResponseText);
    
    if (!twilioResponse.ok) {
      console.error('[TWILIO_API_ERROR]', {
        status: twilioResponse.status,
        body: twilioResponseText
      });
      
      try {
        const errorData = JSON.parse(twilioResponseText);
        return fail(request, 'TWILIO_API_ERROR', twilioResponse.status, {
          twilioError: errorData,
          message: errorData.message || 'Twilio API error'
        });
      } catch {
        return fail(request, 'TWILIO_API_ERROR', twilioResponse.status, {
          message: 'Twilio API error',
          status: twilioResponse.status
        });
      }
    }
    
    // Parse successful response
    const responseData = JSON.parse(twilioResponseText);
    console.log('[TWILIO_API_SUCCESS]', {
      messageId: responseData.sid,
      from: responseData.from,
      to: responseData.to
    });
    
    // 🔴 发送成功后写入锁（仅在 Twilio 响应成功时）
    if (env.KV && twilioResponse.ok) {
      await env.KV.put(lockKey, "1", {
        expirationTtl: 60 * 60 * 24 * 30 // 30天过期
      });
      console.log("[TWILIO_SEND_LOCK_WRITE]", finalMessageId);
      console.log("[TWILIO_SEND_LOCK_EXPIRE_30D]", finalMessageId);
    } else if (!twilioResponse.ok) {
      console.log("[TWILIO_SEND_LOCK_SKIP]", finalMessageId, "reason: Twilio response not ok");
    }
    
    // Media Pipeline Core has already handled media ingestion
    // No need for duplicate media storage logic
    console.log('[OUTBOUND_MEDIA_INGEST_SKIPPED] Media already processed by pipeline');
    console.log('[OUTBOUND_MEDIA_PIPELINE_STATUS]', {
      mediaIngested: !!mediaUrl,
      mediaPath: media_path,
      twilioStatus: responseData.status
    });
    
    // Return success response
    return ok(request, {
      message_id: responseData.sid,
      from: responseData.from,
      to: responseData.to,
      status: responseData.status,
      media_path: media_path,
      twilio_response: responseData
    });
    
  } catch (error) {
    console.error('[TWILIO_SEND_ERROR]', error.message);
    return fail(request, 'NETWORK_ERROR', 500, {
      message: error.message
    });
  }
}
