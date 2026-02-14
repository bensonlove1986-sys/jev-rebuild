import { ok, fail } from '../utils/response.js';

const PIT_BASE_URL = 'https://services.leadconnectorhq.com';
const PIT_MESSAGES_ENDPOINT = `${PIT_BASE_URL}/conversations/messages`;

export async function handleDaojieAttachmentUpload(request, env) {
  // A3. 路由命中日志
  console.log("[DAOJIE_ATTACHMENTS_UPLOAD_ROUTE_HIT]", {
    method: request.method,
    path: new URL(request.url).pathname
  });

  // B2. 断言：仅允许JSON格式，拒绝multipart/form-data
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({
      ok: false,
      error: "UNSUPPORTED_MEDIA_TYPE",
      message: "Only application/json is supported, multipart/form-data is forbidden"
    }), {
      status: 415,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (request.method !== 'POST') {
      return fail(request, 'METHOD_NOT_ALLOWED', 405);
    }

    if (!env.PIT_JWT || !env.DAOJIE_LOCATION_ID) {
      console.error("[DAOJIE_ATTACHMENTS_UPLOAD_MISSING_ENV]");
      return fail(request, 'ENV_MISSING', 400, {
        missing: [
          !env.PIT_JWT ? 'PIT_JWT' : null,
          !env.DAOJIE_LOCATION_ID ? 'DAOJIE_LOCATION_ID' : null
        ].filter(Boolean)
      });
    }

    const url = new URL(request.url);
    const imageUrl = url.searchParams.get('url');
    const contactId = url.searchParams.get('contactId');

    if (!imageUrl) {
      return fail(request, 'MISSING_URL', 400, { message: 'url parameter is required' });
    }

    if (!contactId) {
      return fail(request, 'MISSING_CONTACT_ID', 400, { message: 'contactId parameter is required' });
    }

    // C1. 成功日志：[IMG_MSG_REQ] contactId, size
    console.log("[IMG_MSG_REQ]", {
      contactId: contactId,
      imageUrl: imageUrl
    });

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl, { redirect: 'follow' });
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBlob = await imageResponse.blob();
    
    // 检查图片大小，确保≤5MB
    if (imageBlob.size > 5 * 1024 * 1024) {
      console.error("[IMG_MSG_FAIL]", {
        status: 413,
        code: "IMAGE_TOO_LARGE",
        traceId: Math.random().toString(36).substring(2, 15)
      });
      return ok(request, {
        ok: false,
        error: "IMAGE_TOO_LARGE",
        status: 413,
        body: "Image size must be ≤5MB"
      });
    }
    
    const reader = new FileReader();
    const base64Data = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    console.log("[DAOJIE_ATTACHMENTS_UPLOAD_IMAGE_PROCESSED]", {
      contentType,
      size: imageBlob.size,
      base64Length: base64Data.length
    });

    const locationId = env.DAOJIE_LOCATION_ID;
    const pitHeaders = {
      'Authorization': `Bearer ${env.PIT_JWT}`,
      'Accept': 'application/json',
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    };

    // B1/B2. 冻结点：仅允许POST /conversations/messages
    const pitBody = {
      locationId: locationId,
      contactId: contactId,
      message: ' ',
      type: 'WhatsApp',
      messageType: 19,
      attachments: [
        {
          type: 'image',
          file: base64Data
        }
      ]
    };

    // A3. 上游调用日志
    console.log("[DAOJIE_ATTACHMENTS_UPSTREAM_CALL]", {
      endpoint: PIT_MESSAGES_ENDPOINT,
      method: "POST",
      headers: {
        Authorization: `Bearer [REDACTED]`,
        Accept: "application/json",
        Version: "2021-07-28",
        "Content-Type": "application/json"
      },
      locationId,
      contactId,
      messageType: 19
    });

    const response = await fetch(PIT_MESSAGES_ENDPOINT, {
      method: 'POST',
      headers: pitHeaders,
      body: JSON.stringify(pitBody)
    });

    const responseText = await response.text();
    
    // A3. 上游响应日志
    console.log("[DAOJIE_ATTACHMENTS_UPSTREAM_RESP]", {
      status: response.status,
      body: responseText.substring(0, 300)
    });

    if (!response.ok) {
      // C2. 失败日志：[IMG_MSG_FAIL] status, code, traceId
      console.error("[IMG_MSG_FAIL]", {
        status: response.status,
        code: "DAOJIE_ATTACHMENT_UPLOAD_ERROR",
        traceId: Math.random().toString(36).substring(2, 15)
      });
      
      // B4. 上游返回非201时的错误处理
      return ok(request, {
        ok: false,
        error: "DAOJIE_ATTACHMENT_UPLOAD_ERROR",
        status: response.status,
        body: responseText
      });
    }

    const result = JSON.parse(responseText);
    const messageId = result?.messageId || result?.id || result?.conversationId;

    if (!messageId) {
      throw new Error('No messageId returned from LeadConnector API');
    }

    // C1. 成功日志：[IMG_MSG_OK] messageId
    console.log("[IMG_MSG_OK]", {
      messageId: messageId
    });

    // B3. CI断言：仅兼容返回file_id，禁止其他使用
    // C1. 兼容UI仍期望file_id的情况
    return ok(request, {
      ok: true,
      messageId: messageId,
      file_id: messageId, // 兼容UI期望 - CI允许的唯一file_id使用处
      conversationId: result?.conversationId,
      message: "Image message sent successfully via /conversations/messages"
    });

  } catch (error) {
    // C2. 失败日志：[IMG_MSG_FAIL] status, code, traceId
    console.error("[IMG_MSG_FAIL]", {
      status: 500,
      code: "INTERNAL_ERROR",
      traceId: Math.random().toString(36).substring(2, 15),
      error: error.message
    });
    
    return ok(request, {
      ok: false,
      error: "DAOJIE_ATTACHMENT_UPLOAD_ERROR",
      status: 500,
      body: error.message || "Failed to send image message"
    });
  }
}
