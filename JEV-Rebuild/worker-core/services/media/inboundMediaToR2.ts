export async function fetchTwilioMedia(mediaUrl: string, env: any) {
  try {
    // 在 Cloudflare Workers 中使用 TextEncoder 替代 Buffer
    const encoder = new TextEncoder();
    const data = encoder.encode(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
    const auth = btoa(String.fromCharCode(...data));
    
    console.log('[FETCH_TWILIO_MEDIA] Fetching media from Twilio URL:', mediaUrl);
    
    const res = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${auth}`
      },
      timeout: 10000
    });
    
    if (!res.ok) {
      console.error('[TWILIO_MEDIA_FETCH_FAILED]', res.status, await res.text());
      throw new Error('TWILIO_MEDIA_FETCH_FAILED');
    }
    
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    
    console.log('[TWILIO_MEDIA_FETCH_SUCCESS] Fetched media:', {
      contentType,
      size: buffer.byteLength
    });
    
    return {
      buffer,
      contentType
    };
  } catch (error) {
    console.error('[FETCH_TWILIO_MEDIA_ERROR]', error.message);
    throw error;
  }
}

export async function saveMediaToR2({
  chatId,
  messageSid,
  mediaSid,
  buffer,
  contentType,
  env
}: {
  chatId: string;
  messageSid: string;
  mediaSid: string;
  buffer: ArrayBuffer;
  contentType: string;
  env: any;
}) {
  try {
    // 构建 R2 键，格式：whatsapp/{MessageSid}/{MediaSid}
    const key = `whatsapp/${messageSid}/${mediaSid}`;
    
    console.log('[SAVE_MEDIA_TO_R2] Saving media to R2:', {
      key,
      contentType,
      size: buffer.byteLength
    });
    
    // 检查 R2 存储配置
    if (!env.R2_BUCKET) {
      throw new Error('R2_BUCKET not configured');
    }
    
    // 上传到 R2
    await env.R2_BUCKET.put(key, buffer, {
      httpMetadata: {
        contentType
      }
    });
    
    console.log('[R2_UPLOAD_SUCCESS] Media uploaded to R2:', key);
    console.log('[R2_MEDIA_SAVED]', { key, size: buffer.byteLength });
    
    // 生成 media_path
    const media_path = `/api/media/r2/${key}`;
    console.log('[MEDIA_PATH_GENERATED] Generated media_path:', media_path);
    
    return media_path;
  } catch (error) {
    console.error('[SAVE_MEDIA_TO_R2_ERROR]', error.message);
    throw error;
  }
}
