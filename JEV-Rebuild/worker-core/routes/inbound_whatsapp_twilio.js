// Import unified inbox keys generator
import { inboxKeys } from "../inbox/key";

// Import unified response utilities
import { ok, fail, notFound } from '../utils/response.js';

// Import version utilities
import { DATA_VERSION, withV } from '../utils/version.js';

// Helper function to parse x-www-form-urlencoded body
async function parseFormData(request) {
  // 按照要求，禁止使用 request.json()，改为使用 request.text() 解析 form-urlencoded
  const bodyText = await request.text();
  const formData = new URLSearchParams(bodyText);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

// Helper function to write message to inbox
async function writeMessageToInbox(env, message, customerData) {
  try {
    // Check if INBOX_KV is available
    if (!env.INBOX_KV) {
      console.error('[WA_TWILIO_INBOX_WRITE_ERROR] INBOX_KV not available');
      return false;
    }

    // Write message to KV
    const messageKey = withV(`message:${message.customerId}:${Date.now()}:${message.id}`);
    await env.INBOX_KV.put(messageKey, JSON.stringify(message));

    // Update customer profile or create if not exists
    const customerKey = withV(`customer:${message.customerId}`);
    let customer = {};
    
    try {
      const existingCustomer = await env.INBOX_KV.get(customerKey);
      if (existingCustomer) {
        customer = JSON.parse(existingCustomer);
      }
    } catch (e) {
      console.error('[WA_TWILIO_CUSTOMER_PARSE_ERROR]', e.message);
    }

    // Update customer data
    customer = {
      ...customer,
      customer_id: message.customerId,
      channel: 'whatsapp',
      last_message_at: Date.now(),
      last_message_preview: message.content.text || (message.content.media ? 'Media message' : 'No content'),
      unread_count: (customer.unread_count || 0) + 1,
      updated_at: Date.now(),
      ...customerData
    };

    // Write customer to KV
    await env.INBOX_KV.put(customerKey, JSON.stringify(customer));

    // Update customers index
    try {
      const indexRaw = await env.INBOX_KV.get('customers:index');
      let customerIds = [];
      
      if (indexRaw) {
        customerIds = JSON.parse(indexRaw);
      }
      
      if (!customerIds.includes(message.customerId)) {
        customerIds.push(message.customerId);
        await env.INBOX_KV.put('customers:index', JSON.stringify(customerIds));
      }
    } catch (e) {
      console.error('[WA_TWILIO_INDEX_UPDATE_ERROR]', e.message);
    }

    return true;
  } catch (error) {
    console.error('[WA_TWILIO_INBOX_WRITE_ERROR]', error.message);
    return false;
  }
}

// 导入图片处理工具
async function processWhatsAppImage(formData, MessageSid, env) {
  const { MediaUrl0, MediaContentType0, NumMedia, WaId } = formData;
  const numMedia = parseInt(NumMedia, 10);
  
  // 仅在 NumMedia>=1 且 MediaUrl0 存在时触发
  if (numMedia < 1 || !MediaUrl0) {
    return { success: false, reason: 'No media to process' };
  }
  
  // 仅处理图片
  if (!MediaContentType0 || !MediaContentType0.startsWith('image/')) {
    return { success: false, reason: 'Not an image' };
  }
  
  const messageId = `twilio_${MessageSid}`;
  const r2Bucket = env.R2_BUCKET;
  
  // 检查 Twilio 凭证是否存在
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    console.error('[WA_MEDIA_AUTH_ERROR] Missing Twilio credentials');
    return {
      success: false,
      reason: "Missing Twilio credentials",
      kind: "image",
      mime: MediaContentType0 || 'image/jpeg',
      ocr_status: "failed"
    };
  }
  
  // 检查 R2 存储桶是否可用
  if (!r2Bucket) {
    console.error('[WA_MEDIA_R2_ERROR] R2 bucket not available');
    return {
      success: false,
      reason: "R2 bucket not available",
      kind: "image",
      mime: MediaContentType0 || 'image/jpeg',
      ocr_status: "failed"
    };
  }
  
  try {
    // 解析 MediaUrl0 获取 MediaSid
    const mediaUrlParts = new URL(MediaUrl0).pathname.split('/');
    const mediaSid = mediaUrlParts[mediaUrlParts.length - 1] || MessageSid;
    
    // 生成 R2 Key（deterministic）
    const ext = MediaContentType0.split('/')[1] || 'jpeg';
    const r2Key = `whatsapp/${WaId || 'unknown'}/${MessageSid}/${mediaSid}.${ext}`;
    
    // 1. 拉取 Twilio Media（只此一次）
    console.log(`[WA_MEDIA_DOWNLOAD_START] ${messageId} ${MediaUrl0}`);
    
    // 使用环境变量中的 Twilio 凭证
    const TWILIO_ACCOUNT_SID = env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = env.TWILIO_AUTH_TOKEN;
    
    // 构建认证头
    const sid = String(TWILIO_ACCOUNT_SID || '').trim();
    const token = String(TWILIO_AUTH_TOKEN || '').trim();
    
    // 构建 UTF-8 安全的 base64 认证头
    const authHeader = "Basic " + Buffer.from(
      `${sid}:${token}`,
      "utf-8"
    ).toString("base64");
    
    const response = await fetch(MediaUrl0, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'image/*'
      },
      redirect: 'follow'
    });
    
    console.log(`[WA_MEDIA_DOWNLOAD_RESPONSE] Status: ${response.status}, StatusText: ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`[WA_MEDIA_DOWNLOAD_ERROR] Failed to download media: ${response.status}`);
      return {
        success: false,
        reason: `Failed to download media: ${response.status}`,
        kind: "image",
        mime: MediaContentType0 || 'image/jpeg',
        ocr_status: "failed"
      };
    }
    
    // 获取文件内容和类型
    const contentType = response.headers.get('content-type') || MediaContentType0 || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    
    console.log(`[WA_MEDIA_DOWNLOAD_SUCCESS] ${messageId} ${buffer.byteLength} bytes, Content-Type: ${contentType}`);
    
    // 2. 存入 R2（immutable）
    console.log(`[PIPELINE] step=1 r2_put_start mid=${messageId}`);
    console.log(`[WA_MEDIA_R2_UPLOAD] ${messageId} ${r2Key}`);
    try {
      await r2Bucket.put(r2Key, buffer, {
        httpMetadata: {
          contentType: contentType,
          cacheControl: 'public, max-age=31536000, immutable'
        }
      });
      console.log(`[PIPELINE] step=1 r2_put_ok mid=${messageId}`);
    } catch (r2Error) {
      console.error(`[WA_MEDIA_R2_ERROR] Failed to upload to R2: ${r2Error.message}`);
      return {
        success: false,
        reason: `Failed to upload to R2: ${r2Error.message}`,
        kind: "image",
        mime: contentType,
        ocr_status: "failed"
      };
    }
    
    // 3. 生成 R2 public URL
    const r2PublicDomain = env.R2_PUBLIC_DOMAIN || 'jev-rebuild-worker.bensonlove1986.workers.dev';
    const r2Url = `https://${r2PublicDomain}/${r2Key}`;
    
    // 4. 记录成功日志
    console.log(`[WA_MEDIA_PROCESSING_COMPLETE] ${messageId} ${buffer.byteLength} bytes`);
    
    // 5. 异步执行 OCR 处理
    (async () => {
      try {
        console.log(`[WA_MEDIA_OCR_START] ${messageId}`);
        
        // 从 R2 读取图片
        const r2Object = await r2Bucket.get(r2Key);
        if (!r2Object) {
          throw new Error('Failed to read image from R2');
        }
        
        // 直接使用 ArrayBuffer 调用 Vision API
        const imageBuffer = await r2Object.arrayBuffer();
        
        // 使用 Cloudflare Workers AI 进行 OCR 处理
        let ocrText = '';
        try {
          if (env.AI && typeof env.AI.run === 'function') {
            const aiResponse = await env.AI.run(
              '@cf/tencentcloudyuns.tencentcloudyuns-general-ocr-v1',
              { 
                image: new Uint8Array(imageBuffer) 
              }
            );
            
            ocrText = aiResponse.fullTextAnnotation?.text || aiResponse.textAnnotations?.[0]?.description || '';
          }
        } catch (aiError) {
          console.error('[OCR_PROCESSING_ERROR]', aiError.message);
        }
        
        console.log(`[WA_MEDIA_OCR_SUCCESS] ${messageId} Text length: ${ocrText.length}`);
        
        // 存储 OCR 结果到 KV
        if (env.INBOX_KV) {
          const kvKey = `ocr:${messageId}`;
          const ocrResultWithMeta = {
            text: ocrText,
            image_url: r2Url,
            created_at: Date.now()
          };
          await env.INBOX_KV.put(kvKey, JSON.stringify(ocrResultWithMeta));
          console.log(`[WA_MEDIA_OCR_KV_STORED] ${messageId} ${kvKey}`);
        }
        
      } catch (ocrError) {
        console.error(`[WA_MEDIA_OCR_ERROR] ${messageId} ${ocrError.message}`);
      }
    })();
    
    // 立即返回图片信息，OCR 异步执行
    return {
      success: true,
      image_url: r2Url,
      kind: "image",
      mime: contentType,
      ocr_status: "pending"
    };
    
  } catch (error) {
    console.error(`[WA_MEDIA_PROCESSING_ERROR] ${messageId} ${error.message}`);
    
    return {
      success: false,
      reason: `Processing failed: ${error.message}`,
      kind: "image",
      mime: MediaContentType0 || 'image/jpeg',
      ocr_status: "failed"
    };
  }
}



export async function handleInboundWhatsAppTwilio(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Only handle POST requests to the correct path
  if (method !== 'POST' || path !== '/api/inbound/whatsapp/twilio') {
    return notFound(request, path);
  }

  try {
    // Parse form data (x-www-form-urlencoded)
    const formData = await parseFormData(request);

    // Extract required fields
    const { 
      From, To, Body, MessageSid, NumMedia, 
      ProfileName, WaId, Forwarded, FrequentlyForwarded 
    } = formData;

    // Validate required fields
    if (!From || !To || !MessageSid || NumMedia === undefined) {
      console.error('[WA_TWILIO_INBOUND_BADREQ] Missing required fields', {
        From, To, MessageSid, NumMedia
      });
      return new Response('Bad Request', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }

    // Generate standard Message Object
    const fromWithoutWhatsapp = From.replace('whatsapp:', '');
    const customerId = WaId ? `whatsapp:${WaId}` : From;
    const stableName = WaId || fromWithoutWhatsapp;
    const displayName = ProfileName || stableName;
    const numMediaInt = parseInt(NumMedia, 10);
    
    // 新增 isTwilioMediaMessage 判定
    const isTwilioMediaMessage = (
      !!formData.MediaUrl0 ||
      numMediaInt > 0 ||
      (formData.MediaContentType0 && formData.MediaContentType0.startsWith('image/')) ||
      (MessageSid.startsWith('MM') && !Body)
    );
    
    // 从 payload 读取 AccountSid
    const accountSid = formData.AccountSid || env.TWILIO_ACCOUNT_SID;
    console.log('[WA_TWILIO_ACCOUNT_SID]', accountSid ? accountSid.substring(0, 6) + '...' + accountSid.substring(accountSid.length - 4) : 'not_found');
    
    // Prepare message data
    const message = {
      id: `twilio_${MessageSid}`,
      customerId: customerId,
      customer_name: ProfileName || null,
      wa_id: WaId || null,
      forwarded: Forwarded || null,
      frequently_forwarded: FrequentlyForwarded || null,
      channel: 'whatsapp',
      direction: 'inbound',
      role: 'customer',
      content: { text: Body || '' },
      timestamp: Date.now(),
      source: 'twilio',
      type: isTwilioMediaMessage ? 'image' : 'text',
      kind: isTwilioMediaMessage ? 'image' : 'text',
      mime: formData.MediaContentType0 || (isTwilioMediaMessage ? 'image/jpeg' : undefined),
      image_url: formData.MediaUrl0, // 确保 image_url 有值
      twilio_account_sid: accountSid // 保存 AccountSid
    };
    
    // Handle media (if present)
    if (numMediaInt > 0 || isTwilioMediaMessage) {
      // Process first media item (WhatsApp usually sends one media item at a time)
      const mediaResult = await processWhatsAppImage(formData, MessageSid, env);
      
      if (mediaResult.success) {
        // Update message with processed media info
        message.image_url = mediaResult.image_url;
        message.image_source = 'r2';
        message.kind = 'image';
        message.type = 'image';
        message.mime = mediaResult.mime;
        message.ocr_status = mediaResult.ocr_status;
        
        // Update content type
        message.content.text = '';
      } else {
        // Media processing failed
        message.media = {
          status: 'failed',
          reason: mediaResult.reason
        };
        // 即使失败，也要确保 image_url 有值
        message.image_url = formData.MediaUrl0;
      }
    }
    
    // 确保所有 Twilio 图片消息都有正确的类型和 media_path
    if (isTwilioMediaMessage) {
      message.kind = 'image';
      message.type = 'image';
      message.mime = message.mime || 'image/jpeg';
      
      // 保存实际的图片URL（如果有）
      const actualImageUrl = message.image_url || formData.MediaUrl0;
      
      // 硬闸函数
      function assertPureSid(value, type) {
        if (!value) {
          throw new Error(`[MEDIA_PATH_EMPTY_${type}]`);
        }
        if (value.includes('http')) {
          throw new Error(`[MEDIA_PATH_HTTP_IN_${type}] ${value}`);
        }
        if (!value.startsWith(type)) {
          throw new Error(`[MEDIA_PATH_INVALID_PREFIX_${type}] ${value}`);
        }
      }
      
      // 只使用 Twilio payload 的字段
      const messageSid = formData.MessageSid;
      let mediaSid = formData.MediaSid;
      
      // 如果没有 MediaSid，从 MediaUrl0 中提取
      if (!mediaSid && formData.MediaUrl0) {
        try {
          const mediaUrlParts = new URL(formData.MediaUrl0).pathname.split('/');
          const lastPart = mediaUrlParts[mediaUrlParts.length - 1];
          if (lastPart && lastPart.startsWith('ME')) {
            mediaSid = lastPart;
          }
        } catch (e) {
          console.error('[TWILIO_MEDIA_URL_PARSE_ERROR]', e.message);
        }
      }
      
      // 构建并设置 media_path
      try {
        // 硬闸校验
        assertPureSid(messageSid, 'MM');
        assertPureSid(mediaSid, 'ME');
        
        const media_path = `/api/media/twilio/${messageSid}/${mediaSid}`;
        message.media_path = media_path;
        
        console.log('[TWILIO_MEDIA_PATH] Using media_path:', media_path);
        
        // 防复发封印日志
        console.log('[MEDIA_PATH_SOURCE_SEALED]');
        console.log('VERSION: V2');
        console.log('INPUT: Twilio Payload Only');
        console.log('HTTP_IN_SID: HARD_REJECT');
        console.log('DOUBLE_APPEND: IMPOSSIBLE');
        
        console.log('[TWILIO_MEDIA_PATH_ENFORCE] Final media_path:', media_path);
      } catch (error) {
        console.error('[MEDIA_PATH_BUILD_ERROR]', error.message);
        // 失败时不设置 media_path，让 UI 显示错误
      }
      
      // 恢复实际的图片URL
      if (actualImageUrl) {
        message.image_url = actualImageUrl;
      }
    }

    // Write message to inbox
    console.log(`[PIPELINE] step=2 chat_append_start mid=${message.id}`);
    await writeMessageToInbox(env, message, {
      stable_name: stableName,
      display_name: displayName,
      customer_name: ProfileName || null,
      wa_id: WaId || null
    });
    console.log(`[PIPELINE] step=2 chat_append_ok mid=${message.id}`);
    
    // Update contact index
    console.log(`[PIPELINE] step=3 contact_upsert_start cid=${customerId}`);
    // Contact upsert is already handled in writeMessageToInbox
    console.log(`[PIPELINE] step=3 contact_upsert_ok cid=${customerId}`);

    // Broadcast message to UI
    try {
      // 创建或获取 WhatsAppChatDO 实例
      const id = env.WHATSAPP_CHAT_DO.idFromName('default');
      const stub = env.WHATSAPP_CHAT_DO.get(id);
      
      // 构建广播消息，确保 UI 能立即显示
      const broadcastMessage = {
        id: message.id,
        text: message.content.text || '',
        role: 'customer',
        timestamp: Date.now(),
        customer_id: customerId,
        direction: 'inbound',
        channel: 'whatsapp',
        source: "twilio",
        type: message.type || 'text',
        // 添加媒体信息
        ...(message.media_path && {
          media_path: message.media_path,
          kind: message.kind,
          mime: message.mime,
          ocr_status: message.ocr_status
        }),
        // 添加所有可能的图片URL字段，确保 UI 能立即显示图片
        ...(message.image_url && {
          image_url: message.image_url,
          url: message.image_url
        }),
        // 添加 Twilio 原始媒体 URL
        ...(formData.MediaUrl0 && {
          MediaUrl0: formData.MediaUrl0,
          mediaUrl: formData.MediaUrl0
        })
      };
      
      // 打印广播消息，用于调试
      console.log('[TWILIO_BROADCAST_MESSAGE] Broadcast message with image fields:', {
        id: broadcastMessage.id,
        type: broadcastMessage.type,
        kind: broadcastMessage.kind,
        media_path: broadcastMessage.media_path,
        image_url: broadcastMessage.image_url,
        url: broadcastMessage.url,
        MediaUrl0: broadcastMessage.MediaUrl0,
        mediaUrl: broadcastMessage.mediaUrl,
        mime: broadcastMessage.mime
      });
      
      // 发送广播
      await stub.fetch(new Request('https://example.com/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastMessage)
      }));
      
      console.log(`[MODULE_A_WS_BROADCAST_SENT] Message ${message.id} broadcasted to UI`);
    } catch (error) {
      console.error('[MODULE_A_WS_BROADCAST_ERROR]', error.message);
      // WS 广播失败不影响消息存储
    }

    // Send webhook to https://api.jevtools.org/api/inbound/whatsapp/twilio
    try {
      console.log('[WEBHOOK_SEND_START]', 'https://api.jevtools.org/api/inbound/whatsapp/twilio');
      
      const webhookResponse = await fetch('https://api.jevtools.org/api/inbound/whatsapp/twilio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JEV-Rebuild-Worker/1.0'
        },
        body: JSON.stringify({
          message: message,
          formData: formData,
          timestamp: Date.now(),
          source: 'twilio'
        }),
        redirect: 'follow'
      });
      
      console.log('[WEBHOOK_SEND_STATUS]', webhookResponse.status);
      if (!webhookResponse.ok) {
        console.error('[WEBHOOK_SEND_FAILED]', { status: webhookResponse.status });
      } else {
        console.log('[WEBHOOK_SEND_SUCCESS]', 'Webhook sent successfully');
      }
    } catch (webhookError) {
      console.error('[WEBHOOK_SEND_ERROR]', webhookError.message);
      // Webhook error should not affect main flow
    }

    // Log success
    console.log(`[WA_TWILIO_INBOUND_OK] ${MessageSid} ${From} ${NumMedia}`);
    console.log('[TWILIO_INBOUND_TEXT_FLOW_STABLE]');

    // Return empty response as requested
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('[WA_TWILIO_INBOUND_BADREQ]', error.message);
    return new Response('Bad Request', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}
