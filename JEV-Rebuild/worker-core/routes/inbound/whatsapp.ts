// 广播基址生成函数
function getPublicBaseUrl(request: any, env: any) {
  // 优先使用 env.PUBLIC_BASE_URL
  if (env && env.PUBLIC_BASE_URL) {
    const baseUrl = env.PUBLIC_BASE_URL;
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.log('[PUBLIC_BASE_URL] Using env.PUBLIC_BASE_URL:', baseUrl);
      return baseUrl;
    } else {
      console.log('[BROADCAST_URL_BLOCK_LOCALHOST] original=' + baseUrl);
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
      } else {
        console.log('[BROADCAST_URL_BLOCK_LOCALHOST] original=' + origin);
      }
    } catch (error) {
      console.error('[PUBLIC_BASE_URL_ERROR] Failed to parse request url:', error);
    }
  }
  
  // 强制 fallback 为真实 Worker 域名
  const fallbackUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
  console.log('[PUBLIC_BASE_URL] Using fallback:', fallbackUrl);
  return fallbackUrl;
}

// 解析 Twilio Webhook（只读）
function parseTwilioInbound(form: URLSearchParams) {
  const numMedia = Number(form.get('NumMedia') || '0');

  const messageSid = form.get('MessageSid'); // MMxxxx
  const from = form.get('From');             // whatsapp:+8613...
  const body = form.get('Body') || '';

  if (!messageSid || !from) {
    throw new Error('[TWILIO_INVALID_BASE_PARAMS]');
  }

  return {
    messageSid,
    chatId: from,
    body,
    numMedia,
    media: numMedia > 0
      ? {
          mediaSid: form.get('MediaSid0'),
          mediaUrl: form.get('MediaUrl0'),
          mediaType: form.get('MediaContentType0'),
        }
      : null,
  };
}

// 从 MediaUrl0 中提取 MediaSid
function extractMediaSidFromUrl(mediaUrl: string): string | null {
  if (!mediaUrl) return null;
  const match = mediaUrl.match(/\/Media\/(ME[\w]+)/);
  return match ? match[1] : null;
}

// 写入前的绝对封锁校验
function assertMessageBeforePersist(msg: any) {
  if (msg.media_path) {
    if (!msg.media_path.startsWith('/api/media/')) {
      throw new Error('[MEDIA_PATH_INVALID_PREFIX]');
    }
    if (msg.media_path.includes('http')) {
      throw new Error('[MEDIA_PATH_POLLUTED]');
    }
  }
}

// Import Media Pipeline Core
import { ingestMedia, PipelineEnvironment } from '../../core/media/media_pipeline_core';

export async function handleWhatsappInbound(request, env) {
  try {
    // 解析 Twilio Webhook
    const form = new URLSearchParams(await request.text());
    const parsed = parseTwilioInbound(form);
    
    // 1. 原样 dump formData（用户要求）
    console.log('[TWILIO_RAW_FORM_CORE]', {
      MessageSid: parsed.messageSid,
      From: parsed.chatId,
      NumMedia: parsed.numMedia,
      MediaUrl0: parsed.media?.mediaUrl,
      MediaSid0: parsed.media?.mediaSid,
      MediaContentType0: parsed.media?.mediaType
    });
    
    console.log('[TWILIO_WEBHOOK_HIT] Received Twilio inbound message');
    
    let mediaPath: string | null = null;
    let mime: string = '';
    let media_kind: string = 'document';
    
    // 媒体消息判定
      const messageSid = parsed.messageSid;
      const numMedia = parsed.numMedia;
      const isMedia = messageSid.startsWith('MM') || numMedia > 0;
      
      // 新增硬日志
      console.log('[MEDIA_CLASSIFY]', { messageSid, numMedia, isMedia });
      
      if (isMedia) {
        // 必须进入 media 分支
        const mediaUrl0 = String(parsed.media?.mediaUrl || '').trim();
        const mediaType0 = parsed.media?.mediaType || '';
        
        console.log('[MEDIA_PROCESSING_START]', {
          messageSid: parsed.messageSid,
          chatId: parsed.chatId,
          mediaUrl0: mediaUrl0.slice(0, 100),
          mediaType0,
          numMedia: parsed.numMedia
        });
        
        // 校验 mediaUrl 和 mediaType
        if (!mediaUrl0 || !mediaType0) {
          console.error('[MEDIA_MISSING_PARAMS]', {
            messageSid: parsed.messageSid,
            mediaUrl0: !!mediaUrl0,
            mediaType0: !!mediaType0,
            reason: 'Missing required media parameters'
          });
          console.log('[MEDIA_STORE_DECISION]', { 
            messageSid: parsed.messageSid,
            willPersist: false, 
            reason: 'Missing required media parameters', 
            has_media_path: false 
          });
          console.log('[TWILIO_MEDIA_ABORT_DROP]', parsed.messageSid);
          // 返回 200（不入库、不广播）
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        // 从 MediaUrl0 中提取 MediaSid
        const mediaSid = extractMediaSidFromUrl(mediaUrl0);
        
        // 校验 MessageSid 和 MediaSid
        if (!messageSid || !mediaSid) {
          console.error('[MEDIA_SID_MISSING]', {
            messageSid: !!messageSid,
            mediaSid: !!mediaSid,
            reason: 'Missing required MessageSid or MediaSid'
          });
          console.log('[MEDIA_STORE_DECISION]', { 
            messageSid: parsed.messageSid,
            willPersist: false, 
            reason: 'Missing required MessageSid or MediaSid', 
            has_media_path: false 
          });
          console.log('[TWILIO_MEDIA_ABORT_DROP]', parsed.messageSid);
          // 返回 200（不入库、不广播）
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        // 强制打印提取结果
        console.log('[TWILIO_MEDIA_EXTRACTED]', {
          numMedia: parsed.numMedia,
          messageSid: parsed.messageSid,
          mediaSid: mediaSid,
          mediaUrl0: mediaUrl0.slice(0, 120),
          mediaType0
        });
        
        // 使用 Media Pipeline Core 处理媒体
        try {
          console.log('[MEDIA_PIPELINE_START]', { messageSid, mediaSid, mediaUrl0 });
          
          // 构建 pipeline 环境
          const pipelineEnv: PipelineEnvironment = {
            R2: env.R2_BUCKET,
            KV: env.KV,
            MEDIA_LOCK: env.MEDIA_LOCK,
            WORKER_ORIGIN: getPublicBaseUrl(request, env)
          };
          
          // 调用 Media Pipeline Core 进行媒体入库
          const ingestResult = await ingestMedia(pipelineEnv, {
            remoteUrl: mediaUrl0
          }, {
            namespace: 'whatsapp',
            direction: 'inbound',
            customerId: parsed.chatId,
            mediaId: mediaSid,
            contentType: mediaType0
          });
          
          // 获取结果
          mediaPath = ingestResult.mediaPath;
          mime = ingestResult.contentType;
          
          // 实现统一的 media_kind 判断逻辑
          if (mime.startsWith('image/')) {
            media_kind = 'image';
          } else if (mime === 'application/pdf') {
            media_kind = 'pdf';
          } else if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('xlsx') || mime.includes('xls')) {
            media_kind = 'spreadsheet';
          } else {
            media_kind = 'document';
          }
          
          // 必须输出日志
          console.log('[UNIFIED_MEDIA_NORMALIZED]');
          console.log('media_kind=' + media_kind);
          console.log('mimeType=' + mime);
          
          // 打印强制日志
          console.log('[MEDIA_PATH_COMMITTED]', mediaPath);
          console.log('[MEDIA_STORE_DECISION]', { 
            willPersist: true, 
            reason: 'Media processed successfully via pipeline', 
            has_media_path: !!mediaPath 
          });
          
        } catch (error: any) {
          console.error('[MEDIA_PIPELINE_ERROR]', {
            messageSid: parsed.messageSid,
            error: error.message,
            stack: error.stack?.slice(0, 500)
          });
          console.log('[MEDIA_STORE_DECISION]', { 
            messageSid: parsed.messageSid,
            willPersist: false, 
            reason: 'Media pipeline error', 
            has_media_path: false 
          });
          console.log('[TWILIO_MEDIA_ABORT_DROP]', parsed.messageSid);
          // 返回 200（不入库、不广播）
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
      
      // 打印强制日志
      console.log('[MEDIA_PATH_COMMITTED]', mediaPath);
      console.log('[MEDIA_STORE_DECISION]', { 
        willPersist: true, 
        reason: 'Media processed successfully', 
        has_media_path: !!mediaPath 
      });
      
      // 构建媒体消息（统一消息模型）
      const message = {
        id: parsed.messageSid,
        message_id: parsed.messageSid,
        chat_id: parsed.chatId,
        direction: 'inbound',
        // 统一使用 media 类型
        type: 'media',
        // 媒体类型字段
        media_kind: media_kind,
        media_type: media_kind,
        text: parsed.body,
        media_path: mediaPath, // ✅ 唯一来源
        mime: mime,
        timestamp: Date.now(),
        created_at: Date.now(),
        from: parsed.chatId,
        senderName: parsed.chatId.replace('whatsapp:', ''),
        ProfileName: parsed.chatId.replace('whatsapp:', '')
      };
      
      // 输出文档类型媒体日志
      if (media_kind !== 'image') {
        console.log('[INBOUND_MEDIA_DOCUMENT]');
      }

      // 🚨 写入前最终校验
      try {
        assertMessageBeforePersist(message);
        // 额外校验：MM 开头的消息必须有 media_path
        if (message.message_id.startsWith('MM') && !message.media_path) {
          throw new Error('[MM_MEDIA_PATH_REQUIRED] MM messages must have media_path');
        }
      } catch (error) {
        console.error('[MESSAGE_VALIDATION_ERROR]', error.message);
        console.log('[MEDIA_STORE_DECISION]', { 
          willPersist: false, 
          reason: 'Message validation failed', 
          has_media_path: !!mediaPath 
        });
        console.log('[TWILIO_MEDIA_ABORT_DROP]', parsed.messageSid);
        // 返回 200（不入库、不广播）
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }

      console.log('[MESSAGE_FINAL]', {
        chat_id: message.chat_id,
        message_id: message.message_id,
        kind: message.kind,
        has_media_path: !!message.media_path
      });
      
      // 获取 WhatsAppChatDO 实例
      const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
      const doStub = env.WHATSAPP_CHAT_DO.get(doId);
      
      // 检查消息是否重复
      try {
        const dedupResponse = await doStub.fetch(new Request('http://localhost/check-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              message_id: parsed.messageSid
            }
          })
        }));
        
        const dedupResult = await dedupResponse.json();
        if (dedupResult.duplicate) {
          console.warn('[MESSAGE_DUPLICATE] Dropping duplicate message:', parsed.messageSid);
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        // 广播消息
        console.log('[MESSAGE_BROADCAST_START]', {
          messageId: parsed.messageSid,
          chatId: message.chat_id,
          mediaPath: message.media_path
        });
        
        // 使用完整的 URL 格式调用 Durable Object
        const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
        const broadcastUrl = `${WORKER_ORIGIN}/broadcast`;
        console.log('[BROADCAST_URL_FINAL]', broadcastUrl);
        await doStub.fetch(new Request(broadcastUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'message',
            data: message
          })
        }));
        
        // WS 广播日志
        console.log('[WS_MEDIA_BROADCAST_OK]', {
          messageId: parsed.messageSid,
          mediaPath: message.media_path,
          chatId: message.chat_id
        });
        
        console.log('[INBOUND_MESSAGE_SAVED]', {
          messageId: parsed.messageSid,
          chatId: message.chat_id,
          mediaPath: message.media_path,
          mime: message.mime
        });
        console.log('[TWILIO_MESSAGE_BROADCASTED] Message broadcasted to WebSocket clients');
        console.log('[MEDIA_PROCESSING_COMPLETE]', parsed.messageSid);
      } catch (error) {
        console.error('[DO_OPERATION_ERROR]', error.message);
        // 返回 200，避免 Twilio 重试风暴
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
      // 返回 Twilio 兼容的响应
      return new Response('<Response></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    } else {
      // 构建文本消息
      const message = {
        id: parsed.messageSid,
        message_id: parsed.messageSid,
        chat_id: parsed.chatId,
        direction: 'inbound',
        kind: 'text',
        type: 'text',
        text: parsed.body,
        timestamp: Date.now(),
        created_at: Date.now(),
        from: parsed.chatId,
        senderName: parsed.chatId.replace('whatsapp:', ''),
        ProfileName: parsed.chatId.replace('whatsapp:', '')
      };

      // 🚨 写入前最终校验
      try {
        assertMessageBeforePersist(message);
      } catch (error) {
        console.error('[MESSAGE_VALIDATION_ERROR]', error.message);
        // 返回 200，避免 Twilio 重试风暴
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }

      console.log('[MESSAGE_FINAL]', {
        chat_id: message.chat_id,
        message_id: message.message_id,
        kind: message.kind
      });
      
      // 获取 WhatsAppChatDO 实例
      const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
      const doStub = env.WHATSAPP_CHAT_DO.get(doId);
      
      // 检查消息是否重复
      try {
        const dedupResponse = await doStub.fetch(new Request('http://localhost/check-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              message_id: parsed.messageSid
            }
          })
        }));
        
        const dedupResult = await dedupResponse.json();
        if (dedupResult.duplicate) {
          console.warn('[MESSAGE_DUPLICATE] Dropping duplicate message:', parsed.messageSid);
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        // 广播消息
        // 使用完整的 URL 格式调用 Durable Object
        const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
        const broadcastUrl = `${WORKER_ORIGIN}/broadcast`;
        console.log('[BROADCAST_URL_FINAL]', broadcastUrl);
        await doStub.fetch(new Request(broadcastUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'message',
            data: message
          })
        }));
        
        console.log('[INBOUND_MESSAGE_SAVED] messageId=' + parsed.messageSid);
        console.log('[TWILIO_MESSAGE_BROADCASTED] Message broadcasted to WebSocket clients');
      } catch (error) {
        console.error('[DO_OPERATION_ERROR]', error.message);
        // 返回 200，避免 Twilio 重试风暴
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
      // 返回 Twilio 兼容的响应
      return new Response('<Response></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }

    // 异常处理
    } catch (error) {
      console.error('[TWILIO_WEBHOOK_ERROR]', error);
      // 不允许抛异常中断整个 webhook，返回 200
      return new Response('<Response></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
}
